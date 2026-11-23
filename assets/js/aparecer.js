// Avisa quando elementos entram e saem da tela. Usa o IntersectionObserver em vez do ScrollTrigger porque ele também percebe
// elementos que começam escondidos (display: none ou hidden) e aparecem depois, como o resultado da lista, que o ScrollTrigger não vê.
// entra(lista) e sai(lista) recebem os elementos que mudaram na mesma passada, na ordem do documento (serve para escalonar a entrada).
export function aoAparecer(alvos, entra, sai, { margem = '0px 0px -8% 0px' } = {}) {
  const lista = alvos instanceof Element ? [alvos] : [...alvos];
  if (!lista.length || !('IntersectionObserver' in window)) return null;
  const io = new IntersectionObserver(es => {
    const ordem = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    const dentro = es.filter(e => e.isIntersecting).map(e => e.target).sort(ordem);
    const fora = es.filter(e => !e.isIntersecting).map(e => e.target).sort(ordem);
    if (fora.length) sai(fora);
    if (dentro.length) entra(dentro);
  }, { rootMargin: margem });
  lista.forEach(e => io.observe(e));
  return io;
}
