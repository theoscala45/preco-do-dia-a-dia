// Páginas de texto (Sobre, Privacidade, Termos de uso e Contato): só o cabeçalho, o rodapé e as animações comuns.
import { carregar, iniciar } from './base.js';

const [dados] = await carregar('dados');
iniciar(dados);
