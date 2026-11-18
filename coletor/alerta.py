"""Le data/execucoes.csv e monta o aviso da manha.

Uso: python3 coletor/alerta.py [AAAA-MM-DD]
Escreve o resumo em coletor/resumo.md. Sai com codigo 1 se alguma rede ou CEP falhou no dia: resultado falha
ou bloqueado, ou menos de 90% dos produtos lidos (ou se nao houve coleta nenhuma). Um "parcial" com poucos
produtos de fora entra no resumo como aviso, sem abrir a issue. O fluxo do GitHub usa o codigo para a issue.
"""
import csv, datetime, os, sys
from zoneinfo import ZoneInfo
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

dia = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now(ZoneInfo("America/Sao_Paulo")).strftime("%Y-%m-%d")
with open(os.path.join(RAIZ, "data", "execucoes.csv"), encoding="utf-8", newline="") as f:
    linhas = [l for l in csv.DictReader(f) if l["data"] == dia]
def grave(l):
    tentados, lidos = int(l["produtos_tentados"] or 0), int(l["produtos_lidos"] or 0)
    return l["resultado"] in ("falha", "bloqueado") or (tentados and lidos < 0.9 * tentados)
ruins = [l for l in linhas if grave(l)]
avisos = [l for l in linhas if l["resultado"] != "ok" and not grave(l)]
lidos = sum(int(l["produtos_lidos"] or 0) for l in linhas)
tentados = sum(int(l["produtos_tentados"] or 0) for l in linhas)

t = [f"## Coleta de {dia}", ""]
if not linhas:
    t += ["Nenhuma execucao registrada neste dia. O coletor nao rodou ou parou antes de gravar."]
else:
    t += [f"- Execucoes (rede e CEP): {len(linhas)}", f"- Precos lidos: {lidos} de {tentados}", f"- Com problema: {len(ruins)}", f"- Com aviso (poucos produtos de fora): {len(avisos)}", ""]
    if ruins:
        t += ["| Rede | CEP | Resultado | Lidos | O que aconteceu |", "|---|---|---|---|---|"]
        t += [f"| {l['rede_id']} | {l['cep_id'] or 'todos'} | {l['resultado']} | {l['produtos_lidos']}/{l['produtos_tentados']} | {l['erro']} |" for l in ruins]
        if any(l["resultado"] == "bloqueado" for l in ruins):
            t += ["", "**A rede bloqueou o coletor.** Ele parou nessa rede e nao tentou contornar. Decida se a coleta continua antes da proxima noite."]
    else:
        t += ["Nenhuma rede ou CEP falhou." if avisos else "Tudo certo: todas as redes e todos os CEPs foram lidos."]
    if avisos:
        t += ["", "### Avisos", "", "Leitura quase completa; os produtos de fora estão listados. Se o mesmo produto aparecer várias semanas, a revisão semanal dos links aponta.", "",
              "| Rede | CEP | Lidos | Produtos de fora |", "|---|---|---|---|"]
        t += [f"| {l['rede_id']} | {l['cep_id'] or 'todos'} | {l['produtos_lidos']}/{l['produtos_tentados']} | {l['erro']} |" for l in avisos]
open(os.path.join(RAIZ, "coletor", "resumo.md"), "w", encoding="utf-8").write("\n".join(t) + "\n")
print("\n".join(t))
sys.exit(1 if (ruins or not linhas) else 0)
