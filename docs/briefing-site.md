# Briefing do site: O Preço do Dia a Dia

Para quem for construir o site (começando pelo Fable, terminando pelo Opus). Leia este arquivo e `data/LEIAME.md` antes de escrever código.

## O que o site é

Um site em duas partes, para moradores da cidade de São Paulo:

1. **Comparador de cesta.** A pessoa digita o CEP e monta uma lista de compras. O site mostra o supermercado mais barato para a lista toda e, se compensar, uma divisão entre no máximo 2 supermercados.
2. **Inflação do seu bairro.** Um índice de preços por bairro, calculado com os mesmos produtos todos os dias, comparado com o IPCA oficial do IBGE.

Quem faz: Theo, aluno do ensino médio em São Paulo. O site também vai compor a candidatura dele a universidades, então o método precisa ser claro e honesto sobre os limites dos dados.

## Páginas

1. **Início.** Mapa da cidade por zonas e uma caixa grande: CEP e lista de compras. É a primeira coisa que a pessoa vê.
2. **Resultado da lista.** Mercado mais barato, total, quanto economiza contra o mais caro, e a divisão em 2 mercados quando ela existir. Produto sem preço aparece como "indisponível nesta rede", nunca como erro.
3. **Inflação do seu bairro.** Linha do tempo do índice local contra o IPCA, por zona e por perfil (Central, Intermediário, Periferia).
4. **Método e fontes.** Como os produtos foram escolhidos, como o índice é calculado, de onde vêm os preços, quais redes entram, o que o site não sabe.

## Dados

O site lê as tabelas CSV de `data/` (ver `data/LEIAME.md`). Hoje só `produtos.csv`, `ceps.csv`, `redes.csv` e `links.csv` têm conteúdo. `precos.csv`, `ipca.csv` e `pesos_ipca.csv` estão vazias: o coletor ainda não existe.

**Regra para a fase de exemplo:** crie dados de exemplo em `data/exemplo/` com as mesmas colunas de `precos.csv` e `ipca.csv`. Todo preço de exemplo é inventado. O site, enquanto usar esses dados, mostra uma faixa fixa e visível: "Dados de exemplo. Os preços reais começam quando o coletor estiver rodando." Nenhum preço inventado pode aparecer sem essa faixa. Para trocar pelos dados reais, basta apontar o site para `data/` em vez de `data/exemplo/`.

## Limites que o site deve mostrar com clareza

- A divisão da compra usa no máximo 2 mercados.
- Carnes e hortifruti entram no comparador, mas ficam fora do índice principal.
- O recorte inicial é só a capital.
- A classificação por perfil (Central, Intermediário, Periferia) era do projeto; em 19/11/2026 foi trocada pela faixa de renda do distrito, do Censo 2022 (IBGE).
- O índice usa pesos do IPCA, ainda não preenchidos.

## Técnico

- Site estático, sem servidor: HTML, CSS e JavaScript, publicado no GitHub Pages do mesmo repositório.
- Funciona bem no celular. A maioria das pessoas vai abrir pelo telefone.
- Sem cadastro, sem login, sem cookies de rastreamento. O CEP e a lista ficam só no navegador.
- Acessível: contraste, foco de teclado, texto alternativo, e respeito a "reduzir movimento" nas animações.

## Direção visual

Interativo e bonito, com animações que ajudam a entender os dados (o índice se desenhando, as zonas do mapa respondendo, o total mudando ao adicionar um item). Sem decoração que atrapalhe a leitura de um preço. Português do Brasil, tom direto.

Antes de desenhar, use as skills de design instaladas (frontend-design, website-design e polimento-de-interface) e escreva a direção escolhida num `DESIGN.md` na raiz.

## Estado do projeto

Passos 1 a 5 do plano estão prontos (cesta de 100 produtos, 25 CEPs, 9 redes, links do Tenda, banco em CSV). Falta o coletor (passos 6 a 8) e o agente que compara produtos iguais entre redes (passo 9). O esqueleto do site é o passo 10, feito antes por falta de tempo com o Fable.
