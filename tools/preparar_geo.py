"""Gera assets/geo.json: os distritos e os 25 pontos de coleta em latitude e longitude, para o mapa real.

Uso: python3 tools/preparar_geo.py   (depois de buscar_lojas_e_rotas.py pontos e rotas)

Le assets/mapa.json (contorno dos distritos, feito por preparar_mapa.py e arredondar_mapa.py),
data/ceps.csv, data/pontos_geo.csv e o retangulo da cidade gravado em assets/rotas.json.
O mapa.json guarda os distritos numa escala propria (100 unidades de altura). Aqui a conta e desfeita
usando o retangulo da cidade no OpenStreetMap. O contorno e simplificado: serve para a visao da cidade
inteira, nao para medir limite de distrito na escala da rua.
"""
import csv, json, math, os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ler = lambda *c: open(os.path.join(RAIZ, *c), encoding="utf-8")

mapa = json.load(ler("assets", "mapa.json"))
cid = json.load(ler("assets", "rotas.json"))["cidade"]
lon0, lat0 = (cid["oeste"] + cid["leste"]) / 2, (cid["sul"] + cid["norte"]) / 2
esc = 100 / (cid["norte"] - cid["sul"])
kx = math.cos(math.radians(lat0))
volta = lambda p: [round(lon0 + p[0] / (kx * esc), 5), round(lat0 + p[1] / esc, 5)]

def anel(a):
    pts = [volta(p) for p in a]
    return pts + [pts[0]]

feicoes = []
for i, d in enumerate(mapa["distritos"]):
    feicoes.append({"type": "Feature", "id": i, "properties": {"nome": d["nome"], "ponto": d["ponto"]},
                    "geometry": {"type": "MultiPolygon", "coordinates": [[anel(a) for a in poly] for poly in d["macio"]]}})

geo = {p["cep_id"]: p for p in csv.DictReader(ler("data", "pontos_geo.csv"))}
pontos = [{"id": p["cep_id"], "bairro": p["bairro"], "zona": p["zona"], "perfil": p["perfil"], "cep": p["cep"], "rua": p["rua"],
           "lat": float(geo[p["cep_id"]]["lat"]), "lon": float(geo[p["cep_id"]]["lon"])} for p in csv.DictReader(ler("data", "ceps.csv"))]

saida = {"fonte": "Contorno dos distritos: Prefeitura de Sao Paulo (GeoSampa), via codigourbano/distritos-sp. Pontos: OpenStreetMap (Nominatim).",
         "cidade": cid, "pontos": pontos, "distritos": {"type": "FeatureCollection", "features": feicoes}}
json.dump(saida, open(os.path.join(RAIZ, "assets", "geo.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

# conferencia: o ponto geocodificado deve cair perto do centro do distrito onde o alfinete ficava
for p, antigo in zip(pontos, mapa["pontos"]):
    lon, lat = volta([antigo["x"], antigo["y"]])
    km = math.hypot((lon - p["lon"]) * 111.32 * kx, (lat - p["lat"]) * 110.57)
    if km > 4: print("conferir", p["id"], p["bairro"], f"{km:.1f} km do centro do distrito")
print(len(feicoes), "distritos,", len(pontos), "pontos")
