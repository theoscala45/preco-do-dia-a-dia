// Página "Produtos": os 100 da cesta, com busca e filtro por grupo. Cada linha leva à página do produto.
import { $, carregar, iniciar, reais, guarda, semAcento, PREVIA } from './base.js?v=20261124xf';
import { segmentoElastico } from './segmento.js?v=20261124w9';
import { precosDoProduto } from './cesta.js';

const [dados, geo] = await carregar('dados', 'geo');
const q = PREVIA ? '&previa' : '';
const ponto = guarda.ler('ponto', -1);
const pontoValido = ponto >= 0 && ponto < geo.pontos.length ? ponto : -1;

// o mais barato de cada produto (com o bairro da pessoa, se ela já deu o CEP)
const itens = dados.produtos.map((p, k) => {
  const tem = precosDoProduto(dados, k, pontoValido).filter(l => l.v != null).sort((a, b) => a.v - b.v);
  return { p, barato: tem[0] || null, redes: tem.length, busca: semAcento(`${p.nome} ${p.marca} ${p.cat}`) };
});
const grupos = ['Todos', ...new Set(dados.produtos.map(p => p.cat))];
let grupo = 'Todos', termo = '';
const POR_GRUPO = 5;   // quantos produtos de cada grupo aparecem em "Todos"

$('pGrupos').innerHTML = grupos.map(g => `<button type="button" class="aba" data-g="${g}" aria-pressed="${g === 'Todos'}">${g}</button>`).join('');
function desenhar() {
  const t = semAcento(termo.trim());
  const ver = itens.filter(i => (grupo === 'Todos' || i.p.cat === grupo) && (!t || i.busca.includes(t)));
  const linha = ({ p, barato }) => `<li><a href="produto.html?p=${p.id}${q}">
    <span class="p-nome">${p.nome}<small>${p.marca}, ${p.tam}</small></span>
    <span class="p-preco">${barato ? `<b>${reais(barato.v)}</b><small>mais barato no ${barato.nome}</small>` : '<small>sem preço lido</small>'}</span>
    <span class="p-seta" aria-hidden="true">→</span></a></li>`;
  // Lei de Miller: sem filtro nem busca, aparecem só os primeiros de cada um dos 4 grupos (a lista de 100 ficava gigante);
  // o botão do fim do grupo abre o grupo inteiro
  let mostrados = ver.length;
  if (grupo === 'Todos' && !t) {
    const porGrupo = new Map();
    ver.forEach(i => { if (!porGrupo.has(i.p.cat)) porGrupo.set(i.p.cat, []); porGrupo.get(i.p.cat).push(i); });
    mostrados = 0;
    $('pLista').innerHTML = [...porGrupo].map(([cat, lista]) => {
      const parte = lista.slice(0, POR_GRUPO); mostrados += parte.length;
      const mais = lista.length > parte.length
        ? `<li class="prods-mais" role="presentation"><button type="button" class="quieto" data-g="${cat}">Ver os ${lista.length} produtos de ${cat}</button></li>` : '';
      return `<li class="prods-grupo" role="presentation"><h2>${cat}</h2><span>${lista.length} produtos</span></li>${parte.map(linha).join('')}${mais}`;
    }).join('');
  } else {
    $('pLista').innerHTML = ver.map(linha).join('');
  }
  $('pVazio').hidden = ver.length > 0;
  $('pContagem').textContent = `${mostrados < ver.length ? `${mostrados} de ${itens.length} produtos. Escolha um grupo para ver todos` : `${ver.length} de ${itens.length} produtos`}${pontoValido >= 0 ? `. Preços do bairro ${geo.pontos[pontoValido].bairro.split(' (')[0]}` : ''}.`;
}
$('pLista').addEventListener('click', e => {   // "Ver os N produtos de ..." escolhe o grupo no seletor
  const b = e.target.closest('.prods-mais button'); if (!b) return;
  [...$('pGrupos').querySelectorAll('.aba:not(.aba-copia)')].find(x => x.dataset.g === b.dataset.g)?.click();
  scrollTo({ top: Math.max(0, $('pGrupos').getBoundingClientRect().top + scrollY - 120), behavior: 'smooth' });
});
$('pBusca').addEventListener('input', e => { termo = e.target.value; desenhar(); });
segmentoElastico($('pGrupos'));   // o destaque azul estica até o grupo escolhido (e dá para arrastar)
$('pGrupos').addEventListener('segmento', e => {
  grupo = e.detail.botao.dataset.g;
  e.detail.botao.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });   // em tela estreita a fileira rola
  desenhar();
});
desenhar();
// as animações comuns começam depois que a lista está na página
iniciar(dados);
