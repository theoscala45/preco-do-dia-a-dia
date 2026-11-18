"""Aponta os links de data/links.csv que precisam de revisao, lendo so o que a coleta ja gravou.

Uso: python3 coletor/revisar_links.py [dias]   (padrao: os ultimos 7 dias com coleta)
Nao abre nenhum site: le data/precos/*.csv e data/execucoes.csv. Escreve coletor/revisar.md e sai com codigo 1
se algum link precisa de revisao (o fluxo semanal do GitHub usa isso para abrir a issue "Links para revisar").

O que ele aponta, para cada link que entra na coleta (achado ou variante):
- falhando: a pagina deu erro em pelo menos 3 dias (pode ter saido do ar ou mudado de endereco);
- outro produto: o nome que a pagina mostra mudou muito desde o primeiro dia da janela;
- sem estoque: o produto apareceu como indisponivel em todos os dias e em todos os CEPs;
- nunca lido: o link existe, a rede rodou, mas o produto nao aparece em nenhum dia.
"""
import csv, glob, os, re, sys, unicodedata
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIAS = int(sys.argv[1]) if len(sys.argv) > 1 else 7


def ler(caminho):
    with open(caminho, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def palavras(nome):
    t = unicodedata.normalize("NFD", (nome or "").lower()).encode("ascii", "ignore").decode()
    return {p for p in re.split(r"[^a-z0-9]+", t) if len(p) >= 3}


def parecido(a, b):
    pa, pb = palavras(a), palavras(b)
    return not pa or not pb or len(pa & pb) / len(pa | pb) >= 0.5


links = [l for l in ler(os.path.join(RAIZ, "data", "links.csv")) if l["status"] in ("achado", "variante") and l["url"]]
execs = ler(os.path.join(RAIZ, "data", "execucoes.csv"))
datas = sorted({e["data"] for e in execs})[-DIAS:]
execs = [e for e in execs if e["data"] in datas]
precos = [l for f in sorted(glob.glob(os.path.join(RAIZ, "data", "precos", "*.csv"))) for l in ler(f) if l["data"] in datas]
nomes_rede = {r["rede_id"]: r["nome"] for r in ler(os.path.join(RAIZ, "data", "redes.csv"))}
produtos = {p["produto_id"]: f'{p["produto"]} {p["marca"]} {p["tamanho"]}' for p in ler(os.path.join(RAIZ, "data", "produtos.csv"))}

# dias em que cada produto deu erro em cada rede (o campo erro lista "P031: motivo; P033: motivo")
erro_dias = {}
for e in execs:
    for pid, motivo in re.findall(r"\b(P\d{3}): ([^;]+)", e["erro"] or ""):
        erro_dias.setdefault((e["rede_id"], pid), {}).setdefault(e["data"], motivo.strip())
redes_que_rodaram = {e["rede_id"] for e in execs if e["resultado"] in ("ok", "parcial")}

por_link = {}
for l in precos:
    por_link.setdefault((l["rede_id"], l["produto_id"]), []).append(l)

achados = []   # (rede, produto, problema, detalhe)
for lk in links:
    chave = (lk["rede_id"], lk["produto_id"])
    linhas = sorted(por_link.get(chave, []), key=lambda x: (x["data"], x["lido_em"]))
    erros = erro_dias.get(chave, {})
    if len(erros) >= 3:
        achados.append((*chave, "falhando", f'erro em {len(erros)} dias; o último: {list(erros.values())[-1]}'))
        continue
    if not linhas:
        if lk["rede_id"] in redes_que_rodaram and not erros:
            achados.append((*chave, "nunca lido", "a rede rodou, mas este produto não aparece em nenhum dia"))
        continue
    primeiro, ultimo = linhas[0]["nome_na_pagina"], linhas[-1]["nome_na_pagina"]
    if not parecido(primeiro, ultimo):
        achados.append((*chave, "outro produto", f'era "{primeiro}", agora "{ultimo}"'))
    elif len({x["data"] for x in linhas}) >= 3 and all(x["disponivel"] == "nao" for x in linhas):
        achados.append((*chave, "sem estoque", f'indisponível em todos os {len({x["data"] for x in linhas})} dias e em todos os CEPs'))

t = [f"## Links para revisar", "", f"Janela: {len(datas)} {'dia' if len(datas) == 1 else 'dias'} de coleta" + (f" ({datas[0]} a {datas[-1]})" if datas else "") + f". Links que entram na coleta: {len(links)}.", ""]
if not datas:
    t += ["Ainda não há coleta registrada."]
elif not achados:
    t += ["Nenhum link precisa de revisão."]
else:
    t += [f"{len(achados)} links para olhar. Para cada um: abrir a página, conferir o produto e, se for o caso, trocar a linha em `data/links.csv` (status, endereço e observação).", "",
          "| Rede | Produto | Problema | Detalhe |", "|---|---|---|---|"]
    ordem = {"falhando": 0, "outro produto": 1, "nunca lido": 2, "sem estoque": 3}
    for rede, pid, prob, det in sorted(achados, key=lambda a: (ordem[a[2]], a[0], a[1])):
        t += [f"| {nomes_rede.get(rede, rede)} | {pid} {produtos.get(pid, '')} | {prob} | {det.replace('|', '/')} |"]
open(os.path.join(RAIZ, "coletor", "revisar.md"), "w", encoding="utf-8").write("\n".join(t) + "\n")
print("\n".join(t))
sys.exit(1 if achados else 0)
