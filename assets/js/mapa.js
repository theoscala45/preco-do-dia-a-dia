// Mapa real de São Paulo (MapLibre + OpenStreetMap). A cidade inteira aparece primeiro; com um CEP a câmera
// desce até o ponto de coleta e desenha o caminho de carro até a loja mais próxima de cada rede (ver DESIGN.md, "Mapa").
const LARANJA = '#FF7A1A', CLARO = '#ECE9E3', NADA = 'rgba(0,0,0,0)';
const DEMO = 5;   // sem CEP, a cena das redes mostra Pinheiros
// câmera da cidade inteira em cada cena do scroll: [giro, inclinação]
const CAMERA = [[-8, 38], [14, 46], [0, 0], [-18, 30]];
const suave = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// polyline do OSRM (precisão 5) -> [[lon, lat], ...]
function abrir(txt) {
  const pts = []; let i = 0, lat = 0, lon = 0;
  const prox = () => { let r = 0, s = 0, b; do { b = txt.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32); return r & 1 ? ~(r >> 1) : r >> 1; };
  while (i < txt.length) { lat += prox(); lon += prox(); pts.push([lon / 1e5, lat / 1e5]); }
  return pts;
}
const caixaDe = linhas => {
  const c = [[180, 90], [-180, -90]];
  for (const l of linhas) for (const [x, y] of l) { c[0][0] = Math.min(c[0][0], x); c[0][1] = Math.min(c[0][1], y); c[1][0] = Math.max(c[1][0], x); c[1][1] = Math.max(c[1][1], y); }
  return c;
};

