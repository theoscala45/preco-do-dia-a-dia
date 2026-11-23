// Página inicial: o CEP, o mapa e o resultado do bairro.
import { $, gsap, ScrollTrigger, calmo, reais, pct, curto, rolar, carregar, guarda, ligarCep, iniciar, irPara } from './base.js';

const [dados, geo, rotas] = await carregar('dados', 'geo', 'rotas');
iniciar(dados);

const nomes = dados.redes.map(r => r.nome.replace(' Atacado', ''));
const cestas = dados.pontos.map(p => p.cesta), vars = dados.pontos.map(p => p.var);
const normal = a => { const mn = Math.min(...a), mx = Math.max(...a); return a.map(v => (v - mn) / (mx - mn || 1)); };
const media = cestas.reduce((s, v) => s + v, 0) / cestas.length;
const n = dados.itens_na_cesta;

$('mediaRotulo').textContent = `Cesta de ${n} itens, média da cidade`;
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

// o mapa só anima enquanto está na tela
ScrollTrigger.create({ trigger: '.cena', start: 'top bottom', end: 'bottom top', onToggle: s => mapa?.ativo(s.isActive) });

// ---------- CEP
function escolher(i, viaCep) {
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
  ScrollTrigger.refresh();
  if (scrollY > innerHeight * 0.3) irPara(0);
}
$('voltar').addEventListener('click', () => {
  mapa?.selecionar(-1);
  $('resultado').hidden = true;
  document.documentElement.classList.remove('com-resultado');
  ScrollTrigger.refresh();
});
$('redesLista').addEventListener('pointerover', e => { const li = e.target.closest('li'); if (li) mapa?.destacar(+li.dataset.k); });
$('redesLista').addEventListener('pointerleave', () => mapa?.destacar(-1));
ligarCep(geo, $('cepForm'), $('cep'), $('cepMsg'), i => escolher(i, true));
$('mapa').addEventListener('ponto', e => escolher(e.detail, false));

// se a pessoa já deu o CEP numa visita anterior, o campo volta preenchido
const cepSalvo = guarda.ler('cep', '');
if (cepSalvo) $('cep').value = cepSalvo;
