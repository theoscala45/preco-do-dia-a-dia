// Liga o campo de CEP de uma página às 8 caixinhas (codigo.js). O campo de texto de verdade (#cep) continua na página, escondido,
// e guarda o valor: assim ligarCep, o CEP salvo e o preenchimento automático funcionam como antes.
import { criarCodigo } from './codigo.js?v=20261124r';

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
    if (!msg.classList.contains('erro')) { aoAcertar?.(); cod.status('success'); setTimeout(() => cod.status('idle'), 1300); }
    else { aoErrar?.(); if (campo.value.replace(/\D/g, '').length >= 8) cod.status('error'); }
  });
  if (campo.value) cod.definir(campo.value);
  return cod;
}
