// Ponto de entrada: sessão, personagem atual, navegação entre telas.
import * as banco from './banco.js';
import { esc, aviso, on } from './ui.js';
import { telaCriacao } from './criacao.js';
import { telaEntrevista } from './entrevista.js';
import { telaNoite } from './noite.js';
import { telaFicha } from './ficha.js';
import { telaDiario } from './diario.js';
import { imagemDoLocal, CENARIO_ABERTURA } from './cidade.js';
import { iniciarAmbiente, definirClima, som, efeitos } from './ambiente.js';

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

function telaLogin(raiz) {
  raiz.innerHTML = `
    <section class="login">
      <p class="sobretitulo">Rio de Janeiro, depois da meia-noite</p>
      <h1 class="titulo-grande">A Máscara do Rio</h1>
      <p class="lead">Uma crônica de Vampiro: A Máscara para poucos convidados. Entre com o e-mail que recebeu o convite.</p>
      <form id="form-login" class="cartao">
        <label>E-mail<input type="email" name="email" autocomplete="email" required></label>
        <label>Senha<input type="password" name="senha" autocomplete="current-password"></label>
        <button class="btn" type="submit">Entrar</button>
        <button class="btn-texto" type="button" id="link-email">Prefiro receber um link de acesso por e-mail</button>
        <p class="nota" id="msg-login" role="status"></p>
      </form>
    </section>`;
  const form = raiz.querySelector('#form-login');
  const msg = raiz.querySelector('#msg-login');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const senha = form.senha.value;
    if (!senha) { msg.textContent = 'Digite a senha, ou peça um link por e-mail.'; return; }
    msg.textContent = 'Entrando…';
    try { await banco.entrarComSenha(email, senha); msg.textContent = ''; } catch (err) { msg.textContent = err.message; }
  };
  raiz.querySelector('#link-email').onclick = async () => {
    const email = form.email.value;
    if (!form.email.checkValidity() || !email) { msg.textContent = 'Digite seu e-mail primeiro.'; return; }
    msg.textContent = 'Enviando…';
    try {
      await banco.entrarComLink(email);
      msg.textContent = 'Pronto. Abra o link que chegou no seu e-mail neste mesmo aparelho.';
    } catch (err) { msg.textContent = err.message; }
  };
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
  const rota = location.hash.replace(/^#\/?/, '');
  desenharCabecalho(rota);

  const p = estado.atual;
  const novo = rota === 'novo' || rota === 'detalhado';
  const emCriacao = !estado.sessao || novo || !p || p.status === 'criacao' || p.status === 'revisao';
  definirCenario(!estado.sessao ? 'login' : emCriacao ? 'criacao' : 'jogo', p);

  if (!estado.sessao) return telaLogin(tela);

  try {
    // Criação: por conversa (padrão) ou pela ficha detalhada.
    if (rota === 'detalhado') return await telaCriacao(tela, null);
    if (rota === 'novo' || !p) return await telaEntrevista(tela, null);
    if (p.status === 'criacao' && modoDeCriacao(p) === 'conversa') return await telaEntrevista(tela, p);
    if (p.status === 'criacao' || p.status === 'revisao') return await telaCriacao(tela, p);
    if (rota === 'ficha') return await telaFicha(tela, p);
    if (rota === 'diario') return await telaDiario(tela, p);
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
  desenhar();
}

async function iniciar() {
  iniciarAmbiente();
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

iniciar();
