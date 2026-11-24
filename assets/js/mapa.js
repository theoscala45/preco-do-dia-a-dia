// Mapa real de São Paulo (MapLibre + OpenStreetMap). A cidade inteira aparece primeiro; com um CEP a câmera
// desce até o ponto de coleta e desenha o caminho de carro até a loja mais próxima de cada rede (ver DESIGN.md, "Mapa").
// A sequência das rotas é uma linha do tempo do GSAP.
const { gsap } = window;
export const LARANJA = '#F26A0F', CLARO = '#7A7A82', NADA = 'rgba(0,0,0,0)';
export const ESTILO = 'assets/mapa-estilo.json';
const DEMO = 5;   // sem CEP, a cena das redes mostra Pinheiros
// câmera da cidade inteira em cada cena do scroll: [giro, inclinação]
const CAMERA = [[-8, 38], [14, 46], [0, 0], [-18, 30]];
const OPACO = ['interpolate', ['linear'], ['zoom'], 10.4, 1, 11.6, 0];

// polyline do OSRM (precisão 5) -> [[lon, lat], ...]
export function abrir(txt) {
  const pts = []; let i = 0, lat = 0, lon = 0;
  const prox = () => { let r = 0, s = 0, b; do { b = txt.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32); return r & 1 ? ~(r >> 1) : r >> 1; };
  while (i < txt.length) { lat += prox(); lon += prox(); pts.push([lon / 1e5, lat / 1e5]); }
  return pts;
}
export const caixaDe = linhas => {
  const c = [[180, 90], [-180, -90]];
  for (const l of linhas) for (const [x, y] of l) { c[0][0] = Math.min(c[0][0], x); c[0][1] = Math.min(c[0][1], y); c[1][0] = Math.max(c[1][0], x); c[1][1] = Math.max(c[1][1], y); }
  return c;
};
export const marcar = (classe, html) => { const e = document.createElement('div'); e.className = classe; e.innerHTML = html; return e; };
// opções comuns a todos os mapas do site. No toque, o mapa só se move com dois dedos, para não prender o scroll.
export function novoMapa(el, extra = {}) {
  const ml = window.maplibregl;
  if (!ml) throw new Error('MapLibre não carregou');
  const toque = matchMedia('(pointer: coarse)').matches;
  const mapa = new ml.Map({
    container: el, style: ESTILO, attributionControl: false, cooperativeGestures: toque, scrollZoom: false,
    dragRotate: false, pitchWithRotate: false, touchPitch: false, minZoom: 8, maxZoom: 17, maxPitch: 60,
    locale: { 'CooperativeGesturesHandler.MobileHelpText': 'Use dois dedos para mover o mapa', 'NavigationControl.ZoomIn': 'Aproximar', 'NavigationControl.ZoomOut': 'Afastar' },
    ...extra,
  });
  mapa.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right');
  if (!toque) mapa.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right');
  mapa.touchZoomRotate.disableRotation();
  // a rodinha sozinha rola a página (o mapa fica atrás do texto); com Ctrl ou ⌘ apertado, ou com a pinça do touchpad, ela aproxima só o mapa.
  // No início o mapa ocupa a tela toda, então a pinça vale em qualquer ponto da cena (também sobre o texto).
  const regiao = el.closest('.cena') || mapa.getContainer();
  const aproximar = e => {
    if (!(e.target instanceof Node) || !regiao.contains(e.target)) return;   // fora do mapa, a página se comporta como sempre
    const quer = e.ctrlKey || e.metaKey;
    if (quer && !mapa.scrollZoom.isEnabled()) mapa.scrollZoom.enable();
    else if (!quer && mapa.scrollZoom.isEnabled()) mapa.scrollZoom.disable();
    if (!e.ctrlKey) return;
    e.preventDefault();   // sem isto o navegador amplia a página inteira com a pinça
    if (!mapa.getContainer().contains(e.target)) {   // pinça sobre o texto: entrega o gesto ao mapa
      e.stopPropagation();
      mapa.getCanvas().dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, ctrlKey: true, clientX: e.clientX, clientY: e.clientY }));
    }
  };
  addEventListener('wheel', aproximar, { capture: true, passive: false });
  // Safari não manda a pinça como rolagem com Ctrl, e sim como "gesto": aproxima o mapa direto
  if ('GestureEvent' in window) {
    const caixa = mapa.getContainer();
    let z0 = 0;
    regiao.addEventListener('gesturestart', e => { e.preventDefault(); z0 = mapa.getZoom(); });
    regiao.addEventListener('gesturechange', e => {
      e.preventDefault();
      const r = caixa.getBoundingClientRect();
      mapa.zoomTo(z0 + Math.log2(e.scale), { duration: 0, around: mapa.unproject([e.clientX - r.left, e.clientY - r.top]) });
    });
    regiao.addEventListener('gestureend', e => e.preventDefault());
  }
  return mapa;
}
// ruas e trilhos só aparecem de perto (a partir do zoom 10,4, inteiros em 11,6), quando os distritos coloridos já não cobrem a cidade
export function ruasSoDePerto(mapa) {
  mapa.getStyle().layers.filter(l => l.type === 'line' && l['source-layer'] === 'transportation').forEach(l => {
    const base = mapa.getPaintProperty(l.id, 'line-opacity') ?? 1;
    mapa.setPaintProperty(l.id, 'line-opacity', ['interpolate', ['linear'], ['zoom'], 10.4, 0, 11.6, base]);
  });
}
// uma rota que se desenha: fonte + três camadas (brilho, linha, ponto de luz)
export function camadasDeRota(mapa, id) {
  mapa.addSource(id, { type: 'geojson', lineMetrics: true, data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[0, 0], [0, 0.001]] } } });
  const fio = { 'line-cap': 'round', 'line-join': 'round' };
  mapa.addLayer({ id: id + '-brilho', type: 'line', source: id, layout: fio, paint: { 'line-width': 16, 'line-blur': 12, 'line-opacity': 0, 'line-gradient': NADA } });
  mapa.addLayer({ id, type: 'line', source: id, layout: fio, paint: { 'line-width': 2.6, 'line-opacity': 0.92, 'line-gradient': NADA } });
  mapa.addLayer({ id: id + '-pulso', type: 'line', source: id, layout: fio, paint: { 'line-width': 3, 'line-gradient': NADA } });
}
export const tracar = (mapa, id, linha) => mapa.getSource(id).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: linha || [[0, 0], [0, 0.001]] } });
export const degrade = (mapa, id, cor, ate) => mapa.setPaintProperty(id, 'line-gradient', ate <= 0 ? NADA : ['step', ['line-progress'], cor, Math.min(0.9999, ate), NADA]);
export function acender(mapa, id) {
  degrade(mapa, id, LARANJA, 1);
  mapa.setPaintProperty(id, 'line-opacity', 1); mapa.setPaintProperty(id, 'line-width', 5);
  mapa.setPaintProperty(id + '-brilho', 'line-gradient', ['step', ['line-progress'], LARANJA, 0.9999, NADA]);
  mapa.setPaintProperty(id + '-brilho', 'line-opacity', 0.55);
  mapa.moveLayer(id + '-brilho'); mapa.moveLayer(id); mapa.moveLayer(id + '-pulso');
}
export function apagar(mapa, id) {
  degrade(mapa, id, CLARO, 0);
  mapa.setPaintProperty(id, 'line-opacity', 0.92); mapa.setPaintProperty(id, 'line-width', 2.6);
  mapa.setPaintProperty(id + '-brilho', 'line-opacity', 0); mapa.setPaintProperty(id + '-brilho', 'line-gradient', NADA);
  mapa.setPaintProperty(id + '-pulso', 'line-gradient', NADA);
}
// ponto de luz que corre pela rota, sem parar
export function correrLuz(mapa, id) {
  const h = { v: -0.1 };
  return gsap.to(h, { v: 1.15, duration: 2.8, ease: 'none', repeat: -1, repeatDelay: 0.35, onUpdate() {
    mapa.setPaintProperty(id + '-pulso', 'line-gradient', h.v < 0.1 || h.v > 0.985 ? NADA
      : ['interpolate', ['linear'], ['line-progress'], h.v - 0.09, NADA, h.v - 0.004, '#FFF3E6', h.v, '#FFFFFF', Math.min(0.9999, h.v + 0.012), NADA]);
  } });
}

