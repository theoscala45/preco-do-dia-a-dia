// Movimento dos cards do site. Um só lugar para o jeito de os cards entrarem e responderem.
//
// Princípios usados (e onde aparecem):
//  - Entrada em arco: o card anda em x (ease-out forte) e em y (back.out) com curvas diferentes, então o caminho curva.
//  - Squash and stretch: ao pousar, o card achata um pouco e volta (elastic).
//  - Follow through e secondary action: o overshoot do back.out e o conteúdo de dentro, que chega um instante depois.
//  - Snappy timing e Doherty: o card fica visível em 0,3 s; nada de interação espera a animação acabar.
//  - Frequência de uso: na primeira vez que a página aparece na sessão a entrada é expressiva; nas vezes seguintes é só um respiro curto.
//  - Reduzir movimento: tudo isto só roda para quem não pediu menos movimento (ver base.js).
const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

const ALVOS = '.cartao[data-surge], .hoje-bloco[data-surge], .porta[data-surge]';
const FORTE = 'cubic-bezier(0.23, 1, 0.32, 1)';   // ease-out forte da interface

// a página já foi vista nesta sessão? (guarda na primeira vez)
function jaVista() {
  const chave = 'pdd:cards:' + location.pathname;
  try { const v = sessionStorage.getItem(chave); sessionStorage.setItem(chave, '1'); return !!v; } catch { return false; }
}

export function entradaDosCards() {
  const cards = [...document.querySelectorAll(ALVOS)];
  if (!cards.length) return;
  const rapido = jaVista();
  const estreito = matchMedia('(max-width: 860px)').matches;
  cards.forEach(c => { c.removeAttribute('data-surge'); c.setAttribute('data-card', ''); });
  gsap.set(cards, { autoAlpha: 0 });
  // quando termina, o card volta ao CSS: sem estilo preso no elemento, o hover e o foco (que usam transform e opacity) funcionam
  const liberar = c => { c.removeAttribute('data-card'); gsap.set(c, { clearProps: 'all' }); };

  function entrar(c, i) {
    if (rapido) {
      gsap.fromTo(c, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: FORTE, delay: i * 0.04, onComplete: () => liberar(c) });
      return;
    }
    const lado = i % 2 ? 1 : -1, ladoPx = estreito ? 10 : 28;
    const tl = gsap.timeline({ delay: i * 0.09, onComplete: () => liberar(c) });
    tl.fromTo(c, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' }, 0)
      .fromTo(c, { x: lado * ladoPx }, { x: 0, duration: 0.75, ease: 'power3.out' }, 0)            // em x: freia no fim
      .fromTo(c, { y: 36 }, { y: 0, duration: 0.8, ease: 'back.out(1.7)' }, 0)                     // em y: passa do ponto e volta (curva o caminho)
      .fromTo(c, { scaleX: 1.02, scaleY: 0.955, transformOrigin: '50% 100%' }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, 0.3);   // squash ao pousar
    const filhos = [...c.children].slice(0, 10);
    if (filhos.length) tl.from(filhos, { autoAlpha: 0, y: 10, duration: 0.45, stagger: 0.05, ease: 'power2.out', clearProps: 'all' }, 0.18);   // o conteúdo chega depois do card
  }
  ScrollTrigger.batch(cards, { start: 'top 92%', once: true, onEnter: lote => lote.forEach(entrar) });
}

// um "pulo" de feedback: o elemento cresce de repente e volta com mola. Serve para totais que mudam e botões que confirmam.
export function pulo(el, forca = 1.1) {
  if (!el || calmo) return;
  gsap.fromTo(el, { scale: forca }, { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)', transformOrigin: '0% 60%', overwrite: 'auto', clearProps: 'transform' });
}
