// Página "Inflação do seu bairro": índice local contra o IPCA, por ponto, por zona e por faixa de renda.
import { $, gsap, ScrollTrigger, calmo, reais, pct, curto, contar, carregar, guarda, ligarCep, iniciar } from './base.js';

const [dados, geo] = await carregar('dados', 'geo');
iniciar(dados);

const N = dados.datas.length, ipca = dados.ipca, ipcaVar = ipca.at(-1) - 100;
const series = dados.pontos.map(p => p.serie), vars = dados.pontos.map(p => p.var);
const estado = { ponto: 0, vista: 'ponto' };
const salvo = guarda.ler('ponto', -1);
estado.ponto = salvo >= 0 && salvo < geo.pontos.length ? salvo : vars.indexOf(Math.max(...vars));
$('cep').value = guarda.ler('cep', '');

const sinal = (v, casas = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + pct(Math.abs(v), casas);
const mesCurto = d => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
const mesLongo = d => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const media = idx => Array.from({ length: N }, (_, t) => idx.reduce((s, i) => s + series[i][t], 0) / idx.length);
const grupos = campo => [...new Set(geo.pontos.map(p => p[campo]))].map(nome => ({ nome, serie: media(geo.pontos.map((p, i) => (p[campo] === nome ? i : -1)).filter(i => i >= 0)) }));
const ZONAS = grupos('zona'), PERFIS = grupos('perfil');
const CORES = ['#F26A0F', '#E3A21A', '#16161A', '#9C6B3E', '#8A8A92'];
const COR_IPCA = '#7C818B';

$('periodo').textContent = `${mesLongo(dados.datas[0])} a ${mesLongo(dados.datas.at(-1))}`;

// ---------- seletor de ponto
$('ponto').innerHTML = [...new Set(geo.pontos.map(p => p.zona))].map(z =>
  `<optgroup label="Zona ${z.toLowerCase()}">${geo.pontos.map((p, i) => (p.zona === z ? `<option value="${i}">${p.bairro}</option>` : '')).join('')}</optgroup>`).join('');
$('ponto').addEventListener('change', e => escolher(+e.target.value));
ligarCep(geo, $('cepForm'), $('cep'), $('cepMsg'), i => escolher(i));

// ---------- gráfico (desenhado no tamanho real da caixa, para o texto não encolher no celular)
const svg = $('graf'), caixa = $('grafCaixa'), dica = $('grafDica');
let linhas = [], geom = null, primeira = true, visto = false;

function linhasDaVista() {
  const i = estado.ponto;
  if (estado.vista === 'zona') return ZONAS.map((z, k) => ({ nome: 'Zona ' + z.nome.toLowerCase(), serie: z.serie, cor: CORES[k], larg: 2.6 }));
  if (estado.vista === 'perfil') return PERFIS.map((z, k) => ({ nome: z.nome, serie: z.serie, cor: [CORES[0], CORES[1], CORES[4]][k] || CORES[k], larg: 2.6 }));
  return [{ nome: curto(geo.pontos[i].bairro), serie: series[i], cor: CORES[0], larg: 3.4 }];
}

function desenharGrafico(animar = true) {
  const W = caixa.clientWidth, largo = W >= 720, H = Math.round(Math.min(500, Math.max(300, W * 0.48)));
  const L = 40, R = largo ? 150 : 14, T = 16, B = 38;
  linhas = [...linhasDaVista(), { nome: 'IPCA', serie: ipca, cor: COR_IPCA, larg: 2.4, traco: '2 7' }];
  const fundo = estado.vista === 'ponto' ? series.filter((_, k) => k !== estado.ponto) : [];
  const tudo = [...linhas.flatMap(l => l.serie), ...fundo.flat()];
  const y0 = Math.floor(Math.min(...tudo) - 0.2), y1 = Math.ceil(Math.max(...tudo) + 0.2);
  const X = t => L + (W - L - R) * t / Math.max(1, N - 1), Y = v => H - B - (H - B - T) * (v - y0) / (y1 - y0);
  const caminho = s => s.map((v, t) => `${t ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  geom = { W, H, L, R, T, B, X, Y };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);

  let g = `<title id="grafT">Índice da cesta comparado com o IPCA, mês a mês</title><defs><clipPath id="corte"><rect id="corteR" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>`;
  const passo = y1 - y0 > 8 ? 2 : 1;
  for (let v = y0; v <= y1; v += passo) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="${v === 100 ? 'base' : 'grade'}"/><text x="${L - 10}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
  const cada = W < 560 ? 3 : W < 900 ? 2 : 1;
  dados.datas.forEach((d, t) => { if (t % cada === 0 || t === N - 1) g += `<text x="${X(t)}" y="${H - B + 22}" text-anchor="${t === 0 ? 'start' : t === N - 1 ? 'end' : 'middle'}">${mesCurto(d)}${t === 0 || d.slice(5, 7) === '01' ? ' ' + d.slice(2, 4) : ''}</text>`; });
  g += `<g clip-path="url(#corte)">`;
  g += fundo.map(s => `<path d="${caminho(s)}" class="fundo"/>`).join('');
  g += linhas.map(l => `<path d="${caminho(l.serie)}" fill="none" stroke="${l.cor}" stroke-width="${l.larg}" stroke-linecap="round" stroke-linejoin="round"${l.traco ? ` stroke-dasharray="${l.traco}"` : ''}/>`).join('');
  g += `</g><g class="pontas">`;
  // rótulos na ponta das linhas, afastados para não bater um no outro
  const pontas = linhas.map((l, k) => ({ k, y: Y(l.serie.at(-1)) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < pontas.length; k++) if (pontas[k].y - pontas[k - 1].y < 17) pontas[k].y = pontas[k - 1].y + 17;
  for (const p of pontas) {
    const l = linhas[p.k];
    g += `<circle cx="${X(N - 1)}" cy="${Y(l.serie.at(-1))}" r="4.5" fill="${l.cor}" stroke="#FFFFFF" stroke-width="2"/>`;
    if (largo) g += `<text class="rot" x="${X(N - 1) + 12}" y="${p.y + 4.5}" fill="${l.cor}">${l.nome}</text>`;
  }
  g += `</g><g id="guia" visibility="hidden"><line y1="${T}" y2="${H - B}" class="guia"/>${linhas.map(l => `<circle r="4.5" fill="${l.cor}" stroke="#FFFFFF" stroke-width="2"/>`).join('')}</g>`;
  svg.innerHTML = g;

  $('legenda').innerHTML = linhas.map(l => `<li><i style="background:${l.cor}"></i>${l.nome}<b>${sinal(l.serie.at(-1) - 100)}%</b></li>`).join('')
    + (fundo.length ? '<li class="apagado"><i></i>os outros 24 pontos</li>' : '');
  $('grafNota').textContent = `Base 100 em ${mesLongo(dados.datas[0])}. ` + (dados.pesos ? 'Cada produto pesa como o seu item no IPCA.' : 'Cada produto pesa igual.')
    + (estado.vista === 'zona' ? ' Cada zona é a média dos seus 5 pontos.' : estado.vista === 'perfil' ? ' Cada faixa de renda é a média dos seus pontos. A faixa vem do Censo 2022 (IBGE), pela renda do distrito.' : '');

  if (animar && !calmo && visto) {
    gsap.fromTo('#corteR', { attr: { width: 0 } }, { attr: { width: W }, duration: primeira ? 1.8 : 1.1, ease: 'power2.inOut' });
    gsap.fromTo('#graf .pontas', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, delay: primeira ? 1.6 : 0.95 });
    primeira = false;
  } else if (!visto && !calmo) gsap.set(['#corteR'], { attr: { width: 0 } }), gsap.set('#graf .pontas', { autoAlpha: 0 });
}
// a primeira vez, o gráfico se desenha quando entra na tela
ScrollTrigger.create({ trigger: caixa, start: 'top 78%', once: true, onEnter: () => { visto = true; desenharGrafico(); } });

// passar o ponteiro: valores do mês
caixa.addEventListener('pointermove', e => {
  if (!geom) return;
  const r = svg.getBoundingClientRect(), { X, Y, L, R, W } = geom;
  const t = Math.round(Math.min(1, Math.max(0, (e.clientX - r.left - L) / (W - L - R))) * (N - 1));
  const guia = svg.querySelector('#guia');
  guia.setAttribute('visibility', 'visible');
  guia.querySelector('line').setAttribute('x1', X(t)); guia.querySelector('line').setAttribute('x2', X(t));
  guia.querySelectorAll('circle').forEach((c, k) => { c.setAttribute('cx', X(t)); c.setAttribute('cy', Y(linhas[k].serie[t])); });
  dica.innerHTML = `<b>${mesLongo(dados.datas[t])}</b>` + [...linhas].sort((a, b) => b.serie[t] - a.serie[t]).map(l => `<span><i style="background:${l.cor}"></i>${l.nome}<em>${pct(l.serie[t], 2)}</em></span>`).join('');
  dica.classList.add('on');
  const dx = X(t) > W * 0.6 ? -dica.offsetWidth - 16 : 16;
  dica.style.transform = `translate(${X(t) + dx}px,${Math.max(8, Math.min(geom.H - dica.offsetHeight - 40, e.clientY - r.top - 30))}px)`;
});
caixa.addEventListener('pointerleave', () => { dica.classList.remove('on'); svg.querySelector('#guia')?.setAttribute('visibility', 'hidden'); });

document.querySelectorAll('.aba').forEach(b => b.addEventListener('click', () => {
  estado.vista = b.dataset.vista;
  document.querySelectorAll('.aba').forEach(o => o.setAttribute('aria-pressed', o === b));
  desenharGrafico();
}));
let espera = 0, larguraAntes = caixa.clientWidth;
addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(() => { if (caixa.clientWidth !== larguraAntes) { larguraAntes = caixa.clientWidth; desenharGrafico(false); } }, 150); });

// ---------- os 25 pontos em ordem
const maior = Math.max(...vars, ipcaVar) * 1.04;
const ordem = vars.map((_, i) => i).sort((a, b) => vars[b] - vars[a]);
$('rankInfl').innerHTML = ordem.map((i, pos) => {
  const p = geo.pontos[i];
  return `<li><button type="button" data-i="${i}"><span class="pos">${String(pos + 1).padStart(2, '0')}</span><span class="quem">${curto(p.bairro)}<small>${p.zona} · ${p.perfil}</small></span><span class="trilho-barra"><i style="--v:${(vars[i] / maior).toFixed(3)}"></i><u style="left:${(ipcaVar / maior * 100).toFixed(1)}%"></u></span><span class="val">${sinal(vars[i])}%</span></button></li>`;
}).join('');
$('rankInfl').addEventListener('click', e => { const b = e.target.closest('button'); if (b) escolher(+b.dataset.i); });
if (calmo) gsap.set('#rankInfl i', { scaleX: (k, el) => +el.style.getPropertyValue('--v') });
else gsap.fromTo('#rankInfl i', { scaleX: 0 }, { scaleX: (k, el) => +el.style.getPropertyValue('--v'), duration: 0.9, ease: 'power3.out', stagger: 0.025,
  scrollTrigger: { trigger: '#rankInfl', start: 'top 85%', once: true } });

// ---------- mapa: distritos coloridos pela alta em 12 meses
const mn = Math.min(...vars), mx = Math.max(...vars);
$('escMin').textContent = sinal(mn) + '%'; $('escMax').textContent = sinal(mx) + '%';
let mapa = null, mapaPronto = false;
try {
  const { novoMapa, LARANJA } = await import('./mapa.js');
  const cid = geo.cidade;
  mapa = novoMapa($('mapaInfl'), { bounds: [[cid.oeste, cid.sul], [cid.leste, cid.norte]], fitBoundsOptions: { padding: 18 } });
  mapa.on('load', () => {
    const antes = mapa.getStyle().layers.find(l => l.type === 'symbol')?.id;
    geo.distritos.features.forEach(f => { f.properties.v = (vars[f.properties.ponto] - mn) / (mx - mn || 1); });
    mapa.addSource('distritos', { type: 'geojson', data: geo.distritos });
    mapa.addLayer({ id: 'distritos', type: 'fill', source: 'distritos', paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'v'], 0, '#F1ECE6', 0.5, '#F7B27A', 1, LARANJA], 'fill-opacity': 0.9 } }, antes);
    mapa.addLayer({ id: 'escolhido', type: 'line', source: 'distritos', filter: ['==', ['get', 'ponto'], estado.ponto], paint: { 'line-color': '#16161A', 'line-width': 2 } });
    mapa.on('click', 'distritos', e => escolher(e.features[0].properties.ponto));
    mapa.on('mousemove', 'distritos', () => { mapa.getCanvas().style.cursor = 'pointer'; });
    mapa.on('mouseleave', 'distritos', () => { mapa.getCanvas().style.cursor = ''; });
    mapaPronto = true;
  });
} catch (erro) {
  console.warn('Mapa indisponível neste navegador.', erro);
  document.querySelector('.infl-dupla .mapa-cartao').hidden = true;
}

// ---------- escolher um ponto atualiza tudo
function escolher(i, guardar = true) {
  estado.ponto = i;
  if (guardar) guarda.gravar('ponto', i);
  const p = geo.pontos[i], dif = vars[i] - ipcaVar;
  $('ponto').value = i;
  $('nRotulo').textContent = `Cesta em ${curto(p.bairro)}, 12 meses`;
  contar($('nLocal'), vars[i], v => sinal(v));
  contar($('nIpca'), ipcaVar, v => sinal(v));
  contar($('nDif'), dif, v => sinal(v));
  $('nCesta').textContent = `${dados.itens_na_cesta} itens. Hoje a cesta custa ${reais(dados.pontos[i].cesta)} neste ponto.`;
  $('nDifNota').textContent = Math.abs(dif) < 0.05 ? 'A cesta acompanhou o índice oficial.' : dif > 0 ? 'A cesta subiu mais que o índice oficial.' : 'A cesta subiu menos que o índice oficial.';
  document.querySelectorAll('#rankInfl button').forEach(b => b.classList.toggle('ativo', +b.dataset.i === i));
  if (mapaPronto) mapa.setFilter('escolhido', ['==', ['get', 'ponto'], i]);
  else mapa?.once('load', () => mapa.setFilter('escolhido', ['==', ['get', 'ponto'], estado.ponto]));
  desenharGrafico();
}
escolher(estado.ponto, false);
