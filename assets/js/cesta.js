// Lista de compras e as contas do comparador. A lista fica guardada no navegador e vale para todas as páginas.
// Regras: a lista inteira no mercado mais barato do bairro (uma loja só).
import { guarda, semAcento, PREVIA } from './base.js?v=20261126a';

export const BASICA = ['P001', 'P003', 'P005', 'P007', 'P009', 'P011', 'P013', 'P017', 'P040', 'P024', 'P051', 'P023'];
export const ECONOMIA_MINIMA = 2;
// Produtos da cesta que fazem o mesmo papel (o mesmo item de outra marca, ou a variação comum dele). Usados pelas
// "trocas que baixam a conta" da Minha lista. Só entra aqui o que uma pessoa trocaria sem pensar duas vezes.
export const PARECIDOS = [
  ['P001', 'P002'],   // arroz branco tipo 1, 5 kg
  ['P003', 'P004'],   // feijão carioca e preto, 1 kg
  ['P007', 'P008'],   // açúcar refinado e cristal, 1 kg
  ['P009', 'P010'],   // café torrado e moído, 500 g
  ['P013', 'P014'],   // macarrão, 500 g
  ['P039', 'P040'],   // leite integral UHT, 1 L
  ['P044', 'P045'],   // queijo fatiado, 150 g
  ['P051', 'P052'],   // ovos grandes, 20 unidades
  ['P053', 'P054'],   // papel higiênico folha dupla, 12 rolos
  ['P055', 'P056'],   // sabonete em barra
  ['P057', 'P058'],   // creme dental Colgate, 90 g
];   // dividir em duas lojas só aparece se economizar pelo menos isso, em reais

export function criarLista(dados) {
  const idx = Object.fromEntries(dados.produtos.map((p, i) => [p.id, i]));
  const itens = guarda.ler('lista', []).map(id => idx[id]).filter(i => i != null);
  const ouvintes = [];
  const avisar = () => { guarda.gravar('lista', itens.map(i => dados.produtos[i].id)); ouvintes.forEach(f => f()); };
  return {
    itens,
    tem: i => itens.includes(i),
    adicionar(i) { if (!itens.includes(i)) { itens.push(i); avisar(); } },
    tirar(i) { const k = itens.indexOf(i); if (k >= 0) { itens.splice(k, 1); avisar(); } },
    limpar() { itens.length = 0; avisar(); },
    // troca um produto por outro no mesmo lugar da lista
    trocar(i, j) { const k = itens.indexOf(i); if (k >= 0 && !itens.includes(j)) { itens[k] = j; avisar(); } },
    // soma à lista os produtos de um link recebido (só ids que existem); devolve quantos entraram
    somar(ids) { let n = 0; ids.forEach(id => { const i = idx[id]; if (i != null && !itens.includes(i)) { itens.push(i); n++; } }); if (n) avisar(); return n; },
    ids: () => itens.map(i => dados.produtos[i].id),
    basica() { BASICA.forEach(id => { if (!itens.includes(idx[id])) itens.push(idx[id]); }); avisar(); },
    aoMudar(f) { ouvintes.push(f); },
  };
}

// total da lista em cada rede, a melhor loja única e a melhor dupla de lojas, para um ponto de coleta
export function calcular(dados, itens, ponto) {
  const preco = (r, prod) => { const t = dados.precos[r.id]; return r.por_cep ? t[ponto][prod] : t[prod]; };
  const porRede = dados.redes.map((r, k) => {
    const v = itens.map(i => preco(r, i));
    return { rede: r, k, v, faltam: v.filter(x => x == null).length, total: v.reduce((s, x) => s + (x ?? 0), 0) };
  }).sort((a, b) => a.faltam - b.faltam || a.total - b.total);
  let dupla = null;
  for (let a = 0; a < porRede.length; a++) for (let b = a + 1; b < porRede.length; b++) {
    const A = porRede[a], B = porRede[b], lado = [];
    let total = 0, faltam = 0, ta = 0, tb = 0;
    itens.forEach((_, n) => {
      const x = A.v[n], y = B.v[n];
      if (x == null && y == null) { faltam++; lado.push(-1); return; }
      if (y == null || (x != null && x <= y)) { total += x; ta += x; lado.push(0); } else { total += y; tb += y; lado.push(1); }
    });
    if (!dupla || faltam < dupla.faltam || (faltam === dupla.faltam && total < dupla.total)) {
      dupla = { a: A, b: B, total, faltam, ta, tb, lado, na: lado.filter(l => l === 0).length, nb: lado.filter(l => l === 1).length };
    }
  }
  const melhor = porRede[0], completas = porRede.filter(r => r.faltam === melhor.faltam), pior = completas.at(-1);
  const vale = !!dupla && dupla.na > 0 && dupla.nb > 0 && dupla.faltam <= melhor.faltam && (dupla.faltam < melhor.faltam || melhor.total - dupla.total >= ECONOMIA_MINIMA);
  return { porRede, melhor, pior, completas, dupla, vale };
}

