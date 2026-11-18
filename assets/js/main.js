// Página inicial: o mapa, o CEP, as cenas do scroll e a lista de compras.
import { $, gsap, ScrollTrigger, calmo, reais, pct, curto, rolar, carregar, guarda, ligarCep, iniciar, irPara } from './base.js';
import { criarLista, calcular, ligarBusca, ligarItens } from './cesta.js';

const [dados, geo, rotas] = await carregar('dados', 'geo', 'rotas');
iniciar(dados);

const estado = { ponto: 0, cepDado: false };
const nomes = dados.redes.map(r => r.nome.replace(' Atacado', ''));
const cestas = dados.pontos.map(p => p.cesta), vars = dados.pontos.map(p => p.var);
const normal = a => { const mn = Math.min(...a), mx = Math.max(...a); return a.map(v => (v - mn) / (mx - mn || 1)); };
const media = cestas.reduce((s, v) => s + v, 0) / cestas.length;
const n = dados.itens_na_cesta;

$('mediaRotulo').textContent = `Cesta de ${n} itens, média da cidade`;
const iMin = cestas.indexOf(Math.min(...cestas)), iMax = cestas.indexOf(Math.max(...cestas));
$('numLojas').dataset.conta = rotas.lojas.length;
$('minNome').textContent = curto(geo.pontos[iMin].bairro); $('minVal').textContent = reais(cestas[iMin]);
$('maxNome').textContent = curto(geo.pontos[iMax].bairro); $('maxVal').textContent = reais(cestas[iMax]);
rolar($('etqInt'), $('etqCent'), media);

// ---------- as redes em cada ponto: soma dos itens do índice que todas as redes têm ali
const precoEm = (r, i, prod) => { const t = dados.precos[r.id]; return r.por_cep ? t[i][prod] : t[prod]; };
const doIndice = dados.produtos.map((p, k) => (p.indice ? k : -1)).filter(k => k >= 0);
// cada rede é comparada pelos itens do índice que ela vende no ponto: o preço de cada item é dividido pela
// mediana das redes naquele ponto, e a média dessas razões (com o peso do item no IPCA) diz quanto a rede
// cobra acima ou abaixo da mediana. O valor mostrado é a cesta do ponto vezes esse fator.
const mediana = v => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const redesNoPonto = dados.pontos.map((pt, i) => {
  const med = {};
  for (const k of doIndice) {
    const v = dados.redes.map(r => precoEm(r, i, k)).filter(x => x != null);
    if (v.length >= 3) med[k] = mediana(v);   // com menos de 3 redes a mediana não diz muito
  }
  const itens = dados.redes.map(r => doIndice.filter(k => med[k] && precoEm(r, i, k) != null));
  const fatores = dados.redes.map((r, j) => {
    const peso = itens[j].reduce((s, k) => s + (dados.produtos[k].peso ?? 1), 0);
    return peso ? itens[j].reduce((s, k) => s + (dados.produtos[k].peso ?? 1) * precoEm(r, i, k) / med[k], 0) / peso : null;
  });
  const base = pt.cesta || Object.values(med).reduce((s, x) => s + x, 0);
  const totais = fatores.map(f => (f == null ? null : base * f));
  const ordem = totais.map((_, k) => k).filter(k => totais[k] != null).sort((a, b) => totais[a] - totais[b]);
  return { itens: itens.map(x => x.length), fatores, totais, ordem, melhor: ordem[0] };
});
// rota e loja mais próxima de cada rede, por ponto (OpenStreetMap)
const rotaDe = (i, k) => rotas.pontos.find(p => p.id === geo.pontos[i].id)?.redes[dados.redes[k].id];

