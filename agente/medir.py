"""Mede o acerto do agente de casamento contra uma conferencia feita a mao.

Uso: python3 agente/medir.py tenda
Compara agente/saida/<rede>.csv com data/links.csv (as decisoes conferidas, uma por produto) e grava
agente/saida/<rede>-acerto.md.

Contas:
- Acerto de status: o agente deu o mesmo status (achado, variante, tamanho_diferente, nao_achado) que a conferencia.
- Acerto de pagina: entre os produtos que a conferencia ligou a uma pagina, o agente escolheu a mesma pagina.
  Um produto pode ter mais de uma pagina valida (o mesmo item cadastrado duas vezes); a medida e conservadora.
- Erro grave: o agente ligou o produto a uma pagina que nao serve (status achado ou variante numa pagina diferente
  da conferida, ou num produto que a conferencia marcou como nao_achado). E o erro que estragaria a comparacao de precos.
"""
import csv, os, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main(rede):
    certo = {l["produto_id"]: l for l in csv.DictReader(open(os.path.join(RAIZ, "data", "links.csv"), encoding="utf-8")) if l["rede_id"] == rede}
    agente = {l["produto_id"]: l for l in csv.DictReader(open(os.path.join(RAIZ, "agente", "saida", f"{rede}.csv"), encoding="utf-8"))}
    ids = sorted(set(certo) & set(agente))
    st = sum(certo[i]["status"] == agente[i]["status"] for i in ids)
    com_pagina = [i for i in ids if certo[i]["url"] and certo[i]["status"] in ("achado", "variante")]
    pag = sum(certo[i]["url"].rstrip("/") == agente[i]["url"].rstrip("/") for i in com_pagina)
    graves = [i for i in ids if agente[i]["status"] in ("achado", "variante") and agente[i]["url"].rstrip("/") != certo[i]["url"].rstrip("/")]
    pct = lambda a, b: f"{100 * a / b:.0f}%" if b else "-"
    t = [f"# Acerto do agente de casamento: {rede}", "",
         f"Produtos comparados: {len(ids)}", "",
         "| Medida | Resultado |", "|---|---|",
         f"| Mesmo status da conferência | {st} de {len(ids)} ({pct(st, len(ids))}) |",
         f"| Mesma página, entre os produtos com página conferida | {pag} de {len(com_pagina)} ({pct(pag, len(com_pagina))}) |",
         f"| Erros graves (página que não serve) | {len(graves)} |", ""]
    if graves:
        t += ["## Erros graves", "", "| Produto | Conferência | Agente | Motivo do agente |", "|---|---|---|---|"]
        t += [f"| {i} | {certo[i]['status']} {certo[i]['url'].rsplit('/', 1)[-1]} | {agente[i]['status']} {agente[i]['titulo_na_pagina']} | {agente[i]['motivo']} |" for i in graves]
    divergentes = [i for i in ids if certo[i]["status"] != agente[i]["status"] and i not in graves]
    if divergentes:
        t += ["", "## Outros desacordos de status", "", "| Produto | Conferência | Agente | Motivo do agente |", "|---|---|---|---|"]
        t += [f"| {i} | {certo[i]['status']} | {agente[i]['status']} | {agente[i]['motivo']} |" for i in divergentes]
    caminho = os.path.join(RAIZ, "agente", "saida", f"{rede}-acerto.md")
    open(caminho, "w", encoding="utf-8").write("\n".join(t) + "\n")
    print("\n".join(t[:9]))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tenda")
