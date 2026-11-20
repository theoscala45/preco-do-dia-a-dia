"""Le data/execucoes.csv e monta o aviso da manha.

Uso: python3 coletor/alerta.py [AAAA-MM-DD]
Escreve o resumo em coletor/resumo.md. Uma rede ou CEP "com problema" e o que teve resultado falha ou bloqueado,
ou menos de 90% dos produtos lidos. O codigo de saida (que o fluxo do GitHub usa para abrir a issue e mandar
e-mail) so e 1 quando o problema merece atencao:
- uma rede bloqueou o coletor (a decisao de continuar e de uma pessoa);
- uma rede falhou em todos os CEPs do dia;
- o mesmo CEP da mesma rede teve problema neste dia e no dia de coleta anterior;
- a coleta nao rodou, ou leu menos de 90% de todos os precos.
Uma falha isolada (um CEP numa noite, que costuma ser instabilidade do site) fica so no resumo, sem e-mail.
"""
import csv, datetime, os, sys
from zoneinfo import ZoneInfo
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

dia = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now(ZoneInfo("America/Sao_Paulo")).strftime("%Y-%m-%d")
with open(os.path.join(RAIZ, "data", "execucoes.csv"), encoding="utf-8", newline="") as f:
    todas = list(csv.DictReader(f))
linhas = [l for l in todas if l["data"] == dia]
antes = sorted({l["data"] for l in todas if l["data"] < dia})
anterior = [l for l in todas if antes and l["data"] == antes[-1]]
def grave(l):
    tentados, lidos = int(l["produtos_tentados"] or 0), int(l["produtos_lidos"] or 0)
    return l["resultado"] in ("falha", "bloqueado") or (tentados and lidos < 0.9 * tentados)
ruins = [l for l in linhas if grave(l)]
avisos = [l for l in linhas if l["resultado"] != "ok" and not grave(l)]
lidos = sum(int(l["produtos_lidos"] or 0) for l in linhas)
tentados = sum(int(l["produtos_tentados"] or 0) for l in linhas)

# o que merece e-mail
ruins_antes = {(l["rede_id"], l["cep_id"]) for l in anterior if grave(l)}
por_rede = {}
for l in linhas: por_rede.setdefault(l["rede_id"], []).append(l)
importantes = []
for l in ruins:
    rede_inteira = all(grave(x) for x in por_rede[l["rede_id"]])
    if l["resultado"] == "bloqueado": motivo = "a rede bloqueou o coletor"
    elif rede_inteira: motivo = "a rede falhou em todos os CEPs"
    elif (l["rede_id"], l["cep_id"]) in ruins_antes: motivo = "falhou também na coleta anterior"
    else: continue
    importantes.append((l, motivo))
pouco = tentados and lidos < 0.9 * tentados

t = [f"## Coleta de {dia}", ""]
if not linhas:
    t += ["Nenhuma execucao registrada neste dia. O coletor nao rodou ou parou antes de gravar."]
else:
    t += [f"- Execucoes (rede e CEP): {len(linhas)}", f"- Precos lidos: {lidos} de {tentados}", f"- Com problema: {len(ruins)}", f"- Com aviso (poucos produtos de fora): {len(avisos)}", ""]
    if ruins:
        if importantes or pouco:
            t += ["**Precisa de atenção:** " + ("; ".join(f"{l['rede_id']} {l['cep_id'] or 'todos'}: {m}" for l, m in importantes) or f"só {lidos} de {tentados} preços lidos") + ".", ""]
        else:
            t += ["Falhas isoladas: cada uma aconteceu só nesta noite, o que costuma ser instabilidade do site. Não precisa fazer nada; se se repetir na próxima noite, vira aviso.", ""]
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
sys.exit(1 if (importantes or pouco or not linhas) else 0)
