// Campo de código em caixinhas (CodeSlots, do React Bits), convertido de React para JavaScript puro.
// Cada número cai na sua caixa com uma mola; ao acertar, uma faixa cobre as caixas com um ✓; ao errar, os números afundam e somem.
// Uso: const c = criarCodigo(elemento, { length: 8, separador: 5, aoMudar: codigo => {}, aoCompletar: codigo => {} });
//      c.status('idle' | 'success' | 'error'); c.definir('05422000'); c.foco(); c.destruir();
// As molas (antes da biblioteca "motion") são calculadas aqui, quadro a quadro.

const SAI = (() => { // cubic-bezier(0.23, 1, 0.32, 1)
  const x1 = 0.23, y1 = 1, x2 = 0.32, y2 = 1;
  return t => { let a = 0, b = 1, u = t; for (let i = 0; i < 24; i++) { u = (a + b) / 2; const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u; if (x < t) a = u; else b = u; } return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u; };
})();
const lim01 = v => Math.min(1, Math.max(0, v));
const soDigitos = t => String(t ?? '').replace(/\D/g, '');

// ---------- motor de valores animados
const valor = x => ({ x, v: 0, anim: null });
let ativos = new Set(), laco = 0, ultimo = 0, aoQuadro = new Set();
const passo = agora => {
  const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
  for (const m of [...ativos]) {
    const a = m.anim; if (!a) { ativos.delete(m); continue; }
    if (a.espera > 0) { a.espera -= dt; continue; }
    if (a.tween) {
      a.dec += dt; const p = Math.min(1, a.dec / a.dur);
      m.x = a.de + (a.para - a.de) * SAI(p);
      if (p >= 1) { m.x = a.para; m.v = 0; m.anim = null; ativos.delete(m); a.fim(); }
    } else {
      const k = Math.pow((2 * Math.PI) / a.dur, 2), c = 2 * (1 - a.bounce) * Math.sqrt(k), h = 1 / 240;
      let resto = dt;
      while (resto > 1e-9) { const s = Math.min(h, resto); m.v += (-k * (m.x - a.para) - c * m.v) * s; m.x += m.v * s; resto -= s; }
      if (Math.abs(m.x - a.para) < 0.0008 && Math.abs(m.v) < 0.01) { m.x = a.para; m.v = 0; m.anim = null; ativos.delete(m); a.fim(); }
    }
  }
  aoQuadro.forEach(f => f());
  laco = ativos.size ? requestAnimationFrame(passo) : 0;
};
const acordar = () => { if (!laco) { ultimo = performance.now(); laco = requestAnimationFrame(passo); } };
const pular = (m, x) => { if (m.anim) { m.anim.fim(); m.anim = null; ativos.delete(m); } m.x = x; m.v = 0; };
const animar = (m, para, { dur = 0.3, bounce = 0, atraso = 0, tween = false } = {}) => new Promise(fim => {
  if (m.anim) m.anim.fim();
  m.anim = { para, de: m.x, dur, bounce, tween, espera: atraso, dec: 0, fim }; ativos.add(m); acordar();
});

const ICONE_OK = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';

