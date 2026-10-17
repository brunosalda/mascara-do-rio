// Painel da noite: o que aconteceu (texto, vozes, HQ), escolhas, estado e envio das ações.
import * as v5 from './motor/v5.js';
import * as banco from './banco.js';
import { esc, narracao, escolhas, quadrinhos, dataLonga, dataCurta, aviso, on } from './ui.js';
import { painelEstado, lerTecnica, cabecalhoPersonagem } from './ficha.js';
import { imagemDoLocal } from './cidade.js';

function blocoAconteceu(p, ultimaNoite, narrNoite, preludio, opcoes) {
  const cenario = imagemDoLocal(p.estado?.local);
  if (ultimaNoite && narrNoite) {
    return `
      <article class="narracao">
        <p class="sobretitulo">Noite ${ultimaNoite.numero}</p>
        ${ultimaNoite.narracao_publica || ultimaNoite.paineis?.length ? `
          <h3>Nas ruas do Rio</h3>
          ${quadrinhos(ultimaNoite.paineis, { cenario })}
          <div class="texto-narracao">${narracao(ultimaNoite.narracao_publica)}</div>` : ''}
        <h3>Só você sabe</h3>
        ${quadrinhos(narrNoite.paineis, { cenario })}
        <div class="texto-narracao privada">${narracao(narrNoite.texto)}</div>
        ${escolhas(opcoes)}
      </article>`;
  }
  if (preludio) {
    return `
      <article class="narracao">
        <p class="sobretitulo">Prelúdio</p>
        ${quadrinhos(preludio.paineis, { cenario })}
        <div class="texto-narracao privada">${narracao(preludio.texto)}</div>
        ${escolhas(opcoes)}
      </article>`;
  }
  return '<div class="cartao discreto"><p>O Narrador ainda está escrevendo o seu prelúdio. Volte mais tarde.</p></div>';
}

function formularioAcoes(p, noite, acao, temOpcoes) {
  const pr = v5.predador(p.ficha?.predador?.id);
  const prazoPassou = new Date(noite.fecha_em) < new Date();
  const a = acao || {};
  return `
    <form class="acoes cartao" id="form-acoes">
      <div class="linha-titulo">
        <h2>Suas ações na noite ${noite.numero}</h2>
        <span class="selo ${acao ? 'enviado' : ''}" id="selo-acao">${acao ? `Enviado ${dataCurta(acao.atualizado_em)}` : 'Não enviado'}</span>
      </div>
      <p class="nota">${prazoPassou
        ? 'O prazo passou. O Narrador vai fechar a noite em breve; até lá, você ainda pode mudar suas ações.'
        : `A noite fecha ${esc(dataLonga(noite.fecha_em))}. Até lá, você pode mudar o que enviou.`}</p>

      <label>Ação principal
        <span class="dica">${temOpcoes ? 'Escolha uma das falas acima ou escreva a sua.' : 'O que seu personagem faz de mais importante esta noite: onde vai, com quem fala, o que tenta.'}</span>
        <textarea name="principal" rows="4" maxlength="1500" placeholder="Ex.: Vou ao Elísio no Theatro Municipal tentar descobrir quem é o Xerife.">${esc(a.principal || '')}</textarea>
      </label>

      <label>Caçada
        <span class="dica">${pr ? `Você é ${esc(pr.nome)}: ${esc(pr.desc.toLowerCase())}` : 'Como e onde você caça esta noite.'}</span>
        <textarea name="cacada" rows="2" maxlength="800" placeholder="Onde e como você caça esta noite (opcional; se deixar em branco, você caça do seu jeito de sempre).">${esc(a.cacada || '')}</textarea>
      </label>
      <label class="radio"><input type="checkbox" name="nao_cacar" ${a.nao_cacar ? 'checked' : ''}> Não vou caçar esta noite (a Fome sobe)</label>

      <fieldset>
        <legend>Ações curtas (opcionais)</legend>
        <span class="dica">Coisas rápidas: uma ligação, passar num lugar, observar alguém.</span>
        <input name="curta_1" maxlength="500" value="${esc(a.curta_1 || '')}" placeholder="Ação curta 1">
        <input name="curta_2" maxlength="500" value="${esc(a.curta_2 || '')}" placeholder="Ação curta 2">
      </fieldset>

      <label class="radio"><input type="checkbox" name="esforco" ${a.esforco ? 'checked' : ''}> Se for preciso, gaste minha Força de Vontade para tentar de novo</label>

      <div class="botoes"><span></span><button class="btn" type="submit">${acao ? 'Atualizar ações' : 'Enviar ações'}</button></div>
    </form>`;
}

export async function telaNoite(raiz, p) {
  raiz.innerHTML = '<p class="carregando">Carregando a noite…</p>';
  const [noite, narracoes, resolvidas] = await Promise.all([
    banco.noiteAberta(),
    banco.narracoesDoPersonagem(p.id),
    banco.noitesResolvidas(),
  ]);
  let acao = noite ? await banco.minhaAcao(noite.id, p.id) : null;

  // Última noite resolvida em que este personagem recebeu narração.
  const narrNoite = narracoes.find((n) => n.tipo === 'noite');
  const ultimaNoite = narrNoite ? resolvidas.find((n) => n.id === narrNoite.noite_id) : null;
  const preludio = narracoes.find((n) => n.tipo === 'preludio');
  const opcoes = noite && Array.isArray(narracoes[0]?.opcoes) ? narracoes[0].opcoes.filter((o) => typeof o === 'string') : [];

  raiz.innerHTML = `
    <section class="painel-noite">
      ${cabecalhoPersonagem(p)}
      ${painelEstado(p.estado, { tecnica: lerTecnica() })}
      ${blocoAconteceu(p, ultimaNoite, narrNoite, preludio, preludio ? opcoes : [])}
      ${noite
        ? (preludio ? formularioAcoes(p, noite, acao, opcoes.length > 0) : '')
        : '<div class="cartao discreto"><p>A cidade dorme. A próxima noite ainda não abriu.</p></div>'}
    </section>`;

  const form = raiz.querySelector('#form-acoes');
  if (!form) return;

  on(raiz, 'click', '[data-escolha]', (_e, el) => {
    const texto = opcoes[Number(el.dataset.escolha)];
    if (!texto) return;
    raiz.querySelectorAll('[data-escolha]').forEach((b) => b.classList.toggle('escolhida', b === el));
    form.principal.value = texto;
    form.principal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    form.principal.focus({ preventScroll: true });
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const campos = {
      principal: form.principal.value.trim(),
      cacada: form.cacada.value.trim(),
      nao_cacar: form.nao_cacar.checked,
      curta_1: form.curta_1.value.trim(),
      curta_2: form.curta_2.value.trim(),
      esforco: form.esforco.checked,
    };
    if (!campos.principal) { aviso('Escreva pelo menos a ação principal.'); form.principal.focus(); return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      acao = await banco.salvarAcao(noite.id, p.id, campos, acao?.id);
      const selo = form.querySelector('#selo-acao');
      selo.textContent = `Enviado ${dataCurta(acao.atualizado_em)}`;
      selo.classList.add('enviado');
      btn.textContent = 'Atualizar ações';
      aviso('Ações enviadas. Você pode mudar até a noite fechar.');
    } catch (err) {
      aviso(err.message, 'erro');
    } finally {
      btn.disabled = false;
    }
  };
}
