// O que todas as páginas usam: dados, CEP e lista guardados no navegador, scroll suave (Lenis)
// e as animações comuns (GSAP): cabeçalho, títulos que sobem por linha e blocos que surgem ao rolar.
import { ligarCards } from './cards.js';
import { aoAparecer } from './aparecer.js';
const { gsap, ScrollTrigger, SplitText, Lenis } = window;
export { gsap, ScrollTrigger };

export const $ = id => document.getElementById(id);
export const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const reais = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const partes = v => { const [i, c] = v.toFixed(2).split('.'); return [Number(i).toLocaleString('pt-BR'), ',' + c]; };
export const pct = (v, casas = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
export const curto = bairro => bairro.split(' (')[0];
export const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ?previa no endereço: a página carrega assets/dados-previa.json (preços reais, ainda fora do site oficial)
export const PREVIA = new URLSearchParams(location.search).has('previa');
export const carregar = (...nomes) => Promise.all(nomes.map(n => fetch(`assets/${n === 'dados' && PREVIA ? 'dados-previa' : n}.json`).then(r => r.json())));

// CEP, ponto de coleta e lista ficam só no navegador da pessoa
export const guarda = {
  ler(chave, padrao) { try { const v = localStorage.getItem('pdd:' + chave); return v == null ? padrao : JSON.parse(v); } catch { return padrao; } },
  gravar(chave, valor) { try { localStorage.setItem('pdd:' + chave, JSON.stringify(valor)); } catch { /* navegação privada: segue sem guardar */ } },
};

// o CEP vira o ponto de coleta de faixa numérica mais próxima (aproximação). -1 = fora da capital
export function pontoDoCep(geo, cep) {
  const c5 = +cep.slice(0, 5);
  if (!((c5 >= 1000 && c5 <= 5999) || (c5 >= 8000 && c5 <= 8499))) return -1;
  let melhor = -1, d = Infinity;
  geo.pontos.forEach((p, i) => {
    const q = +p.cep.slice(0, 5), custo = Math.abs(q - c5) + (p.cep.slice(0, 2) === cep.slice(0, 2) ? 0 : 5000);
    if (custo < d) { d = custo; melhor = i; }
  });
  return melhor;
}
// campo de CEP: máscara e validação. aoEscolher(ponto, cep) só é chamado com CEP válido da capital
export function ligarCep(geo, form, campo, msg, aoEscolher) {
  campo.addEventListener('input', () => {
    const d = campo.value.replace(/\D/g, '').slice(0, 8);
    campo.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = campo.value.replace(/\D/g, '');
    msg.className = 'cep-msg erro';
    // seja liberal no que aceita: CEP de São Paulo digitado sem o zero do começo (5422-000) também vale
    const cep8 = d.length === 7 ? '0' + d : d;
    if (cep8.length !== 8) { msg.textContent = 'O CEP tem 8 números. Confira e tente de novo.'; return; }
    const i = pontoDoCep(geo, cep8);
    if (i < 0) { msg.textContent = 'Esse CEP fica fora da capital. Por enquanto o site cobre só a cidade de São Paulo.'; return; }
    msg.className = 'cep-msg'; msg.textContent = '';
    if (d.length === 7) campo.value = cep8.slice(0, 5) + '-' + cep8.slice(5);
    guarda.gravar('cep', campo.value); guarda.gravar('ponto', i);
    aoEscolher(i, campo.value);
  });
}

// o número rola do valor atual até o novo
const rolando = new WeakMap();
export function rolar(elInt, elCent, alvo) {
  const o = rolando.get(elInt) || { v: 0 };
  rolando.set(elInt, o);
  const pinta = () => { const [i, c] = partes(o.v); elInt.textContent = i; if (elCent) elCent.textContent = c; };
  if (calmo) { gsap.killTweensOf(o); o.v = alvo; pinta(); return; }
  gsap.to(o, { v: alvo, duration: 0.9, ease: 'power4.out', overwrite: true, onUpdate: pinta, onComplete: pinta });
}

// um número qualquer que conta até o alvo. formato(v) devolve o texto
const contando = new WeakMap();
export function contar(el, alvo, formato = v => Math.round(v).toLocaleString('pt-BR')) {
  const o = contando.get(el) || { v: 0 };
  contando.set(el, o);
  const pinta = () => { el.textContent = formato(o.v); };
  if (calmo) { gsap.killTweensOf(o); o.v = alvo; pinta(); return; }
  gsap.to(o, { v: alvo, duration: 1.1, ease: 'power3.out', overwrite: true, onUpdate: pinta, onComplete: pinta });
}

// volta um número que conta para o zero (para ele contar de novo quando reaparecer na tela)
export function zerarContagem(el) {
  const o = contando.get(el);
  if (o) { gsap.killTweensOf(o); o.v = 0; }
  el.textContent = '0';
}

let lenis = null;
// rola a página até um ponto (número de pixels ou seletor)
export function irPara(alvo, opcoes) {
  if (lenis) lenis.scrollTo(alvo, opcoes);
  else if (typeof alvo === 'number') scrollTo(0, alvo);
  else document.querySelector(alvo)?.scrollIntoView();
}

// um título que sobe linha por linha, de trás de uma máscara
export function subirTitulo(el, { atraso = 0, aoRolar = false } = {}) {
  return SplitText.create(el, {
    type: 'lines', mask: 'lines', autoSplit: true,
    onSplit(self) {
      gsap.set(el, { visibility: 'visible' });
      return gsap.from(self.lines, {
        yPercent: 130, duration: 1.05, ease: 'power4.out', stagger: 0.09, delay: atraso,
        // toca toda vez que o título entra na tela (de baixo ou de cima) e volta ao início ao sair
        scrollTrigger: { trigger: el, start: 'top 88%', end: 'bottom top', toggleActions: 'play reset play reset' },
      });
    },
  });
}

export function iniciar(dados) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: 'power3.out', duration: 0.8 });

  // faixa de aviso: aparece sempre que os dados forem de exemplo, ou na prévia dos preços reais
  if (PREVIA) {
    const dia = dados?.datas?.at(-1) ? new Date(dados.datas.at(-1) + 'T12:00').toLocaleDateString('pt-BR') : '';
    $('aviso').textContent = matchMedia('(max-width: 860px)').matches
      ? `Prévia com preços reais de ${dia}. Não é a versão oficial.`
      : `Prévia com os preços reais coletados em ${dia}. Ainda não é a versão oficial do site, e a inflação só aparece depois de alguns meses de coleta.`;
    // os links entre as páginas continuam na prévia
    document.querySelectorAll('a[href$=".html"]').forEach(a => { a.href = a.getAttribute('href') + '?previa'; });
  }
  if (dados?.exemplo || PREVIA) {
    $('aviso').hidden = false;
    document.documentElement.style.setProperty('--aviso-h', $('aviso').offsetHeight + 'px');
  }
  // marca a página atual no menu (a página de um produto conta como "Produtos")
  const aqui0 = location.pathname.split('/').pop() || 'index.html';
  const aqui = aqui0 === 'produto.html' ? 'produtos.html' : aqui0;
  document.querySelectorAll('.topo nav a').forEach(a => { if (a.getAttribute('href').split('?')[0] === aqui) a.setAttribute('aria-current', 'page'); });

  // linha laranja sob o link da página atual: ao trocar de página ela salta, como uma mola, do link anterior para o novo
  const menuTopo = document.querySelector('.topo nav');
  if (menuTopo && !matchMedia('(max-width: 860px)').matches) {
    const linha = document.createElement('span');
    linha.className = 'nav-linha'; linha.setAttribute('aria-hidden', 'true');
    menuTopo.append(linha);
    const atual = menuTopo.querySelector('a[aria-current]');
    const medir = a => ({ x: a.offsetLeft + 14, y: a.offsetTop + a.offsetHeight - 7, w: a.offsetWidth - 28 });
    const lerAntes = () => { try { return JSON.parse(sessionStorage.getItem('pdd:menu')); } catch { return null; } };
    const gravar = v => { try { sessionStorage.setItem('pdd:menu', JSON.stringify(v)); } catch { /* sem armazenamento: segue sem a memória */ } };
    document.fonts.ready.then(() => {
      const antes = lerAntes();
      if (atual) {
        const f = medir(atual);
        gsap.set(linha, { x: f.x, y: f.y, width: f.w, autoAlpha: 1 });
        if (!calmo) {
          if (antes && (Math.abs(antes.x - f.x) > 1 || Math.abs(antes.w - f.w) > 1)) {
            // em x a mola; em y um pulinho (sobe e cai): juntos desenham um arco
            gsap.fromTo(linha, { x: antes.x, width: antes.w }, { x: f.x, width: f.w, duration: 1.1, ease: 'elastic.out(1, 0.5)' });
            gsap.fromTo(linha, { y: antes.y }, { keyframes: [{ y: f.y - 8, duration: 0.2, ease: 'power2.out' }, { y: f.y, duration: 0.55, ease: 'bounce.out' }] });
          }
          else if (!antes) gsap.from(linha, { scaleX: 0, duration: 0.6, ease: 'power3.out' });
        }
        gravar(f);
        addEventListener('resize', () => { const g = medir(atual); gsap.set(linha, { x: g.x, y: g.y, width: g.w }); gravar(g); });
      } else {
        // página que não está no menu: a linha encolhe e some
        if (antes && !calmo) {
          gsap.set(linha, { x: antes.x, y: antes.y, width: antes.w, autoAlpha: 1 });
          gsap.to(linha, { width: 0, x: antes.x + antes.w / 2, autoAlpha: 0, duration: 0.45, ease: 'power2.in' });
        }
        gravar(null);
      }
    });
  }

  // cabeçalho ganha fundo depois que a página rola
  // (um ouvinte de rolagem simples, que também roda ao abrir a página: assim o fundo aparece mesmo quando a página abre já no meio, por exemplo num link com #)
  const topoEl = document.querySelector('.topo');
  const marcarRolou = () => topoEl?.classList.toggle('rolou', scrollY > 30);
  addEventListener('scroll', marcarRolou, { passive: true });
  marcarRolou();
  addEventListener('load', marcarRolou);

  // menu do celular
  const botao = $('menuBotao'), menu = document.querySelector('.topo nav');
  let abre = null;
  if (botao && menu) {
    const fechar = () => { botao.setAttribute('aria-expanded', 'false'); botao.textContent = 'Menu'; document.documentElement.classList.remove('menu-aberto'); lenis?.start(); abre?.reverse(); };
    botao.addEventListener('click', () => {
      if (botao.getAttribute('aria-expanded') === 'true') return fechar();
      botao.setAttribute('aria-expanded', 'true'); botao.textContent = 'Fechar';
      document.documentElement.classList.add('menu-aberto'); lenis?.stop();
      abre = abre || gsap.timeline({ paused: true }).fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
        .fromTo(menu.children, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06 }, 0.05);
      if (calmo) abre.progress(1); else abre.play(0);
    });
    menu.addEventListener('click', e => { if (e.target.closest('a')) fechar(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && botao.getAttribute('aria-expanded') === 'true') fechar(); });
    matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) { fechar(); abre?.kill(); abre = null; gsap.set([menu, ...menu.children], { clearProps: 'all' }); } });
  }

  // tudo que é movimento só existe para quem não pediu "reduzir movimento"
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // rolagem suave só com mouse; no celular a rolagem é a nativa (mais leve, e é o que a pessoa espera no toque)
    const toque = matchMedia('(pointer: coarse)').matches;
    let bate = null;
    if (!toque) {
      lenis = new Lenis({ anchors: true, autoRaf: false, lerp: 0.11 });
      lenis.on('scroll', ScrollTrigger.update);
      bate = t => lenis.raf(t * 1000);
      gsap.ticker.add(bate);
      gsap.ticker.lagSmoothing(0);
    }

    document.querySelectorAll('[data-titulo]').forEach(el => {
      const naDobra = el.getBoundingClientRect().top < innerHeight * 0.95;
      subirTitulo(el, { atraso: naDobra ? 0.12 : 0, aoRolar: !naDobra });
    });
    // Revelações ao rolar: o elemento sobe quando aparece na tela e volta a ficar escondido quando sai dela, então toca toda vez.
    // O observador (aparecer.js) também vê o que começa escondido (hidden) e aparece depois, como o resultado da lista.
    const sobe = lote => gsap.to(lote, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, overwrite: true });
    const some = lote => gsap.set(lote, { autoAlpha: 0, y: 26, overwrite: true });
    const entraFila = lote => gsap.to(lote, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, overwrite: true });
    const saiFila = lote => gsap.set(lote, { autoAlpha: 0, y: 16, overwrite: true });
    ligarCards();   // os cards têm entrada própria (em arco, com mola); o resto sobe em lote
    const blocos = gsap.utils.toArray('[data-surge]');
    gsap.set(blocos, { autoAlpha: 0, y: 26 });
    aoAparecer(blocos, sobe, some);
    // números que contam ao aparecer (e voltam a zero ao sair)
    document.querySelectorAll('[data-conta]').forEach(el => {
      el.textContent = '0';
      aoAparecer(el, () => contar(el, +el.dataset.conta), () => zerarContagem(el));
    });
    // filhos que entram um depois do outro (linhas de lista e de tabela)
    document.querySelectorAll('[data-fila]').forEach(pai => {
      const filhos = [...pai.children];
      gsap.set(filhos, { autoAlpha: 0, y: 16 });
      aoAparecer(filhos, entraFila, saiFila, { margem: '0px 0px -6% 0px' });
    });

    // barra fina no topo: quanto da página já foi lida
    const barra = document.createElement('div');
    barra.className = 'progresso';
    document.body.append(barra);
    gsap.fromTo(barra, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
    // elementos que andam um pouco mais devagar ou mais depressa que a página
    if (!toque) document.querySelectorAll('[data-desliza]').forEach(el => {
      const v = +el.dataset.desliza;
      gsap.fromTo(el, { y: v }, { y: -v, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // linhas divisórias que se desenham com o scroll
    document.querySelectorAll('[data-risco]').forEach(el => {
      gsap.fromTo(el, { '--risco': 0 }, { '--risco': 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 55%', scrub: 0.5 } });
    });

    return () => { if (bate) gsap.ticker.remove(bate); lenis?.destroy(); lenis = null; barra.remove(); };
  });

  document.documentElement.classList.add('pronto');
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  // partes que abrem e fecham mudam a altura da página
  document.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => ScrollTrigger.refresh()));
}
