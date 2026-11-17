import { reais, rolar } from './util.js';
import { criarCesta } from './cesta.js';

const $ = id => document.getElementById(id);
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const [dados, mapa] = await Promise.all(['assets/dados.json', 'assets/mapa.json'].map(u => fetch(u).then(r => r.json())));
const estado = { ponto: 0, cepDado: false, calmo };

// faixa de aviso: aparece sempre que os dados forem de exemplo
if (dados.exemplo) {
  $('aviso').hidden = false;
  document.documentElement.style.setProperty('--aviso-h', $('aviso').offsetHeight + 'px');
}

const cestas = dados.pontos.map(p => p.cesta);
const media = cestas.reduce((s, v) => s + v, 0) / cestas.length;
const n = dados.itens_na_cesta;

$('etqRotulo').textContent = `Cesta de ${n} itens, média da cidade`;
const iMin = cestas.indexOf(Math.min(...cestas)), iMax = cestas.indexOf(Math.max(...cestas));
$('minNome').textContent = mapa.pontos[iMin].bairro; $('minVal').textContent = reais(cestas[iMin]);
$('maxNome').textContent = mapa.pontos[iMax].bairro; $('maxVal').textContent = reais(cestas[iMax]);

// ---------- as redes em cada ponto: soma dos itens do índice que todas as redes têm ali
const precoEm = (r, i, prod) => { const t = dados.precos[r.id]; return r.por_cep ? t[i][prod] : t[prod]; };
const doIndice = dados.produtos.map((p, k) => (p.indice ? k : -1)).filter(k => k >= 0);
const redesNoPonto = dados.pontos.map((_, i) => {
  const comuns = doIndice.filter(k => dados.redes.every(r => precoEm(r, i, k) != null));
  const totais = dados.redes.map(r => comuns.reduce((s, k) => s + precoEm(r, i, k), 0));
  const ordem = totais.map((_, k) => k).sort((a, b) => totais[a] - totais[b]);
  return { n: comuns.length, totais, melhor: ordem[0], pior: ordem.at(-1) };
});

// ---------- mapa 3D
let mapa3d = null;
try {
  const { criarMapa } = await import('./mapa3d.js');
  mapa3d = criarMapa($('mapa'), mapa, { redes: dados.redes.length, melhor: i => redesNoPonto[i].melhor }, { calmo });
} catch (erro) {
  console.warn('Mapa 3D indisponível neste navegador.', erro);
  document.documentElement.classList.add('sem-3d');
}

