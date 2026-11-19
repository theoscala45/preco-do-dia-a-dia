"""Le as tabelas CSV e grava assets/dados.json, o arquivo que o site carrega.

Uso:
  python3 tools/montar_site.py exemplo   -> le data/exemplo/ (precos inventados; o site mostra a faixa de aviso)
  python3 tools/montar_site.py real      -> le data/precos/ (quando o coletor estiver rodando)
  python3 tools/montar_site.py real --saida previa.json   -> grava em outro arquivo, sem trocar o site

Precos por kg: nos produtos que a cesta compara por kg (carnes, frutas, verduras), o preco guardado pelo coletor
pode ser o do quilo (unidade kg) ou o de uma bandeja ou pacote (unidade un). No segundo caso, o preco e dividido
pelo peso que a pagina mostra no nome (ex.: banana 1,1kg a R$ 17,59 -> R$ 15,99 o kg). Sem peso no nome, o preco
fica de fora.

Contas:
- Preco de referencia de um produto num ponto = mediana dos precos das redes naquele ponto.
- Cesta do ponto = soma dos precos de referencia dos produtos do indice (carnes e hortifruti ficam fora).
  So entram produtos com preco em todos os pontos e em todas as datas, para a comparacao ser justa.
- Indice local = media ponderada da variacao de preco de cada produto desde a primeira data, x 100. A variacao de
  um produto num ponto e a mediana da variacao de cada rede que tinha preco nas duas datas: cada rede e comparada
  com ela mesma. Assim, uma rede que entra ou sai da coleta nao vira inflacao falsa.
- IPCA acumulado = produto das variacoes mensais dos meses depois do mes da primeira data, ate o mes de cada data.
  Os meses que o IBGE ainda nao publicou contam como zero (o campo "ipca_ate" diz o ultimo mes publicado).
- Real: so entram as coletas a partir do "inicio" de data/site.txt (o primeiro dia com todas as redes).
  O peso de cada produto vem de data/pesos_ipca.csv (peso do subitem no IPCA, do IBGE). Produto sem subitem
  parecido no IPCA recebe o peso medio dos outros. Se a tabela de pesos estiver vazia, cada produto pesa igual.
"""
import csv, json, os, re, statistics, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ler(caminho):
    return list(csv.DictReader(open(os.path.join(RAIZ, caminho), encoding="utf-8")))

def peso_kg(texto):
    """Peso em kg escrito num nome ou tamanho ("1,1kg", "500g", "Bandeja 600 g"). None se nao houver."""
    m = re.findall(r"(\d+(?:[.,]\d+)?)\s*(kg|g)\b", texto or "", re.I)
    if not m: return None
    n, u = m[-1]
    v = float(n.replace(",", "."))
    return v if u.lower() == "kg" else v / 1000

def preco_comparavel(l, por_kg, tamanho_da_cesta=""):
    """O preco que entra nas contas: o da pagina ou, nos produtos comparados por kg, o do quilo.
    Produto da cesta com peso fixo (ex.: queijo minas de 500 g) que a rede vende por peso: a pagina da o preco do
    quilo, e ele vira o preco do peso da cesta (R$ 69,90 o kg -> R$ 34,95 os 500 g)."""
    v = float(l["preco_reais"])
    if not por_kg and l.get("unidade_de_venda") == "kg" and peso_kg(tamanho_da_cesta):
        return round(v * peso_kg(tamanho_da_cesta), 2)
    if not por_kg or l.get("unidade_de_venda") == "kg":
        return v
    kg = peso_kg(l.get("tamanho_na_pagina")) or peso_kg(l.get("nome_na_pagina"))
    return round(v / kg, 2) if kg else None

def config():
    """Le data/site.txt (linhas chave=valor; # comeca comentario)."""
    c = {}
    for linha in open(os.path.join(RAIZ, "data", "site.txt"), encoding="utf-8"):
        linha = linha.split("#")[0].strip()
        if "=" in linha:
            k, v = linha.split("=", 1); c[k.strip()] = v.strip()
    return c

