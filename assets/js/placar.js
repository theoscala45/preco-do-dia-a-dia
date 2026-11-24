// Placar de letras que viram (SplitFlapText, do React Bits), convertido de React para JavaScript puro.
// Aceita várias linhas que trocam juntas: criarPlacar(elemento, { linhas: [{ palavras: ['ITAQUERA', ...], padTo: 17, textColor: '#fff', rotulo: 'Bairro' }, ...] })
// Só começa quando aparece na tela e pausa fora dela. destruir() desfaz tudo.

const GLIFOS = { alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', numeric: '0123456789' };
const unidade = v => (typeof v === 'number' ? `${v}px` : v);
const limita = (v, a, b) => Math.min(b, Math.max(a, v));
const alinhar = (frase, largura) => String(frase ?? '').slice(0, largura).padEnd(largura, ' ');
const sorteia = g => g.charAt(Math.floor(Math.random() * g.length)) || ' ';
const arred = v => Number(v.toFixed(3));
const el = (classe, texto, tag = 'span') => { const e = document.createElement(tag); e.className = classe; if (texto !== undefined) e.textContent = texto; return e; };

export function criarPlacar(raiz, opcoes = {}) {
  const o = {
    linhas: [], flipDuration: 0.12, stagger: 0.06, cycleDelay: 2400, flipsPerChar: 8, charset: 'alphanumeric',
    tileColor: '#111827', textColor: '#f8fafc', tileRadius: 8, gap: 6, fontSize: 52, loop: true, depth: 0.5, glare: 0, ...opcoes,
  };
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glifos = GLIFOS[o.charset] || (typeof o.charset === 'string' && o.charset ? o.charset : GLIFOS.alphanumeric);
  const flipMs = Math.max(40, o.flipDuration * 1000), staggerMs = Math.max(0, o.stagger * 1000), holdMs = Math.max(400, o.cycleDelay);
  const nivel = limita(o.depth, 0, 1), plano = Math.min(1, nivel * 2), fundo = Math.max(0, nivel - 0.5) * 2, brilho = limita(o.glare, 0, 1);
  let vivo = true, visivel = false, comecou = false, indice = 0, timer = 0;

  raiz.classList.add('placar-caixa');
  raiz.textContent = '';

  // ---------- uma linha = um placar com N peças
  const linhas = o.linhas.map(cfg => {
    const chs = cfg.charset ? (GLIFOS[cfg.charset] || cfg.charset) : glifos;   // cada linha pode girar por um conjunto próprio (os preços, só por números)
    const frases = cfg.palavras.map(p => String(p ?? '').toUpperCase());
    const largura = Math.max(1, cfg.padTo || 1, ...frases.map(f => f.length));
    const normal = frases.map(f => alinhar(f, largura));
    const caixa = el('split-flap-text' + (brilho > 0 ? ' split-flap-text--glare' : ''));
    caixa.setAttribute('role', 'text');
    const estilo = {
      '--split-flap-tile-color': cfg.tileColor || o.tileColor, '--split-flap-text-color': cfg.textColor || o.textColor,
      '--split-flap-radius': unidade(o.tileRadius), '--split-flap-gap': unidade(o.gap), '--split-flap-font-size': unidade(o.fontSize),
      '--split-flap-flip-duration': `${Math.max(0.04, o.flipDuration)}s`,
      '--split-flap-front-from': arred(1 + 0.08 * plano), '--split-flap-front-to': arred(1 - 0.48 * plano - 0.3 * fundo),
      '--split-flap-back-from': arred(1 - 0.42 * plano - 0.3 * fundo), '--split-flap-hinge': `calc(1px + ${arred(fundo * 0.05)}em)`,
      '--split-flap-hinge-shade': arred(0.25 + 0.39 * plano + 0.21 * fundo), '--split-flap-drop': arred(0.28 * plano + 0.2 * fundo),
      '--split-flap-lift': arred(0.4 + 0.6 * plano + 0.7 * fundo), '--split-flap-cast': arred(fundo * 0.62),
      '--split-flap-edge': `${arred(fundo * 0.035)}em`, '--split-flap-glare': arred(brilho * 0.55),
    };
    Object.entries(estilo).forEach(([k, v]) => caixa.style.setProperty(k, v));
    const leitor = el('split-flap-text__sr', frases[0]);
    caixa.appendChild(leitor);
    const pecas = Array.from({ length: largura }, () => { const t = el('split-flap-text__tile'); t.setAttribute('aria-hidden', 'true'); caixa.appendChild(t); return t; });
    const estado = pecas.map(() => ({ atual: ' ', prox: ' ', virando: false, tick: 0 }));
    let rotulo = null;
    if (cfg.rotulo) { rotulo = el('placar-rotulo', cfg.rotulo); }
    const bloco = el('placar-linha');
    if (rotulo) bloco.appendChild(rotulo);
    bloco.appendChild(caixa);
    raiz.appendChild(bloco);
    return { chs, frases, normal, largura, caixa, leitor, pecas, estado, mostrado: ' '.repeat(largura), raf: 0 };
  });

  // ---------- desenho de uma peça (recriada a cada giro: assim a animação de CSS recomeça)
  const metade = (classe, letra) => { const m = el('split-flap-text__half ' + classe); m.appendChild(el('split-flap-text__char', letra)); return m; };
  const aba = (classe, letra) => { const a = el('split-flap-text__flap ' + classe); a.appendChild(el('split-flap-text__char', letra)); return a; };
  const desenhar = (linha, i) => {
    const t = linha.estado[i], peca = linha.pecas[i], sombrear = fundo > 0;
    peca.className = 'split-flap-text__tile' + (t.virando ? ' is-flipping' : '');
    peca.textContent = '';
    peca.append(metade('split-flap-text__half--top', t.virando ? t.prox : t.atual), metade('split-flap-text__half--bottom', t.atual));
    if (t.virando) {
      if (sombrear) peca.append(el('split-flap-text__shade split-flap-text__shade--top'), el('split-flap-text__shade split-flap-text__shade--bottom'));
      peca.append(aba('split-flap-text__flap--front', t.atual), aba('split-flap-text__flap--back', t.prox));
    }
  };
  linhas.forEach(l => l.pecas.forEach((_, i) => desenhar(l, i)));

  // ---------- animação de uma linha até a frase de destino; devolve a duração total
  const ordemDe = (i, largura) => i;
  const levarPara = (linha, alvo) => {
    const de = linha.mostrado;
    cancelAnimationFrame(linha.raf); linha.raf = 0;
    linha.mostrado = alvo;
    const planos = [];
    if (!reduzido) {
      for (let i = 0; i < alvo.length; i++) {
        if (de[i] === alvo[i]) continue;
        const seq = Array.from({ length: Math.max(0, Math.floor(o.flipsPerChar)) }, () => sorteia(linha.chs)); seq.push(alvo[i]);
        planos.push({ i, de: de[i], alvo: alvo[i], seq, inicio: ordemDe(i, alvo.length) * staggerMs, passo: -1, pronto: false });
      }
    }
    if (!planos.length) { alvo.split('').forEach((c, i) => { linha.estado[i] = { atual: c, prox: c, virando: false, tick: 0 }; desenhar(linha, i); }); return 0; }
    de.split('').forEach((c, i) => { linha.estado[i] = { atual: c, prox: c, virando: false, tick: 0 }; desenhar(linha, i); });
    const total = planos.reduce((m, p) => Math.max(m, p.inicio + p.seq.length * flipMs), 0);
    const t0 = performance.now();
    const quadro = agora => {
      if (!vivo) return;
      const dec = agora - t0; let rodando = false;
      planos.forEach(p => {
        const local = dec - p.inicio;
        if (local < 0) { rodando = true; return; }
        const passo = Math.floor(local / flipMs);
        if (passo < p.seq.length) {
          rodando = true;
          if (passo !== p.passo) { p.passo = passo; linha.estado[p.i] = { atual: passo === 0 ? p.de : p.seq[passo - 1], prox: p.seq[passo], virando: true, tick: linha.estado[p.i].tick + 1 }; desenhar(linha, p.i); }
        } else if (!p.pronto) { p.pronto = true; linha.estado[p.i] = { atual: p.alvo, prox: p.alvo, virando: false, tick: 0 }; desenhar(linha, p.i); }
      });
      linha.raf = rodando ? requestAnimationFrame(quadro) : 0;
    };
    linha.raf = requestAnimationFrame(quadro);
    return total;
  };

  // ---------- todas as linhas trocam juntas
  const mostrar = n => {
    indice = n;
    let max = 0;
    linhas.forEach(l => { const k = n % l.normal.length; l.leitor.textContent = l.frases[k].trim(); max = Math.max(max, levarPara(l, l.normal[k])); });
    return max;
  };
  const agendar = espera => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!vivo) return;
      if (document.hidden || !visivel) { agendar(holdMs); return; }
      const prox = indice + 1;
      if (!o.loop && prox >= Math.max(...linhas.map(l => l.normal.length))) return;
      agendar(holdMs + mostrar(prox));
    }, espera);
  };
  const comecar = () => {
    if (comecou) return; comecou = true;
    const dur = mostrar(0);
    if (linhas.some(l => l.normal.length > 1)) agendar(holdMs + dur);
  };

  const obs = new IntersectionObserver(es => { visivel = es.some(e => e.isIntersecting); if (visivel) comecar(); }, { threshold: 0.35 });
  obs.observe(raiz);

  return {
    destruir() { vivo = false; clearTimeout(timer); obs.disconnect(); linhas.forEach(l => cancelAnimationFrame(l.raf)); raiz.textContent = ''; raiz.classList.remove('placar-caixa'); },
    tamanho(px) { linhas.forEach(l => l.caixa.style.setProperty('--split-flap-font-size', unidade(px))); },
  };
}
