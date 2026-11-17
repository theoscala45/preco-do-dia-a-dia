"""Coletor de precos: abre a pagina de cada produto num navegador, informa o CEP e anota o preco que a pagina mostra.

Uso:
  python3 coletor/coletar.py                      -> todas as redes prontas, os 25 CEPs
  python3 coletor/coletar.py --ceps C06,C18       -> so esses pontos
  python3 coletor/coletar.py --limite 5           -> so os 5 primeiros produtos (para testar)
  python3 coletor/coletar.py --diagnostico pasta  -> guarda foto e texto da pagina quando algo falha

Regras (ver data/LEIAME.md):
- So paginas normais de produto, uma por vez, devagar. Nada de busca nem de endereco interno.
- Obedece ao robots.txt. Pagina bloqueada nao e lida.
- So fatos: preco, nome e tamanho. Fotos e fontes nem sao baixadas.
- Guarda o nome e o tamanho que a pagina mostra, nao os do endereco.
- Se um CEP falha, registra em data/execucoes.csv, pula e segue.
- Se a rede bloquear o coletor (erro 403 ou 429, captcha), para a rede na hora. Nao tenta contornar.

Saida: data/precos/AAAA-MM.csv (uma linha por produto, CEP e dia) e data/execucoes.csv (uma linha por rede, CEP e dia).
"""
import argparse, csv, datetime, os, random, re, sys, time, urllib.robotparser, urllib.request
from zoneinfo import ZoneInfo

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = ZoneInfo("America/Sao_Paulo")
COLUNAS = ["data", "rede_id", "produto_id", "cep_id", "preco_reais", "unidade_de_venda", "disponivel", "nome_na_pagina", "tamanho_na_pagina", "lido_em"]
COLUNAS_EXEC = ["data", "rede_id", "cep_id", "produtos_tentados", "produtos_lidos", "resultado", "erro"]
LINKS_QUE_ENTRAM = {"achado", "variante"}      # status de data/links.csv que o coletor le
PAUSA = (2.5, 4.5)                             # segundos entre uma pagina e a proxima
TAMANHO = re.compile(r"(\d+(?:[.,]\d+)?\s?(?:kg|g|gr|ml|l|lt|un|unidades|rolos|m)\b(?:\s?pague\s?\d+\s?\w+)?)", re.I)


class Bloqueio(Exception):
    """A rede recusou o coletor. Para tudo nessa rede."""


