// A mesma animação de "esticar e juntar" do seletor elástico (segmento.js), para qualquer coisa com duas bordas, como a linha
// laranja do menu: as duas bordas esticam até cobrir o lugar antigo e o novo; a borda da frente chega primeiro (mola), a de trás
// passa um pouco do ponto, achata e assenta. As molas são calculadas aqui, quadro a quadro.

const MOLA_UI = { dur: 0.3, bounce: 0 }, MOLA_SOLTA = { dur: 0.16, bounce: 0 };
const DILATA = 0.19, REPASSE = 0.15, ACHATA = 3;

const SAI = (() => { // cubic-bezier(0.23, 1, 0.32, 1)
  const x1 = 0.23, y1 = 1, x2 = 0.32, y2 = 1;
  return t => { let a = 0, b = 1, u = t; for (let i = 0; i < 24; i++) { u = (a + b) / 2; const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u; if (x < t) a = u; else b = u; } return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u; };
})();

const ativos = new Set(), aoQuadro = new Set();
let laco = 0, ultimo = 0;
const valor = x => ({ x, v: 0, anim: null });
const passo = agora => {
  const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
  for (const m of [...ativos]) {
    const a = m.anim; if (!a) { ativos.delete(m); continue; }
    if (a.tween) {
      a.dec += dt; const p = Math.min(1, a.dec / a.dur);
      m.x = a.de + (a.para - a.de) * SAI(p);
      if (p >= 1) { m.x = a.para; m.v = 0; m.anim = null; ativos.delete(m); a.fim(); }
    } else {
      const k = Math.pow((2 * Math.PI) / a.dur, 2), c = 2 * (1 - a.bounce) * Math.sqrt(k), h = 1 / 240;
      let resto = dt;
      while (resto > 1e-9) { const s = Math.min(h, resto); m.v += (-k * (m.x - a.para) - c * m.v) * s; m.x += m.v * s; resto -= s; }
      if (Math.abs(m.x - a.para) < 0.02 && Math.abs(m.v) < 0.5) { m.x = a.para; m.v = 0; m.anim = null; ativos.delete(m); a.fim(); }
    }
  }
  aoQuadro.forEach(f => f());
  laco = ativos.size ? requestAnimationFrame(passo) : 0;
};
const animar = (m, para, op) => new Promise(fim => {
  if (m.anim) m.anim.fim();
  m.anim = { para, de: m.x, dec: 0, fim, ...op }; ativos.add(m);
  if (!laco) { ultimo = performance.now(); laco = requestAnimationFrame(passo); }
});

// aplicar({ l, r }) recebe as duas bordas a cada quadro. de e para são { l, r }.
export function esticarBordas(aplicar, de, para, { velocidade = 1.55 } = {}) {
  const bL = valor(de.l), bR = valor(de.r), vel = velocidade;
  const quadro = () => aplicar({ l: bL.x, r: bR.x });
  aoQuadro.add(quadro); quadro();
  const dir = Math.sign((para.l + para.r) / 2 - (de.l + de.r) / 2) || 1;
  const tw = { tween: true, dur: DILATA / vel };
  animar(bL, Math.min(de.l, para.l), tw);
  animar(bR, Math.max(de.r, para.r), tw);
  const [lider, liderPara, seguidor, seguidorPara] = dir > 0 ? [bR, para.r, bL, para.l] : [bL, para.l, bR, para.r];
  setTimeout(() => {
    animar(lider, liderPara, { dur: MOLA_UI.dur / vel, bounce: MOLA_UI.bounce });
    animar(seguidor, seguidorPara + dir * ACHATA, { dur: MOLA_UI.dur / vel, bounce: 0 })
      .then(() => animar(seguidor, seguidorPara, { dur: MOLA_SOLTA.dur / vel, bounce: 0 }))
      .then(() => { aoQuadro.delete(quadro); aplicar({ l: para.l, r: para.r }); });
  }, (REPASSE / vel) * 1000);
}