def main(modo, arquivo_saida="assets/dados.json", arquivos_precos=None, inicio=None):
    pasta = "data/exemplo" if modo == "exemplo" else "data"
    produtos, ceps, redes_tab = ler("data/produtos.csv"), ler("data/ceps.csv"), ler("data/redes.csv")
    if modo == "exemplo":
        todos = ler(pasta + "/precos.csv")
    else:   # o coletor grava um arquivo por mes em data/precos/
        import glob
        arquivos = arquivos_precos or sorted(glob.glob(os.path.join(RAIZ, "data/precos/*.csv")))
        todos = [l for f in arquivos for l in csv.DictReader(open(f, encoding="utf-8"))]
        inicio = inicio if inicio is not None else config().get("inicio", "")
        todos = [l for l in todos if l["data"] >= inicio]
    precos = [l for l in todos if l["disponivel"] == "sim"]
    if not precos: sys.exit("Ainda nao ha precos coletados em data/precos/ (a partir do inicio de data/site.txt).")
    datas = sorted({l["data"] for l in precos}); ultima = datas[-1]
    redes = sorted({l["rede_id"] for l in precos})
    pid = {p["produto_id"]: i for i, p in enumerate(produtos)}
    cid = {c["cep_id"]: i for i, c in enumerate(ceps)}
    # preco[data][rede][cep ou ""][produto]
    tab = {}
    por_kg = {p["produto_id"] for p in produtos if "kg" in p["compara_por"].lower()}
    tam_cesta = {p["produto_id"]: p["tamanho"] for p in produtos}
    fora = 0
    for l in precos:
        v = preco_comparavel(l, l["produto_id"] in por_kg, tam_cesta.get(l["produto_id"], "")) if modo != "exemplo" else float(l["preco_reais"])
        if v is None: fora += 1; continue
        tab.setdefault(l["data"], {}).setdefault(l["rede_id"], {}).setdefault(l["cep_id"], {})[l["produto_id"]] = v
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
    if not completos:
        print("aviso: nenhum produto do indice tem preco em todos os pontos e datas; a cesta e o indice ficam vazios")
        total_w = 1
    def variacao(d, cep, prod):
        # cada rede contra ela mesma; sem nenhuma rede com preco nas duas datas, usa a mediana do ponto
        rs = [b / a for r in redes for a, b in [(no_ponto(datas[0], r, cep, prod), no_ponto(d, r, cep, prod))] if a and b]
        return statistics.median(rs) if rs else ref[d, cep, prod] / ref[datas[0], cep, prod]
    pontos = []
    for c in ceps:
        cid = c["cep_id"]
        cesta = sum(ref[datas[-1], cid, p] for p in completos)
        serie = [100 * sum(w[p] * variacao(d, cid, p) for p in completos) / total_w if completos else 100.0 for d in datas]
        pontos.append({"id": cid, "cesta": round(cesta, 2), "serie": [round(v, 2) for v in serie], "var": round(serie[-1] - 100, 2)})
    # IPCA acumulado, base 100 na primeira data: cada mes entra uma vez, a partir do mes seguinte ao da base
    meses = {l["mes"]: float(l["ipca_mensal_pct"]) for l in ler(pasta + "/ipca.csv") if l["ipca_mensal_pct"]}
    def acumulado(d):
        v = 100.0
        for m in sorted(meses):
            if datas[0][:7] < m <= d[:7]: v *= 1 + meses[m] / 100
        return round(v, 2)
    ipca = [acumulado(d) for d in datas]
    # precos da ultima data, para o comparador de cesta
    ult = {}
    for r in redes:
        por_cep = any(k != "" for k in tab[ultima].get(r, {}))
        if por_cep:
            ult[r] = [[tab[ultima][r].get(c["cep_id"], {}).get(p["produto_id"]) for p in produtos] for c in ceps]
        else:
            ult[r] = [tab[ultima][r].get("", {}).get(p["produto_id"]) for p in produtos]
    nomes = {r["rede_id"]: r["nome"] for r in redes_tab}
    saida = {"exemplo": modo == "exemplo", "datas": datas, "itens_na_cesta": len(completos), "ipca": ipca, "ipca_ate": max(meses) if meses else None,
             "pesos": {"com_peso": len(com_peso), "sem_peso": len(completos) - len(com_peso), "fonte": "IBGE, SIDRA tabela 7060"} if com_peso else None,
             "pontos": pontos,
             "produtos": [{"id": p["produto_id"], "nome": p["produto"], "marca": p["marca"], "tam": p["tamanho"],
                           "cat": p["categoria"], "indice": p["entra_no_indice"] == "sim",
                           "peso": round(pesos.get(p["produto_id"], medio), 4)} for p in produtos],
             "redes": [{"id": r, "nome": nomes.get(r, r), "por_cep": isinstance(ult[r][0], list)} for r in redes],
             "precos": ult}
    json.dump(saida, open(os.path.join(RAIZ, arquivo_saida), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    if fora: print(f"aviso: {fora} precos por kg ficaram de fora (sem peso no nome da pagina)")
    c = [p["cesta"] for p in pontos]
    print(f"ok: {len(datas)} datas, {len(redes)} redes, cesta de {len(completos)} itens, de R$ {min(c):.2f} a R$ {max(c):.2f}")
    sem = [p["produto_id"] for p in produtos if p["produto_id"] in do_indice and p["produto_id"] not in completos]
    if sem: print(f"fora da cesta por falta de preco em algum ponto: {len(sem)} produtos ({', '.join(sem[:12])}{'...' if len(sem) > 12 else ''})")
    print("variacao 12m por ponto: de", min(p["var"] for p in pontos), "a", max(p["var"] for p in pontos), "| ipca", ipca[-1])

if __name__ == "__main__":
    args = sys.argv[1:]
    saida = args[args.index("--saida") + 1] if "--saida" in args else "assets/dados.json"
    modo = next((a for a in args if a in ("exemplo", "real")), "exemplo")
    precos = args[args.index("--precos") + 1].split(",") if "--precos" in args else None
    inicio = args[args.index("--inicio") + 1] if "--inicio" in args else None
    main(modo, saida, precos, inicio)
