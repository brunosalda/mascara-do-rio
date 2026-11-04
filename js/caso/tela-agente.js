// Carmen 2026, um jogo só: o passo de entrada do agente da Xerife. Todo jogador é o mesmo agente, com os mesmos
// poderes; o jogador escolhe só o nome (que aparece para os rivais e no placar) e, se quiser, o clã, que muda só
// a aparência. A linha nasce no banco já ativa (caso_agente, supabase/migrations/20261104000002), sem Narrador.
import { esc } from '../ui.js';

export const CLAS = [
  ['', 'Sem clã à vista'],
  ['brujah', 'Brujah'], ['gangrel', 'Gangrel'], ['malkavian', 'Malkavian'], ['nosferatu', 'Nosferatu'],
  ['toreador', 'Toreador'], ['tremere', 'Tremere'], ['ventrue', 'Ventrue'], ['caitiff', 'Caitiff (sem clã)'],
];

// O retrato de cada clã (img/clas/<id>.jpg); o do Malkavian tem o nome do arquivo em português.
const IMAGEM_CLA = { malkavian: 'malkaviano' };
const imagemCla = (v) => `img/clas/${IMAGEM_CLA[v] || v}.jpg`;

// aoEntrar({ nome, cla }) grava e devolve true; se lançar um erro, a mensagem aparece no passo.
// Para depois da avaliação do 2c9ff53 (04/11): a entrada é a credencial da Xerife, no papel creme da Licença de
// Caça (css/carmen.css, .licenca-doc), com o retrato dela; o nome se escreve numa linha do papel e o clã é uma ficha.
export function telaAgente(raiz, { aoEntrar }) {
  document.body.dataset.tela = 'pagina';
  raiz.innerHTML = `
    <section class="carmen entrada-agente">
      <form class="licenca-doc licenca-agente assinada form-agente" novalidate>
        <header class="licenca-cabeca"><h2>Credencial de Caça</h2><span class="licenca-num">Nº ____</span></header>
        <div class="agente-convite">
          <img class="agente-xerife" src="img/carmen/xerife-retrato.webp" alt="Iolanda, a Xerife do Rio" width="120" height="150">
          <p class="datilo">Alguém fugiu pela cidade, e eu quero a presa antes do sol. Todos os meus agentes recebem os mesmos poderes:
            <b>Sentidos Aguçados</b>, <b>Compelir</b> e <b>Reflexos Rápidos</b>. Ganha quem chegar primeiro.</p>
        </div>
        <label class="agente-linha"><small>Nome do agente <i>aparece para os rivais e no placar</i></small>
          <input name="nome" maxlength="40" autocomplete="nickname" required placeholder="escreva aqui" aria-describedby="msg-agente"></label>
        <p class="msg-agente" id="msg-agente" role="status" hidden></p>
        <fieldset class="agente-clas">
          <legend><small>Clã <i>só a aparência: os poderes são iguais para todos</i></small></legend>
          <div class="agente-fichas">${CLAS.map(([v, t]) => `
            <label class="ficha-cla${v ? '' : ' sem-cla'}"><input type="radio" name="cla" value="${v}"${v ? '' : ' checked'}>
              ${v ? `<img src="${imagemCla(v)}" alt="" width="40" height="40" loading="lazy">` : '<span class="ficha-cla-vazio" aria-hidden="true">?</span>'}
              <span>${esc(t)}</span></label>`).join('')}
          </div>
        </fieldset>
        <div class="agente-fim">
          <p class="licenca-assina"><img class="xerife-rosto" src="img/carmen/xerife-rosto.webp" alt="" width="56" height="56"><span>Iolanda</span><small>Xerife</small></p>
          <button class="btn destaque" type="submit">Começar a caçada</button>
        </div>
      </form>
    </section>`;
  const form = raiz.querySelector('.form-agente');
  const msg = raiz.querySelector('.msg-agente');
  const linha = raiz.querySelector('.agente-linha');
  // O aviso fica logo abaixo da linha do nome; sem nome, a linha fica vermelha até a pessoa escrever.
  const dizer = (t, naLinha = false) => { msg.textContent = t; msg.hidden = !t; linha.classList.toggle('erro', !!t && naLinha); };
  form.nome.addEventListener('input', () => { if (linha.classList.contains('erro') && form.nome.value.trim()) dizer(''); });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nome = form.nome.value.trim();
    if (!nome) { dizer('Escreva um nome para a Xerife chamar você.', true); form.nome.focus(); return; }
    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    dizer('');
    try { await aoEntrar({ nome, cla: form.cla.value || null }); } catch (e) { dizer(e.message || 'Não deu certo. Tente de novo em instantes.'); } finally { botao.disabled = false; }
  });
  form.nome.focus();
}
