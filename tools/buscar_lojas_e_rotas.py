"""Busca dados reais do OpenStreetMap para o mapa do site.

Passos (rodar nesta ordem, um por vez):
  python3 tools/buscar_lojas_e_rotas.py lojas    -> data/lojas.csv       (lojas de cada rede na Grande SP)
  python3 tools/buscar_lojas_e_rotas.py lojas tenda  -> busca de novo so o Tenda e mantem as outras redes
  python3 tools/buscar_lojas_e_rotas.py pontos   -> data/pontos_geo.csv  (latitude e longitude dos 25 pontos de coleta)
  python3 tools/buscar_lojas_e_rotas.py rotas    -> assets/rotas.json    (caminho de carro de cada ponto ate a loja mais proxima de cada rede)

Fontes: Nominatim (busca do OpenStreetMap) para lojas e enderecos, OSRM (servidor de demonstracao) para as rotas.
Dados (c) colaboradores do OpenStreetMap, licenca ODbL.
Regras: um pedido por segundo, so fatos (nome, endereco, coordenada). O cadastro do OpenStreetMap e feito por
voluntarios: pode faltar loja ou sobrar loja fechada.
"""
import csv, json, math, os, sys, time, urllib.error, urllib.parse, urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGENTE = "coleta-estudantil/1.0"
CAIXA = "-47.00,-23.25,-46.25,-24.05"   # Grande Sao Paulo: oeste, norte, leste, sul
# o que procurar em cada rede e o que o nome precisa ter
REDES = {
    "tenda": (["Tenda Atacado", "Tenda Atacadista", "Tenda"], ["tenda atacad", "tenda"]),
    "carrefour": (["Carrefour", "Carrefour Bairro", "Carrefour Hipermercado"], ["carrefour"]),
    "atacadao": (["Atacadão"], ["atacadão", "atacadao"]),
    "pao-de-acucar": (["Pão de Açúcar"], ["pão de açúcar", "pao de acucar"]),
    "sonda": (["Sonda Supermercados", "Sonda"], ["sonda"]),
    "santa-luzia": (["Casa Santa Luzia"], ["santa luzia"]),
    "hirota": (["Hirota Food", "Hirota"], ["hirota"]),
    "st-marche": (["St Marche", "St. Marche", "Santa Marche"], ["marche", "marché"]),
    "nagumo": (["Nagumo", "Supermercado Nagumo"], ["nagumo"]),
    "mambo": (["Mambo", "Supermercado Mambo", "Mambo Supermercados"], ["mambo"]),
}
TIPOS = {"supermarket", "wholesale", "department_store", "mall", "greengrocer", "deli"}
FORA = ["tenda dos", "tenda 1", "tenda 2", "tenda da", "tenda do ", "express", "minuto", "posto", "drogaria", "farmácia", "farmacia", "estacionamento", "banco", "sorvete", "eletro", "atacadão dos", "atacadao dos", "atacadão de", "atacadao de", "atacadão da", "atacadão do"]


