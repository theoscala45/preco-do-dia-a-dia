# Banco de dados: O Preço do Dia a Dia

Cada tabela é um arquivo CSV (UTF-8, vírgula como separador). O coletor escreve nelas toda noite. O site lê delas.

## Como as tabelas se ligam

`precos.csv` é a tabela grande. Cada linha é um preço de um produto, numa rede, num CEP, num dia. As outras tabelas dão nome aos códigos dessa.

| Código em precos.csv | Tabela com o significado |
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

**precos.csv** (vazia). O coletor acrescenta linhas. Produto sem preço no dia entra com `disponivel` igual a `nao`. Ele é dado, não erro.

**execucoes.csv** (vazia). Uma linha por rede e CEP a cada noite, com o resultado e o erro. É daqui que sai o aviso da manhã quando uma rede ou um CEP falha.

**ipca.csv** (vazia). IPCA mensal do IBGE (SIDRA), geral e por grupo, para comparar com o índice local.

**pesos_ipca.csv** (vazia nos pesos). Liga cada produto a um grupo do IPCA e ao peso desse grupo. Preencher no passo do índice.

## Regras do coletor

1. Ler só páginas de produto, uma por vez, devagar. Nada de busca, que o robots.txt de várias redes bloqueia.
2. Informar o CEP antes de ler o preço. O Tenda esconde o preço até receber um CEP.
3. Guardar o nome e o tamanho que a página mostra, não os da URL. Em alguns produtos eles diferem.
4. Guardar só fatos: preço, nome, tamanho. Nada de fotos nem descrições.
5. Se uma rede ou um CEP falhar, registrar em `execucoes.csv`, pular e seguir com o resto.