def ler(*caminho):
    with open(os.path.join(RAIZ, *caminho), encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def acrescentar(caminho, colunas, linhas):
    if not linhas: return
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
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
    """Tenda Atacado. A pagina de produto abre uma janela pedindo o CEP. Depois dos 8 numeros,
    a propria pagina busca o preco da regiao e tira o borrao do preco."""
    rede_id = "tenda"
    site = "https://www.tendaatacado.com.br"

    def informar_cep(self, pg, cep):
        campo = pg.locator("#shipping-cep")
        if not campo.is_visible():
            aviso = pg.locator(".CepDisclaimer .open-modal")
            if aviso.count(): aviso.first.click()
        campo.wait_for(state="visible", timeout=20000)
        campo.click()
        pg.keyboard.press("Home")
        pg.keyboard.type(re.sub(r"\D", "", cep), delay=130)
        # o preco deixa de estar borrado quando a pagina aceita o CEP
        try:
            pg.locator(".SimplePriceComponent:not(.price-blur)").first.wait_for(state="visible", timeout=25000)
        except Exception:
            erro = (pg.locator(".error-cep").first.inner_text() if pg.locator(".error-cep").count() else "").strip()
            raise RuntimeError("a pagina nao aceitou o CEP" + (f": {erro}" if erro else ""))

    def preco_visivel(self, pg, espera):
        """Espera o preco sem borrao. Depois do primeiro CEP, a pagina lembra a regiao sozinha."""
        try:
            pg.locator(".SimplePriceComponent:not(.price-blur)").first.wait_for(state="visible", timeout=espera)
            return True
        except Exception:
            return False

    def ler_produto(self, pg):
        """Devolve dict com nome, tamanho, preco, unidade e disponivel."""
        pg.locator("h1").first.wait_for(state="visible", timeout=25000)
        nome = pg.locator("h1").first.inner_text().strip()
        preco_el = pg.locator(".SimplePriceComponent:not(.price-blur)")
        try:
            preco_el.first.wait_for(state="visible", timeout=9000)
            preco, unidade = reais(preco_el.first.inner_text())
        except Exception:
            preco, unidade = None, ""
        corpo = pg.locator("body").inner_text().lower()
        indisponivel = preco is None and any(t in corpo for t in ("indisponível", "indisponivel", "avise-me", "esgotado"))
        if preco is None and not indisponivel:
            raise RuntimeError("preco nao encontrado na pagina")
        return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": preco, "unidade": unidade, "disponivel": preco is not None}


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


def coletar_rede(pw, rede, links, ceps, hoje, limite, diag):
    """Le todos os CEPs de uma rede. Devolve as linhas de execucao."""
    execs, falhas_seguidas = [], 0
    arquivo = os.path.join(RAIZ, "data", "precos", f"{hoje[:7]}.csv")
    ja = {(l["rede_id"], l["cep_id"]) for l in (ler("data", "precos", f"{hoje[:7]}.csv") if os.path.exists(arquivo) else []) if l["data"] == hoje}
    try:
        rp = robots(rede)
    except Exception as e:
        return [{"data": hoje, "rede_id": rede.rede_id, "cep_id": "", "produtos_tentados": 0, "produtos_lidos": 0, "resultado": "falha", "erro": f"robots.txt inacessivel: {e}"}]
    paginas = [l for l in links if rp.can_fetch("*", l["url"])]
    barradas = len(links) - len(paginas)
    if limite: paginas = paginas[:limite]

    # no computador de teste da para apontar outro navegador e um proxy; no GitHub nao precisa
    opcoes = {}
    if os.environ.get("COLETOR_NAVEGADOR"): opcoes["executable_path"] = os.environ["COLETOR_NAVEGADOR"]
    if os.environ.get("COLETOR_PROXY"): opcoes["proxy"] = {"server": os.environ["COLETOR_PROXY"]}
    navegador = pw.chromium.launch(**opcoes)
    try:
        for cep in ceps:
            if (rede.rede_id, cep["cep_id"]) in ja:
                print(f"[{rede.rede_id} {cep['cep_id']}] ja lido hoje, pulando", flush=True); continue
            ctx = navegador.new_context(locale="pt-BR", viewport={"width": 1280, "height": 900})
            pg = ctx.new_page()
            # so o que a pagina precisa para mostrar o preco: nada de fotos, fontes ou rastreadores
            pg.route("**/*", lambda rota: rota.abort() if rota.request.resource_type in ("image", "media", "font") or "tendaatacado.com.br" not in rota.request.url.split("/")[2] else rota.continue_())
            linhas, lidos, erros, cep_ok = [], 0, [], False
            try:
                for n, link in enumerate(paginas):
                    for tentativa in (1, 2):
                        try:
                            resposta = pg.goto(link["url"], wait_until="domcontentloaded", timeout=60000)
                            conferir_bloqueio(resposta, pg)
                            if resposta is not None and resposta.status == 404:
                                raise RuntimeError("pagina nao existe mais (404)")
                            pg.locator("h1").first.wait_for(state="visible", timeout=25000)
                            if not rede.preco_visivel(pg, 12000 if cep_ok else 4000):
                                rede.informar_cep(pg, cep["cep"]); cep_ok = True
                            p = rede.ler_produto(pg)
                            linhas.append({"data": hoje, "rede_id": rede.rede_id, "produto_id": link["produto_id"], "cep_id": cep["cep_id"],
                                           "preco_reais": p["preco"] or "", "unidade_de_venda": p["unidade"], "disponivel": "sim" if p["disponivel"] else "nao",
                                           "nome_na_pagina": p["nome"], "tamanho_na_pagina": p["tamanho"], "lido_em": agora().strftime("%Y-%m-%dT%H:%M:%S%z")})
                            lidos += 1
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
                                time.sleep(6)
                    if not cep_ok and n == 0:
                        raise RuntimeError("nao foi possivel informar o CEP: " + (erros[-1] if erros else ""))
                    time.sleep(random.uniform(*PAUSA))
                resultado = "ok" if lidos == len(paginas) else "parcial" if lidos else "falha"
            except Bloqueio as e:
                acrescentar(arquivo, COLUNAS, linhas)
                execs.append({"data": hoje, "rede_id": rede.rede_id, "cep_id": cep["cep_id"], "produtos_tentados": len(paginas), "produtos_lidos": lidos, "resultado": "bloqueado", "erro": str(e)})
                print(f"[{rede.rede_id} {cep['cep_id']}] BLOQUEADO: {e}. Parando a rede.", flush=True)
                ctx.close(); return execs
            except Exception as e:
                resultado, erros = "falha", [str(e).splitlines()[0][:160]]
            ctx.close()
            acrescentar(arquivo, COLUNAS, linhas)
            nota = "; ".join(erros[:6]) + (f"; e mais {len(erros) - 6}" if len(erros) > 6 else "")
            if barradas and not nota: nota = ""
            execs.append({"data": hoje, "rede_id": rede.rede_id, "cep_id": cep["cep_id"], "produtos_tentados": len(paginas), "produtos_lidos": lidos, "resultado": resultado, "erro": nota.replace(",", ";")})
            print(f"[{rede.rede_id} {cep['cep_id']}] {resultado}: {lidos}/{len(paginas)}" + (f" | {nota}" if nota else ""), flush=True)
            falhas_seguidas = falhas_seguidas + 1 if resultado == "falha" else 0
            if falhas_seguidas >= 3:
                print(f"[{rede.rede_id}] 3 CEPs seguidos falharam. Parando a rede.", flush=True); break
    finally:
        navegador.close()
    return execs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ceps", default="", help="ids separados por virgula (padrao: todos)")
    ap.add_argument("--limite", type=int, default=0, help="le so os N primeiros produtos")
    ap.add_argument("--diagnostico", default="", help="pasta para guardar foto e texto das paginas que falharem")
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright
    hoje = agora().strftime("%Y-%m-%d")
    ceps = ler("data", "ceps.csv")
    if a.ceps: ceps = [c for c in ceps if c["cep_id"] in a.ceps.split(",")]
    links = ler("data", "links.csv")
    execs = []
    with sync_playwright() as pw:
        for rede in REDES:
            da_rede = [l for l in links if l["rede_id"] == rede.rede_id and l["status"] in LINKS_QUE_ENTRAM and l["url"]]
            print(f"[{rede.rede_id}] {len(da_rede)} paginas de produto, {len(ceps)} CEPs", flush=True)
            execs += coletar_rede(pw, rede, da_rede, ceps, hoje, a.limite, a.diagnostico)
    for e in execs: e["erro"] = re.sub(r'[,"\n]', ";", e["erro"])[:300]   # a tabela usa virgula como separador
    acrescentar(os.path.join(RAIZ, "data", "execucoes.csv"), COLUNAS_EXEC, execs)
    ruins = [e for e in execs if e["resultado"] != "ok"]
    print(f"fim: {len(execs)} execucoes, {len(ruins)} com problema", flush=True)


if __name__ == "__main__":
    main()
