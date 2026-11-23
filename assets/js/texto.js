// Páginas de texto (Sobre, Privacidade, Termos de uso e Contato): só o cabeçalho, o rodapé e as animações comuns.
import { carregar, iniciar } from './base.js';

const [dados] = await carregar('dados');
iniciar(dados);

// o e-mail só vira link aqui, para não ficar escrito inteiro no código da página
document.querySelectorAll('a.email').forEach(a => {
  const endereco = `${a.dataset.u}@${a.dataset.d}`;
  a.href = `mailto:${endereco}`;
  a.textContent = endereco;
});
