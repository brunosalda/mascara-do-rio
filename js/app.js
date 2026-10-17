// Ponto de entrada: sessão, personagem atual, navegação entre telas.
import * as banco from './banco.js';
import { esc, aviso, on } from './ui.js';
import { telaCriacao } from './criacao.js';
import { telaEntrevista } from './entrevista.js';
import { telaNoite, telaMapa, telaEspera } from './noite.js';
import { molduraTela } from './moldura-tela.js';
import { abrirSenhaDireto } from './senha.js';
import { imagemDoLocal, CENARIO_ABERTURA } from './cidade.js';
import { fecharTudo } from './jogo/camadas.js';
import { iniciarAmbiente, definirClima, definirTempo, definirSomDoLugar, som, efeitos } from './ambiente.js';
import { aplicarLeitura } from './leitura.js';

const CHAVE_PERSONAGEM = 'mascara.personagem';

export const estado = {
  sessao: null,
  personagens: [],
  atual: null,
};

function lerPreferido() {
  try { return localStorage.getItem(CHAVE_PERSONAGEM); } catch { return null; }
}

export function definirAtual(id) {
  estado.atual = estado.personagens.find((p) => p.id === id) || estado.personagens[0] || null;
  try { if (estado.atual) localStorage.setItem(CHAVE_PERSONAGEM, estado.atual.id); } catch { /* sem armazenamento */ }
}

export async function recarregarPersonagens(idPreferido) {
  estado.personagens = await banco.meusPersonagens();
  definirAtual(idPreferido || estado.atual?.id || lerPreferido());
}

export function ir(rota) {
  if (location.hash === `#/${rota}`) desenhar();
  else location.hash = `#/${rota}`;
}

// --- Cabeçalho -------------------------------------------------------------

function desenharCabecalho(rota) {
  const nav = document.getElementById('nav');
  if (!estado.sessao) { nav.innerHTML = ''; return; }
  const p = estado.atual;
  const ativo = p?.status === 'ativo';
  const link = (r, rotulo) => `<a href="#/${r}" class="${rota === r ? 'atual' : ''}">${rotulo}</a>`;
  const opcoes = estado.personagens
    .map((x) => `<option value="${x.id}" ${x.id === p?.id ? 'selected' : ''}>${esc(x.nome || 'Sem nome')}</option>`)
    .join('');
  nav.innerHTML = `
    ${ativo ? `<div class="nav-links">${link('noite', 'Noite')}${link('ficha', 'Ficha')}${link('diario', 'Diário')}</div>` : ''}
    <div class="nav-conta">
      ${estado.personagens.length > 1 ? `<select id="trocar-personagem" aria-label="Personagem">${opcoes}</select>` : ''}
      ${ativo ? '<a href="#/novo" class="btn-texto" title="Criar outro personagem">Novo personagem</a>' : ''}
      <button class="btn-texto" id="sair">Sair</button>
    </div>`;
  nav.querySelector('#sair').onclick = async () => { await banco.sair(); };
  const sel = nav.querySelector('#trocar-personagem');
  if (sel) sel.onchange = () => { definirAtual(sel.value); ir('noite'); };
}

// --- Login -----------------------------------------------------------------

