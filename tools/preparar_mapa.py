"""Le o contorno dos 96 distritos de Sao Paulo (GeoJSON) e grava assets/mapa.json.

Uso: python3 tools/preparar_mapa.py caminho/para/distritos-sp.geojson
     python3 tools/preparar_mapa.py --pontos   (so refaz os pontos, depois de mudar data/ceps.csv)
Fonte do contorno: Prefeitura de Sao Paulo (GeoSampa), via github.com/codigourbano/distritos-sp.
Cada ponto de coleta (data/ceps.csv) fica no centro do seu distrito. E uma aproximacao.
Cada distrito usa o ponto de coleta mais proximo.
"""
import csv, json, math, sys, os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOL = 0.10        # tolerancia da simplificacao, em unidades do mapa (o mapa tem ~100 de altura)
AREA_MIN = 0.6    # descarta ilhas minusculas

PONTO_DISTRITO = {"C01":"BELA VISTA","C02":"REPUBLICA","C03":"BOM RETIRO","C04":"SE","C05":"BRAS",
 "C06":"PINHEIROS","C07":"LAPA","C08":"RAPOSO TAVARES","C09":"RIO PEQUENO","C10":"PIRITUBA","C11":"MOEMA",
 "C12":"SANTO AMARO","C13":"CAPAO REDONDO","C14":"GRAJAU","C15":"JARDIM ANGELA","C16":"CIDADE TIRADENTES","C17":"TATUAPE",
 "C18":"ITAQUERA","C19":"GUAIANASES","C20":"SAPOPEMBA","C21":"SANTANA","C22":"JACANA","C23":"VILA MARIA",
 "C24":"BRASILANDIA","C25":"PERUS"}

def dp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False]*len(pts); keep[0] = keep[-1] = True
    pilha = [(0, len(pts)-1)]
    while pilha:
        a, b = pilha.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx-ax, by-ay; n = math.hypot(dx, dy) or 1e-9
        dmax, im = 0, -1
        for i in range(a+1, b):
            if n < 1e-6: d = math.hypot(pts[i][0]-ax, pts[i][1]-ay)   # anel fechado: inicio igual ao fim
            else: d = abs((pts[i][0]-ax)*dy - (pts[i][1]-ay)*dx)/n
            if d > dmax: dmax, im = d, i
        if dmax > tol:
            keep[im] = True; pilha += [(a, im), (im, b)]
    return [p for p, k in zip(pts, keep) if k]

def area(r):
    return abs(sum(r[i][0]*r[(i+1)%len(r)][1] - r[(i+1)%len(r)][0]*r[i][1] for i in range(len(r))))/2

def centro(r):
    a = cx = cy = 0
    for i in range(len(r)):
        x0, y0 = r[i]; x1, y1 = r[(i+1)%len(r)]
        f = x0*y1 - x1*y0; a += f; cx += (x0+x1)*f; cy += (y0+y1)*f
    return (cx/(3*a), cy/(3*a))

def main(src):
    g = json.load(open(src, encoding="utf-8"))
    todos = [p for f in g["features"] for poly in f["geometry"]["coordinates"] for p in poly[0]]
    lon0 = (min(p[0] for p in todos)+max(p[0] for p in todos))/2
    lat0 = (min(p[1] for p in todos)+max(p[1] for p in todos))/2
    kx = math.cos(math.radians(lat0))
    alt = max(p[1] for p in todos)-min(p[1] for p in todos)
    esc = 100/alt
    proj = lambda p: ((p[0]-lon0)*kx*esc, (p[1]-lat0)*esc)
    distritos = []
    for f in g["features"]:
        polys = []
        for poly in f["geometry"]["coordinates"]:
            ext = [proj(p) for p in poly[0]]
            if area(ext) < AREA_MIN: continue
            aneis = []
            for k, anel in enumerate(poly):
                r = dp([proj(p) for p in anel], TOL)
                if r[0] == r[-1]: r = r[:-1]
                if len(r) >= 3 and (k == 0 or area(r) > AREA_MIN):
                    aneis.append([[round(x, 2), round(y, 2)] for x, y in r])
            if aneis: polys.append(aneis)
        maior = max(polys, key=lambda a: area(a[0]))
        c = centro(maior[0])
        distritos.append({"nome": f["properties"]["ds_nome"], "c": [round(c[0], 2), round(c[1], 2)], "polys": polys})
    por_nome = {d["nome"]: d for d in distritos}
    pontos = []
    for linha in csv.DictReader(open(os.path.join(RAIZ, "data/ceps.csv"), encoding="utf-8")):
        d = por_nome[PONTO_DISTRITO[linha["cep_id"]]]
        pontos.append({"id": linha["cep_id"], "bairro": linha["bairro"], "zona": linha["zona"],
                       "perfil": linha["perfil"], "cep": linha["cep"], "x": d["c"][0], "y": d["c"][1]})
    for d in distritos:
        d["ponto"] = min(range(len(pontos)), key=lambda i: (pontos[i]["x"]-d["c"][0])**2 + (pontos[i]["y"]-d["c"][1])**2)
    n = sum(len(a) for d in distritos for p in d["polys"] for a in p)
    json.dump({"fonte": "Prefeitura de Sao Paulo (GeoSampa), via codigourbano/distritos-sp",
               "pontos": pontos, "distritos": distritos},
              open(os.path.join(RAIZ, "assets/mapa.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(len(distritos), "distritos,", n, "vertices,", len(pontos), "pontos")

def so_pontos():
    """Refaz so os pontos e o ponto de cada distrito em assets/mapa.json, sem o contorno original (que fica igual)."""
    caminho = os.path.join(RAIZ, "assets/mapa.json")
    m = json.load(open(caminho, encoding="utf-8"))
    por_nome = {d["nome"]: d for d in m["distritos"]}
    m["pontos"] = []
    for linha in csv.DictReader(open(os.path.join(RAIZ, "data/ceps.csv"), encoding="utf-8")):
        d = por_nome[PONTO_DISTRITO[linha["cep_id"]]]
        m["pontos"].append({"id": linha["cep_id"], "bairro": linha["bairro"], "zona": linha["zona"],
                            "perfil": linha["perfil"], "cep": linha["cep"], "x": d["c"][0], "y": d["c"][1]})
    for d in m["distritos"]:
        d["ponto"] = min(range(len(m["pontos"])), key=lambda i: (m["pontos"][i]["x"]-d["c"][0])**2 + (m["pontos"][i]["y"]-d["c"][1])**2)
    json.dump(m, open(caminho, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(len(m["distritos"]), "distritos,", len(m["pontos"]), "pontos (so os pontos refeitos)")

if __name__ == "__main__":
    so_pontos() if sys.argv[1] == "--pontos" else main(sys.argv[1])
