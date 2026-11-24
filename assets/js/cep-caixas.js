// Liga o campo de CEP de uma página às 8 caixinhas (codigo.js). O campo de texto de verdade (#cep) continua na página, escondido,
// e guarda o valor: assim ligarCep, o CEP salvo e o preenchimento automático funcionam como antes.
import { criarCodigo } from './codigo.js?v=20261124t';

// Depois da festa do CEP certo (faíscas, anel, ✓), a próxima só vem 10 segundos depois. Dá para clicar quantas vezes quiser:
// o CEP é conferido sempre. O balanço do CEP errado não espera: acontece em todo clique.
export const espera = {
  ms: 10000, ultimo: -1e9,
  livre() { return performance.now() - this.ultimo >= this.ms; },
  marcar() { this.ultimo = performance.now(); },
};

export function caixasDoCep({ form, campo, msg, aoAcertar, aoErrar }) {
  let sinc = false;
  const host = document.createElement('div');
  form.querySelector('.cep-linha').prepend(host);
  campo.classList.add('cep-oculto'); campo.tabIndex = -1; campo.setAttribute('aria-hidden', 'true');
  const cod = criarCodigo(host, {
    length: 8, separador: 5, rotulo: 'Seu CEP, 8 números',
    aoMudar: c => {
      sinc = true;
      campo.value = c.includes(' ') ? '' : (c.length > 5 ? c.slice(0, 5) + '-' + c.slice(5) : c);   // com buraco no meio o CEP vale como incompleto
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      sinc = false;
      if (c) { msg.textContent = ''; msg.className = 'cep-msg'; }
      cod.status('idle');
    },
  });
  campo.addEventListener('input', () => { if (!sinc) cod.definir(campo.value); });
  campo.addEventListener('focus', () => cod.foco());
  form.addEventListener('submit', () => {   // roda depois da checagem de ligarCep (que escreve a mensagem de erro)
    if (msg.classList.contains('erro')) {
      // CEP inválido: o botão balança e os números afundam TODA vez que clica; a espera de 10 s não vale para o erro
      aoErrar?.();
      if (campo.value.replace(/\D/g, '').length >= 8) cod.status('error');
      return;
    }
    // CEP certo: a festa (faíscas, ✓) só volta 10 s depois da última
    if (!espera.livre()) return;
    espera.marcar();
    aoAcertar?.(); cod.status('success'); setTimeout(() => cod.status('idle'), 1300);
  });
  if (campo.value) cod.definir(campo.value);
  return cod;
}
