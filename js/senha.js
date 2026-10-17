// Criar ou trocar a senha (pedido do Bruno, 17/10/2026): para quem já entrou, duas caixas de senha e a
// regra mínima de tamanho. A senha só passa para a autenticação do Supabase; nada dela fica no site.
import { trocarSenha } from './banco.js';

export const MIN_SENHA = 8;

// Quem pediu "Primeira vez? Crie a sua senha" e entrou pelo link cai direto nesta tela.
export function abrirSenhaDireto({ demo = false } = {}) {
  if (document.querySelector('.janela-senha-direta')) return;
  const fundo = document.createElement('div');
  fundo.className = 'janela-senha-direta';
  fundo.innerHTML = '<div class="janela-senha-caixa" role="dialog" aria-modal="true" aria-label="Criar a sua senha"><h2 class="placa-bronze">Crie a sua senha</h2><div class="janela-senha-corpo"></div></div>';
  document.body.appendChild(fundo);
  const fechar = () => {
    fundo.remove();
    try { localStorage.removeItem('mascara.criarSenha'); } catch { /* sem armazenamento */ }
    if (/[?&]criar-senha=1/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
  };
  formSenha(fundo.querySelector('.janela-senha-corpo'), { demo, aoFim: fechar });
}

export function formSenha(corpo, { demo = false, aoFim } = {}) {
  corpo.innerHTML = `
    <form class="form-senha" autocomplete="on" novalidate>
      <p class="nota">Com uma senha, você entra direto, sem esperar o e-mail. Use pelo menos ${MIN_SENHA} caracteres.</p>
      <label>Nova senha<input type="password" name="senha" autocomplete="new-password" minlength="${MIN_SENHA}" required></label>
      <label>Repita a senha<input type="password" name="repete" autocomplete="new-password" minlength="${MIN_SENHA}" required></label>
      <p class="msg-login" role="status" hidden></p>
      <div class="cartao-botoes"><button type="submit" class="btn">Salvar a senha</button><button type="button" class="btn-texto" data-fechar-senha>Agora não</button></div>
    </form>`;
  const form = corpo.querySelector('form');
  const msg = form.querySelector('.msg-login');
  const dizer = (tipo, texto, perto = null) => { msg.hidden = false; msg.className = `msg-login msg-${tipo}`; msg.setAttribute('role', tipo === 'erro' ? 'alert' : 'status'); msg.textContent = texto; if (perto) perto.after(msg); else form.querySelector('.cartao-botoes').before(msg); };
  form.querySelector('[data-fechar-senha]').onclick = () => aoFim?.(false);
  form.senha.focus();
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const senha = form.senha.value;
    if (senha.length < MIN_SENHA) { dizer('erro', `Essa senha é curta: use pelo menos ${MIN_SENHA} letras ou números.`, form.senha.closest('label')); return; }
    if (senha !== form.repete.value) { dizer('erro', 'As duas senhas não são iguais.', form.repete.closest('label')); return; }
    const botao = form.querySelector('[type=submit]');
    if (botao.disabled) return;
    botao.disabled = true;
    botao.textContent = 'Salvando…';
    msg.hidden = true;
    try {
      if (!demo) await trocarSenha(senha);
      form.senha.value = ''; form.repete.value = '';
      dizer('ok', demo ? 'Demonstração: nada é salvo. No jogo, aparece: Pronto. Da próxima vez, entre com e-mail e senha.' : 'Pronto. Da próxima vez, entre com e-mail e senha.');
      setTimeout(() => aoFim?.(true), 2200);
    } catch (err) {
      dizer('erro', err.message);
      botao.disabled = false;
      botao.textContent = 'Salvar a senha';
    }
  };
}
