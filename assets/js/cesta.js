// Comparador de lista: mais barato numa loja só e, se compensar, dividido em duas. Nunca mais que duas.
import { reais, rolar } from './util.js';

const BASICA = ['P001', 'P003', 'P005', 'P007', 'P009', 'P011', 'P013', 'P017', 'P040', 'P024', 'P051', 'P023'];
const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function criarCesta(dados, mapa, estado) {
  const $ = id => document.getElementById(id);
  const lista = []; // índices de produtos
  const idx = Object.fromEntries(dados.produtos.map((p, i) => [p.id, i]));
  const preco = (rede, prod) => {
    const t = dados.precos[rede.id];
    return rede.por_cep ? t[estado.ponto][prod] : t[prod];
  };

  function calcular() {
    const porRede = dados.redes.map(r => {
      const v = lista.map(i => preco(r, i));
      return { rede: r, v, faltam: v.filter(x => x == null).length, total: v.reduce((s, x) => s + (x ?? 0), 0) };
    }).sort((a, b) => a.faltam - b.faltam || a.total - b.total);
    let dupla = null;
    for (let a = 0; a < porRede.length; a++) for (let b = a + 1; b < porRede.length; b++) {
      let total = 0, faltam = 0, na = 0, ta = 0, tb = 0;
      lista.forEach((_, k) => {
        const x = porRede[a].v[k], y = porRede[b].v[k];
        if (x == null && y == null) { faltam++; return; }
        if (y == null || (x != null && x <= y)) { total += x; ta += x; na++; } else { total += y; tb += y; }
      });
      if (!dupla || faltam < dupla.faltam || (faltam === dupla.faltam && total < dupla.total))
        dupla = { a: porRede[a].rede, b: porRede[b].rede, total, faltam, na, nb: lista.length - faltam - na, ta, tb };
    }
    return { porRede, dupla };
  }

  function desenhar() {
    const tem = lista.length > 0;
    $('cupomVazio').hidden = tem;
    $('cupomTotal').hidden = !tem;
    const pt = mapa.pontos[estado.ponto];
    $('cestaPonto').textContent = estado.cepDado
      ? `Preços do ponto de coleta ${pt.bairro}, zona ${pt.zona.toLowerCase()}.`
      : `Sem CEP, o cupom usa o ponto ${pt.bairro}. Digite seu CEP no topo da página para trocar.`;
    if (!tem) return;
    const { porRede, dupla } = calcular();
    const melhor = porRede[0];
    document.querySelectorAll('#cupomItens li').forEach(li => {
      const k = lista.indexOf(+li.dataset.i), el = li.querySelector('.preco'), v = melhor.v[k];
      el.textContent = v == null ? 'indisponível nesta rede' : reais(v);
      el.classList.toggle('sem', v == null);
    });
    $('totLoja').textContent = melhor.rede.nome;
    rolar($('totInt'), $('totCent'), melhor.total);
    $('totFalta').textContent = melhor.faltam ? `${melhor.faltam} ${melhor.faltam > 1 ? 'itens indisponíveis' : 'item indisponível'} nesta rede. O total não conta com ${melhor.faltam > 1 ? 'eles' : 'ele'}.` : '';
    const vale = dupla && dupla.na && dupla.nb && dupla.faltam <= melhor.faltam && (dupla.faltam < melhor.faltam || melhor.total - dupla.total >= 2);
    $('totDuas').hidden = !vale;
    if (vale) {
      const ganho = dupla.faltam < melhor.faltam
        ? `Assim você acha ${melhor.faltam - dupla.faltam} ${melhor.faltam - dupla.faltam > 1 ? 'itens' : 'item'} a mais.`
        : `Economia de ${reais(melhor.total - dupla.total)}.`;
      $('totDuas').innerHTML = `<b>Dividindo em duas: ${reais(dupla.total)}</b><br>${dupla.a.nome}, ${dupla.na} ${dupla.na > 1 ? 'itens' : 'item'} (${reais(dupla.ta)}). ${dupla.b.nome}, ${dupla.nb} ${dupla.nb > 1 ? 'itens' : 'item'} (${reais(dupla.tb)}). ${ganho}`;
    }
    const completas = porRede.filter(r => r.faltam === melhor.faltam);
    const maior = Math.max(...completas.map(r => r.total));
    $('ranking').innerHTML = porRede.map(r => `<li><span>${r.rede.nome}</span><span class="barra"><i style="--v:0" data-v="${r.faltam === melhor.faltam ? (r.total / maior).toFixed(3) : 0}"></i></span><span class="val">${r.faltam === melhor.faltam ? reais(r.total) : `<small>faltam ${r.faltam}</small>`}</span></li>`).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('#ranking i').forEach(i => i.style.setProperty('--v', i.dataset.v))));
  }

  function adicionar(i) {
    if (lista.includes(i)) return;
    lista.push(i);
    const p = dados.produtos[i], li = document.createElement('li');
    li.dataset.i = i;
    li.innerHTML = `<div><div class="item"><span class="nome" title="${p.nome}, ${p.marca}, ${p.tam}">${p.nome}<small>${p.marca}, ${p.tam}</small></span><span class="preco"></span><button class="tirar" type="button" aria-label="Tirar ${p.nome} ${p.marca} da lista">×</button></div></div>`;
    li.querySelector('.tirar').onclick = () => {
      lista.splice(lista.indexOf(i), 1);
      li.classList.remove('on');
      setTimeout(() => li.remove(), 430);
      desenhar(); sugerir();
    };
    $('cupomItens').append(li);
    requestAnimationFrame(() => requestAnimationFrame(() => li.classList.add('on')));
    desenhar();
  }

  function sugerir() {
    const q = semAcento($('busca').value.trim());
    if (!q) { $('sugestoes').innerHTML = ''; return; }
    const achados = dados.produtos.map((p, i) => ({ p, i })).filter(({ p, i }) => !lista.includes(i) && semAcento(`${p.nome} ${p.marca}`).includes(q)).slice(0, 6);
    $('sugestoes').innerHTML = achados.length
      ? achados.map(({ p, i }) => `<li><button type="button" data-i="${i}"><span>${p.nome}, ${p.marca}</span><small>${p.tam}</small></button></li>`).join('')
      : `<li class="nada">Esse produto não está entre os 100 da lista. Tente outro nome.</li>`;
  }

  $('busca').addEventListener('input', sugerir);
  $('sugestoes').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    adicionar(+b.dataset.i); $('busca').value = ''; sugerir(); $('busca').focus();
  });
  $('basica').addEventListener('click', () => BASICA.forEach((id, k) => setTimeout(() => adicionar(idx[id]), k * 90)));
  $('cupomData').textContent = new Date(dados.datas.at(-1) + 'T12:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  desenhar();
  return { atualizar: desenhar };
}
