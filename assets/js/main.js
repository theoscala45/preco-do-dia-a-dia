// Página inicial: o mapa, o CEP, as cenas do scroll e a lista de compras.
import { $, gsap, ScrollTrigger, calmo, reais, pct, curto, rolar, carregar, guarda, ligarCep, iniciar, irPara, semAcento } from './base.js?v=20261125a';
import { criarLista, calcular, ligarBusca, ligarItens } from './cesta.js';
import { pulo } from './cards.js?v=20261124f';
import { caixasDoCep, espera } from './cep-caixas.js?v=20261124z';
import { criarPlacar } from './placar.js?v=20261124v';
import { aoAparecer } from './aparecer.js';
import { compartilhar, salvarFoto } from './compartilhar.js';

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
// A etiqueta da cesta média: cai pendurada pelo furo, passa só um pouco do ponto, dá um balanço curto, o furo estoura,
// o brilho cruza e o preço rola até o valor. Toca toda vez que ela aparece na tela (inclusive na volta do resultado do CEP).
{
  const tag = $('media'), legenda = tag.querySelector('span:first-child');
  let tl = null;
  const zerarTag = () => {
    tl?.kill();
    gsap.set([tag, legenda], { clearProps: 'all' });
    tag.classList.remove('pousou');
    if (!calmo) { gsap.set(tag, { autoAlpha: 0 }); $('etqInt').textContent = '0'; $('etqCent').textContent = ',00'; }
  };
  const tocarTag = () => {
    if (document.documentElement.classList.contains('com-resultado')) return;   // na tela do resultado a etiqueta nem aparece
    if (calmo) { tag.style.removeProperty('visibility'); rolar($('etqInt'), $('etqCent'), media); return; }   // sem movimento: só mostra e põe o preço
    zerarTag();
    tl = gsap.timeline({ onComplete: () => gsap.set([tag, legenda], { clearProps: 'all' }) });
    tl.fromTo(tag, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'power1.out' }, 0)
      .fromTo(tag, { y: -80 }, { y: 0, duration: 0.8, ease: 'back.out(1.1)' }, 0)                                     // cai e passa só um pouco do ponto
      .add(() => tag.classList.add('pousou'), 0.4)                                                                   // o furo estoura e o brilho cruza
      .fromTo(legenda, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 0.5)       // o texto chega depois
      .add(() => rolar($('etqInt'), $('etqCent'), media), 0.5)                                                       // o preço rola
      .fromTo(tag, { rotation: 0, transformOrigin: 'calc(100% - 16px) 16px' }, { keyframes: [                         // um balanço curto no furo, que para logo
        { rotation: -4, duration: 0.24, ease: 'power2.out' }, { rotation: 2.2, duration: 0.28, ease: 'sine.inOut' },
        { rotation: -0.8, duration: 0.26, ease: 'sine.inOut' }, { rotation: 0, duration: 0.24, ease: 'sine.out' }] }, 0.5);
  };
  if (!aoAparecer(tag, tocarTag, zerarTag, { margem: '0px' })) tocarTag();
}

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
// ---------- "Hoje na cidade": redes, bairros e zonas (só contas que o resto da página já faz)
{
  const barra = v => `<span class="barra"><i style="--v:${v.toFixed(3)}"></i></span>`;
  const mediaDe = a => a.reduce((s, x) => s + x, 0) / a.length;
  const sinal = f => { const d = Math.round((f - 1) * 100); return d === 0 ? '0%' : `${d > 0 ? '+' : '−'}${Math.abs(d)}%`; };
  const porRede = dados.redes.map((r, j) => {
    const f = redesNoPonto.map(x => x.fatores[j]).filter(x => x != null);
    return { j, f: f.length ? mediaDe(f) : null, bairros: redesNoPonto.filter(x => x.melhor === j).length };
  }).filter(r => r.f != null).sort((a, b) => a.f - b.f);
  const maiorF = Math.max(...porRede.map(r => r.f));
  $('hojeRedes').innerHTML = porRede.map((r, pos) => `<li${pos ? '' : ' class="melhor"'}><span>${nomes[r.j]}</span>${barra(r.f / maiorF)}<span class="v">${sinal(r.f)}${r.bairros ? `<small>${r.bairros} ${r.bairros === 1 ? 'bairro' : 'bairros'}</small>` : ''}</span></li>`).join('');

  const porBairro = cestas.map((v, i) => ({ i, v })).sort((a, b) => a.v - b.v);
  const linhaBairro = ({ i, v }) => `<li><span>${curto(geo.pontos[i].bairro)}<small>${geo.pontos[i].zona}</small></span><span class="v">${reais(v)}</span></li>`;
  $('hojeBarato').innerHTML = porBairro.slice(0, 3).map(linhaBairro).join('');
  $('hojeCaro').innerHTML = porBairro.slice(-3).reverse().map(linhaBairro).join('');

  const zonas = [...new Set(geo.pontos.map(p => p.zona))].map(z => ({ z, v: mediaDe(cestas.filter((_, i) => geo.pontos[i].zona === z)) })).sort((a, b) => a.v - b.v);
  const maiorZ = Math.max(...zonas.map(z => z.v));
  $('hojeZonas').innerHTML = zonas.map((z, pos) => `<li${pos ? '' : ' class="melhor"'}><span>${z.z}</span>${barra(z.v / maiorZ)}<span class="v">${reais(z.v)}</span></li>`).join('');
  const dia = new Date(dados.datas.at(-1) + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  $('hojeSub').textContent = `Preços lidos até ${dia}, na mesma cesta de ${n} itens.`;
  // placar: de bairro em bairro, do mais barato ao mais caro, vira o nome do bairro e o preço da cesta dali (os mesmos números do resto da página)
  const placarEl = $('placar');
  if (placarEl) {
    const ordemBairros = dados.pontos.map((_, i) => i).sort((a, b) => dados.pontos[a].cesta - dados.pontos[b].cesta);
    const tam = () => Math.round(Math.min(46, Math.max(15, (placarEl.clientWidth / 17 - 4) / 0.78)));
    const placar = criarPlacar(placarEl, {
      gap: 4, fontSize: tam(), tileColor: '#16161A', textColor: '#FFFFFF', tileRadius: 6, flipDuration: 0.1, stagger: 0.05, cycleDelay: 2600, flipsPerChar: 7, depth: 0.55,
      linhas: [
        { rotulo: 'Bairro', padTo: 17, palavras: ordemBairros.map(i => curto(geo.pontos[i].bairro)) },
        { rotulo: `Cesta de ${n} itens`, padTo: 11, charset: 'numeric', textColor: '#FF7A1F', palavras: ordemBairros.map(i => reais(dados.pontos[i].cesta)) },
      ],
    });
    addEventListener('resize', () => placar.tamanho(tam()));
  }
  // as barras crescem toda vez que a seção entra na tela e voltam a zero quando ela sai
  const barrasHoje = gsap.utils.toArray('#hoje .barra i'), alvoBarra = (k, el) => +el.style.getPropertyValue('--v');
  if (!calmo) {
    gsap.set(barrasHoje, { scaleX: 0 });
    const cresce = () => gsap.to(barrasHoje, { scaleX: alvoBarra, duration: 0.8, ease: 'power3.out', stagger: 0.04, overwrite: true });
    const zera = () => gsap.set(barrasHoje, { scaleX: 0, overwrite: true });
    aoAparecer($('hoje'), cresce, zera, { margem: '0px 0px -30% 0px' });
  } else gsap.set(barrasHoje, { scaleX: alvoBarra });
}
// rota e loja mais próxima de cada rede, por ponto (OpenStreetMap)
const rotaDe = (i, k) => rotas.pontos.find(p => p.id === geo.pontos[i].id)?.redes[dados.redes[k].id];

// ---------- mapa
let mapa = null;
try {
  const { criarMapa } = await import('./mapa.js?v=20261125n');
  mapa = criarMapa($('mapa'), geo, rotas, {
    redes: dados.redes.map((r, k) => ({ id: r.id, nome: nomes[k] })),
    var: normal(vars), ordem: i => redesNoPonto[i].ordem, preco: (i, k) => (redesNoPonto[i].totais[k] == null ? null : reais(redesNoPonto[i].totais[k])),
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
      const r = redesNoPonto[hover], k = r.melhor;
      dica.innerHTML = `<b>${curto(p.bairro)}</b>${k == null ? '' : `Mais barato: <strong>${nomes[k]}</strong> ${reais(r.totais[k])}<br>`}<small>Clique para ver todos</small>`;
    }
  }
  if (hover >= 0 && pt) dica.style.transform = `translate(${pt.x + 16}px,calc(${pt.y - 14}px - 100%))`;
});
// quando o mapa decide a rede mais barata, a linha dela na lista responde
mapa?.aoMudar(({ fase }) => {
  if (fase !== 'veredito' || calmo || $('resultado').hidden) return;
  gsap.fromTo('#redesLista .melhor .val', { scale: 1 }, { scale: 1.12, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: '100% 50%' });
});