// campo de busca com sugestões dos 100 produtos
export function ligarBusca(dados, lista, campo, ul) {
  function sugerir() {
    const q = semAcento(campo.value.trim());
    if (!q) { ul.innerHTML = ''; return; }
    const achados = dados.produtos.map((p, i) => ({ p, i })).filter(({ p, i }) => !lista.tem(i) && semAcento(`${p.nome} ${p.marca}`).includes(q)).slice(0, 6);
    ul.innerHTML = achados.length
      ? achados.map(({ p, i }) => `<li><button type="button" data-i="${i}"><span>${p.nome}, ${p.marca}</span><small>${p.tam}</small></button></li>`).join('')
      : `<li class="nada">Esse produto não está entre os 100 da lista. Tente outro nome.</li>`;
  }
  campo.addEventListener('input', sugerir);
  ul.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    lista.adicionar(+b.dataset.i); campo.value = ''; sugerir(); campo.focus();
  });
  lista.aoMudar(sugerir);
}

// a lista na tela: uma linha por item, com botão de tirar. preencher(li, indiceDoProduto, posicao) escreve o preço.
export function ligarItens(dados, lista, ul, preencher = () => {}) {
  const linhas = new Map();
  function desenhar() {
    for (const [i, li] of linhas) if (!lista.tem(i)) { linhas.delete(i); li.classList.remove('on'); setTimeout(() => li.remove(), 420); }
    lista.itens.forEach((i, n) => {
      let li = linhas.get(i);
      if (!li) {
        const p = dados.produtos[i];
        li = document.createElement('li');
        li.innerHTML = `<div><div class="item"><span class="nome" title="${p.nome}, ${p.marca}, ${p.tam}"><a class="nome-link" href="produto.html?p=${p.id}${PREVIA ? '&previa' : ''}">${p.nome}</a><small>${p.marca}, ${p.tam}</small></span><span class="preco-item"></span><button class="tirar" type="button" aria-label="Tirar ${p.nome} ${p.marca} da lista">×</button></div></div>`;
        li.querySelector('.tirar').onclick = () => lista.tirar(i);
        li.dataset.i = i;
        // entra no lugar certo da lista (uma troca põe o produto novo onde estava o antigo)
        const prox = lista.itens.slice(n + 1).map(k => linhas.get(k)).find(Boolean);
        if (prox) ul.insertBefore(li, prox); else ul.append(li);
        linhas.set(i, li);
        requestAnimationFrame(() => requestAnimationFrame(() => li.classList.add('on')));
      }
      preencher(li, i, n);
    });
  }
  lista.aoMudar(desenhar);
  desenhar();
  return desenhar;
}

// preço de um produto em cada rede. Nas redes que mudam com o CEP vale o do ponto (se houver) ou, sem ponto, a mediana dos bairros.
export function precosDoProduto(dados, k, ponto = -1) {
  const mediana = v => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  return dados.redes.map((r, j) => {
    const t = dados.precos[r.id];
    let v;
    if (r.por_cep) v = ponto >= 0 ? t[ponto][k] : (() => { const a = t.map(x => x[k]).filter(x => x != null); return a.length ? mediana(a) : null; })();
    else v = t[k];
    return { j, nome: r.nome.replace(' Atacado', ''), v, variaPorBairro: !!r.por_cep };
  });
}

// quantidade de um tamanho ("5 kg", "900 ml", "1,5 L", "20 unidades", "12 rolos") na unidade base: g, ml ou unidade
export function quantidade(tam) {
  const m = String(tam).toLowerCase().replace(',', '.').match(/([\d.]+)\s*(kg|g|ml|l|unidades?|rolos?)\b/);
  if (!m) return null;
  const n = parseFloat(m[1]), u = m[2];
  if (u === 'kg') return { n: n * 1000, u: 'g' };
  if (u === 'l') return { n: n * 1000, u: 'ml' };
  if (u === 'g' || u === 'ml') return { n, u };
  return { n, u: 'un' };
}

// Trocas que baixam a conta numa rede (k) e num ponto de coleta: para cada item da lista, o parecido mais barato.
// Vale a troca quando o parecido custa menos e também não é mais caro por kg, litro ou unidade (um pacote menor não conta
// como economia). Se o item não tem preço nessa rede e o parecido tem, a troca resolve a falta.
export function trocas(dados, itens, k, ponto) {
  const idx = Object.fromEntries(dados.produtos.map((p, i) => [p.id, i]));
  const r = dados.redes[k], tabela = dados.precos[r.id];
  const preco = i => (r.por_cep ? tabela[ponto][i] : tabela[i]);
  const saida = [];
  itens.forEach(i => {
    const grupo = PARECIDOS.find(g => g.includes(dados.produtos[i].id));
    if (!grupo) return;
    let melhor = null;
    grupo.map(id => idx[id]).filter(j => j != null && j !== i && !itens.includes(j)).forEach(j => {
      const pi = preco(i), pj = preco(j);
      if (pj == null) return;
      if (pi == null) { if (!melhor || melhor.economia != null) melhor = { i, j, economia: null }; return; }
      const qi = quantidade(dados.produtos[i].tam), qj = quantidade(dados.produtos[j].tam);
      const porUnidadeOk = !qi || !qj || qi.u !== qj.u || pj / qj.n <= pi / qi.n;
      const economia = Math.round((pi - pj) * 100) / 100;
      if (economia >= 0.1 && porUnidadeOk && (!melhor || (melhor.economia != null && economia > melhor.economia))) melhor = { i, j, economia };
    });
    if (melhor) saida.push(melhor);
  });
  return saida.sort((a, b) => (a.economia == null ? -1 : b.economia == null ? 1 : b.economia - a.economia));
}