export function criarMapa(el, geo, rotas, valores, { calmo = false } = {}) {
  const ml = window.maplibregl;
  const celular = () => el.clientWidth < 860;
  const cid = geo.cidade, cidade = [[cid.oeste, cid.sul], [cid.leste, cid.norte]];
  const redes = valores.redes;                       // [{id, nome}]
  const est = { cena: 0, sel: -1, hover: -1, dentro: false, foco: -1, fase: 'geral', ativo: true, pronto: false, destaque: -1 };
  let aoMudar = () => {}, aoPassar = () => {}, aoPronto = () => {};
  let tl = null, luz = null;

  // espaço da tela que o texto ocupa: o mapa enquadra o que sobra
  function margem() {
    const w = el.clientWidth, h = el.clientHeight;
    if (celular()) return { top: 96, bottom: Math.round(h * 0.56), left: 36, right: 78 };
    return { top: 120, bottom: 80, left: Math.round(w * (est.cena === 0 ? 0.47 : 0.43)), right: 70 };
  }

  const mapa = novoMapa(el, { bounds: cidade, fitBoundsOptions: { padding: margem() }, bearing: CAMERA[0][0], pitch: CAMERA[0][1] });

  // dados de cada ponto: rota e loja por rede, na ordem das redes do site
  const porPonto = geo.pontos.map(p => {
    const r = rotas.pontos.find(q => q.id === p.id) || { redes: {} };
    return {
      linhas: redes.map(rd => (r.redes[rd.id] ? abrir(r.redes[rd.id].linha) : null)),
      lojas: redes.map(rd => (r.redes[rd.id] ? rotas.lojas[r.redes[rd.id].loja] : null)),
      km: redes.map(rd => r.redes[rd.id]?.km ?? Infinity),
    };
  });

  // marcas em HTML: a origem e uma por loja
  const origem = new ml.Marker({ element: marcar('marca-origem', '<i></i><b></b>'), anchor: 'center' });
  const marcas = redes.map(rd => new ml.Marker({ element: marcar('marca-loja', `<span><b>${rd.nome}</b><i></i></span>`), anchor: 'bottom', offset: [0, -6] }));
  let ordem = redes.map((_, k) => k), melhor = 0;

  function corDistritos() {
    if (est.cena === 3) return ['interpolate', ['linear'], ['get', 'v'], 0, '#F1ECE6', 0.5, '#F7B27A', 1, LARANJA];
    return ['case', ['==', ['get', 'ponto'], est.sel], '#F7A464', ['==', ['get', 'ponto'], est.hover], '#D6D6D0', '#E6E6E1'];
  }

  mapa.on('load', () => {
    const antes = mapa.getStyle().layers.find(l => l.type === 'symbol')?.id;
    ruasSoDePerto(mapa);   // as ruas brancas não ficam por cima da cor dos distritos
    mapa.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.5, position: [1.3, 215, 28] });
    geo.distritos.features.forEach(f => { f.properties.v = valores.var[f.properties.ponto]; });
    mapa.addSource('distritos', { type: 'geojson', data: geo.distritos });
    mapa.addLayer({ id: 'distritos', type: 'fill-extrusion', source: 'distritos', paint: {
      'fill-extrusion-color': corDistritos(), 'fill-extrusion-height': 1500, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': OPACO,
      'fill-extrusion-color-transition': { duration: 350 }, 'fill-extrusion-opacity-transition': { duration: 900 },
    } }, antes);
    mapa.addSource('lojas', { type: 'geojson', data: { type: 'FeatureCollection', features: rotas.lojas.map(l => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [l.lon, l.lat] } })) } });
    mapa.addLayer({ id: 'lojas', type: 'circle', source: 'lojas', minzoom: 11.6, paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11.6, 1.5, 15, 3.5], 'circle-color': '#9A9AA2', 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 11.6, 0, 12.6, 0.8],
    } });
    redes.forEach((_, k) => camadasDeRota(mapa, 'rota' + k));
    mapa.addSource('pontos', { type: 'geojson', data: { type: 'FeatureCollection', features: geo.pontos.map((p, i) => ({ type: 'Feature', id: i, properties: { i }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })) } });
    mapa.addLayer({ id: 'pontos-halo', type: 'circle', source: 'pontos', maxzoom: 12, paint: { 'circle-radius': 9, 'circle-color': LARANJA, 'circle-opacity': 0, 'circle-opacity-transition': { duration: 500 }, 'circle-blur': 0.6 } });
    // o raio de cada ponto vem do estado dele (feature-state "r"): 0 = escondido; os pontos nascem um a um (ver mostrarPontos)
    mapa.addLayer({ id: 'pontos', type: 'circle', source: 'pontos', maxzoom: 12, paint: {
      'circle-radius': ['coalesce', ['feature-state', 'r'], 0], 'circle-color': LARANJA, 'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': ['case', ['>', ['coalesce', ['feature-state', 'r'], 0], 0.05], 1.5, 0],
      'circle-radius-transition': { duration: 0 }, 'circle-opacity-transition': { duration: 0 },
      'circle-opacity': ['coalesce', ['feature-state', 'o'], 0], 'circle-stroke-opacity': ['coalesce', ['feature-state', 'o'], 0],
    } });
    est.pronto = true;
    aplicar(true);
    aoPronto();
  });

  const parar = () => { tl?.kill(); luz?.kill(); tl = luz = null; };

  // primeiro enquadramento do bairro: as rotas de tamanho normal e a mais barata. Loja muito longe sai da tela.
  function caixaDoBairro(i) {
    const D = porPonto[i], P = geo.pontos[i], kms = D.km.filter(isFinite).sort((a, b) => a - b);
    const limite = Math.max(6, 1.8 * (kms[Math.floor(kms.length / 2)] || 6));
    return caixaDe(D.linhas.filter((l, k) => l && (D.km[k] <= limite || k === melhor)).concat([[[P.lon, P.lat]]]));
  }

  // entra no bairro: câmera, depois uma rota por vez, da mais cara à mais barata, e o veredito
  function entrar(i) {
    const P = geo.pontos[i], D = porPonto[i];
    const tem = k => D.linhas[k] && valores.preco(i, k) != null;   // rede sem preço neste ponto fica fora do mapa
    parar();
    fecharRotulo();
    ordem = valores.ordem(i).slice().reverse();          // do mais caro ao mais barato
    melhor = ordem.at(-1);
    est.destaque = -1;
    mapa.setPaintProperty('distritos', 'fill-extrusion-opacity', 0);
    redes.forEach((_, k) => {
      tracar(mapa, 'rota' + k, tem(k) ? D.linhas[k] : null);
      apagar(mapa, 'rota' + k);
      const m = marcas[k], e = m.getElement();
      e.classList.remove('on', 'melhor', 'resto', 'ativo');
      if (tem(k)) { m.setLngLat([D.lojas[k].lon, D.lojas[k].lat]).addTo(mapa); e.querySelector('i').textContent = valores.preco(i, k); } else m.remove();
    });
    origem.setLngLat([P.lon, P.lat]).addTo(mapa);
    origem.getElement().querySelector('b').textContent = P.bairro.split(' (')[0];
    origem.getElement().classList.remove('on');
    mapa.fitBounds(caixaDoBairro(i), { padding: margem(), pitch: 44, bearing: -14, maxZoom: 14.4, duration: calmo ? 0 : 2600, essential: true });
    est.fase = 'rotas';
    aoMudar({ fase: 'rotas', foco: i, melhor });

    const p = redes.map(() => ({ v: 0 }));
    tl = gsap.timeline({ defaults: { duration: 1.35, ease: 'power2.inOut' } });
    tl.add(() => origem.getElement().classList.add('on'), 1.1);
    ordem.forEach((k, r) => {
      if (!tem(k)) return;
      tl.to(p[k], { v: 1, onUpdate: () => degrade(mapa, 'rota' + k, CLARO, p[k].v), onComplete: () => marcas[k].getElement().classList.add('on') }, 1.5 + r * 0.24);
    });
    tl.add(veredito, '>0.3');
    if (calmo) tl.progress(1);
  }
  function veredito() {
    const i = est.foco, D = porPonto[i];
    est.fase = 'veredito';
    redes.forEach((_, k) => {
      const e = marcas[k].getElement();
      e.classList.add('on'); e.classList.toggle('melhor', k === melhor); e.classList.toggle('resto', k !== melhor);
      if (k !== melhor) mapa.setPaintProperty('rota' + k, 'line-opacity', 0.3);
    });
    acender(mapa, 'rota' + melhor);
    if (D.linhas[melhor]) mapa.fitBounds(caixaDe([D.linhas[melhor]]), { padding: margem(), pitch: 50, bearing: 10, maxZoom: 15.2, duration: calmo ? 0 : 2600, essential: true });
    if (!calmo) { luz = correrLuz(mapa, 'rota' + melhor); luz.paused(!est.ativo); }
    aoMudar({ fase: 'veredito', foco: i, melhor });
  }
  function sair() {
    parar();
    fecharRotulo();
    est.fase = 'geral';
    mapa.setPaintProperty('distritos', 'fill-extrusion-opacity', OPACO);
    redes.forEach((_, k) => { apagar(mapa, 'rota' + k); marcas[k].getElement().classList.remove('on', 'melhor', 'resto', 'ativo'); });
    origem.getElement().classList.remove('on');
    aoMudar({ fase: 'geral', foco: -1, melhor: -1 });
  }

  // os pontos laranja só existem a partir do primeiro capítulo: ao rolar, nascem um a um (de oeste para leste), crescendo
  // com um leve salto e aparecendo junto; ao voltar à abertura, encolhem e somem. Cada quadro é calculado aqui (sem saltos de CSS).
  let pontosOn = null, pontosRaf = 0;
  const pontosAtual = geo.pontos.map(() => ({ r: 0, o: 0 }));
  const suave = t => 1 - Math.pow(1 - t, 3);
  const salto = t => { const c1 = 1.1, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function mostrarPontos(ligar, raio, direto) {
    if (!est.pronto) return;
    const mudou = ligar !== pontosOn; pontosOn = ligar;
    cancelAnimationFrame(pontosRaf);
    const ordem = geo.pontos.map((p, i) => i).sort((a, b) => geo.pontos[a].lon - geo.pontos[b].lon);
    const por = (i, r, o) => { pontosAtual[i].r = r; pontosAtual[i].o = o; mapa.setFeatureState({ source: 'pontos', id: i }, { r, o }); };
    if (direto || calmo || (ligar && !mudou)) { ordem.forEach(i => por(i, ligar ? raio : 0, ligar ? 0.9 : 0)); return; }
    const de = pontosAtual.map(q => ({ ...q })), t0 = performance.now();
    const DUR = ligar ? 650 : 260, ESC = ligar ? 38 : 0;
    const quadro = agora => {
      let fim = true;
      ordem.forEach((i, k) => {
        const t = Math.min(1, Math.max(0, (agora - t0 - k * ESC) / DUR));
        if (t < 1) fim = false;
        if (ligar) por(i, raio * salto(t), 0.9 * Math.min(1, t * 2.5));
        else por(i, de[i].r * (1 - suave(t)), de[i].o * (1 - suave(t)));
      });
      if (!fim) pontosRaf = requestAnimationFrame(quadro);
    };
    pontosRaf = requestAnimationFrame(quadro);
  }

  // decide o que o mapa mostra: cidade inteira ou o bairro em foco
  function aplicar(forcar) {
    if (!est.pronto) return;
    const dentro = (est.sel >= 0 && est.cena === 0) || est.cena === 2;
    const foco = est.sel >= 0 ? est.sel : DEMO;
    const mudou = forcar || dentro !== est.dentro || (dentro && foco !== est.foco);
    const cenaMudou = forcar || est.cenaAntes !== est.cena;
    est.cenaAntes = est.cena;
    if (cenaMudou || mudou) {
      mapa.setPaintProperty('distritos', 'fill-extrusion-color', corDistritos());
      mostrarPontos(est.cena > 0, est.cena === 1 ? 6 : 4.5, forcar);
      mapa.setPaintProperty('pontos-halo', 'circle-opacity', est.cena === 1 ? 0.35 : 0);
    }
    if (mudou) {
      est.dentro = dentro; est.foco = dentro ? foco : -1;
      if (dentro) entrar(foco); else sair();
    }
    if (!dentro && (mudou || cenaMudou)) {
      const [giro, incl] = CAMERA[est.cena];
      mapa.fitBounds(cidade, { padding: margem(), bearing: giro, pitch: incl, duration: calmo || forcar ? 0 : 2000, essential: true });
    }
  }

  // passar o ponteiro e clicar nos distritos (só na visão da cidade)
  mapa.on('mousemove', e => {
    if (!est.pronto || est.dentro) return;
    const f = mapa.queryRenderedFeatures(e.point, { layers: ['distritos'] })[0];
    const novo = f ? f.properties.ponto : -1;
    if (novo !== est.hover) { est.hover = novo; mapa.getCanvas().style.cursor = novo >= 0 ? 'pointer' : ''; mapa.setPaintProperty('distritos', 'fill-extrusion-color', corDistritos()); }
    aoPassar(novo, e.point);
  });
  mapa.on('mouseout', () => { if (est.hover >= 0) { est.hover = -1; if (est.pronto) mapa.setPaintProperty('distritos', 'fill-extrusion-color', corDistritos()); } aoPassar(-1); });
  mapa.on('click', e => {
    if (!est.pronto || est.dentro) return;
    const f = mapa.queryRenderedFeatures(e.point, { layers: ['distritos'] })[0];
    if (f) el.dispatchEvent(new CustomEvent('ponto', { detail: f.properties.ponto }));
  });
  // com a câmera dentro do bairro, os pontos laranja do mapa mostram o nome: ao passar o mouse e, no toque, ao tocar
  const rotulo = new ml.Popup({ closeButton: false, closeOnClick: false, closeOnMove: false, offset: 11, maxWidth: 'none', className: 'rotulo-ponto' });
  let fixo = false, rotuloDe = -1;
  const pontoSob = pt => mapa.queryRenderedFeatures([[pt.x - 9, pt.y - 9], [pt.x + 9, pt.y + 9]], { layers: ['pontos'] })[0];
  function mostrarRotulo(f) {
    const i = f.properties.i;
    if (i === rotuloDe && rotulo.isOpen()) return;
    const p = geo.pontos[i];
    rotuloDe = i;
    rotulo.setLngLat([p.lon, p.lat]).setHTML(`<b>${p.bairro.split(' (')[0]}</b><small>Zona ${p.zona}</small>`).addTo(mapa);
  }
  const fecharRotulo = () => { fixo = false; rotuloDe = -1; rotulo.remove(); };
  mapa.on('mousemove', e => {
    if (!est.pronto || !est.dentro) return;
    const f = pontoSob(e.point);
    mapa.getCanvas().style.cursor = f ? 'pointer' : '';
    if (f) mostrarRotulo(f); else if (!fixo) fecharRotulo();
  });
  mapa.on('click', e => {
    if (!est.pronto || !est.dentro) return;
    const f = pontoSob(e.point);
    if (f) { fixo = true; mostrarRotulo(f); } else fecharRotulo();
  });
  let espera = 0;
  window.addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(() => { if (est.pronto && !est.dentro) aplicar(true); }, 200); });

  return {
    cena(c) { if (c !== est.cena) { est.cena = c; aplicar(); } },
    selecionar(i) { est.sel = i; aplicar(); if (est.pronto) mapa.setPaintProperty('distritos', 'fill-extrusion-color', corDistritos()); },
    // destaca a rota de uma rede (ao passar o ponteiro na lista)
    destacar(k) {
      if (!est.pronto || est.fase !== 'veredito' || k === est.destaque) return;
      est.destaque = k;
      redes.forEach((_, j) => {
        marcas[j].getElement().classList.toggle('ativo', j === k);
        if (j === melhor) return;
        mapa.setPaintProperty('rota' + j, 'line-opacity', j === k ? 1 : 0.3);
        mapa.setPaintProperty('rota' + j, 'line-width', j === k ? 4 : 2.6);
      });
    },
    ativo(v) { est.ativo = v; luz?.paused(!v); },
    aoMudar(fn) { aoMudar = fn; },
    aoPassar(fn) { aoPassar = fn; },
    aoPronto(fn) { aoPronto = fn; if (est.pronto) fn(); },
  };
}
