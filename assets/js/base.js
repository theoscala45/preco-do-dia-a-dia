// O que todas as páginas usam: dados, CEP e lista guardados no navegador, scroll suave (Lenis)
// e as animações comuns (GSAP): cabeçalho, títulos que sobem por linha e blocos que surgem ao rolar.
import { ligarCards } from './cards.js?v=20261124xj';
import { desfocarFrases, desfocarJunto } from './desfoque.js?v=20261124wc';
import { esticarBordas } from './mola.js?v=20261124wa';
import { proximidade } from './proximidade.js?v=20261125a';

// o anel laranja de foco só aparece para quem navega com o teclado (Tab). Clique do mouse, toque e foco dado por código
// (depois de digitar o CEP, por exemplo) não deixam mais um contorno solto em botões e painéis.
{
  const raiz = document.documentElement;
  addEventListener('keydown', e => { if (e.key === 'Tab') raiz.dataset.teclado = ''; }, true);
  addEventListener('pointerdown', () => { delete raiz.dataset.teclado; }, true);
}
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
export function subirTitulo(el, { atraso = 0, duracao = 1.05, passo = 0.09, inicio = 'top 88%' } = {}) {
  return SplitText.create(el, {
    type: 'lines', mask: 'lines', autoSplit: true,
    onSplit(self) {
      gsap.set(el, { visibility: 'visible' });
      return gsap.from(self.lines, {
        yPercent: 130, duration: duracao, ease: 'power4.out', stagger: passo, delay: atraso,
        // toca toda vez que o título entra na tela (de baixo ou de cima) e volta ao início ao sair
        scrollTrigger: { trigger: el, start: inicio, end: 'bottom top', toggleActions: 'play reset play reset' },
      });
    },
  });
}

