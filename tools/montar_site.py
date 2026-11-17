"""Le as tabelas CSV e grava assets/dados.json, o arquivo que o site carrega.

Uso:
  python3 tools/montar_site.py exemplo   -> le data/exemplo/ (precos inventados; o site mostra a faixa de aviso)
  python3 tools/montar_site.py real      -> le data/precos/ (quando o coletor estiver rodando)

Contas:
- Preco de referencia de um produto num ponto = mediana dos precos das redes naquele ponto.
- Cesta do ponto = soma dos precos de referencia dos produtos do indice (carnes e hortifruti ficam fora).
  So entram produtos com preco em todos os pontos e em todas as datas, para a comparacao ser justa.
- Indice local = media ponderada da variacao de preco de cada produto desde a primeira data, x 100.
  O peso de cada produto vem de data/pesos_ipca.csv (peso do subitem no IPCA, do IBGE). Produto sem subitem
  parecido no IPCA recebe o peso medio dos outros. Se a tabela de pesos estiver vazia, cada produto pesa igual.
"""
import csv, json, os, statistics, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ler(caminho):
    return list(csv.DictReader(open(os.path.join(RAIZ, caminho), encoding="utf-8")))

def main(modo):
    pasta = "data/exemplo" if modo == "exemplo" else "data"
    produtos, ceps, redes_tab = ler("data/produtos.csv"), ler("data/ceps.csv"), ler("data/redes.csv")
    if modo == "exemplo":
        todos = ler(pasta + "/precos.csv")
    else:   # o coletor grava um arquivo por mes em data/precos/
        import glob
        todos = [l for f in sorted(glob.glob(os.path.join(RAIZ, "data/precos/*.csv"))) for l in csv.DictReader(open(f, encoding="utf-8"))]
    precos = [l for l in todos if l["disponivel"] == "sim"]
    if not precos: sys.exit("Ainda nao ha precos coletados em data/precos/. Use o modo exemplo.")
    datas = sorted({l["data"] for l in precos}); ultima = datas[-1]
    redes = sorted({l["rede_id"] for l in precos})
    pid = {p["produto_id"]: i for i, p in enumerate(produtos)}
    cid = {c["cep_id"]: i for i, c in enumerate(ceps)}
    # preco[data][rede][cep ou ""][produto]
    tab = {}
    for l in precos:
        tab.setdefault(l["data"], {}).setdefault(l["rede_id"], {}).setdefault(l["cep_id"], {})[l["produto_id"]] = float(l["preco_reais"])
    def no_ponto(data, rede, cep, prod):
        r = tab[data].get(rede, {})
        return r.get(cep, {}).get(prod, r.get("", {}).get(prod))
    def referencia(data, cep, prod):
        v = [x for x in (no_ponto(data, r, cep, prod) for r in redes) if x is not None]
        return statistics.median(v) if v else None
    do_indice = [p["produto_id"] for p in produtos if p["entra_no_indice"] == "sim"]
    ref = {(d, c, p): referencia(d, c, p) for d in datas for c in cid for p in do_indice}
    completos = [p for p in do_indice if all(ref[d, c, p] is not None for d in datas for c in cid)]
    pesos = {l["produto_id"]: float(l["peso_pct"]) for l in ler("data/pesos_ipca.csv") if l["peso_pct"]}
    com_peso = [pesos[p] for p in completos if p in pesos]
    medio = sum(com_peso) / len(com_peso) if com_peso else 1.0
    w = {p: pesos.get(p, medio) for p in completos}
    total_w = sum(w.values())
    pontos = []
    for c in ceps:
        cid = c["cep_id"]
        cesta = sum(ref[datas[-1], cid, p] for p in completos)
        serie = [100 * sum(w[p] * ref[d, cid, p] / ref[datas[0], cid, p] for p in completos) / total_w for d in datas]
        pontos.append({"id": cid, "cesta": round(cesta, 2), "serie": [round(v, 2) for v in serie], "var": round(serie[-1] - 100, 2)})
    # IPCA acumulado, base 100 na primeira data
    ipca = [100.0]
    meses = {l["mes"]: float(l["ipca_mensal_pct"]) for l in ler(pasta + "/ipca.csv")}
    for d in datas[1:]:
        ipca.append(round(ipca[-1]*(1+meses.get(d[:7], 0)/100), 2))
    # precos da ultima data, para o comparador de cesta
    ult = {}
    for r in redes:
        por_cep = any(k != "" for k in tab[ultima].get(r, {}))
        if por_cep:
            ult[r] = [[tab[ultima][r].get(c["cep_id"], {}).get(p["produto_id"]) for p in produtos] for c in ceps]
        else:
            ult[r] = [tab[ultima][r].get("", {}).get(p["produto_id"]) for p in produtos]
    nomes = {r["rede_id"]: r["nome"] for r in redes_tab}
    saida = {"exemplo": modo == "exemplo", "datas": datas, "itens_na_cesta": len(completos), "ipca": ipca,
             "pesos": {"com_peso": len(com_peso), "sem_peso": len(completos) - len(com_peso), "fonte": "IBGE, SIDRA tabela 7060"} if com_peso else None,
             "pontos": pontos,
             "produtos": [{"id": p["produto_id"], "nome": p["produto"], "marca": p["marca"], "tam": p["tamanho"],
                           "cat": p["categoria"], "indice": p["entra_no_indice"] == "sim"} for p in produtos],
             "redes": [{"id": r, "nome": nomes.get(r, r), "por_cep": isinstance(ult[r][0], list)} for r in redes],
             "precos": ult}
    json.dump(saida, open(os.path.join(RAIZ, "assets/dados.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    c = [p["cesta"] for p in pontos]
    print(f"ok: {len(datas)} datas, {len(redes)} redes, cesta de {len(completos)} itens, de R$ {min(c):.2f} a R$ {max(c):.2f}")
    print("variacao 12m por ponto: de", min(p["var"] for p in pontos), "a", max(p["var"] for p in pontos), "| ipca", ipca[-1])

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "exemplo")
