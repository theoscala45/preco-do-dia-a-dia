// Página Sobre: o nome "Preço Aberto" em letras grandes que viram linhas tracejadas sob o cursor (TechText, em JS puro)
import { criarTechText } from './techtext.js?v=20261124g';

const faixa = document.getElementById('techNome');
if (faixa) {
  const tamanho = () => Math.round(Math.min(210, Math.max(54, faixa.clientWidth / 4.6)));
  const t = criarTechText(faixa, {
    text: 'Preço Aberto', fontFamily: '"Big Shoulders Display", sans-serif', fontWeight: 800, fontSize: tamanho(),
    letterSpacing: 0, color: '#16161A', accentColor: '#F26A0F', reveal: 'letter', dashLength: 4, dashGap: 2, specks: 15,
    intro: 'none', clickKick: true, guides: false, labels: false, selection: false,
  });
  let ra = 0;
  addEventListener('resize', () => { cancelAnimationFrame(ra); ra = requestAnimationFrame(() => t.atualizar({ fontSize: tamanho() })); });
}
