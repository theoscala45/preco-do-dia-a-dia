"""Monta os arquivos de dados do site conforme data/site.txt. Os fluxos do GitHub rodam isto depois de cada coleta e
depois de cada atualizacao do IPCA.

Uso: python3 tools/atualizar_site.py

- assets/dados-previa.json: sempre com os precos reais (a previa, no endereco com ?previa).
- assets/dados.json: com os precos reais se data/site.txt disser dados=real; senao, com os precos de exemplo.
Se ainda nao houver coleta depois do "inicio", a previa fica como esta e o script so avisa (nao e erro).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import montar_site

modo = montar_site.config().get("dados", "exemplo")
if modo not in ("exemplo", "real"):
    sys.exit(f'data/site.txt: "dados" deve ser exemplo ou real, nao "{modo}"')

print("previa (assets/dados-previa.json):")
try:
    montar_site.main("real", "assets/dados-previa.json")
    tem_real = True
except SystemExit as e:
    print("  sem precos reais ainda:", e)
    tem_real = False

print(f"site (assets/dados.json), dados={modo}:")
if modo == "real" and not tem_real:
    print("  o site continua como estava, porque ainda nao ha precos reais a partir do inicio")
else:
    montar_site.main(modo, "assets/dados.json")
