// Criar ou trocar a senha (pedido do Bruno, 17/10/2026): para quem já entrou, duas caixas de senha e a
// regra mínima de tamanho. A senha só passa para a autenticação do Supabase; nada dela fica no site.
import { trocarSenha } from './banco.js';

export const MIN_SENHA = 8;

export function formSenha(corpo, { demo = false, aoFim } = {}) {
  corpo.innerHTML = `
    <form class="form-senha" autocomplete="on">
      <p class="nota">Com uma senha, você entra direto, sem esperar o e-mail. Use pelo menos ${MIN_SENHA} caracteres.</p>
      <label>Nova senha<input type="password" name="senha" autocomplete="new-password" minlength="${MIN_SENHA}" required></label>
      <label>Repita a senha<input type="password" name="repete" autocomplete="new-password" minlength="${MIN_SENHA}" required></label>
      <p class="msg-login" role="status" hidden></p>
      <div class="cartao-botoes"><button type="submit" class="btn">Salvar a senha</button><button type="button" class="btn-texto" data-fechar-senha>Agora não</button></div>
    </form>`;
  const form = corpo.querySelector('form');
  const msg = form.querySelector('.msg-login');
  const dizer = (tipo, texto) => { msg.hidden = false; msg.className = `msg-login msg-${tipo}`; msg.setAttribute('role', tipo === 'erro' ? 'alert' : 'status'); msg.textContent = texto; };
  form.querySelector('[data-fechar-senha]').onclick = () => aoFim?.(false);
  form.senha.focus();
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const senha = form.senha.value;
    if (senha.length < MIN_SENHA) { dizer('erro', `A senha precisa de pelo menos ${MIN_SENHA} caracteres.`); return; }
    if (senha !== form.repete.value) { dizer('erro', 'As duas senhas não são iguais. Digite de novo.'); return; }
    const botao = form.querySelector('[type=submit]');
    botao.disabled = true;
    dizer('info', 'Salvando…');
    try {
      if (!demo) await trocarSenha(senha);
      form.senha.value = ''; form.repete.value = '';
      dizer('ok', demo ? 'Na demonstração nada é salvo. No jogo, a senha passa a valer na hora.' : 'Senha salva. Da próxima vez, entre com o e-mail e esta senha.');
      setTimeout(() => aoFim?.(true), 2200);
    } catch (err) {
      dizer('erro', err.message);
      botao.disabled = false;
    }
  };
}
