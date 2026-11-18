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
import argparse, csv, datetime, html, os, random, re, time, urllib.parse, urllib.request, urllib.robotparser
from zoneinfo import ZoneInfo

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = ZoneInfo("America/Sao_Paulo")
COLUNAS = ["data", "rede_id", "produto_id", "cep_id", "preco_reais", "unidade_de_venda", "disponivel", "nome_na_pagina", "tamanho_na_pagina", "lido_em"]
COLUNAS_EXEC = ["data", "rede_id", "cep_id", "produtos_tentados", "produtos_lidos", "resultado", "erro", "loja"]
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


def semacento(texto):
    import unicodedata
    return unicodedata.normalize("NFD", texto or "").encode("ascii", "ignore").decode().lower()


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
    hosts = ("tendaatacado.com.br",)   # enderecos que a pagina precisa para mostrar o preco; o resto e bloqueado
    loja = ""
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


class Atacadao:
    """Atacadao. O preco muda por loja. Para cada CEP, o coletor abre a barra "para o CEP" da propria pagina,
    escolhe "Retirada na Loja", digita o CEP e fica com a primeira loja da lista, que o site ordena da mais perto
    para a mais longe. So algumas lojas fazem retirada pela internet (em 11/2026: Aricanduva, Penha, Vila Maria,
    Tatuape, Villa Lobos, Tambore), entao a loja usada pode ficar longe do CEP. O preco e o da loja de retirada. A loja vale para as paginas seguintes. O site mostra dois precos: o de 1 unidade e o de
    atacado ("a partir de N unidades"). O coletor guarda o de 1 unidade, que aparece no resumo da compra."""
    rede_id = "atacadao"
    site = "https://www.atacadao.com.br"
    hosts = ("atacadao.com.br", "cloud.carrefour.com.br", "vtexassets.com", "vteximg.com.br")
    por_loja = True   # varios CEPs caem na mesma loja: cada loja e lida uma vez por noite
    loja = ""
    TITULO = "[data-test=product-details-title]"

    def escolher_loja(self, pg, cep):
        pg.wait_for_timeout(2500)   # a barra da regiao so responde depois que a pagina termina de montar
        # o botao do CEP na barra do topo abre a janela "Como deseja comprar?"
        pg.locator("[data-test-id=regionalization-bar-zip-btn-desktop] >> visible=true").first.click()
        pg.locator("text=Retirada na Loja >> visible=true").first.click()
        campo = pg.locator('input[placeholder*="02170-901"] >> visible=true').first
        campo.wait_for(state="visible", timeout=15000)
        campo.click()
        pg.keyboard.type(re.sub(r"\D", "", cep), delay=120)
        pg.keyboard.press("Enter")
        primeira = pg.locator("text=/^Loja - / >> visible=true").first
        primeira.wait_for(state="visible", timeout=20000)
        primeira.click()
        pg.locator("role=button[name=/continuar/i] >> visible=true").first.click()
        barra = pg.locator("[data-test-id=regionalization-bar] >> visible=true").first
        pg.wait_for_function("t => document.body.innerText.includes(t)", arg="Retire na Loja", timeout=20000)
        m = re.search(r"Loja - ([^\n]+?)\s*(para o CEP|$)", barra.inner_text().replace("\n", " "))
        self.loja = m.group(1).strip() if m else ""

    def ler_produto(self, pg, cep, cep_dado):
        pg.locator(self.TITULO).first.wait_for(state="visible", timeout=25000)
        if not cep_dado:
            self.escolher_loja(pg, cep)
            cep_dado = True
            pg.wait_for_timeout(2500)
        nome = pg.locator(self.TITULO).first.inner_text().strip()
        # o preco carrega depois do titulo: espera o resumo da compra ou o aviso de indisponivel
        try:
            pg.wait_for_function("() => /unidade\\s*·\\s*R\\$|Produto indispon/i.test(document.body.innerText)", timeout=15000)
        except Exception:
            raise RuntimeError("preco nao apareceu")
        texto = pg.evaluate("""t => { let e = document.querySelector(t); for (let i = 0; i < 8 && e && !/Resumo da compra|indispon/i.test(e.innerText); i++) e = e.parentElement; return e ? e.innerText : ''; }""", self.TITULO)
        m = re.search(r"1\s*unidade\s*·\s*R\$\s*([\d.]+,\d{2})", texto)
        if not m:
            if re.search(r"Produto indispon", texto, re.I):
                return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": None, "unidade": "", "disponivel": False}, cep_dado
            raise RuntimeError("preco de 1 unidade nao encontrado")
        return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": m.group(1).replace(".", "").replace(",", "."), "unidade": "un", "disponivel": True}, cep_dado


