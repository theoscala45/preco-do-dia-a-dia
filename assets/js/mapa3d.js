// Mapa 3D de brinquedo: os 96 distritos de São Paulo como peças macias. O scroll comanda a cena (ver DESIGN.md, "Movimento").
import * as THREE from '../vendor/three.min.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// sai rápido, passa um pouco do ponto e volta (o "pulo" das peças)
const pulo = t => { t = clamp(t); const s = 2.4, u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; };

const COR = {
  peca: new THREE.Color('#FFFDF6'), barato: new THREE.Color('#3DD9A0'), meio: new THREE.Color('#FFD23F'),
  caro: new THREE.Color('#FF6B5C'), ponto: new THREE.Color('#7A5CFF'), base: new THREE.Color('#9DB8F5'),
  nuvem: new THREE.Color('#FFFFFF'),
};
const ESCALA = ['#3DD9A0', '#A9E26F', '#FFD23F', '#FF9B4A', '#FF6B5C'].map(c => new THREE.Color(c));
const BORDA = 0.5;   // raio da borda arredondada no topo de cada peça
// câmera em cada cena: [giro, inclinação a partir do topo, distância]
const CAMERA = [[-0.35, 0.74, 212], [0.5, 1.0, 212], [0.04, 0.44, 232], [-0.62, 0.98, 212]];

const forma = aneis => {
  const f = new THREE.Shape(aneis[0].map(p => new THREE.Vector2(p[0], p[1])));
  aneis.slice(1).forEach(a => f.holes.push(new THREE.Path(a.map(p => new THREE.Vector2(p[0], p[1])))));
  return f;
};

// normais lisas nas laterais e nas bordas (o topo e o fundo continuam planos): tira o aspecto facetado
function alisar(geo) {
  const p = geo.attributes.position, nor = geo.attributes.normal, soma = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const chave = i => `${Math.round(p.getX(i) * 100)},${Math.round(p.getY(i) * 100)},${Math.round(p.getZ(i) * 100)}`;
  const faces = [];
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const n = b.sub(a).cross(c.sub(a)).normalize();
    const plana = Math.abs(n.z) > 0.999;
    faces.push(plana);
    if (plana) continue;
    for (let k = 0; k < 3; k++) { const q = chave(i + k); soma.set(q, (soma.get(q) || new THREE.Vector3()).add(n)); }
  }
  for (let i = 0; i < p.count; i++) {
    if (faces[(i / 3) | 0]) continue;
    const n = soma.get(chave(i)).clone().normalize();
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  nor.needsUpdate = true;
  return geo;
}