const dica = $('dica'), tag = $('tagPonto'), dicaTexto = $('dicaTexto'), tagTexto = $('tagTexto');
// uma etiqueta por lojinha: o nome aparece com a loja, o preço quando a luz chega
const etiquetas = dados.redes.map(r => {
  const el = document.createElement('div');
  el.className = 'loja-tag';
  el.innerHTML = `<span><b>${r.nome.replace(' Atacado', '')}</b><i></i></span>`;
  $('palco').append(el);
  return { el, preco: el.querySelector('i') };
});
let dicaDe = -2, focoDe = -1;
mapa3d?.aoPassar((hover, sel, cenaMapa) => {
  if (cenaMapa.foco !== focoDe) {
    focoDe = cenaMapa.foco;
    const r = redesNoPonto[focoDe];
    etiquetas.forEach((e, k) => { e.preco.textContent = reais(r.totais[k]); });
    $('palcoNota').textContent = `Soma dos ${r.n} itens que as ${dados.redes.length} redes vendem em ${mapa.pontos[focoDe].bairro.split(' (')[0]}. Lojinhas e caminhos são ilustrativos.`;
  }
  etiquetas.forEach((e, k) => {
    const l = cenaMapa.lojas[k];
    e.el.classList.toggle('on', l.s > 0.5);
    e.el.classList.toggle('chegou', l.chegou);
    e.el.classList.toggle('melhor', l.melhor);
    e.el.classList.toggle('resto', cenaMapa.veredito && !l.melhor);
    if (l.s > 0.01) e.el.style.transform = `translate(calc(${l.x.toFixed(1)}px - 50%),calc(${l.y.toFixed(1)}px - 100%))`;
  });
  $('palcoNota').classList.toggle('on', cenaMapa.dentro);
  $('voltar').classList.toggle('on', cenaMapa.dentro && sel >= 0);
  hover = cenaMapa.zoom > 0.5 ? -1 : hover;
  if (hover !== dicaDe) {
    dicaDe = hover;
    dica.classList.toggle('on', hover >= 0);
    if (hover >= 0) {
      const p = mapa.pontos[hover], d = dados.pontos[hover];
      dicaTexto.innerHTML = `<b>${p.bairro}</b>Cesta de ${n} itens: ${reais(d.cesta)}<br>Em 12 meses: ${d.var.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    }
  }
  if (hover >= 0) { const t = mapa3d.naTela(hover); dica.style.transform = `translate(${t.x + 16}px,calc(${t.y - 12}px - 100%))`; }
  if (sel >= 0 && tagTexto.dataset.i !== String(sel)) { tagTexto.dataset.i = sel; tagTexto.textContent = mapa.pontos[sel].bairro; }
  tag.classList.toggle('on', sel >= 0 && cenaMapa.zoom < 0.4);
  if (sel >= 0) { const t = mapa3d.naTela(sel); tag.style.transform = `translate(calc(${t.x}px - 50%),calc(${t.y}px - 100% - 10px))`; }
});

// ---------- scroll comanda a cena
const marcos = [document.querySelector('.abre'), ...document.querySelectorAll('.cap')];
let centros = [];
const medir = () => { centros = marcos.map(m => m.offsetTop + m.offsetHeight / 2); centros[0] = innerHeight / 2; };
function cenaDoScroll() {
  const y = scrollY + innerHeight / 2;
  let p = centros.length - 1;
  for (let i = 0; i < centros.length - 1; i++) if (y < centros[i + 1]) { p = i + clamp((y - centros[i]) / (centros[i + 1] - centros[i])); break; }
  mapa3d?.cena(p);
  tracar(clamp((p - 2.25) / 0.7));
}
addEventListener('scroll', cenaDoScroll, { passive: true });
addEventListener('resize', () => { medir(); cenaDoScroll(); });
new IntersectionObserver(([e]) => mapa3d?.ativo(e.isIntersecting)).observe(document.querySelector('.cena'));

// ---------- gráfico: índice local contra o IPCA, traçado pelo scroll
const svg = $('grafico'), L = 6, R = 432, T = 16, B = 262;
const series = dados.pontos.map(p => p.serie);
const tudo = [...series.flat(), ...dados.ipca], y0 = Math.floor(Math.min(...tudo)) - 0.5, y1 = Math.ceil(Math.max(...tudo)) + 0.5;
const X = i => L + (R - L) * i / (dados.datas.length - 1), Y = v => B - (B - T) * (v - y0) / (y1 - y0);
const caminho = s => s.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
const mes = d => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. de ', ' ').replace('.', '');
let g = '';
for (let v = Math.ceil(y0); v <= y1; v += 2) g += `<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(30,39,87,.14)" stroke-width="2" stroke-dasharray="0 7" stroke-linecap="round"/><text x="${R + 86}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
g += `<text x="${L}" y="${B + 24}">${mes(dados.datas[0])}</text><text x="${R}" y="${B + 24}" text-anchor="end">${mes(dados.datas.at(-1))}</text>`;
g += series.map(s => `<path class="tr fino" d="${caminho(s)}" fill="none" stroke="#FF6B5C" stroke-opacity=".26" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>`).join('');
g += `<path class="tr" id="trSel" d="${caminho(series[0])}" fill="none" stroke="#FF6B5C" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>`;
g += `<path class="tr" d="${caminho(dados.ipca)}" fill="none" stroke="#3D5AFE" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>`;
g += `<g class="fim"><circle id="bolaSel" cx="${R}" r="7" fill="#FF6B5C" stroke="#fff" stroke-width="3"/><circle cx="${R}" cy="${Y(dados.ipca.at(-1))}" r="7" fill="#3D5AFE" stroke="#fff" stroke-width="3"/><text class="rot" id="rotSel" x="${R + 14}" style="fill:#D8402F"></text><text class="rot" x="${R + 14}" y="${Y(dados.ipca.at(-1)) + 5}" style="fill:#3D5AFE">IPCA</text></g>`;
svg.innerHTML += g;
const tracos = [...svg.querySelectorAll('.tr')], fim = svg.querySelector('.fim');
tracos.forEach(t => { t.style.strokeDasharray = '1 2'; });
fim.style.transformBox = 'fill-box'; fim.style.transformOrigin = '0% 50%';
function tracar(v) {
  if (calmo) v = 1;
  tracos.forEach(t => { t.style.strokeDashoffset = 1 - v; });
  const f = clamp((v - 0.9) * 10);
  fim.style.opacity = f;
  fim.style.transform = `scale(${0.6 + 0.4 * f})`;
}
function destacar(i) {
  $('trSel').setAttribute('d', caminho(series[i]));
  const rot = $('rotSel'), yv = Y(series[i].at(-1)), yi = Y(dados.ipca.at(-1));
  rot.textContent = mapa.pontos[i].bairro.split(' (')[0];
  rot.setAttribute('y', Math.abs(yv - yi) < 16 ? yi + (yv <= yi ? -13 : 23) : yv + 5);
  $('bolaSel').setAttribute('cy', yv);
}

// ---------- CEP
function pontoDoCep(cep) {
  const c5 = +cep.slice(0, 5);
  if (!((c5 >= 1000 && c5 <= 5999) || (c5 >= 8000 && c5 <= 8499))) return -1;
  let melhor = -1, d = Infinity;
  mapa.pontos.forEach((p, i) => {
    const q = +p.cep.slice(0, 5), custo = Math.abs(q - c5) + (p.cep.slice(0, 2) === cep.slice(0, 2) ? 0 : 5000);
    if (custo < d) { d = custo; melhor = i; }
  });
  return melhor;
}
function escolher(i, viaCep) {
  estado.ponto = i; estado.cepDado = true;
  const p = mapa.pontos[i];
  mapa3d?.selecionar(i);
  const r = redesNoPonto[i], nome = k => dados.redes[k].nome, bairro = p.bairro.split(' (')[0];
  $('etqRotulo').textContent = `${r.n} itens em ${bairro}, no ${nome(r.melhor)}`;
  rolar($('etqInt'), $('etqCent'), r.totais[r.melhor]);
  $('cepMsg').className = 'cep-msg';
  $('cepMsg').textContent = `Ponto de coleta ${viaCep ? 'mais próximo, pela faixa do CEP' : 'escolhido no mapa'}: ${p.bairro}. Os ${r.n} itens que as ${dados.redes.length} redes vendem ali saem por ${reais(r.totais[r.melhor])} no ${nome(r.melhor)} e por ${reais(r.totais[r.pior])} no ${nome(r.pior)}. No mapa, lojinhas e caminhos são ilustrativos.`;
  destacar(i);
  cesta.atualizar();
  if (scrollY > innerHeight * 0.3) scrollTo({ top: 0, behavior: calmo ? 'auto' : 'smooth' });
}
$('voltar').addEventListener('click', () => {
  mapa3d?.selecionar(-1);
  estado.cepDado = false;
  $('etqRotulo').textContent = `Cesta de ${n} itens, média da cidade`;
  rolar($('etqInt'), $('etqCent'), media);
  $('cepMsg').textContent = '';
  cesta.atualizar();
});
const campo = $('cep');
campo.addEventListener('input', () => {
  const d = campo.value.replace(/\D/g, '').slice(0, 8);
  campo.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
});
$('cepForm').addEventListener('submit', e => {
  e.preventDefault();
  const d = campo.value.replace(/\D/g, ''), msg = $('cepMsg');
  msg.className = 'cep-msg erro';
  if (d.length !== 8) { msg.textContent = 'O CEP tem 8 números. Confira e tente de novo.'; return; }
  const i = pontoDoCep(d);
  if (i < 0) { msg.textContent = 'Esse CEP fica fora da capital. Por enquanto o site cobre só a cidade de São Paulo.'; return; }
  escolher(i, true);
});
$('mapa').addEventListener('ponto', e => escolher(e.detail, false));

// ---------- título: cada palavra entra pulando
let palavra = 0;
document.querySelectorAll('.titulo .linha > span').forEach(sp => {
  sp.innerHTML = sp.textContent.trim().split(/\s+/).map(w => `<span class="pal" style="--i:${palavra++}">${w}</span>`).join(' ');
});

// ---------- partida
const cesta = criarCesta(dados, mapa, estado);
destacar(iMax);
medir(); cenaDoScroll();
document.fonts.ready.then(() => { medir(); cenaDoScroll(); });
requestAnimationFrame(() => {
  document.documentElement.classList.add('pronto');
  setTimeout(() => rolar($('etqInt'), $('etqCent'), media), calmo ? 0 : 1100);
});
