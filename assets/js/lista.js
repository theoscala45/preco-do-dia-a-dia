// Página "Resultado da lista": loja única mais barata, economia, divisão em duas lojas, rota e tabela por produto.
import { $, gsap, ScrollTrigger, calmo, reais, curto, rolar, carregar, guarda, ligarCep, iniciar } from './base.js';
import { criarLista, calcular, ligarBusca, ligarItens, ECONOMIA_MINIMA } from './cesta.js';

const [dados, geo, rotas] = await carregar('dados', 'geo', 'rotas');
iniciar(dados);

const lista = criarLista(dados);
const nomes = dados.redes.map(r => r.nome.replace(' Atacado', ''));
const estado = { ponto: 0, cepDado: false };
const salvo = guarda.ler('ponto', -1);
if (salvo >= 0 && salvo < geo.pontos.length) { estado.ponto = salvo; estado.cepDado = true; }
$('cep').value = guarda.ler('cep', '');

const rotaDe = k => rotas.pontos.find(p => p.id === geo.pontos[estado.ponto].id)?.redes[dados.redes[k].id];
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// ---------- mapa da rota até a loja (aparece quando o cartão entra na tela)
let mapaRota = null;
try {
  const { criarMapaDeRota } = await import('./mapa-rota.js');
  mapaRota = criarMapaDeRota($('mapaRota'), geo, rotas, { calmo });
} catch (erro) {
  console.warn('Mapa indisponível neste navegador.', erro);
  document.querySelector('.mapa-cartao').hidden = true;
}

