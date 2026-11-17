# Agente de casamento de produtos

Para comparar preços entre redes, cada um dos 100 produtos da cesta precisa ser ligado à página certa no site de cada rede. É o mesmo arroz, da mesma marca, no mesmo tamanho? Fazer isso à mão para cada rede leva horas. Este agente faz a primeira passada, e o acerto dele é medido.

## Como ele decide

1. **Busca, sem IA.** Lê o sitemap da rede (a lista pública de páginas de produto) e separa até 15 candidatos cujo endereço tem palavras do nome e da marca do produto.
2. **Leitura.** Abre cada candidato, devagar, e guarda só o título da página.
3. **Decisão, com IA.** Manda ao Claude o produto da cesta e os títulos. Ele escolhe um e dá o status: `achado`, `variante`, `tamanho_diferente` ou `nao_achado`, com o motivo em uma frase. As regras são as mesmas de `data/LEIAME.md`.

A saída vai para `agente/saida/<rede>.csv`. Ela **não** entra direto em `data/links.csv`: uma pessoa revisa antes.

## Como o acerto é medido

`agente/medir.py` compara a saída do agente com as decisões conferidas em `data/links.csv`. Para o Tenda, as 100 decisões foram conferidas abrindo cada página. O relatório tem três números: quantas vezes o agente deu o mesmo status, quantas vezes escolheu a mesma página e quantos erros graves cometeu (ligar um produto a uma página que não serve, o erro que estragaria a comparação de preços).

## Como rodar

Precisa de uma chave da API da Anthropic (platform.claude.com), guardada como secret `ANTHROPIC_API_KEY` no repositório (Settings → Secrets and variables → Actions). Depois: Actions → "Agente de casamento de produtos" → Run workflow. Para medir o acerto, rode com a rede `tenda` e `medir` = `sim`.

Custo: uma chamada ao modelo por produto. Os 100 produtos de uma rede custam alguns dólares.

## Estado

O código está pronto e ainda não foi rodado: falta a chave da API. Os links do Atacadão foram feitos sem o agente: busca no sitemap, leitura do título de cada candidato e decisão conferindo esses títulos. Quando o agente rodar no Atacadão, a saída dele pode ser medida contra essa conferência também.
