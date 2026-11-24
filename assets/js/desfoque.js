// Frases que entram palavra por palavra, saindo do desfoque e descendo um pouco (BlurText, do React Bits, em JavaScript puro).
// Uso: marque o texto com data-desfoque e chame desfocarFrases(gsap, calmo). Roda toda vez que o texto aparece na tela.
import { aoAparecer } from './aparecer.js';

export function desfocarFrases(gsap, calmo, seletor = '[data-desfoque]') {
  const toque = matchMedia('(pointer: coarse)').matches;
  const de = { autoAlpha: 0, y: -16, filter: `blur(${toque ? 4 : 8}px)` };
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
    p.style.visibility = 'visible';   // o texto inteiro já pode aparecer: quem some são as palavras
    if (!calmo) gsap.set(spans, de);
  });
  if (calmo) return;
  const entra = lote => lote.forEach(p => gsap.fromTo(mapa.get(p), de, {
    autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out', stagger: 0.07, overwrite: true,
    clearProps: 'transform,filter,opacity,visibility',
  }));
  const sai = lote => lote.forEach(p => gsap.set(mapa.get(p), { ...de, overwrite: true }));
  aoAparecer(alvos, entra, sai);
}
