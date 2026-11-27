// Página "Minha lista": loja única mais barata, economia, trocas por produtos mais baratos, rota e tabela por produto.
import { $, gsap, ScrollTrigger, calmo, reais, curto, rolar, carregar, guarda, ligarCep, iniciar, PREVIA, semAcento } from './base.js?v=20261126a';
import { caixasDoCep } from './cep-caixas.js?v=20261124z';
import { criarLista, calcular, ligarBusca, ligarItens, trocas } from './cesta.js?v=20261127d';
import { aoAparecer } from './aparecer.js';
import { compartilhar, salvarFoto, desenharLista, toast, SITE } from './compartilhar.js?v=20261127c';
let gatilhoRanking = null, ultimo = null, trocasAtuais = [];

const [dados, geo, rotas] = await carregar('dados', 'geo', 'rotas');
iniciar(dados);

const lista = criarLista(dados);
// link recebido (lista.html?l=id,id,...): os itens entram na lista da pessoa, sem apagar o que ela já tinha
{
  const url = new URL(location.href), recebidos = (url.searchParams.get('l') || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 120);
  if (recebidos.length) {
    const n = lista.somar(recebidos);
    url.searchParams.delete('l'); history.replaceState(null, '', url);
    setTimeout(() => toast(n ? `${plural(n, 'item entrou', 'itens entraram')} na minha lista, vindos do link` : 'Esses itens já estavam na minha lista'), 600);
  }
}
const nomes = dados.redes.map(r => r.nome.replace(' Atacado', ''));
const estado = { ponto: 0, cepDado: false };
const salvo = guarda.ler('ponto', -1);
if (salvo >= 0 && salvo < geo.pontos.length) { estado.ponto = salvo; estado.cepDado = true; }
$('cep').value = guarda.ler('cep', '');

const rotaDe = k => rotas.pontos.find(p => p.id === geo.pontos[estado.ponto].id)?.redes[dados.redes[k].id];
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// ---------- mapa da rota até a loja (aparece quando o cartão entra na tela)
let mapaRota = null;
try {
  const { criarMapaDeRota } = await import('./mapa-rota.js?v=20261126g');
  mapaRota = criarMapaDeRota($('mapaRota'), geo, rotas, { calmo });
} catch (erro) {
  console.warn('Mapa indisponível neste navegador.', erro);
  document.querySelector('.mapa-cartao').hidden = true;
}

