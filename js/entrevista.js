// Criação por conversa: as lembranças aparecem como um diálogo; cada resposta molda a ficha,
// que é montada sozinha no fim. O progresso fica no aparelho até a ficha ser salva.
import * as v5 from './motor/v5.js';
import { CENAS, FALAS_CLA, trocar, clasSugeridos, montarFicha } from './motor/roteiro.js';
import * as banco from './banco.js';
import { esc, narracao, aviso, on } from './ui.js';
import { estado as app, recarregarPersonagens, ir } from './app.js';
import { resumoFicha, fortesEFracos, itemFortesFracos, linhaEmVida, pedraDeToque, semPontoFinal } from './ficha.js';
import { imagemDoCla, retratoProvisorio } from './cidade.js';
import { som } from './ambiente.js';
import { termoDe, dicaDoGlossario } from './glossario.js';
import { quandoONarradorVolta } from './jogo/registro.js';
import { perguntar } from './jogo/camadas.js';

const PERGUNTAS = CENAS.filter((c) => c.tipo !== 'fim').length;

function chave() {
  return `mascara.conversa.${app.sessao?.user?.id || 'anon'}`;
}

function carregar() {
  try { return JSON.parse(localStorage.getItem(chave())) || null; } catch { return null; }
}

function guardar(e) {
  try { localStorage.setItem(chave(), JSON.stringify(e)); } catch { /* sem armazenamento */ }
}

function apagar() {
  try { localStorage.removeItem(chave()); } catch { /* sem armazenamento */ }
}

function novoEstado() {
  return { passo: 0, respostas: {}, campos: {}, cla: null, log: [] };
}

// Parágrafos aparecem um depois do outro; as opções vêm por último.
function comAtraso(html, inicio = 0, passo = 450) {
  let i = 0;
  return html.replace(/<(p|div|ol)( class="([^"]*)")?/g, (m, tag, _c, classes = '') => {
    const atraso = inicio + passo * i++;
    return `<${tag} class="${classes} surgir" style="animation-delay:${atraso}ms"`;
  });
}

function htmlLog(e) {
  return e.log.map((item) => `
    <div class="lembranca passada">
      <div class="texto-narracao">${narracao(item.texto)}</div>
      ${item.escolha ? `<p class="resposta">— ${esc(item.escolha)}</p>` : ''}
      ${item.reacao ? `<div class="texto-narracao">${narracao(item.reacao)}</div>` : ''}
    </div>`).join('');
}

function htmlCena(c, e) {
  const texto = trocar(c.texto, e);
  const base = `<div class="texto-narracao">${narracao(texto)}</div>`;
  if (c.tipo === 'campos') {
    return comAtraso(`${base}
      <div class="campos-conversa">
        ${c.campos.map((f) => `
          <label>${esc(f.rotulo)}
            ${f.longo
              ? `<textarea data-campo-conversa="${f.id}" maxlength="${f.max}" rows="2">${esc(e.campos[f.id] || '')}</textarea>`
              : `<input data-campo-conversa="${f.id}" maxlength="${f.max}" value="${esc(e.campos[f.id] || '')}" autocomplete="off">`}
          </label>`).join('')}
        <button type="button" class="btn" data-confirmar>Continuar</button>
      </div>`);
  }
  if (c.tipo === 'opcoes') {
    return comAtraso(`${base}
      <ol class="escolhas">
        ${c.opcoes.map((o, i) => `<li><button type="button" data-opcao="${i}"><span class="escolha-num">${i + 1}.</span> — ${esc(trocar(o.texto, e))}</button></li>`).join('')}
      </ol>`);
  }
  if (c.tipo === 'cla') {
    const sugeridos = clasSugeridos(e);
    const cartao = (id, grande) => {
      const cl = v5.cla(id);
      return `
        <button type="button" class="cartao-cla ${grande ? 'grande' : ''}" data-escolher-cla="${id}">
          <img src="${imagemDoCla(id)}" alt="" loading="lazy">
          <span class="cartao-cla-texto">
            <span class="opcao-nome">${cl.nome}</span>
            ${grande ? `<span class="fala-cla">“${esc(FALAS_CLA[id] || '')}”</span><span class="opcao-desc">${esc(cl.desc)}</span>` : ''}
          </span>
        </button>`;
    };
    return comAtraso(`${base}
      <p class="nota sugestao-explica">Suas lembranças apontam para estes três.</p>
      <div class="sugestoes-cla">${sugeridos.map((id) => cartao(id, true)).join('')}</div>
      <details class="todas-linhagens">
        <summary>Ver todas as linhagens</summary>
        <div class="grade-linhagens">${v5.CLAS.filter((c2) => !sugeridos.includes(c2.id)).map((c2) => cartao(c2.id, false)).join('')}</div>
      </details>`);
  }
  return '';
}

