// Seletor elástico (RubberSegment, do React Bits), convertido de React para JavaScript puro.
// O destaque azul estica até a opção nova e encolhe por trás, pode ser arrastado, passa do limite com resistência e volta.
// Uso: segmentoElastico(elementoComBotoes, { aoMudar: (indice, botao) => {} })
// As molas (antes da biblioteca "motion") são calculadas aqui, quadro a quadro.

const MOLA_UI = { dur: 0.3, bounce: 0 }, MOLA_IMPULSO = { dur: 0.4, bounce: 0.2 }, MOLA_SOLTA = { dur: 0.16, bounce: 0 };
const DILATA = 0.19, REPASSE = 0.15, TOQUE = 110, VEL_MAX = 2000, ZONA_MORTA = 4, FOLGA = 10, ELASTICO = 0.55;
const ESTICA = 100, ACHATA = 3, VELOCIDADE = 1.55, DESLIZE = 75;

const limite = (v, a, b) => Math.min(b, Math.max(a, v));
const borracha = (alem, dim) => (alem * dim * ELASTICO) / (dim + ELASTICO * Math.abs(alem));
const projetar = (v, deslize) => { const d = 1 - 0.1 * Math.pow(0.05, deslize / 100); return ((v / 1000) * d) / (1 - d); };
const velocidadeDe = (hist, agora) => {
  const rec = hist.filter(([t]) => agora - t <= 100);
  if (rec.length < 2) return 0;
  const [t0, x0] = rec[0], [t1, x1] = rec[rec.length - 1];
  return t1 - t0 >= 8 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
};
const maisPerto = (casas, x) => {
  let m = 0;
  for (let i = 1; i < casas.length; i++) if (Math.abs((casas[i].l + casas[i].r) / 2 - x) < Math.abs((casas[m].l + casas[m].r) / 2 - x)) m = i;
  return m;
};

// curva cubic-bezier(0.23, 1, 0.32, 1) como função do tempo (0 a 1)
const bezier = (x1, y1, x2, y2) => t => {
  let a = 0, b = 1, u = t;
  for (let i = 0; i < 24; i++) { u = (a + b) / 2; const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u; if (x < t) a = u; else b = u; }
  return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
};
const SAI = bezier(0.23, 1, 0.32, 1);

