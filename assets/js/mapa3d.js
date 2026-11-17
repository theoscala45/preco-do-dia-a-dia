// Mapa 3D de brinquedo. A cidade inteira aparece calma; com um CEP a câmera mergulha no bairro,
// as lojinhas das redes nascem em volta e um caminho de luz corre até cada uma (ver DESIGN.md, "Mapa").
import * as THREE from '../vendor/three.min.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// sai rápido, passa um pouco do ponto e volta (o "pulo" das peças)
const pulo = t => { t = clamp(t); const s = 2.4, u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
const hex = c => new THREE.Color(c);
// números repetíveis: a mesma semente dá sempre a mesma arrumação
const semente = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

const COR = {
  dia: [hex('#F6F9FF'), hex('#CFDFFF')],        // peças na visão geral, um tom por distrito
  noite: [hex('#7490EE'), hex('#627DE3')],      // peças quando a câmera mergulha
  regiao: [hex('#A3B8FA'), hex('#93AAF5')],     // distritos do ponto em foco
  escolha: hex('#FFE07A'), base: hex('#9DB8F5'), baseNoite: hex('#4860CC'),
  ponto: hex('#7A5CFF'), nuvem: hex('#FFFFFF'), luz: hex('#FFD84D'), barato: hex('#4DEBB0'),
};
// toldos das lojinhas: cores do site, não das marcas
const TOLDOS = ['#FF86B8', '#FF9B4A', '#8E6BFF', '#4CC3FF', '#FF6B5C', '#FFD23F', '#E76BE0', '#5B7CFA', '#FF86B8'];
const BORDA = 0.5;     // raio da borda arredondada no topo de cada peça
const ALTURA = 1.5;    // altura das peças
const TAN = Math.tan(15 * Math.PI / 180);   // metade do campo de visão (30°)
// câmera da cidade inteira em cada cena do scroll: [giro, inclinação a partir do topo]
const CAMERA = [[-0.16, 0.6], [0.34, 0.74], [0.5, 0.8], [-0.42, 0.7]];
const DEMO = 5;        // sem CEP, a cena das redes mostra Pinheiros
const N_FAIXA = 80;    // amostras de cada caminho
const RAIO = 12.4;     // raio do prato: o pedaço da cidade que fica quando a câmera mergulha

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

// toldo listrado: um cone cortado, gomo colorido, gomo branco
function toldo(cor) {
  const pos = [], nor = [], col = [], n = 14, r0 = 0.62, z0 = 1.95, r1 = 1.6, z1 = 1.12, branco = hex('#FFFFFF');
  const dz = z0 - z1, dr = r1 - r0, l = Math.hypot(dz, dr);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2, c = i % 2 ? branco : cor;
    const v = [[a, r1, z1], [b, r1, z1], [b, r0, z0], [a, r1, z1], [b, r0, z0], [a, r0, z0]];
    for (const [g, r, z] of v) {
      pos.push(Math.cos(g) * r, Math.sin(g) * r, z);
      nor.push(Math.cos(g) * dz / l, Math.sin(g) * dz / l, dr / l);
      col.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

// caminho com cara de rua: trechos retos numa grade inclinada, esquinas arredondadas, amostrado por igual
function rua(P, S, teta, tipo) {
  const c = Math.cos(teta), s = Math.sin(teta), dx = S[0] - P[0], dy = S[1] - P[1];
  const a = dx * c + dy * s, b = -dx * s + dy * c;
  const local = (u, v) => [P[0] + u * c - v * s, P[1] + u * s + v * c];
  const nos = tipo === 0 ? [P, local(a, 0), S] : tipo === 1 ? [P, local(0, b), S] : [P, local(a * 0.5, 0), local(a * 0.5, b), S];
  const pts = [nos[0]];
  for (let i = 1; i < nos.length - 1; i++) {
    const A = nos[i - 1], V = nos[i], B = nos[i + 1];
    const la = Math.hypot(A[0] - V[0], A[1] - V[1]), lb = Math.hypot(B[0] - V[0], B[1] - V[1]);
    const r = Math.min(1.5, la / 2, lb / 2);
    if (r < 0.05) { pts.push(V); continue; }
    const e = [V[0] + (A[0] - V[0]) / la * r, V[1] + (A[1] - V[1]) / la * r], f = [V[0] + (B[0] - V[0]) / lb * r, V[1] + (B[1] - V[1]) / lb * r];
    for (let k = 0; k <= 8; k++) { const t = k / 8, m = 1 - t; pts.push([m * m * e[0] + 2 * m * t * V[0] + t * t * f[0], m * m * e[1] + 2 * m * t * V[1] + t * t * f[1]]); }
  }
  pts.push(nos.at(-1));
  const acum = [0];
  for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = Math.max(0.01, acum.at(-1) - 1.05), saida = [];   // para na porta da lojinha
  for (let k = 0, j = 1; k < N_FAIXA; k++) {
    const d = total * k / (N_FAIXA - 1);
    while (j < pts.length - 1 && acum[j] < d) j++;
    const t = (d - acum[j - 1]) / (acum[j] - acum[j - 1] || 1);
    saida.push([lerp(pts[j - 1][0], pts[j][0], t), lerp(pts[j - 1][1], pts[j][1], t)]);
  }
  const u = nos.at(-2), fim = nos.at(-1), lf = Math.hypot(fim[0] - u[0], fim[1] - u[1]) || 1;
  return { pts: saida, comp: total, dir: [(fim[0] - u[0]) / lf, (fim[1] - u[1]) / lf] };
}

const VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
// a luz corre do alfinete até a lojinha; depois ficam pulsos andando no mesmo sentido
const FRAG = `
uniform float uProg,uTempo,uComp,uForca,uVerde,uApaga;uniform vec3 uCor,uCorVerde;varying vec2 vUv;
void main(){
  float lado=abs(vUv.y*2.-1.), s=vUv.x*uComp, frente=uProg*(uComp+1.2)-.6;
  float aceso=smoothstep(frente,frente-.7,s);
  float miolo=smoothstep(.4,.26,lado), halo=exp(-lado*lado*4.5);
  float cabeca=exp(-pow((s-frente)/1.3,2.))*step(uProg,.999)*step(.001,uProg);
  float pulso=pow(.5+.5*sin((s-uTempo*4.2)*1.25),10.);
  float pontas=smoothstep(0.,.5,s)*smoothstep(uComp,uComp-.5,s);
  float vivo=mix(1.,.55,uApaga);
  vec3 cor=mix(uCor,uCorVerde,uVerde);
  float brilho=aceso*(.85+.45*pulso)*vivo+cabeca*1.3;
  vec3 c=mix(cor,vec3(1.),clamp(.04+.6*pulso*aceso+cabeca*.8,0.,.85));
  float f=pontas*uForca;
  float a=clamp(max(miolo*.22*(1.-aceso),miolo*min(1.,brilho*1.25)),0.,1.)*f;   // miolo opaco
  vec3 luz=cor*halo*brilho*.36*f;                                            // halo somado por cima do chão
  gl_FragColor=vec4(c*a+luz,a);
  #include <colorspace_fragment>
}`;

// recorta um material em círculo em volta do foco: fora do raio, nada é desenhado
const recorte = { foco: { value: new THREE.Vector2() }, raio: { value: 999 } };
function recortar(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uFoco = recorte.foco; sh.uniforms.uRaio = recorte.raio;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vMundo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMundo=(modelMatrix*vec4(transformed,1.)).xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vMundo;uniform vec2 uFoco;uniform float uRaio;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif(distance(vMundo,uFoco)>uRaio)discard;');
  };
  return mat;
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
  const ceu = new THREE.HemisphereLight('#ffffff', '#c9d6ff', 2.1);
  const sol = new THREE.DirectionalLight('#fff4dc', 1.55);
  sol.position.set(-70, -60, 130);
  sol.castShadow = true;
  sol.shadow.mapSize.set(celular() ? 1024 : 2048, celular() ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 420 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.7; sol.shadow.radius = 7;
  // lampião do bairro: acende quando a câmera mergulha
  const lampiao = new THREE.PointLight('#FFD98A', 0, 34, 1.7);
  cena.add(ceu, sol, lampiao);

  const chao = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.ShadowMaterial({ color: '#3B4FA8', opacity: 0.16 }));
  chao.receiveShadow = true; chao.position.z = -2.4;
  cena.add(chao);

  // bandeja: a silhueta da cidade, arredondada, embaixo das peças
  const contorno = (mapa.base || []).flat();
  const geoBase = alisar(new THREE.ExtrudeGeometry((mapa.base || []).map(b => forma([b])), {
    depth: 1.0, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.7, bevelOffset: -0.7, bevelSegments: 5, curveSegments: 1,
  }).translate(0, 0, -1.7));
  const matSombra = recortar(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
  const bandeja = new THREE.Mesh(geoBase, recortar(new THREE.MeshStandardMaterial({ color: COR.base.clone(), roughness: 0.75, side: THREE.DoubleSide })));
  bandeja.castShadow = bandeja.receiveShadow = true; bandeja.customDepthMaterial = matSombra;
  cena.add(bandeja);

  // prato: quando a câmera mergulha, sobra um disco da cidade dentro de uma borda clara
  const b0 = RAIO - 0.2, b1 = RAIO + 1.0, topo = ALTURA + 0.3;
  const perfilPrato = [[0.001, -1.1], [b1 - 0.6, -1.1], [b1 - 0.16, -0.94], [b1, -0.5], [b1, topo - 0.45], [b1 - 0.13, topo - 0.13], [b1 - 0.45, topo],
    [b0 + 0.45, topo], [b0 + 0.13, topo - 0.13], [b0, topo - 0.45], [b0, 0]].map(q => new THREE.Vector2(q[0], q[1]));
  const prato = new THREE.Group();
  const aro = new THREE.Mesh(new THREE.LatheGeometry(perfilPrato, 96).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#FFFDF6', emissive: '#FFFDF6', emissiveIntensity: 0.22, roughness: 0.55 }));
  const fundo = new THREE.Mesh(new THREE.CircleGeometry(b0 + 0.05, 96), new THREE.MeshStandardMaterial({ color: COR.baseNoite, roughness: 0.75 }));
  fundo.position.z = 0.03;
  aro.castShadow = aro.receiveShadow = fundo.receiveShadow = true;
  prato.add(aro, fundo); prato.visible = false;
  cena.add(prato);
  const naCidade = (x, y) => {
    let dentro = false;
    for (const anel of mapa.base || []) for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const a = anel[i], b = anel[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) dentro = !dentro;
    }
    return dentro;
  };

  // peças: corpo + tampa de borda arredondada
  const raio = Math.max(...mapa.distritos.map(d => Math.hypot(d.c[0], d.c[1])));
  const alvos = [], tom = semente(7);
  const blocos = mapa.distritos.map(d => {
    const formas = (d.macio || d.polys).map(forma);
    const mat = recortar(new THREE.MeshStandardMaterial({ color: COR.dia[0].clone(), roughness: 0.58, metalness: 0, side: THREE.DoubleSide }));
    const corpo = new THREE.Mesh(paredes(d.macio || d.polys, d.c[0], d.c[1]), mat);
    const tampa = new THREE.Mesh(alisar(new THREE.ExtrudeGeometry(formas, {
      depth: 0.02, bevelEnabled: true, bevelThickness: BORDA, bevelSize: BORDA, bevelOffset: -BORDA, bevelSegments: 5, curveSegments: 1,
    }).translate(-d.c[0], -d.c[1], 0)), mat);
    const g = new THREE.Group();
    g.position.set(d.c[0], d.c[1], 0);
    for (const m of [corpo, tampa]) { m.castShadow = m.receiveShadow = true; m.customDepthMaterial = matSombra; m.userData.i = d.ponto; g.add(m); alvos.push(m); }
    cena.add(g);
    return { g, corpo, tampa, mat, ponto: d.ponto, atraso: Math.hypot(d.c[0], d.c[1]) / raio, tom: tom(), h: ALTURA, vh: 0, quente: 0 };
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
    return { g, ordem: (i * 7) % 25 / 25, s: 0, vs: 0 };
  });

  // lojinhas: uma por rede, redondas, com toldo listrado. Nascem em volta do ponto em foco.
  const geoCorpo = new THREE.CylinderGeometry(1, 1.04, 1.3, 30).rotateX(Math.PI / 2).translate(0, 0, 0.65);
  const geoPorta = new THREE.BoxGeometry(0.62, 0.2, 0.88).translate(0, -0.98, 0.44);
  const geoJanela = new THREE.BoxGeometry(0.42, 0.16, 0.4);
  const geoCupula = new THREE.SphereGeometry(0.64, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.55).translate(0, 0, 1.93);
  const geoBolinha = new THREE.SphereGeometry(0.2, 14, 10).translate(0, 0, 2.42);
  const geoAnel = new THREE.RingGeometry(1.95, 2.45, 48);
  const matParede = new THREE.MeshStandardMaterial({ color: '#FFFDF6', roughness: 0.6 });
  const matPorta = new THREE.MeshStandardMaterial({ color: '#1E2757', roughness: 0.5 });
  const matJanela = new THREE.MeshStandardMaterial({ color: '#FFE38A', emissive: '#FFD23F', emissiveIntensity: 1.1, roughness: 0.4 });
  const NL = valores.redes;
  const lojas = Array.from({ length: NL }, (_, k) => {
    const cor = hex(TOLDOS[k % TOLDOS.length]), g = new THREE.Group();
    const corpo = new THREE.Mesh(geoCorpo, matParede), porta = new THREE.Mesh(geoPorta, matPorta);
    const lona = new THREE.Mesh(toldo(cor), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: THREE.DoubleSide }));
    const cupula = new THREE.Mesh(geoCupula, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55 }));
    const bolinha = new THREE.Mesh(geoBolinha, matParede);
    g.add(corpo, porta, lona, cupula, bolinha);
    for (const a of [-1.05, 1.05]) {
      const j = new THREE.Mesh(geoJanela, matJanela);
      j.position.set(Math.sin(a) * 0.98, -Math.cos(a) * 0.98, 0.78); j.rotation.z = a;
      g.add(j);
    }
    for (const m of [corpo, lona, cupula]) m.castShadow = true;
    const anel = new THREE.Mesh(geoAnel, new THREE.MeshBasicMaterial({ color: COR.barato, transparent: true, opacity: 0, depthWrite: false }));
    anel.position.z = 0.09;
    const pai = new THREE.Group();
    pai.add(g, anel); pai.visible = false;
    cena.add(pai);

    // faixa do caminho: duas fileiras de vértices ao longo da rua
    const geo = new THREE.BufferGeometry(), uv = [], idx = [];
    for (let i = 0; i < N_FAIXA; i++) {
      uv.push(i / (N_FAIXA - 1), 0, i / (N_FAIXA - 1), 1);
      if (i) { const b = i * 2; idx.push(b - 2, b - 1, b, b - 1, b + 1, b); }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N_FAIXA * 6), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const u = {
      uProg: { value: 0 }, uTempo: { value: 0 }, uComp: { value: 1 }, uForca: { value: 0 }, uVerde: { value: 0 }, uApaga: { value: 0 },
      uCor: { value: COR.luz }, uCorVerde: { value: COR.barato },
    };
    const faixa = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
    faixa.frustumCulled = false; faixa.visible = false; faixa.renderOrder = 2;
    cena.add(faixa);
    return { pai, g, anel, faixa, u, x: 0, y: 0, s: 0, vs: 0, prog: 0, verde: 0, apaga: 0, tela: { x: 0, y: 0, s: 0, chegou: false, melhor: false } };
  });

  // põe as lojinhas em volta do ponto, sempre dentro da cidade, e traça a rua até cada uma
  function arrumar(i) {
    const P = mapa.pontos[i], rnd = semente(i * 97 + 13), a0 = rnd() * 6.283, teta = rnd() * 1.571, postas = [];
    lojas.forEach((L, k) => {
      const ang = a0 + k * 6.283 / NL, r = 6.3 + ((k * 3) % NL) / NL * 2.9;
      let melhor = null;
      for (const da of [0, 0.3, -0.3, 0.6, -0.6, 0.95, -0.95, 1.4, -1.4]) for (const fr of [1, 0.8, 0.62, 0.46]) {
        const x = P.x + Math.cos(ang + da) * r * fr, y = P.y + Math.sin(ang + da) * r * fr;
        const dentro = [[0, 0], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]].every(([u, v]) => naCidade(x + u, y + v));
        const livre = postas.every(q => Math.hypot(q[0] - x, q[1] - y) > 3.3);
        const custo = Math.abs(da) * 3 + (1 - fr) * 4 + (dentro ? 0 : 50) + (livre ? 0 : 20);
        if (!melhor || custo < melhor.custo) melhor = { x, y, custo };
      }
      postas.push([melhor.x, melhor.y]);
      L.x = melhor.x; L.y = melhor.y;
      const cam = rua([P.x, P.y], [L.x, L.y], teta, k % 3);
      L.pai.position.set(L.x, L.y, ALTURA);
      L.g.rotation.z = Math.atan2(-cam.dir[0], cam.dir[1]);
      L.u.uComp.value = cam.comp;
      const pos = L.faixa.geometry.attributes.position, larg = 1.15, z = ALTURA + 0.07;
      cam.pts.forEach((q, j) => {
        const a = cam.pts[Math.max(0, j - 1)], b = cam.pts[Math.min(N_FAIXA - 1, j + 1)];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l * larg, ny = (b[0] - a[0]) / l * larg;
        pos.setXYZ(j * 2, q[0] + nx, q[1] + ny, z); pos.setXYZ(j * 2 + 1, q[0] - nx, q[1] - ny, z);
      });
      pos.needsUpdate = true;
    });
  }

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
    w: 1, h: 1, arrastando: false,
    foco: -1, dentro: false, tFoco: 0, z1: 0, z2: 0, veredito: false, prato: 0, vPrato: 0,
    focoV: new THREE.Vector3(), alvo: new THREE.Vector3(),
  };
  const raios = new THREE.Raycaster();
  const cor = new THREE.Color();
  const v3 = new THREE.Vector3();
  const circulo = Array.from({ length: 10 }, (_, k) => [Math.cos(k * 0.628), Math.sin(k * 0.628)]);
  let aoPassar = () => {};

  function medir() {
    est.w = canvas.clientWidth; est.h = canvas.clientHeight;
    renderer.setSize(est.w, est.h, false);
    camera.aspect = est.w / est.h;
  }
  // área da tela reservada ao mapa: à direita no desktop, em cima no celular. Devolve a meia largura e a meia altura (0 a 1).
  function enquadrar(p) {
    const f = ss(0.1, 0.8, p);
    if (celular()) { camera.setViewOffset(est.w, est.h, 0, est.h * 0.232, est.w, est.h); camera.updateProjectionMatrix(); return [lerp(0.9, 0.8, est.z2), 0.3]; }
    camera.setViewOffset(est.w, est.h, -est.w * lerp(0.245, 0.21, f), -est.h * 0.04, est.w, est.h);
    camera.updateProjectionMatrix();
    return [lerp(0.44, 0.5, f), 0.78];
  }
  // distância em que todos os pontos cabem na área do mapa, para um giro e uma inclinação
  function distPara(az, pol, ax, ay, pontos) {
    const sp = Math.sin(pol), cp = Math.cos(pol), sa = Math.sin(az), ca = Math.cos(az);
    let d = 0;
    for (const [x, y, z] of pontos) {
      const qr = x * ca + y * sa, qu = -x * sa * cp + y * ca * cp + z * sp, qf = -x * sp * sa + y * sp * ca - z * cp;
      d = Math.max(d, Math.abs(qr) / (ax * TAN * camera.aspect) - qf, Math.abs(qu) / (ay * TAN) - qf);
    }
    return d;
  }
  const cidade = contorno.map(q => [q[0], q[1], 0]).concat(contorno.filter((_, i) => i % 4 === 0).map(q => [q[0], q[1], 4]));

  // quanto a câmera mergulha em cada momento do scroll, e em qual ponto
  function mergulho(p) {
    const noTopo = est.sel >= 0 ? 1 - ss(0.3, 0.72, p) : 0;
    const nasRedes = ss(1.32, 1.72, p) * (1 - ss(2.28, 2.7, p));
    return [Math.max(noTopo, nasRedes), est.sel >= 0 ? est.sel : DEMO];
  }

  // um passo de física (1/60 s)
  function passo(t, p) {
    const [zAlvo, foco] = mergulho(p);
    const dentro = zAlvo > 0.5;
    if (foco !== est.foco) {
      est.foco = foco; arrumar(foco);
      for (const L of lojas) { L.s = L.vs = L.prog = L.verde = L.apaga = 0; }
      if (dentro) est.tFoco = t;
    }
    if (dentro !== est.dentro) { est.dentro = dentro; if (dentro) est.tFoco = t; }
    if (calmo) est.z1 = est.z2 = zAlvo;
    else { est.z1 += (zAlvo - est.z1) * 0.055; est.z2 += (est.z1 - est.z2) * 0.085; }
    const zo = est.z2, s = !dentro ? -1 : calmo ? 99 : t - est.tFoco;
    est.selForca += ((est.sel >= 0 ? 1 : 0) - est.selForca) * (calmo ? 1 : 0.07);

    // onda calma que passa pela cidade de vez em quando
    const fase = (t * 0.2) % 2.6 - 0.4;
    for (const b of blocos) {
      const onda = calmo ? 0 : Math.exp(-Math.pow((fase - b.atraso) * 5, 2)) * 0.75 * ss(1.6, 2.6, t);
      const lev = (b.ponto === est.hover ? 1.3 : 0) + (b.ponto === est.sel ? 0.9 * est.selForca : 0) + onda;
      const alvo = ALTURA + lev * (1 - zo);
      if (calmo) { b.h = alvo; b.vh = 0; }
      else { b.vh = (b.vh + (alvo - b.h) * 0.11) * 0.8; b.h += b.vh; }
      b.quente += ((b.ponto === est.hover || b.ponto === est.sel ? 1 : 0) - b.quente) * (calmo ? 1 : 0.12);
    }
    const fincar = ss(0.45, 1.0, p);
    alfinetes.forEach((a, i) => {
      const meu = i === est.sel ? est.selForca : 0, emFoco = i === foco ? zo : 0;
      const alvo = Math.max(ss(0, 1, clamp(fincar * 1.8 - a.ordem * 0.8)) * (1 - zo), meu, emFoco);
      if (calmo) { a.s = alvo; a.vs = 0; }
      else { a.vs = (a.vs + (alvo - a.s) * 0.13) * 0.76; a.s += a.vs; }
    });

    const sobe = zo > 0.7 && zAlvo > 0.5 ? 1 : 0;
    if (calmo) est.prato = zAlvo > 0.5 ? 1 : 0; else { est.vPrato = (est.vPrato + (sobe - est.prato) * 0.1) * 0.78; est.prato += est.vPrato; }
    est.veredito = s > 1.5 + (NL - 1) * 0.13 + 0.85 + 0.25;
    const melhor = valores.melhor(foco);
    lojas.forEach((L, k) => {
      const alvo = s > 1.05 + k * 0.09 ? 1 : 0;
      if (calmo) { L.s = alvo; L.vs = 0; } else { L.vs = (L.vs + (alvo - L.s) * 0.16) * 0.72; L.s += L.vs; }
      if (dentro) { const q = clamp((s - 1.5 - k * 0.13) / 0.85); L.prog = q * q * (3 - 2 * q); }
      else if (zo < 0.04) L.prog = 0;
      const k2 = calmo ? 1 : 0.07;
      L.verde += ((est.veredito && k === melhor ? 1 : 0) - L.verde) * k2;
      L.apaga += ((est.veredito && k !== melhor ? 1 : 0) - L.apaga) * k2;
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
    const p = est.p, zo = est.z2, foco = est.foco, P = mapa.pontos[foco];
    const [ax, ay] = enquadrar(p);

    // luz: o dia baixa e o lampião do bairro acende
    ceu.intensity = lerp(2.1, 1.3, zo);
    sol.intensity = lerp(1.55, 0.85, zo);
    lampiao.intensity = zo * 110;
    lampiao.position.set(P.x, P.y, 9);
    bandeja.material.color.copy(COR.base).lerp(COR.baseNoite, zo);

    for (const b of blocos) {
      const entra = calmo ? 1 : pulo((t - 0.15 - b.atraso * 0.85) / 0.75);
      const h = Math.max(1.2, b.h);
      // estica e achata: quem sobe depressa afina, quem desce engorda
      const gordo = calmo ? 1 : 1 - clamp(b.vh * 0.045, -0.05, 0.05);
      b.g.visible = entra > 0.002;
      b.g.scale.set(entra * gordo, entra * gordo, Math.max(0.001, entra));
      b.corpo.scale.z = h - BORDA - 0.01;
      b.tampa.position.z = h - BORDA - 0.02;
      const perto = b.ponto === foco ? COR.regiao : COR.noite;
      cor.copy(perto[0]).lerp(perto[1], b.tom);
      b.mat.color.copy(COR.dia[0]).lerp(COR.dia[1], b.tom).lerp(COR.escolha, b.quente * 0.85 * (1 - zo)).lerp(cor, zo);
    }
    alfinetes.forEach((a, i) => {
      const meu = i === est.sel ? est.selForca * (1 - zo) : 0;
      const s = Math.max(0, a.s);
      a.g.visible = s > 0.01;
      const pulinho = calmo ? 0 : Math.abs(Math.sin(t * 4.2)) * 1.5 * meu;
      a.g.position.z = ALTURA + (1 - Math.min(1, s)) * 16 + pulinho;
      const e = (0.25 + 0.75 * s) * lerp(1 + meu * 0.55, 0.62, i === foco ? zo : 0);
      const aperto = 1 - 0.1 * meu * (calmo ? 0 : Math.cos(t * 8.4));   // achata ao tocar o chão
      a.g.scale.set(e * aperto, e * aperto, e * (2 - aperto));
    });

    // câmera: da cidade inteira até o bairro, girando um pouco no mergulho
    const i0 = Math.min(CAMERA.length - 2, Math.floor(p)), f = ss(0.12, 0.88, p - i0);
    const A = CAMERA[i0], B = CAMERA[i0 + 1];
    const vaga = calmo ? 0 : Math.sin(t * 0.16) * 0.06;
    const azLonge = lerp(A[0], B[0], f) + vaga + est.giro + est.mx * 0.06;
    const polLonge = clamp(lerp(A[1], B[1], f) + est.my * 0.035, 0.14, 1.25);
    const azPerto = azLonge + 0.5, polPerto = celular() ? 0.86 : 0.98;
    if (zo < 0.02) est.focoV.set(P.x, P.y, ALTURA); else est.focoV.lerp(v3.set(P.x, P.y, ALTURA), calmo ? 1 : 0.07);
    const dLonge = distPara(azLonge, polLonge, ax, ay, cidade) * 1.03;
    const rz = RAIO + 1.6;
    const dPerto = distPara(azPerto, polPerto, ax, ay, circulo.map(c => [c[0] * rz, c[1] * rz, 0]).concat(circulo.map(c => [c[0] * 10, c[1] * 10, 5])));
    const az = lerp(azLonge, azPerto, zo), pol = lerp(polLonge, polPerto, zo);
    const dist = Math.exp(lerp(Math.log(dLonge), Math.log(dPerto), zo));
    est.alvo.set(0, 0, 1).lerp(est.focoV, zo);
    camera.position.set(
      est.alvo.x + dist * Math.sin(pol) * Math.sin(az),
      est.alvo.y - dist * Math.sin(pol) * Math.cos(az),
      est.alvo.z + dist * Math.cos(pol));
    camera.lookAt(est.alvo);
    camera.updateMatrixWorld();

    // o recorte fecha em volta do bairro e o prato sobe
    const rr = Math.exp(lerp(Math.log(150), Math.log(RAIO), ss(0, 0.92, zo)));
    recorte.raio.value = zo < 0.004 ? 999 : rr;
    recorte.foco.value.set(est.focoV.x, est.focoV.y);
    prato.visible = est.prato > 0.01;
    prato.position.set(est.focoV.x, est.focoV.y, (1 - est.prato) * -5.5);
    bandeja.visible = est.prato < 0.97 || zo < 0.9;

    // lojinhas e caminhos
    const some = ss(0.3, 0.75, zo);
    lojas.forEach((L, k) => {
      const s = Math.max(0, L.s) * some;
      L.pai.visible = s > 0.01;
      const quica = calmo ? 0 : Math.abs(Math.sin(t * 3.6)) * 0.55 * L.verde;
      const aperto = 1 - 0.07 * L.verde * (calmo ? 0 : Math.cos(t * 7.2));
      L.g.position.z = quica;
      L.g.scale.set(s * aperto, s * aperto, s * (2 - aperto));
      L.anel.material.opacity = L.verde * 0.9 * some;
      L.anel.scale.setScalar(calmo ? 1 : 1 + 0.08 * Math.sin(t * 3.6));
      L.faixa.visible = some > 0.01 && (L.prog > 0 || zo > 0.3);
      L.u.uProg.value = L.prog; L.u.uTempo.value = calmo ? 0 : t;
      L.u.uForca.value = some; L.u.uVerde.value = L.verde; L.u.uApaga.value = L.apaga;
      v3.set(L.x, L.y, ALTURA + 2.75 * s + quica).project(camera);
      L.tela.x = (v3.x * 0.5 + 0.5) * est.w; L.tela.y = (-v3.y * 0.5 + 0.5) * est.h;
      L.tela.s = s; L.tela.chegou = L.prog > 0.985 && some > 0.5; L.tela.melhor = L.verde > 0.5;
    });

    // nuvens: giram devagar em volta e encolhem quando ficariam na frente da cidade ou quando a câmera mergulha
    const entraNuvem = (calmo ? 1 : pulo((t - 1.4) / 0.9)) * (1 - ss(0.1, 0.6, zo));
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
      const fora = toque && zo > 0.5 && Math.hypot(toque.point.x - est.focoV.x, toque.point.y - est.focoV.y) > RAIO;
      const novo = toque && !fora ? toque.object.userData.i : -1;
      if (novo !== est.hover) { est.hover = novo; canvas.style.cursor = novo >= 0 ? 'pointer' : ''; }
    }
    renderer.render(cena, camera);
    aoPassar(est.hover, est.sel, { foco, zoom: zo, dentro: est.dentro, veredito: est.veredito, lojas: lojas.map(L => L.tela) });
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