function desenhar() {
  const tem = lista.itens.length > 0, pt = geo.pontos[estado.ponto];
  $('contagem').textContent = tem ? plural(lista.itens.length, 'item', 'itens') : '';
  $('ptRotulo').textContent = `bairro ${curto(pt.bairro)}`;
  $('cestaPonto').textContent = estado.cepDado
    ? `Preços do bairro ${curto(pt.bairro)}.`
    : `Sem CEP, a conta usa ${curto(pt.bairro)}. Digite seu CEP para trocar.`;
  $('vazio').hidden = tem;
  $('cheio').hidden = !tem;
  $('limpar').hidden = !tem;
  if (!tem) return;

  const { porRede, melhor, pior, completas, dupla, vale } = calcular(dados, lista.itens, estado.ponto);

  // loja única
  $('vNome').textContent = melhor.rede.nome;
  rolar($('vInt'), $('vCent'), melhor.total);
  $('vFalta').textContent = melhor.faltam ? `${plural(melhor.faltam, 'item indisponível', 'itens indisponíveis')} nesta rede. O total não conta com ${melhor.faltam > 1 ? 'eles' : 'ele'}.` : '';
  $('vEco').innerHTML = completas.length > 1 && pior.total > melhor.total
    ? `<b>${reais(pior.total - melhor.total)} a menos</b><span>${pior.rede.nome} cobra ${reais(pior.total)}</span>`
    : '<span>Nenhuma outra rede tem os mesmos itens para comparar</span>';
  const rota = rotaDe(melhor.k), loja = rota && rotas.lojas[rota.loja];
  $('vLoja').innerHTML = rota ? `<b>${rota.km.toLocaleString('pt-BR')} km de carro</b><span>${loja.end || loja.nome}</span>` : '<span>Sem loja no mapa</span>';
  $('vPonto').innerHTML = `<b>${curto(pt.bairro)}</b><span>${pt.rua}, ${pt.cep}</span>`;

  // divisão em duas lojas
  $('duas').classList.toggle('nao', !vale);
  if (vale) {
    const achaMais = dupla.faltam < melhor.faltam;
    $('dTitulo').textContent = `${reais(dupla.total)} em duas lojas`;
    $('dNota').textContent = achaMais
      ? `Assim você acha ${plural(melhor.faltam - dupla.faltam, 'item', 'itens')} a mais do que numa loja só.`
      : `Economia de ${reais(melhor.total - dupla.total)} contra a loja única.`;
    $('dColunas').innerHTML = [[dupla.a, 0, dupla.ta, dupla.na], [dupla.b, 1, dupla.tb, dupla.nb]].map(([r, lado, sub, n]) => {
      const itens = lista.itens.map((i, q) => (dupla.lado[q] === lado ? `<li><span>${dados.produtos[i].nome}<small>${dados.produtos[i].marca}</small></span><b>${reais(r.v[q])}</b></li>` : '')).join('');
      return `<div><header><strong>${r.rede.nome}</strong><span>${plural(n, 'item', 'itens')}</span><b>${reais(sub)}</b></header><ul>${itens}</ul></div>`;
    }).join('');
  } else {
    $('dTitulo').textContent = 'Não compensa nesta lista';
    $('dNota').textContent = lista.itens.length < 2
      ? 'Com um item só não há o que dividir.'
      : `A melhor dupla de lojas economizaria menos de ${reais(ECONOMIA_MINIMA)} contra a loja única. O site só sugere dividir acima disso, ou quando a divisão acha mais itens.`;
    $('dColunas').innerHTML = '';
  }

  // total em cada rede
  const maior = Math.max(...porRede.map(r => r.total));
  $('ranking').innerHTML = porRede.map(r => {
    const inteira = r.faltam === melhor.faltam;
    return `<li${inteira ? '' : ' class="parcial"'}><span>${r.rede.nome}</span><span class="barra"><i data-v="${(r.total / maior).toFixed(3)}"></i></span><span class="val">${reais(r.total)}${r.faltam ? `<small>${plural(r.faltam, 'falta', 'faltam')}</small>` : ''}</span></li>`;
  }).join('');
  const barras = gsap.utils.toArray('#ranking i');
  if (calmo) gsap.set(barras, { scaleX: (k, el) => +el.dataset.v });
  else gsap.fromTo(barras, { scaleX: 0 }, { scaleX: (k, el) => +el.dataset.v, duration: 0.9, ease: 'power3.out', stagger: 0.05, overwrite: true });

  // produto por produto, na ordem das redes do total
  const ordem = porRede.map(r => r.k);
  const linhas = lista.itens.map((i, q) => {
    const p = dados.produtos[i], v = ordem.map(k => porRede.find(r => r.k === k).v[q]), menor = Math.min(...v.filter(x => x != null));
    return `<tr><th scope="row">${p.nome}<small>${p.marca}, ${p.tam}</small></th>${v.map(x => (x == null ? '<td class="sem" title="indisponível nesta rede">—<span class="so-leitor">indisponível nesta rede</span></td>' : `<td${x === menor ? ' class="menor"' : ''}>${reais(x).replace('R$', '').trim()}</td>`)).join('')}</tr>`;
  }).join('');
  $('tabela').innerHTML = `<thead><tr><th scope="col">Produto</th>${ordem.map((k, c) => `<th scope="col"${c ? '' : ' class="menor"'}>${nomes[k]}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody>
    <tfoot><tr><th scope="row">Total</th>${porRede.map((r, c) => `<td${c ? '' : ' class="menor"'}>${reais(r.total).replace('R$', '').trim()}${r.faltam ? `<small>${plural(r.faltam, 'falta', 'faltam')}</small>` : ''}</td>`).join('')}</tr></tfoot>`;

  // mapa: a loja única em laranja; se a divisão compensa e usa outra rede, ela entra em branco
  if (mapaRota) {
    const mostra = [{ k: melhor.k, nome: nomes[melhor.k] }];
    if (vale) for (const r of [dupla.a, dupla.b]) if (r.k !== melhor.k) mostra.push({ k: r.k, nome: nomes[r.k] });
    const feitas = mapaRota.mostrar(estado.ponto, mostra.map(m => ({ ...m, id: dados.redes[m.k].id })));
    $('mapaNota').textContent = feitas
      ? `Caminho de carro do bairro até a loja mais perto ${mostra.length > 1 ? 'de cada rede. Em laranja, a loja única mais barata' : `do ${melhor.rede.nome}`}.`
      : 'Não há loja dessa rede no mapa perto deste bairro.';
  }
  ScrollTrigger.refresh();
}

ligarBusca(dados, lista, $('busca'), $('sugestoes'));
ligarItens(dados, lista, $('itens'));
lista.aoMudar(desenhar);
$('basica').addEventListener('click', () => lista.basica());
$('basica2').addEventListener('click', () => lista.basica());
$('limpar').addEventListener('click', () => lista.limpar());
ligarCep(geo, $('cepForm'), $('cep'), $('cepMsg'), i => { estado.ponto = i; estado.cepDado = true; desenhar(); });
desenhar();
