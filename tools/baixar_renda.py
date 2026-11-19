"""Baixa do IBGE a renda dos distritos de Sao Paulo (Censo 2022) e grava data/renda.csv e o perfil de cada ponto.

Uso: python3 tools/baixar_renda.py

Fonte: IBGE, Censo Demografico 2022, Agregados por distritos, rendimento do responsavel (resultados do universo).
O Censo 2022 so divulga o rendimento da pessoa responsavel pelo domicilio (nao a renda per capita da familia).
Variaveis usadas: V06004 (rendimento nominal medio mensal dos responsaveis com rendimento), V06006 (mediano) e
V06001 (pessoas responsaveis).

O distrito de cada ponto e o do nome do ponto em data/ceps.csv ("Jardim Iris (Pirituba)" -> Pirituba).
A faixa de renda compara o distrito com os 96 distritos da cidade, pelo rendimento medio: o terco de baixo e
"Renda baixa", o do meio "Renda media" e o de cima "Renda alta". A faixa vai para a coluna perfil de data/ceps.csv.
Depois, rode python3 tools/preparar_geo.py para levar a renda ao site.
"""
import csv, io, os, unicodedata, urllib.request, zipfile
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = ("https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/"
       "Agregados_por_distritos_renda_responsavel_BR_20260508_csv.zip")
FONTE = "IBGE, Censo 2022, rendimento do responsavel pelo domicilio, por distrito"
SAO_PAULO = "3550308"


def sem_acento(s):
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().upper().strip()


def numero(s):
    return float(s.replace(".", "").replace(",", ".")) if s not in ("", "X", "-", ".") else None


def main():
    with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "preco-do-dia-a-dia"}), timeout=300) as r:
        z = zipfile.ZipFile(io.BytesIO(r.read()))
    texto = z.read(next(n for n in z.namelist() if n.endswith(".csv"))).decode("latin-1")
    distritos = {}
    for l in csv.DictReader(io.StringIO(texto), delimiter=";"):
        if l["CD_DIST"].startswith(SAO_PAULO):
            distritos[sem_acento(l["NM_DIST"])] = {"cd": l["CD_DIST"], "nome": l["NM_DIST"], "media": numero(l["V06004"]),
                                                    "mediana": numero(l["V06006"]), "responsaveis": int(l["V06001"])}
    assert len(distritos) == 96, f"esperava 96 distritos, vieram {len(distritos)}"
    medias = sorted(d["media"] for d in distritos.values())
    t1, t2 = medias[len(medias) // 3], medias[2 * len(medias) // 3]

    caminho = os.path.join(RAIZ, "data", "ceps.csv")
    ceps = list(csv.DictReader(open(caminho, encoding="utf-8")))
    renda = []
    for c in ceps:
        b = c["bairro"]
        candidatos = ([b.split("(")[1].rstrip(")")] if "(" in b else []) + [b.split(" (")[0]]
        d = next(distritos[sem_acento(x)] for x in candidatos if sem_acento(x) in distritos)
        faixa = "Renda alta" if d["media"] >= t2 else "Renda média" if d["media"] >= t1 else "Renda baixa"
        c["perfil"] = faixa
        renda.append({"cep_id": c["cep_id"], "distrito": d["nome"], "codigo_ibge": d["cd"], "renda_media": f"{d['media']:.2f}",
                      "renda_mediana": f"{d['mediana']:.0f}", "responsaveis": d["responsaveis"], "faixa": faixa, "fonte": FONTE})
    with open(caminho, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(ceps[0].keys()), lineterminator="\n"); w.writeheader(); w.writerows(ceps)
    with open(os.path.join(RAIZ, "data", "renda.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(renda[0].keys()), lineterminator="\n"); w.writeheader(); w.writerows(renda)
    print(f"renda.csv: 25 pontos. Tercos da cidade (rendimento medio do responsavel): R$ {t1:.0f} e R$ {t2:.0f}")
    for faixa in ("Renda alta", "Renda média", "Renda baixa"):
        print(f"  {faixa}: {sum(r['faixa'] == faixa for r in renda)} pontos")


if __name__ == "__main__":
    main()
