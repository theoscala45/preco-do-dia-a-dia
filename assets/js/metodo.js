// Página "Método e fontes": as tabelas vêm dos mesmos arquivos que o resto do site usa.
import { aoAparecer } from './aparecer.js';
import { $, gsap, ScrollTrigger, calmo, carregar, iniciar, PREVIA } from './base.js?v=20261124wq';

const [dados, geo, rotas] = await carregar('dados', 'geo', 'rotas');
// tabela CSV simples (sem vírgula dentro dos campos) -> lista de objetos
const campos = linha => { const out = []; let c = '', aspas = false;
  for (let i = 0; i < linha.length; i++) { const ch = linha[i];
    if (aspas) { if (ch === '"' && linha[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') aspas = false; else c += ch; }
    else if (ch === '"') aspas = true; else if (ch === ',') { out.push(c); c = ''; } else c += ch; }
  out.push(c); return out; };
const csv = async caminho => {
  const [cab, ...linhas] = (await (await fetch(caminho)).text()).trim().split(/\r?\n/).map(campos);
  return linhas.map(l => Object.fromEntries(cab.map((c, i) => [c, l[i] ?? ''])));
};
const [links, execucoes] = await Promise.all([csv('data/links.csv').catch(() => []), csv('data/execucoes.csv').catch(() => [])]);

// grupos da cesta
const cats = [...new Set(dados.produtos.map(p => p.cat))];
$('grupos').innerHTML = cats.map(c => {
  const todos = dados.produtos.filter(p => p.cat === c), noIndice = todos.filter(p => p.indice).length;
  return `<li><b>${todos.length}</b><span>${c}</span><small>${noIndice ? 'no índice' : 'só no comparador'}</small></li>`;
}).join('');
$('tabProdutos').innerHTML = `<thead><tr><th scope="col">Produto</th><th scope="col">Marca</th><th scope="col">Tamanho</th><th scope="col">Grupo</th><th scope="col">Índice</th></tr></thead><tbody>${
  dados.produtos.map(p => `<tr><th scope="row"><a href="produto.html?p=${p.id}${PREVIA ? '&previa' : ''}">${p.nome}</a></th><td>${p.marca}</td><td>${p.tam}</td><td>${p.cat}</td><td>${p.indice ? 'sim' : 'não'}</td></tr>`).join('')}</tbody>`;
$('tabPontos').innerHTML = `<thead><tr><th scope="col">Bairro</th><th scope="col">Zona</th><th scope="col">CEP</th><th scope="col">Rua</th><th scope="col">Renda do distrito</th></tr></thead><tbody>${
  geo.pontos.map(p => `<tr><th scope="row">${p.bairro}</th><td>${p.zona}</td><td>${p.cep}</td><td>${p.rua}</td><td>${p.perfil} <small>(R$ ${p.renda.toLocaleString('pt-BR')})</small></td></tr>`).join('')}</tbody>`;
$('nCesta').textContent = dados.itens_na_cesta;
$('nLojas').textContent = rotas.lojas.length;

// estado da coleta, dito como está
const dias = new Set(execucoes.map(e => e.data)).size;
$('estadoColeta').textContent = dados.exemplo
  ? (dias
    ? `A coleta já rodou em ${dias} ${dias === 1 ? 'dia' : 'dias'}, mas ainda não cobre todas as redes. Por isso os preços que o site mostra hoje são inventados, e a faixa no topo avisa. Ela some sozinha quando o site passar a usar os preços reais.`
    : 'A coleta ainda não está rodando. Por isso os preços que o site mostra hoje são inventados, e a faixa no topo avisa. Ela some sozinha quando o site passar a usar os preços reais.')
  : `Os preços do site vêm da coleta. A última data lida é ${new Date(dados.datas.at(-1) + 'T12:00').toLocaleDateString('pt-BR')}.`;
if (links.length) {
  const nomes = { tenda: 'Tenda', atacadao: 'Atacadão', carrefour: 'Carrefour', 'pao-de-acucar': 'Pão de Açúcar', sonda: 'Sonda', 'santa-luzia': 'Santa Luzia', hirota: 'Hirota', 'st-marche': 'St Marche', nagumo: 'Nagumo', mambo: 'Mambo' };
  const frases = Object.keys(nomes).filter(r => links.some(l => l.rede_id === r)).map(r => {
    const n = st => links.filter(l => l.rede_id === r && l.status === st).length;
    const lidos = n('achado') + n('variante');
    const partes = [`${n('achado')} com o produto exato`];
    if (n('variante')) partes.push(`${n('variante')} com uma variação da mesma marca e do mesmo tamanho (outra fragrância, sabor ou linha)`);
    if (n('tamanho_diferente')) partes.push(`${n('tamanho_diferente')} só em outro tamanho, que fica de fora`);
    if (n('nao_achado')) partes.push(`${n('nao_achado')} não ${n('nao_achado') === 1 ? 'achado' : 'achados'}`);
    if (n('bloqueado_robots')) partes.push(`${n('bloqueado_robots')} bloqueado pelo robots.txt`);
    return `${nomes[r]}: ${lidos} produtos coletados. Dos 100, ${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}.`;
  });
  $('estadoLinks').textContent = `Para cada rede, cada produto da cesta foi ligado à página certa no site, conferindo o título da página. ${frases.join(' ')}`;
}

iniciar(dados);

// o índice lateral marca a seção em que a leitura está
document.querySelectorAll('.bloco').forEach(sec => {
  const a = document.querySelector(`.indice a[href="#${sec.id}"]`);
  ScrollTrigger.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%', onToggle: s => a?.classList.toggle('ativo', s.isActive) });
});
// os quatro grupos entram toda vez que aparecem na tela
if (!calmo) {
  gsap.set('.grupos li', { autoAlpha: 0, y: 20 });
  const entra = () => gsap.to('.grupos li', { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, overwrite: true, clearProps: 'transform,opacity,visibility' });
  const sai = () => gsap.set('.grupos li', { autoAlpha: 0, y: 20, overwrite: true });
  aoAparecer(document.querySelector('.grupos'), entra, sai, { margem: '0px 0px -12% 0px' });
}