def pedir(url, pausa=1.5):
    """Um pedido por vez. Se o servico pedir calma (erro 429), espera e tenta de novo, ate 3 vezes."""
    for tentativa in range(4):
        time.sleep(pausa)
        req = urllib.request.Request(url, headers={"User-Agent": AGENTE, "Accept-Language": "pt-BR"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429 or tentativa == 3: raise
            print("servico pediu calma (429), esperando", 60 * (tentativa + 1), "s", flush=True)
            time.sleep(60 * (tentativa + 1))


def metros(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def endereco(a):
    rua = a.get("road") or a.get("pedestrian") or ""
    num = a.get("house_number")
    bairro = a.get("suburb") or a.get("neighbourhood") or a.get("city_district") or ""
    cidade = a.get("city") or a.get("town") or a.get("municipality") or ""
    return ", ".join(x for x in [rua + (f", {num}" if num else ""), bairro, cidade] if x)


def lojas(so=None):
    """so: lista de redes para buscar de novo. As outras redes ficam como estao em data/lojas.csv."""
    linhas = []
    if so:
        linhas = [{**l, "lat": float(l["lat"]), "lon": float(l["lon"])} for l in csv.DictReader(open(os.path.join(RAIZ, "data", "lojas.csv"), encoding="utf-8")) if l["rede_id"] not in so]
    for rede, (buscas, nomes) in REDES.items():
        if so and rede not in so: continue
        achadas, vistos = [], set()
        for q in buscas:
            fora = []
            for _ in range(6):   # ate 6 paginas de 50
                url = ("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=50&bounded=1&countrycodes=br"
                       f"&viewbox={CAIXA}&q={urllib.parse.quote(q)}" + (f"&exclude_place_ids={','.join(fora)}" if fora else ""))
                res = pedir(url)
                if not res: break
                for x in res:
                    fora.append(str(x["place_id"]))
                    chave = (x["osm_type"], x["osm_id"])
                    nome = (x.get("name") or "").strip()
                    baixo = nome.lower()
                    if chave in vistos or x.get("category") != "shop" or x.get("type") not in TIPOS: continue
                    if not any(n in baixo for n in nomes) or any(f in baixo for f in FORA): continue
                    vistos.add(chave)
                    achadas.append({"rede_id": rede, "nome": nome, "lat": float(x["lat"]), "lon": float(x["lon"]),
                                    "endereco": endereco(x.get("address", {})), "osm": f"{x['osm_type']}/{x['osm_id']}"})
                if len(res) < 50: break
        # a mesma loja as vezes aparece duas vezes (ponto e predio): fica uma so
        unicas = []
        for l in achadas:
            if all(metros((l["lat"], l["lon"]), (u["lat"], u["lon"])) > 200 for u in unicas): unicas.append(l)
        print(rede, len(achadas), "->", len(unicas), flush=True)
        linhas += unicas
    with open(os.path.join(RAIZ, "data", "lojas.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["rede_id", "nome", "lat", "lon", "endereco", "osm"])
        w.writeheader()
        for l in linhas: w.writerow({**l, "lat": f"{l['lat']:.6f}", "lon": f"{l['lon']:.6f}"})


def pontos():
    saida = []
    for p in csv.DictReader(open(os.path.join(RAIZ, "data", "ceps.csv"), encoding="utf-8")):
        bairro = p["bairro"].split(" (")[0]
        achado = None
        for q, precisao in [(f"{p['rua']}, {p['cep']}, São Paulo", "rua_e_cep"), (f"{p['rua']}, {bairro}, São Paulo", "rua_e_bairro"), (f"{p['rua']}, São Paulo", "rua")]:
            res = pedir(f"https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&viewbox={CAIXA}&bounded=1&q={urllib.parse.quote(q)}")
            if res: achado = (res[0], precisao); break
        if not achado: print("SEM COORDENADA", p["cep_id"]); continue
        x, precisao = achado
        print(p["cep_id"], precisao, x["display_name"][:80], flush=True)
        saida.append({"cep_id": p["cep_id"], "lat": f"{float(x['lat']):.6f}", "lon": f"{float(x['lon']):.6f}", "precisao": precisao, "osm": f"{x['osm_type']}/{x['osm_id']}"})
    with open(os.path.join(RAIZ, "data", "pontos_geo.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["cep_id", "lat", "lon", "precisao", "osm"])
        w.writeheader(); w.writerows(saida)


def rotas():
    ler = lambda n: list(csv.DictReader(open(os.path.join(RAIZ, "data", n), encoding="utf-8")))
    geo = {p["cep_id"]: (float(p["lat"]), float(p["lon"])) for p in ler("pontos_geo.csv")}
    todas = [{**l, "lat": float(l["lat"]), "lon": float(l["lon"])} for l in ler("lojas.csv")]
    cidade = pedir("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&featureType=city&q=" + urllib.parse.quote("São Paulo"))[0]
    sul, norte, oeste, leste = map(float, cidade["boundingbox"])
    saida = {"fonte": "OpenStreetMap (Nominatim) e OSRM. Dados (c) colaboradores do OpenStreetMap, ODbL.",
             "cidade": {"oeste": oeste, "sul": sul, "leste": leste, "norte": norte},
             "lojas": [{"rede": l["rede_id"], "nome": l["nome"], "end": l["endereco"], "lat": l["lat"], "lon": l["lon"]} for l in todas],
             "pontos": []}
    for cep_id in sorted(geo):
        P = geo[cep_id]
        # 3 lojas mais proximas em linha reta de cada rede; depois a mais proxima pelas ruas
        cand = []
        for rede in REDES:
            da = sorted((i for i, l in enumerate(todas) if l["rede_id"] == rede), key=lambda i: metros(P, (todas[i]["lat"], todas[i]["lon"])))[:3]
            cand += da
        coords = ";".join([f"{P[1]:.6f},{P[0]:.6f}"] + [f"{todas[i]['lon']:.6f},{todas[i]['lat']:.6f}" for i in cand])
        tab = pedir(f"https://router.project-osrm.org/table/v1/driving/{coords}?sources=0&annotations=distance")
        dist = tab["distances"][0][1:]
        por_rede = {}
        for rede in REDES:
            ops = [(dist[k], i) for k, i in enumerate(cand) if todas[i]["rede_id"] == rede and dist[k] is not None]
            if not ops: continue
            _, i = min(ops)
            l = todas[i]
            r = pedir(f"https://router.project-osrm.org/route/v1/driving/{P[1]:.6f},{P[0]:.6f};{l['lon']:.6f},{l['lat']:.6f}?overview=full&geometries=polyline")["routes"][0]
            por_rede[rede] = {"loja": i, "km": round(r["distance"] / 1000, 1), "min": round(r["duration"] / 60), "linha": r["geometry"]}
        saida["pontos"].append({"id": cep_id, "lat": P[0], "lon": P[1], "redes": por_rede})
        print(cep_id, {k: v["km"] for k, v in por_rede.items()}, flush=True)
    json.dump(saida, open(os.path.join(RAIZ, "assets", "rotas.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    if sys.argv[1] == "lojas": lojas(sys.argv[2].split(",") if len(sys.argv) > 2 else None)
    else: {"pontos": pontos, "rotas": rotas}[sys.argv[1]]()