// só as paredes de uma peça, com normais lisas ao longo do contorno (altura 1, estica em z)
function paredes(polys, cx, cy) {
  const pos = [], nor = [], idx = [];
  for (const aneis of polys) aneis.forEach((anel, buraco) => {
    const n = anel.length, base = pos.length / 3;
    let area = 0;
    for (let i = 0; i < n; i++) { const q = anel[(i + 1) % n]; area += anel[i][0] * q[1] - q[0] * anel[i][1]; }
    const s = (area > 0 ? 1 : -1) * (buraco ? -1 : 1);
    const lado = i => { const q = anel[(i + 1) % n], r = anel[i], dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy) || 1; return [s * dy / l, -s * dx / l]; };
    for (let i = 0; i < n; i++) {
      const u = lado((i + n - 1) % n), v = lado(i), l = Math.hypot(u[0] + v[0], u[1] + v[1]) || 1;
      const nx = (u[0] + v[0]) / l, ny = (u[1] + v[1]) / l;
      pos.push(anel[i][0] - cx, anel[i][1] - cy, 0, anel[i][0] - cx, anel[i][1] - cy, 1);
      nor.push(nx, ny, 0, nx, ny, 0);
      const b0 = base + i * 2, b1 = base + ((i + 1) % n) * 2;
      if (s > 0) idx.push(b0, b1, b1 + 1, b0, b1 + 1, b0 + 1); else idx.push(b0, b1 + 1, b1, b0, b0 + 1, b1 + 1);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

export function criarMapa(canvas, mapa, valores, { calmo = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const celular = () => canvas.clientWidth < 860;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, celular() ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 900);
  camera.up.set(0, 0, 1);

  // luz de estúdio de brinquedo: clara por todo lado, sombra macia e azulada
  cena.add(new THREE.HemisphereLight('#ffffff', '#c9d6ff', 2.1));
  const sol = new THREE.DirectionalLight('#fff4dc', 1.55);
  sol.position.set(-70, -60, 130);
  sol.castShadow = true;
  sol.shadow.mapSize.set(celular() ? 1024 : 2048, celular() ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 420 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.7; sol.shadow.radius = 7;
  cena.add(sol);

  const chao = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.ShadowMaterial({ color: '#3B4FA8', opacity: 0.16 }));
  chao.receiveShadow = true; chao.position.z = -2.4;
  cena.add(chao);

  // bandeja: a silhueta da cidade, arredondada, embaixo das peças
  const geoBase = alisar(new THREE.ExtrudeGeometry((mapa.base || []).map(b => forma([b])), {
    depth: 1.0, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.7, bevelOffset: -0.7, bevelSegments: 5, curveSegments: 1,
  }).translate(0, 0, -1.7));
  const bandeja = new THREE.Mesh(geoBase, new THREE.MeshStandardMaterial({ color: COR.base, roughness: 0.75 }));
  bandeja.castShadow = bandeja.receiveShadow = true;
  cena.add(bandeja);

  // peças: corpo que estica + tampa de borda arredondada que sobe junto
  const raio = Math.max(...mapa.distritos.map(d => Math.hypot(d.c[0], d.c[1])));
  const alvos = [];
  const blocos = mapa.distritos.map(d => {
    const formas = (d.macio || d.polys).map(forma);
    const mat = new THREE.MeshStandardMaterial({ color: COR.peca.clone(), roughness: 0.58, metalness: 0 });
    const corpo = new THREE.Mesh(paredes(d.macio || d.polys, d.c[0], d.c[1]), mat);
    const tampa = new THREE.Mesh(alisar(new THREE.ExtrudeGeometry(formas, {
      depth: 0.02, bevelEnabled: true, bevelThickness: BORDA, bevelSize: BORDA, bevelOffset: -BORDA, bevelSegments: 5, curveSegments: 1,
    }).translate(-d.c[0], -d.c[1], 0)), mat);
    const g = new THREE.Group();
    g.position.set(d.c[0], d.c[1], 0);
    for (const m of [corpo, tampa]) { m.castShadow = m.receiveShadow = true; m.userData.i = d.ponto; g.add(m); alvos.push(m); }
    cena.add(g);
    return { g, corpo, tampa, mat, ponto: d.ponto, atraso: Math.hypot(d.c[0], d.c[1]) / raio, h: 1.5, vh: 0, v: 0, cresce: 0 };
  });

  // alfinetes gordinhos dos 25 pontos de coleta
  const R = 1.6, ZC = 3.5, fi = Math.acos(R / ZC), perfil = [new THREE.Vector2(0.001, 0.06), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.42, 0.12)];
  for (let k = 0; k <= 16; k++) { const a = lerp(fi, Math.PI, k / 16); perfil.push(new THREE.Vector2(Math.max(0.001, R * Math.sin(a)), ZC - R * Math.cos(a))); }
  const geoPino = new THREE.LatheGeometry(perfil, 28).rotateX(Math.PI / 2);
  const geoMiolo = new THREE.SphereGeometry(0.56, 18, 12).translate(0, 0, ZC + R * 0.8);
  const matMiolo = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 });
  const alfinetes = mapa.pontos.map((p, i) => {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(geoPino, new THREE.MeshStandardMaterial({ color: COR.ponto.clone(), roughness: 0.42 }));
    const miolo = new THREE.Mesh(geoMiolo, matMiolo);
    corpo.castShadow = true;
    g.add(corpo, miolo);
    g.position.set(p.x, p.y, 0);
    cena.add(g);
    const dono = blocos.reduce((m, b, k) => (b.ponto === i && b.atraso < m.a ? { a: b.atraso, k } : m), { a: 9, k: 0 }).k;
    return { g, dono, ordem: (i * 7) % 25 / 25, s: 0, vs: 0 };
  });

  // nuvens de bolinhas que passeiam em volta da cidade
  const geoBola = new THREE.SphereGeometry(1, 20, 14);
  const matNuvem = new THREE.MeshStandardMaterial({ color: COR.nuvem, roughness: 1 });
  const nuvens = [0, 1, 2, 3, 4, 5].map(i => {
    const g = new THREE.Group();
    [[0, 0, 0, 3.4], [3.2, 0.4, -0.5, 2.6], [-3.1, -0.3, -0.6, 2.4], [1.2, 0.2, 1.6, 2.3], [-1.4, 0.1, 1.2, 1.9]].forEach(([x, y, z, r]) => {
      const b = new THREE.Mesh(geoBola, matNuvem);
      b.position.set(x, y, z); b.scale.set(r, r * 0.8, r * 0.72);
      g.add(b);
    });
    cena.add(g);
    return { g, ang: i * 1.047 + (i % 2) * 0.4, raio: 50 + (i % 3) * 9, z: 13 + (i * 5) % 12, vel: 0.02 + (i % 3) * 0.008, tam: 0.8 + (i % 4) * 0.16 };
  });

  const est = {
    p: 0, alvoP: 0, sel: -1, selForca: 0, hover: -1, giro: 0, giroVel: 0,
    mx: 0, my: 0, rato: null, mexeu: false, t0: performance.now(), antes: performance.now(), sobra: 0, ativo: true,
    alvo: new THREE.Vector3(), w: 1, h: 1, arrastando: false, az: 0,
  };
  const raios = new THREE.Raycaster();
  const cor = new THREE.Color();
  const v3 = new THREE.Vector3();
  let aoPassar = () => {};

  function escala(v) { // verde, limão, amarelo, laranja, coral
    const k = clamp(v) * (ESCALA.length - 1), i = Math.min(ESCALA.length - 2, Math.floor(k));
    return cor.copy(ESCALA[i]).lerp(ESCALA[i + 1], k - i);
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
    else camera.setViewOffset(est.w, est.h, -est.w * (lerp(0.27, 0.2, ss(0.1, 0.8, p)) + 0.05 * est.selForca * (1 - ss(0.1, 0.8, p))), -est.h * 0.03, est.w, est.h);
    camera.updateProjectionMatrix();
  }

  // um passo de física (1/60 s): molas das peças e dos alfinetes
  function passo(t, p) {
    const sobe = 0.42 + 0.58 * ss(0.12, 0.9, p);
    const paraInfl = ss(2.1, 2.9, p);
    const baixa = 1 - 0.5 * ss(1.05, 1.7, p) * (1 - ss(2.1, 2.8, p));
    const fincar = ss(1.02, 1.75, p);
    est.selForca += ((est.sel >= 0 ? 1 : 0) - est.selForca) * (calmo ? 1 : 0.07);

    for (const b of blocos) {
      const cresce = calmo ? 1 : ss(0, 1, (t - 1.15 - b.atraso * 0.9) / 0.9);
      const onda = ss(0, 1, clamp(paraInfl * 1.6 - b.atraso * 0.6));
      const v = lerp(valores.preco[b.ponto], valores.var[b.ponto], onda);
      const lev = (b.ponto === est.sel ? 3.4 * est.selForca : 0) + (b.ponto === est.hover ? 1.8 : 0);
      const alvo = 1.5 + cresce * sobe * baixa * (3.2 + v * 15) + lev;
      if (calmo) { b.h = alvo; b.vh = 0; }
      else { b.vh = (b.vh + (alvo - b.h) * 0.11) * 0.8; b.h += b.vh; }
      b.v = v; b.cresce = cresce;
    }
    alfinetes.forEach((a, i) => {
      const escolhido = i === est.sel ? est.selForca : 0;
      const alvo = Math.max(ss(0, 1, clamp(fincar * 1.8 - a.ordem * 0.8)), escolhido);
      if (calmo) { a.s = alvo; a.vs = 0; }
      else { a.vs = (a.vs + (alvo - a.s) * 0.13) * 0.76; a.s += a.vs; }
    });
  }

  function quadro(agora) {
    requestAnimationFrame(quadro);
    if (!est.ativo) { est.antes = agora; return; }
    const t = (agora - est.t0) / 1000;
    est.sobra = Math.min(est.sobra + (agora - est.antes) / 1000, 0.1); est.antes = agora;
    while (est.sobra >= 1 / 60) {
      est.sobra -= 1 / 60;
      est.p += (est.alvoP - est.p) * (calmo ? 1 : 0.085);
      if (!est.arrastando) { est.giro += est.giroVel; est.giroVel *= 0.93; }
      passo(t, est.p);
    }
    const p = est.p;
    enquadrar(p);

    for (const b of blocos) {
      const entra = calmo ? 1 : pulo((t - 0.15 - b.atraso * 0.85) / 0.75);
      const h = Math.max(1.2, b.h);
      // estica e achata: quem sobe depressa afina, quem desce engorda
      const gordo = calmo ? 1 : 1 - clamp(b.vh * 0.045, -0.05, 0.05);
      b.g.visible = entra > 0.002;
      b.g.scale.set(entra * gordo, entra * gordo, Math.max(0.001, entra));
      b.corpo.scale.z = h - BORDA - 0.01;
      b.tampa.position.z = h - BORDA - 0.02;
      escala(b.v);
      b.mat.color.copy(COR.peca).lerp(cor, b.cresce);
    }
    alfinetes.forEach((a, i) => {
      const escolhido = i === est.sel ? est.selForca : 0;
      const s = Math.max(0, a.s);
      a.g.visible = s > 0.01;
      const pulinho = calmo ? 0 : Math.abs(Math.sin(t * 4.2)) * 1.5 * escolhido;
      a.g.position.z = blocos[a.dono].h * blocos[a.dono].g.scale.z + (1 - Math.min(1, s)) * 16 + pulinho;
      const e = (0.25 + 0.75 * s) * (1 + escolhido * 0.55);
      const aperto = 1 - 0.1 * escolhido * (calmo ? 0 : Math.cos(t * 8.4));   // achata ao tocar o chão
      a.g.scale.set(e * aperto, e * aperto, e * (2 - aperto));
    });

    // câmera
    const i0 = Math.min(CAMERA.length - 2, Math.floor(p)), f = ss(0.12, 0.88, p - i0);
    const A = CAMERA[i0], B = CAMERA[i0 + 1];
    const vaga = calmo ? 0 : Math.sin(t * 0.16) * 0.07;
    const az = lerp(A[0], B[0], f) + vaga + est.giro + est.mx * 0.07;
    const pol = clamp(lerp(A[1], B[1], f) + est.my * 0.04, 0.14, 1.25);
    const pequeno = celular() ? 1.85 : 1;
    const dist = lerp(A[2], B[2], f) * pequeno * (1 - lerp(0.16, 0.3, ss(0.2, 0.9, p)) * est.selForca);
    if (est.sel >= 0) v3.set(mapa.pontos[est.sel].x * 0.75, mapa.pontos[est.sel].y * 0.75, 4); else v3.set(0, -3, 4);
    est.alvo.lerp(v3, calmo ? 1 : 0.06);
    camera.position.set(
      est.alvo.x + dist * Math.sin(pol) * Math.sin(az),
      est.alvo.y - dist * Math.sin(pol) * Math.cos(az),
      est.alvo.z + dist * Math.cos(pol));
    camera.lookAt(est.alvo);

    // nuvens: giram devagar em volta e encolhem quando ficariam na frente da cidade
    const entraNuvem = calmo ? 1 : pulo((t - 1.4) / 0.9);
    for (const n of nuvens) {
      const a = n.ang + (calmo ? 0 : t * n.vel);
      const x = Math.sin(a) * n.raio, y = -Math.cos(a) * n.raio;
      const frente = Math.cos(a - az);   // 1 = entre a câmera e a cidade
      n.g.position.set(x, y, n.z + (calmo ? 0 : Math.sin(t * 0.7 + n.ang * 3) * 0.8));
      // no desktop, some também quando passaria por trás do texto, à esquerda
      const naColuna = celular() ? 1 : ss(-0.3, 0.02, v3.copy(n.g.position).project(camera).x);
      const s = n.tam * entraNuvem * (1 - ss(0.05, 0.6, frente)) * naColuna;
      n.g.visible = s > 0.01;
      n.g.rotation.z = az;
      n.g.scale.setScalar(Math.max(0.001, s));
    }

    if (est.mexeu && est.rato && !est.arrastando) {
      est.mexeu = false;
      raios.setFromCamera(est.rato, camera);
      const toque = raios.intersectObjects(alvos, false)[0];
      const novo = toque ? toque.object.userData.i : -1;
      if (novo !== est.hover) { est.hover = novo; canvas.style.cursor = novo >= 0 ? 'pointer' : ''; }
    }
    renderer.render(cena, camera);
    aoPassar(est.hover, est.sel);
  }

  // onde um ponto de coleta aparece na tela, em pixels
  function naTela(i) {
    const a = alfinetes[i];
    v3.set(a.g.position.x, a.g.position.y, a.g.position.z + 6.4 * a.g.scale.z).project(camera);
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
