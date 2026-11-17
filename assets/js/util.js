export const reais = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const partes = v => { const [i, c] = v.toFixed(2).split('.'); return [Number(i).toLocaleString('pt-BR'), ',' + c]; };
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const andando = new WeakMap();

// faz o número rolar do valor atual até o novo (900 ms)
export function rolar(elInt, elCent, alvo) {
  const de = andando.get(elInt)?.valor ?? 0;
  cancelAnimationFrame(andando.get(elInt)?.id);
  const reg = { valor: de, id: 0 };
  andando.set(elInt, reg);
  const t0 = performance.now();
  const passo = agora => {
    const t = calmo ? 1 : Math.min(1, (agora - t0) / 900), e = 1 - Math.pow(1 - t, 4);
    reg.valor = de + (alvo - de) * e;
    const [i, c] = partes(reg.valor);
    elInt.textContent = i; elCent.textContent = c;
    if (t < 1) reg.id = requestAnimationFrame(passo);
  };
  passo(t0);
}