class Carrefour:
    """Carrefour (mercado.carrefour.com.br). O site mostra uma tela de captcha para navegadores automaticos, e o
    projeto nao contorna bloqueios. Por isso o coletor nao informa CEP: baixa so a pagina normal do produto, como
    faz com o sitemap, e le o preco padrao que ela traz nos dados padronizados de produto (schema.org: nome, preco
    e estoque). E um preco unico para a cidade, o que o site mostra antes de alguem informar o CEP.
    Para ter preco por CEP, o caminho e pedir autorizacao ao Carrefour (docs/emails-para-as-redes.md)."""
    rede_id = "carrefour"
    site = "https://mercado.carrefour.com.br"
    preco_unico = True
    loja = ""

    def ler_pagina(self, url):
        req = urllib.request.Request(urllib.parse.quote(url, safe=":/%"), headers={"User-Agent": "Mozilla/5.0 (preco-do-dia-a-dia)"})
        with urllib.request.urlopen(req, timeout=60) as r:
            if r.status in (403, 429): raise Bloqueio(f"a rede respondeu {r.status}")
            h = r.read().decode("utf-8", "replace")
        if re.search(r"<title>\s*(captcha|just a moment|attention required)", h, re.I):
            raise Bloqueio("pagina de bloqueio (captcha)")
        nome = re.search(r'data-testid="pdp-product-name"[^>]*>([^<]+)', h)
        if not nome:
            raise RuntimeError("pagina sem nome de produto (pode nao existir mais)")
        nome = html.unescape(nome.group(1)).strip()
        oferta = re.search(r'"offers":\{[^}]*?"price":([\d.]+)[^}]*?"availability":"[^"]*/(\w+)"', h)
        if not oferta or oferta.group(2) != "InStock":
            return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": None, "unidade": "", "disponivel": False}
        return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": f"{float(oferta.group(1)):.2f}", "unidade": "un", "disponivel": True}


class PaoDeAcucar:
    """Pao de Acucar. O preco e unico: a pagina de produto mostra o preco sem pedir CEP. O site so abre em
    navegador (pedidos sem navegador recebem uma pagina de verificacao), entao a leitura usa o navegador automatico,
    como no Tenda e no Atacadao. Sem sitemap e com a busca bloqueada pelo robots.txt, os links foram achados
    percorrendo as paginas de categoria."""
    rede_id = "pao-de-acucar"
    site = "https://www.paodeacucar.com"
    preco_unico = True
    navegador = True
    hosts = ("paodeacucar.com", "gpa.digital")
    loja = ""
    pg = None

    def ler_pagina(self, url):
        pg = self.pg
        resposta = pg.goto(url, wait_until="domcontentloaded", timeout=60000)
        conferir_bloqueio(resposta, pg)
        if (resposta is not None and resposta.status == 404) or "nao encontrad" in semacento(pg.title()):
            raise RuntimeError("pagina nao existe mais (404)")
        pg.locator("h1").first.wait_for(state="visible", timeout=25000)
        nome = pg.locator("h1").first.inner_text().strip()
        try:
            pg.wait_for_function("() => /R\\$\\s*[\\d.]+,\\d{2}|indispon|avise-me/i.test(document.querySelector('h1').parentElement.parentElement.parentElement.innerText)", timeout=15000)
        except Exception:
            pass
        texto = pg.evaluate("""() => { let e = document.querySelector('h1'); for (let i = 0; i < 6 && e.parentElement && !/R\\$|indispon|avise-me/i.test(e.innerText); i++) e = e.parentElement; return e.innerText; }""")
        # o bloco do preco vai do titulo ao botao Comprar; o cupom e o frete ficam depois
        variavel = bool(re.search(r"peso vari[aá]vel", texto, re.I))
        texto = re.split(r"\bComprar\b|Calcular o frete", texto)[0] + ("\npeso variavel" if variavel else "")
        # produto de peso variavel (frutas, verduras, carnes): vale o preco do quilo, que a pagina mostra como
        # "Preco por 1kg - R$ X". Nos outros, essa linha e so a conta da pagina e fica de fora.
        por_kg = re.search(r"Pre[cç]o por 1\s*kg\s*-\s*R\$\s*([\d.]+,\d{2})", texto, re.I)
        if por_kg and re.search(r"peso vari[aá]vel|/\s*kg", texto, re.I):
            preco = float(por_kg.group(1).replace(".", "").replace(",", "."))
            return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": f"{preco:.2f}", "unidade": "kg", "disponivel": True}
        texto = re.sub(r"Pre[cç]o por [^\n]*", "", texto)
        m = re.search(r"R\$\s*([\d.]+,\d{2})\s*(/\s*kg)?", texto, re.I)
        peso = re.search(r"(\d+(?:,\d+)?)\s*(kg|g)\b", nome, re.I)
        if m and not m.group(2) and peso and re.search(r"peso vari[aá]vel", texto, re.I):
            # em promocao a pagina nao mostra "Preco por 1kg"; a conta e a mesma que ela faz: preco / peso do nome
            kg = float(peso.group(1).replace(",", ".")) / (1000 if peso.group(2).lower() == "g" else 1)
            preco = float(m.group(1).replace(".", "").replace(",", ".")) / kg
            return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": f"{preco:.2f}", "unidade": "kg", "disponivel": True}
        if not m:
            if re.search(r"indispon|avise-me|esgotad", texto, re.I):
                return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": None, "unidade": "", "disponivel": False}
            raise RuntimeError("preco nao encontrado na pagina")
        # o primeiro valor e o preco atual; numa promocao o segundo e o preco antigo, riscado.
        # "-50% na 2a unidade" nao conta: o preco de uma unidade e o primeiro.
        preco = float(m.group(1).replace(".", "").replace(",", "."))
        return {"nome": nome, "tamanho": tamanho_do_nome(nome), "preco": f"{preco:.2f}", "unidade": "kg" if m.group(2) else "un", "disponivel": True}


