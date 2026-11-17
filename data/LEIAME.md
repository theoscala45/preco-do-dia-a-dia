# Banco de dados: O Preço do Dia a Dia

Cada tabela é um arquivo CSV (UTF-8, vírgula como separador). O coletor escreve nelas toda noite. O site lê delas.

## Como as tabelas se ligam

A tabela de preços é a grande. Cada linha é um preço de um produto, numa rede, num CEP, num dia. Ela fica na pasta `precos/`, um arquivo por mês (`precos/2026-11.csv`), porque uma noite de coleta soma cerca de 1.700 linhas e um arquivo único passaria do limite do GitHub em menos de dois anos. As outras tabelas dão nome aos códigos dessa.

| Código na tabela de preços | Tabela com o significado |
|---|---|
| `produto_id` | produtos.csv |
| `rede_id` | redes.csv |
| `cep_id` | ceps.csv |

## Tabelas

**produtos.csv** (100 linhas). A cesta. `compara_por` diz como comparar preços (pacote, kg, unidade). `entra_no_indice` é `nao` para carnes e hortifruti: eles aparecem no comparador de cesta, mas ficam fora do índice principal.

**ceps.csv** (25 linhas). Cinco CEPs por zona da capital (Centro, Oeste, Sul, Leste, Norte). A coluna `perfil` (Central, Intermediário, Periferia) é uma classificação nossa, não um dado oficial. Falta trocar por dados de renda.

**redes.csv** (9 linhas). `tipo_preco` diz se o preço muda por CEP, por loja, se é único ou se ainda falta confirmar. `situacao` resume o que a leitura das regras do site permitiu.

**links.csv**. Uma linha por produto e rede. Hoje só tem o Tenda. `status` vale:
- `achado`: a página confirma marca, tamanho e tipo.
- `conferir`: o Tenda vende uma variante. Uma pessoa decide se serve.
- `nao_achado`: o produto não apareceu no sitemap.
- `bloqueado_robots`: a página existe, mas o robots.txt bloqueia a leitura. Não ler.

As observações de cada link ficam, por enquanto, na aba Links Tenda da planilha.

**precos/AAAA-MM.csv**. O coletor acrescenta linhas toda noite. Colunas: data, rede_id, produto_id, cep_id, preco_reais, unidade_de_venda, disponivel, nome_na_pagina, tamanho_na_pagina, lido_em. Produto sem preço no dia entra com `disponivel` igual a `nao`. Ele é dado, não erro. O preço guardado é o preço comum da página, não o do cartão da rede nem o de atacado.

**execucoes.csv**. Uma linha por rede e CEP a cada noite, com o resultado (`ok`, `parcial`, `falha` ou `bloqueado`) e o erro. É daqui que sai o aviso da manhã quando uma rede ou um CEP falha.

**ipca.csv**. IPCA mensal do Brasil (IBGE, SIDRA tabela 7060): índice geral, "Alimentação e bebidas" e "Higiene pessoal". Atualizar com `python3 tools/baixar_ibge.py`.

**pesos_ipca.csv**. Liga cada produto ao subitem do IPCA mais parecido e ao peso desse subitem no Brasil, no último mês publicado. Quando vários produtos caem no mesmo subitem, o peso é dividido entre eles. Seis produtos não têm subitem parecido (aveia, ketchup, ervilha, creme de leite, álcool, inseticida) e ficam sem peso: o índice dá a eles o peso médio. Os pesos do Brasil foram usados porque a região de São Paulo não publica peso para vários subitens da cesta.

## Regras do coletor

1. Ler só páginas de produto, uma por vez, devagar. Nada de busca, que o robots.txt de várias redes bloqueia.
2. Informar o CEP antes de ler o preço. O Tenda esconde o preço até receber um CEP.
3. Guardar o nome e o tamanho que a página mostra, não os da URL. Em alguns produtos eles diferem.
4. Guardar só fatos: preço, nome, tamanho. Nada de fotos nem descrições.
5. Se uma rede ou um CEP falhar, registrar em `execucoes.csv`, pular e seguir com o resto.
6. Se a rede bloquear o coletor (erro 403 ou 429, captcha), parar a rede na hora e registrar `bloqueado`. Nunca contornar.

O coletor fica em `coletor/coletar.py` e roda toda noite pelo GitHub Actions (`.github/workflows/coleta.yml`). Quando algo falha, ele abre a issue "Falha na coleta".

## Tabelas do mapa (OpenStreetMap)

Geradas por `tools/buscar_lojas_e_rotas.py`. Dados © colaboradores do OpenStreetMap, licença ODbL.

| Arquivo | Colunas | O que é |
|---|---|---|
| `lojas.csv` | rede_id, nome, lat, lon, endereco, osm | Lojas de cada rede na Grande São Paulo, achadas pela busca do OpenStreetMap (Nominatim). 212 lojas. |
| `pontos_geo.csv` | cep_id, lat, lon, precisao, osm | Latitude e longitude da rua de cada um dos 25 pontos de coleta. |

Limites: o cadastro do OpenStreetMap é feito por voluntários. Pode faltar loja, e pode haver loja fechada. O Tenda tem só 3 lojas cadastradas na área, então a "loja mais próxima" dele costuma ficar longe. A coordenada do ponto é a da rua, não a do número.

As rotas (de carro, do ponto até a loja mais próxima de cada rede, calculadas pelo OSRM) ficam em `assets/rotas.json`. Os distritos e os pontos em latitude e longitude ficam em `assets/geo.json`, feito por `tools/preparar_geo.py`.
