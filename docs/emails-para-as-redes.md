# Rascunhos de e-mail para as redes

O Theo revisa, completa o que está entre colchetes e envia pela conta dele.

Situação em 18/11/2026:
- 1 (St Marche, pedido de autorização): enviado. A St Marche autorizou por e-mail, sem condições. A rede entrou na coleta em 18/11/2026.
- 2 (Carrefour, pedido de acesso por CEP): enviado a atendimento@carrefour.com.br em 18/11/2026. Aguardando resposta. A 2b só vale se eles autorizarem.
- 3 (Pão de Açúcar e Santa Luzia, aviso): enviado aos dois. Sem resposta até agora.

Onde achar o contato: o rodapé do site de cada rede costuma ter "Fale conosco" ou "SAC". Para pedidos de autorização, vale pedir que o SAC encaminhe ao jurídico ou ao marketing.

---

## 1. St Marche: pedido de autorização

**Assunto:** Pedido de autorização para projeto estudantil de comparação de preços

Olá,

Meu nome é [nome], sou aluno do ensino médio em São Paulo. Estou fazendo um projeto estudantil sem fins lucrativos chamado O Preço do Dia a Dia. Ele compara quanto custa a mesma lista de 100 produtos de supermercado em diferentes bairros da cidade e mede a variação desses preços ao longo do tempo, comparando com o IPCA.

Li os termos de uso do site do St Marche. Eles pedem autorização por escrito para copiar ou republicar conteúdo. Por isso, antes de incluir o St Marche no projeto, peço essa autorização.

O que o projeto faria:
- Leria o preço, o nome e o tamanho de cerca de 100 produtos, uma vez por dia, devagar, abrindo as páginas normais de produto, como uma pessoa faria.
- Não copiaria fotos, descrições nem marcas, e não criaria espelho do site.
- Publicaria apenas o preço de cada produto e a soma da lista, com a data e a indicação da fonte.

O código e as tabelas do projeto são abertos: https://github.com/theoscala45/preco-do-dia-a-dia

Se a autorização não for possível, o St Marche fica fora do projeto, sem problema. Se houver condições, ou uma forma preferida de acesso, sigo o que vocês indicarem.

Obrigado pela atenção,
[nome]
[e-mail]

---

## 2. Carrefour: pedido de acesso

O site do Carrefour mostra uma tela de captcha para programas automáticos. Por isso o projeto lê só a página normal de cada produto, sem informar CEP, e guarda o preço padrão do site, um preço só para a cidade. Para ter o preço por bairro, é preciso a autorização deles.

Para onde mandar: atendimento@carrefour.com.br (o e-mail que aparece no rodapé do site do Carrefour Mercado). Vale começar pedindo que encaminhem ao setor responsável pelo site ou ao jurídico.

**Assunto:** Pedido de acesso para projeto estudantil de comparação de preços

Olá,

Peço, por favor, que esta mensagem seja encaminhada ao setor responsável pelo site do Carrefour Mercado.

Meu nome é [nome], sou aluno do ensino médio em São Paulo. Faço um projeto estudantil sem fins lucrativos chamado O Preço do Dia a Dia. Ele compara quanto custa a mesma lista de 100 produtos de supermercado em sete redes e em 25 bairros da cidade, e mede a variação desses preços contra o IPCA.

Hoje o projeto lê, uma vez por dia, de madrugada e devagar (uma página por vez, com alguns segundos entre elas), a página normal de 83 produtos no site do Carrefour Mercado. Guarda só o preço padrão, o nome e o tamanho. Não copia fotos nem descrições, e publica apenas o preço de cada produto e a soma da lista, com a data e a fonte.

O site mostra preços diferentes por CEP, e é isso que o projeto quer comparar entre bairros. Mas a verificação contra robôs bloqueia o navegador automático que informaria o CEP, e o projeto não contorna bloqueios. Por isso pergunto: vocês autorizariam o acesso do coletor para 25 CEPs da capital, uma vez por dia? Seriam cerca de 2 mil páginas por noite, no mesmo ritmo lento. Se houver uma forma preferida de acesso, ou condições, sigo o que vocês indicarem.

Se preferirem que o projeto não use os preços do Carrefour, me avisem e eu retiro a rede.

O código e as tabelas do projeto são abertos: https://github.com/theoscala45/preco-do-dia-a-dia

Obrigado,
[nome]
[e-mail]

### 2b. Só se o Carrefour autorizar: resposta

Use esta resposta apenas se o Carrefour responder autorizando. O captcha continua bloqueando o navegador automático que informa o CEP, e o projeto não contorna bloqueios, então ela pergunta como o programa deve acessar.

**Assunto:** Re: Pedido de acesso para projeto estudantil de comparação de preços

Olá,

Obrigado pela autorização. Vamos ler os preços uma vez por dia, como combinado.

Um detalhe técnico: o site mostra uma verificação contra robôs (captcha) quando o programa informa o CEP, e o projeto não contorna esse tipo de bloqueio. Vocês poderiam indicar como o programa deve acessar? Por exemplo, liberar o acesso de um programa que se identifica com o nome "preco-do-dia-a-dia", ou indicar outra forma oficial de consultar o preço por CEP.

Obrigado,
[nome]

---

## 3. Pão de Açúcar e Santa Luzia: aviso

Estes sites não têm termos de uso que falem do assunto (ou o projeto não os encontrou). O robots.txt permite ler as páginas de produto. O e-mail é um aviso de boa-fé, que também pergunta se há alguma objeção.

**Assunto:** Projeto estudantil de comparação de preços em São Paulo

Olá,

Meu nome é [nome], sou aluno do ensino médio em São Paulo. Faço um projeto estudantil sem fins lucrativos chamado O Preço do Dia a Dia, que compara quanto custa a mesma lista de 100 produtos de supermercado em diferentes bairros da cidade e mede a variação desses preços contra o IPCA.

Escrevo para avisar que o projeto pretende incluir o [Pão de Açúcar / Santa Luzia]. Ele leria o preço, o nome e o tamanho de cerca de 100 produtos, uma vez por dia, devagar, só nas páginas normais de produto e respeitando o robots.txt do site. Não copiaria fotos nem descrições. Publicaria apenas o preço de cada produto e a soma da lista, com a data e a fonte.

Procurei os termos de uso do site e não encontrei regras sobre isso. Se houver alguma objeção, ou alguma regra que eu não tenha visto, por favor me avisem, e eu sigo o que vocês indicarem.

O código e as tabelas do projeto são abertos: https://github.com/theoscala45/preco-do-dia-a-dia

Obrigado,
[nome]
[e-mail]