// ---------- o primeiro capítulo sobe só pelo espaço vazio que sobra no fim da abertura (nunca cobre o que está lá)
{
  const abre = document.querySelector('.abre'), cap1 = document.querySelector('.cap[data-cap="1"]');
  const medir = () => {
    if (!abre || !cap1) return;
    // posições de layout (offsetTop), que não mudam com os transforms da animação de saída da abertura
    const fimDaAbertura = abre.offsetTop + abre.offsetHeight;
    const fimDoConteudo = Math.max(...[...abre.children].filter(c => c.offsetParent !== null).map(c => c.offsetTop + c.offsetHeight));
    const vazio = fimDaAbertura - fimDoConteudo - 56;           // 56 px é o respiro de baixo da própria abertura
    const sobe = Math.max(0, Math.min(vazio - 56, innerHeight * 0.4));   // deixa 56 px de folga e nunca sobe mais que 40% da tela
    const novo = '-' + Math.round(sobe) + 'px';
    if (cap1.style.marginTop !== novo) { cap1.style.marginTop = novo; clearTimeout(medir.t); medir.t = setTimeout(() => ScrollTrigger.refresh(), 120); }
  };
  if (abre && cap1) {
    const ro = new ResizeObserver(medir);
    ro.observe(abre); [...abre.children].forEach(c => ro.observe(c));
    addEventListener('resize', medir);
    document.fonts.ready.then(medir);
    medir();
  }
}

