"""Le data/execucoes.csv e monta o aviso da manha.

Uso: python3 coletor/alerta.py [AAAA-MM-DD]
Escreve o resumo em coletor/resumo.md. Sai com codigo 1 se alguma rede ou CEP falhou no dia
(ou se nao houve coleta nenhuma), e com 0 se tudo deu certo. O fluxo do GitHub usa isso para abrir a issue.
"""
import csv, datetime, os, sys
from zoneinfo import ZoneInfo
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

dia = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now(ZoneInfo("America/Sao_Paulo")).strftime("%Y-%m-%d")
with open(os.path.join(RAIZ, "data", "execucoes.csv"), encoding="utf-8", newline="") as f:
    linhas = [l for l in csv.DictReader(f) if l["data"] == dia]
ruins = [l for l in linhas if l["resultado"] != "ok"]
lidos = sum(int(l["produtos_lidos"] or 0) for l in linhas)
tentados = sum(int(l["produtos_tentados"] or 0) for l in linhas)

t = [f"## Coleta de {dia}", ""]
if not linhas:
    t += ["Nenhuma execucao registrada neste dia. O coletor nao rodou ou parou antes de gravar."]
else:
    t += [f"- Execucoes (rede e CEP): {len(linhas)}", f"- Precos lidos: {lidos} de {tentados}", f"- Com problema: {len(ruins)}", ""]
    if ruins:
        t += ["| Rede | CEP | Resultado | Lidos | O que aconteceu |", "|---|---|---|---|---|"]
        t += [f"| {l['rede_id']} | {l['cep_id'] or 'todos'} | {l['resultado']} | {l['produtos_lidos']}/{l['produtos_tentados']} | {l['erro']} |" for l in ruins]
        if any(l["resultado"] == "bloqueado" for l in ruins):
            t += ["", "**A rede bloqueou o coletor.** Ele parou nessa rede e nao tentou contornar. Decida se a coleta continua antes da proxima noite."]
    else:
        t += ["Tudo certo: todas as redes e todos os CEPs foram lidos."]
open(os.path.join(RAIZ, "coletor", "resumo.md"), "w", encoding="utf-8").write("\n".join(t) + "\n")
print("\n".join(t))
sys.exit(1 if (ruins or not linhas) else 0)