// demo: só nas rotas de demonstração (?depurar): nada vai ao banco; cada clique mostra uma das mensagens.
export function telaLogin(raiz, { demo = false } = {}) {
  // Tela de título: a Lapa em tela cheia, o nome do jogo grande e a entrada numa caixa igual à da
  // conversa do jogo. Sem cabeçalho nem rodapé de site; o aviso legal fica dentro da caixa.
  document.body.dataset.tela = 'cena';
  raiz.innerHTML = `
    <div class="tela-jogo tela-entrada">
      ${molduraTela()}
      <div class="titulo-entrada">
        <p class="sobretitulo">Rio de Janeiro, depois da meia-noite</p>
        <h1 class="titulo-grande">A Máscara do Rio</h1>
        <p class="lead">Uma crônica de Vampiro: A Máscara para poucos convidados.</p>
      </div>
      <section class="dialogo-cena dialogo-direita caixa-entrada login">
        <header class="dialogo-cabeca"><span class="grupo-rotulo">Entrar na crônica</span></header>
        <div class="dialogo-corpo">
          <p class="nota">Entre com o e-mail que recebeu o convite.</p>
          <form id="form-login" novalidate>
            <label data-campo-login="email">E-mail<input type="email" name="email" autocomplete="email" required></label>
            <label data-campo-login="senha">Senha<input type="password" name="senha" autocomplete="current-password"></label>
            <button class="btn" type="submit">Entrar</button>
            <button class="btn-texto" type="button" id="link-email">Prefiro receber um link de acesso por e-mail</button>
            <button class="btn-secundario primeira-senha" type="button" id="primeira-senha">Primeira vez? Crie a sua senha</button>
            <button class="btn-texto" type="button" id="esqueci">Esqueci a senha</button>
            <p class="msg-login" id="msg-login" role="status" hidden></p>
          </form>
          <form id="form-pedir-link" novalidate hidden>
            <p class="passo-titulo"><b>1</b> Peça o link</p>
            <p class="nota" data-explica></p>
            <label data-campo-link="email">E-mail<input type="email" name="email" autocomplete="email" required></label>
            <button class="btn" type="submit">Mandar o link</button>
            <p class="msg-login" role="status" hidden></p>
            <p class="passo-titulo"><b>2</b> Toque no link do e-mail</p>
            <p class="nota">Abra o e-mail <b>neste mesmo aparelho</b> e toque no link: ele volta para cá e a tela de criar a senha abre sozinha. O e-mail traz só o link, sem código.</p>
            <p class="nota">Se o link abrir uma página que não carrega, ou em outro navegador, copie o link (toque e segure, <b>Copiar</b>) e cole aqui:</p>
            <label data-campo-colar>Cole aqui o link do e-mail<textarea name="colado" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea></label>
            <button class="btn" type="button" data-colar>Entrar com o link</button>
            <p class="msg-login msg-colar" role="status" hidden></p>
            <p class="passo-titulo"><b>3</b> Crie a sua senha</p>
            <p class="nota">Assim que o link entrar, a tela de criar a senha abre aqui mesmo.</p>
            <button class="btn-texto" type="button" data-voltar-login>Voltar para entrar com senha</button>
          </form>
          <!-- PROVISÓRIO (vitrine, 17/10/2026): o Bruno olha o jogo enquanto o limite de e-mails do Supabase
               estoura. Tirar quando o login por e-mail estiver estável (procurar "PROVISÓRIO (vitrine" no código). -->
          <a class="btn-secundario ver-demo" href="#/demo/cena?vitrine&lugar=lapa-alto">Ver o jogo (demonstração)</a>
          <p class="aviso-legal">Conteúdo de fã não oficial, sem fins comerciais. Vampire: The Masquerade e World of Darkness são marcas registradas da Paradox Interactive AB.</p>
        </div>
      </section>
    </div>`;
  const form = raiz.querySelector('#form-login');
  const msg = raiz.querySelector('#msg-login');
  const botaoLink = raiz.querySelector('#link-email');
  const botaoEntrar = form.querySelector('[type=submit]');
  const campo = (nome) => raiz.querySelector(`[data-campo-login="${nome}"]`);
  const rotulo = raiz.querySelector('.caixa-entrada .grupo-rotulo');
  const notaTopo = raiz.querySelector('.caixa-entrada .dialogo-corpo > .nota');
  // Mensagem junto do campo a que se refere: erro em tom de sangue, com ícone e anunciado (alert);
  // sucesso em tom de ok; o resto (entrando, enviando) discreto. Cada uma diz o próximo passo.
  const ICONES = {
    erro: '<svg class="msg-icone" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6"/><path d="M8 4.4v4.4M8 11v.6"/></svg>',
    ok: '<svg class="msg-icone" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6"/><path d="M5 8.2l2 2 4-4.4"/></svg>',
  };
  function mensagem(tipo, perto, html, caixa = msg) {
    caixa.hidden = false;
    caixa.className = `msg-login msg-${tipo}`;
    caixa.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    caixa.innerHTML = `${ICONES[tipo] || ''}<span>${html}</span>`;
    perto.after(caixa);
  }
  // Rodada 41: o botão mostra que está trabalhando e não aceita dois toques.
  function ocupado(botao, texto) {
    const antes = botao.textContent;
    botao.disabled = true;
    botao.setAttribute('aria-busy', 'true');
    botao.textContent = texto;
    return () => { botao.disabled = false; botao.removeAttribute('aria-busy'); botao.textContent = antes; };
  }
  const CONVIDADO = 'Esse e-mail não está na lista de convidados. Fale com o Bruno.';
  const MENSAGENS = {
    convidado: (perto = campo('email'), caixa = msg) => mensagem('erro', perto, CONVIDADO, caixa),
    senha: () => mensagem('erro', campo('senha'), 'E-mail ou senha não conferem. Ainda sem senha? <button type="button" class="btn-link-destaque" data-primeira>Entre pelo link e crie a sua senha</button>.'),
    link: () => mensagem('ok', botaoLink, 'Link enviado. Abra o e-mail neste mesmo aparelho; o link vale por pouco tempo. Depois de entrar, crie a sua senha em Opções.'),
  };
  // Erros que vêm do banco: o texto decide o campo e o próximo passo.
  const mostrarErro = (err) => {
    const t = String(err?.message || '');
    if (/convidados/i.test(t)) MENSAGENS.convidado();
    else if (/incorretos/i.test(t)) MENSAGENS.senha();
    else mensagem('erro', botaoLink, esc(t || 'Não deu para entrar agora. Tente de novo em instantes.'));
  };

  // "Primeira vez?" e "Esqueci a senha": a mesma caixa pede o e-mail e manda o link; quem entra por ele
  // cai direto na tela de criar a senha.
  const formLink = raiz.querySelector('#form-pedir-link');
  const msgLink = formLink.querySelector('.msg-login');
  const campoLink = formLink.querySelector('[data-campo-link="email"]');
  function abrirPedido(modo) {
    form.hidden = true;
    formLink.hidden = false;
    msgLink.hidden = true;
    rotulo.textContent = modo === 'esqueci' ? 'Esqueci a senha' : 'Criar a minha senha';
    notaTopo.hidden = true;
    formLink.querySelector('[data-explica]').textContent = modo === 'esqueci'
      ? 'Digite o seu e-mail. Mandamos um link para você entrar e criar uma senha nova.'
      : 'Digite o e-mail que recebeu o convite. Mandamos um link para você entrar e criar a sua senha.';
    formLink.email.value = form.email.value;
    formLink.email.focus();
  }
  function voltarLogin() {
    formLink.hidden = true;
    form.hidden = false;
    rotulo.textContent = 'Entrar na crônica';
    notaTopo.hidden = false;
  }
  raiz.querySelector('#primeira-senha').onclick = () => abrirPedido('primeira');
  raiz.querySelector('#esqueci').onclick = () => abrirPedido('esqueci');
  formLink.querySelector('[data-voltar-login]').onclick = voltarLogin;
  form.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-pedir-link]')) botaoLink.click();
    if (ev.target.closest('[data-primeira]')) abrirPedido('primeira');
  });
  const emailVazio = (f, perto, caixa) => {
    if (f.email.checkValidity() && f.email.value) return false;
    mensagem('erro', perto, f.email.value ? 'Esse e-mail parece incompleto. Confira se tem @ e o final (.com, .br).' : 'Digite o seu e-mail primeiro.', caixa);
    return true;
  };

  // Passo 2: colar o link do e-mail (ou o endereço que abriu errado) e entrar sem o redirecionamento.
  const botaoColar = formLink.querySelector('[data-colar]');
  const msgColar = formLink.querySelector('.msg-colar');
  const campoColar = formLink.querySelector('[data-campo-colar]');

  if (demo) {
    botaoColar.onclick = () => {
      if (!formLink.colado.value.trim()) { mensagem('erro', campoColar, 'Cole o link do e-mail no campo.', msgColar); return; }
      formLink.colado.value = '';
      mensagem('ok', botaoColar, 'Demonstração: no jogo, o link entra e a tela de criar a senha abre aqui mesmo.', msgColar);
      setTimeout(() => import('./senha.js').then((m) => m.abrirSenhaDireto({ demo: true })), 900);
    };
    const ordem = ['convidado', 'senha', 'link'];
    let i = 0;
    const proxima = (e) => { e?.preventDefault(); MENSAGENS[ordem[i++ % ordem.length]](); };
    form.email.value = 'convidado@exemplo.com';
    form.onsubmit = proxima;
    botaoLink.onclick = proxima;
    formLink.onsubmit = (e) => {
      e.preventDefault();
      if (emailVazio(formLink, campoLink, msgLink)) return;
      mensagem('ok', formLink.querySelector('[type=submit]'), 'Demonstração: no jogo, chega um link; ao entrar por ele, a tela de criar a senha abre sozinha.', msgLink);
    };
    return { abrirPedido };
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (botaoEntrar.disabled) return;
    if (emailVazio(form, campo('email'), msg)) return;
    if (!form.senha.value) { mensagem('erro', campo('senha'), 'Digite a senha. Ainda sem senha? <button type="button" class="btn-link-destaque" data-primeira>Crie a sua senha pelo link</button>.'); return; }
    const soltar = ocupado(botaoEntrar, 'Entrando…');
    msg.hidden = true;
    try { await banco.entrarComSenha(form.email.value, form.senha.value); } catch (err) { mostrarErro(err); } finally { soltar(); }
  };
  formLink.onsubmit = async (e) => {
    e.preventDefault();
    const botao = formLink.querySelector('[type=submit]');
    if (botao.disabled) return;
    if (emailVazio(formLink, campoLink, msgLink)) return;
    const soltar = ocupado(botao, 'Enviando…');
    try {
      try { localStorage.setItem('mascara.criarSenha', '1'); } catch { /* sem armazenamento */ }
      await banco.entrarComLink(formLink.email.value, { criarSenha: true });
      mensagem('ok', botao, 'Link enviado. Abra o e-mail neste mesmo aparelho: ao entrar, a tela de criar a senha abre sozinha.', msgLink);
    } catch (err) {
      if (/convidados/i.test(err.message)) MENSAGENS.convidado(campoLink, msgLink);
      else mensagem('erro', botao, esc(err.message || 'Não deu para mandar o link agora. Tente de novo em instantes.'), msgLink);
      if (/limite/i.test(err.message)) formLink.colado.focus();
    } finally { soltar(); }
  };
  botaoColar.onclick = async () => {
    if (botaoColar.disabled) return;
    if (!formLink.colado.value.trim()) { mensagem('erro', campoColar, 'Cole o link do e-mail no campo.', msgColar); return; }
    const soltar = ocupado(botaoColar, 'Entrando…');
    msgColar.hidden = true;
    try {
      // Com a sessão aberta, a tela troca sozinha; esta marca faz a tela de criar a senha abrir logo em cima.
      try { localStorage.setItem('mascara.criarSenha', '1'); } catch { /* sem armazenamento */ }
      await banco.entrarComLinkColado(formLink.colado.value, formLink.email.value);
      formLink.colado.value = '';
    } catch (err) {
      try { localStorage.removeItem('mascara.criarSenha'); } catch { /* sem armazenamento */ }
      formLink.colado.value = '';
      mensagem('erro', campoColar, esc(err.message), msgColar);
    } finally { soltar(); }
  };
  botaoLink.onclick = async () => {
    if (botaoLink.disabled) return;
    if (emailVazio(form, campo('email'), msg)) return;
    const soltar = ocupado(botaoLink, 'Enviando o link…');
    try {
      await banco.entrarComLink(form.email.value);
      MENSAGENS.link();
    } catch (err) { mostrarErro(err); } finally { soltar(); }
  };
  return { abrirPedido };
}

