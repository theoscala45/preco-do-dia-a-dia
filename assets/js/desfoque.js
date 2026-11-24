// Texto que entra palavra por palavra, saindo do desfoque e descendo um pouco (BlurText, do React Bits, em JavaScript puro).
// Hoje vale para os títulos grandes (data-titulo). Roda toda vez que o título aparece na tela e volta ao início quando ele sai.
import { aoAparecer } from './aparecer.js';

export function desfocarFrases(gsap, calmo, seletor = '[data-titulo]', { y = -30, blur = 12, duracao = 0.5, passo = 0.05, atraso = 0.03, margem = '0px 0px -10% 0px' } = {}) {
  const toque = matchMedia('(pointer: coarse)').matches;
  const de = { autoAlpha: 0, y: toque ? y * 0.6 : y, filter: `blur(${toque ? blur * 0.5 : blur}px)` };
  const mapa = new WeakMap();
  const alvos = [...document.querySelectorAll(seletor)].filter(p => p.textContent.trim());
  alvos.forEach(p => {
    const palavras = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    const spans = palavras.map((w, i) => {
      const s = document.createElement('span'); s.className = 'dw'; s.textContent = w; p.append(s);
      if (i < palavras.length - 1) p.append(' ');
      return s;
    });
    mapa.set(p, spans);
    p.style.visibility = 'visible';   // o título inteiro já pode aparecer: quem some são as palavras
    if (!calmo) gsap.set(spans, de);
  });
  if (calmo) return;
  const entra = lote => lote.forEach(p => gsap.fromTo(mapa.get(p), de, {
    autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: duracao, ease: 'power3.out', stagger: passo, delay: atraso, overwrite: true,
    clearProps: 'transform,filter,opacity,visibility',
  }));
  const sai = lote => lote.forEach(p => gsap.set(mapa.get(p), { ...de, overwrite: true }));
  aoAparecer(alvos, entra, sai, { margem });
}
