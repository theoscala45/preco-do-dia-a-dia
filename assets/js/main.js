import { reais, rolar } from './util.js';
import { criarCesta } from './cesta.js';

const $ = id => document.getElementById(id);
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const [dados, geo, rotas] = await Promise.all(['assets/dados.json', 'assets/geo.json', 'assets/rotas.json'].map(u => fetch(u).then(r => r.json())));
const estado = { ponto: 0, cepDado: false, calmo };
const curto = b => b.split(' (')[0];

// faixa de aviso: aparece sempre que os dados forem de exemplo
if (dados.exemplo) {
  $('aviso').hidden = false;
  document.documentElement.style.setProperty('--aviso-h', $('aviso').offsetHeight + 'px');
}

const cestas = dados.pontos.map(p => p.cesta), vars = dados.pontos.map(p => p.var);
const normal = a => { const mn = Math.min(...a), mx = Math.max(...a); return a.map(v => (v - mn) / (mx - mn || 1)); };
const media = cestas.reduce((s, v) => s + v, 0) / cestas.length;
const n = dados.itens_na_cesta;

$('mediaRotulo').textContent = `Cesta de ${n} itens, média da cidade`;
const iMin = cestas.indexOf(Math.min(...cestas)), iMax = cestas.indexOf(Math.max(...cestas));
$('minNome').textContent = curto(geo.pontos[iMin].bairro); $('minVal').textContent = reais(cestas[iMin]);
$('maxNome').textContent = curto(geo.pontos[iMax].bairro); $('maxVal').textContent = reais(cestas[iMax]);

// ---------- as redes em cada ponto: soma dos itens do índice que todas as redes têm ali
const precoEm = (r, i, prod) => { const t = dados.precos[r.id]; return r.por_cep ? t[i][prod] : t[prod]; };
const doIndice = dados.produtos.map((p, k) => (p.indice ? k : -1)).filter(k => k >= 0);
const redesNoPonto = dados.pontos.map((_, i) => {
  const comuns = doIndice.filter(k => dados.redes.every(r => precoEm(r, i, k) != null));
  const totais = dados.redes.map(r => comuns.reduce((s, k) => s + precoEm(r, i, k), 0));
  const ordem = totais.map((_, k) => k).sort((a, b) => totais[a] - totais[b]);
  return { n: comuns.length, totais, ordem, melhor: ordem[0], pior: ordem.at(-1) };
});
// rota e loja mais próxima de cada rede, por ponto (OpenStreetMap)
const rotaDe = (i, k) => rotas.pontos.find(p => p.id === geo.pontos[i].id)?.redes[dados.redes[k].id];

// ---------- mapa
let mapa = null;
try {
  const { criarMapa } = await import('./mapa.js');
  mapa = criarMapa($('mapa'), geo, rotas, {
    redes: dados.redes.map(r => ({ id: r.id, nome: r.nome.replace(' Atacado', '') })),
    var: normal(vars), ordem: i => redesNoPonto[i].ordem, preco: (i, k) => reais(redesNoPonto[i].totais[k]),
  }, { calmo });
} catch (erro) {
  console.warn('Mapa indisponível neste navegador.', erro);
  document.documentElement.classList.add('sem-mapa');
}

