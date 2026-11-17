"""Coletor de precos: abre a pagina de cada produto num navegador, informa o CEP e anota o preco que a pagina mostra.

Uso:
  python3 coletor/coletar.py                      -> todas as redes prontas, os 25 CEPs
  python3 coletor/coletar.py --ceps C06,C18       -> so esses pontos
  python3 coletor/coletar.py --zona Sul           -> so os pontos de uma zona
  python3 coletor/coletar.py --limite 5           -> so os 5 primeiros produtos (para testar)
  python3 coletor/coletar.py --saida pasta        -> grava precos.csv e execucoes.csv nessa pasta, em vez de data/
  python3 coletor/coletar.py --diagnostico pasta  -> guarda foto e texto da pagina quando algo falha

Regras (ver data/LEIAME.md):
- So paginas normais de produto, uma por vez, devagar. Nada de busca nem de endereco interno.
- Obedece ao robots.txt. Pagina bloqueada nao e lida.
- So fatos: preco, nome e tamanho. Fotos e fontes nem sao baixadas.
- Guarda o nome e o tamanho que a pagina mostra, nao os do endereco.
- Produto sem preco na regiao entra como disponivel = nao. E dado, nao erro.
- Se um CEP falha, registra em execucoes.csv, pula e segue.
- Se a rede bloquear o coletor (erro 403 ou 429, captcha), para a rede na hora. Nao tenta contornar.

Saida padrao: data/precos/AAAA-MM.csv (uma linha por produto, CEP e dia) e data/execucoes.csv (uma linha por rede, CEP e dia).
As linhas de execucao sao gravadas a cada CEP, para nada se perder se o tempo acabar no meio.
"""
import argparse, csv, datetime, os, random, re, time, urllib.request, urllib.robotparser
from zoneinfo import ZoneInfo

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = ZoneInfo("America/Sao_Paulo")
COLUNAS = ["data", "rede_id", "produto_id", "cep_id", "preco_reais", "unidade_de_venda", "disponivel", "nome_na_pagina", "tamanho_na_pagina", "lido_em"]
COLUNAS_EXEC = ["data", "rede_id", "cep_id", "produtos_tentados", "produtos_lidos", "resultado", "erro"]
LINKS_QUE_ENTRAM = {"achado", "variante"}      # status de data/links.csv que o coletor le
PAUSA = (2.0, 3.5)                             # segundos entre uma pagina e a proxima
TAMANHO = re.compile(r"(\d+(?:[.,]\d+)?\s?(?:kg|g|gr|ml|l|lt|un|unid|unidades|rolos|m)\b(?:\s?pague\s?\d+\s?\w+)?)", re.I)


class Bloqueio(Exception):
    """A rede recusou o coletor. Para tudo nessa rede."""


