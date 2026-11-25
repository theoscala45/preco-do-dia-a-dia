# Direção visual: Preço Aberto

> **Atualização de 23/11/2026.** O visual de hoje é claro (branco, laranja `#F26A0F` e azul `#2448E0`) e a identidade é a **etiqueta de gôndola**, em `assets/css/etiqueta.css` (carregado depois do `estilo.css`). O texto abaixo, de 17/11, descreve o tema escuro antigo e vale só como histórico.
>
> - O preço é a marca: títulos e números grandes em **Big Shoulders Display** (letreiro de mercado, licença OFL, `assets/fonts`); texto corrido e números pequenos em Red Hat.
> - Seções separadas por uma **régua de prateleira** (linha grossa com marcas) e uma presilha laranja.
> - Números e a cesta média viram **etiquetas** (borda de 2 px, furo no canto); a primeira, em laranja.
> - A etiqueta da cesta no início balança uma vez ao carregar (só com movimento liberado).
> - Cartões: canto de 14 px e borda de baixo grossa, como o fundo de uma prateleira. Selos de "mais barata" com a ponta de etiqueta.
> - **Movimento dos cards** (`assets/js/cards.js` e o fim do `etiqueta.css`): entrada em arco (x e y com curvas diferentes), squash ao pousar, conteúdo que chega depois (follow through); toda vez que o card entra na tela (ao abrir a página e ao rolar de volta até ele); ao sair da tela o card volta ao estado escondido. Hover só em quem é clicável (cartões-porta, linhas da lista de produtos, botões); cards de dados só têm a animação de entrada. Entre os cartões-porta, ao passar o mouse num, o outro recua (foco). Botões achatam ao apertar e voltam com mola. Duas alturas de profundidade 3D: leve (cards de leitura) e forte (peças). Alvos de clique maiores (botão de tirar da lista, links dos capítulos, toque).
> - Leis de UX aplicadas: Fitts (alvos maiores), Hick (poucas opções por vez), Miller (lista de produtos em 4 grupos), Doherty (resposta em menos de 400 ms), Postel (CEP aceito sem o zero do começo), Jacob (só o que parece botão se comporta como botão), frequência de uso (hover discreto nos botões).
> - Para voltar ao visual anterior, tirar o link do `etiqueta.css` das páginas.

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

Feito com GSAP (linhas do tempo, ScrollTrigger, SplitText) e Lenis (scroll suave). Sem mola e sem pulo. Curvas `power3.out` para entradas e `power2.inOut` para o que se desenha.

1. **Scroll suave.** O Lenis suaviza a rolagem e alimenta o ScrollTrigger. O mapa não aproxima com a rolagem, para não prender a página.
2. **Entradas.** Os títulos sobem linha por linha, de trás de uma máscara (SplitText). Blocos marcados com `data-surge` sobem e aparecem em lote quando entram na tela. Listas com `data-fila` entram linha por linha. Números com `data-conta` contam do zero.
3. **Ligado ao scroll.** Uma barra laranja no topo mostra quanto da página foi lida. O cabeçalho some ao descer e volta ao subir. Riscos divisórios (`data-risco`) se desenham. Na página inicial, o texto da abertura sobe e apaga, uma trilha lateral marca o capítulo e as linhas do gráfico se desenham conforme a rolagem.
4. **O mergulho.** Com um CEP (ou um clique num distrito), a câmera voa da cidade inteira até o bairro. Uma linha do tempo desenha as rotas uma por vez, da rede mais cara à mais barata, e a etiqueta de cada loja aparece quando a rota chega. No fim, a rota da mais barata fica laranja, as outras apagam, a câmera se aproxima dela e um ponto de luz passa a correr pela rota.
5. **As cenas.** ScrollTrigger troca a cena do mapa: cidade inteira, pontos de coleta em destaque, mergulho de demonstração (Pinheiros, se não houver CEP), distritos coloridos pela alta em 12 meses.
6. **Resposta a ações.** Passar o ponteiro numa rede da lista destaca a rota dela. Preço novo: o número rola. Trocar a visão do gráfico de inflação redesenha as linhas da esquerda para a direita.
7. **Reduzir movimento.** Tudo acima fica dentro de `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`. Com a preferência ligada não há Lenis, as entradas não acontecem, a câmera corta direto e as rotas já aparecem prontas.

## Páginas

- **Início** (`index.html`): mapa, CEP, três capítulos, números, montagem da lista.
- **Minha lista** (`lista.html`): loja única mais barata, economia, divisão em duas lojas, rota no mapa, total por rede e tabela produto por produto.
- **Inflação por bairro** (`inflacao.html`): três números, gráfico por ponto, zona ou perfil, mapa dos distritos e os 25 pontos em ordem.
- **Método e fontes** (`metodo.html`): cesta, pontos, redes, coleta, contas, limites e fontes.

O CEP e a lista ficam no `localStorage` e valem para todas as páginas. No celular, o menu abre em tela cheia.

## Mapa

- Biblioteca: MapLibre GL JS 5 (`assets/vendor`, licença BSD). O módulo `assets/js/mapa.js` tem as peças comuns aos três mapas do site.
- Imagem do mapa: blocos vetoriais do OpenFreeMap (dados do OpenStreetMap), com o estilo `assets/mapa-estilo.json`, uma adaptação do estilo Dark do OpenFreeMap para a paleta do site.
- Distritos: contorno da Prefeitura de São Paulo (GeoSampa), encolhido e arredondado, levantado em 3D na visão da cidade inteira. Some quando a câmera desce. O contorno é simplificado.
- Lojas: busca do OpenStreetMap (Nominatim), em `data/lojas.csv`. O cadastro é feito por voluntários e pode faltar loja (o Tenda, por exemplo, tem poucas lojas cadastradas).
- Pontos de coleta: a rua de cada CEP de `data/ceps.csv`, localizada pelo Nominatim (`data/pontos_geo.csv`).
- Rotas: de carro, do ponto de coleta até a loja mais próxima de cada rede, calculadas pelo OSRM (`assets/rotas.json`).
- O preço comparado é o do site de cada rede para o CEP, não o da prateleira da loja do mapa. A página diz isso.
- O mapa não aproxima com a rolagem da página. No computador há botões de aproximar e afastar. No toque, o mapa se move com dois dedos.

## Imagens e ícones

Sem fotos, sem ilustrações e sem ícones decorativos.