// ---------- mapa
let mapa = null;
try {
  const { criarMapa } = await import('./mapa.js');
  mapa = criarMapa($('mapa'), geo, rotas, {
    redes: dados.redes.map((r, k) => ({ id: r.id, nome: nomes[k] })),
    var: normal(vars), ordem: i => redesNoPonto[i].ordem, preco: (i, k) => reais(redesNoPonto[i].totais[k]),
  }, { calmo });
} catch (erro) {
  console.warn('Mapa indisponível neste navegador.', erro);
  document.documentElement.classList.add('sem-mapa');
}
mapa?.aoPronto(() => {
  if (calmo) gsap.set('#mapa', { autoAlpha: 1 });
  else gsap.fromTo('#mapa', { autoAlpha: 0, scale: 1.05 }, { autoAlpha: 1, scale: 1, duration: 1.8, ease: 'power2.out', clearProps: 'transform' });
});

const dica = $('dica');
let dicaDe = -2;
mapa?.aoPassar((hover, pt) => {
  if (hover !== dicaDe) {
    dicaDe = hover;
    dica.classList.toggle('on', hover >= 0);
    if (hover >= 0) {
      const p = geo.pontos[hover], d = dados.pontos[hover];
      dica.innerHTML = `<b>${p.bairro}</b>Cesta de ${n} itens: ${reais(d.cesta)}<br>Em 12 meses: ${pct(d.var)}%`;
    }
  }
  if (hover >= 0 && pt) dica.style.transform = `translate(${pt.x + 16}px,calc(${pt.y - 14}px - 100%))`;
});
// quando o mapa decide a rede mais barata, a linha dela na lista responde
mapa?.aoMudar(({ fase }) => {
  if (fase !== 'veredito' || calmo || $('resultado').hidden) return;
  gsap.fromTo('#redesLista .melhor .val', { scale: 1 }, { scale: 1.12, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: '100% 50%' });
});

// ---------- o scroll troca a cena do mapa
const passos = [...document.querySelectorAll('#trilha li')];
const cena = c => { mapa?.cena(c); passos.forEach((li, k) => li.classList.toggle('on', k === c - 1)); };
ScrollTrigger.create({ trigger: '.abre', start: 'top top', end: 'bottom 50%', onToggle: s => s.isActive && cena(0) });
gsap.utils.toArray('.cap').forEach((cap, k) => {
  ScrollTrigger.create({ trigger: cap, start: 'top 50%', end: 'bottom 50%', onToggle: s => s.isActive && cena(k + 1) });
});
ScrollTrigger.create({ trigger: '.cena', start: 'top bottom', end: 'bottom top', onToggle: s => mapa?.ativo(s.isActive) });

// ---------- gráfico: índice local contra o IPCA
const svg = $('grafico'), L = 6, R = 432, T = 16, B = 262;
const series = dados.pontos.map(p => p.serie);
const tudo = [...series.flat(), ...dados.ipca], y0 = Math.floor(Math.min(...tudo)) - 0.5, y1 = Math.ceil(Math.max(...tudo)) + 0.5;
const X = i => L + (R - L) * i / Math.max(1, dados.datas.length - 1), Y = v => B - (B - T) * (v - y0) / (y1 - y0);
const caminho = s => s.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
const mes = d => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. de ', ' ').replace('.', '');
let g = '';
for (let v = Math.ceil(y0); v <= y1; v += 2) g += `<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.08)" stroke-width="1"/><text x="${R + 86}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
g += `<text x="${L}" y="${B + 24}">${mes(dados.datas[0])}</text><text x="${R}" y="${B + 24}" text-anchor="end">${mes(dados.datas.at(-1))}</text>`;
g += series.map(s => `<path class="tr fino" d="${caminho(s)}" fill="none" stroke="#FF7A1A" stroke-opacity=".2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>`).join('');
g += `<path class="tr" d="${caminho(dados.ipca)}" fill="none" stroke="#C9CCD3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>`;
g += `<path class="tr" id="trSel" d="${caminho(series[0])}" fill="none" stroke="#FF7A1A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>`;
g += `<g class="fim"><circle cx="${R}" cy="${Y(dados.ipca.at(-1))}" r="5" fill="#C9CCD3" stroke="#151517" stroke-width="2.5"/><circle id="bolaSel" cx="${R}" r="5" fill="#FF7A1A" stroke="#151517" stroke-width="2.5"/><text class="rot" id="rotSel" x="${R + 12}" style="fill:#FF7A1A"></text><text class="rot" x="${R + 12}" y="${Y(dados.ipca.at(-1)) + 5}" style="fill:#C9CCD3">IPCA</text></g>`;
svg.innerHTML += g;
function destacar(i) {
  $('trSel').setAttribute('d', caminho(series[i]));
  const rot = $('rotSel'), yv = Y(series[i].at(-1)), yi = Y(dados.ipca.at(-1));
  rot.textContent = curto(geo.pontos[i].bairro);
  rot.setAttribute('y', Math.abs(yv - yi) < 16 ? yi + (yv <= yi ? -13 : 23) : yv + 5);
  $('bolaSel').setAttribute('cy', yv);
}
gsap.set('#grafico .tr', { strokeDasharray: '1 2' });

