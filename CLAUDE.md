# Regras para trabalhar neste projeto

O Preço do Dia a Dia, do Theo, aluno do ensino médio em São Paulo. Site estático (GitHub Pages) + coletor de preços que
roda sozinho toda noite pelo GitHub Actions.

## Como falar com o Theo
- Sempre em português do Brasil, simples e direto. Listas curtas; barras de progresso quando ele pedir o que falta.
- Perguntas com opções clicáveis, com uma marcada "(Recomendado)".
- O Theo instrui; quem edita o site e o código é o Claude, pelo Claude Code.

## O que a coleta grava (não mexer à mão)
A coleta da noite (02h17, reserva 05h17, até ~09h30) e o fluxo do IPCA fazem commits sozinhos em `main`. Ao mexer no
site:
- Antes de começar e antes de cada commit: `git pull --no-rebase origin main`.
- Não editar à mão: `data/precos/`, `data/execucoes.csv`, `assets/dados.json`, `assets/dados-previa.json`,
  `data/ipca.csv`, `data/pesos_ipca.csv`. Eles são gerados (`tools/atualizar_site.py`, `tools/baixar_ibge.py`).
- O que o site mostra (exemplo ou real) se muda só em `data/site.txt`.
- Ao mexer no visual, conferir também a prévia com os dados reais: o endereço com `?previa`.

## Regras do projeto
- Nunca pôr segredos no repositório. Senhas e códigos, o Theo digita.
- O coletor lê só páginas normais de produto, devagar. Nada de API escondida; nunca contornar robots.txt, captcha ou
  bloqueio. Se uma rede bloquear: parar e avisar.
- Guardar só fatos (preço, nome, tamanho); nada de fotos ou descrições.
- Na página Método não citar IA. O site não leva o nome do autor.
- Textos: sem travessão (—), sem tom de propaganda.
- Push em `main` está autorizado. Commits terminam com as linhas de coautoria e da sessão.

## Plano combinado (19/11/2026)
1. Coleta das 9 redes; o Claude confere se está tudo pronto.
2. O Theo trabalha o visual do site (pelo Claude Code).
3. O Claude ajusta os textos para dados reais ("12 meses", "mês a mês", faixa do topo) e liga `dados=real`.
4. Ajustes finais e lançamento. Lista técnica completa: documento "O Preço do Dia a Dia: lista técnica".
