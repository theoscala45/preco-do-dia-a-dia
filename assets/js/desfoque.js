// Texto que entra palavra por palavra, saindo do desfoque e descendo um pouco (BlurText, do React Bits, em JavaScript puro).
// Hoje vale para os títulos grandes (data-titulo). Roda toda vez que o título aparece na tela e volta ao início quando ele sai.
import { aoAparecer } from './aparecer.js';

export function desfocarFrases(gsap, calmo, seletor = '[data-titulo]:not([data-junto])', { y = -30, blur = 12, duracao = 0.65, passo = 0.07, atraso = 0.05, margem = '0px 0px -10% 0px' } = {}) {
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

// Um título que entra inteiro, com todas as palavras juntas: sai do desfoque, sobe um pouco e assenta (data-junto).
export function desfocarJunto(gsap, calmo, seletor = '[data-junto]') {
  const toque = matchMedia('(pointer: coarse)').matches;
  const de = { autoAlpha: 0, y: 34, scale: 0.97, filter: `blur(${toque ? 6 : 14}px)`, transformOrigin: '0% 60%' };
  const alvos = [...document.querySelectorAll(seletor)];
  alvos.forEach(el => { el.style.visibility = 'visible'; if (!calmo) gsap.set(el, de); });
  if (calmo) return;
  const entra = lote => lote.forEach(el => gsap.fromTo(el, de, {
    autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.95, ease: 'power3.out', delay: 0.08, overwrite: true,
    clearProps: 'transform,filter,opacity,visibility,transformOrigin',
  }));
  const sai = lote => lote.forEach(el => gsap.set(el, { ...de, overwrite: true }));
  aoAparecer(alvos, entra, sai, { margem: '0px 0px -10% 0px' });
}
