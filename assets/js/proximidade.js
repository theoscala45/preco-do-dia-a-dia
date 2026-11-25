// Texto que muda de peso conforme o mouse (ou o dedo) chega perto de cada letra (VariableProximity, do React Bits, em JavaScript puro).
// Perto do mouse a letra fica mais pesada: o peso (wght) vai até o máximo da fonte e um contorno fino da mesma cor engorda o desenho. As quebras de linha ficam travadas no peso de repouso, para o texto não pular.
export function proximidade(alvo, { de = 560, para = 900, reforco = 0.025, raio = 150, queda = 'linear', suavizacao = 0.2 } = {}) {
  if (!alvo || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const texto = alvo.textContent.trim();
  const palavras = texto.split(/\s+/);
  alvo.textContent = '';
  const letras = [], blocos = [];
  palavras.forEach((p, i) => {
    const b = document.createElement('span');
    b.style.cssText = 'display:inline-block;white-space:nowrap';
    [...p].forEach(c => {
      const l = document.createElement('span');
      l.textContent = c; l.setAttribute('aria-hidden', 'true');
      l.style.cssText = `display:inline-block;font-variation-settings:'wght' ${de}`;
      b.append(l); letras.push(l);
    });
    blocos.push(b); alvo.append(b);
    if (i < palavras.length - 1) alvo.append(' ');
  });
  const so = document.createElement('span');
  so.textContent = texto;
  so.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap';
  alvo.append(so);

  // trava as quebras de linha no peso de repouso
  const quebras = [];
  const travar = () => {
    quebras.splice(0).forEach(br => br.remove());
    alvo.style.whiteSpace = '';
    let topo = null;
    blocos.forEach((b, i) => {
      const t = b.getBoundingClientRect().top;
      if (topo !== null && t > topo + 2) { const br = document.createElement('br'); b.before(br); quebras.push(br); }
      topo = t;
    });
    // "nowrap" só depois de medir; as <br> mandam nas linhas
    alvo.style.whiteSpace = quebras.length ? 'nowrap' : '';
  };
  const livre = () => { quebras.splice(0).forEach(br => br.remove()); alvo.style.whiteSpace = ''; };
  // as quebras de linha ficam travadas no peso de repouso; as letras podem alargar ao engordar, como no original
  const refazer = () => {
    livre();
    letras.forEach(l => { l.style.width = ''; l.style.fontVariationSettings = `'wght' ${de}`; });
    letras.forEach((l, i) => { l.style.width = ''; escrito[i] = ''; nivel[i] = 0; l.style.webkitTextStroke = ''; });
    travar();
  };
  let largura = -1;
  const ro = new ResizeObserver(([e]) => {
    const w = e.contentRect.width;
    if (Math.abs(w - largura) < 1) return;
    largura = w; refazer();
  });
  ro.observe(alvo.parentElement || alvo);
  document.fonts?.ready.then(refazer);

  const forca = d => {
    if (d >= raio) return 0;
    const n = 1 - d / raio;
    if (queda === 'exponential') return n * n;
    if (queda === 'gaussian') { const e = Math.exp(-2); return (Math.exp(-2 * (d / raio) ** 2) - e) / (1 - e); }
    return n;
  };
  const ponteiro = { x: 0, y: 0, ativo: false };
  const nivel = letras.map(() => 0), meta = letras.map(() => 0), escrito = letras.map(() => '');
  let quadro = 0, antes = 0, sujo = true;
  refazer();
  const passo = agora => {
    quadro = 0;
    const dt = antes ? Math.min(agora - antes, 64) : 16; antes = agora;
    if (sujo) {
      meta.fill(0);
      if (ponteiro.ativo) {
        const r = alvo.getBoundingClientRect();
        const dx = Math.max(r.left - ponteiro.x, 0, ponteiro.x - r.right), dy = Math.max(r.top - ponteiro.y, 0, ponteiro.y - r.bottom);
        if (dx * dx + dy * dy < raio * raio) letras.forEach((l, i) => {
          const q = l.getBoundingClientRect();
          meta[i] = forca(Math.hypot(ponteiro.x - (q.left + q.width / 2), ponteiro.y - (q.top + q.height / 2)));
        });
      }
      sujo = false;
    }
    const k = suavizacao > 0 ? 1 - Math.exp(-dt / (suavizacao * 400)) : 1;
    let mexendo = false;
    letras.forEach((l, i) => {
      let n = nivel[i] + (meta[i] - nivel[i]) * k;
      if (Math.abs(meta[i] - n) < 0.002) n = meta[i]; else mexendo = true;
      nivel[i] = n;
      const w = Math.round(de + (para - de) * n);
      if (escrito[i] !== w + ':' + n.toFixed(2)) {
        escrito[i] = w + ':' + n.toFixed(2);
        l.style.fontVariationSettings = `'wght' ${w}`;
        l.style.webkitTextStroke = n ? `${(reforco * n).toFixed(4)}em currentColor` : '';
      }
    });
    if (mexendo) quadro = requestAnimationFrame(passo); else antes = 0;
  };
  const agendar = () => { sujo = true; if (!quadro) quadro = requestAnimationFrame(passo); };
  const mover = (x, y) => { ponteiro.x = x; ponteiro.y = y; ponteiro.ativo = true; agendar(); };
  const sair = () => { ponteiro.ativo = false; agendar(); };
  addEventListener('mousemove', e => mover(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) mover(t.clientX, t.clientY); }, { passive: true });
  addEventListener('touchend', sair); addEventListener('touchcancel', sair);
  document.documentElement.addEventListener('mouseleave', sair);
  addEventListener('scroll', agendar, { capture: true, passive: true });
  return { refazer };
}
