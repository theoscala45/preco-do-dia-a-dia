"""Baixa do IBGE (SIDRA, tabela 7060) o IPCA mensal e os pesos dos subitens, e grava data/ipca.csv e data/pesos_ipca.csv.

Uso: python3 tools/baixar_ibge.py [meses]     (padrao: 24 meses)

- ipca.csv: variacao mensal do Brasil, para o indice geral, para "Alimentacao e bebidas" e para "Higiene pessoal".
- pesos_ipca.csv: cada produto da cesta ligado ao subitem do IPCA mais parecido e ao peso desse subitem no Brasil,
  no ultimo mes publicado. Quando dois ou mais produtos caem no mesmo subitem (arroz Camil e arroz Tio Joao), o peso do
  subitem e dividido igualmente entre eles. Produtos sem subitem parecido ficam sem peso; o montar_site.py da a eles o
  peso medio dos outros.
Os pesos do Brasil foram escolhidos em vez dos da regiao de Sao Paulo porque a regiao nao publica peso para varios
subitens da cesta (feijao preto, sal, manteiga, sabao em barra e outros).
"""
import csv, json, os, sys, urllib.request
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://apisidra.ibge.gov.br/values/t/7060/n1/all"
FONTE = "IBGE, SIDRA tabela 7060"

# produto -> codigo do subitem do IPCA (classificacao 315)
SUBITEM = {
    "P001": "1101002", "P002": "1101002", "P003": "1101073", "P004": "1101052", "P005": "1113013", "P006": "1113014",
    "P007": "1104003", "P008": "1104004", "P009": "1114022", "P010": "1114022", "P011": "1102012", "P012": "1102023",
    "P013": "1102006", "P014": "1102006", "P015": "1116005", "P016": "1116005", "P017": "1116013", "P018": "1102008",
    "P020": "1104052", "P021": "1112003", "P022": "1112003", "P023": "1112018", "P024": "1113040", "P025": "1116033",
    "P027": "1115039", "P028": "1115075", "P029": "1115058", "P031": "1116041", "P032": "1116071", "P033": "1116048",
    "P034": "1111008", "P036": "1102029", "P037": "1114083", "P038": "1114083", "P039": "1111004", "P040": "1111004",
    "P041": "1111004", "P042": "1111009", "P043": "1111031", "P044": "1111011", "P045": "1111011", "P046": "1111021",
    "P047": "1111019", "P048": "1111019", "P049": "1109002", "P050": "1111011", "P051": "1110044", "P052": "1110044",
    "P053": "6301017", "P054": "6301017", "P055": "6301016", "P056": "6301016", "P057": "6301007", "P058": "6301007",
    "P059": "6301007", "P060": "6301001", "P061": "6301001", "P062": "6301014", "P063": "6301007", "P064": "6301015",
    "P065": "6301002", "P066": "2104009", "P067": "2104019", "P068": "2104085", "P069": "2104008", "P070": "2104005",
    "P071": "2104012", "P072": "2104020", "P073": "2104016", "P074": "2104003", "P075": "2104041", "P076": "2104015",
    "P079": "1110010", "P080": "1110010", "P081": "1110009", "P082": "1107089", "P083": "1107095", "P084": "1107084",
    "P085": "1109008", "P086": "1109007", "P087": "1108080", "P088": "1106008", "P089": "1106017", "P090": "1106039",
    "P091": "1106015", "P092": "1103028", "P093": "1103043", "P094": "1116010", "P095": "1103003", "P096": "1103044",
    "P097": "1105001", "P098": "1106018", "P099": "1103020", "P100": "1103026",
}
# sem subitem parecido no IPCA: aveia (P019), ketchup (P026), ervilha em conserva (P030), creme de leite (P035),
# alcool liquido (P077) e inseticida (P078)


def sidra(caminho):
    req = urllib.request.Request(API + caminho, headers={"User-Agent": "preco-do-dia-a-dia"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)[1:]


def main(meses):
    # IPCA mensal: geral (7169), alimentacao e bebidas (7170), higiene pessoal (7698)
    linhas = sidra(f"/v/63/p/last%20{meses}/c315/7169,7170,7698/d/v63%202")
    por_mes = {}
    for x in linhas:
        m = x["D3C"][:4] + "-" + x["D3C"][4:]
        por_mes.setdefault(m, {})[x["D4C"]] = x["V"]
    with open(os.path.join(RAIZ, "data", "ipca.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["mes", "ipca_mensal_pct", "ipca_alimentos_pct", "ipca_higiene_pct", "fonte"])
        for m in sorted(por_mes):
            v = por_mes[m]
            w.writerow([m, v.get("7169", ""), v.get("7170", ""), v.get("7698", ""), FONTE])
    print(f"ipca.csv: {len(por_mes)} meses, de {min(por_mes)} a {max(por_mes)}")

    # pesos do ultimo mes publicado
    pesos = sidra("/v/66/p/last%201/c315/all/d/v66%204")
    mes = pesos[0]["D3N"]
    peso = {x["D4C"]: (x["D4N"], x["V"]) for x in pesos}
    codigo = {n.split(".")[0]: c for c, (n, _) in peso.items()}
    quantos = {}
    for s in SUBITEM.values(): quantos[s] = quantos.get(s, 0) + 1
    produtos = list(csv.DictReader(open(os.path.join(RAIZ, "data", "produtos.csv"), encoding="utf-8")))
    with open(os.path.join(RAIZ, "data", "pesos_ipca.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["produto_id", "grupo_ipca", "peso_pct", "fonte"])
        for p in produtos:
            s = SUBITEM.get(p["produto_id"])
            if not s:
                w.writerow([p["produto_id"], "sem subitem parecido no IPCA", "", ""]); continue
            nome, v = peso[codigo[s]]
            w.writerow([p["produto_id"], nome, f"{float(v) / quantos[s]:.4f}" if v not in ("-", "...", "") else "",
                        f"{FONTE}, peso do subitem no Brasil em {mes}" + (f", dividido por {quantos[s]} produtos" if quantos[s] > 1 else "")])
    print(f"pesos_ipca.csv: pesos de {mes}, {len(SUBITEM)} produtos com subitem")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 24)