export function iniciar(dados) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  // Celular: o ScrollTrigger remede a página quando ela termina de carregar e quando as fontes chegam. Se isso acontece
  // enquanto a pessoa já está rolando (a primeira rolagem), o iPhone perde o embalo e a página para. Lá ele só mede no começo.
  const celular = matchMedia('(max-width: 860px)').matches;
  if (celular) ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded', ignoreMobileResize: true });
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

  // linha laranja sob o link da página atual: ao trocar de página ela estica e junta (mola.js) do link anterior para o novo
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
            // o mesmo esticar-e-juntar do seletor elástico: a linha estica até cobrir o link antigo e o novo, e junta no novo
            esticarBordas(({ l, r }) => gsap.set(linha, { x: l, width: Math.max(0, r - l) }), { l: antes.x, r: antes.x + antes.w }, { l: f.x, r: f.x + f.w });
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
    // o texto do botão (Menu / Fechar) rola: o antigo sobe e some, o novo chega por baixo
    botao.textContent = botao.textContent.trim();
    const texto = document.createElement('span');
    texto.className = 'menu-rotulo'; texto.textContent = botao.textContent; botao.textContent = ''; botao.append(texto);
    const rotulo = novo => {
      if (calmo) { texto.textContent = novo; return; }
      gsap.killTweensOf(texto);
      gsap.timeline()
        .to(texto, { y: -10, autoAlpha: 0, duration: 0.14, ease: 'power2.in' })
        .add(() => { texto.textContent = novo; })
        .fromTo(texto, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3, ease: 'power3.out' });
    };
    // o marca-texto laranja do menu do celular é um só: ele desliza de um link para outro (ao encostar o dedo) em vez de piscar em cada link
    const marca = document.createElement('span');
    marca.className = 'menu-marca'; marca.setAttribute('aria-hidden', 'true');
    menu.prepend(marca);
    const links = [...menu.querySelectorAll('a')];
    const medirLink = a => {
      const r = document.createRange(); r.selectNodeContents(a);
      const h = Math.round(parseFloat(getComputedStyle(a).fontSize) * 0.5);
      return { x: a.offsetLeft - 6, y: a.offsetTop + a.offsetHeight - 7 - h, width: r.getBoundingClientRect().width + 18, height: h };
    };
    const irPara = a => {
      const f = medirLink(a);
      if (calmo) gsap.set(marca, { ...f, scaleX: 1, autoAlpha: 1 });
      else gsap.to(marca, { ...f, scaleX: 1, autoAlpha: 1, duration: 0.5, ease: 'power4.out', overwrite: 'auto' });
    };
    const mostrarMarca = () => {
      const atual = menu.querySelector('a[aria-current]');
      if (!atual) { gsap.set(marca, { autoAlpha: 0 }); return; }
      gsap.set(marca, { ...medirLink(atual), autoAlpha: 1, scaleX: calmo ? 1 : 0, transformOrigin: '0% 50%' });
      if (!calmo) gsap.to(marca, { scaleX: 1, duration: 0.6, ease: 'power3.out', delay: 0.4, overwrite: 'auto' });
    };
    links.forEach(a => {
      a.addEventListener('pointerdown', () => irPara(a));
      a.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') irPara(a); });
      a.addEventListener('focus', () => irPara(a));
    });
    // tocar noutra página: o marca-texto chega até ela e só então a página troca (um instante, para a pessoa ver)
    menu.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (!a || calmo || a.hasAttribute('aria-current') || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
      e.preventDefault(); e.stopPropagation(); irPara(a);
      setTimeout(() => { location.href = a.href; }, 280);
    }, true);
    addEventListener('pageshow', e => { if (e.persisted && botao.getAttribute('aria-expanded') === 'true') fechar(); });
    const fechar = () => { botao.setAttribute('aria-expanded', 'false'); rotulo('Menu'); document.documentElement.classList.remove('menu-aberto'); lenis?.start(); abre?.timeScale(1.7).reverse(); };
    botao.addEventListener('click', () => {
      if (botao.getAttribute('aria-expanded') === 'true') return fechar();
      botao.setAttribute('aria-expanded', 'true'); rotulo('Fechar');
      document.documentElement.classList.add('menu-aberto'); lenis?.stop();
      mostrarMarca();
      // quando a entrada termina, o estilo de movimento sai dos links: assim o efeito de toque e de hover (CSS) pode mexer neles
      abre = abre || gsap.timeline({ paused: true, onComplete: () => { gsap.set(links, { clearProps: 'transform,translate,rotate,scale' }); gsap.set(menu, { clearProps: 'clipPath' }); } })
        // a folha do menu desce do alto da tela, como uma cortina, e os links sobem um depois do outro
        .fromTo(menu, { autoAlpha: 0, clipPath: 'inset(0 0 100% 0)' }, { autoAlpha: 1, clipPath: 'inset(0 0 0% 0)', duration: 0.55, ease: 'power4.out' })
        .fromTo(links, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out' }, 0.12);
      if (calmo) abre.progress(1); else abre.timeScale(1).play(0);
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

    // Celular (até 860 px): a rolagem tem de ser lisa (pedido do Theo, 25/11/2026). Lá nada entra animado ao rolar: títulos,
    // blocos, cartões, linhas e números já estão no lugar. Fica só a entrada da abertura (título e frase), que toca uma vez no topo.
    const leve = matchMedia('(max-width: 860px)').matches;
    desfocarJunto(gsap, calmo);    // o título da página inicial entra inteiro, com todas as palavras juntas (data-junto)
    document.querySelectorAll('[data-junto] .junto').forEach(el => proximidade(el));   // e muda de peso perto do mouse
    if (!leve) desfocarFrases(gsap, calmo);   // os títulos grandes (data-titulo) entram palavra por palavra, saindo do desfoque
    // os subtítulos (data-subtitulo) sobem linha por linha, de trás de uma máscara, logo depois do título (no celular, só o da abertura)
    document.querySelectorAll('[data-subtitulo]').forEach(el => {
      if (leve && !el.closest('.abre, .pg-topo')) return;
      subirTitulo(el, { atraso: el.getBoundingClientRect().top < innerHeight * 0.95 ? 0.3 : 0, duracao: 0.85, passo: 0.08 });
    });
    // Revelações ao rolar: o elemento sobe quando aparece na tela e volta a ficar escondido quando sai dela, então toca toda vez.
    // O observador (aparecer.js) também vê o que começa escondido (hidden) e aparece depois, como o resultado da lista.
    const sobe = lote => gsap.to(lote, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, overwrite: true });
    const some = lote => gsap.set(lote, { autoAlpha: 0, y: 26, overwrite: true });
    const entraFila = lote => gsap.to(lote, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, overwrite: true });
    const saiFila = lote => gsap.set(lote, { autoAlpha: 0, y: 16, overwrite: true });
    if (!leve) {
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
    }

    // barra fina no topo: quanto da página já foi lida
    const barra = document.createElement('div');
    barra.className = 'progresso';
    document.body.append(barra);
    if (!leve) gsap.fromTo(barra, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
    // elementos que andam um pouco mais devagar ou mais depressa que a página
    if (!toque) document.querySelectorAll('[data-desliza]').forEach(el => {
      const v = +el.dataset.desliza;
      gsap.fromTo(el, { y: v }, { y: -v, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // linhas divisórias que se desenham com o scroll
    document.querySelectorAll('[data-risco]').forEach(el => {
      if (leve) { gsap.set(el, { '--risco': 1 }); return; }
      gsap.fromTo(el, { '--risco': 0 }, { '--risco': 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 55%', scrub: 0.5 } });
    });

    return () => { if (bate) gsap.ticker.remove(bate); lenis?.destroy(); lenis = null; barra.remove(); };
  });

  document.documentElement.classList.add('pronto');
  document.fonts.ready.then(() => { if (!celular || scrollY < 2) ScrollTrigger.refresh(); });   // no celular, só se a pessoa ainda não rolou
  // partes que abrem e fecham mudam a altura da página
  document.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => ScrollTrigger.refresh()));
}
