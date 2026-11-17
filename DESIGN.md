# Direção visual: O Preço do Dia a Dia

Revista em 16/11/2026. A primeira versão (papel de cupom, serifa, mapa com cantos vivos) ficou realista e séria demais para o Theo. Ele pediu um visual arredondado, quase de desenho animado, mais brincalhão. Esta direção não foi baseada em sites de referência.

## A ideia

A cidade vira um brinquedo: os 96 distritos são peças macias numa bandeja, com nuvens de bolinha passeando em volta. O preço continua sendo o assunto. Tudo tem canto arredondado, e tudo que se mexe tem mola.

Uma coisa só chama atenção: o mapa 3D. O texto fica em balões brancos, quietos.

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

Escala do mapa, de barato a caro: `#3DD9A0`, `#A9E26F`, `#FFD23F`, `#FF9B4A`, `#FF6B5C`. Sem modo escuro.

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
2. **O scroll comanda as cenas.** Câmera, altura e cor do mapa, alfinetes e o traço do gráfico. Rolar para trás desfaz.
3. **Molas.** Altura das peças e alfinetes seguem uma mola com amortecimento. Peça que sobe rápido afina, que desce engorda (estica e achata).
4. **Resposta a ações.** CEP: a câmera voa até o bairro e o alfinete pula sem parar. Hover: a peça sobe e um balão abre com mola. Item adicionado: a linha entra crescendo. Preço novo: o número rola e dá um pulinho ao chegar.
5. Curvas: mola `cubic-bezier(.34,1.56,.64,1)` e saída `cubic-bezier(.2,.8,.2,1)`.
6. Com "reduzir movimento": sem pulo, sem mola, sem nuvem andando. As cenas trocam direto.

## Mapa

Contorno real dos 96 distritos (Prefeitura de São Paulo, GeoSampa), encolhido e arredondado por `tools/arredondar_mapa.py`. O arredondamento muda a forma de cada distrito de leve. A bandeja é a silhueta da cidade inteira. Os alfinetes ficam no centro do distrito de cada ponto, o que é uma aproximação.

## Imagens e ícones

Sem fotos e sem ícones decorativos. As formas do site são o mapa, a etiqueta, os balões e o cupom.