export function criarMapa(el, geo, rotas, valores, { calmo = false } = {}) {
  const ml = window.maplibregl;
  if (!ml) throw new Error('MapLibre não carregou');
  const celular = () => el.clientWidth < 860;
  const cid = geo.cidade, cidade = [[cid.oeste, cid.sul], [cid.leste, cid.norte]];
  const redes = valores.redes;                       // [{id, nome}]
  const est = { cena: 0, sel: -1, hover: -1, dentro: false, foco: -1, t0: 0, fase: 'geral', quadro: 0, ativo: true, pronto: false, destaque: -1 };
  let aoMudar = () => {}, aoPassar = () => {};

  // espaço da tela que o texto ocupa: o mapa enquadra o que sobra
  function margem() {
    const w = el.clientWidth, h = el.clientHeight;
    if (celular()) return { top: 96, bottom: Math.round(h * 0.56), left: 36, right: 78 };
    return { top: 120, bottom: 80, left: Math.round(w * (est.cena === 0 ? 0.47 : 0.43)), right: 70 };
  }

  const mapa = new ml.Map({
    container: el, style: 'assets/mapa-estilo.json', attributionControl: false, cooperativeGestures: true,
    dragRotate: false, pitchWithRotate: false, touchPitch: false, minZoom: 8, maxZoom: 17, maxPitch: 60,
    locale: { 'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + rolagem para aproximar o mapa', 'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + rolagem para aproximar o mapa', 'CooperativeGesturesHandler.MobileHelpText': 'Use dois dedos para mover o mapa' },
    bounds: cidade, fitBoundsOptions: { padding: margem() }, bearing: CAMERA[0][0], pitch: CAMERA[0][1],
  });
  mapa.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right');
  mapa.touchZoomRotate.disableRotation();

  // dados de cada ponto: rota e loja por rede, na ordem das redes do site
  const porPonto = geo.pontos.map((p, i) => {
    const r = rotas.pontos.find(q => q.id === p.id) || { redes: {} };
    const linhas = redes.map(rd => (r.redes[rd.id] ? abrir(r.redes[rd.id].linha) : null));
    const lojas = redes.map(rd => (r.redes[rd.id] ? rotas.lojas[r.redes[rd.id].loja] : null));
    const km = redes.map(rd => r.redes[rd.id]?.km ?? Infinity);
    return { linhas, lojas, km };
  });

  // marcas em HTML: a origem e uma por loja
  const marcar = (classe, html) => { const e = document.createElement('div'); e.className = classe; e.innerHTML = html; return e; };
  const origem = new ml.Marker({ element: marcar('marca-origem', '<i></i><b></b>'), anchor: 'center' });
  const marcas = redes.map(rd => new ml.Marker({ element: marcar('marca-loja', `<span><b>${rd.nome}</b><i></i></span>`), anchor: 'bottom', offset: [0, -6] }));
  const prog = redes.map(() => 0);
  let ordem = redes.map((_, k) => k), melhor = 0;

  function corDistritos() {
    if (est.cena === 3) return ['interpolate', ['linear'], ['get', 'v'], 0, '#2B2927', 0.5, '#8A4513', 1, LARANJA];
    return ['case', ['==', ['get', 'ponto'], est.sel], '#B5560F', ['==', ['get', 'ponto'], est.hover], '#4A4A52', '#2B2B30'];
  }

  mapa.on('load', () => {
    const antes = mapa.getStyle().layers.find(l => l.type === 'symbol')?.id;
    mapa.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.5, position: [1.3, 215, 28] });
    geo.distritos.features.forEach(f => { f.properties.v = valores.var[f.properties.ponto]; });
    mapa.addSource('distritos', { type: 'geojson', data: geo.distritos });
    mapa.addLayer({ id: 'distritos', type: 'fill-extrusion', source: 'distritos', paint: {
      'fill-extrusion-color': corDistritos(), 'fill-extrusion-height': 1500, 'fill-extrusion-base': 0,
      'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 10.4, 0.94, 11.6, 0],
      'fill-extrusion-color-transition': { duration: 350 }, 'fill-extrusion-opacity-transition': { duration: 900 },
    } }, antes);
    mapa.addSource('lojas', { type: 'geojson', data: { type: 'FeatureCollection', features: rotas.lojas.map(l => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [l.lon, l.lat] } })) } });
    mapa.addLayer({ id: 'lojas', type: 'circle', source: 'lojas', minzoom: 11.6, paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11.6, 1.5, 15, 3.5], 'circle-color': '#8B8881', 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 11.6, 0, 12.6, 0.8],
    } });
    redes.forEach((_, k) => {
      mapa.addSource('rota' + k, { type: 'geojson', lineMetrics: true, data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[0, 0], [0, 0.001]] } } });
      const fio = { 'line-cap': 'round', 'line-join': 'round' };
      mapa.addLayer({ id: 'brilho' + k, type: 'line', source: 'rota' + k, layout: fio, paint: { 'line-width': 16, 'line-blur': 12, 'line-opacity': 0, 'line-gradient': NADA } });
      mapa.addLayer({ id: 'rota' + k, type: 'line', source: 'rota' + k, layout: fio, paint: { 'line-width': 2.6, 'line-opacity': 0.92, 'line-gradient': NADA } });
      mapa.addLayer({ id: 'pulso' + k, type: 'line', source: 'rota' + k, layout: fio, paint: { 'line-width': 3, 'line-gradient': NADA } });
    });
    mapa.addSource('pontos', { type: 'geojson', data: { type: 'FeatureCollection', features: geo.pontos.map((p, i) => ({ type: 'Feature', id: i, properties: { i }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })) } });
    mapa.addLayer({ id: 'pontos-halo', type: 'circle', source: 'pontos', maxzoom: 12, paint: { 'circle-radius': 9, 'circle-color': LARANJA, 'circle-opacity': 0, 'circle-opacity-transition': { duration: 500 }, 'circle-blur': 0.6 } });
    mapa.addLayer({ id: 'pontos', type: 'circle', source: 'pontos', maxzoom: 12, paint: {
      'circle-radius': 3, 'circle-color': LARANJA, 'circle-stroke-color': '#0C0C0D', 'circle-stroke-width': 1.5,
      'circle-radius-transition': { duration: 500 }, 'circle-opacity': 0.9,
    } });
    est.pronto = true;
    aplicar(true);
    el.classList.add('pronto');
  });

  const degrade = (k, cor, ate) => mapa.setPaintProperty('rota' + k, 'line-gradient', ate <= 0 ? NADA : ['step', ['line-progress'], cor, Math.min(0.9999, ate), NADA]);

  const OPACO = ['interpolate', ['linear'], ['zoom'], 10.4, 0.94, 11.6, 0];
  // primeiro enquadramento do bairro: as rotas de tamanho normal e a mais barata. Loja muito longe sai da tela.
  function caixaDoBairro(i) {
    const D = porPonto[i], P = geo.pontos[i], kms = D.km.filter(isFinite).sort((a, b) => a - b);
    const limite = Math.max(6, 1.8 * (kms[Math.floor(kms.length / 2)] || 6));
    return caixaDe(D.linhas.filter((l, k) => l && (D.km[k] <= limite || k === melhor)).concat([[[P.lon, P.lat]]]));
  }

  // entra no bairro: câmera, depois uma rota por vez, da mais cara à mais barata
  function entrar(i) {
    const P = geo.pontos[i], D = porPonto[i];
    ordem = valores.ordem(i).slice().reverse();          // do mais caro ao mais barato
    melhor = ordem.at(-1);
    mapa.setPaintProperty('distritos', 'fill-extrusion-opacity', 0);
    redes.forEach((_, k) => {
      prog[k] = 0;
      const ok = !!D.linhas[k];
      mapa.getSource('rota' + k).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ok ? D.linhas[k] : [[0, 0], [0, 0.001]] } });
      degrade(k, CLARO, 0);
      mapa.setPaintProperty('rota' + k, 'line-opacity', 0.92); mapa.setPaintProperty('rota' + k, 'line-width', 2.6);
      mapa.setPaintProperty('brilho' + k, 'line-opacity', 0); mapa.setPaintProperty('brilho' + k, 'line-gradient', NADA);
      mapa.setPaintProperty('pulso' + k, 'line-gradient', NADA);
      const m = marcas[k], e = m.getElement();
      e.classList.remove('on', 'melhor', 'resto', 'ativo');
      if (ok) { m.setLngLat([D.lojas[k].lon, D.lojas[k].lat]).addTo(mapa); e.querySelector('i').textContent = valores.preco(i, k); } else m.remove();
    });
    origem.setLngLat([P.lon, P.lat]).addTo(mapa);
    origem.getElement().querySelector('b').textContent = P.bairro.split(' (')[0];
    origem.getElement().classList.remove('on');
    mapa.fitBounds(caixaDoBairro(i), { padding: margem(), pitch: 44, bearing: -14, maxZoom: 14.4, duration: calmo ? 0 : 2600, essential: true });
    est.t0 = performance.now(); est.fase = 'rotas';
    aoMudar({ fase: 'rotas', foco: i, melhor });
    rodar();
  }
  function veredito() {
    const i = est.foco, D = porPonto[i];
    est.fase = 'veredito';
    redes.forEach((_, k) => {
      const e = marcas[k].getElement();
      e.classList.add('on'); e.classList.toggle('melhor', k === melhor); e.classList.toggle('resto', k !== melhor);
      mapa.setPaintProperty('rota' + k, 'line-opacity', k === melhor ? 1 : 0.3);
    });
    degrade(melhor, LARANJA, 1);
    mapa.setPaintProperty('rota' + melhor, 'line-width', 5);
    mapa.setPaintProperty('brilho' + melhor, 'line-gradient', ['step', ['line-progress'], LARANJA, 0.9999, NADA]);
    mapa.setPaintProperty('brilho' + melhor, 'line-opacity', 0.55);
    mapa.moveLayer('brilho' + melhor); mapa.moveLayer('rota' + melhor); mapa.moveLayer('pulso' + melhor);
    if (D.linhas[melhor]) mapa.fitBounds(caixaDe([D.linhas[melhor]]), { padding: margem(), pitch: 50, bearing: 10, maxZoom: 15.2, duration: calmo ? 0 : 2600, essential: true });
    aoMudar({ fase: 'veredito', foco: i, melhor });
  }
  function sair() {
    est.fase = 'geral';
    mapa.setPaintProperty('distritos', 'fill-extrusion-opacity', OPACO);
    redes.forEach((_, k) => { prog[k] = 0; degrade(k, CLARO, 0); mapa.setPaintProperty('brilho' + k, 'line-opacity', 0); mapa.setPaintProperty('pulso' + k, 'line-gradient', NADA); marcas[k].getElement().classList.remove('on', 'melhor', 'resto'); });
    origem.getElement().classList.remove('on');
    aoMudar({ fase: 'geral', foco: -1, melhor: -1 });
  }

  function quadro() {
    est.quadro = 0;
    if (est.fase === 'geral') return;
    const s = calmo ? 99 : (performance.now() - est.t0) / 1000, n = ordem.length;
    if (est.fase === 'rotas') {
      if (s > 1.1) origem.getElement().classList.add('on');
      ordem.forEach((k, r) => {
        const p = suave((s - 1.5 - r * 0.24) / 1.35);
        if (p !== prog[k]) { prog[k] = p; degrade(k, CLARO, p); }
        if (p >= 1) marcas[k].getElement().classList.add('on');
      });
      if (s > 1.5 + (n - 1) * 0.24 + 1.35 + 0.3) veredito();
    } else if (!calmo && est.ativo) {   // um ponto de luz corre pelo caminho mais barato
      const h = ((performance.now() - est.t0) / 2600) % 1.25 - 0.1;
      mapa.setPaintProperty('pulso' + melhor, 'line-gradient', h < 0.1 || h > 0.985 ? NADA
        : ['interpolate', ['linear'], ['line-progress'], h - 0.09, NADA, h - 0.004, '#FFF3E6', h, '#FFFFFF', Math.min(0.9999, h + 0.012), NADA]);
    } else return;
    rodar();
  }
  const rodar = () => { if (!est.quadro) est.quadro = requestAnimationFrame(quadro); };

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
      mapa.setPaintProperty('pontos', 'circle-radius', est.cena === 1 ? 5.5 : 3);
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
        mapa.setPaintProperty('rota' + j, 'line-opacity', j === melhor || j === k ? 1 : 0.3);
        if (j !== melhor) mapa.setPaintProperty('rota' + j, 'line-width', j === k ? 4 : 2.6);
      });
    },
    ativo(v) { est.ativo = v; if (v) rodar(); },
    aoMudar(fn) { aoMudar = fn; },
    aoPassar(fn) { aoPassar = fn; },
  };
}
