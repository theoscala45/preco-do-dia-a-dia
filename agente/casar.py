"""Agente de casamento de produtos: acha, no site de uma rede, a pagina de cada produto da cesta.

Uso:
  python3 agente/casar.py atacadao                 -> grava agente/saida/atacadao.csv
  python3 agente/casar.py tenda --so P001,P002     -> so alguns produtos

Como funciona, para cada produto da cesta (data/produtos.csv):
1. Busca. Le o sitemap da rede (lista publica de enderecos de produto) e separa ate 15 candidatos cujo endereco
   tem palavras do nome e da marca. Isso e codigo comum, sem IA.
2. Leitura. Abre a pagina de cada candidato, devagar, e pega so o titulo que a pagina mostra.
3. Decisao. Manda ao Claude o produto da cesta e os titulos. Ele escolhe um candidato e da um status:
   achado (marca, tipo e tamanho iguais), variante (mesma marca e tamanho, muda linha, sabor ou fragrancia),
   tamanho_diferente (so existe em outro tamanho) ou nao_achado. E diz o motivo em uma frase.
As mesmas regras de data/LEIAME.md valem aqui. A decisao do agente nao vai direto para data/links.csv:
uma pessoa revisa a saida antes. O acerto do agente e medido por agente/medir.py.

Precisa da variavel de ambiente ANTHROPIC_API_KEY (no GitHub, um "secret" do repositorio). Cada produto custa
uma chamada ao modelo; os 100 produtos de uma rede custam alguns dolares.
"""
import argparse, csv, html, os, re, sys, time, unicodedata, urllib.request, urllib.robotparser
from typing import Literal, Optional

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELO = "claude-opus-5-5"
AGENTE = "Mozilla/5.0 (preco-do-dia-a-dia)"
PAUSA = 1.5   # segundos entre uma pagina e a proxima

# o que muda de uma rede para outra: onde esta o sitemap e como achar o titulo na pagina
REDES = {
    "tenda": {
        "site": "https://www.tendaatacado.com.br",
        "sitemaps": ["https://www.tendaatacado.com.br/google-sitemap/sitemap-produtos.xml"],
        "titulo": r"<h1[^>]*>([^<]+)</h1>",
    },
    "atacadao": {
        "site": "https://www.atacadao.com.br",
        "sitemaps": ["https://www.atacadao.com.br/sitemap.xml"],   # indice: as partes product-*.xml sao lidas dele
        "titulo": r"product-details-title[^>]*>([^<]+)",
    },
}
VAZIAS = {"de", "da", "do", "com", "em", "e", "a", "o", "tipo", "tradicional", "sem", "marca", "loja", "definir"}


def baixar(url):
    time.sleep(PAUSA)
    req = urllib.request.Request(url, headers={"User-Agent": AGENTE})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def palavras(texto):
    t = unicodedata.normalize("NFD", texto.lower()).encode("ascii", "ignore").decode()
    return [p for p in re.split(r"[^a-z0-9]+", t) if p and p not in VAZIAS]


def enderecos(rede):
    """Todos os enderecos de produto do sitemap da rede."""
    urls = []
    for s in REDES[rede]["sitemaps"]:
        x = baixar(s)
        locs = re.findall(r"<loc>([^<]+)</loc>", x)
        partes = [u for u in locs if u.endswith(".xml") and "product" in u]
        if partes:
            for p in partes: urls += re.findall(r"<loc>([^<]+)</loc>", baixar(p))
        else:
            urls += locs
    return [u for u in urls if not u.endswith(".xml")]


def candidatos(produto, urls, quantos=15):
    """Passo 1: busca por palavras no endereco. Marca obrigatoria quando a cesta fixa uma marca."""
    nome, marca = palavras(produto["produto"]), palavras(produto["marca"])
    tam = re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", produto["tamanho"].lower()).encode("ascii", "ignore").decode())
    sem_marca = produto["marca"] in ("Sem marca", "Marca da loja", "Marca a definir")
    pontos = []
    for u in urls:
        partes = [x for x in u.rstrip("/").split("/") if x]
        trecho = partes[-2] if partes[-1] == "p" else partes[-1]   # o Atacadao termina o endereco em /p
        ws = set(re.split(r"[^a-z0-9]+", trecho.lower()))
        junto = trecho.replace("-", "").lower()
        if not sem_marca and not all(m in ws or m in junto for m in marca): continue
        n = sum(1 for p in nome if p in ws)
        if n == 0: continue
        pontos.append((n + (2 if tam and tam in junto else 0), u))
    pontos.sort(key=lambda x: -x[0])
    return [u for _, u in pontos[:quantos]]