def coletar_unico(rede, links, hoje, limite, arq_precos, arq_exec, pw=None):
    """Redes de preco unico: uma leitura por noite, sem CEP (cep_id vazio), sem navegador."""
    ja = any(e["rede_id"] == rede.rede_id and e["data"] == hoje and e["resultado"] == "ok" for e in ler(arq_exec) + ler(os.path.join(RAIZ, "data", "execucoes.csv")))
    if ja:
        print(f"[{rede.rede_id}] ja lido hoje, pulando", flush=True); return
    rp = robots(rede)
    paginas = [l for l in links if rp.can_fetch("*", l["url"])]
    if limite: paginas = paginas[:limite]
    linhas, erros, sem_preco, inicio, resultado = [], [], 0, time.time(), ""
    navegador = None
    if getattr(rede, "navegador", False):
        opcoes = {}
        if os.environ.get("COLETOR_NAVEGADOR"): opcoes["executable_path"] = os.environ["COLETOR_NAVEGADOR"]
        if os.environ.get("COLETOR_PROXY"): opcoes["proxy"] = {"server": os.environ["COLETOR_PROXY"]}
        navegador = pw.chromium.launch(**opcoes)
        rede.pg = navegador.new_context(locale="pt-BR", viewport={"width": 1280, "height": 900}).new_page()
        hosts = rede.hosts
        rede.pg.route("**/*", lambda rota: rota.abort() if rota.request.resource_type in ("image", "media", "font") or not any(h in rota.request.url.split("/")[2] for h in hosts) else rota.continue_())
    try:
        for link in paginas:
            for tentativa in (1, 2):
                try:
                    p = rede.ler_pagina(link["url"])
                    linhas.append({"data": hoje, "rede_id": rede.rede_id, "produto_id": link["produto_id"], "cep_id": "",
                                   "preco_reais": p["preco"] or "", "unidade_de_venda": p["unidade"], "disponivel": "sim" if p["disponivel"] else "nao",
                                   "nome_na_pagina": p["nome"], "tamanho_na_pagina": p["tamanho"], "lido_em": agora().strftime("%Y-%m-%dT%H:%M:%S%z")})
                    sem_preco += 0 if p["disponivel"] else 1
                    break
                except Bloqueio:
                    raise
                except Exception as e:
                    if tentativa == 2: erros.append(f"{link['produto_id']}: {str(e).splitlines()[0][:90]}")
                    else: time.sleep(5)
            time.sleep(random.uniform(*PAUSA))
        resultado = "ok" if len(linhas) == len(paginas) else "parcial" if linhas else "falha"
    except Bloqueio as e:
        resultado, erros = "bloqueado", [str(e)] + erros
    finally:
        if navegador: navegador.close()
    acrescentar(arq_precos, COLUNAS, linhas)
    nota = "; ".join(erros[:6]) + (f"; e mais {len(erros) - 6}" if len(erros) > 6 else "")
    acrescentar(arq_exec, COLUNAS_EXEC, [{"data": hoje, "rede_id": rede.rede_id, "cep_id": "", "produtos_tentados": len(paginas), "produtos_lidos": len(linhas), "resultado": resultado, "erro": limpar(nota), "loja": "preco unico do site"}])
    print(f"[{rede.rede_id}] {resultado}: {len(linhas)}/{len(paginas)} lidos, {sem_preco} sem estoque, {time.time() - inicio:.0f} s" + (f" | {nota}" if nota else ""), flush=True)


