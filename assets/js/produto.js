// Página de um produto: o preço dele em cada rede. O produto vem do endereço (produto.html?p=P001).
import { aoAparecer } from './aparecer.js';
import { $, carregar, iniciar, reais, guarda, semAcento, PREVIA } from './base.js?v=20261125a';
import { criarLista, precosDoProduto } from './cesta.js';

const [dados, geo] = await carregar('dados', 'geo');

const q = PREVIA ? '&previa' : '';
const href = id => `produto.html?p=${id}${q}`;
const id = new URLSearchParams(location.search).get('p');
const k = dados.produtos.findIndex(p => p.id === id);

// busca entre os 100 produtos (serve também quando o endereço não acha nenhum)
function ligarBusca() {
  const campo = $('prodBusca'), ul = $('prodSug');
  if (!campo) return;
  campo.addEventListener('input', () => {
    const t = semAcento(campo.value.trim());
    if (!t) { ul.innerHTML = ''; return; }
    const achados = dados.produtos.filter(p => semAcento(`${p.nome} ${p.marca}`).includes(t)).slice(0, 6);
    ul.innerHTML = achados.length
      ? achados.map(p => `<li><button type="button" data-id="${p.id}"><span>${p.nome}, ${p.marca}</span><small>${p.tam}</small></button></li>`).join('')
      : '<li class="nada">Esse produto não está entre os 100 da lista. Tente outro nome.</li>';
  });
  ul.addEventListener('click', e => { const b = e.target.closest('button'); if (b) location.href = href(b.dataset.id); });
}

if (k < 0) {
  $('prodNome').textContent = 'Produto não encontrado';
  $('prodVazio').hidden = false;
} else {
  const p = dados.produtos[k];
  document.title = `${p.nome}, ${p.marca}: Preço Aberto`;
  $('prodNome').textContent = p.nome;
  const ponto = guarda.ler('ponto', -1);
  const bairro = ponto >= 0 && ponto < geo.pontos.length ? geo.pontos[ponto].bairro.split(' (')[0] : null;
  const dia = new Date(dados.datas.at(-1) + 'T12:00').toLocaleDateString('pt-BR');
  $('prodSub').textContent = `${p.marca}, ${p.tam}. Preços lidos em ${dia}.`;

  // preço de cada rede: nas que mudam com o CEP, o do bairro da pessoa ou, sem CEP, a mediana dos bairros
  const linhas = precosDoProduto(dados, k, bairro ? ponto : -1);
  const tem = linhas.filter(l => l.v != null).sort((a, b) => a.v - b.v);
  const sem = linhas.filter(l => l.v == null);

  if (tem.length) {
    const barato = tem[0], caro = tem.at(-1), dif = caro.v - barato.v, pct = Math.round((caro.v / barato.v - 1) * 100);
    $('tagBarato').textContent = reais(barato.v); $('tagBaratoRede').textContent = `mais barato, no ${barato.nome}`;
    $('tagCaro').textContent = reais(caro.v); $('tagCaroRede').textContent = `mais caro, no ${caro.nome}`;
    $('tagDif').textContent = reais(dif); $('tagDifTxt').textContent = tem.length > 1 ? `de diferença entre os dois, ${pct}% a mais` : 'só uma rede com preço';
    const maior = caro.v;
    $('prodRank').innerHTML = tem.map((l, pos) => `<li${pos ? '' : ' class="melhor"'}><span>${l.nome}</span><span class="barra"><i style="--v:${(l.v / maior).toFixed(3)}"></i></span><span class="v">${reais(l.v)}<small>${pos ? '+ ' + reais(l.v - barato.v) : 'mais barato'}</small></span></li>`).join('');
    const variam = linhas.filter(l => l.variaPorBairro).map(l => l.nome);
    $('prodRankNota').textContent = [
      sem.length ? `Sem preço lido: ${sem.map(l => l.nome).join(', ')}.` : '',
      variam.length ? (bairro ? `${variam.join(', ')} mudam de preço com o bairro: aqui vale o de ${bairro}.` : `${variam.join(', ')} mudam de preço com o bairro: aqui vale a mediana dos ${geo.pontos.length} bairros. Digite seu CEP no início para ver o do seu bairro.`) : '',
    ].filter(Boolean).join(' ');
    if (caro.v / barato.v > 2) {
      $('prodAviso').hidden = false;
      $('prodAviso').textContent = 'A diferença é grande, mais de duas vezes. Pode haver variação de embalagem ou de versão do produto entre as redes. Veja os limites em Método e fontes.';
    }
    const barras = [...document.querySelectorAll('#prodRank .barra i')];
    // as barras crescem toda vez que o ranking entra na tela
    const { gsap } = window;
    if (gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const alvo = (i, el) => +el.style.getPropertyValue('--v');
      gsap.set(barras, { scaleX: 0 });
      const cresce = () => gsap.to(barras, { scaleX: alvo, duration: 0.8, ease: 'power3.out', stagger: 0.04, overwrite: true });
      const zera = () => gsap.set(barras, { scaleX: 0, overwrite: true });
      aoAparecer($('prodRank'), cresce, zera, { margem: '0px 0px -12% 0px' });
    }
  } else {
    $('prodRank').innerHTML = '<li class="divisa">Nenhuma rede tem preço lido para este produto.</li>';
    $('tagBarato').textContent = 'sem preço'; $('tagCaro').textContent = 'sem preço'; $('tagDif').textContent = '-';
  }

  // adicionar à lista
  const lista = criarLista(dados);
  const botao = $('prodAddBotao'), ver = $('prodVerLista');
  const mostrar = () => {
    const dentro = lista.tem(k);
    botao.textContent = dentro ? 'Tirar da minha lista' : 'Adicionar à minha lista';
    ver.hidden = !lista.itens.length;
    ver.textContent = lista.itens.length ? `Ver a lista (${lista.itens.length} ${lista.itens.length === 1 ? 'item' : 'itens'})` : '';
    ver.href = 'lista.html' + (PREVIA ? '?previa' : '');
  };
  $('prodAdd').addEventListener('submit', e => { e.preventDefault(); if (lista.tem(k)) lista.tirar(k); else lista.adicionar(k); mostrar(); });
  mostrar();

  $('prodTodos').href = 'produtos.html' + (PREVIA ? '?previa' : '');
  $('prodCorpo').hidden = false;
}
ligarBusca();
// as animações comuns só começam depois que a página tem o texto do produto (o título sobe linha por linha)
iniciar(dados);
