"""Arredonda o contorno dos distritos para o mapa de brinquedo e grava em assets/mapa.json.

Uso: python3 tools/arredondar_mapa.py        (precisa de shapely: pip install shapely)
Le o campo "polys" (contorno real, feito por preparar_mapa.py) e acrescenta:
  "macio": o mesmo distrito encolhido um pouco e com os cantos arredondados (o site desenha este);
  "base":  a silhueta da cidade inteira, arredondada, que vira a bandeja embaixo dos distritos.
O contorno real continua no arquivo. O arredondamento muda a forma de cada distrito de leve.
"""
import json, os
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, "assets/mapa.json")
FOLGA = 0.20      # espaco entre um distrito e o vizinho (metade de cada lado)
RAIO = 0.62       # raio dos cantos
AREA_MIN = 0.35

def partes(g):
    if g.is_empty: return []
    return [p for p in (g.geoms if isinstance(g, MultiPolygon) else [g]) if isinstance(p, Polygon) and p.area > AREA_MIN]

def aneis(p):
    fora = [[round(x, 2), round(y, 2)] for x, y in list(p.exterior.coords)[:-1]]
    return [fora] + [[[round(x, 2), round(y, 2)] for x, y in list(i.coords)[:-1]] for i in p.interiors if Polygon(i).area > AREA_MIN]

def macio(geo, raio):
    g = geo.buffer(-FOLGA, quad_segs=4)
    g = g.buffer(raio * 0.7, quad_segs=5).buffer(-raio * 0.7, quad_segs=5)   # fecha os cantos para dentro
    g = g.buffer(-raio, quad_segs=5).buffer(raio, quad_segs=5)               # arredonda os cantos para fora
    return g.simplify(0.035)

def main():
    m = json.load(open(ARQ, encoding="utf-8"))
    originais, pontos_total = [], 0
    for d in m["distritos"]:
        geo = unary_union([Polygon(a[0], a[1:]).buffer(0) for a in d["polys"]])
        originais.append(geo)
        raio, ps = RAIO, []
        while not ps and raio > 0.05:      # distrito pequeno demais para o raio cheio: tenta um raio menor
            ps = partes(macio(geo, raio)); raio *= 0.6
        if not ps: raise SystemExit("distrito sumiu: " + d["nome"])
        d["macio"] = [aneis(p) for p in ps]
        pontos_total += sum(len(a) for p in d["macio"] for a in p)
    cidade = unary_union(originais).buffer(3.2, quad_segs=6).buffer(-1.4, quad_segs=6).simplify(0.08)
    m["base"] = [aneis(p)[0] for p in partes(cidade)]
    json.dump(m, open(ARQ, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(len(m["distritos"]), "distritos,", pontos_total, "vertices arredondados,", len(m["base"]), "parte(s) na base,",
          sum(len(b) for b in m["base"]), "vertices na base")

if __name__ == "__main__":
    main()
