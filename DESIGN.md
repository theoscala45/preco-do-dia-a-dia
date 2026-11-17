# Direção visual: O Preço do Dia a Dia

Revista em 17/11/2026. As duas primeiras versões foram rejeitadas pelo Theo: a primeira (papel de cupom, serifa) ficou séria e dura demais, a segunda (peças de brinquedo, nuvens, lojinhas) ficou infantil. O pedido final: cara de site profissional, leve, com cantos arredondados, e um mapa de verdade com lojas e ruas de verdade.

## A ideia

Um produto de mapa, escuro, com uma cor só. O mapa real de São Paulo ocupa a tela inteira e o texto fica por cima, à esquerda. Com um CEP, a câmera desce até o ponto de coleta e desenha, rua por rua, o caminho de carro até a loja mais próxima de cada rede. O caminho da rede mais barata fica laranja.

Nada no site é desenho: ruas, lojas e rotas vêm do OpenStreetMap, e os contornos dos distritos vêm da Prefeitura.

## Cor

Tema escuro, sem modo claro.

| Nome | Valor | Papel |
|---|---|---|
| fundo | `#0C0C0D` | Fundo da página e do mapa. |
| sup, sup-2, sup-3 | `#151517`, `#1D1D20`, `#28282C` | Cartões, campos, barras. |
| linha | branco a 9% e a 16% | Bordas de 1 px. |
| texto | `#F3F1EC` | Texto principal (branco quente). |
| texto-2, texto-3 | `#A9A6A0`, `#77746F` | Apoio e legendas. |
| laranja | `#FF7A1A` (hover `#FF9547`) | A única cor de destaque: rede mais barata, botão principal, pontos de coleta, índice local. |
| oficial | `#C9CCD3` | Linha do IPCA no gráfico. |
| erro | `#FF8A75` | Mensagens de erro e item indisponível. |

Não há verde nem vermelho para "barato" e "caro". O mais barato é laranja, o resto é neutro.

## Tipografia

Família Red Hat, hospedada no site (`assets/fonts`, licença SIL OFL).

- **Red Hat Display** (700): títulos e preços. Espaçamento apertado (-0,028em nos títulos).
- **Red Hat Text** (400 a 700): texto corrido, botões, listas.
- **Red Hat Mono** (500): rótulos pequenos de dado (distância, posição, legenda).

Algarismos tabulares nos preços. Caixa normal, sem rótulos em maiúsculas.

## Forma

- Cantos: 14 px em campos e botões, 22 a 24 px em cartões, pílula (999 px) em navegação e botões secundários.
- Cartões sobre o mapa: fundo `sup` a 90% com desfoque, borda de 1 px. Sem sombra pesada.
- Botão principal laranja com texto escuro. Botão secundário só com borda.
- Um véu escuro cobre o lado do texto e as bordas do mapa.

## Movimento

Sem mola e sem pulo. Uma curva só: `cubic-bezier(.2,.8,.2,1)`.

1. **Entrada.** As linhas do título sobem de trás de uma máscara, uma depois da outra. O mapa aparece em fade.
2. **O mergulho.** Com um CEP (ou um clique num distrito), a câmera voa da cidade inteira até o bairro. As rotas se desenham uma por vez, da rede mais cara à mais barata, e a etiqueta de cada loja aparece quando a rota chega. No fim, a rota da mais barata fica laranja, as outras apagam, e a câmera se aproxima dela. Um ponto de luz corre pela rota laranja.
3. **O scroll troca as cenas.** Cidade inteira, pontos de coleta em destaque, mergulho de demonstração (Pinheiros, se não houver CEP), distritos coloridos pela alta em 12 meses com o gráfico.
4. **Resposta a ações.** Passar o ponteiro numa rede da lista destaca a rota dela no mapa. Preço novo: o número rola.
5. Com "reduzir movimento": a câmera corta direto, as rotas já aparecem prontas, sem ponto de luz.

## Mapa

- Biblioteca: MapLibre GL JS 5 (`assets/vendor`, licença BSD).
- Imagem do mapa: blocos vetoriais do OpenFreeMap (dados do OpenStreetMap), com o estilo `assets/mapa-estilo.json`, uma adaptação do estilo Dark do OpenFreeMap para a paleta do site.
- Distritos: contorno da Prefeitura de São Paulo (GeoSampa), encolhido e arredondado, levantado em 3D na visão da cidade inteira. Some quando a câmera desce. O contorno é simplificado.
- Lojas: busca do OpenStreetMap (Nominatim), em `data/lojas.csv`. O cadastro é feito por voluntários e pode faltar loja (o Tenda, por exemplo, tem poucas lojas cadastradas).
- Pontos de coleta: a rua de cada CEP de `data/ceps.csv`, localizada pelo Nominatim (`data/pontos_geo.csv`).
- Rotas: de carro, do ponto de coleta até a loja mais próxima de cada rede, calculadas pelo OSRM (`assets/rotas.json`).
- O preço comparado é o do site de cada rede para o CEP, não o da prateleira da loja do mapa. A página diz isso.
- O mapa não aproxima com a rolagem da página (precisa de Ctrl ou dois dedos), para não prender o scroll.

## Imagens e ícones

Sem fotos, sem ilustrações e sem ícones decorativos.
