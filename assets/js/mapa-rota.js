// Mapa pequeno da página da lista: o caminho de carro do ponto de coleta até a loja mais próxima de uma ou duas redes.
// A primeira rede da lista é o destaque (laranja). A rota se desenha quando o mapa entra na tela.
import { novoMapa, camadasDeRota, tracar, degrade, acender, apagar, correrLuz, abrir, caixaDe, marcar, CLARO } from './mapa.js?v=20261127l';
const { gsap, ScrollTrigger } = window;

export function criarMapaDeRota(el, geo, rotas, { calmo = false } = {}) {
  const ml = window.maplibregl;
  const cid = geo.cidade;
  const mapa = novoMapa(el, { bounds: [[cid.oeste, cid.sul], [cid.leste, cid.norte]], fitBoundsOptions: { padding: 30 } });
  const ids = ['ida0', 'ida1', 'ida2'];
  const origem = new ml.Marker({ element: marcar('marca-origem on', '<i></i><b></b>'), anchor: 'center' });
  const marcas = ids.map(() => new ml.Marker({ element: marcar('marca-loja', '<span><b></b><i></i></span>'), anchor: 'bottom', offset: [0, -6] }));
  let pronto = false, naTela = false, pedido = null, tl = null, luz = null;

  mapa.on('load', () => { ids.forEach(id => camadasDeRota(mapa, id)); pronto = true; tocar(); });
  ScrollTrigger.create({ trigger: el, start: 'top 85%', end: 'bottom top', onToggle: s => { naTela = s.isActive; luz?.paused(!naTela); if (naTela) tocar(); } });

  function tocar() {
    if (!pronto || !naTela || !pedido || pedido.tocado) return;
    pedido.tocado = true;
    mapa.resize();   // o cartão pode ter nascido escondido
    const { ponto, linhas, lojas, redes } = pedido, P = geo.pontos[ponto];
    tl?.kill(); luz?.kill(); luz = null;
    ids.forEach((id, n) => {
      tracar(mapa, id, linhas[n]); apagar(mapa, id);
      const m = marcas[n], e = m.getElement();
      e.classList.remove('on', 'melhor');
      if (linhas[n]) { m.setLngLat([lojas[n].lon, lojas[n].lat]).addTo(mapa); e.querySelector('b').textContent = redes[n].nome; } else m.remove();
    });
    origem.setLngLat([P.lon, P.lat]).addTo(mapa);
    origem.getElement().querySelector('b').textContent = P.bairro.split(' (')[0];
    const celular = el.clientWidth < 560;
    mapa.fitBounds(caixaDe(linhas.filter(Boolean).concat([[[P.lon, P.lat]]])), { padding: celular ? { top: 60, bottom: 36, left: 40, right: 70 } : { top: 80, bottom: 60, left: 90, right: 130 }, pitch: 35, bearing: -10, maxZoom: 15, duration: calmo ? 0 : 1800, essential: true });
    const p = ids.map(() => ({ v: 0 }));
    tl = gsap.timeline({ defaults: { duration: 1.4, ease: 'power2.inOut' } });
    // as outras redes primeiro, o destaque por último
    [...linhas.keys()].reverse().forEach(n => {
      if (!linhas[n]) return;
      tl.to(p[n], { v: 1, onUpdate: () => degrade(mapa, ids[n], CLARO, p[n].v), onComplete: () => marcas[n].getElement().classList.add('on') }, tl.duration() ? '>-0.9' : 0.9);
    });
    tl.add(() => {
      acender(mapa, ids[0]);
      marcas[0].getElement().classList.add('melhor');
      if (!calmo) { luz = correrLuz(mapa, ids[0]); luz.paused(!naTela); }
    }, '>0.15');
    if (calmo) tl.progress(1);
  }

  return {
    // redes: [{ id, nome }], a primeira é o destaque. Devolve false se não houver rota para o destaque.
    mostrar(ponto, redes) {
      const r = rotas.pontos.find(q => q.id === geo.pontos[ponto].id) || { redes: {} };
      const achadas = redes.slice(0, ids.length).map(rd => r.redes[rd.id] || null);
      const chave = ponto + ':' + redes.map(rd => rd.id).join(',');
      if (pedido?.chave === chave) return !!achadas[0];
      pedido = { chave, ponto, redes, tocado: false,
        linhas: ids.map((_, n) => (achadas[n] ? abrir(achadas[n].linha) : null)),
        lojas: ids.map((_, n) => (achadas[n] ? rotas.lojas[achadas[n].loja] : null)) };
      tocar();
      return !!achadas[0];
    },
  };
}
