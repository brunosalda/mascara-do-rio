// Tela do caso (formato v3, etapa A): um capítulo jogado na hora, sem esperar o Narrador.
// Abertura em HQ → investigação nos lugares pintados (examinar, conversar, usar o sangue) →
// perseguição → dedução no quadro de pistas → escolha final e placar.
// Demonstração: nada vai ao banco. O progresso fica só neste aparelho (localStorage) e pode ser recomeçado.
import * as v5 from '../motor/v5.js';
import { CENAS, clasSugeridos, montarFicha } from '../motor/roteiro.js';
import * as R from './regras.js';
import { CASO } from './demo-beco.js';
import { abrirQuadro, palavrasLiberadas } from './quadro.js';
import { iniciarPerseguicao } from './perseguicao.js';
import { montarCena } from '../jogo/cena.js';
import { geografia } from '../jogo/lugares.js';
import { abrirDialogo, abrirJanela, perguntar, confirmarEscolha, camadaAberta, fecharTudo } from '../jogo/camadas.js';
import { narracao, quadrinhos, esc, aviso, grupoVoz } from '../ui.js';
import { definirTempo, definirSomDoLugar, definirClima, som, efeitos } from '../ambiente.js';
import { retratoDe } from '../cidade.js';
import { resumoFicha } from '../ficha.js';
import { FIGURAS_GENTE } from '../jogo/gente.js';
import { figuraLeve } from '../jogo/imagens.js';