// ---------- o scroll troca a cena do mapa
const passos = [...document.querySelectorAll('#trilha li')];
const cena = c => { mapa?.cena(c); passos.forEach((li, k) => li.classList.toggle('on', k === c - 1)); };
ScrollTrigger.create({ trigger: '.abre', start: 'top bottom', end: 'bottom 50%', onToggle: s => s.isActive && cena(0) });
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
for (let v = Math.ceil(y0); v <= y1; v += 2) g += `<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(22,22,26,.08)" stroke-width="1"/><text x="${R + 86}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
g += `<text x="${L}" y="${B + 24}">${mes(dados.datas[0])}</text><text x="${R}" y="${B + 24}" text-anchor="end">${mes(dados.datas.at(-1))}</text>`;
g += `<path class="tr" d="${caminho(dados.ipca)}" fill="none" stroke="#7C818B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>`;
g += `<path class="tr" id="trSel" d="${caminho(series[0])}" fill="none" stroke="#F26A0F" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>`;
g += `<g class="fim"><circle cx="${R}" cy="${Y(dados.ipca.at(-1))}" r="5" fill="#7C818B" stroke="#FFFFFF" stroke-width="2.5"/><circle id="bolaSel" cx="${R}" r="5" fill="#F26A0F" stroke="#FFFFFF" stroke-width="2.5"/><text class="rot" id="rotSel" x="${R + 12}" style="fill:#F26A0F"></text><text class="rot" x="${R + 12}" y="${Y(dados.ipca.at(-1)) + 5}" style="fill:#7C818B">IPCA</text></g>`;
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
  // no celular a rolagem tem prioridade: nada fica preso a ela quadro a quadro (scrub)
  const leve = matchMedia('(max-width: 860px)').matches;
  // o texto da abertura sobe e apaga enquanto o primeiro capítulo chega
  if (!leve) gsap.to('.abre > *:not(.media)', { y: -70, autoAlpha: 0, ease: 'none', stagger: 0.02, scrollTrigger: { trigger: '.abre', start: 'bottom 88%', end: 'bottom 38%', scrub: true } });
  // trilha lateral: mostra em qual dos três capítulos a leitura está
  gsap.fromTo('#trilha', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, scrollTrigger: { trigger: '#como', start: 'top 70%', endTrigger: '#inflacao', end: 'bottom 60%', toggleActions: 'play reverse play reverse' } });
  gsap.fromTo('#trilha i', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#como', start: 'top 50%', endTrigger: '#inflacao', end: 'bottom 50%', scrub: 0.4 } });
  if (!leve) gsap.utils.toArray('.cap').forEach(cap => {   // no celular o cartão já entra pela revelação comum (uma animação só)
    const caixa = cap.querySelector('.cap-caixa');
    gsap.timeline({ scrollTrigger: { trigger: cap, start: 'top 68%', end: 'bottom 30%', toggleActions: 'play reverse play reverse' } })
      .from(caixa, { autoAlpha: 0, y: 56, duration: 0.8 })
      .from(caixa.children, { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.07 }, '<0.12');
  });
  // as quatro etiquetas de números caem uma depois da outra: queda com quique, achatam ao bater (squash), o furo "estoura" e o texto chega depois.
  // Só vertical, sem girar. Acontece toda vez que a faixa entra na tela (ao abrir a página e ao rolar de volta até ela).
  const etiquetas = gsap.utils.toArray('.faixa-numeros > div');
  gsap.set(etiquetas, { autoAlpha: 0 });
  const faixa = document.querySelector('.faixa-numeros');
  const linhasDoTempo = [];
  const zerarFaixa = () => {
    linhasDoTempo.splice(0).forEach(t => t.kill());
    etiquetas.forEach(el => { gsap.set([el, el.querySelector('span')], { clearProps: 'all' }); el.classList.remove('pousou'); });
    gsap.set(etiquetas, { autoAlpha: 0 });
    faixa.classList.add('entrando');
  };
  zerarFaixa();
  const tocarFaixa = () => {
    zerarFaixa();
    let faltam = etiquetas.length;
    etiquetas.forEach((el, k) => {
      const rotulo = el.querySelector('span');
      const limpar = () => { gsap.set([el, rotulo], { clearProps: 'all' }); el.classList.remove('pousou'); if (--faltam === 0) faixa.classList.remove('entrando'); };
      const tl = gsap.timeline({ delay: 0.15 + k * 0.16, onComplete: limpar });
      linhasDoTempo.push(tl);
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power1.out' }, 0)
        .fromTo(el, { y: -110 }, { y: 0, duration: 1.15, ease: 'bounce.out' }, 0)                                   // a queda: acelera e quica
        .fromTo(rotulo, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 0.5)       // o texto chega depois (follow through)
        .add(() => el.classList.add('pousou'), 0.4)                                                                      // furo estoura e o brilho cruza
        .fromTo(el, { scaleY: 1, scaleX: 1, transformOrigin: '50% 100%' }, { scaleY: 0.9, scaleX: 1.04, duration: 0.07, ease: 'power2.out' }, 0.4)   // squash no primeiro impacto
        .to(el, { scaleY: 1, scaleX: 1, duration: 0.65, ease: 'elastic.out(1, 0.4)' }, 0.47);                         // e volta com mola
    });
  };
  aoAparecer(faixa, tocarFaixa, zerarFaixa, { margem: '0px 0px -12% 0px' });
  // as linhas do gráfico se desenham com o scroll
  gsap.timeline({ scrollTrigger: leve ? { trigger: '#inflacao', start: 'top 70%', toggleActions: 'play none none none' } : { trigger: '#inflacao', start: 'top 55%', end: 'center 42%', scrub: 0.7 } })
    .fromTo('#grafico .tr', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', duration: 1, stagger: 0.012 })
    .fromTo('#grafico .fim', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: 'none' });
});

