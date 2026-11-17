# Direção visual: O Preço do Dia a Dia

Decidido em 16/11/2026. Clima escolhido pelo Theo: claro e editorial. Esta direção não foi baseada em sites de referência. Ela vem do assunto: o supermercado.

## A ideia

O site toma emprestado três objetos do mercado: o papel do cupom fiscal, a etiqueta amarela de gôndola e a tinta azul da via carbonada. O resto é reportagem: serifa, texto alinhado à esquerda, um mapa.

Uma coisa só chama atenção: o mapa 3D da cidade, com os 96 distritos em relevo. Tudo em volta fica quieto.

## Cor

| Nome | Valor | Papel |
|---|---|---|
| papel | `#F1F2EE` | Fundo da página. Branco frio de papel térmico, não creme. |
| papel-2 | `#E4E6E0` | Faixas e fundos de campo. |
| tinta | `#1D1F2A` | Texto, linhas do mapa, botões. |
| tinta-2 | `#5A5E6B` | Texto de apoio. Contraste 5,9:1 sobre papel. |
| etiqueta | `#FFD60A` | Só para preço em destaque e para o que a pessoa selecionou. Texto em tinta por cima. |
| caro | `#D4281C` | Mais caro no mapa. Linha do índice local no gráfico. |
| oficial | `#2447C5` | Tudo que vem do IBGE (IPCA). Links. |

Escala do mapa: branco, etiqueta, caro. Baixo é branco, alto é vermelho.

Sem modo escuro. Sem degradê decorativo.

## Tipografia

Duas famílias, hospedadas no próprio site (`assets/fonts`).

- **Newsreader** (serifa, com tamanho óptico): títulos e texto corrido. Peso 400 a 500. Títulos com entrelinha 1,02 a 1,1.
- **Archivo** (grotesca com eixo de largura): interface em largura normal, peso 500. Preços em largura 62%, peso 800, como numeral de etiqueta. Sempre com algarismos tabulares.

Escala: 13, 15, 18, 24, 34, 52 e título de abertura entre 44 e 104 px. Texto corrido em 18 a 20 px, com linhas de no máximo 34 em de largura.

Regras: caixa normal, sem rótulos em maiúsculas, sem palavra do título em outra cor.

## Espaço e forma

- Base de 8 px. Margem lateral: 24 px no celular, 6 vw no desktop.
- Texto alinhado à esquerda. O mapa ocupa a direita e sangra para fora da tela.
- Cantos: 0 no editorial, 4 px em campos e botões, 6 px na etiqueta.
- Uma sombra só, de papel sobre mesa: usada no cupom e na etiqueta.

## Movimento

A animação é a parte mais importante do site, então segue regras.

1. **Uma entrada.** Ao carregar, os distritos caem no lugar em onda, do centro para as bordas, e o título sobe linha por linha. Nada mais anima sozinho, fora uma rotação lenta do mapa.
2. **O scroll comanda as cenas.** A posição da página controla câmera, altura e cor do mapa, os alfinetes e o traço do gráfico. Rolar para trás desfaz. Nada dispara e roda sozinho.
3. **Resposta a ações.** CEP digitado: a câmera voa até o bairro. Item adicionado: uma linha sai do cupom e o total rola até o novo valor.
4. Curva padrão `cubic-bezier(.2,.8,.2,1)`. Durações: 180 ms (resposta), 420 ms (painel), 900 ms (número).
5. Com "reduzir movimento" ligado: sem queda, sem rotação, cenas trocam direto.

## Componentes

- **Botão principal:** fundo tinta, texto papel. Um por tela.
- **Campo:** fundo branco, borda tinta de 1,5 px, foco com anel oficial de 3 px.
- **Etiqueta:** fundo etiqueta, furo de gancho no canto, preço em Archivo estreita com centavos elevados.
- **Cupom:** papel branco, borda inferior serrilhada, linhas pontilhadas entre item e preço.
- **Faixa de exemplo:** fixa no topo, fundo tinta, enquanto `dados.exemplo` for verdadeiro.

## Mapa

Contorno real dos 96 distritos (Prefeitura de São Paulo, GeoSampa). Cada distrito usa o ponto de coleta mais próximo. Os alfinetes ficam no centro do distrito de cada ponto, o que é uma aproximação.

## Imagens e ícones

Sem fotos e sem ícones decorativos. As formas do site são o mapa, a etiqueta e o cupom.