export function segmentoElastico(trilho, { aoMudar } = {}) {
  const botoes = [...trilho.querySelectorAll('.aba')];
  if (botoes.length < 2) return { destruir() {} };
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let indice = Math.max(0, botoes.findIndex(b => b.getAttribute('aria-pressed') === 'true'));
  let comprometido = indice;

  trilho.classList.add('elastico');
  const polegar = document.createElement('div');
  polegar.className = 'elastico-polegar';
  polegar.setAttribute('aria-hidden', 'true');
  botoes.forEach(b => { const s = document.createElement('span'); s.className = 'aba aba-copia'; s.textContent = b.textContent; polegar.appendChild(s); });
  trilho.appendChild(polegar);

  // ---------- valores animados (as duas bordas do destaque)
  const borda = () => ({ x: 0, v: 0, anim: null, t: 0 });
  const bL = borda(), bR = borda();
  let largura = 0, casas = [], caixa = null, inset = 3, laco = 0, ultimo = 0;
  const desenhar = () => {
    polegar.style.clipPath = `inset(0 ${Math.max(0, largura - bR.x)}px 0 ${Math.max(0, bL.x)}px round 999px)`;
  };
  const parar = b => { if (b.anim) { b.anim.fim(); b.anim = null; } b.v = 0; };
  const pular = (b, x) => { parar(b); b.x = x; };
  const colocar = (b, x) => { const agora = performance.now(), dt = (agora - b.t) / 1000; if (b.anim) { b.anim.fim(); b.anim = null; } if (dt > 0 && dt < 0.2) b.v = (x - b.x) / dt; b.x = x; b.t = agora; };
  const passo = agora => {
    const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
    let vivo = false;
    for (const b of [bL, bR]) {
      const a = b.anim; if (!a) continue;
      if (a.tipo === 'tween') {
        a.dec += dt;
        const p = Math.min(1, a.dec / a.dur), x = a.de + (a.para - a.de) * SAI(p);
        b.v = dt > 0 ? (x - b.x) / dt : 0; b.x = x;
        if (p >= 1) { b.x = a.para; b.v = 0; b.anim = null; a.resolve(); } else vivo = true;
      } else {
        const k = Math.pow((2 * Math.PI) / a.dur, 2), c = 2 * (1 - a.bounce) * Math.sqrt(k), h = 1 / 240;
        let resto = dt;
        while (resto > 1e-9) { const s = Math.min(h, resto); const acel = -k * (b.x - a.para) - c * b.v; b.v += acel * s; b.x += b.v * s; resto -= s; }
        if (Math.abs(b.x - a.para) < 0.02 && Math.abs(b.v) < 0.5) { b.x = a.para; b.v = 0; b.anim = null; a.resolve(); } else vivo = true;
      }
    }
    desenhar();
    laco = vivo ? requestAnimationFrame(passo) : 0;
  };
  const acordar = () => { if (!laco) { ultimo = performance.now(); laco = requestAnimationFrame(passo); } };
  const animar = (b, para, op) => new Promise(resolve => {
    if (b.anim) b.anim.fim();
    const a = { ...op, para, de: b.x, dec: 0, resolve, fim: resolve };
    if (op.vel !== undefined) b.v = op.vel;
    b.anim = a; acordar();
  });

  // ---------- medidas
  const medir = () => {
    caixa = trilho.getBoundingClientRect();
    const dentro = trilho.clientLeft;
    casas = botoes.map(b => { const r = b.getBoundingClientRect(); return { l: r.left - caixa.left - dentro - inset, r: r.right - caixa.left - dentro - inset }; });
    largura = trilho.clientWidth - inset * 2;
    pular(bL, casas[comprometido].l); pular(bR, casas[comprometido].r); desenhar();
  };
  const ro = new ResizeObserver(medir); ro.observe(trilho);
  document.fonts?.ready.then(medir);
  medir();

  let repasse = 0, geracao = 0;
  const saltar = i => { const c = casas[i]; if (!c) return; clearTimeout(repasse); geracao++; pular(bL, c.l); pular(bR, c.r); desenhar(); };
  const marcar = i => {
    indice = i;
    botoes.forEach((b, k) => { b.setAttribute('aria-pressed', k === i); b.tabIndex = k === i ? 0 : -1; });
  };
  const comprometer = i => {
    comprometido = i;
    if (i === indice) return;
    marcar(i);
    trilho.dispatchEvent(new CustomEvent('segmento', { detail: { indice: i, botao: botoes[i] } }));
    aoMudar?.(i, botoes[i]);
  };
  marcar(indice);

  const pousar = (para, v, impulso, achatar) => {
    const alvo = casas[para]; if (!alvo) return;
    const g = ++geracao;
    const dir = Math.sign((alvo.l + alvo.r) / 2 - (bL.x + bR.x) / 2) || 1;
    const [lider, liderPara, seguidor, seguidorPara] = dir > 0 ? [bR, alvo.r, bL, alvo.l] : [bL, alvo.l, bR, alvo.r];
    const velPara = b => limite(v === null ? b.v : v, -VEL_MAX, VEL_MAX);
    const mola = impulso ? MOLA_IMPULSO : MOLA_UI;
    animar(lider, liderPara, { tipo: 'mola', dur: mola.dur / VELOCIDADE, bounce: mola.bounce, vel: velPara(lider) });
    const velSeg = velPara(seguidor);
    if (!achatar || ACHATA <= 0) { animar(seguidor, seguidorPara, { tipo: 'mola', dur: MOLA_UI.dur / VELOCIDADE, bounce: 0, vel: velSeg }); return; }
    animar(seguidor, seguidorPara + dir * ACHATA, { tipo: 'mola', dur: MOLA_UI.dur / VELOCIDADE, bounce: 0, vel: velSeg }).then(() => {
      if (geracao === g) animar(seguidor, seguidorPara, { tipo: 'mola', dur: MOLA_SOLTA.dur / VELOCIDADE, bounce: 0 });
    });
  };
  const viajar = (de, para) => {
    const a = casas[de], b = casas[para]; if (!a || !b) return;
    clearTimeout(repasse); geracao++;
    if (reduz) { pular(bL, b.l); pular(bR, b.r); desenhar(); return; }
    const u = ESTICA / 100, tw = { tipo: 'tween', dur: DILATA / VELOCIDADE };
    animar(bL, b.l + (Math.min(a.l, b.l) - b.l) * u, tw);
    animar(bR, b.r + (Math.max(a.r, b.r) - b.r) * u, tw);
    repasse = setTimeout(() => pousar(para, null, false, true), (REPASSE / VELOCIDADE) * 1000);
  };

  // ---------- ponteiro
  let arrasto = null;
  const localX = e => e.clientX - (caixa ? caixa.left : 0) - trilho.clientLeft - inset;
  const aoApertar = (e, i) => {
    if (arrasto || e.button !== 0) return;
    caixa = trilho.getBoundingClientRect();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    const x = localX(e), noPolegar = x >= bL.x && x <= bR.x;
    arrasto = { id: e.pointerId, x0: x, casa: i, noPolegar, vivo: false, desloc: 0, w: 0, hist: [[e.timeStamp, x]] };
    if (noPolegar) { clearTimeout(repasse); geracao++; parar(bL); parar(bR); }
    else if (!reduz) e.currentTarget.dataset.pressed = '';
  };
  const aoMover = e => {
    const d = arrasto; if (!d || e.pointerId !== d.id || !d.noPolegar) return;
    const x = localX(e);
    d.hist.push([e.timeStamp, x]); if (d.hist.length > 8) d.hist.shift();
    if (!d.vivo) {
      if (Math.abs(x - d.x0) < ZONA_MORTA) return;
      d.vivo = true; d.desloc = x - bL.x; d.w = bR.x - bL.x; trilho.dataset.held = '';
    }
    const l = x - d.desloc, maxL = largura - d.w;
    if (reduz) { const c = limite(l, 0, maxL); colocar(bL, c); colocar(bR, c + d.w); }
    else if (l < 0) { colocar(bL, 0); colocar(bR, d.w - borracha(-l, d.w)); }
    else if (l > maxL) { colocar(bR, largura); colocar(bL, maxL + borracha(l - maxL, d.w)); }
    else { colocar(bL, l); colocar(bR, l + d.w); }
    desenhar();
  };
  const soltar = () => { const d = arrasto; arrasto = null; delete trilho.dataset.held; delete botoes[d.casa]?.dataset.pressed; return d; };
  const aoLargar = e => {
    const d = arrasto; if (!d || e.pointerId !== d.id) return;
    soltar();
    const x = localX(e);
    if (!d.vivo) {
      if (Math.abs(x - d.x0) <= FOLGA && d.casa !== comprometido) { const de = comprometido; comprometer(d.casa); viajar(de, d.casa); }
      return;
    }
    const v = velocidadeDe(d.hist, e.timeStamp), toque = Math.abs(v) > TOQUE;
    let para = maisPerto(casas, (bL.x + bR.x) / 2 + projetar(v, DESLIZE));
    if (toque && para === comprometido) para = limite(para + Math.sign(v), 0, botoes.length - 1);
    comprometer(para);
    if (reduz) { saltar(para); } else pousar(para, v, toque, toque);
  };
  const aoCancelar = e => {
    const d = arrasto; if (!d || e.pointerId !== d.id) return;
    soltar();
    if (!d.vivo) return;
    if (reduz) saltar(comprometido); else pousar(comprometido, null, false, false);
  };
  botoes.forEach((b, i) => b.addEventListener('pointerdown', e => aoApertar(e, i)));
  trilho.addEventListener('pointermove', aoMover);
  trilho.addEventListener('pointerup', aoLargar);
  trilho.addEventListener('pointercancel', aoCancelar);
  trilho.addEventListener('lostpointercapture', aoCancelar);

  // cliques de mouse/toque já foram tratados acima; o clique do teclado (Enter e espaço) escolhe a opção
  trilho.addEventListener('click', e => {
    const i = botoes.indexOf(e.target.closest('.aba'));
    e.stopPropagation();
    if (i >= 0 && e.detail === 0 && i !== comprometido) { const de = comprometido; comprometer(i); viajar(de, i); }
  }, true);
  trilho.addEventListener('keydown', e => {
    const ultimoI = botoes.length - 1; let prox = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') prox = Math.min(ultimoI, indice + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prox = Math.max(0, indice - 1);
    else if (e.key === 'Home') prox = 0; else if (e.key === 'End') prox = ultimoI;
    if (prox === null) return;
    e.preventDefault();
    if (prox === indice) return;
    comprometer(prox); saltar(prox); botoes[prox].focus();
  });

  return { destruir() { ro.disconnect(); cancelAnimationFrame(laco); clearTimeout(repasse); polegar.remove(); trilho.classList.remove('elastico'); } };
}
