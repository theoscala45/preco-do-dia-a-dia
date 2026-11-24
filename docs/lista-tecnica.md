# Preço Aberto: lista técnica

Cópia do documento "Preço Aberto: lista técnica" (Claude Docs, 19/11/2026), atualizada em 23/11/2026, para
que ele continue junto do projeto em qualquer conta.

## Resumo

A coleta roda sozinha toda noite, nas redes e nos 25 bairros. Para lançar, falta o trabalho no site. O custo hoje é
zero.

O plano combinado:

1. Primeira coleta com as 9 redes (19/11). Feito; o Mambo entrou depois como 10ª rede.
2. O Theo trabalha o visual do site pelo Claude Code. O Claude faz as edições e cuida para não mexer no que a coleta
   grava (`data/precos`, `data/execucoes.csv`, `assets/dados.json`, `assets/dados-previa.json`). Durante o trabalho,
   olhar também a prévia com os dados reais (endereço com `?previa`). Em andamento.
3. Com o visual pronto, o Claude ajusta os textos do site para os dados reais ("12 meses", "mês a mês", a faixa do topo).
4. O Claude liga os preços reais (`dados=real` em `data/site.txt`).
5. O Theo faz os últimos ajustes no visual e o site é lançado.
6. Os meses de dados vão se juntando sozinhos. O índice começa a dizer algo em semanas, e "em 12 meses" só vale a
   partir de novembro de 2027.

O que já roda sozinho:

| Quando | O quê |
| --- | --- |
| Toda noite, 02h17 (reservas 05h17, 08h43 e 12h43) | Coleta das redes, site montado e publicado, aviso "Falha na coleta" só se algo importante der errado |
| Todo dia, 02h17, pelo cron-job.org | Dispara a coleta caso o horário do próprio GitHub falhe |
| Todo mês, dias 8 a 14 | IPCA e pesos do IBGE atualizados; site montado e publicado se mudar |
| Toda segunda | Revisão dos links; aviso "Links para revisar" quando um produto some |
| Ao salvar `data/site.txt` | Site montado e publicado de novo |

## GitHub

Tudo roda no GitHub, de graça, porque o repositório `theoscala45/preco-do-dia-a-dia` é público. Ele precisa continuar
público: se virar privado, a cota grátis de horas acaba em poucos dias.

- [x] Verificação em duas etapas na conta do GitHub.
- [x] E-mails de issues ligados, para receber "Falha na coleta" e "Links para revisar".

Bom saber: o GitHub pausa coletas agendadas de projetos parados há 60 dias. Os commits que a coleta faz toda noite
mantêm o projeto ativo. Se um dia pausar mesmo assim, chega um e-mail; é só clicar em "Enable".

## Publicar o site

O site já está no ar, de graça, pelo GitHub Pages: https://theoscala45.github.io/preco-do-dia-a-dia/ . Ele se
republica sozinho depois de cada coleta.

Antes do lançamento, o Claude faz:

- [ ] Imagem de prévia que aparece quando alguém compartilha o link (WhatsApp, Instagram).
- [x] Ícone da aba do navegador.
- [ ] Página de erro (404).
- [ ] Teste no celular, em todas as páginas.
- [ ] Textos do site para dados reais.
- [ ] Ligar os preços reais.

## Domínio próprio (opcional)

Um endereço como `precododiaadia.com.br` custa por volta de R$ 40 por ano no registro.br. Sem ele, o site continua no
endereço do GitHub, de graça.

- O registro pede CPF. Talvez um adulto responsável precise registrar no nome dele.
- Depois da compra, o Claude configura o domínio no GitHub Pages (com HTTPS). O Theo só dá acesso ao painel do
  domínio, digitando a senha ele mesmo.

## Chaves de API e senhas

O projeto usa uma chave só: a do cron-job.org, que manda o GitHub rodar a coleta todo dia às 02h17 (o horário do
próprio GitHub falhou em 18 e 19/11). O mapa (OpenFreeMap), o IBGE e o OpenStreetMap são grátis e sem cadastro.

- [ ] Renovar a chave `coleta-cron` antes de vencer (por volta de 30/06/2027): criar outra no GitHub (Settings,
  Developer settings, Fine-grained tokens, só Actions em Read and write, só este repositório) e trocar no
  cron-job.org, no header Authorization.

* Se o Carrefour liberar o acesso e mandar usar uma chave, ela fica nos "Secrets" do GitHub, nunca no código.
* O agente de casamento de produtos (`agente/`) precisaria do secret `ANTHROPIC_API_KEY`; hoje não tem.
* Senhas e códigos são sempre digitados pelo Theo, nunca colados no chat.

## Espaço e memória

Os preços coletados somam cerca de 30 MB por mês, em texto. O GitHub aguenta isso por anos.

- Nada a fazer agora.
- Por volta de 2029, compactar os meses antigos.

## Custos

Hoje o custo é zero: GitHub, publicação do site, mapa e dados do IBGE são grátis. O único gasto possível é o domínio,
cerca de R$ 40 por ano, se o Theo quiser um.

## Regras, permissões e privacidade

- [ ] Guardar o e-mail em que a St Marche autorizou o projeto. É a prova da autorização.

* Uma vez por ano, reler as regras dos sites das redes (robots.txt e termos de uso), porque elas mudam.
* Se uma rede pedir para sair, ela sai no mesmo dia.
* O site não coleta dados de quem visita. Para contar visitas um dia, usar uma ferramenta que respeite a privacidade
  (LGPD) e avisar no site.
* Carrefour: o pedido de acesso por CEP foi enviado (veio só uma resposta automática). Quando chegar a resposta, o Theo
  repassa ao Claude.

## Manutenção para sempre

O sistema avisa sozinho quando precisa de alguém. Os avisos chegam por e-mail, como issues do GitHub.

| Aviso | O que significa | O que fazer |
| --- | --- | --- |
| Links para revisar (segunda) | Um produto saiu do site ou mudou de página | Trocar o link; o Theo pode pedir ao Claude |
| Falha na coleta (manhã) | Uma rede mudou o site, bloqueou, ou o mesmo bairro falhou duas noites seguidas | Chamar o Claude para ajustar o coletor |
| Aviso de versão do GitHub | Uma peça do fluxo ficou velha | O Claude atualiza quando for preciso |