// --- Cenário de fundo (a pintura da cidade atrás do texto) -------------------------

function definirCenario(tipoTela, p) {
  document.body.dataset.tela = tipoTela;
  const url = tipoTela === 'jogo' ? imagemDoLocal(p?.estado?.local) : CENARIO_ABERTURA;
  const el = document.getElementById('cenario');
  if (el && el.dataset.url !== url) {
    el.dataset.url = url;
    el.style.backgroundImage = `url('${url}')`;
  }
  // A Fome do personagem avermelha a tela e acelera o batimento.
  const fome = tipoTela === 'jogo' ? (p?.estado?.fome ?? null) : null;
  document.body.dataset.fome = fome ?? '';
  definirClima({ tela: tipoTela, fome });
  // Tempo e som do lugar só valem na cena; ela mesma os define de novo ao montar.
  definirTempo(null);
  definirSomDoLugar(null);
}

function modoDeCriacao(p) {
  return p?.ficha?._modo || (p?.ficha?._etapa != null ? 'detalhado' : 'conversa');
}

// --- Roteamento ------------------------------------------------------------

async function desenhar() {
  const main = document.getElementById('app');
  const tela = document.createElement('div');
  tela.className = 'tela';
  main.replaceChildren(tela);
  // A consulta (?editar) não faz parte da rota: #/lugar/lapa?editar abre a Lapa no modo de edição.
  const rota = location.hash.replace(/^#\/?/, '').split('?')[0];
  desenharCabecalho(rota);

  fecharTudo();
  // Rodada 42: nenhuma caixa fica por cima ao trocar de tela (a de criar a senha vive fora das camadas).
  document.querySelectorAll('.janela-senha-direta, .faixa-feito, .cartao-passagem').forEach((el) => el.remove());
  const p = estado.atual;
  const novo = rota === 'novo' || rota === 'detalhado';
  const emCriacao = !estado.sessao || novo || !p || p.status === 'criacao';
  // 'cena': telas de jogo em tela cheia (sem cabeçalho nem rodapé do site).
  definirCenario(!estado.sessao ? 'login' : emCriacao ? 'criacao' : p.status === 'revisao' ? 'cena' : 'jogo', p);
  if (estado.sessao && !emCriacao) document.body.dataset.tela = 'cena';

  // Rotas de demonstração (?depurar): dados fictícios, sem banco e sem mexer na sessão.
  const depurar = /[?&]depurar\b/.test(location.search) || /[?&]depurar\b/.test(location.hash);
  // PROVISÓRIO (vitrine): ?vitrine abre a demonstração sem o medidor do ?depurar (botão da entrada).
  const vitrine = /[?&]vitrine\b/.test(location.hash);
  if (rota.startsWith('demo/') && (depurar || vitrine)) {
    // &raf=timer: relógio de teste (requestAnimationFrame trocado por um temporizador), para o painel
    // escondido do navegador não congelar as animações. Vale para a cena montada a seguir.
    if (/[?&]raf=timer\b/.test(location.hash) && !window.__rafDeTeste) {
      window.__rafDeTeste = true;
      window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
    }
    const { telaDemo } = await import('./demo.js');
    return telaDemo(tela, rota.slice(5));
  }

  if (!estado.sessao) return telaLogin(tela);

  try {
    // Criação: por conversa (padrão) ou pela ficha detalhada.
    if (rota === 'detalhado') return await telaCriacao(tela, null);
    if (rota === 'novo' || !p) return await telaEntrevista(tela, null);
    if (p.status === 'criacao' && modoDeCriacao(p) === 'conversa') return await telaEntrevista(tela, p);
    if (p.status === 'criacao') return await telaCriacao(tela, p);
    if (p.status === 'revisao') {
      return await telaEspera(tela, p, {
        aoEditar: async () => {
          await banco.salvarFicha(p.id, p.ficha, 'criacao');
          await recarregarPersonagens(p.id);
          desenhar();
        },
      });
    }
    // Jogo: cena do lugar, mapa, bairro visitado; ficha e diário abrem como janelas sobre a cena.
    if (rota === 'mapa') return await telaMapa(tela, p);
    if (rota.startsWith('lugar/')) return await telaNoite(tela, p, { lugar: rota.slice(6) });
    if (rota === 'ficha' || rota === 'diario') return await telaNoite(tela, p, { abrir: rota });
    return await telaNoite(tela, p);
  } catch (err) {
    console.error(err);
    tela.innerHTML = `<div class="cartao erro"><p>${esc(err.message || 'Algo deu errado.')}</p><button class="btn" onclick="location.reload()">Tentar de novo</button></div>`;
  }
}

async function aoMudarSessao(sessao) {
  const antes = estado.sessao?.user?.id;
  estado.sessao = sessao;
  if (sessao && sessao.user.id !== antes) {
    try { await recarregarPersonagens(); } catch (err) { aviso(err.message, 'erro'); }
  }
  if (!sessao) { estado.personagens = []; estado.atual = null; }
  await desenhar();
  // Entrou pelo link de "Primeira vez? Crie a sua senha": a tela de criar a senha abre direto.
  let pediuSenha = /[?&]criar-senha=1/.test(location.search);
  try { pediuSenha ||= localStorage.getItem('mascara.criarSenha') === '1'; } catch { /* sem armazenamento */ }
  if (sessao && pediuSenha) abrirSenhaDireto();
}

// Celular (ordem de 17/10): toque com tela pequena, tela estreita ou baixa (deitado) liga o leiaute de
// celular (body.celular), em pé e deitado (body.deitado). Atualiza ao girar ou redimensionar.
function marcarCelular() {
  const w = window.innerWidth; const h = window.innerHeight;
  const toque = window.matchMedia?.('(pointer: coarse)').matches;
  const celular = (toque && Math.min(w, h) <= 600) || w <= 760 || h <= 500;
  document.body.classList.toggle('celular', celular);
  document.body.classList.toggle('deitado', celular && w > h);
}

async function iniciar() {
  marcarCelular();
  window.addEventListener('resize', marcarCelular);
  window.addEventListener('orientationchange', () => setTimeout(marcarCelular, 200));
  iniciarAmbiente();
  aplicarLeitura();
  const botaoSom = document.getElementById('som');
  const atualizarBotaoSom = () => {
    botaoSom.setAttribute('aria-pressed', String(som.ligado()));
    botaoSom.title = som.ligado() ? 'Desligar o som' : 'Ligar o som ambiente';
  };
  botaoSom.onclick = () => { som.alternar(); atualizarBotaoSom(); };
  atualizarBotaoSom();
  const botaoEfeitos = document.getElementById('efeitos');
  const atualizarBotaoEfeitos = () => {
    botaoEfeitos.setAttribute('aria-pressed', String(efeitos.ligados()));
    botaoEfeitos.title = efeitos.ligados() ? 'Desligar chuva e efeitos' : 'Ligar chuva e efeitos';
  };
  botaoEfeitos.onclick = () => { efeitos.alternar(); atualizarBotaoEfeitos(); };
  atualizarBotaoEfeitos();
  window.addEventListener('hashchange', desenhar);
  banco.aoMudarSessao((s) => { if ((s?.user?.id || null) !== (estado.sessao?.user?.id || null)) aoMudarSessao(s); });
  await aoMudarSessao(await banco.sessaoAtual());
}

on(document, 'click', '[data-ir]', (e, el) => { e.preventDefault(); ir(el.dataset.ir); });

// Aviso de versão nova: de tempos em tempos (e ao voltar para a aba), lê a versão do index.html publicado;
// se mudou, oferece atualizar. O endereço novo (?v=) escapa também do cache do próprio index.html.
const minhaVersao = document.querySelector('meta[name="versao"]')?.content || '';
async function checarVersao() {
  if (!minhaVersao || document.querySelector('.aviso-versao') || /[?&]depurar\b/.test(location.hash)) return;
  try {
    const resp = await fetch(`${location.pathname}?checar=${Date.now()}`, { cache: 'no-store' });
    const nova = (await resp.text()).match(/<meta name="versao" content="(\d+)"/)?.[1];
    if (!nova || nova === minhaVersao) return;
    const aviso = document.createElement('button');
    aviso.type = 'button';
    aviso.className = 'aviso-versao';
    aviso.textContent = 'Há uma versão nova. Toque para atualizar.';
    aviso.onclick = () => { location.href = `${location.pathname}?v=${nova}${location.hash}`; };
    document.body.appendChild(aviso);
  } catch { /* sem rede: tenta de novo depois */ }
}
setTimeout(checarVersao, 20000);
setInterval(checarVersao, 5 * 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checarVersao(); });

iniciar();
