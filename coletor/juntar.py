"""Junta o que cada parte da coleta gravou (uma pasta por zona) nas tabelas do repositorio.

Uso: python3 coletor/juntar.py pasta1 pasta2 ...
Cada pasta pode ter precos.csv e execucoes.csv, escritos por coletar.py --saida.
- precos: vao para data/precos/AAAA-MM.csv. Se o mesmo produto, rede, CEP e dia ja existir, fica a leitura mais nova.
- execucoes: vao para data/execucoes.csv. Para a mesma rede, CEP e dia, fica a mais nova.
"""
import csv, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from coletar import COLUNAS, COLUNAS_EXEC, RAIZ, ler


def gravar(caminho, colunas, linhas):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=colunas, lineterminator="\n")
        w.writeheader(); w.writerows(linhas)


def main(pastas):
    novos_precos = [l for p in pastas for l in ler(os.path.join(p, "precos.csv"))]
    novas_exec = [l for p in pastas for l in ler(os.path.join(p, "execucoes.csv"))]
    por_mes = {}
    for l in novos_precos: por_mes.setdefault(l["data"][:7], []).append(l)
    for mes, linhas in por_mes.items():
        caminho = os.path.join(RAIZ, "data", "precos", f"{mes}.csv")
        tudo = {}
        for l in ler(caminho) + linhas:
            tudo[(l["data"], l["rede_id"], l["produto_id"], l["cep_id"])] = l
        gravar(caminho, COLUNAS, sorted(tudo.values(), key=lambda l: (l["data"], l["rede_id"], l["cep_id"], l["produto_id"])))
    caminho = os.path.join(RAIZ, "data", "execucoes.csv")
    tudo = {}
    for l in ler(caminho) + novas_exec:
        tudo[(l["data"], l["rede_id"], l["cep_id"])] = l
    gravar(caminho, COLUNAS_EXEC, sorted(tudo.values(), key=lambda l: (l["data"], l["rede_id"], l["cep_id"])))
    print(f"juntado: {len(novos_precos)} precos e {len(novas_exec)} execucoes de {len(pastas)} pastas")


if __name__ == "__main__":
    main(sys.argv[1:])
