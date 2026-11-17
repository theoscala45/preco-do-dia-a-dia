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

const cestas = dados.pontos.map(p => p.cesta), vars = dados.pontos.map(p => p.var);
const normal = a => { const mn = Math.min(...a), mx = Math.max(...a); return a.map(v => (v - mn) / (mx - mn || 1)); };
const media = cestas.reduce((s, v) => s + v, 0) / cestas.length;
const n = dados.itens_na_cesta;

$('etqRotulo').textContent = `Cesta de ${n} itens, média da cidade`;
const iMin = cestas.indexOf(Math.min(...cestas)), iMax = cestas.indexOf(Math.max(...cestas));
$('minNome').textContent = mapa.pontos[iMin].bairro; $('minVal').textContent = reais(cestas[iMin]);
$('maxNome').textContent = mapa.pontos[iMax].bairro; $('maxVal').textContent = reais(cestas[iMax]);

// ---------- mapa 3D
let mapa3d = null;
try {
  const { criarMapa } = await import('./mapa3d.js');
  mapa3d = criarMapa($('mapa'), mapa, { preco: normal(cestas), var: normal(vars) }, { calmo });
} catch (erro) {
  console.warn('Mapa 3D indisponível neste navegador.', erro);
  document.documentElement.classList.add('sem-3d');
}

const dica = $('dica'), tag = $('tagPonto');
let dicaDe = -2;
mapa3d?.aoPassar((hover, sel) => {
  if (hover !== dicaDe) {
    dicaDe = hover;
    dica.classList.toggle('on', hover >= 0);
    if (hover >= 0) {
      const p = mapa.pontos[hover], d = dados.pontos[hover];
      dica.innerHTML = `<b>${p.bairro}</b>Cesta de ${n} itens: ${reais(d.cesta)}<br>Em 12 meses: ${d.var.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    }
  }
  if (hover >= 0) { const t = mapa3d.naTela(hover); dica.style.transform = `translate(${t.x + 14}px,${t.y - 20}px)`; }
  tag.classList.toggle('on', sel >= 0);
  if (sel >= 0) { const t = mapa3d.naTela(sel); tag.style.transform = `translate(calc(${t.x}px - 50%),calc(${t.y}px - 100% - 8px))`; }
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
for (let v = Math.ceil(y0); v <= y1; v += 2) g += `<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(29,31,42,.14)"/><text x="${R + 86}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
g += `<text x="${L}" y="${B + 24}">${mes(dados.datas[0])}</text><text x="${R}" y="${B + 24}" text-anchor="end">${mes(dados.datas.at(-1))}</text>`;
g += series.map(s => `<path class="tr fino" d="${caminho(s)}" fill="none" stroke="#D4281C" stroke-opacity=".22" stroke-width="1.2" pathLength="1"/>`).join('');
g += `<path class="tr" id="trSel" d="${caminho(series[0])}" fill="none" stroke="#D4281C" stroke-width="3" stroke-linejoin="round" pathLength="1"/>`;
g += `<path class="tr" d="${caminho(dados.ipca)}" fill="none" stroke="#2447C5" stroke-width="3" stroke-linejoin="round" pathLength="1"/>`;
g += `<g class="fim"><text class="rot" id="rotSel" x="${R + 8}" style="fill:#D4281C"></text><text class="rot" x="${R + 8}" y="${Y(dados.ipca.at(-1)) + 4}" style="fill:#2447C5">IPCA</text></g>`;
svg.innerHTML += g;
const tracos = [...svg.querySelectorAll('.tr')], fim = svg.querySelector('.fim');
tracos.forEach(t => { t.style.strokeDasharray = 1; });
function tracar(v) {
  if (calmo) v = 1;
  tracos.forEach(t => { t.style.strokeDashoffset = 1 - v; });
  fim.style.opacity = clamp((v - 0.9) * 10);
}
function destacar(i) {
  $('trSel').setAttribute('d', caminho(series[i]));
  const rot = $('rotSel'), yv = Y(series[i].at(-1)), yi = Y(dados.ipca.at(-1));
  rot.textContent = mapa.pontos[i].bairro.split(' (')[0];
  rot.setAttribute('y', Math.abs(yv - yi) < 14 ? yi + (yv <= yi ? -12 : 20) : yv + 4);
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
  tag.textContent = p.bairro;
  $('etqRotulo').textContent = `Cesta de ${n} itens em ${p.bairro.split(' (')[0]}`;
  rolar($('etqInt'), $('etqCent'), dados.pontos[i].cesta);
  const dif = dados.pontos[i].cesta - media;
  $('cepMsg').className = 'cep-msg';
  $('cepMsg').textContent = `Ponto de coleta ${viaCep ? 'mais próximo, pela faixa do CEP' : 'escolhido no mapa'}: ${p.bairro}. A cesta sai ${reais(Math.abs(dif))} ${dif >= 0 ? 'acima' : 'abaixo'} da média da cidade.`;
  destacar(i);
  cesta.atualizar();
}
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

// ---------- partida
const cesta = criarCesta(dados, mapa, estado);
destacar(iMax);
medir(); cenaDoScroll();
document.fonts.ready.then(() => { medir(); cenaDoScroll(); });
requestAnimationFrame(() => {
  document.documentElement.classList.add('pronto');
  setTimeout(() => rolar($('etqInt'), $('etqCent'), media), calmo ? 0 : 900);
});
