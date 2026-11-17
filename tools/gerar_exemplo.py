"""Gera DADOS DE EXEMPLO em data/exemplo/. Todo preco aqui e inventado.

Serve so para o site ter o que mostrar antes de o coletor existir.
As colunas sao as mesmas de data/precos.csv e data/ipca.csv.
O gerador usa semente fixa: rodar de novo produz os mesmos arquivos.
"""
import csv, json, math, os, random
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rnd = random.Random(20261116)

BASE = [27.9,31.9,7.9,8.5,7.6,39.9,5.2,4.6,31.9,29.9,5.9,6.9,4.9,8.9,3.9,6.9,3.2,5.4,9.9,9.5,5.9,3.4,9.9,8.9,10.9,
 13.9,6.9,8.9,4.2,4.4,3.6,5.9,2.9,8.4,4.3,6.9,3.2,10.9,5.3,5.6,5.7,19.9,14.9,11.9,12.4,9.9,3.6,13.9,9.9,24.9,
 11.9,13.4,24.9,19.9,4.6,2.9,8.9,4.4,9.9,12.9,14.9,15.9,9.4,6.9,59.9,24.9,44.9,12.9,2.8,7.9,6.9,5.9,6.4,12.9,6.9,
 11.9,8.9,16.9,19.9,12.9,11.9,42.9,32.9,59.9,21.9,8.9,49.9,6.9,11.9,4.9,5.9,8.9,5.4,29.9,5.9,4.9,3.9,7.9,6.9,9.9]
REDES_CEP = {"tenda": 0.93, "atacadao": 0.91, "carrefour": 1.00, "hirota": 1.06}      # preco muda por CEP
REDES_UNICO = {"sonda": 1.02, "pao-de-acucar": 1.12, "santa-luzia": 1.31}              # preco unico
DATAS = ["2025-11-01"] + [f"2026-{m:02d}-01" for m in range(1, 12)]
DATAS.insert(1, "2025-12-01")

def ler(nome):
    return list(csv.DictReader(open(os.path.join(RAIZ, "data", nome), encoding="utf-8")))

def main():
    produtos, ceps = ler("produtos.csv"), ler("ceps.csv")
    sem_link = {l["produto_id"] for l in ler("links.csv") if l["rede_id"] == "tenda" and not l["url"]}
    mapa = json.load(open(os.path.join(RAIZ, "assets/mapa.json"), encoding="utf-8"))
    xy = {p["id"]: (p["x"], p["y"]) for p in mapa["pontos"]}
    # fator por rede e CEP: uma onda suave no mapa mais ruido. Nao segue renda nem perfil, de proposito.
    fator = {}
    for r in REDES_CEP:
        fa, fb, fase = rnd.uniform(.04, .09), rnd.uniform(.04, .09), rnd.uniform(0, 6.28)
        for c in ceps:
            x, y = xy[c["cep_id"]]
            fator[r, c["cep_id"]] = 1 + .045*math.sin(x*fa+fase) + .045*math.cos(y*fb+fase) + rnd.uniform(-.02, .02)
    # caminho de precos no tempo: cada produto e cada CEP tem a sua deriva mensal
    deriva_p = [rnd.gauss(.0042, .0035) for _ in produtos]
    deriva_c = {c["cep_id"]: rnd.gauss(0, .0012) for c in ceps}
    jeito = {(r, i): rnd.uniform(.94, 1.06) for r in list(REDES_CEP)+list(REDES_UNICO) for i in range(len(produtos))}
    falta = {(r, i) for r in list(REDES_CEP)+list(REDES_UNICO) for i in range(len(produtos)) if rnd.random() < .07}
    os.makedirs(os.path.join(RAIZ, "data/exemplo"), exist_ok=True)
    with open(os.path.join(RAIZ, "data/exemplo/precos.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["data","rede_id","produto_id","cep_id","preco_reais","unidade_de_venda","disponivel","nome_na_pagina","tamanho_na_pagina","lido_em"])
        for t, data in enumerate(DATAS):
            for i, p in enumerate(produtos):
                for r, fr in list(REDES_CEP.items()) + list(REDES_UNICO.items()):
                    fora = (r, i) in falta or (r == "tenda" and p["produto_id"] in sem_link)
                    for c in (ceps if r in REDES_CEP else [None]):
                        cid = c["cep_id"] if c else ""
                        if fora or rnd.random() < .015:
                            w.writerow([data, r, p["produto_id"], cid, "", "", "nao", "", "", ""]); continue
                        tempo = (1 + deriva_p[i] + (deriva_c[cid] if c else 0)) ** t
                        preco = BASE[i] * fr * jeito[r, i] * (fator[r, cid] if c else 1) * tempo * rnd.uniform(.985, 1.015)
                        w.writerow([data, r, p["produto_id"], cid, f"{preco:.2f}", p["compara_por"].lower(), "sim", "", "", ""])
    with open(os.path.join(RAIZ, "data/exemplo/ipca.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["mes","ipca_mensal_pct","ipca_alimentos_pct","ipca_higiene_pct","fonte"])
        for data in DATAS[1:]:
            g = rnd.uniform(.18, .52)
            w.writerow([data[:7], f"{g:.2f}", f"{g+rnd.uniform(-.25,.35):.2f}", f"{g+rnd.uniform(-.2,.2):.2f}", "EXEMPLO (inventado)"])
    print("ok: data/exemplo/precos.csv e data/exemplo/ipca.csv")

if __name__ == "__main__":
    main()