// O fim da criação: o personagem grande, com o essencial em palavras. A ficha completa e a conversa
// ficam dobradas embaixo; o envio fica à vista, com uma linha que diz o que acontece depois.
function htmlFim(ficha, ok, e) {
  const c = v5.cla(ficha.cla);
  const pr = v5.predador(ficha.predador?.id);
  const { fortes, fracos } = fortesEFracos(ficha);
  const conv = (ficha.conviccoes || []).find((x) => x?.texto?.trim());
  const pedra = conv ? pedraDeToque(conv) : '';
  return `
    <div class="lembranca surgir fim-abertura">
      <div class="texto-narracao">${narracao(`Você abre os olhos num quarto que não conhece. A sede de sangue, essa você já conhece bem.

[O SANGUE] Pronto. Agora você é um de nós.`)}</div>
    </div>
    <div class="fim-dossie surgir" style="animation-delay:450ms">
      <img class="fim-retrato" src="${retratoProvisorio(ficha.cla)}" alt="Retrato provisório, até o Narrador pintar o seu">
      <div class="fim-texto">
        <span class="grupo-rotulo">${c ? termoDe('cla', c.id, c.nome) : ''}${pr ? ` · ${termoDe('predador', pr.id, pr.nome)}` : ''}</span>
        <h2 class="fim-nome">${esc(semPontoFinal(ficha.nome) || 'Sem nome')}</h2>
        ${linhaEmVida(ficha)}
        ${ficha.origem?.conceito ? `<p class="fim-conceito">${esc(ficha.origem.conceito)}</p>` : ''}
        ${dicaDoGlossario()}
        <div class="fim-colunas">
          <div><h3>Seus pontos fortes</h3><ul class="lista-palavras compacta">${fortes.map(itemFortesFracos).join('')}</ul></div>
          <div><h3>Seus pontos fracos</h3><ul class="lista-palavras compacta">${fracos.map(itemFortesFracos).join('')}</ul></div>
        </div>
        <div class="fim-frases">
          ${conv ? `<p><b>${termoDe('geral', 'conviccao', 'Convicção')}.</b> ${esc(semPontoFinal(conv.texto))}${pedra ? `. <span class="nota">Quem ainda te prende à humanidade: ${esc(pedra)}.</span>` : ''}</p>` : ''}
          ${ficha.ambicao ? `<p><b>${termoDe('geral', 'ambicao', 'Ambição')}.</b> ${esc(semPontoFinal(ficha.ambicao))}.</p>` : ''}
          ${ficha.desejo ? `<p><b>${termoDe('geral', 'desejo', 'Desejo')}.</b> ${esc(semPontoFinal(ficha.desejo))}.</p>` : ''}
        </div>
      </div>
    </div>
    <div class="fim-envio surgir" style="animation-delay:800ms">
      ${ok ? '' : '<p class="nota">Faltou algum detalhe na ficha. Use "Ajustar detalhes" para completar.</p>'}
      <p class="fim-depois">Depois de enviar, o Narrador lê sua ficha, encaixa você na cidade e escreve o seu prelúdio. Ele volta ${quandoONarradorVolta()}. Até ele começar, você ainda pode ajustar.</p>
      <div class="botoes final-conversa">
        <button type="button" class="btn-secundario" data-ajustar>Ajustar detalhes</button>
        <button type="button" class="btn" data-enviar-conversa ${ok ? '' : 'disabled'}>Enviar para o Narrador</button>
      </div>
    </div>
    <details class="fim-dobra">
      <summary>Ver a ficha completa</summary>
      ${resumoFicha(ficha, { semCabeca: true })}
    </details>
    <details class="fim-dobra">
      <summary>Reler as lembranças</summary>
      <div class="dialogo">${htmlLog(e)}</div>
    </details>
    <p class="nota centro"><button type="button" class="btn-texto" data-recomecar>Recomeçar a conversa</button></p>`;
}