def titulo(rede, url):
    """Passo 2: o titulo que a pagina mostra. So o titulo: nada de fotos nem descricoes."""
    m = re.search(REDES[rede]["titulo"], baixar(url))
    return html.unescape(m.group(1)).strip() if m else ""


def decidir(cliente, produto, opcoes):
    """Passo 3: o Claude escolhe. Saida estruturada, validada pelo pydantic."""
    from pydantic import BaseModel

    class Decisao(BaseModel):
        escolha: Optional[int]   # numero do candidato, ou null se nenhum serve
        status: Literal["achado", "variante", "tamanho_diferente", "nao_achado"]
        motivo: str

    lista = "\n".join(f"{i}. {t}" for i, (_, t) in enumerate(opcoes, 1)) or "(nenhum candidato)"
    pedido = f"""Produto da cesta: {produto['produto']}, marca {produto['marca']}, tamanho {produto['tamanho']}, compara por {produto['compara_por']}.

Páginas de produto encontradas no site da rede (título que cada página mostra):
{lista}

Escolha a página que corresponde ao produto da cesta e dê o status:
- achado: mesma marca, mesmo tipo de produto e mesmo tamanho.
- variante: mesma marca e mesmo tamanho, muda só a linha, o sabor, a fragrância ou a embalagem. Para produtos comparados por kg (carnes, frutas, verduras), o peso da bandeja não importa, e a marca pode faltar.
- tamanho_diferente: o produto certo existe, mas só em outro tamanho. Indique esse candidato.
- nao_achado: nenhum candidato serve. Use escolha = null.
Prefira achado a variante quando houver os dois. Um kit, um pacote com várias unidades ou um tamanho de atacado não é o mesmo produto.
O motivo é uma frase curta, em português."""
    resp = cliente.messages.parse(
        model=MODELO,
        max_tokens=2000,
        output_config={"effort": "low"},
        messages=[{"role": "user", "content": pedido}],
        output_format=Decisao,
    )
    if resp.stop_reason == "refusal" or resp.parsed_output is None:
        return None, "nao_achado", "o modelo não respondeu"
    d = resp.parsed_output
    if d.escolha is not None and not (1 <= d.escolha <= len(opcoes)):
        return None, "nao_achado", "escolha fora da lista"
    return (opcoes[d.escolha - 1][0] if d.escolha else None), d.status, d.motivo


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("rede", choices=sorted(REDES))
    ap.add_argument("--so", default="", help="ids de produto separados por virgula")
    a = ap.parse_args()
    import anthropic
    cliente = anthropic.Anthropic()
    rp = urllib.robotparser.RobotFileParser()
    rp.parse(baixar(REDES[a.rede]["site"] + "/robots.txt").splitlines())
    urls = [u for u in enderecos(a.rede) if rp.can_fetch("*", u)]
    print(f"{a.rede}: {len(urls)} enderecos de produto liberados pelo robots.txt", flush=True)
    produtos = list(csv.DictReader(open(os.path.join(RAIZ, "data", "produtos.csv"), encoding="utf-8")))
    if a.so: produtos = [p for p in produtos if p["produto_id"] in a.so.split(",")]
    os.makedirs(os.path.join(RAIZ, "agente", "saida"), exist_ok=True)
    saida = os.path.join(RAIZ, "agente", "saida", f"{a.rede}.csv")
    with open(saida, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["produto_id", "rede_id", "url", "status", "titulo_na_pagina", "motivo", "candidatos_vistos"])
        for p in produtos:
            cands = candidatos(p, urls)
            opcoes = [(u, titulo(a.rede, u)) for u in cands]
            opcoes = [(u, t) for u, t in opcoes if t]
            url, status, motivo = decidir(cliente, p, opcoes)
            tit = next((t for u, t in opcoes if u == url), "")
            w.writerow([p["produto_id"], a.rede, url or "", status, tit, motivo, len(opcoes)])
            f.flush()
            print(f"{p['produto_id']} {status:18} {tit[:60]}", flush=True)
    print("gravado em", saida)


if __name__ == "__main__":
    main()
