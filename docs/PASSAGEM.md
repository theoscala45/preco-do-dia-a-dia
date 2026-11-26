# Passagem do projeto para outra conta do Claude

Escrito em 23/11/2026, no fim da primeira fase de trabalho. Quem continuar o projeto (o Claude da outra conta) deve
ler este arquivo inteiro antes de começar, depois o `CLAUDE.md` (regras, carregado sozinho), o `README.md`, o
`DESIGN.md`, o `data/LEIAME.md` e o `docs/lista-tecnica.md`.

Tudo o que o projeto é está neste repositório. O que existia só na conta antiga (a conversa, o documento "lista
técnica" e as configurações da nuvem) está resumido aqui e em `docs/lista-tecnica.md`.

---

## 1. Para o Theo: como abrir o projeto na outra conta

1. Na outra conta do Claude, ligar o GitHub: claude.ai, Configurações, Conectores (ou Claude Code na web), conectar a
   **mesma conta do GitHub** (`theoscala45`). Se pedir, instalar o app do Claude no repositório
   `theoscala45/preco-do-dia-a-dia`.
2. Abrir o Claude Code (claude.ai/code) e começar uma sessão com o repositório `theoscala45/preco-do-dia-a-dia`.
3. Colar a mensagem da seção 2 como primeira mensagem.
4. O Claude novo vai pedir para criar um "ambiente" com a lista de sites liberados (seção 4). É só aprovar no botão.
5. Nada muda no GitHub, no site nem no cron-job.org: a coleta continua rodando sozinha toda noite, com ou sem Claude.

Não passar senhas nem códigos no chat. Os segredos ficam no cron-job.org e nos Secrets do GitHub, digitados pelo Theo.

## 2. Primeira mensagem para colar na conta nova

```
Oi! Este é o meu projeto Preço Aberto, que veio de outra conta do Claude. Antes de qualquer coisa, leia
docs/PASSAGEM.md inteiro e depois CLAUDE.md, README.md, DESIGN.md, data/LEIAME.md e docs/lista-tecnica.md.
Estou na etapa de mexer no site (o visual): eu digo o que quero mudar, muitas vezes com prints, e você faz as
mudanças. O visual atual (branco com laranja e azul, início com os 3 capítulos do mapa) foi aprovado por mim; não
desfaça nada sem me perguntar.
Depois de ler:
1) proponha o ambiente da nuvem com os sites da seção 4 do PASSAGEM.md (eu aprovo no botão);
2) confira se a coleta de hoje rodou bem (data/execucoes.csv e as issues abertas no GitHub);
3) me diga em poucas linhas o que entendeu, e fique pronto para os meus pedidos no site.
Fale comigo sempre em português, simples e direto, e me mande o link do site a cada mudança.
```

## 3. O projeto em poucas linhas

- **O que é:** um site que compara quanto custa a mesma lista de 100 produtos em 10 redes de supermercado, em 25
  bairros de São Paulo, e mede a inflação dessa cesta em cada bairro contra o IPCA.
- **Site:** https://theoscala45.github.io/preco-do-dia-a-dia/ (GitHub Pages). Prévia com os preços reais:
  `?previa` no fim do endereço (vale para todas as páginas pelo menu).
- **Repositório:** `theoscala45/preco-do-dia-a-dia`, público (tem que continuar público para o Actions ser grátis).
- **Dono:** Theo, aluno do ensino médio em São Paulo. Ele instrui; o Claude escreve todo o código e os textos.
- **Custo:** zero.

## 4. Ambiente da nuvem (recriar na conta nova)

Ambiente pessoal, nome `preco-do-dia-a-dia`, rede **limitada**, com gerenciadores de pacote e servidores MCP liberados
e sem script de preparo. Sites liberados (cada um tem motivo; não acrescentar outros sem precisar):

- Redes coletadas: `www.tendaatacado.com.br`, `api.tendaatacado.com.br`, `www.atacadao.com.br`,
  `mercado.carrefour.com.br`, `bff-frontend-api.cloud.carrefour.com.br`, `www.paodeacucar.com`, `paodeacucar.com`,
  `api.vendas.gpa.digital`, `www.sondadelivery.com.br`, `sondadelivery.com.br`, `www.santaluzia.com.br`,
  `santaluzia.com.br`, `www.lojahirota.com.br`, `lojahirota.com.br`, `services.vipcommerce.com.br`,
  `services-beta.vipcommerce.com.br`, `www.marche.com.br`, `marche.com.br`, `www.stmarche.com.br`, `stmarche.com.br`,
  `www.nagumo.com.br`, `nagumo.com.br`, `www.mambo.com.br`, `mambo.com.br`, `mambodelivery.vtexassets.com`,
  `mambodelivery.vteximg.com.br`, `io.vtex.com.br`
- Candidatas estudadas (11ª rede): `www.barbosasupermercados.com.br`, `barbosasupermercados.com.br`,
  `api-barbosa.applay.tech`, `www.zaffari.com.br`, `zaffari.com.br`, `www.samsclub.com.br`, `samsclub.com.br`,
  `www.oba.com.br`, `oba.com.br`, `www.shibata.com.br`, `shibata.com.br`, `www.dia.com.br`, `dia.com.br`,
  `www.assai.com.br`, `assai.com.br`, `www.roldao.com.br`, `roldao.com.br`, `www.ricoy.com.br`, `ricoy.com.br`,
  `challenges.cloudflare.com`
- Mapa e dados públicos: `tiles.openfreemap.org`, `overpass-api.de`, `nominatim.openstreetmap.org`,
  `router.project-osrm.org`, `apisidra.ibge.gov.br`, `sidra.ibge.gov.br`, `servicodados.ibge.gov.br`, `ftp.ibge.gov.br`

A coleta de verdade roda no GitHub Actions, não na nuvem do Claude. O ambiente serve só para o Claude testar o
coletor e o site.

Para ver o site na nuvem: `python3 -m http.server 8765` na raiz e abrir com o Playwright (Chromium já instalado; para
o mapa aparecer no Chromium sem placa de vídeo, lançar com `--use-gl=swiftshader --enable-unsafe-swiftshader`).

## 5. Serviços de fora do repositório

| Serviço | Para quê | Situação |
| --- | --- | --- |
| GitHub Actions | Coleta, montagem do site, IPCA, revisão de links | Rodando. Avisos chegam por e-mail como issues |
| GitHub Pages | Publica o site | Publica a cada push em `main` e depois de cada coleta |
| cron-job.org | Dispara `coleta.yml` todo dia às 02h17 (São Paulo), porque o horário do GitHub falhou em 18 e 19/11 | Conta do Theo. Chave do GitHub chamada `coleta-cron` (Actions leitura e escrita, só este repositório), vence por volta de 30/06/2027 |
| OpenFreeMap, OpenStreetMap, OSRM, IBGE | Mapa, lojas, rotas, IPCA, renda | Grátis, sem cadastro |
| E-mail do projeto | St Marche autorizou por e-mail; pedido ao Carrefour enviado (só resposta automática) | Rascunhos em `docs/emails-para-as-redes.md` |

Nunca houve segredo no repositório. Num dia o Theo colou uma chave do GitHub no chat: ela foi apagada e trocada, e ele
foi orientado a nunca mais colar segredos.

## 6. Como as peças funcionam

**Coleta (`coletor/coletar.py`, Python com Playwright 1.49.1).** Uma classe por rede em `REDES`. Três tipos:
- *Por CEP* (Tenda): informa o CEP do bairro no site e lê cada produto.
- *Por loja* (Atacadão, Hirota, Nagumo): escolhe a loja de retirada que o site oferece para o CEP; lojas repetidas são
  lidas uma vez e copiadas. A coluna `loja` em `execucoes.csv` diz qual foi.
- *Preço único* (Carrefour, Pão de Açúcar, Sonda, Santa Luzia, St Marche, Mambo): lidas uma vez por noite, na parte
  "Unico", com `cep_id` vazio.
- Pausas entre páginas: padrão 2 a 3,5 s; Tenda 5 a 8 s (pediu calma com erro 429 em 23/11); Nagumo 8 a 12 s.
- `--refazer` lê de novo o que já está ok no dia. `robots()` trata robots.txt 404 como "tudo liberado".
- Leitores com detalhes que já deram problema: Pão de Açúcar lê o texto entre o título e "Comprar" (antes pegava o
  preço de "Veja também"); Nagumo lê o preço visível (o JSON-LD traz o preço sem promoção); Mambo espera o R$ no
  primeiro bloco de preço depois do título.

**Fluxos (`.github/workflows/`).**
- `coleta.yml`: horários 05h17, 08h17, 11h43 e 15h43 UTC (02h17, 05h17, 08h43 e 12h43 em São Paulo; os três últimos são
  reserva e só leem o que faltou). Partes: Unico, Centro, Oeste, Sul, Leste, Norte, duas de cada vez. Depois o job
  `juntar` roda `juntar.py`, `tools/atualizar_site.py`, faz o commit, pede o build do Pages e roda `alerta.py`.
- `alerta.py` só abre ou atualiza a issue "Falha na coleta" quando importa: rede bloqueada, rede inteira falhando, o
  mesmo bairro falhando em duas coletas seguidas, menos de 90% lido, ou nenhuma coleta.
- `atualizar.yml`: IPCA e pesos todo mês (dias 8 a 14), e ao salvar `data/site.txt`.
- `revisar-links.yml`: toda segunda, abre "Links para revisar".
- `agente.yml`: agente que acha links numa rede nova; precisa do secret `ANTHROPIC_API_KEY`, que não existe. Nunca usado.

**Site.** HTML estático + módulos JS em `assets/js/`. MapLibre com estilo claro em `assets/mapa-estilo.json`, GSAP com
ScrollTrigger e SplitText, Lenis.
- `index.html` + `main.js` + `mapa.js`: início com o mapa 3D preso na tela e 3 capítulos pelo scroll (25 bairros;
  rotas até a loja de cada rede; inflação), faixa de números, comparador "Monte sua lista" com o ranking das redes, e
  cartões para as outras páginas.
- `lista.html` + `lista.js` + `mapa-rota.js`: resultado da lista (loja única, duas lojas, mapa, tabela).
- `inflacao.html` + `inflacao.js`: índice do bairro contra o IPCA, por bairro, zona e renda; mapa com o nome do
  distrito ao passar o mouse.
- `metodo.html` + `metodo.js`: método e fontes, com detalhes em partes que abrem e fecham.
- `base.js`: CEP para bairro, dados guardados no navegador, `?previa`, Lenis, animações comuns. `cesta.js`: contas.

**Dados do site.** `tools/montar_site.py` gera `assets/dados.json` (exemplo ou real, conforme `data/site.txt`) e
`assets/dados-previa.json` (sempre real). Os preços reais contam a partir de `inicio=2026-11-19`. O índice usa a
mediana da variação de cada rede contra ela mesma, e o IPCA entra uma vez por mês.

## 7. Estado em 23/11/2026

**Coleta.** De 19 a 22/11 chegou perto de 100% com as reservas. Em 23/11, às 10h06 de São Paulo, estava em 89,3%, antes
das reservas do dia. Falhas daquela noite: Hirota e Nagumo em alguns bairros e o Tenda com erro 429 no C15 (o Tenda
ficou mais lento). A issue #4 ("Falha na coleta") deve fechar sozinha depois de uma noite limpa.

**Redes (10).**

| Rede | Tipo | Situação das regras |
| --- | --- | --- |
| Tenda Atacado | por CEP | liberado |
| Carrefour | preço único (captcha impede o CEP) | liberado com dúvida; pedido de acesso enviado |
| Atacadão | por loja | liberado com cuidado |
| Pão de Açúcar | preço único | liberado com dúvida |
| Sonda | preço único | liberado |
| St Marche | preço único | autorizado por e-mail |
| Santa Luzia | preço único (loja única) | liberado com dúvida |
| Hirota | por loja | liberado com dúvida |
| Nagumo | por loja | liberado |
| Mambo | preço único (igual em todas as lojas) | liberado |

**Site.** Visual claro (branco com laranja e um azul de destaque), feito com o Theo em 23/11. `data/site.txt` ainda
está com `dados=exemplo`: o site mostra preços inventados com a faixa "Dados de exemplo"; a prévia mostra os reais.

## 8. Decisões do Theo (seguir, não rediscutir)

- 19/11: plano em 4 passos: coleta pronta; visual pelo Claude Code; textos para dados reais e `dados=real`; ajustes
  finais e lançamento.
- 20/11, regras da cesta: produto lido em pelo menos 8 de 9 mercados (com 10 ou mais, em todos menos 1 ou 2); "mesmo
  produto" é mesma marca, o tamanho pode mudar, com a comparação por kg, litro ou unidade e o tamanho de cada mercado à
  mostra (produto maior custa mais); quem não cumpre é trocado por outro parecido; faltas que são escolha do mercado
  (Santa Luzia sem frescos e refrigerados online, Hirota sem higiene online) são exceção, e o site avisa.
- Mais duas redes: Mambo (feito) e Barbosa (em andamento; plano B é o Zaffari). Ele quer redes que não exijam e-mail
  pedindo permissão.
- Alertas por e-mail só para o que importa.
- Tenda: se pedir calma (429) de novo, pausar o Tenda e avisar o Theo.
- 23/11, visual:
  - Fundo claro, branco com laranja (#F26A0F), mais o azul #2448E0 nos botões e destaques.
  - O início completo, com os 3 capítulos do mapa (ele não quer o início cortado).
  - O mapa com estradas e cidades, botões + e −, a rodinha só rola a página.
  - Pontos do mapa chamados de "bairro", nunca "ponto de coleta".
  - Passar o mouse num bairro mostra o supermercado mais barato.
  - Gráfico do início com só 2 linhas (o bairro e o IPCA).
  - Ranking das redes no comparador do início.
  - Pouco texto.

## 9. O que falta, em ordem

1. **Visual:** o Theo ainda está revisando. Esperar os pedidos dele.
2. **Cesta:**
   - Trocar os produtos fracos. Pelo `data/links.csv` (achado, variante ou tamanho diferente), 24 produtos estão em
     menos de 8 das 10 redes. Refazer essa conta com as leituras reais de `data/precos/` antes de trocar; a conta
     antiga, com as leituras, dava 53.
   - Fazer a comparação por tamanho (preço por kg, litro ou unidade) com o tamanho de cada mercado à mostra no site.
     Itens do Mambo marcados `tamanho_diferente` para rever depois disso: P015, P053, P054, P058 e P059.
3. **11ª rede:**
   - O Barbosa não tem página por produto. A ideia em estudo é ler as páginas de categoria do próprio site (cartões com
     o EAN) e escolher a loja, que começa em "Taboão".
   - Atenção à regra "nada de API escondida": `api-barbosa.applay.tech` é o servidor de dados do site deles, não uma
     página normal. Decidir com cuidado e, na dúvida, ir de Zaffari.
4. **Textos e dados reais:** "12 meses" e "mês a mês" só fazem sentido com meses de dados (o índice de 12 meses só vale
   a partir de novembro de 2027). Ajustar a faixa do topo e trocar para `dados=real` em `data/site.txt`.
5. **Lançamento:**
   - Fazer a imagem de prévia para compartilhar o link, a página 404 e o teste no celular.
   - Pendências fora do código: domínio opcional, guardar o e-mail da St Marche, renovar a chave do cron-job.org.
6. **Pequeno:** no gráfico do início, as datas aparecem "nov 26 ... nov 26" enquanto só há um mês de dados.

## 10. Lições do caminho

- **Agendamento do GitHub:** o horário agendado do GitHub às vezes não dispara. Por isso existem as reservas e o
  cron-job.org.
- **Mexer em `main`:** a coleta grava em `main` de madrugada e de manhã. Sempre rodar `git pull --no-rebase origin main`
  antes de mexer e antes de cada commit. Não editar à mão os arquivos que a coleta grava.
- **Testar o coletor:** rodar numa cópia com `execucoes.csv` vazio. Senão, "já lido hoje" pula tudo.
- **`tools/gerar_tabelas.py`:** grava num caminho antigo (`/home/claude/tenda`) e falha calado. Editar `data/ceps.csv`
  direto.
- **Nominatim:** limita pedidos (429). Usar coordenadas já conhecidas.
- **Ao mexer no visual:**
  - Conferir também com `?previa` e no celular. Rede sem preço num bairro já causou erro no mapa.
  - O MapLibre grava a opacidade direto nas etiquetas das lojas; o CSS usa `!important` para a classe `on` mandar.
  - O SVG com `<title>` mostra uma caixinha preta do navegador; usar `aria-label`.
- **Com o Theo:**
  - Antes de desfazer algo que ele escolheu, perguntar com opções. Numa vez cortei o início demais e ele não gostou.
  - Ele gosta de ver o resultado. Mandar o link (e fotos quando ajudar) a cada mudança.

## 11. Jeito de trabalhar com o Theo

- Português do Brasil, simples e direto, listas curtas; barra de progresso quando ele pergunta o que falta.
- Perguntas sempre com opções clicáveis, uma marcada "(Recomendado)".
- Toda mensagem sobre mudança no site leva o link da página (e a versão `?previa` quando fizer sentido).
- Ele é exigente com o visual e manda prints com o que quer mudar; às vezes escreve rápido e irritado. Entender o
  pedido, perguntar quando houver duas leituras e não repetir o erro.
- Textos do site: sem travessão (—), sem tom de propaganda, sem citar IA na página Método, sem o nome do autor.
- Push em `main` está autorizado. Commits com as linhas de coautoria e da sessão da conta nova.

## 12. Como fazer o projeto crescer

Os passos já existem no código; o que muda é o cuidado com o tempo da coleta e com as regras do Theo.

**Mais bairros (hoje 25, cinco por zona).**
1. Nova linha em `data/ceps.csv` (próximo código, C26...), com bairro, zona, CEP e rua.
2. `python3 tools/baixar_renda.py` (faixa de renda; o nome do bairro precisa bater com um dos 96 distritos).
3. Pôr o código e o distrito em `PONTO_DISTRITO` de `tools/preparar_mapa.py` e rodar `python3 tools/preparar_mapa.py --pontos`.
4. `python3 tools/buscar_lojas_e_rotas.py pontos`, depois `rotas`, depois `python3 tools/preparar_geo.py`.
5. Trocar os "25" fixos nos textos do site e do método.
6. Custo: cada bairro novo soma uns 10 a 20 minutos de coleta por noite (o Tenda lê bairro por bairro, devagar; Atacadão,
   Hirota e Nagumo só se cair numa loja nova). A coleta já vai até umas 09h30 com as reservas, e cada parte do fluxo
   tem limite de 5 horas. Mais de 5 a 10 bairros pede rever as partes do `coleta.yml`.
7. O bairro novo começa sem histórico; o índice dele só compara a partir do primeiro dia coletado.

**Mais produtos.** O Theo decidiu que a cesta fica com 100: produto fraco é trocado, não somado. Para trocar ou, se ele
mudar de ideia, somar:
1. Linha em `data/produtos.csv` (marca e tamanho fixos, `compara_por`, `entra_no_indice`).
2. O link do produto em cada uma das 10 redes em `data/links.csv`, com o `status` certo (ver `data/LEIAME.md`). Achar
   os links é o trabalho grande: sitemap ou busca do próprio site, página por página, respeitando o robots.txt.
3. O subitem do IPCA em `SUBITEM` de `tools/baixar_ibge.py`, e rodar o script.
4. Regra: o produto tem que existir em pelo menos 8 das 10 redes.

**Mais redes.**
1. Ler o robots.txt e os termos de uso antes de tudo. Se os termos pedirem autorização, escrever o e-mail (o Theo
   prefere redes que não pedem).
2. Uma classe nova em `coletor/coletar.py`, no molde da rede mais parecida (por CEP, por loja ou preço único), e
   entrar em `REDES`.
3. Linha em `data/redes.csv` e os 100 links em `data/links.csv`.
4. Liberar o site da rede no ambiente da nuvem, para testar.
5. Testar numa cópia com `--limite` e `--redes`, depois rodar o fluxo `coleta.yml` só para ela.
6. Atualizar a tabela de redes e os textos da página Método.

## 13. Lançamento: imagem de prévia, 404 e compartilhar (23/11/2026)

- **Imagem de prévia:** `assets/og.png` (1200 x 630), citada nas meta tags `og:` e `twitter:` de todas as páginas. A fonte da imagem é
  `docs/og-fonte.html`. Para refazer: no Chrome sem janela,
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=4000 --allow-file-access-from-files --screenshot=assets/og.png file://$PWD/docs/og-fonte.html`.
  As meta tags usam o endereço `https://theoscala45.github.io/preco-do-dia-a-dia/`; se um dia houver domínio próprio, trocar nas páginas.
- **404:** `404.html` na raiz (o GitHub Pages usa esse arquivo para endereços que não existem). Ela define um `<base>` por script, que vale
  `/preco-do-dia-a-dia/` no GitHub Pages e `/` em outros lugares, para os caminhos funcionarem em qualquer endereço errado.
- **Compartilhar e salvar como foto:** `assets/js/compartilhar.js`. A imagem (1080 x 1350) é desenhada num canvas no navegador, sem servidor.
  No celular abre o menu de compartilhar do sistema; no computador copia o texto com o link ou baixa o PNG. Botões no resultado do CEP
  (início) e no resultado da lista.

## 14. Novo nome: Preço Aberto (23/11/2026)

O projeto passou de "O Preço do Dia a Dia" para **Preço Aberto** (escolha do Theo). Domínios conferidos em 23/11/2026 nos cadastros oficiais
(Registro.br e Verisign): `precoaberto.com.br` e `precoaberto.com` estavam livres. Nada com esse nome na busca da web; o mais parecido é o
"Prato Aberto" (cardápios das escolas municipais de SP), de outra área. Ainda falta consultar a marca no INPI e as redes sociais.
- O nome mudou no site, nos textos, na imagem de prévia, na imagem de compartilhar e nos documentos.
- O **endereço** continua `theoscala45.github.io/preco-do-dia-a-dia` e o repositório continua com o nome antigo: renomear o repositório mudaria o
  endereço do site e quebraria o link que o cron-job.org chama toda noite. Fazer isso junto com um domínio próprio.
- O documento "O Preço do Dia a Dia: lista técnica" (Google Docs, fora do repositório) continua com o nome antigo.

## 15. Logo e endereço (23/11/2026)
- Logo escolhido pelo Theo: a cesta (opção D). Arquivos em `assets/logo/` (`cesta.svg`, `cesta-escuro.svg`, `icone.svg`, `apple-touch-icon.png`). As folhas de opções ficam em `docs/logo/` (não versionadas).
- Decisão: o endereço e o repositório continuam `preco-do-dia-a-dia` até o Theo registrar o domínio próprio (ex.: precoaberto.com.br). Trocar só uma vez, junto com o domínio. Ao trocar: renomear o repositório, atualizar o link do cron-job.org, o `<base>` do 404.html, `assets/js/compartilhar.js`, `coletor/coletar.py`, `tools/*.py`, `agente/casar.py`, `CLAUDE.md` e os links do rodapé (GitHub).

## 16. TechText na página Sobre (24/11/2026)
- Componente `TechText` do React Bits (nome em linhas tracejadas sob o cursor), convertido de React para JS puro: `assets/js/techtext.js` (função `criarTechText`). CSS no fim de `assets/css/etiqueta.css`. Usado só em `sobre.html` (`assets/js/sobre-nome.js`, faixa `#techNome`).

## 17. Seletor elástico no gráfico (24/11/2026)
- `RubberSegment` do React Bits convertido para JS puro: `assets/js/segmento.js` (`segmentoElastico`; as molas são calculadas ali, sem a biblioteca motion). Usado no seletor "Meu bairro / Por zona / Por renda" de `inflacao.html`; avisa a mudança pelo evento `segmento`. CSS no fim de `assets/css/etiqueta.css`.

## 18. CEP em caixinhas na página inicial (24/11/2026)
- `CodeSlots` do React Bits convertido para JS puro: `assets/js/codigo.js` (`criarCodigo`; molas calculadas ali). Usado só no CEP da página inicial (`main.js`): 8 caixas com o hífen depois da 5ª; o `#cep` de verdade continua no HTML (escondido com `.cep-oculto`) e guarda o valor, então `ligarCep` e o CEP salvo funcionam como antes. Acerto mostra a faixa com ✓ por ~1,3 s; CEP completo fora da capital faz os números afundarem e a mensagem de erro continua na tela. Lista e Inflação ainda usam o campo de texto comum.
- (24/11/2026) O CEP em caixinhas agora também está na Sua lista. A ligação ficou em `assets/js/cep-caixas.js` (`caixasDoCep`), usada por `main.js` e `lista.js`. Na Sua lista o botão Trocar desce para a linha de baixo (`.editor .cep-linha{flex-wrap:wrap}`). Inflação por bairro também usa (o botão Ver desce para a linha de baixo).
- (24/11/2026) Espera de 10 s só na festa do CEP certo (faíscas, anel, ✓): `espera` em `assets/js/cep-caixas.js`. O balanço do botão e os números que afundam quando o CEP é inválido acontecem em todo clique, sem espera. O CEP é conferido sempre.

## 19. Placar de letras em "Quanto cada lugar cobra" (antes "Quem cobra menos") (24/11/2026)
- `SplitFlapText` do React Bits convertido para JS puro: `assets/js/placar.js` (`criarPlacar`, aceita várias linhas que trocam juntas). CSS do componente no fim de `assets/css/etiqueta.css`. Usado só na seção `#hoje` de `index.html` (`#placar`, montado em `main.js`): linha 1 = bairro, linha 2 = preço da cesta, em ordem do mais barato ao mais caro. Só gira quando está na tela.
- Por que o preço e não o mercado mais barato: nos dados de prévia o Atacadão é o mais barato em 24 dos 25 bairros, então o placar repetiria o mesmo nome. Se isso mudar com os dados reais, dá para trocar a segunda linha.

## 20. Títulos que entram desfocados, palavra por palavra (24/11/2026)
- `BlurText` do React Bits convertido para JS puro: `assets/js/desfoque.js` (`desfocarFrases`, chamada em `iniciar()` de `base.js`). Vale para todo `[data-titulo]` (os títulos grandes, h1 e os h2 de seção), no lugar da subida linha por linha com SplitText. Roda toda vez que o título aparece na tela e volta ao início ao sair; no celular o desfoque é mais leve. As frases de apoio (`.lide`) ficaram com a entrada antiga (`data-surge`).
- O efeito de mouse do TechText na página Sobre foi tirado (arquivos `techtext.js` e `sobre-nome.js` apagados). O nome grande "Preço Aberto" que ficou parado depois foi tirado também.
- (24/11/2026) Os subtítulos (`.lide`, marcados com `data-subtitulo`) sobem linha por linha de trás de uma máscara (`subirTitulo` em `base.js`), com um pequeno atraso para vir depois do título. O desfoque dos títulos ficou mais rápido (0,65 s por palavra, 0,07 s entre palavras).
- (24/11/2026) Corrigido o título e o formulário um em cima do outro ao clicar em "Ver a cidade toda" com a página rolada: o botão agora volta ao topo antes da transição (o texto da abertura é ligado ao scroll) e os gatilhos de scroll são recalculados depois que o layout da abertura volta (`main.js`, handler de `#voltar`).
- (24/11/2026) Desfoque dos títulos: ficou em 0,65 s por palavra, 0,07 s entre palavras e 0,05 s de espera (`desfoque.js`). Uma versão mais rápida (0,5 / 0,05 / 0,03) foi testada e o Theo achou rápida demais.
- (24/11/2026) O seletor elástico (`segmento.js`) também está no filtro de grupos da página Produtos (`#pGrupos`, dentro de `.abas-rolagem`, que rola de lado em tela estreita). São os dois únicos grupos de abas do site; o resto são seletores nativos (como o de bairro) ou botões comuns.
- (24/11/2026) O título da página inicial (`data-junto`) não usa o desfoque palavra por palavra: entra inteiro, com todas as palavras juntas, saindo do desfoque, subindo um pouco e assentando (`desfocarJunto` em `desfoque.js`). Os outros títulos continuam palavra por palavra.
- (24/11/2026) O seletor elástico ficou mais rápido (`VELOCIDADE = 1.55` em `segmento.js`; já foi 1, depois 1.25): o esticar, a espera até o destaque se juntar e a mola de chegada encurtam juntos.
- (24/11/2026) A linha laranja do menu do topo usa o mesmo esticar-e-juntar do seletor elástico: `assets/js/mola.js` (`esticarBordas`), chamada em `iniciar()` de `base.js`. Como cada página é um arquivo, a animação acontece ao abrir a página nova, partindo do lugar da linha na página anterior (guardado em `sessionStorage`). Velocidade 1,55, a mesma do seletor.
- (24/11/2026) Corrigido o título da página inicial que sumia depois de um segundo: o `desfocarJunto` animava o próprio h1, que também é movido pelo scroll da abertura (`.abre > *`), e as duas animações brigavam. Agora anima um invólucro por dentro do título (`.junto`).
- (24/11/2026) Todo `import ... from './base.js'` agora leva `?v=` (e os scripts de página nos HTML também). Antes, o `base.js` ficava sem versão e o navegador podia usar uma cópia velha por até 10 minutos, o que fazia a correção do título que some demorar a aparecer. Ao mudar `base.js`, troque o `?v=` em todos os arquivos que o importam (um `grep -rn "base.js?v" assets/js` mostra todos).
- (24/11/2026) O cabeçalho (`.topo`) agora tem sempre o fundo de vidro translúcido (branco 38% com desfoque; já foi 62%, o Theo pediu mais transparente) e a linha embaixo, também no topo da página, em vez de só depois de rolar. A classe `rolou` continua, mas a aparência é a mesma (`etiqueta.css`).
- (24/11/2026) Produtos, aba "Todos": aparecem só os 5 primeiros de cada grupo (`POR_GRUPO` em `produtos.js`), com o botão "Ver os N produtos de ..." no fim de cada grupo, que escolhe o grupo no seletor. Escolhendo um grupo ou buscando, a lista continua completa.
- Página inicial, "Ver a cidade toda": o formulário do CEP não desliza mais por cima do título que cresce (some e volta no lugar); os gatilhos do scroll são medidos de novo depois das duas transições.
- Título da página inicial: efeito VariableProximity (React Bits) em JavaScript puro, `assets/js/proximidade.js`. Cada letra vai de peso 800 a 380 conforme a distância do mouse/dedo (raio 150 px); quebras de linha travadas no peso de repouso; desligado com movimento reduzido. Ligado em base.js para `[data-junto] .junto`.
- Título inicial (proximidade): cada letra mantém a largura do peso de repouso (o texto não balança) e o peso vai de 800 a 560, mais suave.
- Título inicial (proximidade): agora engorda perto do mouse (peso 800 a 900 mais contorno fino de 0,03em), sem afinar.
- Título inicial (proximidade): repouso em peso 560 e perto do mouse vai a 900 com contorno de 0,025em (como no exemplo do React Bits); largura das letras livre.
- Título inicial (proximidade): efeito mais suave, peso até 800 e contorno de 0,01em.
- Título inicial (proximidade): usa font-weight (não font-variation-settings) com a fonte do título herdada; repouso 680, perto do mouse 860 e contorno de 0,008em.
- Título inicial (proximidade): corrigido o efeito que não acontecia. A medição das quebras de linha reiniciava o peso das letras a cada mudança de largura do título; agora ela observa a seção (largura fixa) e devolve os pesos depois de medir.
- Título inicial (proximidade): intensidade menor, peso até 800 e contorno de 0,006em.
- Ideia para o futuro (não está no site): ao escolher o CEP, a câmera mergulha no bairro, o distrito pisca em laranja e sobe do chão e só depois seguem as rotas. Foi feita e desfeita em 25/11/2026; o código está no commit 6ea413d (camada 'bairro-foco' em mapa.js).
- Sua lista: o botão Compartilhar agora manda um link com os itens (lista.html?l=P001,P002,...). Quem abre soma os itens à própria lista, sem apagar o que tinha, e vê um aviso. O bairro e o CEP não vão no link.
- Sua lista, Salvar como foto: a imagem agora mostra a lista da pessoa (item, marca, tamanho e preço na loja mais barata) e o total, no lugar do ranking de lojas (desenharLista em compartilhar.js). Até 15 linhas; acima disso aparece 'e mais N itens'.
- Sua lista: total na foto centralizado na vertical da faixa laranja; aviso na página ('Salve a lista como foto no celular...') abaixo dos botões.
- Sua lista: o aviso da foto fica dentro da linha dos botões (espaço menor).
- Páginas internas (.pagina): menos espaço entre o cabeçalho e o título e entre o título e os cartões (etiqueta.css, no fim), para ver mais ao entrar. No celular vale o espaço do celular.css.
- Celular (até 860 px ou toque): os cards e as revelações ao rolar entram mais rápido e um pouco antes de chegar à tela (cards.js e base.js). No computador não mudou.
- Menu do celular: o marca-texto laranja virou um só (.menu-marca em base.js): desenha-se sob a página atual ao abrir e desliza até o link tocado; ao tocar noutra página ele chega nela e a página troca 280 ms depois.
- Celular: sem a caixa cinza do iOS ao tocar (tap-highlight transparente e texto de botões e links não selecionável, no fim de etiqueta.css). Botão Menu/Fechar: o rótulo rola e o botão afunda ao tocar; a folha do menu desce como uma cortina (clip-path) e fecha mais rápido (timeScale 1,7).
- O nome 'Sua lista' virou 'Minha lista' em todo o site (menu, títulos, textos, avisos). Em textos corridos de explicação ficou 'a lista'.
- Início no celular (celular.css): primeira tela com título, CEP e botão visíveis sem rolar (a abertura começa em 27svh e o mapa fica numa faixa curta em cima); cada cartão do mapa (.cap) sobe de baixo e fica preso no pé da tela (sticky) enquanto o mapa muda em cima. Mapa: na cena 0 o enquadramento reserva 68% da altura embaixo (mapa.js). Pendente: o estado com resultado do CEP no celular (o cartão do bairro fica abaixo da dobra e o mapa fica numa faixa pequena).
- Celular, início (decisão do Theo em 25/11/2026): mapa só para olhar (sem arrastar nem zoom); ao enviar o CEP somem o título, a frase, o CEP, o botão e a etiqueta e ficam o mapa em cima e a lista embaixo (.com-resultado em celular.css; ramos 'movel' em main.js); ao rolar, cada cartão do mapa tem 170svh de rolagem (mais tempo para olhar o mapa) e as entradas voltaram ao ritmo normal (a versão rápida do celular foi desfeita). O computador não mudou.
- Celular, fluidez e mapa (25/11/2026): no resultado do CEP o mapa fica sem inclinação e centrado no bairro (caixa espelhada em volta da origem, faixa de mapa acima da lista) e aceita arrastar e pinça (mapa.gestos); fora do resultado a página rola por cima do mapa. Para a rolagem ficar leve no celular: sem animações presas à rolagem (abertura, barra de progresso, riscos, gráfico desenha uma vez), sem o efeito de peso no título, sem a luz correndo na rota, e o mapa com no máximo 1,5 pixel por ponto.
- Celular: todos os mapas começam só para olhar (o dedo rola a página por cima: Inflação por bairro e Minha lista também); só o mapa do resultado do CEP no início aceita arrastar e pinça.
- Celular: os mapas não recebem toque (.maplibregl-map pointer-events:none em celular.css), então a rolagem é a nativa e não trava em cima do mapa; só o mapa do resultado do CEP recebe (.com-resultado #mapa). A câmera da cidade troca de cena sem voo (duração 0) e a entrada no bairro dura 0,9 s. Efeito colateral: na Inflação por bairro, no celular, o bairro se escolhe pela lista, não tocando no mapa.
- Celular, resultado do CEP: deslizar na vertical sobre o mapa rola a página (touch-action pan-y); para os lados move o mapa; dois dedos aproximam.
- Celular, capítulos do início (25/11/2026, a página travava): o mapa ao vivo é fotografado uma vez por cena (cidade, pontos, inflação; preserveDrawingBuffer só no celular) e a rolagem só troca as fotos com um esmaecer; o mapa ao vivo volta só no resultado do CEP (aoVivo em mapa.js). Se a foto falhar, segue ao vivo. Cada cartão tem uma só animação de entrada.
- Celular: nos capítulos, a seção .cap inteira recebe o toque (pointer-events:auto), então o dedo em cima do mapa rola a página; na abertura e no resultado do CEP segue como antes.
- Celular, rolagem sobre o mapa nos capítulos (de novo, 25/11/2026): depois das fotos o mapa ao vivo sai da página (#mapa.guardado = display:none), porque no iPhone a área dele segurava a rolagem mesmo invisível; o palco do mapa não recebe toque (.palco pointer-events:none). Com o resultado do CEP, o mapa ao vivo só aparece na abertura; ao rolar para os capítulos voltam as fotos.
- Celular, capítulos do início (25/11/2026, terceira tentativa, agora sem nada preso atrás): o palco do mapa deixou de ser 'sticky' no celular e rola junto com a abertura; cada capítulo ganhou a foto do mapa (img.cap-foto, recorte 100 x 86) em cima do cartão, no fluxo da página. As fotos são tiradas do mapa ao vivo ao abrir (encaixar() mede o contorno dos distritos na tela para a cidade caber mesmo com o mapa inclinado). Testado com toque simulado num Chrome de celular: o dedo em cima da foto rola a página. O mapa do resultado do CEP segue arrastável (o dedo nele move o mapa, não a página), como o Theo pediu.
- Celular, mapa que sumia (25/11/2026): o aviso de 'mudou de tamanho' (barra do iPhone aparecendo e sumindo) fazia o site refazer as fotos com o mapa já fora da página; a foto falhava e o código apagava todas as fotos e deixava o mapa escondido. Agora: refaz só se a largura da janela mudar (girar o celular), põe o mapa de volta na página antes de fotografar, e nunca apaga foto. Fotos fixas em assets/mapa/celular-{cidade,pontos,inflacao}.jpg já vêm no HTML e aparecem na hora; o mapa ao vivo troca por fotos do dia quando carrega. Para gerar de novo as fixas: abrir a página como celular (390 x 844) e salvar as fotos que ela tira.
- Celular (até 860 px), 25/11/2026, pedido do Theo: os capítulos do início não têm mais mapa (fotos tiradas; textos dos cartões com versão do celular via .so-largo/.so-estreito) e a rolagem ficou sem nenhuma entrada animada: títulos, blocos, cartões, linhas, números, etiquetas da faixa, barras e o gráfico já aparecem no lugar (base.js e main.js, 'leve'/'celularLeve'). Ficou só a entrada da abertura. O computador segue com tudo.
- Celular, primeira rolagem que parava (26/11/2026): quando a barra do navegador some na primeira rolagem, a página recalculava as posições do scroll (ScrollTrigger.refresh, chamado pela medida do primeiro capítulo e pelos eventos de fim de carga) e o iPhone perdia o embalo. No celular: a medida do capítulo não roda, o ScrollTrigger não remede no 'load' nem ao mudar a altura, e o refresh das fontes só acontece se a pessoa ainda não rolou.