export async function telaEntrevista(raiz, personagem) {
  let e = carregar() || novoEstado();
  let p = personagem;
  let ocupado = false;

  function desenhar() {
    const c = CENAS[e.passo];
    const fim = c.tipo === 'fim';
    const ficha = fim ? montarFicha(e) : null;
    const ok = fim && v5.fichaCompleta(ficha);
    // Mesmo palco da cena do jogo: a pintura em tela cheia, sem cabeçalho nem rodapé de site, e as
    // lembranças numa caixa igual à da conversa, com a voz de A CONSCIÊNCIA. Na escolha do clã e na
    // ficha final, a caixa se abre para a tela quase inteira.
    document.body.dataset.tela = 'cena';
    const larga = fim || c.tipo === 'cla';
    raiz.innerHTML = `
      <div class="tela-jogo tela-criacao">
        <section class="dialogo-cena dialogo-criacao ${larga ? 'dialogo-largo' : 'dialogo-direita'} conversa">
          <header class="dialogo-cabeca">
            <span class="grupo-rotulo rotulo-consciencia voz-alma"><span class="rosto" aria-hidden="true">C</span>${fim ? 'Sua ficha' : `A consciência · lembrança ${Math.min(e.passo + 1, PERGUNTAS)} de ${PERGUNTAS}`}</span>
            <button type="button" class="btn-texto" data-detalhado>Prefiro a ficha detalhada</button>
          </header>
          <div class="progresso" aria-hidden="true"><span style="width:${Math.round((e.passo / PERGUNTAS) * 100)}%"></span></div>
          <div class="dialogo-corpo">
            <div class="dialogo">
              ${fim ? '' : htmlLog(e)}
              <div class="lembranca atual" id="cena-atual">${fim ? htmlFim(ficha, ok, e) : htmlCena(c, e)}</div>
            </div>
          </div>
        </section>
      </div>`;
    const atual = raiz.querySelector('#cena-atual');
    // As escolhas da lembrança atual ficam presas no pé da caixa, como no jogo.
    const escolhasAtuais = atual.querySelector(':scope > .escolhas');
    if (escolhasAtuais) {
      const pe = document.createElement('div');
      pe.className = 'dialogo-escolhas';
      pe.appendChild(escolhasAtuais);
      raiz.querySelector('.dialogo-criacao').appendChild(pe);
    }
    const corpo = raiz.querySelector('.dialogo-corpo');
    if (fim) corpo.scrollTop = 0;
    else if (e.log.length) requestAnimationFrame(() => { corpo.scrollTop = atual.offsetTop - 12; });
    const primeiro = atual.querySelector('[data-campo-conversa]');
    if (primeiro) setTimeout(() => primeiro.focus({ preventScroll: true }), 600);
  }

  function avancar(registro) {
    e.log.push(registro);
    e.passo += 1;
    guardar(e);
    som.toque();
    desenhar();
  }

  async function salvar(status) {
    const ficha = montarFicha(e);
    if (status === 'detalhado') ficha._modo = 'detalhado';
    if (p) p = await banco.salvarFicha(p.id, ficha, status === 'revisao' ? 'revisao' : 'criacao');
    else {
      p = await banco.criarPersonagem(ficha);
      if (status === 'revisao') p = await banco.salvarFicha(p.id, ficha, 'revisao');
    }
    await recarregarPersonagens(p.id);
  }

  on(raiz, 'click', '[data-opcao]', (_ev, el) => {
    const c = CENAS[e.passo];
    const i = Number(el.dataset.opcao);
    const op = c.opcoes[i];
    e.respostas[c.id] = i;
    avancar({ texto: trocar(c.texto, e), escolha: trocar(op.texto, e), reacao: trocar(op.reacao || '', e) });
  });

  const confirmar = () => {
    const c = CENAS[e.passo];
    if (c.tipo !== 'campos') return;
    for (const f of c.campos) {
      const el = raiz.querySelector(`[data-campo-conversa="${f.id}"]`);
      // Nomes e respostas curtas sem o ponto final ("Ana." vira "Ana"); textos longos ficam como estão.
      const valor = f.longo ? el.value.trim() : semPontoFinal(el.value);
      if (f.obrigatorio && !valor) { aviso('Escreva antes de continuar.'); el.focus(); return; }
      e.campos[f.id] = valor;
    }
    const mostrado = c.campos.map((f) => e.campos[f.id]).filter(Boolean).join(' · ');
    avancar({ texto: trocar(c.texto, e), escolha: mostrado || '(em branco)', reacao: '' });
  };
  on(raiz, 'click', '[data-confirmar]', confirmar);
  on(raiz, 'keydown', 'input[data-campo-conversa]', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); confirmar(); } });

  on(raiz, 'click', '[data-escolher-cla]', (_ev, el) => {
    const c = CENAS[e.passo];
    const id = el.dataset.escolherCla;
    e.cla = id;
    avancar({ texto: trocar(c.texto, e), escolha: v5.cla(id).nome, reacao: `[O SANGUE] ${FALAS_CLA[id] || ''}` });
  });

  // Teclado: números escolhem a opção, como nos diálogos.
  const teclas = (ev) => {
    if (!raiz.isConnected) { document.removeEventListener('keydown', teclas); return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    const n = Number(ev.key);
    if (n >= 1 && n <= 9) raiz.querySelector(`[data-opcao="${n - 1}"]`)?.click();
  };
  document.addEventListener('keydown', teclas);

  on(raiz, 'click', '[data-recomecar]', async () => {
    const r = await perguntar(raiz.querySelector('.tela-criacao') || raiz, {
      rotulo: 'Recomeçar',
      texto: '<p>Recomeçar a conversa do zero? As respostas de agora se perdem.</p>',
      opcoes: ['Recomeçar do zero', 'Continuar com esta ficha'],
    });
    if (r !== 0) return;
    e = novoEstado();
    guardar(e);
    desenhar();
  });

  // A conversa fica guardada no aparelho; dá para voltar a ela depois.
  on(raiz, 'click', '[data-detalhado]', async () => {
    if (ocupado) return;
    ocupado = true;
    try {
      if (p) {
        await banco.salvarFicha(p.id, { ...p.ficha, _modo: 'detalhado' });
        await recarregarPersonagens(p.id);
        ir('noite');
      } else {
        ir('detalhado');
      }
    } catch (err) {
      aviso(err.message, 'erro');
    } finally {
      ocupado = false;
    }
  });

  on(raiz, 'click', '[data-ajustar]', async () => {
    if (ocupado) return;
    ocupado = true;
    try {
      await salvar('detalhado');
      ir('noite');
    } catch (err) { aviso(err.message, 'erro'); } finally { ocupado = false; }
  });

  on(raiz, 'click', '[data-enviar-conversa]', async (_ev, el) => {
    if (ocupado) return;
    const r = await perguntar(raiz.querySelector('.tela-criacao') || raiz, {
      rotulo: 'Enviar a ficha',
      texto: `<p>O Narrador vai ler sua ficha e escrever o seu prelúdio. Ele volta ${quandoONarradorVolta()}. Até ele começar, você ainda pode voltar e ajustar.</p>`,
      opcoes: ['Enviar ao Narrador', 'Revisar mais um pouco'],
    });
    if (r !== 0 || ocupado) return;
    ocupado = true;
    el.disabled = true;
    try {
      await salvar('revisao');
      apagar();
      aviso('Ficha enviada para o Narrador.');
      ir('noite');
    } catch (err) {
      aviso(err.message, 'erro');
      el.disabled = false;
    } finally { ocupado = false; }
  });

  desenhar();
}