// ---------- movimento dos capítulos (só para quem não pediu "reduzir movimento")
const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  // o texto da abertura sobe e apaga enquanto o primeiro capítulo chega
  gsap.to('.abre > *', { y: -70, autoAlpha: 0, ease: 'none', stagger: 0.02, scrollTrigger: { trigger: '.abre', start: 'bottom 88%', end: 'bottom 38%', scrub: true } });
  // trilha lateral: mostra em qual dos três capítulos a leitura está
  gsap.fromTo('#trilha', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, scrollTrigger: { trigger: '#como', start: 'top 70%', endTrigger: '#inflacao', end: 'bottom 60%', toggleActions: 'play reverse play reverse' } });
  gsap.fromTo('#trilha i', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#como', start: 'top 50%', endTrigger: '#inflacao', end: 'bottom 50%', scrub: 0.4 } });
  gsap.utils.toArray('.cap').forEach(cap => {
    const caixa = cap.querySelector('.cap-caixa');
    gsap.timeline({ scrollTrigger: { trigger: cap, start: 'top 68%', end: 'bottom 30%', toggleActions: 'play reverse play reverse' } })
      .from(caixa, { autoAlpha: 0, y: 56, duration: 0.8 })
      .from(caixa.children, { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.07 }, '<0.12');
  });
  // as linhas do gráfico se desenham com o scroll
  gsap.timeline({ scrollTrigger: { trigger: '#inflacao', start: 'top 55%', end: 'center 42%', scrub: 0.7 } })
    .fromTo('#grafico .tr', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', duration: 1, stagger: 0.012 })
    .fromTo('#grafico .fim', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: 'none' });
});

// ---------- CEP
function escolher(i, viaCep) {
  estado.ponto = i; estado.cepDado = true;
  guarda.gravar('ponto', i);
  const p = geo.pontos[i], r = redesNoPonto[i];
  $('resBairro').textContent = curto(p.bairro);
  $('resSub').textContent = 'Quanto a cesta do índice custaria em cada rede, comparando cada item com a mediana das redes neste ponto.';
  $('redesLista').innerHTML = r.ordem.map((k, pos) => {
    const rota = rotaDe(i, k), loja = rota && rotas.lojas[rota.loja], dif = r.totais[k] - r.totais[r.melhor];
    const onde = (rota ? `<b>${rota.km.toLocaleString('pt-BR')} km</b> até a loja mais próxima${loja.end ? ', ' + loja.end.split(',')[0] : ''}` : 'Sem loja no mapa') + ` · ${r.itens[k]} itens`;
    return `<li class="${pos ? '' : 'melhor'}" data-k="${k}"><span class="pos">${String(pos + 1).padStart(2, '0')}</span><div><span class="nome">${nomes[k]}</span><span class="onde">${onde}</span></div><span class="val">${reais(r.totais[k])}<small>${pos ? '+ ' + reais(dif) : 'mais barata'}</small></span></li>`;
  }).join('');
  $('resNota').textContent = `Ponto de coleta ${viaCep ? 'mais próximo, pela faixa do CEP' : 'escolhido no mapa'}: ${p.rua}, ${p.cep}. Preço do site de cada rede para esse CEP.`;
  const novo = $('resultado').hidden;
  $('resultado').hidden = false;
  document.documentElement.classList.add('com-resultado');
  if (!calmo) {
    const tl = gsap.timeline();
    if (novo) tl.from('#resultado', { autoAlpha: 0, y: 22, duration: 0.6 });
    tl.from('#redesLista li', { autoAlpha: 0, x: -14, duration: 0.5, stagger: 0.05 }, novo ? 0.15 : 0);
  }
  mapa?.selecionar(i);
  destacar(i);
  atualizarCupom();
  ScrollTrigger.refresh();
  if (scrollY > innerHeight * 0.3) irPara(0);
}
$('voltar').addEventListener('click', () => {
  mapa?.selecionar(-1);
  estado.cepDado = false;
  $('resultado').hidden = true;
  document.documentElement.classList.remove('com-resultado');
  atualizarCupom();
  ScrollTrigger.refresh();
});
$('redesLista').addEventListener('pointerover', e => { const li = e.target.closest('li'); if (li) mapa?.destacar(+li.dataset.k); });
$('redesLista').addEventListener('pointerleave', () => mapa?.destacar(-1));
ligarCep(geo, $('cepForm'), $('cep'), $('cepMsg'), i => escolher(i, true));
$('mapa').addEventListener('ponto', e => escolher(e.detail, false));