// A caminhada tirada de vídeo do personagem do Bruno: serve de reserva para quem ainda não tem a sua.
const CAMINHADA_RESERVA = {
  url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-perfil.png', quadros: 10, largura: 154, altura: 300, parado: 5,
  frente: { url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-frente.png', quadros: 10, largura: 112, altura: 300, parado: 4 },
  costas: { url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-costas.png', quadros: 10, largura: 110, altura: 300, parado: 1 },
  respira: { url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-respira.png', quadros: 8, largura: 78, altura: 300 },
};

// Quem joga: o personagem ativo de quem entrou; sem ele, uma vampira fictícia montada pelo roteiro
// da criação por conversa (como nas outras demonstrações).
function personagemDoCaso(estadoApp) {
  const atual = estadoApp?.atual;
  if (atual?.status === 'ativo' && atual.ficha?.cla) return { ...atual, sprite: atual.sprite?.url ? atual.sprite : CAMINHADA_RESERVA };
  const e = { passo: 0, respostas: {}, campos: { nomeEmVida: 'Marina Costa', apelido: 'Nina', touchstone: 'Pedro', aparencia: 'Cabelo raspado, jaqueta de couro.' }, cla: null, log: [] };
  for (const c of CENAS) {
    if (c.tipo === 'opcoes') e.respostas[c.id] = 1 % c.opcoes.length;
    if (c.tipo === 'cla') e.cla = clasSugeridos(e)[0];
  }
  const ficha = montarFicha(e);
  return { id: 'demo-caso', nome: ficha.nome, status: 'ativo', ficha, estado: { fome: 2 }, retrato: null, sprite: CAMINHADA_RESERVA };
}

const doisDigitos = (n) => String(n).padStart(2, '0');
// Minutos desde a meia-noite da véspera → "22h", "0h30", "2h05".
export const hora = (min) => { const h = Math.floor(min / 60) % 24; const m = min % 60; return `${h}h${m ? doisDigitos(m) : ''}`; };
const duracao = (min) => { const h = Math.floor(min / 60); const m = min % 60; return h ? `${h}h${m ? doisDigitos(m) : ''}` : `${m} min`; };

const CANTO = '<svg viewBox="0 0 64 64" aria-hidden="true"><path class="placa" d="M4 36 L28 60 L4 84 L-20 60 Z"/><path class="placa-dentro" d="M4 47 L17 60 L4 73 L-9 60 Z"/><path class="galho" d="M4 60 C10 40 18 26 34 18 S56 8 60 4"/><path class="galho" d="M4 60 C22 54 36 46 46 30"/><path class="galho fino" d="M18 34 C24 30 28 24 26 16"/><path class="galho fino" d="M34 46 C40 44 46 40 50 34"/><path class="espinho" d="M30 21 l-5 -7 l8 4 z"/><path class="espinho" d="M42 34 l7 -2 l-4 6 z"/><circle class="no" cx="4" cy="60" r="3.2"/></svg>';

// Etapa B: um capítulo da temporada, jogado pelo banco. Monta, a partir da parte pública do capítulo
// (caso_abrir), um objeto com a forma do CASO da demonstração, mas sem nada do segredo: as pessoas, os
// pontos de exame e as pistas entram à medida que o banco os entrega. As palavras da dedução vêm sem o
// "por"; a palavra liberada pelo banco entra nos achados como a marca 'lib:<lacuna>:<palavra>'.
function casoDoBanco(cap) {
  const pub = cap.publico || {};
  return {
    id: cap.id, titulo: cap.titulo, rotulo: `Capítulo ${cap.ordem}`, pergunta: cap.pergunta,
    relogio: cap.relogio, lugarInicial: pub.lugarInicial, custo: cap.custos || {},
    abertura: pub.abertura, ajuda: pub.ajuda || [],
    lugares: Object.fromEntries(Object.entries(pub.lugares || {}).map(([id, l]) => [id, { ...l, fixos: l.pontos || [], pontos: l.pontos || [], pessoas: [] }])),
    colunas: pub.colunas || [], lacunas: pub.lacunas || [],
    palavras: Object.fromEntries(Object.entries(pub.palavras || {}).map(([l, ws]) => [l, ws.map((w) => ({ ...w, por: [`lib:${l}:${w.id}`] }))])),
    pessoas: Object.fromEntries((pub.colunas || []).filter((c) => c.pessoa).map((c) => [c.pessoa, { nome: c.nome, sub: '', tipo: c.tipo, figura: c.figura }])),
    pistas: {}, exames: {}, cacada: pub.cacada, perseguicao: pub.perseguicao, rivais: [], eventos: [],
  };
}

// opcoes.capitulo: o capítulo da temporada (no banco). Sem ele, a demonstração no navegador, como antes.
export async function telaCaso(raiz, estadoApp, opcoes = {}) {
  const F = opcoes.capitulo ? await import('./fonte-banco.js') : null;
  let banco = null;
  if (F) {
    const atual = estadoApp?.atual;
    if (atual?.status !== 'ativo') {
      raiz.innerHTML = '<div class="cartao"><p>Para jogar a temporada, seu personagem precisa estar aprovado pelo Narrador.</p><a class="btn" href="#/">Voltar</a></div>';
      return;
    }
    try {
      const aberto = await F.abrir(opcoes.capitulo, atual.id);
      banco = { capitulo: aberto.capitulo, estado: aberto.estado, assunto: {}, topicos: {}, fecho: null, final: null, ranking: [], semNumeros: !aberto.ficha_com_numeros };
    } catch (e) {
      raiz.innerHTML = `<div class="cartao erro"><p>${esc(e.message)}</p><a class="btn" href="#/temporada">Voltar à temporada</a></div>`;
      return;
    }
  }
  const caso = banco ? casoDoBanco(banco.capitulo) : CASO;
  const p = banco ? { ...estadoApp.atual, sprite: estadoApp.atual.sprite?.url ? estadoApp.atual.sprite : CAMINHADA_RESERVA } : personagemDoCaso(estadoApp);
  const calc = R.numeros(p.ficha);
  // &perfil=<nome> no endereço guarda o progresso à parte (testes de abas diferentes no mesmo navegador
  // não se atropelam).
  const perfil = (new URLSearchParams(location.hash.split('?')[1] || '').get('perfil') || '').replace(/[^a-z0-9-]/gi, '');
  // No banco, o aparelho só guarda o que é da tela (registro, posições, escolhas no quadro); o resto vem dele.
  const CHAVE = banco ? `mascara.temporada.${caso.id}.${p.id}` : `mascara.caso.${caso.id}.${p.id}${perfil ? `.${perfil}` : ''}`;
  const vontadeMax = p.estado?.vontade?.max || calc.forcaVontade || 3;
  const vitalidadeMax = p.estado?.vitalidade?.max || calc.vitalidade || 5;

  const novo = () => ({
    v: 1, hora: caso.relogio.inicio, noites: 1, lugar: caso.lugarInicial,
    achados: [], novas: [], feitos: {}, tentados: {}, lidos: {}, comentados: [],
    fome: Math.max(1, Math.min(4, p.estado?.fome ?? 2)), vontade: vontadeMax,
    escondidos: [], posPessoas: {}, posicoes: {}, eventos: [], rivais: [], tentativas: [], escolhas: {},
    resolvido: null, final: null, viuAbertura: false, registro: [],
  });
  let st = (() => { try { const s = JSON.parse(localStorage.getItem(CHAVE)); return s?.v === 1 ? s : null; } catch { return null; } })() || novo();
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(st)); } catch { /* sem armazenamento */ } };
  const achados = () => new Set(st.achados);

  let amanheceuPendente = false;
  // Banco: o estado que conta (relógio, Fome, pistas, palavras liberadas, feitos) vem de cada resposta.
  function sincronizar(e) {
    if (!banco || !e) return;
    banco.estado = e;
    Object.assign(st, {
      hora: e.hora, noites: e.noites, lugar: e.lugar, fome: e.fome, vontade: e.vontade,
      feitos: e.feitos || {}, escondidos: e.escondidos || [], eventos: e.eventos || [], final: e.final,
    });
    for (const pi of e.pistas || []) caso.pistas[pi.id] = pi;
    const lib = Object.entries(e.palavras || {}).flatMap(([l, ids]) => ids.map((id) => `lib:${l}:${id}`));
    st.achados = [...(e.pistas || []).map((x) => x.id), ...(e.marcas || []), ...lib];
    st.tentativas = Array.from({ length: e.acusacoes_erradas || 0 }, () => ({}));
    st.resolvido = e.resolvido_em ? { hora: e.hora, noites: e.noites, nota: e.nota, selos: e.selos || [] } : null;
    if (e.amanheceu) amanheceuPendente = true;
    salvar();
  }
  sincronizar(banco?.estado);

  // --- Tela -------------------------------------------------------------------------------------
  document.body.dataset.tela = 'cena';
  let paineisOcultos = false;
  try { paineisOcultos = localStorage.getItem('mascara.paineis') === 'ocultos'; } catch { /* sem armazenamento */ }
  const retrato = retratoDe(p);
  raiz.innerHTML = `
    <div class="tela-jogo bg2 tela-caso${paineisOcultos ? ' paineis-ocultos' : ''}" style="--retrato:url('${esc(new URL(retrato, location.href).href)}')">
      <div class="palco"></div>
      <header class="hud-topo">
        <button type="button" class="hud-personagem" data-hud="ficha" title="Ficha (F)">
          <img src="${esc(retrato)}" alt="">
          <span>
            <b>${esc(p.nome)}</b>
            <small>${esc(v5.cla(p.ficha?.cla)?.nome || '')} · <span data-lugar-nome></span></small>
            <span class="gotas" aria-label="Fome"></span>
          </span>
        </button>
        <div class="hud-noite"><b data-hora></b><small>o sol nasce às ${hora(caso.relogio.fim)}</small></div>
        <nav class="hud-botoes">
          <button type="button" class="hud-com-icone" data-hud="viajar" title="Lugares do caso (M)" aria-label="Lugares do caso"><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg><span class="hud-nome">Lugares <kbd>M</kbd></span></button>
          <button type="button" class="hud-com-icone hud-quadro" data-hud="quadro" title="Quadro de pistas (Q)" aria-label="Quadro de pistas"><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="15" rx="1"/><path d="M7 8h4v4H7zM14 8h3M14 11h3M8 15l4-3 5 3"/></svg><span class="hud-nome">Quadro <kbd>Q</kbd></span><span class="hud-contador" data-contador hidden></span></button>
          <button type="button" class="hud-com-icone" data-hud="ficha" title="Ficha (F)" aria-label="Ficha"><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/><path d="M8 13h8M8 16.5h6"/></svg><span class="hud-nome">Ficha <kbd>F</kbd></span></button>
          <button type="button" data-hud="som" class="hud-icone" aria-pressed="${som.ligado()}" title="Som ambiente" aria-label="Som ambiente"><span class="icone-texto">♪</span><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg><span class="hud-nome">Som</span></button>
          <button type="button" data-hud="ajuda" class="hud-icone" title="Como jogar" aria-label="Como jogar"><span class="icone-texto">?</span><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17v.5"/></svg><span class="hud-nome">Ajuda</span></button>
          <button type="button" data-hud="menu" class="hud-icone" title="Mais opções" aria-label="Mais opções"><span class="icone-texto">⋯</span><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg><span class="hud-nome">Mais</span></button>
        </nav>
      </header>
      <div class="moldura" aria-hidden="true">
        <span class="canto canto-se">${CANTO}</span><span class="canto canto-sd">${CANTO}</span><span class="canto canto-ie">${CANTO}</span><span class="canto canto-id">${CANTO}</span>
        <span class="pedra-chave"><i></i></span>
      </div>
      <div class="relogio-noite" role="img"></div>
      <aside class="painel-retrato">
        <button type="button" class="retrato-grande" data-hud="ficha" title="Ficha (F)"><img src="${esc(retrato)}" alt=""><span class="estado-cor" aria-hidden="true"></span></button>
        <b class="retrato-nome">${esc(p.nome)}</b>
        <div class="barras"></div>
      </aside>
      <section class="painel-baixo" aria-label="Registro do caso">
        <p class="pergunta-caso"><b>A pergunta</b> ${esc(caso.pergunta)}</p>
        <ol class="registro-noite" aria-live="polite"></ol>
        <div class="painel-pergunta"></div>
      </section>
      <button type="button" class="botao-visao" data-hud="visao" title="Visão geral: a cena inteira (V)" aria-label="Visão geral"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4"/><rect x="8" y="9" width="8" height="6" rx="1"/></svg></button>
      <button type="button" class="botao-centrar" data-hud="centrar" title="Centralizar no personagem (C)" aria-label="Centralizar no personagem"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button>
      <button type="button" class="botao-pausa" data-hud="pausa" aria-pressed="false" title="Pausar (espaço)" aria-label="Pausa"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="icone-pausar" d="M8 5v14M16 5v14"/><path class="icone-soltar" d="M8 5l11 7-11 7z"/></svg></button>
      <button type="button" class="mostrar-paineis" data-hud="paineis" title="Mostrar ou esconder os painéis (H)" aria-label="Painéis"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M8 4v16M3 15h18"/></svg></button>
      <aside class="hud-plano quadro-noite quadro-caso" aria-live="polite"></aside>
      <footer class="hud-dicas"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> andar · <kbd>Shift</kbd> correr · <kbd>E</kbd> examinar ou falar · <kbd>Tab</kbd> mostrar tudo · <kbd>Q</kbd> quadro · <kbd>M</kbd> lugares · <kbd>F</kbd> ficha</footer>
      <div class="faixa-demo" role="note">${banco ? `${esc(caso.rotulo)} · ${esc(caso.titulo)}${banco.capitulo.temporada === 'teste' ? ' · temporada de teste' : ''}` : 'Caso de demonstração · inventado, fora da temporada de verdade; nada vai ao banco'}</div>
    </div>`;
  const tela = raiz.querySelector('.tela-jogo');
  const palco = tela.querySelector('.palco');
  const listaRegistro = tela.querySelector('.registro-noite');
  const caixaCaso = tela.querySelector('.hud-plano');
  let cena = null;
  let fuga = null;

  // Celular: o quadro do caso e o registro numa folha que se recolhe embaixo, com alça (como na noite).
  const painelBaixo = tela.querySelector('.painel-baixo');
  const alca = document.createElement('button');
  alca.type = 'button';
  alca.className = 'alca-folha';
  alca.setAttribute('aria-expanded', 'false');
  alca.setAttribute('aria-label', 'Abrir o quadro do caso e o registro');
  alca.innerHTML = '<i aria-hidden="true"></i>';
  alca.addEventListener('click', () => {
    const aberta = painelBaixo.classList.toggle('folha-aberta');
    alca.setAttribute('aria-expanded', String(aberta));
    alca.setAttribute('aria-label', aberta ? 'Recolher o quadro do caso e o registro' : 'Abrir o quadro do caso e o registro');
  });
  painelBaixo.prepend(alca);
  const ajustarFolha = () => {
    if (!tela.isConnected) { window.removeEventListener('resize', ajustarFolha); return; }
    const celular = document.body.classList.contains('celular');
    if (celular && caixaCaso.parentElement !== painelBaixo) alca.after(caixaCaso);
    else if (!celular && caixaCaso.parentElement === painelBaixo) tela.appendChild(caixaCaso);
  };
  ajustarFolha();
  window.addEventListener('resize', ajustarFolha);

  // --- Registro, avisos e HUD --------------------------------------------------------------------
  const classeReg = (voz) => {
    if (voz === 'PISTA NOVA') return 'voce';
    if (voz === 'CORRIDA') return 'cacada';
    const g = grupoVoz(voz);
    return g === 'besta' ? 'fome' : g === 'alma' ? 'humanidade' : g === 'outra' ? 'voce' : 'habilidade';
  };
  const linhaHtml = ({ voz, texto }) => `<li class="reg-${classeReg(voz)}"><b>${esc(voz)}</b> ${esc(texto)}</li>`;
  function anotar(voz, texto) {
    const ultima = st.registro.at(-1);
    if (ultima && ultima.voz === voz && ultima.texto === texto) return;
    st.registro = [...st.registro, { voz, texto }].slice(-80);
    listaRegistro.insertAdjacentHTML('beforeend', linhaHtml({ voz, texto }));
    listaRegistro.scrollTop = listaRegistro.scrollHeight;
    salvar();
  }
  listaRegistro.innerHTML = st.registro.map(linhaHtml).join('');

  function faixa(classe, rotulo, texto) {
    const el = document.createElement('div');
    el.className = `faixa-caso ${classe}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<b>${esc(rotulo)}</b> ${esc(texto)}`;
    tela.querySelectorAll(`.faixa-caso.${classe}`).forEach((x) => x.remove());
    tela.appendChild(el);
    setTimeout(() => el.classList.add('saindo'), 2600);
    setTimeout(() => el.remove(), 3200);
  }

  // Avisos (pista nova, opção nova na dedução, evento, corrida) esperam a caixa terminar de revelar o
  // texto: primeiro a narração conta o achado, depois vem o aviso, um por vez.
  const filaAvisos = [];
  let revelando = false;
  let soltando = false;
  function avisar(classe, rotulo, texto, extra) {
    filaAvisos.push({ classe, rotulo, texto, extra });
    setTimeout(soltarAvisos, 0);
  }
  function soltarAvisos() {
    if (revelando || soltando) return;
    const a = filaAvisos.shift();
    if (!a) return;
    soltando = true;
    faixa(a.classe, a.rotulo, a.texto);
    a.extra?.();
    setTimeout(() => { soltando = false; soltarAvisos(); }, 1100);
  }
  // A pista nova voa do meio da tela até o botão do Quadro, que pulsa ao recebê-la.
  function voarPista() {
    const alvo = [...tela.querySelectorAll('.hud-botoes [data-hud="quadro"]')].find((b) => b.offsetParent);
    if (!alvo || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rt = tela.getBoundingClientRect();
    const ra = alvo.getBoundingClientRect();
    const x0 = rt.width / 2;
    const y0 = rt.height * 0.32;
    const el = document.createElement('span');
    el.className = 'pista-voa';
    el.setAttribute('aria-hidden', 'true');
    el.style.left = `${x0}px`;
    el.style.top = `${y0}px`;
    tela.appendChild(el);
    setTimeout(() => {
      el.style.transform = `translate(${(ra.left - rt.left + ra.width / 2 - x0).toFixed(0)}px, ${(ra.top - rt.top + ra.height / 2 - y0).toFixed(0)}px) scale(0.35) rotate(-14deg)`;
      el.style.opacity = '0.3';
    }, 30);
    setTimeout(() => {
      el.remove();
      alvo.classList.remove('recebeu');
      void alvo.offsetWidth;
      alvo.classList.add('recebeu');
    }, 720);
  }

  function desenharHud() {
    const lugar = caso.lugares[st.lugar];
    tela.querySelector('[data-lugar-nome]').textContent = lugar.nome;
    tela.querySelector('[data-hora]').textContent = hora(st.hora);
    tela.querySelector('.gotas').innerHTML = Array.from({ length: 5 }, (_, i) => `<svg class="gota ${i < st.fome ? 'cheia' : ''}" viewBox="0 0 12 16"><path d="M6 1C8 5 11 7.5 11 10.5A5 5 0 0 1 1 10.5C1 7.5 4 5 6 1z"/></svg>`).join('');
    const barra = (classe, nome, sigla, resta, max) => `<span class="barra ${classe}" title="${nome}: ${resta} de ${max}" style="--v:${max ? (resta / max).toFixed(3) : 0}"><i></i><em>${resta}/${max}</em><small>${sigla}</small></span>`;
    tela.querySelector('.barras').innerHTML = barra('barra-vit', 'Vitalidade', 'V', vitalidadeMax, vitalidadeMax)
      + barra('barra-von', 'Força de Vontade', 'FV', st.vontade, vontadeMax) + barra('barra-fome', 'Fome', 'F', st.fome, 5);
    tela.querySelector('.retrato-grande').classList.toggle('faminto', st.fome >= 4);
    document.body.dataset.fome = String(st.fome);
    definirClima({ tela: 'jogo', fome: st.fome });

    // Relógio: da lua ao sol, como na noite.
    const total = caso.relogio.fim - caso.relogio.inicio;
    const resta = Math.max(0, caso.relogio.fim - st.hora);
    const f = Math.min(1, Math.max(0, 1 - resta / total));
    const relogio = tela.querySelector('.relogio-noite');
    relogio.title = resta ? `faltam ${duracao(resta)} até o sol` : 'o sol chegou';
    relogio.setAttribute('aria-label', `Relógio da noite: ${relogio.title}`);
    relogio.classList.toggle('amanhecendo', f > 0.85);
    relogio.classList.toggle('ultima-hora', resta > 0 && resta <= 60);
    const amanhecer = resta < 180 ? 1 - resta / 180 : 0;
    tela.style.setProperty('--amanhecer', amanhecer.toFixed(3));
    tela.classList.toggle('amanhecer', amanhecer > 0);
    relogio.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="aro" cx="32" cy="32" r="30"/>
        <g class="disco" style="transform:rotate(${(-180 * f).toFixed(1)}deg)">
          <path class="metade-noite" d="M4 32a28 28 0 0 1 56 0z"/><path class="metade-dia" d="M4 32a28 28 0 0 0 56 0z"/>
          <circle class="lua" cx="32" cy="16" r="7"/><circle class="lua-sombra" cx="35" cy="14" r="6"/>
          <g class="sol"><circle cx="32" cy="48" r="6"/><path d="M32 38v-2M32 60v-2M22 48h-2M44 48h-2M25 41l-1.5-1.5M40.5 56.5 39 55M25 55l-1.5 1.5M40.5 39.5 39 41"/></g>
        </g>
        <path class="horizonte" d="M2 32h60"/><circle class="ponteiro" cx="32" cy="5" r="2.4"/>
      </svg><small>${hora(st.hora)}</small>`;

    // O quadro do caso, no alto à direita: pistas, lacunas com opção e a corrida.
    const a = achados();
    const nPistas = st.achados.filter((id) => caso.pistas[id] && !caso.pistas[id].marca).length;
    const lib = palavrasLiberadas(caso, a);
    const comOpcao = caso.lacunas.filter((l) => lib[l.id].length).length;
    const escolhidas = caso.lacunas.filter((l) => st.escolhas[l.id]).length;
    const acertos = caso.rivais.filter((rv, i) => rv.acertou && st.rivais.includes(i));
    const outros = banco ? banco.ranking.filter((x) => x.resolvido_em && !x.voce).length : 0;
    const corrida = st.resolvido ? 'você resolveu' : banco ? (outros ? `${outros} já ${outros > 1 ? 'resolveram' : 'resolveu'}` : 'ninguém resolveu ainda') : acertos.length ? `${acertos.map((x) => x.acertou.nome).join(' e ')} já ${acertos.length > 1 ? 'resolveram' : 'resolveu'}` : 'ninguém resolveu ainda';
    caixaCaso.className = `hud-plano quadro-noite quadro-caso${st.resolvido ? ' plano-enviado' : ''}`;
    caixaCaso.innerHTML = `
      <div class="quadro-cabeca"><span class="plano-marca" aria-hidden="true">${nPistas}</span><span><b>${esc(caso.titulo)}</b> · noite ${st.noites}</span></div>
      <p class="quadro-pergunta">${esc(caso.pergunta)}</p>
      <ol class="quadro-linhas">
        <li class="${nPistas ? 'ok' : 'falta'}"><button type="button" data-hud="quadro"><span class="quadro-nome">Pistas <small>no quadro</small></span><span class="quadro-valor">${nPistas}${st.novas.length ? ` <small class="selo-nova">+${st.novas.length} nova${st.novas.length > 1 ? 's' : ''}</small>` : ''}</span></button></li>
        <li class="${escolhidas === 3 ? 'ok' : 'opcional'}"><button type="button" data-hud="quadro"><span class="quadro-nome">Dedução</span><span class="quadro-valor">${escolhidas ? `${escolhidas} de 3 escolhidas` : `${comOpcao} de 3 com opções`}</span></button></li>
        <li class="${acertos.length && !st.resolvido ? 'falta' : 'opcional'}"><button type="button" data-hud="corrida"><span class="quadro-nome">Corrida</span><span class="quadro-valor">${esc(corrida)}</span></button></li>
      </ol>
      <div class="quadro-pe"><span>${st.resolvido ? `Resolvido às ${hora(st.resolvido.hora)}` : `Faltam ${duracao(resta)} até o sol`}</span><button type="button" class="btn plano-enviar${escolhidas === 3 && !st.resolvido ? ' destaque' : ''}" data-hud="quadro">Quadro</button></div>`;
    const contador = tela.querySelector('[data-contador]');
    contador.hidden = !st.novas.length;
    contador.textContent = st.novas.length ? `+${st.novas.length}` : '';
  }

  // --- O tempo anda ------------------------------------------------------------------------------
  function passarTempo(min) {
    if (banco) { desenharHud(); return; } // no banco, quem anda o relógio é a função chamada
    if (!min || st.resolvido) { desenharHud(); return; }
    st.hora += min;
    const a = achados();
    for (const ev of caso.eventos) {
      if (st.eventos.includes(ev.id) || st.hora < ev.hora || (ev.seNao || []).some((m) => a.has(m))) continue;
      st.eventos.push(ev.id);
      if (ev.esconder && !st.escondidos.includes(ev.esconder)) {
        st.escondidos.push(ev.esconder);
        if (caso.pessoas[ev.esconder]?.lugar === st.lugar) cena?.esconderPessoa(ev.esconder);
      }
      (ev.marcas || []).forEach((m) => { if (!st.achados.includes(m)) st.achados.push(m); });
      anotar(ev.voz, ev.texto);
      avisar('faixa-evento', ev.voz, ev.texto);
    }
    caso.rivais.forEach((rv, i) => {
      if (st.rivais.includes(i) || st.hora < rv.hora) return;
      st.rivais.push(i);
      anotar('CORRIDA', rv.texto);
      avisar('faixa-corrida', 'Corrida', rv.texto);
    });
    if (st.hora >= caso.relogio.fim) amanheceuPendente = true;
    salvar();
    desenharHud();
    atualizarCena();
  }
  function checarAmanhecer() {
    if (!amanheceuPendente || camadaAberta() || st.resolvido) return false;
    amanheceuPendente = false;
    amanhecer();
    return true;
  }

  // Pistas e marcas novas: entram no quadro com aviso, som e linha no registro.
  function aplicar(r) {
    if (!r) return;
    const antes = palavrasLiberadas(caso, achados());
    const novas = [];
    for (const id of [...(r.pistas || []), ...(r.marcas || [])]) {
      if (st.achados.includes(id)) continue;
      st.achados.push(id);
      if (caso.pistas[id] && !caso.pistas[id].marca) { if (!st.novas.includes(id)) st.novas.push(id); novas.push(caso.pistas[id].titulo); }
    }
    if (novas.length) {
      anotar('PISTA NOVA', novas.join(' · '));
      avisar('faixa-pista', novas.length > 1 ? 'Pistas novas no quadro' : 'Pista nova no quadro', novas.join(' · '), () => { som.reacao?.('pista', 0); voarPista(); });
    }
    const depois = palavrasLiberadas(caso, achados());
    const abriu = caso.lacunas.filter((l) => depois[l.id].length > antes[l.id].length);
    if (abriu.length) avisar('faixa-deducao', 'Dedução', `nova opção em “${abriu.map((l) => l.rotulo.toLowerCase()).join('” e “')}”`);
    salvar();
    desenharHud();
    atualizarCena();
  }

  // --- Banco: chamadas, respostas e textos ----------------------------------------------------------
  // Chama uma função do banco; o erro vira uma caixa (e "amanheceu" leva ao amanhecer).
  async function noBanco(fn) {
    try { return await fn(); } catch (e) {
      if (e.codigo === 'amanheceu') { amanheceuPendente = true; checarAmanhecer(); return null; }
      caixa({ rotulo: 'Não deu', texto: e.message || 'Não deu certo.', opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] });
      return null;
    }
  }
  // A resposta do banco: o estado novo, as pistas novas (com aviso e voo para o Quadro), as palavras que
  // abriram na dedução e os eventos do relógio.
  function aplicarBanco(r) {
    if (!r) return;
    const antes = palavrasLiberadas(caso, achados());
    sincronizar(r.estado);
    const novas = (r.novas || []).map((x) => x.titulo);
    for (const x of r.novas || []) if (!st.novas.includes(x.id)) st.novas.push(x.id);
    if (novas.length) {
      anotar('PISTA NOVA', novas.join(' · '));
      avisar('faixa-pista', novas.length > 1 ? 'Pistas novas no quadro' : 'Pista nova no quadro', novas.join(' · '), () => { som.reacao?.('pista', 0); voarPista(); });
    }
    const depois = palavrasLiberadas(caso, achados());
    const abriu = caso.lacunas.filter((l) => depois[l.id].length > antes[l.id].length);
    if (abriu.length) avisar('faixa-deducao', 'Dedução', `nova opção em “${abriu.map((l) => l.rotulo.toLowerCase()).join('” e “')}”`);
    for (const ev of r.eventos || []) {
      if (ev.esconder && caso.pessoas[ev.esconder]?.lugar === st.lugar) cena?.esconderPessoa(ev.esconder);
      anotar(ev.voz, ev.texto);
      avisar('faixa-evento', ev.voz, ev.texto);
    }
    salvar();
    desenharHud();
    atualizarCena();
  }
  // Quem está no lugar e os pontos à vista (só os que o jogador já pode ver). Sem mudar de lugar, não custa nada.
  async function lerLugar(id) {
    const r = await noBanco(() => F.lugar(caso.id, p.id, id));
    if (!r) return null;
    const l = caso.lugares[id];
    l.pessoas = r.pessoas.map((x) => x.id);
    for (const x of r.pessoas) {
      caso.pessoas[x.id] = { ...caso.pessoas[x.id], ...x, lugar: id };
      banco.assunto[x.id] = x.assunto_novo;
    }
    l.pontos = [...l.fixos, ...r.pontos.map((x) => ({ id: x.id, rotulo: x.rotulo, x: x.x, y: x.y }))];
    return r;
  }
  // Depois de cada ação: o estado e o lugar de novo (tópicos e pontos podem ter aberto).
  async function depoisDaAcao(r) {
    aplicarBanco(r);
    await lerLugar(st.lugar);
    atualizarCena();
  }
  const minuscula = (t) => `${String(t || '').charAt(0).toLowerCase()}${String(t || '').slice(1)}`;
  // O texto de um resultado do banco, como na demonstração: o teste, o sangue e o que aconteceu.
  function textoDe(r) {
    const partes = [];
    if (r.teste?.res) {
      let cabeca = `${R.cabecaDoTeste(r.teste.pool, r.teste.dif, r.teste.res)} ${r.vontade ? 'Com Força de Vontade, você insiste.' : `Você tenta: ${minuscula(r.abordagem)}.`}`;
      if (r.teste.res.resultado === 'falha-bestial' && !r.vontade) cabeca += '\n\n[A BESTA] Eu rosno por dentro, e todo mundo em volta sente. Perdemos tempo.';
      if (r.teste.res.resultado === 'critico-sangrento') cabeca += '\n\n[A BESTA] Deu certo porque eu ajudei. Lembre-se disso.';
      partes.push(cabeca);
    } else if (r.sangue) {
      partes.push(r.sangue.fomeSobe ? '[A FOME] Usar o sangue me acordou. Agora tenho mais fome.' : '[O SANGUE] O sangue responde sem pedir nada em troca.');
    }
    if (r.texto) partes.push(r.texto);
    else if (r.vontade && !r.ok) partes.push('Não deu. Melhor tentar de outro jeito.');
    return partes.join('\n\n');
  }
  // A etiqueta de uma abordagem, pela situação que o banco devolve (a chance sai da parada e da dificuldade).
  function etiquetaBanco(a) {
    const sangue = !!(a.poder || a.disciplina);
    const nomeSangue = a.poder ? R.nomePoder(a.poder) : a.disciplina ? { poder: R.nomeDisciplina(a.disciplina[0]), disciplina: R.nomeDisciplina(a.disciplina[0]) } : null;
    if (!a.pode) {
      const motivo = {
        tentado: 'já tentou assim', bloqueada: 'agora não vai dar', falta: 'falta alguma coisa',
        'fome-maxima': 'com a Fome no máximo, o sangue não responde', 'fome-baixa': `só com a Fome em ${a.fomeMin} ou mais`,
        'sem-poder': nomeSangue ? `precisa de ${nomeSangue.poder}` : 'não está ao seu alcance',
      }[a.motivo] || '';
      return { pode: false, etiqueta: motivo, sangue };
    }
    if (sangue) return { pode: true, etiqueta: `${nomeSangue.disciplina} · usa o sangue`, sangue };
    if (a.besta) return { pode: true, etiqueta: 'a Besta' };
    if (a.teste) return { pode: true, etiqueta: `${R.vozDoTeste(a.teste.pool)} · ${R.palavraDaChance(R.chance(a.teste.parada ?? 1, a.teste.dif))}${a.teste.fomeAssusta ? ' · a Fome assusta' : ''}` };
    return { pode: true, etiqueta: '' };
  }
  // As abordagens pelo banco: a mesma caixa da demonstração; o banco rola os dados e decide.
  function abordagensBanco({ rotulo, intro = '', lista, chave, falante = null, aoVoltar, aoResultado }) {
    const opcoes = lista.map((a) => {
      const s = etiquetaBanco(a);
      return { html: `${esc(a.rotulo)}${etiqueta(s)}`, desligada: !s.pode, classe: s.pode ? '' : 'indisponivel', fn: (cam) => { cam.fechar(); tentar(a); } };
    });
    opcoes.push({ html: 'Voltar', classe: 'sair', fn: (cam) => { cam.fechar(); aoVoltar?.(); } });
    caixa({ rotulo, texto: intro || 'Como você faz?', opcoes, falante });
    async function tentar(a) {
      const r = await noBanco(() => F.agir(caso.id, p.id, chave, a.i));
      if (!r) return;
      if (r.teste?.res) await cerimonia(r.teste.pool, r.teste.dif, r.teste.res);
      if (r.sangue) som.reacao?.('disciplina', 0);
      await depoisDaAcao(r);
      const repetir = r.pode_repetir ? async () => {
        const r2 = await noBanco(() => F.insistir(caso.id, p.id, chave, a.i));
        if (!r2) return;
        await cerimonia(r2.teste.pool, r2.teste.dif, r2.teste.res);
        await depoisDaAcao(r2);
        aoResultado(textoDe(r2), r2.ok, null);
      } : null;
      aoResultado(textoDe(r), r.ok, repetir);
    }
  }

  // --- Caixas de diálogo -------------------------------------------------------------------------
  const figuraDe =(pid) => { const pe = caso.pessoas[pid]; const f = pe?.figura || FIGURAS_GENTE[pe?.tipo]?.[0]; return f ? figuraLeve(`img/gente/${f}.png`) : ''; };
  let numCaixa = 0;
  // opcoes: [{ html, fn, desligada, classe }]. revelar: fala por fala, com "Continuar".
  function caixa({ rotulo, html = '', texto = '', opcoes = [], revelar = false, fechavel = true, aoFechar, falante = null }) {
    const lista = opcoes.length ? `<ol class="escolhas escolhas-caso">${opcoes.map((o, i) => `<li${o.classe ? ` class="${o.classe}"` : ''}><button type="button" data-escolha="${i}"${o.desligada ? ' disabled aria-disabled="true"' : ''}><span class="escolha-num">${i + 1}.</span> — ${o.html}</button></li>`).join('')}</ol>` : '';
    const chave = revelar ? `caso-${caso.id}-${Date.now()}-${numCaixa++}` : null;
    revelando = !!chave;
    const camada = abrirDialogo(tela, {
      rotulo, chave, fechavel,
      html: `${html}${texto ? `<div class="texto-narracao sem-dois-tempos">${narracao(texto)}</div>` : ''}${lista}`,
      aoTerminar: () => {
        if (chave) try { localStorage.removeItem(`mascara.lido.${chave}`); } catch { /* sem armazenamento */ }
        revelando = false;
        setTimeout(soltarAvisos, 250);
      },
      aoFechar: () => { revelando = false; setTimeout(soltarAvisos, 150); aoFechar?.(); setTimeout(checarAmanhecer, 50); },
    });
    camada.el.classList.add('dialogo-caso');
    // Rosto de quem fala: a figura pintada da pessoa, recortada no rosto, no lugar da inicial; na
    // conversa, o retrato dela também fica à esquerda da caixa.
    for (const f of camada.el.querySelectorAll('p.fala')) {
      const nome = f.querySelector('.falante')?.textContent?.trim();
      const pid = Object.keys(caso.pessoas).find((id) => caso.pessoas[id].nome.toUpperCase() === nome);
      const src = pid ? figuraDe(pid) : '';
      const rosto = f.querySelector('.rosto');
      if (src && rosto) { rosto.classList.add('rosto-pintado'); rosto.innerHTML = `<img src="${esc(src)}" alt="">`; }
    }
    if (falante && figuraDe(falante)) {
      camada.el.classList.add('com-falante');
      camada.el.style.setProperty('--retrato-falante', `url('${new URL(figuraDe(falante), location.href).href}')`);
    }
    camada.el.querySelectorAll('[data-escolha]').forEach((b) => {
      const o = opcoes[Number(b.dataset.escolha)];
      b.onclick = () => { if (o.desligada) return; confirmarEscolha(b, () => o.fn(camada)); };
    });
    return camada;
  }

  // Cerimônia do teste: a habilidade e a dificuldade, uma pausa, o resultado com cor e som. Um clique pula.
  function cerimonia(pool, dif, res) {
    return new Promise((resolver) => {
      const curto = document.body.classList.contains('cerimonias-curtas') || matchMedia('(prefers-reduced-motion: reduce)').matches;
      const ok = R.deuCerto(res);
      const el = document.createElement('div');
      el.className = `cerimonia-teste grupo-${grupoVoz(R.vozDoTeste(pool))}`;
      el.innerHTML = `<span class="ct-voz">${esc(R.vozDoTeste(pool))}</span><span class="ct-dif">${esc(R.DIFICULDADE[dif] || 'Médio')}</span><span class="ct-res ${ok ? 'ct-sucesso' : 'ct-falha'}${/bestial|sangrento/.test(res.resultado) ? ' ct-besta' : ''}">${esc(R.rotuloResultado(res))}</span>`;
      tela.appendChild(el);
      let feito = false;
      const fim = () => { if (feito) return; feito = true; el.remove(); resolver(); };
      el.addEventListener('click', fim);
      setTimeout(() => { el.classList.add('revelado'); som.teste?.(ok, !ok); }, curto ? 150 : 650);
      setTimeout(() => el.classList.add('saindo'), curto ? 500 : 1300);
      setTimeout(fim, curto ? 700 : 1600);
    });
  }

  // Uso do sangue (disciplina): o teste de Despertar do motor pode subir a Fome.
  function usarSangue(nome) {
    // ETAPA C: no banco, o sangue gasto na cena de ação ainda não sobe a Fome (a cena roda no navegador).
    if (banco) { som.reacao?.('disciplina', 0); anotar('O SANGUE', `${nome}.`); return '[O SANGUE] O sangue responde.'; }
    const d = R.despertar();
    som.reacao?.('disciplina', 0);
    if (d.fomeSobe) {
      st.fome = Math.min(5, st.fome + 1);
      anotar('A FOME', `${nome} me acordou. Agora tenho mais fome.`);
    } else anotar('O SANGUE', `${nome} não custou nada desta vez.`);
    salvar();
    desenharHud();
    return d.fomeSobe ? `[A FOME] Usar o sangue me acordou. Agora tenho mais fome.` : '[O SANGUE] O sangue responde sem pedir nada em troca.';
  }

  // --- Abordagens: testes, poderes e a Besta ----------------------------------------------------
  // Cada abordagem pode ser tentada uma vez. Falhar deixa as outras abertas; a Força de Vontade
  // permite tentar de novo na hora.
  function situacao(a, chaveBase, i) {
    const s = achados();
    if (st.tentados[`${chaveBase}#${i}`]) return { pode: false, etiqueta: 'já tentou assim' };
    if (a.bloqueadaSe?.some((m) => s.has(m))) return { pode: false, etiqueta: 'agora não vai dar' };
    if (a.requer && !a.requer.every((m) => s.has(m))) return { pode: false, etiqueta: 'falta alguma coisa' };
    if (a.poder) {
      const n = R.nomePoder(a.poder);
      if (!R.temPoder(calc, a.poder)) return { pode: false, etiqueta: `precisa de ${n.poder}`, sangue: true };
      if (st.fome >= 5) return { pode: false, etiqueta: 'com a Fome no máximo, o sangue não responde' };
      return { pode: true, etiqueta: `${n.disciplina} · usa o sangue`, sangue: true };
    }
    if (a.disciplina) {
      if (!R.temDisciplina(calc, a.disciplina)) return { pode: false, etiqueta: `precisa de ${R.nomeDisciplina(a.disciplina[0])}`, sangue: true };
      if (st.fome >= 5) return { pode: false, etiqueta: 'com a Fome no máximo, o sangue não responde' };
      return { pode: true, etiqueta: `${R.nomeDisciplina(a.disciplina[0])} · usa o sangue`, sangue: true };
    }
    if (a.fomeMin) return st.fome >= a.fomeMin ? { pode: true, etiqueta: 'a Besta' } : { pode: false, etiqueta: `só com a Fome em ${a.fomeMin} ou mais` };
    if (a.teste) {
      const dif = a.teste.dif + (a.social && st.fome >= 4 ? 1 : 0);
      const n = R.parada(calc, a.teste.pool);
      return { pode: true, etiqueta: `${R.vozDoTeste(a.teste.pool)} · ${R.palavraDaChance(R.chance(n, dif))}${a.social && st.fome >= 4 ? ' · a Fome assusta' : ''}`, dif };
    }
    return { pode: true, etiqueta: '' };
  }
  const etiqueta = (s) => (s.etiqueta ? ` <small class="etiqueta-teste${s.pode ? '' : ' indisponivel'}${s.sangue ? ' de-sangue' : ''}">${esc(s.etiqueta)}</small>` : '');

  // Mostra as abordagens e resolve a escolhida. aoResultado(texto, ok) monta a caixa seguinte.
  function abordagens({ rotulo, intro = '', lista, resultados = {}, chaveBase, min, aoVoltar, aoResultado, falante = null }) {
    const opcoes = lista.map((a, i) => {
      const s = situacao(a, chaveBase, i);
      return { html: `${esc(a.rotulo)}${etiqueta(s)}`, desligada: !s.pode, classe: s.pode ? '' : 'indisponivel', fn: (cam) => { cam.fechar(); tentar(a, i, s); } };
    });
    opcoes.push({ html: 'Voltar', classe: 'sair', fn: (cam) => { cam.fechar(); aoVoltar?.(); } });
    caixa({ rotulo, texto: intro || 'Como você faz?', opcoes, falante });

    async function tentar(a, i, s) {
      st.tentados[`${chaveBase}#${i}`] = true;
      let prefixo = '';
      let ok = true;
      let res = null;
      if (a.teste) {
        res = R.rolar({ calc, pool: a.teste.pool, dif: s.dif, fome: st.fome });
        await cerimonia(a.teste.pool, s.dif, res);
        ok = R.deuCerto(res);
        prefixo = `${R.cabecaDoTeste(a.teste.pool, s.dif, res)} Você tenta: ${a.rotulo.charAt(0).toLowerCase()}${a.rotulo.slice(1)}.`;
        if (res.resultado === 'falha-bestial') prefixo += '\n\n[A BESTA] Eu rosno por dentro, e todo mundo em volta sente. Perdemos tempo.';
        if (res.resultado === 'critico-sangrento') prefixo += '\n\n[A BESTA] Deu certo porque eu ajudei. Lembre-se disso.';
      } else if (a.poder || a.disciplina) {
        prefixo = usarSangue(a.poder ? R.nomePoder(a.poder).poder : R.nomeDisciplina(a.disciplina[0]));
      }
      const r = resultados[ok ? a.sucesso : a.falha] || null;
      passarTempo((min || 0) + (res?.resultado === 'falha-bestial' ? 15 : 0));
      aplicar(r);
      if (ok) st.feitos[chaveBase] = 'ok';
      else if (st.feitos[chaveBase] !== 'ok') st.feitos[chaveBase] = 'tentado';
      const texto = [prefixo, r?.texto].filter(Boolean).join('\n\n');
      if (ok) st.lidos[chaveBase] = texto;
      salvar();
      const repetir = !ok && res && st.vontade > 0 ? async () => {
        st.vontade -= 1;
        const nova = R.rerrolar(res);
        await cerimonia(a.teste.pool, s.dif, nova);
        const ok2 = R.deuCerto(nova);
        const r2 = ok2 ? resultados[a.sucesso] : null;
        aplicar(r2);
        if (ok2) st.feitos[chaveBase] = 'ok';
        const besta = nova.resultado === 'critico-sangrento' ? '\n\n[A BESTA] Deu certo porque eu ajudei. Lembre-se disso.' : '';
        const t2 = `${R.cabecaDoTeste(a.teste.pool, s.dif, nova)} Com Força de Vontade, você insiste.${besta}${r2?.texto ? `\n\n${r2.texto}` : '\n\nNão deu. Melhor tentar de outro jeito.'}`;
        if (ok2) st.lidos[chaveBase] = t2;
        salvar();
        desenharHud();
        aoResultado(t2, ok2, null);
      } : null;
      aoResultado(texto, ok, repetir);
    }
  }

  // --- Conversas ---------------------------------------------------------------------------------
  function topicosDe(pid) {
    const pe = caso.pessoas[pid];
    const s = achados();
    const fugiu = caso.perseguicao.pessoa === pid && s.has('perseguido');
    if (fugiu) return [];
    return pe.topicos.filter((t) => {
      if (t.requer && !t.requer.every((id) => s.has(id))) return false;
      if (t.requerAlgum && !t.requerAlgum.some((id) => s.has(id))) return false;
      if (t.requerQuantos && t.requerQuantos.de.filter((id) => s.has(id)).length < t.requerQuantos.n) return false;
      if (t.poderTopico && !R.temPoder(calc, t.poderTopico)) return false;
      if (t.escondeSe?.some((id) => s.has(id)) && st.feitos[`${pid}:${t.id}`] !== 'ok') return false;
      if (t.acao === 'perseguicao' && s.has('chapeu-mostrado')) return false;
      return true;
    }).map((t) => ({ ...t, estado: st.feitos[`${pid}:${t.id}`] || 'novo' }));
  }
  const temAssuntoNovo = (pid) => (banco ? !!banco.assunto[pid] : topicosDe(pid).some((t) => t.estado === 'novo'));

  async function conversar(pid, intro = null) {
    const pe = caso.pessoas[pid];
    let textoBanco = null;
    if (banco) {
      // O banco dá a saudação (ou "Mais alguma coisa?") e os tópicos já liberados; nada dos bloqueados.
      const r = await noBanco(() => F.conversa(caso.id, p.id, pid));
      if (!r) return;
      banco.topicos[pid] = r.topicos.map((t) => ({ ...t, id: t.chave.slice(pid.length + 1) }));
      aplicarBanco(r);
      textoBanco = r.texto;
    }
    const primeira = !banco && !st.achados.includes(`conheceu-${pid}`);
    if (primeira) aplicar({ marcas: [`conheceu-${pid}`] });
    cena?.virarPessoaPara(`pessoa-${pid}`);
    const tops = (banco ? [...banco.topicos[pid]] : topicosDe(pid)).sort((a, b) => ({ novo: 0, tentado: 1, ok: 2 }[a.estado] - { novo: 0, tentado: 1, ok: 2 }[b.estado]));
    const depoisDaFuga = caso.perseguicao.pessoa === pid && achados().has('perseguido');
    const texto = intro ?? (banco ? textoBanco : depoisDaFuga ? (caso.perseguicao.depois?.pego || '') : primeira ? pe.saudacao : `**${pe.nome}** — Mais alguma coisa?`);
    const opcoes = tops.map((t) => ({
      html: `${esc(t.rotulo)}${t.estado === 'ok' ? ' <small class="etiqueta-feito">✓ já perguntou</small>' : t.estado === 'tentado' ? ' <small class="etiqueta-teste">tentar de outro jeito</small>' : t.min ? ` <small class="etiqueta-tempo">${t.min} min</small>` : ''}`,
      classe: t.estado === 'ok' ? 'feito' : '',
      fn: (cam) => { cam.fechar(); escolherTopico(pid, t); },
    }));
    opcoes.push({ html: 'Encerrar a conversa', classe: 'sair', fn: (cam) => cam.fechar() });
    caixa({ rotulo: `${pe.nome} · ${pe.sub}`, texto, opcoes, revelar: !!intro && intro.length > 160, falante: pid });
  }

  // A caixa depois de uma abordagem na conversa: insistir com Força de Vontade, continuar ou encerrar.
  const aoResultadoConversa = (pid) => (texto, ok, repetir) => {
    const pe = caso.pessoas[pid];
    if (repetir) {
      caixa({
        rotulo: `${pe.nome} · ${pe.sub}`, texto, revelar: true, falante: pid,
        opcoes: [
          { html: `Tentar de novo <small class="etiqueta-teste">gasta Força de Vontade · resta ${st.vontade}</small>`, fn: (cam) => { cam.fechar(); repetir(); } },
          { html: 'Continuar a conversa', fn: (cam) => { cam.fechar(); conversar(pid); } },
          { html: 'Encerrar a conversa', classe: 'sair', fn: (cam) => cam.fechar() },
        ],
      });
    } else conversar(pid, texto);
  };

  async function escolherTopico(pid, t) {
    const chave = `${pid}:${t.id}`;
    if (banco) {
      const r = await noBanco(() => F.agir(caso.id, p.id, chave));
      if (!r) return;
      await depoisDaAcao(r);
      const pe = caso.pessoas[pid];
      if (r.acao === 'perseguicao') {
        caixa({
          rotulo: `${pe.nome} · ${pe.sub}`, texto: r.texto, revelar: true, fechavel: false, falante: pid,
          opcoes: [{ html: '<b>Correr atrás dele!</b>', classe: 'destaque', fn: (cam) => { cam.fechar(); comecarFuga(); } }],
        });
      } else if (r.abordagens) {
        abordagensBanco({ rotulo: `${pe.nome} · ${t.rotulo}`, intro: r.pergunta, lista: r.abordagens, chave, falante: pid, aoVoltar: () => conversar(pid), aoResultado: aoResultadoConversa(pid) });
      } else conversar(pid, textoDe(r));
      return;
    }
    if (t.estado === 'ok' && st.lidos[chave]) { conversar(pid, st.lidos[chave]); return; }
    if (t.acao === 'perseguicao') {
      passarTempo(t.min);
      aplicar({ pistas: t.pistas, marcas: ['chapeu-mostrado'] });
      st.feitos[chave] = 'ok';
      salvar();
      caixa({
        rotulo: `${caso.pessoas[pid].nome} · ${caso.pessoas[pid].sub}`, texto: t.texto, revelar: true, fechavel: false, falante: pid,
        opcoes: [{ html: '<b>Correr atrás dele!</b>', classe: 'destaque', fn: (cam) => { cam.fechar(); comecarFuga(); } }],
      });
      return;
    }
    if (!t.abordagens) {
      passarTempo(t.min);
      aplicar({ pistas: t.pistas, marcas: t.marcas });
      st.feitos[chave] = 'ok';
      st.lidos[chave] = t.texto;
      salvar();
      conversar(pid, t.texto);
      return;
    }
    const pe = caso.pessoas[pid];
    abordagens({
      rotulo: `${pe.nome} · ${t.rotulo}`, intro: t.pergunta, lista: t.abordagens, resultados: pe.resultados, chaveBase: chave, min: t.min, falante: pid,
      aoVoltar: () => conversar(pid),
      aoResultado: aoResultadoConversa(pid),
    });
  }

  // --- Exames ------------------------------------------------------------------------------------
  async function examinar(id) {
    const ex = caso.exames[id];
    const pt = caso.lugares[st.lugar].pontos.find((x) => x.id === id);
    const chave = `x:${id}`;
    const fechar = { html: 'Voltar à cena', classe: 'sair', fn: (cam) => cam.fechar() };
    if (banco) {
      const r = await noBanco(() => F.agir(caso.id, p.id, chave));
      if (!r) return;
      await depoisDaAcao(r);
      if (!r.abordagens) { const texto = textoDe(r); caixa({ rotulo: pt.rotulo, texto, opcoes: [fechar], revelar: texto.length > 160 }); return; }
      abordagensBanco({
        rotulo: pt.rotulo, intro: r.pergunta, lista: r.abordagens, chave, aoVoltar: () => {},
        aoResultado: (texto, ok, repetir) => {
          const opcoes = [];
          if (repetir) opcoes.push({ html: `Tentar de novo <small class="etiqueta-teste">gasta Força de Vontade · resta ${st.vontade}</small>`, fn: (cam) => { cam.fechar(); repetir(); } });
          if (!ok) opcoes.push({ html: 'Tentar de outro jeito', fn: (cam) => { cam.fechar(); examinar(id); } });
          opcoes.push(fechar);
          caixa({ rotulo: pt.rotulo, texto, opcoes, revelar: texto.length > 160 });
        },
      });
      return;
    }
    if (st.feitos[chave] === 'ok' && st.lidos[chave]) { caixa({ rotulo: pt.rotulo, texto: st.lidos[chave], opcoes: [fechar] }); return; }
    const passivo = () => {
      const pv = ex.passivo;
      if (!pv || (calc.habilidades?.[pv.hab] || 0) < pv.min) return '';
      aplicar({ pistas: pv.pistas });
      return pv.texto;
    };
    if (!ex.abordagens) {
      passarTempo(ex.min);
      aplicar({ pistas: ex.pistas, marcas: ex.marcas });
      const texto = [ex.texto, passivo()].filter(Boolean).join('\n\n');
      st.feitos[chave] = 'ok';
      st.lidos[chave] = texto;
      salvar();
      caixa({ rotulo: pt.rotulo, texto, opcoes: [fechar], revelar: texto.length > 160 });
      return;
    }
    if (ex.marcas) aplicar({ marcas: ex.marcas });
    abordagens({
      rotulo: pt.rotulo, intro: [ex.texto, ex.pergunta].filter(Boolean).join('\n\n'), lista: ex.abordagens, resultados: ex.resultados, chaveBase: chave, min: ex.min,
      aoVoltar: () => {},
      aoResultado: (texto, ok, repetir) => {
        const opcoes = [];
        if (repetir) opcoes.push({ html: `Tentar de novo <small class="etiqueta-teste">gasta Força de Vontade · resta ${st.vontade}</small>`, fn: (cam) => { cam.fechar(); repetir(); } });
        if (!ok && ex.abordagens.some((a, i) => situacao(a, chave, i).pode)) opcoes.push({ html: 'Tentar de outro jeito', fn: (cam) => { cam.fechar(); examinar(id); } });
        opcoes.push(fechar);
        caixa({ rotulo: pt.rotulo, texto, opcoes, revelar: texto.length > 160 });
      },
    });
  }

  // --- Caçar -------------------------------------------------------------------------------------
  function cacar() {
    if (st.fome <= 1) { caixa({ rotulo: 'Caçar', texto: '[A FOME] Agora não. Ainda estou quieta.', opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] }); return; }
    const lista = caso.cacada.abordagens;
    const opcoes = lista.map((a, i) => {
      const n = R.parada(calc, a.teste.pool);
      return { html: `${esc(a.rotulo)} <small class="etiqueta-teste">${R.vozDoTeste(a.teste.pool)} · ${R.palavraDaChance(R.chance(n, a.teste.dif))} · ${caso.custo.cacar} min</small>`, fn: async (cam) => {
        cam.fechar();
        if (banco) {
          const r = await noBanco(() => F.cacar(caso.id, p.id, i));
          if (!r) return;
          if (r.recusado) { aplicarBanco(r); return; }
          await cerimonia(r.teste.pool, r.teste.dif, r.teste.res);
          await depoisDaAcao(r);
          anotar('A FOME', `Depois da caçada: Fome ${st.fome}.`);
          caixa({ rotulo: 'Caçar', texto: `${R.cabecaDoTeste(r.teste.pool, r.teste.dif, r.teste.res)} Você tenta: ${minuscula(r.abordagem)}.\n\n${r.texto}`, opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] });
          return;
        }
        const res = R.rolar({ calc, pool: a.teste.pool, dif: a.teste.dif, fome: st.fome });
        await cerimonia(a.teste.pool, a.teste.dif, res);
        let texto = `${R.cabecaDoTeste(a.teste.pool, a.teste.dif, res)} Você tenta: ${a.rotulo.charAt(0).toLowerCase()}${a.rotulo.slice(1)}.`;
        let extra = 0;
        if (R.deuCerto(res)) {
          st.fome = Math.max(1, st.fome - (res.critico ? 3 : 2));
          texto += `\n\n${caso.cacada.sucesso}`;
        } else if (res.resultado === 'falha-bestial') {
          st.fome = Math.max(1, st.fome - 1);
          extra = 30;
          texto += `\n\n${caso.cacada.bestial}`;
        } else texto += `\n\n${caso.cacada.falha}`;
        anotar('A FOME', `Depois da caçada: Fome ${st.fome}.`);
        passarTempo(caso.custo.cacar + extra);
        caixa({ rotulo: 'Caçar', texto, opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] });
      } };
    });
    opcoes.push({ html: 'Voltar', classe: 'sair', fn: (c) => c.fechar() });
    caixa({ rotulo: 'Caçar', texto: `[A FOME] Usar o sangue me acorda. Quanto mais eu cresço, mais as pessoas sentem medo de você.\n\nCaçar baixa a Fome, mas gasta ${caso.custo.cacar} minutos da noite.`, opcoes });
  }

  // --- Lugares -----------------------------------------------------------------------------------
  // Ir de um lugar a uma parte dele (o largo da Lapa e o beco do bar) leva 2 minutos; o resto, a viagem.
  function custoViagem(de, para) {
    const a = caso.lugares[de];
    const b = caso.lugares[para];
    return a?.dentro === para || b?.dentro === de || (a?.dentro && a.dentro === b?.dentro) ? 2 : caso.custo.viagem;
  }
  const destinoEm = (l) => l.em.replace(/^em /, 'a ').replace(/^na /, 'à ').replace(/^no /, 'ao ');
  function viajar() {
    const outros = Object.entries(caso.lugares).filter(([id]) => id !== st.lugar);
    caixa({
      rotulo: 'Lugares do caso',
      texto: `Você está ${caso.lugares[st.lugar].em}. Ir a outro bairro leva ${caso.custo.viagem} minutos.`,
      opcoes: [
        ...outros.map(([id, l]) => ({ html: `Ir ${destinoEm(l)} <small class="etiqueta-tempo">${custoViagem(st.lugar, id)} min</small>`, fn: (cam) => { cam.fechar(); irPara(id); } })),
        { html: 'Ficar aqui', classe: 'sair', fn: (cam) => cam.fechar() },
      ],
    });
  }
  function irPara(id) {
    if (cena) st.posicoes[st.lugar] = [cena.posicao().x, cena.posicao().y];
    const veu = document.createElement('div');
    veu.className = 'passagem-caso';
    tela.appendChild(veu);
    setTimeout(async () => {
      if (banco) {
        const r = await lerLugar(id);
        if (!r) { veu.remove(); return; }
        aplicarBanco(r);
      } else {
        const custo = custoViagem(st.lugar, id);
        st.lugar = id;
        passarTempo(custo);
      }
      montarLugar();
      const l = caso.lugares[id];
      anotar('VOCÊ', `Chega ${destinoEm(l)}, às ${hora(st.hora)}.`);
      veu.classList.add('saindo');
      setTimeout(() => veu.remove(), 450);
      setTimeout(olharInicial, 120);
      faixa('faixa-chegada', l.nome, hora(st.hora));
      setTimeout(checarAmanhecer, 600);
    }, 260);
  }

  function pontosDo(id) {
    const lugar = caso.lugares[id];
    const geo = geografia(lugar.geo);
    const s = achados();
    const pts = [{ id: 'sair', tipo: 'saida', icone: '➜', rotulo: lugar.saida?.rotulo || 'Ir para outro lugar', acao: lugar.saida?.rotulo || 'Ir para outro lugar do caso', destino: lugar.saida?.destino, x: geo.saida[0], y: geo.saida[1] }];
    for (const pt of lugar.pontos) {
      if (pt.tipo === 'passagem') { pts.push({ id: pt.id, tipo: 'saida', icone: '➜', rotulo: pt.rotulo, acao: pt.rotulo, destino: pt.destino, x: pt.x, y: pt.y }); continue; }
      if (pt.requer && !pt.requer.every((m) => s.has(m))) continue;
      if (pt.escondeSe?.some((m) => s.has(m)) && st.feitos[`x:${pt.id}`] !== 'ok') continue;
      if (pt.tipo === 'cacar') { pts.push({ id: pt.id, tipo: 'cacar', icone: '♦', rotulo: pt.rotulo, acao: 'Caçar e baixar a Fome', x: pt.x, y: pt.y, falta: st.fome >= 4 }); continue; }
      const feito = st.feitos[`x:${pt.id}`] === 'ok';
      pts.push({ id: pt.id, tipo: 'detalhe', icone: feito ? '·' : '?', rotulo: pt.rotulo, acao: `Examinar: ${pt.rotulo}`, x: pt.x, y: pt.y, visto: feito, baixo: /chão|caçamba/i.test(pt.rotulo) });
    }
    return pts;
  }
  function genteDo(id) {
    return caso.lugares[id].pessoas.filter((pid) => !st.escondidos.includes(pid)).map((pid) => {
      const pe = caso.pessoas[pid];
      const pos = st.posPessoas[pid];
      return { id: pid, tipo: pe.tipo, nome: pe.nome, sub: subDe(pid), figura: pe.figura, x: pos?.[0] ?? pe.x, y: pos?.[1] ?? pe.y, falas: pe.falas };
    });
  }
  const subDe = (pid) => `${caso.pessoas[pid].sub}${temAssuntoNovo(pid) && st.achados.includes(`conheceu-${pid}`) ? ' · assunto novo' : ''}`;
  function atualizarCena() {
    if (!cena) return;
    cena.atualizarPontos(pontosDo(st.lugar));
    for (const pid of caso.lugares[st.lugar].pessoas) {
      const el = cena.pessoa(pid)?.el;
      if (!el) continue;
      const small = el.querySelector('.pessoa-nome small');
      if (small) small.textContent = subDe(pid);
      // Rodada 46: o nome fica sempre à vista sobre quem você já conhece.
      el.classList.toggle('conhecida', st.achados.includes(`conheceu-${pid}`));
      // Balão sobre a cabeça de quem tem algo novo a dizer (sempre à vista, sem Tab).
      const quer = !fuga && temAssuntoNovo(pid);
      let balao = el.querySelector('.balao-assunto');
      if (quer && !balao) {
        balao = document.createElement('span');
        balao.className = 'balao-assunto';
        balao.setAttribute('aria-hidden', 'true');
        balao.innerHTML = '<i></i><i></i><i></i>';
        el.appendChild(balao);
      } else if (!quer && balao) balao.remove();
    }
  }

  // A primeira câmera de cada lugar mostra você e a pessoa mais perto que tem assunto novo.
  function olharInicial() {
    if (!cena?.olharPara) return;
    const voce = cena.posicao();
    const gente = caso.lugares[st.lugar].pessoas.filter((pid) => !st.escondidos.includes(pid)).map((pid) => ({ pid, q: cena.pessoa(pid) })).filter((x) => x.q);
    if (!gente.length) { cena.centrarCamera(); return; }
    const comAssunto = gente.filter((x) => temAssuntoNovo(x.pid));
    const lista = comAssunto.length ? comAssunto : gente;
    const perto = lista.reduce((m, x) => (Math.abs(x.q.x - voce.x) < Math.abs(m.q.x - voce.x) ? x : m));
    cena.olharPara((voce.x + perto.q.x) / 2, (voce.y + perto.q.y) / 2);
  }

  // Rótulos das pessoas (Tab ou mouse por cima) nunca cortam na borda da tela.
  const prenderRotulos = setInterval(() => {
    if (!tela.isConnected) { clearInterval(prenderRotulos); return; }
    const rc = palco.getBoundingClientRect();
    for (const rot of palco.querySelectorAll('.pessoa-nome')) {
      rot.style.transform = '';
      const r = rot.getBoundingClientRect();
      if (!r.width) continue;
      const passa = r.right > rc.right - 6 ? rc.right - 6 - r.right : r.left < rc.left + 6 ? rc.left + 6 - r.left : 0;
      if (passa) rot.style.transform = `translateX(${passa.toFixed(0)}px)`;
    }
  }, 350);

  function montarLugar() {
    cena?.desmontar();
    const lugar = caso.lugares[st.lugar];
    const geo = geografia(lugar.geo);
    definirTempo(lugar.tempo);
    definirSomDoLugar(st.lugar);
    const fundo = document.getElementById('cenario');
    if (fundo) { fundo.style.backgroundImage = `url('${geo.imagem}')`; fundo.dataset.url = geo.imagem; }
    palco.innerHTML = '';
    cena = montarCena(palco, {
      cla: p.ficha?.cla, sprite: p.sprite, imagem: geo.imagem, lugar: lugar.geo, inicio: st.posicoes[st.lugar] || lugar.inicio,
      pontos: pontosDo(st.lugar), gente: genteDo(st.lugar), comentarios: lugar.comentarios,
      comentar: (c) => { if (st.comentados.includes(c.id)) return false; st.comentados.push(c.id); salvar(); return true; },
      tempo: lugar.tempo, fome: st.fome, nome: p.nome, painel: tela.querySelector('.painel-pergunta'),
      // Rodada 46: a gente do caso maior e a câmera mais perto, menos onde a pintura já é de perto (perto: false).
      aproximar: lugar.perto === false ? null : { figuras: 1.4, niveis: [1.15, 1.45, 1.75] },
      aoFalar: (voz, texto) => anotar(voz, texto),
      aoPausa: (pausado) => tela.querySelector('.botao-pausa')?.setAttribute('aria-pressed', String(!!pausado)),
      aoInteragir: (pt) => {
        if (fuga) return; // na perseguição, tocar em quem foge só faz correr atrás dele
        if (st.resolvido) { telaFinal(); return; }
        if (checarAmanhecer()) return;
        if (pt.tipo === 'pessoa') conversar(pt.caso?.id || pt.id.replace(/^pessoa-/, ''));
        else if (pt.tipo === 'detalhe') examinar(pt.id);
        else if (pt.tipo === 'cacar') cacar();
        else if (pt.tipo === 'saida' && pt.destino) irPara(pt.destino);
        else if (pt.tipo === 'saida') viajar();
      },
      aoTecla: (ev) => {
        if (fuga) return;
        const k = ev.key.toLowerCase();
        if (k === 'q') { ev.preventDefault(); abrirOQuadro(); } else if (k === 'm') { ev.preventDefault(); viajar(); } else if (k === 'f') { ev.preventDefault(); verFicha(); } else if (k === 'h') { ev.preventDefault(); alternarPaineis(); } else if (k === '?') { ev.preventDefault(); ajuda(); }
      },
    });
    desenharHud();
    atualizarCena();
  }

  // --- Perseguição --------------------------------------------------------------------------------
  function comecarFuga() {
    if (fuga || st.lugar !== caso.perseguicao.lugar) return;
    const cfg = caso.perseguicao;
    const poderes = { rapidez: R.temPoder(calc, 'ligeireza') || R.temDisciplina(calc, ['rapidez', 1]), compelir: R.temPoder(calc, 'compelir') };
    fuga = 'começando';
    atualizarCena(); // os balões de assunto somem durante a fuga
    // Banco: marca o começo da corrida (o "pego" só vale entre 4 e 60 s depois).
    if (banco) F.comecoDaPerseguicao(caso.id, p.id).catch(() => {});
    fuga = iniciarPerseguicao({
      cena, palco, camadas: tela, cfg, nome: caso.pessoas[cfg.pessoa].nome, poderes,
      aoUsarSangue: (nome) => usarSangue(nome),
      aoGastarVontade: () => {
        if (st.vontade <= 0) return false;
        st.vontade -= 1;
        anotar('FORÇA DE VONTADE', 'Você força o passo.');
        salvar();
        desenharHud();
        return true;
      },
      aoFim: async (resultado, pos) => {
        fuga = null;
        if (banco) {
          // ETAPA C: o banco ainda confia no navegador para "pego" ou "escapou"; "dados" é rolado lá.
          const rb = await noBanco(() => F.fimDaPerseguicao(caso.id, p.id, resultado));
          if (!rb) return;
          let prefixoB = '';
          if (rb.teste?.res) {
            await cerimonia(rb.teste.pool, rb.teste.dif, rb.teste.res);
            prefixoB = `${R.cabecaDoTeste(rb.teste.pool, rb.teste.dif, rb.teste.res)} Você deixa o corpo correr sozinho, pelo instinto.\n\n`;
          }
          if (rb.resultado === 'pego') st.posPessoas[cfg.pessoa] = [pos.x, pos.y];
          else cena?.esconderPessoa(cfg.pessoa);
          await depoisDaAcao(rb);
          cena?.centrarCamera();
          caixa({ rotulo: rb.resultado === 'pego' ? 'Pego' : 'Ele escapou', texto: `${prefixoB}${rb.texto || ''}`, revelar: true, opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] });
          return;
        }
        let final = resultado;
        let prefixo = '';
        let min = caso.custo.perseguicao;
        if (resultado === 'dados') {
          const res = R.rolar({ calc, pool: cfg.dados.pool, dif: cfg.dados.dif, fome: st.fome });
          await cerimonia(cfg.dados.pool, cfg.dados.dif, res);
          final = R.deuCerto(res) ? 'pego' : 'escapou';
          prefixo = `${R.cabecaDoTeste(cfg.dados.pool, cfg.dados.dif, res)} Você deixa o corpo correr sozinho, pelo instinto.\n\n`;
          min = caso.custo.dados;
        }
        const r = final === 'pego' ? cfg.pego : cfg.escapou;
        if (final === 'pego') {
          st.posPessoas[cfg.pessoa] = [pos.x, pos.y];
        } else {
          st.escondidos.push(cfg.pessoa);
          cena?.esconderPessoa(cfg.pessoa);
        }
        passarTempo(min);
        aplicar(r);
        cena?.centrarCamera();
        caixa({ rotulo: final === 'pego' ? 'Pego' : 'Ele escapou', texto: `${prefixo}${r.texto}`, revelar: true, opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] });
      },
    });
  }

  // --- Quadro e acusação ------------------------------------------------------------------------
  function abrirOQuadro() {
    const novas = new Set(st.novas);
    st.novas = [];
    salvar();
    desenharHud();
    const camada = abrirQuadro(tela, {
      caso, achados: achados(), novas, escolhas: st.escolhas, erros: st.tentativas.length, custoErro: caso.custo.acusacaoErrada,
      aoMudar: (e) => { st.escolhas = e; salvar(); desenharHud(); },
      aoAcusar: acusar,
    });
    // Ao fechar o quadro, o sol pode ter chegado (uma acusação errada gasta tempo).
    const fecharQuadro = camada.fechar;
    camada.fechar = () => { fecharQuadro(); setTimeout(checarAmanhecer, 50); };
  }
  async function acusar(e) {
    if (st.resolvido) return { certo: true };
    const linhas = caso.lacunas.map((l) => `<li><b>${esc(l.rotulo)}:</b> ${esc(caso.palavras[l.id].find((w) => w.id === e[l.id])?.texto || '')}</li>`).join('');
    const r = await perguntar(tela, {
      rotulo: 'Acusar diante da Xerife',
      texto: `<p>Você vai dizer à Xerife Iolanda:</p><ul class="lista-acusacao">${linhas}</ul><p class="nota">Se estiver errado, você perde ${duracao(caso.custo.acusacaoErrada)} da noite.</p>`,
      opcoes: ['Acusar', 'Ainda não'],
    });
    if (r !== 0) return null;
    if (banco) {
      // A resposta nunca vem ao navegador: o banco só diz "certo", "errado" ou "quase".
      const rb = await noBanco(() => F.acusar(caso.id, p.id, e));
      if (!rb) return null;
      aplicarBanco(rb);
      if (rb.certo) {
        banco.fecho = rb.fecho || null;
        banco.ranking = await F.rankingDoCapitulo(caso.id).catch(() => banco.ranking);
        som.acorde?.();
        setTimeout(fecho, 350);
        return { certo: true };
      }
      som.teste?.(false, true);
      anotar('XERIFE IOLANDA', 'Não fecha. Volte com provas.');
      return {
        certo: false, erros: rb.erros,
        mensagem: rb.quase
          ? `Quase. A Xerife ouve e balança a cabeça: uma das três respostas não fecha. Você perde ${duracao(rb.minutos)}.`
          : `Não fecha. A Xerife cruza os braços e manda você voltar com provas. Você perde ${duracao(rb.minutos)}.`,
      };
    }
    const certas = caso.lacunas.filter((l) => e[l.id] === caso.resposta[l.id]).length;
    if (certas === caso.lacunas.length) {
      st.resolvido = { hora: st.hora, noites: st.noites };
      salvar();
      som.acorde?.();
      setTimeout(fecho, 350);
      return { certo: true };
    }
    st.tentativas.push({ hora: st.hora, certas });
    passarTempo(caso.custo.acusacaoErrada);
    som.teste?.(false, true);
    anotar('XERIFE IOLANDA', 'Não fecha. Volte com provas.');
    return {
      certo: false, erros: st.tentativas.length,
      mensagem: certas === caso.lacunas.length - 1
        ? `Quase. A Xerife ouve e balança a cabeça: uma das três respostas não fecha. Você perde ${duracao(caso.custo.acusacaoErrada)}.`
        : `Não fecha. A Xerife cruza os braços e manda você voltar com provas. Você perde ${duracao(caso.custo.acusacaoErrada)}.`,
    };
  }

  // --- Fim do capítulo ----------------------------------------------------------------------------
  async function fecho() {
    fecharTudo();
    if (banco) {
      // O fecho (com a variante pela cena de ação) vem do banco, só depois de acertar.
      if (!banco.fecho) banco.fecho = await noBanco(() => F.fecho(caso.id, p.id));
      const f = banco.fecho;
      if (!f) return;
      caixa({
        rotulo: `${caso.titulo} · a verdade`, fechavel: false, revelar: true,
        html: quadrinhos(f.paineis || [], { cenario: 'img/cidade/lapa.jpg' }).replace('hq hq-1', 'hq hq-tira hq-tira-1'),
        texto: f.texto || '',
        opcoes: (f.escolhas || []).map((x) => ({ html: esc(x.rotulo), fn: async (cam) => {
          const fim = await noBanco(() => F.escolherFinal(caso.id, p.id, x.id));
          if (!fim) return;
          banco.final = fim;
          st.final = fim.id;
          salvar();
          cam.fechar();
          telaFinal();
        } })),
      });
      return;
    }
    const s = achados();
    const variante = s.has('tiao-pego') ? 'pego' : s.has('tiao-fugiu') ? 'fugiu' : 'solto';
    caixa({
      rotulo: `${caso.titulo} · a verdade`, fechavel: false, revelar: true,
      html: quadrinhos(caso.fecho.paineis, { cenario: 'img/cidade/lapa.jpg' }).replace('hq hq-1', 'hq hq-tira hq-tira-1'),
      texto: caso.fecho.texto[variante],
      opcoes: caso.fecho.escolhas.map((x) => ({ html: esc(x.rotulo), fn: (cam) => { st.final = x.id; salvar(); cam.fechar(); telaFinal(); } })),
    });
  }

  function placar() {
    const fim = caso.relogio.fim;
    const lista = caso.rivais.filter((rv) => rv.acertou).map((rv) => ({ nome: rv.acertou.nome, hora: rv.acertou.hora, noites: 1 }));
    lista.push({ nome: p.nome, hora: st.resolvido.hora, noites: st.resolvido.noites, voce: true });
    lista.sort((a, b) => a.noites - b.noites || a.hora - b.hora);
    const pos = lista.findIndex((x) => x.voce) + 1;
    const prestigio = Math.max(0, 10 + ({ 1: 5, 2: 3, 3: 1 }[pos] || 0) + Math.floor(Math.max(0, fim - st.resolvido.hora) / 30) * (st.resolvido.noites === 1 ? 1 : 0) - 2 * st.tentativas.length);
    return { lista, pos, prestigio };
  }

  // Banco: a nota de proficiência, os selos e o ranking do capítulo (sem rivais fictícios).
  const SELOS = { 'sem-erros': 'sem erros', 'sem-dicas': 'sem dicas', detetive: 'detetive', primeiro: 'primeiro a resolver', 'mais-rapido': 'mais rápido do capítulo' };
  async function telaFinalBanco() {
    if (!banco.final && st.final) banco.final = await noBanco(() => F.escolherFinal(caso.id, p.id, st.final));
    if (!banco.final) { fecho(); return; }
    banco.ranking = await F.rankingDoCapitulo(caso.id).catch(() => banco.ranking);
    const e = banco.estado;
    const resolvidos = banco.ranking.filter((x) => x.resolvido_em);
    const html = `
      <div class="texto-narracao">${narracao(banco.final.texto || '')}</div>
      <p class="consequencia"><b>Na semana seguinte:</b> ${esc(banco.final.efeito || '')}</p>
      <section class="placar" aria-label="Ranking do capítulo">
        <h3>Ranking do capítulo</h3>
        <ol>${resolvidos.map((x, i) => `<li class="${x.voce ? 'voce' : ''}"><span class="placar-pos">${i + 1}º</span><b>${esc(x.nome)}</b><small>${x.nota} pontos${x.erros ? ` · ${x.erros} ${x.erros > 1 ? 'erros' : 'erro'}` : ''}</small></li>`).join('')}</ol>
        <dl class="placar-numeros">
          <div><dt>Sua nota</dt><dd>${e.nota ?? '—'} de 1000</dd></div>
          <div><dt>Selos</dt><dd>${(e.selos || []).map((s) => esc(SELOS[s] || s)).join(', ') || 'nenhum'}</dd></div>
          <div><dt>Pistas achadas</dt><dd>${(e.pistas || []).length}</dd></div>
          <div><dt>Acusações erradas</dt><dd>${e.acusacoes_erradas}</dd></div>
        </dl>
      </section>`;
    caixa({
      rotulo: `${caso.titulo} · fim do capítulo`, html, fechavel: true,
      opcoes: [
        { html: 'Ver o quadro de pistas', fn: (cam) => { cam.fechar(); abrirOQuadro(); } },
        { html: 'Voltar à temporada', fn: (cam) => { cam.fechar(); cena?.desmontar(); location.hash = '#/temporada'; } },
        { html: 'Andar pela cena', classe: 'sair', fn: (cam) => cam.fechar() },
      ],
    });
  }

  function telaFinal() {
    fecharTudo();
    if (banco) { telaFinalBanco(); return; }
    const escolha = caso.fecho.escolhas.find((x) => x.id === st.final);
    if (!escolha) { fecho(); return; }
    const { lista, pos, prestigio } = placar();
    const nPistas = st.achados.filter((id) => caso.pistas[id] && !caso.pistas[id].marca).length;
    const total = Object.values(caso.pistas).filter((x) => !x.marca).length;
    const html = `
      <div class="texto-narracao">${narracao(escolha.texto)}</div>
      <p class="consequencia"><b>Na semana seguinte:</b> ${esc(escolha.efeito)}</p>
      <section class="placar" aria-label="Placar do capítulo">
        <h3>Placar do capítulo</h3>
        <ol>${lista.map((x, i) => `<li class="${x.voce ? 'voce' : ''}"><span class="placar-pos">${i + 1}º</span><b>${esc(x.nome)}</b><small>${x.noites > 1 ? `${x.noites} noites · ` : ''}${hora(x.hora)}</small></li>`).join('')}</ol>
        <p class="nota">Corvo e Dandara são rivais fictícios desta demonstração. No jogo de verdade, aqui aparecem os amigos que estão no mesmo capítulo.</p>
        <dl class="placar-numeros">
          <div><dt>Sua posição</dt><dd>${pos}º lugar</dd></div>
          <div><dt>Prestígio</dt><dd>${prestigio} pontos</dd></div>
          <div><dt>Pistas achadas</dt><dd>${nPistas} de ${total}</dd></div>
          <div><dt>Acusações erradas</dt><dd>${st.tentativas.length}</dd></div>
        </dl>
      </section>`;
    caixa({
      rotulo: `${caso.titulo} · fim do capítulo`, html, fechavel: true,
      opcoes: [
        { html: 'Ver o quadro de pistas', fn: (cam) => { cam.fechar(); abrirOQuadro(); } },
        { html: 'Jogar o caso de novo, do zero', fn: (cam) => { cam.fechar(); recomecar(); } },
        { html: 'Andar pela cena', classe: 'sair', fn: (cam) => cam.fechar() },
      ],
    });
  }

  function amanhecer() {
    caixa({
      rotulo: 'O sol vai nascer', fechavel: false,
      texto: `[A FOME] O céu clareia sobre o Rio. Se eu ficar na rua, o sol me queima.

Você volta ao refúgio e dorme o dia inteiro. No jogo de verdade, a investigação continua na noite seguinte, que é o dia seguinte de verdade. A corrida não para: os outros também voltam.`,
      opcoes: [
        { html: 'Dormir e continuar na noite seguinte', fn: async (cam) => {
          cam.fechar();
          if (banco) {
            amanheceuPendente = false;
            const r = await noBanco(() => F.novaNoite(caso.id, p.id));
            if (!r) return;
            aplicarBanco(r);
            amanheceuPendente = false;
            anotar('A FOME', r.fomeSobe ? `Noite ${st.noites}. Acordar me deu mais fome.` : `Noite ${st.noites}. Acordei quieta.`);
            faixa('faixa-chegada', `Noite ${st.noites}`, caso.lugares[st.lugar].nome);
            return;
          }
          st.noites += 1;
          st.hora = caso.relogio.inicio;
          const d = R.despertar();
          if (d.fomeSobe) st.fome = Math.min(5, st.fome + 1);
          salvar();
          anotar('A FOME', d.fomeSobe ? `Noite ${st.noites}. Acordar me deu mais fome.` : `Noite ${st.noites}. Acordei quieta.`);
          desenharHud();
          faixa('faixa-chegada', `Noite ${st.noites}`, caso.lugares[st.lugar].nome);
        } },
        ...(banco ? [] : [{ html: 'Recomeçar o caso do zero', fn: (cam) => { cam.fechar(); recomecar(); } }]),
      ],
    });
  }

  function recomecar() {
    try { localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ }
    st = novo();
    salvar();
    listaRegistro.innerHTML = '';
    fecharTudo();
    montarLugar();
    abertura();
  }

  // --- Abertura, ajuda, ficha, menu ---------------------------------------------------------------
  // A tira da abertura: três quadros pintados (img/caso/), com legenda e balão por cima. No primeiro, a
  // luz da sirene pisca de leve; no segundo, o quadro aproxima o celular, para as duas marcas se lerem.
  function tiraAbertura() {
    const [p1, p2, p3] = caso.abertura.paineis;
    const balao = (b) => (b ? `<div class="balao balao-0"><b>${esc(String(b.quem).toUpperCase())}</b>${esc(b.texto)}</div>` : '');
    const legenda = (p) => `<figcaption class="legenda">${esc(p.legenda)}</figcaption>`;
    return `
      <div class="hq hq-tira tira-abertura">
        <figure class="painel painel-sirene">
          <div class="painel-cenario" style="background-image:url('img/caso/abertura-1.jpg');background-size:cover;background-position:center"></div>
          <span class="sirene" aria-hidden="true"></span>
          ${legenda(p1)}${balao(p1.baloes?.[0])}
        </figure>
        <figure class="painel">
          <div class="painel-cenario" style="background-image:url('img/caso/abertura-2.jpg');background-size:162% auto;background-position:49% 44%"></div>
          ${legenda(p2)}${balao(p2.baloes?.[0]).replace('balao balao-0', 'balao balao-0 balao-direita')}
        </figure>
        <figure class="painel">
          <div class="painel-cenario" style="background-image:url('img/caso/abertura-3.jpg');background-size:cover;background-position:center"></div>
          ${legenda(p3)}${balao(p3.baloes?.[0])}
        </figure>
      </div>`;
  }
  function abertura() {
    caixa({
      rotulo: `${caso.rotulo} · ${caso.titulo}`, revelar: true, fechavel: false,
      html: tiraAbertura(),
      texto: caso.abertura.texto,
      opcoes: [{ html: '<b>Começar a investigar</b>', fn: (cam) => { st.viuAbertura = true; salvar(); cam.fechar(); olharInicial(); setTimeout(ajuda, 200); } }],
    });
  }
  function ajuda() {
    caixa({
      rotulo: 'Como jogar o caso',
      html: `<ul class="ajuda-caso">${caso.ajuda.map((t) => `<li>${t}</li>`).join('')}</ul><p class="nota">${esc(caso.pergunta)}</p>`,
      opcoes: [{ html: 'Entendi', fn: (cam) => { cam.fechar(); olharInicial(); } }],
    });
  }
  function verFicha() {
    abrirJanela(tela, { titulo: p.nome, classe: 'janela-ficha', montar: (corpo) => { corpo.innerHTML = resumoFicha(p.ficha); } });
  }
  // Banco: a dica custa 60 pontos de proficiência, então o jogo pergunta antes e nunca entrega sozinho.
  async function pedirDica() {
    const certeza = await perguntar(tela, { rotulo: 'Quer uma dica?', texto: '<p>Uma dica aponta uma pista que você ainda não achou. Ela custa 60 pontos na sua nota do capítulo (um erro de acusação custa 200).</p>', opcoes: ['Quero a dica', 'Não'] });
    if (certeza !== 0) return;
    const r = await noBanco(() => F.dica(caso.id, p.id));
    if (!r) return;
    aplicarBanco(r);
    caixa({ rotulo: 'Dica', texto: r.texto ? `[MANHA] ${r.texto}` : 'Não há mais dicas: você já achou tudo o que elas apontam.', opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] });
  }
  async function menu() {
    if (banco) {
      const rb = await perguntar(tela, {
        rotulo: 'Mais opções',
        texto: `<p>${esc(caso.rotulo)} da temporada: o progresso fica guardado no servidor.</p>`,
        opcoes: [...(st.resolvido ? [] : ['Pedir uma dica']), 'Ver o ranking da temporada', 'Sair do caso', 'Voltar ao caso'],
      });
      const escolha = [...(st.resolvido ? [] : ['dica']), 'ranking', 'sair', 'voltar'][rb];
      if (escolha === 'dica') pedirDica();
      if (escolha === 'ranking') { cena?.desmontar(); location.hash = '#/temporada'; }
      if (escolha === 'sair') { cena?.desmontar(); location.hash = '#/temporada'; }
      return;
    }
    const r = await perguntar(tela, {
      rotulo: 'Mais opções',
      texto: `<p>${esc(caso.rotulo)}: o progresso fica só neste aparelho.</p>`,
      opcoes: ['Recomeçar o caso do zero', 'Sair do caso', 'Voltar ao caso'],
    });
    if (r === 0) {
      const certeza = await perguntar(tela, { rotulo: 'Recomeçar', texto: '<p>Você perde as pistas e o tempo deste caso e começa às 22h, de novo.</p>', opcoes: ['Recomeçar do zero', 'Não'] });
      if (certeza === 0) recomecar();
    }
    if (r === 1) { cena?.desmontar(); location.hash = '#/noite'; }
  }
  function alternarPaineis() {
    paineisOcultos = !paineisOcultos;
    tela.classList.toggle('paineis-ocultos', paineisOcultos);
    try { localStorage.setItem('mascara.paineis', paineisOcultos ? 'ocultos' : 'visiveis'); } catch { /* sem armazenamento */ }
    window.dispatchEvent(new Event('resize'));
  }
  function corrida() {
    if (banco) {
      const resolvidos = banco.ranking.filter((x) => x.resolvido_em);
      caixa({
        rotulo: 'A corrida',
        texto: `Outros vampiros estão no mesmo capítulo. A nota vem do que você faz: errar a acusação pesa mais que demorar.\n\n${resolvidos.length ? resolvidos.map((x) => `[CORRIDA] ${x.voce ? 'Você' : x.nome} resolveu: ${x.nota} pontos.`).join('\n\n') : 'Ninguém resolveu ainda.'}`,
        opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }],
      });
      return;
    }
    const vistos = caso.rivais.filter((_, i) => st.rivais.includes(i));
    caixa({
      rotulo: 'A corrida',
      texto: `Outros vampiros estão no mesmo caso. Quem acertar a dedução primeiro ganha mais Prestígio e larga na frente no capítulo seguinte.\n\n${vistos.length ? vistos.map((x) => `[CORRIDA] ${x.texto}`).join('\n\n') : 'Ainda não há notícia dos outros.'}`,
      html: '',
      opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }],
    });
  }

  tela.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-hud]');
    if (!b || (camadaAberta() && !b.closest('.hud-topo, .painel-retrato'))) return;
    if (fuga && !['pausa', 'som', 'centrar', 'visao'].includes(b.dataset.hud)) return;
    if (camadaAberta()) fecharTudo();
    switch (b.dataset.hud) {
      case 'quadro': abrirOQuadro(); break;
      case 'viajar': viajar(); break;
      case 'ficha': verFicha(); break;
      case 'ajuda': ajuda(); break;
      case 'menu': menu(); break;
      case 'corrida': corrida(); break;
      case 'paineis': alternarPaineis(); break;
      case 'visao': cena?.visaoGeral(); break;
      case 'centrar': cena?.centrarCamera(); break;
      case 'pausa': cena?.alternarPausa(); break;
      case 'som': som.alternar(); b.setAttribute('aria-pressed', String(som.ligado())); break;
      default: break;
    }
  });
  void efeitos;

  if (banco) {
    await lerLugar(st.lugar);
    banco.ranking = await F.rankingDoCapitulo(caso.id).catch(() => []);
    // Tempo ativo: um pulso a cada 60 s com a aba visível; para sozinho quando a tela sai.
    const parar = F.iniciarPulso(caso.id, p.id);
    const vigiar = setInterval(() => { if (!tela.isConnected) { parar(); clearInterval(vigiar); } }, 5000);
    if (banco.semNumeros) avisar('faixa-evento', 'Ficha', 'Sua ficha ainda não tem os números do Narrador: os testes não vão rolar até ele ativá-la de novo.');
  }
  montarLugar();
  if (!st.viuAbertura) abertura();
  else if (st.resolvido && st.final) telaFinal();
  else if (st.resolvido) fecho();
  else if (st.hora >= caso.relogio.fim) amanhecer();
}