def ler(caminho):
    if not os.path.exists(caminho): return []
    with open(caminho, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def acrescentar(caminho, colunas, linhas):
    if not linhas: return
    os.makedirs(os.path.dirname(caminho) or ".", exist_ok=True)
    novo = not os.path.exists(caminho) or os.path.getsize(caminho) == 0
    with open(caminho, "a", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=colunas, lineterminator="\n")
        if novo: w.writeheader()
        w.writerows(linhas)


def agora():
    return datetime.datetime.now(SP)


def reais(texto):
    """'R$ 26,39 un' -> ('26.39', 'un'). Devolve (None, '') se nao houver preco."""
    m = re.search(r"R\$\s*([\d.]+,\d{2})\s*([^\s\d]*)", texto.replace("\xa0", " "))
    if not m: return None, ""
    return m.group(1).replace(".", "").replace(",", "."), m.group(2).strip().lower()


def tamanho_do_nome(nome):
    achados = TAMANHO.findall(nome)
    return achados[-1].strip() if achados else ""


class Tenda:
    """Tenda Atacado. Sem CEP, a pagina mostra o preco borrado e um aviso. Ao receber os 8 numeros do CEP
    (numa janela da propria pagina), ela busca o preco da regiao e tira o borrao. Nas paginas seguintes ela lembra o CEP.
    O preco vem em um de dois blocos: o comum (SimplePriceComponent) ou o de promocao (PriceDiscountComponent),
    que mostra o preco antigo riscado e o novo. O coletor guarda o novo: e o que a pessoa paga."""
    rede_id = "tenda"
    site = "https://www.tendaatacado.com.br"
    BLOCO = ".position-prices :is(.SimplePriceComponent, .PriceDiscountComponent)"

    def esperar_bloco(self, pg, espera):
        """Espera um bloco de preco aparecer. Devolve 'limpo', 'borrado' ou None (so o esqueleto de carregamento)."""
        try:
            pg.locator(self.BLOCO).first.wait_for(state="visible", timeout=espera)
        except Exception:
            return None
        return "borrado" if "price-blur" in (pg.locator(self.BLOCO).first.get_attribute("class") or "") else "limpo"

    def informar_cep(self, pg, cep):
        campo = pg.locator("#shipping-cep")
        if not campo.is_visible():
            aviso = pg.locator(".CepDisclaimer .open-modal")
            # a janela de fundo da propria pagina pode ficar por cima do aviso: o clique vai direto nele
            if aviso.count(): aviso.first.click(force=True)
        campo.wait_for(state="visible", timeout=15000)
        campo.click()
        pg.keyboard.press("Home")
        pg.keyboard.type(re.sub(r"\D", "", cep), delay=130)
        try:
            pg.locator(self.BLOCO + ":not(.price-blur)").first.wait_for(state="visible", timeout=25000)
        except Exception:
            erro = (pg.locator(".error-cep").first.inner_text() if pg.locator(".error-cep").count() else "").strip()
            raise RuntimeError("a pagina nao aceitou o CEP" + (f": {erro}" if erro else ""))

    def ler_produto(self, pg, cep, cep_dado):
        """Devolve (dict do produto, cep_dado). Produto sem preco na regiao volta com disponivel = False."""
        pg.locator("h1").first.wait_for(state="visible", timeout=25000)
        nome = pg.locator("h1").first.inner_text().strip()
        if cep_dado:
            # a pagina desenha o preco borrado por um instante e so depois aplica a regiao que ja conhece
            try:
                pg.locator(self.BLOCO + ":not(.price-blur)").first.wait_for(state="visible", timeout=15000)
                estado = "limpo"
            except Exception:
                estado = self.esperar_bloco(pg, 1000)
        else:
            estado = self.esperar_bloco(pg, 15000)
        if estado == "borrado" or (estado is None and not cep_dado and pg.locator(".CepDisclaimer").count()):
            self.informar_cep(pg, cep)
            cep_dado, estado = True, "limpo"
        if estado is None:
            # o bloco de preco nunca apareceu, mesmo com o CEP dado: a rede nao vende o produto nesta regiao hoje
            return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": None, "unidade": "", "disponivel": False}, cep_dado
        bloco = pg.locator(self.BLOCO).first
        novo = bloco.locator(".card-new-price")
        preco, unidade = reais(novo.first.inner_text() if novo.count() else bloco.inner_text())
        if preco is None:
            raise RuntimeError("bloco de preco sem valor")
        return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": preco, "unidade": unidade, "disponivel": True}, cep_dado


REDES = [Tenda()]


def robots(rede):
    rp = urllib.robotparser.RobotFileParser()
    req = urllib.request.Request(rede.site + "/robots.txt", headers={"User-Agent": "coletor-de-precos"})
    with urllib.request.urlopen(req, timeout=40) as r:
        rp.parse(r.read().decode("utf-8", "replace").splitlines())
    return rp


def conferir_bloqueio(resposta, pg):
    if resposta is not None and resposta.status in (403, 429):
        raise Bloqueio(f"a rede respondeu {resposta.status}")
    titulo = (pg.title() or "").lower()
    if any(t in titulo for t in ("access denied", "acesso negado", "captcha", "attention required", "just a moment")):
        raise Bloqueio(f"pagina de bloqueio: {pg.title()}")


def limpar(texto):
    return re.sub(r'[,"\n]', ";", texto)[:300]   # a tabela usa virgula como separador


def coletar_rede(pw, rede, links, ceps, hoje, limite, diag, arq_precos, arq_exec):
    falhas_seguidas = 0
    # so pula o CEP que ja terminou bem hoje (uma coleta interrompida no meio e refeita)
    ja = {(e["rede_id"], e["cep_id"]) for e in ler(arq_exec) + ler(os.path.join(RAIZ, "data", "execucoes.csv")) if e["data"] == hoje and e["resultado"] == "ok"}
    try:
        rp = robots(rede)
    except Exception as e:
        acrescentar(arq_exec, COLUNAS_EXEC, [{"data": hoje, "rede_id": rede.rede_id, "cep_id": "", "produtos_tentados": 0, "produtos_lidos": 0, "resultado": "falha", "erro": limpar(f"robots.txt inacessivel: {e}")}])
        return
    paginas = [l for l in links if rp.can_fetch("*", l["url"])]
    if limite: paginas = paginas[:limite]

    # no computador de teste da para apontar outro navegador e um proxy; no GitHub nao precisa
    opcoes = {}
    if os.environ.get("COLETOR_NAVEGADOR"): opcoes["executable_path"] = os.environ["COLETOR_NAVEGADOR"]
    if os.environ.get("COLETOR_PROXY"): opcoes["proxy"] = {"server": os.environ["COLETOR_PROXY"]}
    navegador = pw.chromium.launch(**opcoes)
    host = rede.site.split("/")[2].replace("www.", "")
    try:
        for cep in ceps:
            if (rede.rede_id, cep["cep_id"]) in ja:
                print(f"[{rede.rede_id} {cep['cep_id']}] ja lido hoje, pulando", flush=True); continue
            inicio = time.time()
            ctx = navegador.new_context(locale="pt-BR", viewport={"width": 1280, "height": 900})
            pg = ctx.new_page()
            # so o que a pagina precisa para mostrar o preco: nada de fotos, fontes ou rastreadores
            pg.route("**/*", lambda rota: rota.abort() if rota.request.resource_type in ("image", "media", "font") or host not in rota.request.url.split("/")[2] else rota.continue_())
            linhas, lidos, sem_preco, erros, cep_dado = [], 0, 0, [], False
            try:
                for n, link in enumerate(paginas):
                    for tentativa in (1, 2):
                        try:
                            resposta = pg.goto(link["url"], wait_until="domcontentloaded", timeout=60000)
                            conferir_bloqueio(resposta, pg)
                            if resposta is not None and resposta.status == 404:
                                raise RuntimeError("pagina nao existe mais (404)")
                            p, cep_dado = rede.ler_produto(pg, cep["cep"], cep_dado)
                            linhas.append({"data": hoje, "rede_id": rede.rede_id, "produto_id": link["produto_id"], "cep_id": cep["cep_id"],
                                           "preco_reais": p["preco"] or "", "unidade_de_venda": p["unidade"], "disponivel": "sim" if p["disponivel"] else "nao",
                                           "nome_na_pagina": p["nome"], "tamanho_na_pagina": p["tamanho"], "lido_em": agora().strftime("%Y-%m-%dT%H:%M:%S%z")})
                            lidos += 1
                            sem_preco += 0 if p["disponivel"] else 1
                            break
                        except Bloqueio:
                            raise
                        except Exception as e:
                            if tentativa == 2:
                                erros.append(f"{link['produto_id']}: {str(e).splitlines()[0][:90]}")
                                if diag:
                                    os.makedirs(diag, exist_ok=True)
                                    base = os.path.join(diag, f"{rede.rede_id}-{cep['cep_id']}-{link['produto_id']}")
                                    try:
                                        pg.screenshot(path=base + ".png")
                                        open(base + ".txt", "w", encoding="utf-8").write(pg.url + "\n" + pg.locator("body").inner_text()[:4000])
                                    except Exception: pass
                            else:
                                time.sleep(5)
                    if n == 0 and not lidos:
                        raise RuntimeError("a primeira pagina falhou: " + (erros[-1] if erros else ""))
                    time.sleep(random.uniform(*PAUSA))
                resultado = "ok" if lidos == len(paginas) else "parcial" if lidos else "falha"
            except Bloqueio as e:
                acrescentar(arq_precos, COLUNAS, linhas)
                acrescentar(arq_exec, COLUNAS_EXEC, [{"data": hoje, "rede_id": rede.rede_id, "cep_id": cep["cep_id"], "produtos_tentados": len(paginas), "produtos_lidos": lidos, "resultado": "bloqueado", "erro": limpar(str(e))}])
                print(f"[{rede.rede_id} {cep['cep_id']}] BLOQUEADO: {e}. Parando a rede.", flush=True)
                ctx.close(); return
            except Exception as e:
                resultado, erros = "falha", [str(e).splitlines()[0][:160]]
            ctx.close()
            acrescentar(arq_precos, COLUNAS, linhas)
            nota = "; ".join(erros[:6]) + (f"; e mais {len(erros) - 6}" if len(erros) > 6 else "")
            acrescentar(arq_exec, COLUNAS_EXEC, [{"data": hoje, "rede_id": rede.rede_id, "cep_id": cep["cep_id"], "produtos_tentados": len(paginas), "produtos_lidos": lidos, "resultado": resultado, "erro": limpar(nota)}])
            print(f"[{rede.rede_id} {cep['cep_id']}] {resultado}: {lidos}/{len(paginas)} lidos, {sem_preco} sem preco na regiao, {time.time() - inicio:.0f} s" + (f" | {nota}" if nota else ""), flush=True)
            falhas_seguidas = falhas_seguidas + 1 if resultado == "falha" else 0
            if falhas_seguidas >= 3:
                print(f"[{rede.rede_id}] 3 CEPs seguidos falharam. Parando a rede.", flush=True); break
    finally:
        navegador.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ceps", default="", help="ids separados por virgula (padrao: todos)")
    ap.add_argument("--zona", default="", help="so os pontos desta zona (Centro, Oeste, Sul, Leste, Norte)")
    ap.add_argument("--limite", type=int, default=0, help="le so os N primeiros produtos")
    ap.add_argument("--saida", default="", help="pasta para precos.csv e execucoes.csv (padrao: data/)")
    ap.add_argument("--diagnostico", default="", help="pasta para guardar foto e texto das paginas que falharem")
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright
    hoje = agora().strftime("%Y-%m-%d")
    ceps = ler(os.path.join(RAIZ, "data", "ceps.csv"))
    if a.ceps: ceps = [c for c in ceps if c["cep_id"] in a.ceps.split(",")]
    if a.zona: ceps = [c for c in ceps if c["zona"].lower() == a.zona.lower()]
    if a.saida:
        arq_precos, arq_exec = os.path.join(a.saida, "precos.csv"), os.path.join(a.saida, "execucoes.csv")
    else:
        arq_precos, arq_exec = os.path.join(RAIZ, "data", "precos", f"{hoje[:7]}.csv"), os.path.join(RAIZ, "data", "execucoes.csv")
    links = ler(os.path.join(RAIZ, "data", "links.csv"))
    with sync_playwright() as pw:
        for rede in REDES:
            da_rede = [l for l in links if l["rede_id"] == rede.rede_id and l["status"] in LINKS_QUE_ENTRAM and l["url"]]
            print(f"[{rede.rede_id}] {len(da_rede)} paginas de produto, {len(ceps)} CEPs", flush=True)
            coletar_rede(pw, rede, da_rede, ceps, hoje, a.limite, a.diagnostico, arq_precos, arq_exec)
    print("fim", flush=True)


if __name__ == "__main__":
    main()