const efeitoBotao = {};   // preenchido logo abaixo: ok() = salto, anel e faíscas; erro() = o botão balança de um lado para o outro ("uh, uh")
// ---------- botão "Ver meu bairro": com o CEP certo, o botão salta, um anel grande sai dele e faíscas voam em arco
{
  const botaoCep = document.querySelector('#cepForm button[type="submit"]');
  const rand = (a, b) => a + Math.random() * (b - a);
  function faiscas() {
    const host = botaoCep.closest('.cep-linha'); if (!host) return;
    const hb = host.getBoundingClientRect(), bb = botaoCep.getBoundingClientRect();
    const cx = bb.left - hb.left + bb.width / 2, cy = bb.top - hb.top + bb.height / 2, n = 16;
    const cores = ['#F26A0F', '#2448E0', '#FFB27A', '#16161A'];
    for (let k = 0; k < n; k++) {
      const f = document.createElement('i');
      f.className = 'faisca'; f.style.left = cx + 'px'; f.style.top = cy + 'px';
      f.style.background = cores[k % cores.length]; f.style.borderRadius = k % 3 ? '50%' : '2px';
      f.style.width = f.style.height = rand(6, 10) + 'px';
      host.append(f);
      const ang = (k / n) * Math.PI * 2 + rand(-0.25, 0.25), dist = rand(70, 150);
      // em x a faísca desacelera; em y sobe e depois cai com gravidade: juntos fazem um arco
      gsap.timeline({ onComplete: () => f.remove() })
        .fromTo(f, { scale: 0, autoAlpha: 1 }, { scale: 1, duration: 0.15, ease: 'power2.out' }, 0)
        .to(f, { x: Math.cos(ang) * dist, duration: 0.85, ease: 'power2.out' }, 0)
        .to(f, { y: Math.sin(ang) * dist * 0.7 - 34, duration: 0.32, ease: 'power2.out' }, 0)
        .to(f, { y: '+=' + rand(70, 110), duration: 0.55, ease: 'power2.in' }, 0.32)
        .to(f, { autoAlpha: 0, scale: 0.3, duration: 0.3, ease: 'power1.in' }, 0.6);
    }
  }
  efeitoBotao.ok = () => {
    if (!botaoCep) return;
    botaoCep.classList.remove('pulsa'); void botaoCep.offsetWidth; botaoCep.classList.add('pulsa');
    setTimeout(() => botaoCep.classList.remove('pulsa'), 900);   // garante que o anel não fica preso se a animação for interrompida
    if (calmo) return;
    faiscas();
  };
  efeitoBotao.erro = () => {   // CEP inválido: nada de festa, o botão chacoalha forte dizendo "não" (em todo clique)
    if (!botaoCep || calmo) return;
    gsap.killTweensOf(botaoCep);
    gsap.set(botaoCep, { scale: 1, x: 0, rotation: 0 });
    gsap.timeline({ onComplete: () => gsap.set(botaoCep, { clearProps: 'transform' }) })
      .to(botaoCep, { x: -16, rotation: -2.5, duration: 0.06, ease: 'sine.out' })
      .to(botaoCep, { x: 16, rotation: 2.5, duration: 0.1, ease: 'sine.inOut' })
      .to(botaoCep, { x: -13, rotation: -2, duration: 0.1, ease: 'sine.inOut' })
      .to(botaoCep, { x: 13, rotation: 2, duration: 0.1, ease: 'sine.inOut' })
      .to(botaoCep, { x: -8, rotation: -1, duration: 0.09, ease: 'sine.inOut' })
      .to(botaoCep, { x: 8, rotation: 1, duration: 0.09, ease: 'sine.inOut' })
      .to(botaoCep, { x: -3, rotation: 0, duration: 0.08, ease: 'sine.inOut' })
      .to(botaoCep, { x: 0, duration: 0.07, ease: 'sine.out' });
  };
  botaoCep?.addEventListener('click', () => {   // aperta e volta com mola (só quando a espera de 10 s acabou)
    if (calmo || !espera.livre()) return;
    gsap.fromTo(botaoCep, { scale: 0.93 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)', clearProps: 'transform' });
  });
  botaoCep?.addEventListener('animationend', e => { if (e.animationName === 'anel-botao') botaoCep.classList.remove('pulsa'); });
  botaoCep?.addEventListener('animationcancel', () => botaoCep.classList.remove('pulsa'));
}

// ---------- a troca da tela de abertura para a tela do resultado
// Antes o texto e a etiqueta sumiam de uma vez e tudo pulava de lugar. Agora é uma coreografia:
//  1. saída: a etiqueta da cesta cai para fora (squash) e o texto sobe e some (ease-out: sai rápido)
//  2. troca de layout com FLIP: o formulário e o título começam onde estavam e deslizam (slow in, slow out) até o novo lugar
//  3. entrada: o card do resultado sobe de baixo com mola (follow through), as linhas chegam em fila e o selo "mais barata" estoura (secondary action)
function flip(elementos, mudar) {
  const antes = elementos.map(el => el.getBoundingClientRect().top);
  mudar();
  elementos.forEach((el, k) => {
    const dy = antes[k] - el.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) gsap.fromTo(el, { y: dy }, { y: 0, duration: 0.75, ease: 'power3.inOut', clearProps: 'transform' });
  });
}
function transicaoParaResultado() {
  const res = $('resultado'), tit = document.querySelector('.abre .titulo'), form = $('cepForm'), lide = $('lide'), media = $('media');
  // no celular o resultado ocupa a tela com o mapa: o título, o CEP e a etiqueta somem (ver celular.css) e a página volta ao topo
  const movel = matchMedia('(max-width: 860px)').matches, sobre = document.querySelector('.abre .sobre');
  if (movel) irPara(0, { immediate: true, force: true }); else if (scrollY > innerHeight * 0.3) irPara(0);
  gsap.timeline()
    .to(media, { y: 52, scaleY: 0.9, scaleX: 1.03, autoAlpha: 0, duration: 0.36, ease: 'power2.out', transformOrigin: '50% 100%' }, 0)
    .to(lide, { y: -16, autoAlpha: 0, duration: 0.28, ease: 'power2.out' }, 0.04)
    .add(() => {
      const mudar = () => { res.hidden = false; document.documentElement.classList.add('com-resultado'); mapa?.gestos(true); };
      if (movel) { mudar(); gsap.set([tit, form, sobre], { clearProps: 'transform,opacity' }); }
      else {
        flip([tit, form], mudar);
        gsap.from(tit, { autoAlpha: 0.15, duration: 0.5, ease: 'power2.out', clearProps: 'opacity,visibility' });
      }
      gsap.fromTo(res, { autoAlpha: 0, y: 90, scaleY: 0.93, transformOrigin: '50% 0%' }, { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.85, ease: 'back.out(1.4)', delay: 0.1, clearProps: 'transform,opacity,visibility' });
      gsap.from(res.querySelector('header'), { autoAlpha: 0, y: 12, duration: 0.45, ease: 'power2.out', delay: 0.35, clearProps: 'all' });
      gsap.from('#redesLista li', { autoAlpha: 0, x: -20, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.45, clearProps: 'transform,opacity,visibility' });
      gsap.from('#redesLista .melhor .val small', { scale: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)', delay: 1.0, transformOrigin: '100% 50%', clearProps: 'transform' });
      setTimeout(() => ScrollTrigger.refresh(), 1400);
    }, 0.3);
}
function transicaoDeVolta() {
  const res = $('resultado'), tit = document.querySelector('.abre .titulo'), form = $('cepForm'), lide = $('lide'), media = $('media');
  if (matchMedia('(max-width: 860px)').matches) {
    // celular: o resultado sai e o título, o CEP e a frase voltam, um depois do outro
    const sobre = document.querySelector('.abre .sobre');
    gsap.to(res, { autoAlpha: 0, y: 30, duration: 0.25, ease: 'power2.out', onComplete: () => {
      res.hidden = true; gsap.set(res, { clearProps: 'all' });
      document.documentElement.classList.remove('com-resultado'); mapa?.gestos(false);
      gsap.set(lide, { clearProps: 'all' }); gsap.set(media, { autoAlpha: 0 });
      gsap.fromTo([sobre, tit, lide, form], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
      gsap.fromTo(media, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.5 });
      setTimeout(() => ScrollTrigger.refresh(), 1200);
    } });
    return;
  }
  gsap.timeline()
    .to(res, { autoAlpha: 0, y: 40, duration: 0.28, ease: 'power2.out' }, 0)
    .add(() => {
      // só o título desliza; o formulário não passa por cima dele (ele ficaria sobre o título que cresce): some e volta já no lugar
      gsap.set(form, { autoAlpha: 0 });
      flip([tit], () => {
        res.hidden = true; gsap.set(res, { clearProps: 'all' });
        document.documentElement.classList.remove('com-resultado');
        gsap.set(lide, { clearProps: 'all' });
        gsap.set(media, { autoAlpha: 0 });   // a etiqueta volta sozinha: o observador de tela dispara a queda dela
      });
      gsap.fromTo(lide, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out', delay: 0.25, clearProps: 'all' });
      gsap.fromTo(form, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out', delay: 0.55, clearProps: 'transform,opacity,visibility' });
      setTimeout(() => ScrollTrigger.refresh(), 1200);   // a abertura mudou de altura: os gatilhos do scroll medem de novo
    }, 0.26);
}

// ---------- CEP
function escolher(i, viaCep) {
  estado.ponto = i; estado.cepDado = true;
  guarda.gravar('ponto', i);
  const p = geo.pontos[i], r = redesNoPonto[i];
  $('resBairro').textContent = curto(p.bairro);
  $('resSub').textContent = 'Do mais barato ao mais caro, para a mesma cesta.';
  $('redesLista').innerHTML = r.ordem.map((k, pos) => {
    const rota = rotaDe(i, k), loja = rota && rotas.lojas[rota.loja], dif = r.totais[k] - r.totais[r.melhor];
    const onde = rota ? `<b>${rota.km.toLocaleString('pt-BR')} km</b>${loja.end ? ' · ' + loja.end.split(',')[0] : ''}` : 'Sem loja no mapa';
    return `<li class="${pos ? '' : 'melhor'}" data-k="${k}"><span class="pos">${String(pos + 1).padStart(2, '0')}</span><div><span class="nome">${nomes[k]}</span><span class="onde">${onde}</span></div><span class="val">${reais(r.totais[k])}<small>${pos ? '+ ' + reais(dif) : 'mais barata'}</small></span></li>`;
  }).join('');
  $('resNota').textContent = `${viaCep ? 'Bairro mais perto do seu CEP' : 'Bairro escolhido no mapa'}: ${p.rua}, ${p.cep}.`;
  const novo = $('resultado').hidden;
  if (novo && !calmo) transicaoParaResultado();
  else {
    $('resultado').hidden = false;
    document.documentElement.classList.add('com-resultado');
    if (!calmo) gsap.from('#redesLista li', { autoAlpha: 0, x: -14, duration: 0.5, stagger: 0.05 });
  }
  mapa?.selecionar(i);
  destacar(i);
  atualizarCupom();
  ScrollTrigger.refresh();
  if (scrollY > innerHeight * 0.3) irPara(0);
}
$('voltar').addEventListener('click', () => {
  // volta ao topo antes de tudo: com a página rolada, o texto da abertura (que sobe e apaga ao rolar) ficava num meio-termo
  // e o título e o formulário terminavam um em cima do outro
  if (scrollY > 2) irPara(0, { immediate: true, force: true });
  mapa?.selecionar(-1);
  estado.cepDado = false;
  if (calmo) { $('resultado').hidden = true; document.documentElement.classList.remove('com-resultado'); }
  else transicaoDeVolta();
  atualizarCupom();
  ScrollTrigger.refresh();
  setTimeout(() => ScrollTrigger.refresh(), 1100);   // de novo depois que o layout da abertura voltou
});
$('redesLista').addEventListener('pointerover', e => { const li = e.target.closest('li'); if (li) mapa?.destacar(+li.dataset.k); });
$('redesLista').addEventListener('pointerleave', () => mapa?.destacar(-1));
ligarCep(geo, $('cepForm'), $('cep'), $('cepMsg'), i => escolher(i, true));

// o campo de CEP vira 8 caixinhas (cep-caixas.js); o #cep de verdade continua por baixo
const cepCodigo = caixasDoCep({ form: $('cepForm'), campo: $('cep'), msg: $('cepMsg'), aoAcertar: () => efeitoBotao.ok(), aoErrar: () => efeitoBotao.erro() });
$('mapa').addEventListener('ponto', e => escolher(e.detail, false));

// ---------- compartilhar o resultado do CEP e salvar como foto
{
  const resumo = () => {
    const i = estado.ponto, r = redesNoPonto[i], bairro = curto(geo.pontos[i].bairro), k = r.melhor;
    const maior = Math.max(...r.ordem.map(j => r.totais[j]));
    const dia = new Date(dados.datas.at(-1) + 'T12:00').toLocaleDateString('pt-BR');
    return { i, r, bairro, k, maior, dia };
  };
  $('resCompartilhar')?.addEventListener('click', () => {
    const { r, bairro, k } = resumo();
    compartilhar({ titulo: `Onde é mais barato em ${bairro}`, texto: `Em ${bairro}, o ${nomes[k]} é o supermercado mais barato para a mesma cesta de ${n} itens (${reais(r.totais[k])}). Veja o seu bairro:` });
  });
  $('resFoto')?.addEventListener('click', () => {
    const { r, bairro, k, maior, dia } = resumo();
    salvarFoto({
      titulo: bairro, subtitulo: `Cesta de ${n} itens, preços de ${dia}`,
      destaque: { rotulo: 'Mais barato', nome: nomes[k], valor: reais(r.totais[k]) },
      linhas: r.ordem.map((j, pos) => ({ nome: nomes[j], valor: reais(r.totais[j]), v: r.totais[j] / maior, melhor: pos === 0 })),
      rodape: 'A mesma lista de 100 produtos em 10 supermercados',
    }, `preco-do-dia-a-dia-${semAcento(bairro).replace(/[^a-z0-9]+/g, '-')}.png`);
  });
}

// ---------- lista de compras (o resultado completo fica em lista.html)
// a lista em cada supermercado, em barras, do mais barato ao mais caro
function desenharRanking() {
  // primeiro as redes que têm a lista inteira, do total menor ao maior; as que não têm tudo ficam embaixo, à parte
  const redes = calc.porRede.filter(r => r.faltam < lista.itens.length), maior = Math.max(...redes.map(r => r.total));
  const linha = r => `<li${r.faltam ? ' class="incompleta"' : ''}><span>${nomes[r.k]}</span><span class="barra"><i style="--v:${(r.total / maior).toFixed(3)}"></i></span><span class="v">${reais(r.total)}${r.faltam ? `<small>sem ${r.faltam} ${r.faltam > 1 ? 'itens' : 'item'}</small>` : ''}</span></li>`;
  const cheias = redes.filter(r => !r.faltam).sort((a, b) => a.total - b.total), faltando = redes.filter(r => r.faltam).sort((a, b) => a.faltam - b.faltam || a.total - b.total);
  $('rankLista').innerHTML = cheias.map(linha).join('') + (faltando.length ? `<li class="divisa">Não têm a lista inteira</li>${faltando.map(linha).join('')}` : '');
  $('rankNota').textContent = '';
  const barras = gsap.utils.toArray('#rankLista i'), v = (k, el) => +el.style.getPropertyValue('--v');
  if (calmo) gsap.set(barras, { scaleX: v });
  else gsap.fromTo(barras, { scaleX: 0 }, { scaleX: v, duration: 0.8, ease: 'power3.out', stagger: 0.04 });
}
const lista = criarLista(dados);
let calc = null;
function desenharCupom() {
  const tem = lista.itens.length > 0, pt = geo.pontos[estado.ponto];
  $('cupomVazio').hidden = tem;
  $('cupomTotal').hidden = !tem;
  $('cestaPonto').textContent = estado.cepDado
    ? `Preços do bairro ${curto(pt.bairro)}.`
    : `Sem CEP, a conta usa ${curto(pt.bairro)}. Digite seu CEP no topo para trocar.`;
  $('rankRedes').hidden = !tem;
  if (!tem) { calc = null; return; }
  calc = calcular(dados, lista.itens, estado.ponto);
  const { melhor, dupla, vale } = calc;
  $('totLoja').textContent = melhor.rede.nome;
  rolar($('totInt'), $('totCent'), melhor.total);
  pulo($('totInt').parentElement);   // o total "pula" quando a conta muda: feedback que mostra o que mudou
  $('totFalta').textContent = melhor.faltam ? `${melhor.faltam} ${melhor.faltam > 1 ? 'itens indisponíveis' : 'item indisponível'} nesta rede. O total não conta com ${melhor.faltam > 1 ? 'eles' : 'ele'}.` : '';
  $('totDuas').hidden = !vale;
  desenharRanking();
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
if (cepSalvo) { $('cep').value = cepSalvo; cepCodigo.definir(cepSalvo); }
if (pontoSalvo >= 0 && pontoSalvo < geo.pontos.length) { estado.ponto = pontoSalvo; estado.cepDado = true; }
destacar(estado.cepDado ? estado.ponto : iMax);
atualizarCupom();
