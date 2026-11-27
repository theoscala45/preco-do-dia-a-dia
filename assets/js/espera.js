// Espera: um anel laranja girando em volta da cesta do logo (opção A, escolhida pelo Theo em 27/11/2026).
// Só aparece se algo demorar de verdade: quem tem internet boa nunca a vê.
//  - tela inteira ao abrir uma página: está no HTML de cada página (.espera-tela) e o CSS a mostra depois de 0,8 s;
//    ela some quando a página fica pronta (classe "pronto" no <html>, ver base.js).
//  - símbolo pequeno em cima de um mapa que ainda carrega: aguardar() abaixo.

// Símbolo pequeno com um texto, dentro de "alvo". Espera "atraso" ms antes de aparecer; a função devolvida o tira
// (se for chamada antes do atraso, ele nem chega a aparecer).
const CESTA = '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M20 26V18a12 12 0 0 1 24 0v8" stroke="#16161A" stroke-width="5" stroke-linecap="round"/><path d="M4 26H60L52 58H12Z" fill="#F26A0F" stroke="#F26A0F" stroke-width="3" stroke-linejoin="round"/><path d="M21 33V51M32 33V51M43 33V51" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/></svg>';

export function aguardar(alvo, { texto = 'Carregando o mapa', atraso = 500, classe = '' } = {}) {
  if (!alvo) return () => {};
  let el = null;
  const t = setTimeout(() => {
    el = document.createElement('div');
    el.className = 'espera-selo ' + classe;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="espera-anel pequeno" aria-hidden="true">${CESTA}</span><span>${texto}</span>`;
    alvo.append(el);
    requestAnimationFrame(() => el?.classList.add('on'));
  }, atraso);
  return () => {
    clearTimeout(t);
    if (!el) return;
    const sai = el; el = null;
    sai.classList.remove('on');
    setTimeout(() => sai.remove(), 300);
  };
}