export function criarCodigo(host, opcoes = {}) {
  const o = { length: 8, separador: 0, rotulo: 'Código', bounce: 0.2, settle: 0.3, rise: 8, cascade: 20, aoMudar: null, aoCompletar: null, ...opcoes };
  const n = o.length;
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let chars = Array(n).fill(''), ativa = 0, foco = false, estado = 'idle', coberto = false, drenando = false, relogio = 0, tamanho = 44;
  const fill = Array.from({ length: n }, () => valor(0)), queda = Array.from({ length: n }, () => valor(0));
  const abre = valor(0), visto = valor(0), cursor = valor(0);

  // ---------- DOM
  host.classList.add('code-slots');
  host.innerHTML = '';
  const linha = document.createElement('div'); linha.className = 'code-slots__row'; linha.dataset.status = 'idle';
  const entrada = document.createElement('input');
  Object.assign(entrada, { className: 'code-slots__input', type: 'text', inputMode: 'numeric', autocomplete: 'off' });
  entrada.setAttribute('aria-label', o.rotulo); entrada.setAttribute('autocapitalize', 'off'); entrada.setAttribute('autocorrect', 'off');
  linha.appendChild(entrada);
  const caixas = [], digitos = [], miolos = [];
  for (let i = 0; i < n; i++) {
    if (o.separador && i === o.separador) { const s = document.createElement('span'); s.className = 'code-slots__sep'; s.setAttribute('aria-hidden', 'true'); linha.appendChild(s); }
    const c = document.createElement('span'); c.className = 'code-slots__slot'; c.setAttribute('aria-hidden', 'true');
    const f = document.createElement('span'); f.className = 'code-slots__fill';
    const d = document.createElement('span'); d.className = 'code-slots__digit';
    c.append(f, d); linha.appendChild(c); caixas.push(c); miolos.push(f); digitos.push(d);
  }
  const lavagem = document.createElement('span'); lavagem.className = 'code-slots__wash'; lavagem.setAttribute('aria-hidden', 'true');
  const marca = document.createElement('span'); marca.className = 'code-slots__check'; marca.innerHTML = ICONE_OK; lavagem.appendChild(marca);
  const caret = document.createElement('span'); caret.className = 'code-slots__caret'; caret.setAttribute('aria-hidden', 'true');
  const caretLinha = document.createElement('span'); caretLinha.className = 'code-slots__caret-line'; caret.appendChild(caretLinha);
  linha.append(lavagem, caret);
  const sr = document.createElement('span'); sr.className = 'code-slots__sr'; sr.setAttribute('aria-live', 'polite');
  host.append(linha, sr);

  // ---------- desenho (um quadro)
  const raioLavagem = () => Math.min(parseFloat(getComputedStyle(host).getPropertyValue('--cs-radius')) || 10, tamanho / 2);
  const desenhar = () => {
    const afunda = Math.round(tamanho * 1.18 * 0.5);
    for (let i = 0; i < n; i++) {
      const t = fill[i].x, d = queda[i].x;
      miolos[i].style.transform = `scale(${Math.max(t, 0)})`;
      digitos[i].style.transform = `translateY(${(1 - t) * o.rise + Math.max(d, 0) * afunda}px)`;
      digitos[i].style.opacity = lim01(t) * (1 - lim01(d / 0.6));
    }
    lavagem.style.clipPath = `inset(0 ${(1 - lim01(abre.x)) * 50}% round ${raioLavagem()}px)`;
    marca.style.transform = `translateY(${(1 - visto.x) * 8}px) scale(${0.85 + 0.15 * Math.max(visto.x, 0)})`;
    marca.style.opacity = lim01(visto.x);
    caret.style.transform = `translateX(${cursor.x}px)`;
  };
  aoQuadro.add(desenhar);
  const alvoCursor = () => { const c = caixas[ativa]; return c ? c.offsetLeft + c.offsetWidth / 2 - 0.75 : 0; };
  const mostrarCursor = () => {
    const vis = foco && !coberto && estado !== 'success' && (estado === 'error' || !chars[ativa]);
    caret.toggleAttribute('data-show', vis);
  };
  const moverAtiva = prox => { ativa = prox; if (reduz) pular(cursor, alvoCursor()); else animar(cursor, alvoCursor(), { dur: 0.14, bounce: 0 }); mostrarCursor(); marcarAtiva(); };
  const pularAtiva = prox => { ativa = prox; pular(cursor, alvoCursor()); mostrarCursor(); marcarAtiva(); desenhar(); };
  const marcarAtiva = () => caixas.forEach((c, i) => c.toggleAttribute('data-active', foco && i === ativa));
  const anunciar = () => { sr.textContent = estado === 'success' ? 'Código aceito' : `${chars.filter(Boolean).length} de ${n} números`; };

  // ---------- caixas
  const primeiraVazia = () => { const i = chars.indexOf(''); return i === -1 ? n - 1 : i; };
  const cheio = () => chars.every(Boolean);
  const guiar = (i, para, atrasoMs = 0) => {
    if (reduz) { pular(fill[i], para); desenhar(); return; }
    animar(fill[i], para, { dur: o.settle, bounce: o.bounce, atraso: atrasoMs / 1000 });
  };
  const cair = (i, atrasoMs = 0) => { if (fill[i].x > 0) pular(fill[i], 0); guiar(i, 1, atrasoMs); };
  const comprometer = prox => {
    const antes = chars; chars = prox;
    const codigo = chars.join('');
    o.aoMudar?.(chars.map(c => c || ' ').join('').trimEnd());   // caixa vazia no meio aparece como espaço
    if (!antes.every(Boolean) && cheio()) o.aoCompletar?.(codigo);
    anunciar();
  };
  const ocupado = () => drenando || estado === 'success';
  const inserir = (bruto, de = ativa) => {
    const ds = soDigitos(bruto); if (!ds) return;
    const prox = [...chars]; const passoMs = reduz ? 0 : o.cascade; let i = de;
    for (const ch of ds) { if (i >= n) break; prox[i] = ch; digitos[i].textContent = ch; cair(i, (i - de) * passoMs); i++; }
    if (i === de) return;
    comprometer(prox); moverAtiva(Math.min(i, n - 1));
  };
  const limparCaixa = (i, voltar = false) => {
    if (!chars[i]) { if (voltar) pularAtiva(i); return; }
    const prox = [...chars]; prox[i] = ''; guiar(i, 0); comprometer(prox);
    if (voltar) moverAtiva(i);
  };

  // ---------- eventos
  const aoTeclar = e => {
    if (ocupado() || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) { e.preventDefault(); inserir(k); }
    else if (k === 'Backspace') { e.preventDefault(); if (chars[ativa]) limparCaixa(ativa); else if (ativa > 0) limparCaixa(ativa - 1, true); }
    else if (k === 'Delete') { e.preventDefault(); limparCaixa(ativa); }
    else if (k === 'ArrowLeft') { e.preventDefault(); pularAtiva(Math.max(ativa - 1, 0)); }
    else if (k === 'ArrowRight') { e.preventDefault(); pularAtiva(Math.min(ativa + 1, n - 1)); }
    else if (k === 'Home') { e.preventDefault(); pularAtiva(0); }
    else if (k === 'End') { e.preventDefault(); pularAtiva(n - 1); }
  };
  entrada.addEventListener('keydown', aoTeclar);
  entrada.addEventListener('paste', e => { if (ocupado()) return; e.preventDefault(); const ds = soDigitos(e.clipboardData.getData('text')); inserir(ds, ds.length >= n ? 0 : ativa); });
  // O campo escondido guarda sempre um caractere invisível. Assim o teclado do celular (Android) também avisa quando o Backspace é
  // apertado (sem isso, apagar não faz nada) e os números digitados chegam inteiros, sem depender da tecla.
  const SENTINELA = '\u200b';
  const rearmar = () => { entrada.value = SENTINELA; try { entrada.setSelectionRange(1, 1); } catch {} };
  rearmar();
  entrada.addEventListener('input', e => {
    const v = entrada.value, apagou = (e.inputType || '').startsWith('delete') || v.indexOf(SENTINELA) === -1;
    const ds = soDigitos(v);
    rearmar();
    if (ocupado()) return;
    if (apagou && !ds) { if (chars[ativa]) limparCaixa(ativa); else if (ativa > 0) limparCaixa(ativa - 1, true); return; }
    if (ds) inserir(ds, ds.length >= n ? 0 : ativa);   // um código inteiro (preenchimento automático) começa da 1ª caixa
  });
  entrada.addEventListener('focus', () => { foco = true; mostrarCursor(); marcarAtiva(); });
  entrada.addEventListener('blur', () => { foco = false; mostrarCursor(); marcarAtiva(); });
  linha.addEventListener('mousedown', e => {
    e.preventDefault();
    if (!ocupado()) {
      let i = caixas.findIndex(c => { const r = c.getBoundingClientRect(); return e.clientX < r.right + 3; });
      if (i < 0) i = n - 1;
      pularAtiva(Math.max(0, Math.min(i, n - 1)));
    }
    entrada.focus();
  });

  // ---------- estados de fora
  const status = novo => {
    if (novo === estado) return;
    const era = estado; estado = novo; linha.dataset.status = novo;
    if (novo === 'success') {
      coberto = true;
      if (reduz) { pular(abre, 1); pular(visto, 1); queda.forEach(q => pular(q, 1)); }
      else {
        animar(abre, 1, { dur: 0.3, tween: true });
        queda.forEach((q, k) => animar(q, 1, { dur: 0.3, bounce: 0, atraso: 0.06 + k * 0.03 }));
        animar(visto, 1, { dur: 0.35, bounce: o.bounce, atraso: 0.28 });
      }
    } else if (era === 'success') {
      if (reduz) { pular(abre, 0); pular(visto, 0); queda.forEach(q => pular(q, 0)); coberto = false; }
      else {
        animar(visto, 0, { dur: 0.15, tween: true });
        animar(abre, 0, { dur: 0.2, tween: true, atraso: 0.06 }).then(() => { if (abre.x === 0) { coberto = false; mostrarCursor(); } });
        queda.forEach(q => animar(q, 0, { dur: 0.3, bounce: 0, atraso: 0.1 }));
      }
    }
    if (novo === 'error') {
      const cheias = chars.map((c, i) => (c ? i : -1)).filter(i => i >= 0).reverse();
      if (cheias.length) {
        drenando = true; const passoMs = reduz ? 0 : o.cascade;
        cheias.forEach((i, k) => guiar(i, 0, k * passoMs));
        moverAtiva(0);
        clearTimeout(relogio);
        relogio = setTimeout(() => { drenando = false; comprometer(Array(n).fill('')); }, reduz ? 300 : (cheias.length - 1) * passoMs + o.settle * 1000);
      }
    }
    mostrarCursor(); anunciar(); desenhar();
  };

  // ---------- valor vindo de fora (preenchimento automático, CEP salvo): sem disparar aoMudar
  const definir = texto => {
    const ds = soDigitos(texto).slice(0, n), prox = Array.from({ length: n }, (_, i) => ds[i] ?? '');
    if (prox.join('') === chars.join('')) return;
    const mudou = prox.map((c, i) => (c !== chars[i] ? i : -1)).filter(i => i >= 0);
    mudou.forEach((i, k) => { if (prox[i]) { digitos[i].textContent = prox[i]; cair(i, k * (reduz ? 0 : o.cascade)); } else guiar(i, 0); });
    chars = prox; ativa = primeiraVazia(); pular(cursor, alvoCursor()); mostrarCursor(); anunciar(); desenhar();
  };

  // ---------- tamanho: cabe na largura disponível (celular)
  const ajustar = () => {
    const pai = host.parentElement; let livre = pai?.clientWidth || 380;
    if (pai && getComputedStyle(pai).flexWrap === 'nowrap') livre -= [...pai.children].filter(c => c !== host && getComputedStyle(c).position !== 'absolute').reduce((t, c) => t + c.offsetWidth + 10, 0);   // botão ao lado, na mesma linha
    const disp = Math.min(livre, innerWidth - 40, 400), gap = 6, sep = o.separador ? 14 : 0;
    tamanho = Math.max(28, Math.min(44, Math.floor((disp - gap * (n - 1) - sep) / n)));
    host.style.setProperty('--cs-size', tamanho + 'px'); host.style.setProperty('--cs-height', Math.round(tamanho * 1.18) + 'px');
    host.style.setProperty('--cs-gap', gap + 'px'); host.style.setProperty('--cs-font', Math.round(tamanho * 0.5) + 'px');
    host.style.setProperty('--cs-radius', Math.min(10, tamanho / 2) + 'px'); host.style.setProperty('--cs-sep', sep ? sep - gap + 'px' : '0px');
    pular(cursor, alvoCursor()); desenhar();
  };
  const ro = new ResizeObserver(ajustar); if (host.parentElement) ro.observe(host.parentElement);
  addEventListener('resize', ajustar);
  document.fonts?.ready.then(ajustar);
  ajustar(); anunciar();

  return {
    status, definir, foco: () => entrada.focus(),
    get valor() { return chars.join(''); },
    destruir() { ro.disconnect(); removeEventListener('resize', ajustar); aoQuadro.delete(desenhar); clearTimeout(relogio); host.innerHTML = ''; host.classList.remove('code-slots'); },
  };
}
