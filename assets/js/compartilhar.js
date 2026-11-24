// Compartilhar o resultado e salvar como foto.
// A imagem é desenhada aqui, no navegador, num canvas. Nada é enviado para nenhum servidor (ver a página Privacidade).
export const SITE = 'https://theoscala45.github.io/preco-do-dia-a-dia/';

let aviso = null, avisoT = 0;
// um aviso curto no pé da tela ("Link copiado")
export function toast(msg) {
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.className = 'toast'; aviso.setAttribute('role', 'status'); aviso.setAttribute('aria-live', 'polite');
    document.body.append(aviso);
  }
  aviso.textContent = msg;
  aviso.classList.remove('on'); void aviso.offsetWidth; aviso.classList.add('on');
  clearTimeout(avisoT);
  avisoT = setTimeout(() => aviso.classList.remove('on'), 2600);
}

// texto no celular abre o menu de compartilhar do sistema; no computador, copia o texto com o link
export async function compartilhar({ titulo, texto, url = SITE }) {
  if (navigator.share) {
    try { await navigator.share({ title: titulo, text: texto, url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }   // a pessoa fechou o menu: não é erro
  }
  const completo = `${texto} ${url}`;
  try { await navigator.clipboard.writeText(completo); toast('Texto e link copiados'); }
  catch {
    const t = document.createElement('textarea');
    t.value = completo; t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select();
    try { document.execCommand('copy'); toast('Texto e link copiados'); } catch { toast('Não deu para copiar. Copie o endereço da barra.'); }
    t.remove();
  }
}

// ---------- a imagem (1080 x 1350, formato de publicação)
const L = 72, W = 1080, H = 1350;
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
function quebrar(c, texto, larguraMax) {
  const palavras = texto.split(' '), linhas = []; let atual = '';
  for (const p of palavras) { const t = atual ? atual + ' ' + p : p; if (c.measureText(t).width > larguraMax && atual) { linhas.push(atual); atual = p; } else atual = t; }
  if (atual) linhas.push(atual);
  return linhas;
}
async function fontes() {
  await Promise.all([
    document.fonts.load('800 100px "Big Shoulders Display"'), document.fonts.load('700 40px "Red Hat Display"'),
    document.fonts.load('600 34px "Red Hat Text"'), document.fonts.load('500 28px "Red Hat Mono"'),
  ]);
}
// dados: { titulo, subtitulo, destaque:{rotulo, nome, valor}, linhas:[{nome, valor, v, melhor}], rodape }
export async function desenharCartao(dados) {
  await fontes();
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const TINTA = '#16161A', LARANJA = '#F26A0F', CINZA = '#5C5C64', CLARO = '#8A8A92', AZUL = '#A5ADE6';
  c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);

  // régua de prateleira no topo, com a presilha laranja
  c.fillStyle = TINTA; c.fillRect(L, 0, W - 2 * L, 6);
  c.fillStyle = 'rgba(22,22,26,.18)'; for (let x = L; x < W - L; x += 16) c.fillRect(x, 10, 2, 8);
  c.fillStyle = LARANJA; rr(c, L, 0, 120, 16, 0); c.fill();

  // marca
  c.save(); c.translate(L + 4, 78); c.rotate(-0.14);
  c.fillStyle = LARANJA; c.beginPath(); c.moveTo(0, 0); c.lineTo(34, 0); c.lineTo(34, 24); c.lineTo(17, 40); c.lineTo(0, 24); c.closePath(); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(24, 10, 4.6, 0, Math.PI * 2); c.fill(); c.restore();
  c.fillStyle = TINTA; c.font = '700 40px "Red Hat Display"'; c.textBaseline = 'alphabetic'; c.fillText('Preço Aberto', L + 56, 108);

  // título (nome do bairro ou da lista), até 2 linhas
  c.font = '800 150px "Big Shoulders Display"'; c.fillStyle = TINTA;
  const tl = quebrar(c, dados.titulo, W - 2 * L).slice(0, 2);
  let y = 250; tl.forEach(l => { c.fillText(l, L, y); y += 126; });
  y -= 126;
  c.font = '500 30px "Red Hat Mono"'; c.fillStyle = CINZA; c.fillText(dados.subtitulo, L, y + 52);

  // a etiqueta laranja com o mais barato
  const ty = y + 92, th = 250;
  c.fillStyle = LARANJA; rr(c, L, ty, W - 2 * L, th, 22); c.fill();
  c.beginPath(); c.arc(W - L - 50, ty + 50, 14, 0, Math.PI * 2); c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.92)'; c.font = '500 28px "Red Hat Mono"'; c.fillText(`${dados.destaque.rotulo}: ${dados.destaque.nome}`, L + 44, ty + 66);
  c.fillStyle = '#fff'; c.font = '800 168px "Big Shoulders Display"'; c.fillText(dados.destaque.valor, L + 44, ty + 218);

  // ranking: as linhas se ajustam ao espaço que sobra (de 41 a 64 px cada)
  const linhas = dados.linhas.slice(0, 10), ry = ty + th + 64;
  const passo = Math.max(38, Math.min(64, Math.floor((H - 150 - ry) / Math.max(1, linhas.length))));
  const fonte = Math.max(26, Math.min(32, Math.round(passo * 0.58))), alturaBarra = Math.round(passo * 0.34);
  const maior = Math.max(...linhas.map(l => l.v), 0.0001), xBarra = L + 270, wBarra = W - L - 250 - xBarra;
  linhas.forEach((l, k) => {
    const cy = ry + k * passo;
    c.fillStyle = TINTA; c.font = (l.melhor ? '800 ' : '600 ') + fonte + 'px "Red Hat Text"'; c.fillText(l.nome, L, cy + fonte * 0.35);
    c.fillStyle = '#E6E6E2'; rr(c, xBarra, cy - alturaBarra / 2, wBarra, alturaBarra, 4); c.fill();
    c.fillStyle = l.melhor ? LARANJA : AZUL; rr(c, xBarra, cy - alturaBarra / 2, Math.max(8, wBarra * (l.v / maior)), alturaBarra, 4); c.fill();
    c.fillStyle = TINTA; c.font = '800 ' + fonte + 'px "Red Hat Display"'; c.textAlign = 'right'; c.fillText(l.valor, W - L, cy + fonte * 0.35); c.textAlign = 'left';
  });

  // rodapé
  c.fillStyle = TINTA; c.fillRect(L, H - 112, W - 2 * L, 3);
  c.fillStyle = CINZA; c.font = '500 26px "Red Hat Mono"'; c.fillText(dados.rodape, L, H - 66);
  c.fillStyle = TINTA; c.font = '600 28px "Red Hat Mono"'; c.textAlign = 'right'; c.fillText('theoscala45.github.io/preco-do-dia-a-dia', W - L, H - 28); c.textAlign = 'left';
  return new Promise(res => cv.toBlob(res, 'image/png'));
}

// no celular, abre o menu do sistema com a imagem (que tem "Salvar imagem"); no computador, baixa o arquivo
export async function salvarFoto(dados, nomeArquivo) {
  toast('Preparando a imagem...');
  const blob = await desenharCartao(dados);
  if (!blob) { toast('Não deu para criar a imagem neste navegador.'); return; }
  const arquivo = new File([blob], nomeArquivo, { type: 'image/png' });
  const toque = matchMedia('(pointer: coarse)').matches;
  if (toque && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: dados.titulo }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nomeArquivo; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Imagem salva na pasta de downloads');
}