// ---------- lista de compras (o resultado completo fica em lista.html)
const lista = criarLista(dados);
let calc = null;
function desenharCupom() {
  const tem = lista.itens.length > 0, pt = geo.pontos[estado.ponto];
  $('cupomVazio').hidden = tem;
  $('cupomTotal').hidden = !tem;
  $('cestaPonto').textContent = estado.cepDado
    ? `Preços do ponto de coleta ${pt.bairro}, zona ${pt.zona.toLowerCase()}.`
    : `Sem CEP, a conta usa o ponto ${pt.bairro}. Digite seu CEP no topo da página para trocar.`;
  if (!tem) { calc = null; return; }
  calc = calcular(dados, lista.itens, estado.ponto);
  const { melhor, dupla, vale } = calc;
  $('totLoja').textContent = melhor.rede.nome;
  rolar($('totInt'), $('totCent'), melhor.total);
  $('totFalta').textContent = melhor.faltam ? `${melhor.faltam} ${melhor.faltam > 1 ? 'itens indisponíveis' : 'item indisponível'} nesta rede. O total não conta com ${melhor.faltam > 1 ? 'eles' : 'ele'}.` : '';
  $('totDuas').hidden = !vale;
  if (vale) $('totDuas').innerHTML = `<b>Em duas lojas: ${reais(dupla.total)}</b> ${dupla.a.rede.nome} e ${dupla.b.rede.nome}. ${dupla.faltam < melhor.faltam ? 'Assim você acha mais itens.' : `Economia de ${reais(melhor.total - dupla.total)}.`}`;
}
ligarBusca(dados, lista, $('busca'), $('sugestoes'));
lista.aoMudar(desenharCupom);
const desenharItens = ligarItens(dados, lista, $('cupomItens'), (li, i, k) => {
  const el = li.querySelector('.preco-item'), v = calc?.melhor.v[k];
  el.textContent = v == null ? 'indisponível nesta rede' : reais(v);
  el.classList.toggle('sem', v == null);
});
const atualizarCupom = () => { desenharCupom(); desenharItens(); };
$('basica').addEventListener('click', () => lista.basica());
$('cupomData').textContent = new Date(dados.datas.at(-1) + 'T12:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

// ---------- partida: se a pessoa já deu o CEP numa visita anterior, o campo volta preenchido
const cepSalvo = guarda.ler('cep', ''), pontoSalvo = guarda.ler('ponto', -1);
if (cepSalvo) $('cep').value = cepSalvo;
if (pontoSalvo >= 0 && pontoSalvo < geo.pontos.length) { estado.ponto = pontoSalvo; estado.cepDado = true; }
destacar(estado.cepDado ? estado.ponto : iMax);
atualizarCupom();