function desenhar() {
  const tem = lista.itens.length > 0, pt = geo.pontos[estado.ponto];
  $('contagem').textContent = tem ? plural(lista.itens.length, 'item', 'itens') : '';
  $('ptRotulo').textContent = `bairro ${curto(pt.bairro)}`;
  $('cestaPonto').textContent = estado.cepDado
    ? `Preços do bairro ${curto(pt.bairro)}.`
    : `Sem CEP, a conta usa ${curto(pt.bairro)}. Digite seu CEP para trocar.`;
  $('vazio').hidden = tem;
  $('cheio').hidden = !tem;
  $('limpar').hidden = !tem;
  if (!tem) return;

  const { porRede, melhor, pior, completas } = calcular(dados, lista.itens, estado.ponto);
  ultimo = { porRede, melhor, itens: lista.itens.length, bairro: curto(pt.bairro), produtos: lista.itens.map((i, n) => ({ nome: dados.produtos[i].nome, tam: `${dados.produtos[i].marca}, ${dados.produtos[i].tam}`, v: melhor.v[n] })) };   // o que os botões de compartilhar usam

  // loja única
  $('vNome').textContent = melhor.rede.nome;
  rolar($('vInt'), $('vCent'), melhor.total);
  $('vFalta').textContent = melhor.faltam ? `${plural(melhor.faltam, 'item indisponível', 'itens indisponíveis')} nesta rede. O total não conta com ${melhor.faltam > 1 ? 'eles' : 'ele'}.` : '';
  $('vEco').innerHTML = completas.length > 1 && pior.total > melhor.total
    ? `<b>${reais(pior.total - melhor.total)} a menos</b><span>${pior.rede.nome} cobra ${reais(pior.total)}</span>`
    : '<span>Nenhuma outra rede tem os mesmos itens para comparar</span>';
  const rota = rotaDe(melhor.k), loja = rota && rotas.lojas[rota.loja];
  $('vLoja').innerHTML = rota ? `<b>${rota.km.toLocaleString('pt-BR')} km de carro</b><span>${loja.end || loja.nome}</span>` : '<span>Sem loja no mapa</span>';
  $('vPonto').innerHTML = `<b>${curto(pt.bairro)}</b><span>${pt.rua}, ${pt.cep}</span>`;

  // trocas que baixam a conta (na loja única mais barata)
  desenharTrocas(melhor);

  // total em cada rede
  const maior = Math.max(...porRede.map(r => r.total));
  $('ranking').innerHTML = porRede.map(r => {
    const inteira = r.faltam === melhor.faltam;
    return `<li${inteira ? '' : ' class="parcial"'}><span>${r.rede.nome}</span><span class="barra"><i data-v="${(r.total / maior).toFixed(3)}"></i></span><span class="val">${reais(r.total)}${r.faltam ? `<small>${plural(r.faltam, 'falta', 'faltam')}</small>` : ''}</span></li>`;
  }).join('');
  const barras = gsap.utils.toArray('#ranking i');
  if (calmo) gsap.set(barras, { scaleX: (k, el) => +el.dataset.v });
  else {
    gsap.fromTo(barras, { scaleX: 0 }, { scaleX: (k, el) => +el.dataset.v, duration: 0.9, ease: 'power3.out', stagger: 0.05, overwrite: true });
    // e de novo toda vez que o ranking volta a entrar na tela (as barras são lidas na hora, então valem para a lista de agora)
    if (!gatilhoRanking) {
      const cresce = () => gsap.to('#ranking i', { scaleX: (k, el) => +el.dataset.v, duration: 0.9, ease: 'power3.out', stagger: 0.05, overwrite: true });
      const zera = () => gsap.set('#ranking i', { scaleX: 0, overwrite: true });
      gatilhoRanking = aoAparecer($('ranking'), cresce, zera, { margem: '0px 0px -12% 0px' });
    }
  }

  // produto por produto, na ordem das redes do total
  const ordem = porRede.map(r => r.k);
  const linhas = lista.itens.map((i, q) => {
    const p = dados.produtos[i], v = ordem.map(k => porRede.find(r => r.k === k).v[q]), menor = Math.min(...v.filter(x => x != null));
    return `<tr><th scope="row"><a class="nome-link" href="produto.html?p=${p.id}${PREVIA ? '&previa' : ''}">${p.nome}</a><small>${p.marca}, ${p.tam}</small></th>${v.map(x => (x == null ? '<td class="sem" title="indisponível nesta rede">—<span class="so-leitor">indisponível nesta rede</span></td>' : `<td${x === menor ? ' class="menor"' : ''}>${reais(x).replace('R$', '').trim()}</td>`)).join('')}</tr>`;
  }).join('');
  $('tabela').innerHTML = `<thead><tr><th scope="col">Produto</th>${ordem.map((k, c) => `<th scope="col"${c ? '' : ' class="menor"'}>${nomes[k]}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody>
    <tfoot><tr><th scope="row">Total</th>${porRede.map((r, c) => `<td${c ? '' : ' class="menor"'}>${reais(r.total).replace('R$', '').trim()}${r.faltam ? `<small>${plural(r.faltam, 'falta', 'faltam')}</small>` : ''}</td>`).join('')}</tr></tfoot>`;

  // mapa: o caminho até a loja única mais barata
  if (mapaRota) {
    const mostra = [{ k: melhor.k, nome: nomes[melhor.k] }];
    const feitas = mapaRota.mostrar(estado.ponto, mostra.map(m => ({ ...m, id: dados.redes[m.k].id })));
    $('mapaNota').textContent = feitas
      ? `Caminho de carro do bairro até a loja mais perto ${mostra.length > 1 ? 'de cada rede. Em laranja, a loja única mais barata' : `do ${melhor.rede.nome}`}.`
      : 'Não há loja dessa rede no mapa perto deste bairro.';
  }
  if (!matchMedia('(max-width: 860px)').matches || scrollY < 2) ScrollTrigger.refresh();   // no celular, remedir no meio da rolagem fazia a página parar
}

ligarBusca(dados, lista, $('busca'), $('sugestoes'));
ligarItens(dados, lista, $('itens'));
lista.aoMudar(desenhar);
$('basica').addEventListener('click', () => lista.basica());
$('basica2').addEventListener('click', () => lista.basica());
$('limpar').addEventListener('click', () => lista.limpar());
ligarCep(geo, $('cepForm'), $('cep'), $('cepMsg'), i => { estado.ponto = i; estado.cepDado = true; desenhar(); });
caixasDoCep({ form: $('cepForm'), campo: $('cep'), msg: $('cepMsg') });
desenhar();

// ---------- trocas que baixam a conta: um produto parecido da cesta, mais barato na mesma loja
function desenharTrocas(melhor) {
  trocasAtuais = trocas(dados, lista.itens, melhor.k, estado.ponto);
  const nome = nomes[melhor.k], soma = trocasAtuais.reduce((t, x) => t + (x.economia || 0), 0);
  const tem = trocasAtuais.length > 0;
  $('tTitulo').textContent = !tem ? 'Não tem trocas' : soma > 0 ? `Troque e pague ${reais(soma)} a menos` : 'Troque e ache tudo no ' + nome;
  $('tNota').textContent = !tem ? 'Esta já é a lista mais barata.' : `Produtos parecidos, mais baratos no ${nome}.`;
  $('tLista').innerHTML = trocasAtuais.map(({ i, j, economia }) => {
    const de = dados.produtos[i], para = dados.produtos[j];
    const qual = de.nome === para.nome ? `${para.marca} no lugar de ${de.marca}` : `${para.nome} no lugar de ${de.nome.toLowerCase()}`;
    return `<li><span class="t-nome">${qual}</span><span class="t-eco">${economia == null ? `o ${nome} não tem` : `${reais(economia)} a menos`}</span>`
      + `<button type="button" class="quieto" data-i="${i}" data-j="${j}">Trocar</button></li>`;
  }).join('');
  $('tLista').hidden = !tem;
  $('tTodas').hidden = trocasAtuais.length < 2;
}
// Animação da troca: o botão vira "Trocado", o valor economizado sobe da linha, a linha fecha e só então a troca acontece;
// na lista da esquerda, o produto novo entra no lugar do antigo e pisca em laranja. O total rola até o valor novo.
function animarTroca(linhas, aoFim) {
  if (calmo || !linhas.length) { aoFim(); return; }
  linhas.forEach(li => li.querySelector('button')?.setAttribute('disabled', ''));
  const tl = gsap.timeline({ onComplete: aoFim });
  linhas.forEach((li, n) => {
    const b = li.querySelector('button'), eco = li.querySelector('.t-eco'), t = n * 0.08;
    tl.add(() => { b.textContent = 'Trocado'; b.classList.add('feito'); li.classList.add('saindo'); }, t)
      .fromTo(b, { scale: 0.88 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }, t);
    if (eco && /a menos/.test(eco.textContent)) {
      const r = eco.getBoundingClientRect(), voa = document.createElement('span');
      voa.className = 'eco-voa'; voa.textContent = '−' + eco.textContent.replace(' a menos', '');
      voa.style.left = r.left + 'px'; voa.style.top = r.top + 'px';
      tl.add(() => document.body.append(voa), t)
        .fromTo(voa, { y: 0, autoAlpha: 1, scale: 1 }, { y: -46, autoAlpha: 0, scale: 1.15, duration: 0.9, ease: 'power2.out', onComplete: () => voa.remove() }, t + 0.05);
    }
    tl.to(li, { height: 0, paddingTop: 0, paddingBottom: 0, autoAlpha: 0, x: 18, duration: 0.38, ease: 'power3.in' }, t + 0.42);
  });
}
function piscarNovos(js) {
  if (calmo) return;
  js.forEach(j => { const li = $('itens').querySelector(`li[data-i="${j}"]`); if (li) { li.classList.remove('trocado'); void li.offsetWidth; li.classList.add('trocado'); } });
}
$('tLista').addEventListener('click', e => {
  const b = e.target.closest('button[data-i]');
  if (!b || b.disabled) return;
  const i = +b.dataset.i, j = +b.dataset.j;
  animarTroca([b.closest('li')], () => { lista.trocar(i, j); piscarNovos([j]); });
});
$('tTodas').addEventListener('click', () => {
  const todas = trocasAtuais.slice();
  animarTroca([...$('tLista').children], () => { todas.forEach(({ i, j }) => lista.trocar(i, j)); piscarNovos(todas.map(x => x.j)); });
});

// ---------- compartilhar a lista e salvar como foto
$('vCompartilhar')?.addEventListener('click', () => {
  if (!ultimo) return;
  const { melhor, itens, bairro } = ultimo;
  compartilhar({ titulo: 'Minha lista de compras', url: `${SITE}lista.html?l=${lista.ids().join(',')}`, texto: `Minha lista de ${itens} ${itens === 1 ? 'item' : 'itens'} sai por ${reais(melhor.total)} no ${melhor.rede.nome.replace(' Atacado', '')} (${bairro}). Compare a sua:` });
});
$('vFoto')?.addEventListener('click', () => {
  if (!ultimo) return;
  const { melhor, itens, bairro, produtos } = ultimo;
  const dia = new Date(dados.datas.at(-1) + 'T12:00').toLocaleDateString('pt-BR');
  salvarFoto({
    titulo: 'Minha lista', subtitulo: `${itens} ${itens === 1 ? 'item' : 'itens'}  ·  ${bairro}  ·  preços de ${dia}`,
    loja: nomes[melhor.k], total: reais(melhor.total),
    itens: produtos.map(p => ({ nome: p.nome, tam: p.tam, valor: p.v == null ? null : reais(p.v) })),
    rodape: melhor.faltam ? `${melhor.faltam} ${melhor.faltam === 1 ? 'item' : 'itens'} sem preço nesta rede` : `Preços no ${nomes[melhor.k]}`,
  }, `minha-lista-${semAcento(bairro).replace(/[^a-z0-9]+/g, '-')}.png`, desenharLista);
});