const dica = $('dica');
let dicaDe = -2;
mapa?.aoPassar((hover, pt) => {
  if (hover !== dicaDe) {
    dicaDe = hover;
    dica.classList.toggle('on', hover >= 0);
    if (hover >= 0) {
      const p = geo.pontos[hover], d = dados.pontos[hover];
      dica.innerHTML = `<b>${p.bairro}</b>Cesta de ${n} itens: ${reais(d.cesta)}<br>Em 12 meses: ${d.var.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    }
  }
  if (hover >= 0 && pt) dica.style.transform = `translate(${pt.x + 16}px,calc(${pt.y - 14}px - 100%))`;
});
// quando o mapa decide a rede mais barata, a lista marca a mesma linha
mapa?.aoMudar(({ fase }) => { $('redesLista').classList.toggle('decidido', fase === 'veredito'); });

// ---------- scroll comanda a cena
const marcos = [document.querySelector('.abre'), ...document.querySelectorAll('.cap')];
let centros = [];
const medir = () => { centros = marcos.map(m => m.offsetTop + m.offsetHeight / 2); centros[0] = innerHeight / 2; };
function cenaDoScroll() {
  const y = scrollY + innerHeight / 2;
  let p = centros.length - 1;
  for (let i = 0; i < centros.length - 1; i++) if (y < centros[i + 1]) { p = i + clamp((y - centros[i]) / (centros[i + 1] - centros[i])); break; }
  mapa?.cena(Math.round(p));
  tracar(clamp((p - 2.25) / 0.7));
}
addEventListener('scroll', cenaDoScroll, { passive: true });
addEventListener('resize', () => { medir(); cenaDoScroll(); });
new IntersectionObserver(([e]) => mapa?.ativo(e.isIntersecting)).observe(document.querySelector('.cena'));

// ---------- gráfico: índice local contra o IPCA, traçado pelo scroll
const svg = $('grafico'), L = 6, R = 432, T = 16, B = 262;
const series = dados.pontos.map(p => p.serie);
const tudo = [...series.flat(), ...dados.ipca], y0 = Math.floor(Math.min(...tudo)) - 0.5, y1 = Math.ceil(Math.max(...tudo)) + 0.5;
const X = i => L + (R - L) * i / (dados.datas.length - 1), Y = v => B - (B - T) * (v - y0) / (y1 - y0);
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
const tracos = [...svg.querySelectorAll('.tr')], fim = svg.querySelector('.fim');
tracos.forEach(t => { t.style.strokeDasharray = '1 2'; });
function tracar(v) {
  if (calmo) v = 1;
  tracos.forEach(t => { t.style.strokeDashoffset = 1 - v; });
  fim.style.opacity = clamp((v - 0.9) * 10);
}
function destacar(i) {
  $('trSel').setAttribute('d', caminho(series[i]));
  const rot = $('rotSel'), yv = Y(series[i].at(-1)), yi = Y(dados.ipca.at(-1));
  rot.textContent = curto(geo.pontos[i].bairro);
  rot.setAttribute('y', Math.abs(yv - yi) < 16 ? yi + (yv <= yi ? -13 : 23) : yv + 5);
  $('bolaSel').setAttribute('cy', yv);
}

// ---------- CEP
function pontoDoCep(cep) {
  const c5 = +cep.slice(0, 5);
  if (!((c5 >= 1000 && c5 <= 5999) || (c5 >= 8000 && c5 <= 8499))) return -1;
  let melhor = -1, d = Infinity;
  geo.pontos.forEach((p, i) => {
    const q = +p.cep.slice(0, 5), custo = Math.abs(q - c5) + (p.cep.slice(0, 2) === cep.slice(0, 2) ? 0 : 5000);
    if (custo < d) { d = custo; melhor = i; }
  });
  return melhor;
}
function escolher(i, viaCep) {
  estado.ponto = i; estado.cepDado = true;
  const p = geo.pontos[i], r = redesNoPonto[i], nomes = dados.redes.map(x => x.nome.replace(' Atacado', ''));
  $('resBairro').textContent = curto(p.bairro);
  $('resSub').textContent = `Soma dos ${r.n} itens que as ${dados.redes.length} redes vendem neste ponto.`;
  $('redesLista').classList.remove('decidido');
  $('redesLista').innerHTML = r.ordem.map((k, pos) => {
    const rota = rotaDe(i, k), loja = rota && rotas.lojas[rota.loja], dif = r.totais[k] - r.totais[r.melhor];
    const onde = rota ? `<b>${rota.km.toLocaleString('pt-BR')} km</b> até a loja mais próxima${loja.end ? ', ' + loja.end.split(',')[0] : ''}` : 'Sem loja no mapa';
    return `<li class="${pos ? '' : 'melhor'}" data-k="${k}" style="--i:${pos}"><span class="pos">${String(pos + 1).padStart(2, '0')}</span><div><span class="nome">${nomes[k]}</span><span class="onde">${onde}</span></div><span class="val">${reais(r.totais[k])}<small>${pos ? '+ ' + reais(dif) : 'mais barata'}</small></span></li>`;
  }).join('');
  $('resNota').textContent = `Ponto de coleta ${viaCep ? 'mais próximo, pela faixa do CEP' : 'escolhido no mapa'}: ${p.rua}, ${p.cep}. Preço do site de cada rede para esse CEP.`;
  $('resultado').hidden = false;
  document.documentElement.classList.add('com-resultado');
  $('cepMsg').className = 'cep-msg';
  $('cepMsg').textContent = '';
  mapa?.selecionar(i);
  destacar(i);
  cesta.atualizar();
  medir();
  if (scrollY > innerHeight * 0.3) scrollTo({ top: 0, behavior: calmo ? 'auto' : 'smooth' });
}
$('voltar').addEventListener('click', () => {
  mapa?.selecionar(-1);
  estado.cepDado = false;
  $('resultado').hidden = true;
  document.documentElement.classList.remove('com-resultado');
  cesta.atualizar();
  medir();
});
$('redesLista').addEventListener('pointerover', e => { const li = e.target.closest('li'); if (li) mapa?.destacar(+li.dataset.k); });
$('redesLista').addEventListener('pointerleave', () => mapa?.destacar(-1));

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
const cesta = criarCesta(dados, geo, estado);
destacar(iMax);
medir(); cenaDoScroll();
document.fonts.ready.then(() => { medir(); cenaDoScroll(); });
requestAnimationFrame(() => {
  document.documentElement.classList.add('pronto');
  setTimeout(() => rolar($('etqInt'), $('etqCent'), media), calmo ? 0 : 700);
});
