// Carmen 2026, um jogo só: o passo de entrada do agente da Xerife. Todo jogador é o mesmo agente, com os mesmos
// poderes; o jogador escolhe só o nome (que aparece para os rivais e no placar) e, se quiser, o clã, que muda só
// a aparência. A linha nasce no banco já ativa (caso_agente, supabase/migrations/20261104000002), sem Narrador.
import { esc } from '../ui.js';

export const CLAS = [
  ['', 'Prefiro não dizer'],
  ['brujah', 'Brujah'], ['gangrel', 'Gangrel'], ['malkavian', 'Malkavian'], ['nosferatu', 'Nosferatu'],
  ['toreador', 'Toreador'], ['tremere', 'Tremere'], ['ventrue', 'Ventrue'], ['caitiff', 'Caitiff (sem clã)'],
];

// aoEntrar({ nome, cla }) grava e devolve true; se lançar um erro, a mensagem aparece no passo.
export function telaAgente(raiz, { aoEntrar }) {
  document.body.dataset.tela = 'pagina';
  raiz.innerHTML = `
    <section class="cartao agente-carmen">
      <p class="sobretitulo">A Xerife do Rio</p>
      <h2>Mais um agente esta noite</h2>
      <p>Alguém fugiu pela cidade, e a Xerife quer a presa antes do sol. Ela dá a todos os agentes os mesmos poderes:
        <b>Sentidos Aguçados</b>, <b>Compelir</b> e <b>Reflexos Rápidos</b>. Ganha quem chegar primeiro.</p>
      <form class="form-agente" novalidate>
        <label>Seu nome de agente <small>aparece para os rivais e no placar</small>
          <input name="nome" maxlength="40" autocomplete="nickname" required></label>
        <label>Clã <small>só a aparência: os poderes são iguais para todos</small>
          <select name="cla">${CLAS.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></label>
        <button class="btn destaque" type="submit">Começar a caçada</button>
        <p class="msg-agente" role="status" hidden></p>
      </form>
    </section>`;
  const form = raiz.querySelector('.form-agente');
  const msg = raiz.querySelector('.msg-agente');
  const dizer = (t) => { msg.textContent = t; msg.hidden = !t; };
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nome = form.nome.value.trim();
    if (!nome) { dizer('Escreva um nome para a Xerife chamar você.'); form.nome.focus(); return; }
    const botao = form.querySelector('button');
    botao.disabled = true;
    dizer('');
    try { await aoEntrar({ nome, cla: form.cla.value || null }); } catch (e) { dizer(e.message || 'Não deu certo. Tente de novo em instantes.'); } finally { botao.disabled = false; }
  });
  form.nome.focus();
}
