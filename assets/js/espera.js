// Espera: a etiqueta de gôndola que balança enquanto os números do preço giram (opção B, escolhida pelo Theo em 26/11/2026).
// Só aparece se algo demorar de verdade: quem tem internet boa nunca a vê.
//  - tela inteira ao abrir uma página: está no HTML de cada página (.espera-tela) e o CSS a mostra depois de 0,8 s;
//    ela some quando a página fica pronta (classe "pronto" no <html>, ver base.js).
//  - símbolo pequeno em cima de um mapa que ainda carrega: aguardar() abaixo.

// Símbolo pequeno com um texto, dentro de "alvo". Espera "atraso" ms antes de aparecer; a função devolvida o tira
// (se for chamada antes do atraso, ele nem chega a aparecer).
export function aguardar(alvo, { texto = 'Carregando o mapa', atraso = 500, classe = '' } = {}) {
  if (!alvo) return () => {};
  let el = null;
  const t = setTimeout(() => {
    el = document.createElement('div');
    el.className = 'espera-selo ' + classe;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="espera-etq-mini" aria-hidden="true"></span><span>${texto}<span class="espera-pts" aria-hidden="true"><i></i><i></i><i></i></span></span>`;
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
