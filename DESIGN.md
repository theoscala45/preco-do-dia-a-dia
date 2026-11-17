# Direção visual: O Preço do Dia a Dia

Revista em 16/11/2026 e em 17/11/2026. A primeira versão (papel de cupom, serifa, mapa com cantos vivos) ficou realista e séria demais para o Theo. Ele pediu um visual arredondado, quase de desenho animado, mais brincalhão. Esta direção não foi baseada em sites de referência.

## A ideia

A cidade vira um brinquedo: os 96 distritos são peças macias numa bandeja, com nuvens de bolinha passeando em volta. O preço continua sendo o assunto. Tudo tem canto arredondado, e tudo que se mexe tem mola.

Uma coisa só chama atenção: o mapa 3D. Ele tem dois estados. Primeiro a cidade inteira, calma, em tons de azul. Com um CEP, a câmera mergulha no bairro, a cidade se recorta num prato redondo, as lojinhas das redes nascem em volta do alfinete e um caminho de luz corre até cada uma. O texto fica em balões brancos, quietos.

## Cor

| Nome | Valor | Papel |
|---|---|---|
| ceu | `#DDF0FF` | Fundo da página. |
| ceu-2 | `#C4DFFA` | Borda de campo. |
| sol | `#FFF1B5` | Fundo da seção da lista. |
| tinta | `#1E2757` | Texto e botões. Azul-marinho, nunca preto. |
| tinta-2 | `#55608F` | Texto de apoio. |
| etiqueta | `#FFD23F` (sombra `#E7B100`) | Preço em destaque. |
| barato | `#3DD9A0` | Lista e distrito mais baratos. |
| caro | `#FF6B5C` | Mais caro. Linha do índice local. |
| oficial | `#3D5AFE` | Tudo que vem do IBGE (IPCA). Links. |
| ponto | `#7A5CFF` | Alfinetes dos pontos de coleta. |
| base | `#9DB8F5` | Bandeja embaixo do mapa. |

Mapa na visão geral: peças de `#F6F9FF` a `#CFDFFF`, um tom por distrito. Mapa no mergulho: peças de `#7490EE` a `#627DE3`, distritos do ponto em foco de `#A3B8FA` a `#93AAF5`, fundo do prato `#4860CC`, borda do prato `#FFFDF6`. Caminho aceso `#FFD84D`, caminho da rede mais barata `#4DEBB0`. Toldos das lojinhas em cores do site, não das marcas. Sem modo escuro.

## Tipografia

Duas famílias, hospedadas no site (`assets/fonts`, licença SIL OFL).

- **Fredoka** (arredondada, peso 600 e 700): títulos, preços, botões.
- **Nunito** (peso 500 a 800): texto corrido e interface.

Algarismos tabulares nos preços. Caixa normal, sem rótulos em maiúsculas.

## Forma

- Cantos: 18 px em campos e botões, 26 px na etiqueta, 28 a 32 px nos balões, pílula (999 px) em navegação e selos.
- Botões têm um "degrau" embaixo (sombra sólida de 5 px) e afundam ao clicar.
- Uma sombra macia para balões: `0 8px 0` claro + `0 22px 36px` difusa.
- A seção da lista e o rodapé começam com cantos de 48 a 56 px no topo.
- O cupom termina em onda (meia-lua), não em serrilha.

## Movimento

1. **Uma entrada.** As peças do mapa crescem do chão com pulo (passam do ponto e voltam), do centro para as bordas. Cada palavra do título entra pulando. As nuvens aparecem depois.
2. **O mergulho.** Com um CEP (ou um clique numa peça), a câmera desce girando até o ponto de coleta. A cidade se recorta em círculo e a borda do prato sobe. As lojinhas nascem uma a uma. A luz sai do alfinete e corre por cada caminho. O preço de cada rede aparece quando a luz chega. No fim, o caminho da mais barata fica verde, a lojinha dela quica e as outras apagam um pouco.
3. **O scroll comanda as cenas.** Cidade inteira, alfinetes dos 25 pontos, mergulho de demonstração (Pinheiros, se não houver CEP) e de volta à cidade para o gráfico. Rolar para trás desfaz.
4. **Molas.** Peças, alfinetes, lojinhas e prato seguem uma mola com amortecimento. Quem sobe rápido afina, quem desce engorda (estica e achata).
5. **Resposta a ações.** Hover: a peça sobe, fica amarela e um balão abre com mola. Item adicionado: a linha entra crescendo. Preço novo: o número rola e dá um pulinho ao chegar.
6. Curvas: mola `cubic-bezier(.34,1.56,.64,1)` e saída `cubic-bezier(.2,.8,.2,1)`.
7. Com "reduzir movimento": sem pulo, sem mola, sem nuvem andando, sem pulsos de luz. As cenas trocam direto e os caminhos já aparecem acesos.

## Mapa

Contorno real dos 96 distritos (Prefeitura de São Paulo, GeoSampa), encolhido e arredondado por `tools/arredondar_mapa.py`. O arredondamento muda a forma de cada distrito de leve. A bandeja é a silhueta da cidade inteira. Os alfinetes ficam no centro do distrito de cada ponto, o que é uma aproximação.

As lojinhas e os caminhos são ilustrativos. O repositório não tem endereço de loja nem mapa de ruas, e o preço comparado é o que cada rede mostra na internet para o CEP. A posição das lojinhas é sorteada em volta do ponto (sempre a mesma para o mesmo ponto), e a página diz isso ao lado do mapa. O número de cada etiqueta é a soma dos itens do índice que todas as redes vendem naquele ponto.

## Imagens e ícones

Sem fotos e sem ícones decorativos. As formas do site são o mapa, as lojinhas, a etiqueta, os balões e o cupom.
