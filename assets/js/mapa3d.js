// Mapa 3D dos 96 distritos de São Paulo. O scroll da página comanda a cena (ver DESIGN.md, "Movimento").
import * as THREE from '../vendor/three.min.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const saida = t => 1 - Math.pow(1 - t, 3);

const COR = {
  bloco: new THREE.Color('#FBFBF8'), etiqueta: new THREE.Color('#FFD60A'),
  caro: new THREE.Color('#D4281C'), tinta: new THREE.Color('#1D1F2A'),
};
// câmera em cada cena: [giro, inclinação a partir do topo, distância]
const CAMERA = [[-0.35, 0.74, 205], [0.5, 1.03, 208], [0.04, 0.42, 228], [-0.62, 1.0, 208]];

export function criarMapa(canvas, mapa, valores, { calmo = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const celular = () => canvas.clientWidth < 860;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, celular() ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 800);
  camera.up.set(0, 0, 1);

  cena.add(new THREE.HemisphereLight('#ffffff', '#efece6', 1.9));
  const sol = new THREE.DirectionalLight('#ffffff', 1.7);
  sol.position.set(-70, -55, 120);
  sol.castShadow = true;
  sol.shadow.mapSize.set(celular() ? 1024 : 2048, celular() ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 10, far: 400 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.6; sol.shadow.radius = 5;
  cena.add(sol);

  const chao = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.17 }));
  chao.receiveShadow = true; chao.position.z = -0.02;
  cena.add(chao);

  // distritos
  const raio = Math.max(...mapa.distritos.map(d => Math.hypot(d.c[0], d.c[1])));
  const matLinha = new THREE.LineBasicMaterial({ color: COR.tinta, transparent: true, opacity: 0.34 });
  const blocos = mapa.distritos.map(d => {
    const formas = d.polys.map(aneis => {
      const f = new THREE.Shape(aneis[0].map(p => new THREE.Vector2(p[0], p[1])));
      aneis.slice(1).forEach(a => f.holes.push(new THREE.Path(a.map(p => new THREE.Vector2(p[0], p[1])))));
      return f;
    });
    const geo = new THREE.ExtrudeGeometry(formas, { depth: 1, bevelEnabled: false });
    const topo = new THREE.MeshStandardMaterial({ color: COR.bloco.clone(), roughness: 0.82, metalness: 0 });
    const lado = new THREE.MeshStandardMaterial({ color: COR.bloco.clone(), roughness: 0.9, metalness: 0 });
    const malha = new THREE.Mesh(geo, [topo, lado]);
    malha.castShadow = malha.receiveShadow = true;
    malha.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), matLinha));
    malha.userData.i = d.ponto;
    cena.add(malha);
    return { malha, topo, lado, ponto: d.ponto, atraso: Math.hypot(d.c[0], d.c[1]) / raio, h: 1, lev: 0 };
  });

  // alfinetes dos 25 pontos de coleta
  const geoHaste = new THREE.CylinderGeometry(0.16, 0.16, 7, 8).rotateX(Math.PI / 2).translate(0, 0, 3.5);
  const geoCabeca = new THREE.SphereGeometry(0.95, 20, 14).translate(0, 0, 7.6);
  const matHaste = new THREE.MeshStandardMaterial({ color: COR.tinta, roughness: 0.5 });
  const alfinetes = mapa.pontos.map((p, i) => {
    const g = new THREE.Group();
    const cabeca = new THREE.Mesh(geoCabeca, new THREE.MeshStandardMaterial({ color: COR.caro.clone(), roughness: 0.35 }));
    const haste = new THREE.Mesh(geoHaste, matHaste);
    cabeca.castShadow = haste.castShadow = true;
    g.add(haste, cabeca);
    g.position.set(p.x, p.y, 0);
    cena.add(g);
    const dono = blocos.reduce((m, b, k) => (b.ponto === i && b.atraso < m.a ? { a: b.atraso, k } : m), { a: 9, k: 0 }).k;
    return { g, cabeca, dono, ordem: (i * 7) % 25 / 25 };
  });

  const est = {
    p: 0, alvoP: 0, sel: -1, selForca: 0, hover: -1, giro: 0, giroVel: 0,
    mx: 0, my: 0, rato: null, mexeu: false, t0: performance.now(), ativo: true,
    alvo: new THREE.Vector3(), w: 1, h: 1, arrastando: false,
  };
  const raios = new THREE.Raycaster();
  const cor = new THREE.Color();
  const v3 = new THREE.Vector3();
  let aoPassar = () => {};

  function escala(v) { // branco, etiqueta, caro
    v = Math.pow(v, 1.35);
    return v < 0.5 ? cor.copy(COR.bloco).lerp(COR.etiqueta, v * 2) : cor.copy(COR.etiqueta).lerp(COR.caro, (v - 0.5) * 2);
  }

  function medir() {
    est.w = canvas.clientWidth; est.h = canvas.clientHeight;
    renderer.setSize(est.w, est.h, false);
    camera.aspect = est.w / est.h;
    enquadrar(est.p);
  }
  // no desktop o mapa fica à direita (um pouco mais na abertura, para não cruzar o título); no celular, em cima
  function enquadrar(p) {
    if (celular()) camera.setViewOffset(est.w, est.h, 0, est.h * 0.23, est.w, est.h);
    else camera.setViewOffset(est.w, est.h, -est.w * lerp(0.28, 0.2, ss(0.1, 0.8, p)), -est.h * 0.03, est.w, est.h);
    camera.updateProjectionMatrix();
  }

  function quadro(agora) {
    requestAnimationFrame(quadro);
    if (!est.ativo) return;
    const t = (agora - est.t0) / 1000;
    const k = calmo ? 1 : 0.085;
    est.p += (est.alvoP - est.p) * k;
    est.selForca += ((est.sel >= 0 ? 1 : 0) - est.selForca) * (calmo ? 1 : 0.07);
    if (!est.arrastando) { est.giro += est.giroVel; est.giroVel *= 0.93; }
    const p = est.p;
    enquadrar(p);

    const sobe = 0.42 + 0.58 * ss(0.12, 0.9, p);
    const paraInfl = ss(2.1, 2.9, p);
    const baixa = 1 - 0.5 * ss(1.05, 1.7, p) * (1 - ss(2.1, 2.8, p));
    const fincar = ss(1.02, 1.75, p);

    for (const b of blocos) {
      const entra = calmo ? 1 : saida(clamp((t - 0.15 - b.atraso * 1.0) / 1.15));
      const cresce = calmo ? 1 : saida(clamp((t - 1.0 - b.atraso * 0.9) / 1.3));
      const onda = ss(0, 1, clamp(paraInfl * 1.6 - b.atraso * 0.6));
      const v = lerp(valores.preco[b.ponto], valores.var[b.ponto], onda);
      const alvoLev = (b.ponto === est.sel ? 3.2 * est.selForca : 0) + (b.ponto === est.hover ? 1.4 : 0);
      b.lev += (alvoLev - b.lev) * (calmo ? 1 : 0.14);
      b.h = 0.9 + cresce * sobe * baixa * (5 + v * 22) + b.lev;
      b.malha.scale.z = b.h;
      b.malha.position.z = (1 - entra) * 70;
      b.malha.visible = entra > 0.001;
      escala(v);
      b.topo.color.copy(COR.bloco).lerp(cor, cresce);
      b.lado.color.copy(b.topo.color).offsetHSL(0, 0.04, -0.09);
    }
    alfinetes.forEach((a, i) => {
      const s = ss(0, 1, clamp(fincar * 1.8 - a.ordem * 0.8));
      const escolhido = i === est.sel ? est.selForca : 0;
      const vis = Math.max(s, escolhido);
      a.g.visible = vis > 0.01;
      a.g.position.z = blocos[a.dono].h + (1 - saida(vis)) * 26;
      a.g.scale.setScalar(0.6 + 0.4 * vis + escolhido * 0.7);
      a.cabeca.material.color.copy(COR.caro).lerp(COR.etiqueta, escolhido);
    });

    // câmera
    const i0 = Math.min(CAMERA.length - 2, Math.floor(p)), f = ss(0.12, 0.88, p - i0);
    const A = CAMERA[i0], B = CAMERA[i0 + 1];
    const vaga = calmo ? 0 : Math.sin(t * 0.16) * 0.07;
    const az = lerp(A[0], B[0], f) + vaga + est.giro + est.mx * 0.07;
    const pol = clamp(lerp(A[1], B[1], f) + est.my * 0.04, 0.14, 1.25);
    const pequeno = celular() ? 1.85 : 1;
    const dist = lerp(A[2], B[2], f) * pequeno * (1 - 0.3 * est.selForca);
    if (est.sel >= 0) v3.set(mapa.pontos[est.sel].x * 0.75, mapa.pontos[est.sel].y * 0.75, 4); else v3.set(0, -3, 4);
    est.alvo.lerp(v3, calmo ? 1 : 0.06);
    camera.position.set(
      est.alvo.x + dist * Math.sin(pol) * Math.sin(az),
      est.alvo.y - dist * Math.sin(pol) * Math.cos(az),
      est.alvo.z + dist * Math.cos(pol));
    camera.lookAt(est.alvo);

    if (est.mexeu && est.rato && !est.arrastando) {
      est.mexeu = false;
      raios.setFromCamera(est.rato, camera);
      const toque = raios.intersectObjects(blocos.map(b => b.malha), false)[0];
      const novo = toque ? toque.object.userData.i : -1;
      if (novo !== est.hover) { est.hover = novo; canvas.style.cursor = novo >= 0 ? 'pointer' : ''; }
    }
    renderer.render(cena, camera);
    aoPassar(est.hover, est.sel);
  }

  // onde um ponto de coleta aparece na tela, em pixels
  function naTela(i) {
    const a = alfinetes[i];
    v3.set(a.g.position.x, a.g.position.y, a.g.position.z + 9 * a.g.scale.x).project(camera);
    return { x: (v3.x * 0.5 + 0.5) * est.w, y: (-v3.y * 0.5 + 0.5) * est.h };
  }

  let ultimoX = 0;
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    est.rato = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    est.mexeu = true;
    if (est.arrastando) { est.giroVel = (e.clientX - ultimoX) * -0.0045; est.giro += est.giroVel; }
    ultimoX = e.clientX;
  });
  canvas.addEventListener('pointerdown', e => { est.arrastando = true; ultimoX = e.clientX; est.clique = [e.clientX, e.clientY]; });
  window.addEventListener('pointerup', e => {
    if (est.arrastando && est.clique && Math.hypot(e.clientX - est.clique[0], e.clientY - est.clique[1]) < 6 && est.hover >= 0) {
      canvas.dispatchEvent(new CustomEvent('ponto', { detail: est.hover }));
    }
    est.arrastando = false;
  });
  canvas.addEventListener('pointerleave', () => { est.hover = -1; est.rato = null; });
  if (!calmo) window.addEventListener('pointermove', e => {
    est.mx = (e.clientX / window.innerWidth - 0.5) * 2; est.my = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('resize', medir);
  medir();
  requestAnimationFrame(quadro);

  return {
    cena(p) { est.alvoP = clamp(p, 0, CAMERA.length - 1); },
    selecionar(i) { est.sel = i; },
    ativo(v) { est.ativo = v; },
    aoPassar(fn) { aoPassar = fn; },
    naTela,
  };
}
