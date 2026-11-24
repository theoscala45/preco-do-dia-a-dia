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