REDES = [Tenda(), Atacadao(), Carrefour(), PaoDeAcucar()]


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
    hosts = rede.hosts
    feitas = {}   # loja -> o que foi lido nela nesta noite (redes com preco por loja)
    try:
        for cep in ceps:
            if (rede.rede_id, cep["cep_id"]) in ja:
                print(f"[{rede.rede_id} {cep['cep_id']}] ja lido hoje, pulando", flush=True); continue
            inicio = time.time()
            ctx = navegador.new_context(locale="pt-BR", viewport={"width": 1280, "height": 900})
            pg = ctx.new_page()
            # so o que a pagina precisa para mostrar o preco: nada de fotos, fontes ou rastreadores
            pg.route("**/*", lambda rota: rota.abort() if rota.request.resource_type in ("image", "media", "font") or not any(h in rota.request.url.split("/")[2] for h in hosts) else rota.continue_())
            linhas, lidos, sem_preco, erros, cep_dado = [], 0, 0, [], False
            rede.loja = ""
            copiado_de = ""
            try:
                for n, link in enumerate(paginas):
                    for tentativa in (1, 2):
                        try:
                            resposta = pg.goto(link["url"], wait_until="domcontentloaded", timeout=60000)
                            conferir_bloqueio(resposta, pg)
                            if (resposta is not None and resposta.status == 404) or "nao encontrada" in semacento(pg.title()):
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
                    if n == 0 and getattr(rede, "por_loja", False) and rede.loja in feitas:
                        # a loja deste CEP ja foi lida esta noite: os precos sao os mesmos
                        o = feitas[rede.loja]
                        linhas = [{**l, "cep_id": cep["cep_id"]} for l in o["linhas"]]
                        lidos, sem_preco, erros, copiado_de = o["lidos"], o["sem_preco"], list(o["erros"]), o["cep"]
                        break
                    time.sleep(random.uniform(*PAUSA))
                resultado = "ok" if lidos == len(paginas) else "parcial" if lidos else "falha"
            except Bloqueio as e:
                acrescentar(arq_precos, COLUNAS, linhas)
                acrescentar(arq_exec, COLUNAS_EXEC, [{"data": hoje, "rede_id": rede.rede_id, "cep_id": cep["cep_id"], "produtos_tentados": len(paginas), "produtos_lidos": lidos, "resultado": "bloqueado", "erro": limpar(str(e)), "loja": limpar(rede.loja)}])
                print(f"[{rede.rede_id} {cep['cep_id']}] BLOQUEADO: {e}. Parando a rede.", flush=True)
                ctx.close(); return
            except Exception as e:
                resultado, erros = "falha", [str(e).splitlines()[0][:160]]
            ctx.close()
            acrescentar(arq_precos, COLUNAS, linhas)
            if getattr(rede, "por_loja", False) and rede.loja and not copiado_de and resultado != "falha":
                feitas[rede.loja] = {"linhas": linhas, "lidos": lidos, "sem_preco": sem_preco, "erros": erros, "cep": cep["cep_id"]}
            nota = "; ".join(erros[:6]) + (f"; e mais {len(erros) - 6}" if len(erros) > 6 else "")
            if copiado_de: nota = f"mesma loja do {copiado_de}: precos repetidos" + (f"; {nota}" if nota else "")
            acrescentar(arq_exec, COLUNAS_EXEC, [{"data": hoje, "rede_id": rede.rede_id, "cep_id": cep["cep_id"], "produtos_tentados": len(paginas), "produtos_lidos": lidos, "resultado": resultado, "erro": limpar(nota), "loja": limpar(rede.loja)}])
            print(f"[{rede.rede_id} {cep['cep_id']}] {resultado}: {lidos}/{len(paginas)} lidos, {sem_preco} sem preco na regiao, {time.time() - inicio:.0f} s" + (f" | loja {rede.loja}" if rede.loja else "") + (f" | {nota}" if nota else ""), flush=True)
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
    ap.add_argument("--redes", default="", help="so estas redes (padrao: todas as prontas)")
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
        for rede in [r for r in REDES if not a.redes or r.rede_id in a.redes.split(",")]:
            da_rede = [l for l in links if l["rede_id"] == rede.rede_id and l["status"] in LINKS_QUE_ENTRAM and l["url"]]
            print(f"[{rede.rede_id}] {len(da_rede)} paginas de produto, {len(ceps)} CEPs", flush=True)
            if not da_rede: continue   # rede ainda sem links conferidos
            if getattr(rede, "preco_unico", False):
                # preco unico: uma vez por noite. Na coleta por zona, so a parte do Centro le estas redes
                if not a.zona or a.zona.lower() == "centro":
                    coletar_unico(rede, da_rede, hoje, a.limite, arq_precos, arq_exec, pw)
                continue
            coletar_rede(pw, rede, da_rede, ceps, hoje, a.limite, a.diagnostico, arq_precos, arq_exec)
    print("fim", flush=True)


if __name__ == "__main__":
    main()
