// Tela do caso (formato v3, etapa A): um capítulo jogado na hora, sem esperar o Narrador.
// Abertura em HQ → investigação nos lugares pintados (examinar, conversar, usar o sangue) →
// perseguição → dedução no quadro de pistas → escolha final e placar.
// Demonstração: nada vai ao banco. O progresso fica só neste aparelho (localStorage) e pode ser recomeçado.
import * as v5 from '../motor/v5.js';
import { CENAS, clasSugeridos, montarFicha } from '../motor/roteiro.js';
import * as R from './regras.js';
import { CASO } from './demo-beco.js';
import { abrirQuadro, palavrasLiberadas } from './quadro.js';
import { abrirMapaRota, abrirArquivo, relogioArco, miniRastro, fotoPrisao } from './rota.js';
import { icone } from './icones.js';
import { cerimoniasCurtas } from '../leitura.js';
import { iniciarPerseguicao } from './perseguicao.js';
import { iniciarInfiltracao } from './infiltracao.js';
import { abrirConfronto, turnoDoConfronto, escolhasDo, vitalidadeDe, ataqueDe } from './confronto.js';
import { rolarParada } from '../motor/dados.js';
import { montarCena } from '../jogo/cena.js';
import { geografia } from '../jogo/lugares.js';
import { abrirDialogo, abrirJanela, perguntar, confirmarEscolha, camadaAberta, fecharTudo } from '../jogo/camadas.js';
import { perguntaPor, ROTULO_PERGUNTA } from './pergunta.js';
import { narracao, quadrinhos, esc, aviso, grupoVoz, escreverPalavras } from '../ui.js';
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
const duracao = (min) => { const h = Math.floor(min / 60); const m = min % 60; return h ? `${h}h${m ? doisDigitos(m) : ''}` : `${m} min`; }; // espaço sem quebra: "30 min" não se separa

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
    pistas: {}, exames: {}, cacada: pub.cacada, perseguicao: pub.perseguicao || {}, infiltracao: pub.infiltracao, confronto: pub.confronto, rivais: [], eventos: [],
    // Formato rota (a fuga pela cidade): o mapa inteiro, a tabela de viagens e o Arquivo público da Ciranda.
    formato: pub.formato || 'caso', ordem: pub.ordem || Object.keys(pub.lugares || {}), tempos: pub.tempos || [],
    arquivo: pub.arquivo || null, tamanhoRota: pub.tamanhoRota || 0, reliquia: pub.reliquia || null,
    mecanicas: pub.mecanicas || {}, novidades: [pub.novidade, ...(pub.extras || [])].filter(Boolean),
    tempo: pub.tempo || null,
  };
}

// opcoes.capitulo: o capítulo da temporada (no banco). Sem ele, a demonstração no navegador, como antes.
export async function telaCaso(raiz, estadoApp, opcoes = {}) {
  // opcoes.vitrine: o modo vitrine (só no localhost), com as regras do banco simuladas aqui e a vampira fictícia.
  const F = opcoes.capitulo ? await import(opcoes.vitrine ? './fonte-vitrine.js' : './fonte-banco.js') : null;
  // Na vitrine não há temporada nem login: voltar é recomeçar o capítulo de teste.
  const voltarPara = opcoes.vitrine ? `#/vitrine/${encodeURIComponent(opcoes.capitulo)}?zerar` : '#/temporada';
  const textoVoltar = opcoes.vitrine ? 'Recomeçar a vitrine' : 'Voltar à temporada';
  if (opcoes.vitrine) {
    const ficticia = personagemDoCaso(null);
    estadoApp = { ...estadoApp, atual: ficticia };
    F.usarNumeros(R.numeros(ficticia.ficha));
  }
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
  const rota = caso.formato === 'rota';
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
    resolvido: null, final: null, viuAbertura: false, registro: [], visitados: [], marcados: {},
  });
  if (opcoes.vitrine && F.recomecou()) try { localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ }
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
    <div class="tela-jogo bg2 tela-caso${rota ? ' carmen' : ''}${paineisOcultos ? ' paineis-ocultos' : ''}" style="--retrato:url('${esc(new URL(retrato, location.href).href)}')">
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
          <button type="button" class="hud-com-icone" data-hud="viajar" title="Lugares do caso (M)" aria-label="Lugares do caso"><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg><span class="hud-nome">${rota ? 'Mapa' : 'Lugares'} <kbd>M</kbd></span></button>
          ${rota ? `<button type="button" class="hud-com-icone" data-hud="arquivo" title="Arquivo dos suspeitos" aria-label="Arquivo">${icone('arquivo', { classe: 'hud-svg' })}<span class="hud-nome">Arquivo</span></button>` : ''}
          <button type="button" class="hud-com-icone hud-quadro" data-hud="quadro" title="${rota ? 'Pistas e registro (Q)' : 'Quadro de pistas (Q)'}" aria-label="${rota ? 'Pistas' : 'Quadro de pistas'}"><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="15" rx="1"/><path d="M7 8h4v4H7zM14 8h3M14 11h3M8 15l4-3 5 3"/></svg><span class="hud-nome">${rota ? 'Pistas' : 'Quadro'} <kbd>Q</kbd></span><span class="hud-contador" data-contador hidden></span></button>
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
        ${rota ? '<span class="gotas" aria-label="Fome"></span>' : ''}
        <div class="barras"></div>
      </aside>
      ${rota ? '<div class="lugar-titulo"><b data-lugar-titulo></b><small data-lugar-marcas></small></div>' : ''}
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
  // Carmen 2026, celular: a pílula do caso ("Onde? · Quem?") também abre a folha.
  painelBaixo.addEventListener('click', (ev) => { if (ev.target.closest('.quadro-resumo') && !painelBaixo.classList.contains('folha-aberta')) alca.click(); });
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
    // Carmen 2026 (7.2): as últimas linhas aparecem embaixo à esquerda e somem depois de 6 s. No computador, a linha
    // longa fica o tempo de ler: 2,5 s mais 45 ms por letra (a chegada, uns 16 s); o primeiro clique na cena encurta.
    if (rota) {
      tela.classList.remove('registro-quieto');
      clearTimeout(anotar.quieto);
      const ms = document.body.classList.contains('celular') ? 6000 : Math.max(6000, 2500 + 45 * texto.length);
      anotar.quieto = setTimeout(() => tela.classList.add('registro-quieto'), ms);
      anotar.longo = ms > 6000;
    }
  }
  listaRegistro.innerHTML = st.registro.map(linhaHtml).join('');
  if (rota) anotar.quieto = setTimeout(() => tela.classList.add('registro-quieto'), 6000);
  if (rota) palco.addEventListener('pointerdown', () => {
    if (!anotar.longo) return;
    anotar.longo = false;
    clearTimeout(anotar.quieto);
    anotar.quieto = setTimeout(() => tela.classList.add('registro-quieto'), 2000);
  });

  function faixa(classe, rotulo, texto) {
    const el = document.createElement('div');
    el.className = `faixa-caso ${classe}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<b>${esc(rotulo)}</b> ${esc(texto)}`;
    tela.querySelectorAll(`.faixa-caso.${classe}`).forEach((x) => x.remove());
    tela.appendChild(el);
    // A dica fica mais tempo: é para ler.
    const dura = classe === 'faixa-dica' ? 5600 : 2600;
    setTimeout(() => el.classList.add('saindo'), dura);
    setTimeout(() => el.remove(), dura + 600);
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
  // No formato rota, o cartãozinho diz só o tipo (destino ou traço), nunca se a pista é verdadeira ou isca.
  function voarPista(tipo = null) {
    const alvo = [...tela.querySelectorAll('.hud-botoes [data-hud="quadro"]')].find((b) => b.offsetParent);
    if (!alvo || cerimoniasCurtas()) return;
    const rt = tela.getBoundingClientRect();
    const ra = alvo.getBoundingClientRect();
    const x0 = rt.width / 2;
    const y0 = rt.height * 0.32;
    const el = document.createElement('span');
    el.className = 'pista-voa';
    el.setAttribute('aria-hidden', 'true');
    if (rota && tipo) {
      el.classList.add('pista-voa-tipo');
      el.innerHTML = `${icone(tipo === 'destino' ? 'seta' : 'digital', { tam: 14 })}<b>${tipo === 'destino' ? 'destino' : 'traço'}</b>`;
    }
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

  // No celular, só as marcas que cabem numa linha no título; a lista inteira fica no mapa (avaliação, 02/11). Com os
  // painéis escondidos, o título não tem largura: a conta se refaz quando eles voltam.
  function marcasDoTitulo() {
    const marcasEl = tela.querySelector('[data-lugar-marcas]');
    if (!marcasEl) return;
    const todas = caso.lugares[st.lugar]?.marcas || [];
    marcasEl.textContent = todas.join(' · ');
    if (document.body.classList.contains('celular') && marcasEl.clientWidth) {
      for (let n = todas.length - 1; n > 0 && marcasEl.scrollWidth > marcasEl.clientWidth + 1; n--) marcasEl.textContent = todas.slice(0, n).join(' · ');
    }
  }
  function desenharHud() {
    const lugar = caso.lugares[st.lugar];
    tela.querySelector('[data-lugar-nome]').textContent = lugar.nome;
    tela.querySelector('[data-hora]').textContent = hora(st.hora);
    const titulo = tela.querySelector('[data-lugar-titulo]');
    if (titulo) {
      titulo.textContent = lugar.nome;
      marcasDoTitulo();
    }
    const gotas = Array.from({ length: 5 }, (_, i) => `<svg class="gota ${i < st.fome ? 'cheia' : ''}" viewBox="0 0 12 16"><path d="M6 1C8 5 11 7.5 11 10.5A5 5 0 0 1 1 10.5C1 7.5 4 5 6 1z"/></svg>`).join('');
    tela.querySelectorAll('.gotas').forEach((g) => { g.innerHTML = gotas; });
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
    // Formato rota: o relógio em arco da direção de arte (5.5), no lugar do disco de bronze.
    if (rota) { relogio.innerHTML = relogioArco({ inicio: caso.relogio.inicio, fim: caso.relogio.fim, hora: st.hora }); relogio.classList.add('com-arco'); }

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
    if (rota) {
      // A fuga: as duas perguntas sempre à vista (o parecer da avaliação), com o que já se tem de cada uma.
      const e = banco.estado;
      const destinos = (e.pistas || []).filter((x) => x.tipo === 'destino' && x.sobre == null).length;
      const nTracos = (e.categorias || e.tracos || []).length; // tipos de traço com pista, diretas ou indiretas
      const lic = e.licenca ? caso.arquivo?.suspeitos.find((x) => x.id === e.licenca) : null;
      caixaCaso.innerHTML = `
      <div class="quadro-cabeca"><span class="plano-marca" aria-hidden="true">${nPistas}</span><span><b>${esc(caso.titulo)}</b> · noite ${st.noites}</span></div>
      <p class="quadro-resumo">Onde? <b>${destinos}</b> · Quem? <b>${lic ? 'Licença' : `${Math.min(nTracos, 3)} de 3`}</b></p>
      <ol class="quadro-linhas">
        <li class="${destinos ? 'ok' : 'falta'}"><button type="button" data-hud="viajar"><span class="quadro-nome">Para onde foi?</span><span class="quadro-valor">${destinos ? `${destinos} pista${destinos > 1 ? 's' : ''} de destino` : 'ouça as testemunhas'}</span></button></li>
        <li class="${lic ? 'ok' : nTracos >= 3 ? 'falta' : 'opcional'}"><button type="button" data-hud="arquivo"><span class="quadro-nome">Quem é?</span><span class="quadro-valor">${lic ? `Licença contra ${esc(lic.apelido || lic.nome)}` : nTracos > 3 ? `${nTracos} traços (bastam 3)` : `${nTracos} de 3 traços`}</span></button></li>
        ${(banco?.ranking || []).some((x) => !x.voce) ? `<li class="opcional"><button type="button" data-hud="corrida"><span class="quadro-nome">Corrida</span><span class="quadro-valor">${esc(corridaDaRota())}</span></button></li>` : ''}
        <li class="opcional"><button type="button" data-hud="viajar"><span class="quadro-nome">Rastro</span><span class="quadro-valor">${(e.percurso || []).length} de ${caso.tamanhoRota} lugares${e.viagens_erradas ? ` · ${e.viagens_erradas} errad${e.viagens_erradas > 1 ? 'as' : 'a'}` : ''}</span></button></li>
      </ol>
      <div class="quadro-pe"><span>${st.resolvido ? `Resolvido às ${hora(st.resolvido.hora)}` : `Faltam ${duracao(resta)} até o sol`}</span><button type="button" class="btn plano-enviar${nTracos >= 3 && !lic && !st.resolvido ? ' destaque' : ''}" data-hud="arquivo">Arquivo</button></div>`;
    }
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
      const lugarDasPistas = rota ? 'em Pistas' : 'no quadro';
      avisar('faixa-pista', `${novas.length > 1 ? 'Pistas novas' : 'Pista nova'} ${lugarDasPistas}`, novas.join(' · '), () => { if (rota) som.carmen?.('pista'); else som.reacao?.('pista', 0); voarPista(); });
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
    // Formato rota: onde cada pista de destino foi ouvida, para a coluna "Para onde foi?" do mapa.
    if (rota) for (const x of r.novas || []) if (x.tipo === 'destino') { st.ouvidas ||= {}; st.ouvidas[x.id] ??= r.estado?.lugar || st.lugar; }
    if (rota && r.novas?.length) novasDaFala = r.novas;
    if (novas.length) {
      anotar('PISTA NOVA', novas.join(' · '));
      const tipo = r.novas?.[0]?.tipo;
      // No Carmen não há quadro: o lugar das pistas se chama Pistas (avaliação, etapa 7).
      const faixa = rota ? (novas.length > 1 ? 'Pistas novas em Pistas' : 'Pista nova em Pistas') : novas.length > 1 ? 'Pistas novas no quadro' : 'Pista nova no quadro';
      avisar('faixa-pista', faixa, novas.join(' · '), () => { if (rota) som.carmen?.('pista'); else som.reacao?.('pista', 0); voarPista(tipo); });
      if (r.novas.some((x) => x.tipo === 'destino')) dica('mapa', 'Essa pista fala do próximo lugar. Abra o Mapa e viaje para lá.');
      if (r.novas.some((x) => x.tipo === 'traco')) dica('arquivo', 'Essa pista diz como a presa é. No Arquivo, marque o traço: as fichas que não batem saem.');
    }
    const depois = palavrasLiberadas(caso, achados());
    const abriu = caso.lacunas.filter((l) => depois[l.id].length > antes[l.id].length);
    if (abriu.length) avisar('faixa-deducao', 'Dedução', `nova opção em “${abriu.map((l) => l.rotulo.toLowerCase()).join('” e “')}”`);
    // Formato rota: as iscas são ensinadas na primeira vez que há pistas de destino para comparar (parecer da avaliação).
    if (rota && caso.mecanicas.isca && !st.iscaEnsinada && (r.estado?.pistas || []).filter((x) => x.tipo === 'destino').length >= 3) {
      st.iscaEnsinada = true;
      const n = caso.novidades.find((x) => x.id === 'isca');
      setTimeout(() => caixa({ rotulo: n?.titulo || 'As iscas do ladrão', texto: `${n?.texto || ''}\n\n[INTUIÇÃO] Duas pistas falam de um lugar, uma fala de outro. Alguém está mentindo: siga a maioria.`, opcoes: [{ html: 'Entendi', fn: (c) => c.fechar() }] }), 900);
    }
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
    if (a.cena) return { pode: true, etiqueta: 'você joga a cena (ou deixa os dados)' };
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
      // Etapa C: a abordagem é uma cena de infiltração. O banco sorteia a semente e, no fim, refaz a cena
      // com o caminho para conferir o "conseguiu". "Deixar os dados decidirem" cai no teste de sempre.
      if (a.cena === 'infiltracao' && caso.infiltracao) {
        await introDaInfiltracao(caso.infiltracao);
        const ini = await noBanco(() => F.infiltracao(caso.id, p.id, chave, a.i, 'inicio'));
        if (!ini) return;
        const fim = await jogarInfiltracao(caso.infiltracao, ini.semente);
        if (fim !== 'dados') {
          const rc = await noBanco(() => F.infiltracao(caso.id, p.id, chave, a.i, fim, fim === 'conseguiu' ? banco.ultimaCena : { vigia: banco.ultimaCena?.vigia || null }));
          if (!rc) return;
          await depoisDaAcao(rc);
          const abertura = rc.ok ? '[FURTIVIDADE] Ninguém repara em você.'
            : fim === 'distraido' ? 'Você saiu da cena, e nesse momento alguém viu você.' : '';
          aoResultado([abertura, rc.texto].filter(Boolean).join('\n\n'), rc.ok, null);
          return;
        }
      }
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
  const figuraDe =(pid) => { const f = figuraDoCaso(pid); return f ? figuraLeve(`img/gente/${f}.png`) : ''; };
  // Formato rota (Lugar 5 e Conversa 1 do "Caminho até o 10"): quem não tem figura própria ganha uma genérica fixa,
  // diferente das outras do mesmo lugar. O corpo na cena, o rosto redondo e o cartão usam a mesma; o retrato é a
  // silhueta dela, para não fingir que a figura genérica é o rosto da testemunha.
  // Só figuras sem farda nem ofício, para não contradizer o ofício escrito no cartão; o gênero vem do tratamento
  // ("Dona", "Seu"), do ofício ("vendedora", "porteiro") ou, por último, da última letra do nome.
  const GENERICAS = { f: ['mulher-celular', 'mulher-guarda-chuva'], m: ['passante-teste', 'passante-celular'] };
  function generoDe(pe) {
    const nome = String(pe.nome || '').toLowerCase();
    if (/^(dona|tia|irmã|dra\.?|sra\.?|vó)\s/.test(nome)) return 'f';
    if (/^(seu|sr\.?|padre|mestre|dr\.?|sd\.?|tio|vô)\s/.test(nome)) return 'm';
    const oficio = String(pe.sub || '').toLowerCase().split(/[\s,·]/)[0];
    if (/(ora|eira|ina|esa|triz|ã)$/.test(oficio) || (/a$/.test(oficio) && !/ista$/.test(oficio))) return 'f';
    if (/(or|eiro|o|ês)$/.test(oficio)) return 'm';
    if (/\b(dona|freira|mãe)\b/.test(String(pe.sub || '').toLowerCase())) return 'f';
    return /[ai]$/.test(nome.split(/\s/)[0]) ? 'f' : 'm';
  }
  // Enquadre da silhueta em cabeça e ombros: proporção da figura, centro da cabeça (x) e alto da cabeça (y), medidos
  // nas imagens (no guarda-chuva, a cabeça fica abaixo da copa).
  const ENQUADRE = { 'passante-teste': [0.369, 0.507, 0], 'passante-celular': [0.306, 0.439, 0], 'mulher-celular': [0.428, 0.472, 0], 'mulher-guarda-chuva': [0.581, 0.5, 0.06] };
  // No retrato de 58 px, a copa do guarda-chuva engole a cabeça (um disco preto): essa figura serve só para o corpo, e o
  // retrato usa a silhueta da mulher do celular, espelhada (duas mulheres no mesmo lugar não ficam com o mesmo retrato).
  const RETRATO = { 'mulher-guarda-chuva': 'mulher-celular' };
  const enquadreDe = (pid) => {
    const fig = figuraDoCaso(pid);
    const r = RETRATO[fig];
    const [a, hx, ht] = ENQUADRE[r || fig] || [0.4, 0.5, 0];
    return `--a:${a};--hx:${hx};--ht:${ht}${r ? `;--rosto:url('${new URL(figuraLeve(`img/gente/${r}.png`), location.href).href}');--espelho:-1` : ''}`;
  };
  const sorteadas = {};
  function figuraDoCaso(pid) {
    const pe = caso.pessoas[pid];
    if (!pe) return null;
    if (pe.figura) return pe.figura;
    if (!rota) return FIGURAS_GENTE[pe.tipo]?.[0] || null;
    if (!sorteadas[pid]) {
      const doLugar = Object.values(caso.lugares).find((l) => l.pessoas?.includes(pid))?.pessoas || [pid];
      const usadas = new Set(doLugar.map((o) => caso.pessoas[o]?.figura).filter(Boolean));
      for (const o of doLugar) {
        if (caso.pessoas[o]?.figura || sorteadas[o]) continue;
        let h = 0;
        for (const c of o) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        const lista = GENERICAS[generoDe(caso.pessoas[o])];
        let f = lista[h % lista.length];
        for (let i = 1; usadas.has(f) && i < lista.length; i++) f = lista[(h + i) % lista.length];
        usadas.add(f);
        sorteadas[o] = f;
      }
    }
    return sorteadas[pid] || null;
  }
  let numCaixa = 0;
  // Formato rota: as pistas que a última resposta deu, para o marca-texto na frase que é pista (direção de arte, 5.4).
  let novasDaFala = [];
  // Palavras de 4 letras ou mais, sem acento, pelo radical de 5 letras (para "cigarro" casar com "cigarros", "tatuagem" com "tatuada").
  const palavrasDe = (t) => new Set((String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z]{4,}/g) || []).map((w) => w.slice(0, 5)));
  // A voz (régua do 10, conversa, item 5): a fala entra palavra por palavra, com um tique baixo, e um clique completa.
  // O marca-texto espera as palavras dele aparecerem.
  function digitarFala(raiz) {
    const p = raiz.querySelector('.dialogo-cena:not(.saindo) .dialogo-corpo p');
    if (!p || cerimoniasCurtas() || p.classList.contains('oculto')) return;
    p.classList.remove('pronto');
    const dur = escreverPalavras(p);
    for (const m of p.querySelectorAll('mark.marca-pista')) m.style.animationDelay = m.querySelector('.palavra')?.style.animationDelay || '0ms';
    let feito = false;
    const tique = setInterval(() => som.carmen?.('tecla'), 110);
    const completar = () => { if (feito) return; feito = true; clearInterval(tique); p.classList.add('pronto'); p.querySelectorAll('mark.marca-pista').forEach((m) => { m.style.animationDelay = '0ms'; }); };
    setTimeout(completar, dur);
    raiz.querySelector('.dialogo-cena:not(.saindo) .dialogo-corpo').addEventListener('click', completar, { once: true });
  }
  // Acha na fala a frase (ou o par de frases seguidas) que mais se parece com cada pista nova e a envolve num <mark>.
  function marcarPistas(raiz) {
    const falas = [...raiz.querySelectorAll('.dialogo-cena:not(.saindo) .dialogo-corpo p')];
    for (const pista of novasDaFala) {
      // O rótulo do tipo ("Sinal particular:") não está na fala: sai antes de comparar.
      const alvo = palavrasDe(String(pista.texto || pista.titulo || '').replace(/^[^:]{1,20}:\s*/, ''));
      if (!alvo.size) continue;
      let melhor = null;
      for (const f of falas) {
        for (const no of [...f.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)) {
          const texto = no.textContent;
          const frases = [...texto.matchAll(/[^.!?…]+[.!?…]*/g)].map((m) => {
            const pulo = m[0].match(/^[\s—–-]*/)[0].length;
            return { ini: m.index + pulo, fim: m.index + m[0].trimEnd().length };
          }).filter((x) => x.fim > x.ini);
          for (let i = 0; i < frases.length; i++) {
            for (const n of [1, 2]) {
              const ult = frases[i + n - 1];
              if (!ult) continue;
              const tem = palavrasDe(texto.slice(frases[i].ini, ult.fim));
              const nota = [...alvo].filter((w) => tem.has(w)).length / alvo.size - (n - 1) * 0.2;
              if (nota >= 0.4 && (!melhor || nota > melhor.nota)) melhor = { no, ini: frases[i].ini, fim: ult.fim, nota };
            }
          }
        }
      }
      if (!melhor) continue;
      const faixa = document.createRange();
      faixa.setStart(melhor.no, melhor.ini);
      faixa.setEnd(melhor.no, melhor.fim);
      const marca = document.createElement('mark');
      marca.className = 'marca-pista';
      faixa.surroundContents(marca);
    }
    novasDaFala = [];
  }
  // A conversa que segue com a mesma pessoa (formato rota): a caixa da pergunta fica aberta, à espera da resposta,
  // e a próxima caixa dessa pessoa toma o lugar dela sem sair nem entrar (movimento, item 3).
  let conversaMantida = null;
  function manterConversa(cam, pid) {
    conversaMantida = { cam, pid };
    cam.el.classList.add('esperando');
  }
  // Se a resposta não abriu outra caixa da mesma pessoa, a caixa mantida fecha como sempre.
  function soltarConversa(cam) {
    if (conversaMantida?.cam !== cam) return;
    conversaMantida = null;
    cam.fechar();
  }
  // opcoes: [{ html, fn, desligada, classe }]. revelar: fala por fala, com "Continuar".
  function caixa({ rotulo, html = '', texto = '', opcoes = [], revelar = false, fechavel = true, aoFechar, falante = null }) {
    const sobre = conversaMantida && falante && conversaMantida.pid === falante ? conversaMantida.cam : null;
    if (conversaMantida) { const velha = conversaMantida.cam; conversaMantida = null; if (velha !== sobre) velha.fechar(); }
    const lista = opcoes.length ? `<ol class="escolhas escolhas-caso">${opcoes.map((o, i) => `<li${o.classe ? ` class="${o.classe}"` : ''}><button type="button" data-escolha="${i}"${o.desligada ? ' disabled aria-disabled="true"' : ''}><span class="escolha-num">${i + 1}.</span> — ${o.html}</button></li>`).join('')}</ol>` : '';
    const chave = revelar ? `caso-${caso.id}-${Date.now()}-${numCaixa++}` : null;
    revelando = !!chave;
    const camada = abrirDialogo(tela, {
      rotulo, chave, fechavel, sobre,
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
      // No formato rota, só a figura da própria pessoa: a genérica do tipo repetiria o mesmo rosto em várias testemunhas.
      const src = pid && (!rota || caso.pessoas[pid].figura) ? figuraDe(pid) : '';
      const rosto = f.querySelector('.rosto');
      if (src && rosto) { rosto.classList.add('rosto-pintado'); rosto.innerHTML = `<img src="${esc(src)}" alt="">`; }
    }
    if (falante && figuraDe(falante)) {
      camada.el.classList.add('com-falante');
      camada.el.style.setProperty('--retrato-falante', `url('${new URL(figuraDe(falante), location.href).href}')`);
    }
    // Formato rota (direção de arte, 5.4): o retrato vira uma foto de papel, com o nome à mão na borda de baixo e o
    // ofício embaixo. Sem figura pintada, uma silhueta, nunca um quadrado vazio.
    const cartaoAntes = camada.el.querySelector(`:scope > .cartao-testemunha[data-pessoa="${CSS.escape(falante || '')}"]`);
    if (cartaoAntes) {
      camada.el.classList.add('com-cartao');
      marcarPistas(camada.el);
      digitarFala(camada.el);
    } else if (falante && rota && caso.pessoas[falante]) {
      camada.el.querySelector(':scope > .cartao-testemunha')?.remove();
      const pe = caso.pessoas[falante];
      const src = figuraDe(falante);
      const url = src ? esc(new URL(src, location.href).href) : '';
      const cartao = document.createElement('figure');
      cartao.className = `cartao-testemunha manter${pe.figura && src ? '' : ' sem-figura'}`;
      cartao.dataset.pessoa = falante;
      cartao.setAttribute('aria-hidden', 'true');
      const foto = !src ? '<span class="ct-foto"></span>'
        : pe.figura ? `<span class="ct-foto" style="background-image:url('${url}')"></span>`
          : `<span class="ct-foto com-silhueta" style="--rosto:url('${url}');${enquadreDe(falante)}"><i></i></span>`;
      cartao.innerHTML = `${foto}<figcaption>${esc(pe.nome)}</figcaption><small>${esc(pe.sub || '')}</small>`;
      camada.el.prepend(cartao);
      camada.el.classList.add('com-cartao');
      marcarPistas(camada.el);
      digitarFala(camada.el);
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
      const curto = cerimoniasCurtas();
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
    if (a.cena) { const resta = 3 - (st.tentativasCena?.[`${chaveBase}#${i}`] || 0); return { pode: true, etiqueta: resta < 3 ? `de novo: mais 15 min · ${resta} ${resta === 1 ? 'tentativa' : 'tentativas'}` : 'você joga a cena (ou deixa os dados)', dif: a.teste?.dif ?? 2 }; }
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
      // Cena de reflexo (infiltração): até 3 tentativas; cada falha custa 15 min a mais (como no banco).
      const chaveI = `${chaveBase}#${i}`;
      if (!a.cena) st.tentados[chaveI] = true;
      let prefixo = '';
      let ok = true;
      let res = null;
      // Etapa C: a abordagem é uma cena jogada (infiltração). "Deixar os dados decidirem" cai no teste.
      if (a.cena === 'infiltracao' && caso.infiltracao) await introDaInfiltracao(caso.infiltracao);
      const fimDaCena = a.cena === 'infiltracao' && caso.infiltracao ? await jogarInfiltracao(caso.infiltracao) : null;
      if (fimDaCena && fimDaCena !== 'dados') {
        ok = fimDaCena === 'conseguiu';
        prefixo = ok ? '[FURTIVIDADE] Ninguém repara em você.'
          : fimDaCena === 'distraido' ? 'Você saiu da cena, e nesse momento alguém viu você.' : '';
      } else if (a.teste) {
        res = R.rolar({ calc, pool: a.teste.pool, dif: s.dif, fome: st.fome });
        await cerimonia(a.teste.pool, s.dif, res);
        ok = R.deuCerto(res);
        prefixo = `${R.cabecaDoTeste(a.teste.pool, s.dif, res)} Você tenta: ${a.rotulo.charAt(0).toLowerCase()}${a.rotulo.slice(1)}.`;
        if (res.resultado === 'falha-bestial') prefixo += '\n\n[A BESTA] Eu rosno por dentro, e todo mundo em volta sente. Perdemos tempo.';
        if (res.resultado === 'critico-sangrento') prefixo += '\n\n[A BESTA] Deu certo porque eu ajudei. Lembre-se disso.';
      } else if (a.poder || a.disciplina) {
        prefixo = usarSangue(a.poder ? R.nomePoder(a.poder).poder : R.nomeDisciplina(a.disciplina[0]));
      }
      // Na infiltração, a falha pode ter o texto de quem viu (falhaPor: { cida: 'pego-cida' }).
      const r = resultados[ok ? a.sucesso : ((fimDaCena && a.falhaPor?.[ultimaInfiltracao?.vigia]) || a.falha)] || null;
      if (a.cena) {
        st.tentativasCena = st.tentativasCena || {};
        if (!ok) st.tentativasCena[chaveI] = (st.tentativasCena[chaveI] || 0) + 1;
        if (ok || st.tentativasCena[chaveI] >= 3) st.tentados[chaveI] = true;
      }
      passarTempo((min || 0) + (res?.resultado === 'falha-bestial' ? 15 : 0) + (a.cena && !ok ? 15 : 0));
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
      // "Viu" e "nada" levam o rótulo novo já antes da próxima carga do banco.
      banco.topicos[pid] = r.topicos.map((t) => { const id = t.chave.slice(pid.length + 1); return { ...t, id, ...(PERGUNTA_TOPICO.has(id) ? { rotulo: ROTULO_PERGUNTA } : {}) }; });
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
      fn: async (cam) => {
        if (!rota) { cam.fechar(); escolherTopico(pid, t); return; }
        manterConversa(cam, pid);
        try { await escolherTopico(pid, t); } finally { soltarConversa(cam); }
      },
    }));
    opcoes.push({ html: 'Encerrar a conversa', classe: 'sair', fn: (cam) => cam.fechar() });
    caixa({ rotulo: `${pe.nome} · ${pe.sub}`, texto, opcoes, revelar: !!intro && intro.length > 160, falante: pid });
  }

  // Quem pede algo antes de falar: o pedido e duas saídas. Atender custa o tempo da pergunta (o favor do
  // vampiro ainda deixa a dívida); recusar e insistir custa 25 minutos e não deixa nada. A resposta é a mesma.
  const POOL_INSISTIR = ['carisma', 'persuasao'];
  function pedirAntes(pid, t, pergunta) {
    const pe = caso.pessoas[pid];
    const responder = (recusar) => async (cam) => {
      if (rota) manterConversa(cam, pid); else cam.fechar();
      try {
        const r = await noBanco(() => F.pedido(caso.id, p.id, `${pid}:${t.id}`, recusar));
        if (!r) return;
        // Insistir no pedido comum rola os dados (sem ficha, 1 dado contra 1: a voz é a Persuasão).
        if (r.teste?.res) {
          r.teste.pool ||= POOL_INSISTIR;
          r.abordagem = 'não ceder e insistir';
          await cerimonia(r.teste.pool, r.teste.dif, r.teste.res);
        }
        await depoisDaAcao(r);
        if (r.divida) anotar('CONVERSA', `Você ficou devendo um favor a ${pe.nome}.`);
        if (!r.novas?.length && r.texto) anotar('CONVERSA', `${pe.nome}, sobre "${t.rotulo}": ${resumoDaFala(r.texto)}`);
        await conversar(pid, textoDe(r));
      } finally { if (rota) soltarConversa(cam); }
    };
    caixa({
      rotulo: `${pe.nome} · ${pe.sub}`, falante: pid,
      texto: `${pergunta ? `*${pergunta}*\n\n` : ''}**${pe.nome}** — ${t.pedido}`,
      opcoes: [
        { html: `${t.divida ? 'Aceitar e ficar devendo' : esc(t.botao || 'Fazer o que pede')} <small class="etiqueta-tempo">${t.min} min</small>`, fn: responder(false) },
        { html: t.insistir
          ? `Não ceder e insistir <small class="etiqueta-teste">${R.vozDoTeste(t.insistir.pool || POOL_INSISTIR)} · ${R.palavraDaChance(R.chance(t.insistir.parada ?? 1, t.insistir.dif))} · 5 ou 25 min</small>`
          : `${t.divida ? 'Recusar e insistir' : 'Não ceder e insistir'} <small class="etiqueta-tempo">25 min</small>`, fn: responder(true) },
        { html: 'Voltar', classe: 'sair', fn: (cam) => { cam.fechar(); conversar(pid); } },
      ],
    });
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

  // A primeira frase da resposta, sem o nome de quem fala nem as marcações, para caber numa linha do registro.
  function resumoDaFala(texto) {
    const limpo = String(texto).replace(/\*\*[^*]+\*\*\s*[—-]\s*/g, '').replace(/\[[^\]]+\]\s*/g, '').replace(/[*_]/g, '').replace(/\s+/g, ' ').trim();
    const frase = (limpo.match(/^.+?[.!?…](?=\s|$)/) || [limpo])[0];
    return frase.length > 140 ? `${frase.slice(0, 137).trimEnd()}…` : frase;
  }
  const PERGUNTA_TOPICO = new Set(['viu', 'nada']);
  async function escolherTopico(pid, t) {
    const chave = `${pid}:${t.id}`;
    if (banco) {
      // A pergunta sai com os traços de antes da resposta: a pista que ela der ainda não entra.
      // Quem ouve muda a pergunta; o id sem o lugar é o do gerador, para o mesmo pretexto da simulação.
      const pe = caso.pessoas[pid];
      const quem = pe.pessoa ? { pessoa: pe.pessoa, id: pid.slice(pid.indexOf('.') + 1) } : null;
      const pergunta = PERGUNTA_TOPICO.has(t.id) ? perguntaPor(banco.estado.tracos || [], quem) : null;
      if (t.pedido && t.estado === 'novo' && F.pedido) { pedirAntes(pid, t, pergunta); return; }
      const r = await noBanco(() => F.agir(caso.id, p.id, chave));
      if (!r) return;
      await depoisDaAcao(r);
      if (r.acao === 'perseguicao' || r.acao === 'confronto') {
        const confronto = r.acao === 'confronto';
        caixa({
          rotulo: `${pe.nome} · ${pe.sub}`, texto: r.texto, revelar: true, fechavel: false, falante: pid,
          opcoes: [{ html: confronto ? '<b>Enfrentar!</b>' : '<b>Correr atrás dele!</b>', classe: 'destaque', fn: (cam) => { cam.fechar(); if (confronto) comecarConfronto(); else comecarFuga(); } }],
        });
      } else if (r.abordagens) {
        abordagensBanco({ rotulo: `${pe.nome} · ${t.rotulo}`, intro: r.pergunta, lista: r.abordagens, chave, falante: pid, aoVoltar: () => conversar(pid), aoResultado: aoResultadoConversa(pid) });
      } else {
        // Sem pista nova, a resposta também fica no registro: o jogador sabe que já perguntou e o que ouviu.
        if (!r.novas?.length && r.texto) anotar('CONVERSA', `${pe.nome}, sobre "${t.rotulo}": ${resumoDaFala(r.texto)}`);
        // Com await: a caixa da pergunta fica aberta até a resposta tomar o lugar dela (movimento, item 3).
        await conversar(pid, pergunta ? `*${pergunta}*

${textoDe(r)}` : textoDe(r));
      }
      return;
    }
    if (t.estado === 'ok' && st.lidos[chave]) { conversar(pid, st.lidos[chave]); return; }
    if (t.acao === 'perseguicao' || t.acao === 'confronto') {
      passarTempo(t.min);
      aplicar({ pistas: t.pistas, marcas: ['chapeu-mostrado'] });
      st.feitos[chave] = 'ok';
      salvar();
      const confronto = t.acao === 'confronto';
      caixa({
        rotulo: `${caso.pessoas[pid].nome} · ${caso.pessoas[pid].sub}`, texto: t.texto, revelar: true, fechavel: false, falante: pid,
        opcoes: [{ html: confronto ? '<b>Enfrentar!</b>' : '<b>Correr atrás dele!</b>', classe: 'destaque', fn: (cam) => { cam.fechar(); if (confronto) comecarConfronto(); else comecarFuga(); } }],
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
  // Formato rota: o lugar atual não está no rastro (chegou por uma viagem errada).
  function foraDoRastro() { return rota && !!banco?.estado?.percurso?.length && !banco.estado.percurso.includes(st.lugar); }
  function viajar() {
    if (rota && st.resolvido) { verORastro(); return; }
    if (rota) {
      const e = banco.estado;
      // As pistas de destino ouvidas aqui: pelo registro da chegada da pista ou, sem ele (jogo salvo antes), pela
      // fonte (uma pessoa ou um ponto deste lugar).
      const ouvidas = st.ouvidas || {};
      // Fora do rastro (viagem errada), o mapa mostra as pistas do último lugar certo.
      const fora = foraDoRastro();
      const base = fora ? (e.percurso || []).at(-1) : st.lugar;
      const aqui = caso.lugares[base] || caso.lugares[st.lugar];
      const nomes = [...(aqui.pessoas || []).map((id) => caso.pessoas[id]?.nome), ...(aqui.pontos || []).map((x) => x.rotulo)].filter(Boolean).map((n) => n.toLowerCase());
      const daqui = (x) => (ouvidas[x.id] ? ouvidas[x.id] === base : nomes.some((n) => { const f = (x.fonte || '').toLowerCase(); return f && (f === n || f.includes(n) || n.includes(f)); }));
      abrirMapaRota(tela, {
        caso, atual: st.lugar, percurso: e.percurso || [], visitados: [...new Set([...(st.visitados || []), ...(e.percurso || [])])],
        destinos: (e.pistas || []).filter((x) => x.tipo === 'destino' && daqui(x)), fora: fora ? (aqui.em || `em ${aqui.nome}`) : null,
        relogio: { inicio: caso.relogio.inicio, fim: caso.relogio.fim, hora: st.hora }, aoViajar: (id, fechar) => irPara(id, fechar),
        // A leitura do lugar novo no banco começa no toque em "Viajar", junto com a viagem (direção de arte, 6.2).
        aoEscolher: (id) => { if (banco) leituraAntecipada = { id, r: lerLugar(id) }; },
      });
      return;
    }
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
  // No fim do capítulo da fuga: o mapa só com o rastro seguido, sem viagem.
  function verORastro() {
    const e = banco.estado;
    abrirMapaRota(tela, { caso, atual: st.lugar, percurso: e.percurso || [], visitados: [...new Set([...(st.visitados || []), ...(e.percurso || [])])] });
  }
  let leituraAntecipada = null;
  // fecharMapa: o mapa da viagem, que fecha só depois de o véu escurecer por cima dele (o lugar antigo não volta).
  function irPara(id, fecharMapa = null) {
    if (cena) st.posicoes[st.lugar] = [cena.posicao().x, cena.posicao().y];
    const veu = document.createElement('div');
    veu.className = 'passagem-caso';
    tela.appendChild(veu);
    let viagem = null;
    setTimeout(async () => {
      fecharMapa?.();
      if (banco) {
        const antes = leituraAntecipada?.id === id ? leituraAntecipada.r : null;
        leituraAntecipada = null;
        const r = await (antes || lerLugar(id));
        if (!r) { veu.remove(); return; }
        aplicarBanco(r);
        viagem = r.viagem || null;
        if (rota) {
          st.visitados = [...new Set([...(st.visitados || []), id])];
          salvar();
          F.rankingDoCapitulo(caso.id).then((x) => { banco.ranking = x; desenharHud(); }).catch(() => {});
          setTimeout(() => { som.carmen?.('chegada'); chegadaDaRota(r.viagem, caso.lugares[id]); }, 700);
        }
      } else {
        const custo = custoViagem(st.lugar, id);
        st.lugar = id;
        passarTempo(custo);
      }
      montarLugar();
      const l = caso.lugares[id];
      // O que se vê ao chegar, com o tempo da noite (chuva, calor, garoa ou seco), quando o capítulo traz.
      const chegada = chegadaSemFrase(id);
      anotar('VOCÊ', `Chega ${destinoEm(l)}, às ${hora(st.hora)}.${chegada ? ` ${chegada}` : ''}`);
      if (rota) {
        // Carmen 2026 (6.2): a cena nova abre em íris, e o cartão de chegada encolhe até virar o título. O véu
        // esmaece junto com a íris, em vez de sumir de estalo.
        veu.classList.add('saindo');
        setTimeout(() => veu.remove(), 300);
        if (!cerimoniasCurtas()) {
          palco.classList.remove('iris');
          void palco.offsetWidth;
          palco.classList.add('iris');
          setTimeout(() => palco.classList.remove('iris'), 700);
        }
        cartaoChegada(l, viagem, caso.tempo?.frases?.[id]);
      } else {
        veu.classList.add('saindo');
        setTimeout(() => veu.remove(), 450);
        faixa('faixa-chegada', l.nome, hora(st.hora));
      }
      setTimeout(olharInicial, 120);
      setTimeout(checarAmanhecer, 600);
    }, 260);
  }

  // A chegada no registro. Quando a frase do tempo vai no cartão, o registro leva só o resto, sem repetir a frase.
  function chegadaSemFrase(id) {
    const chegada = caso.tempo?.chegadas?.[id];
    const frase = caso.tempo?.frases?.[id];
    return frase && chegada?.startsWith(frase) ? chegada.slice(frase.length).trim() : chegada;
  }

  // Carmen 2026 (6.2): o cartão de chegada no alto à esquerda (nome grande, hora e marcas). Na viagem errada,
  // leva o carimbo NINGUÉM VIU. Depois de 2,2 s, encolhe até o título do lugar. Um clique encurta. Com a frase do
  // tempo da noite (até 12 palavras, numa linha abaixo da hora), fica 4 s. `depois` roda quando ele já encolheu.
  function cartaoChegada(l, v, frase, depois) {
    tela.querySelectorAll('.cartao-chegada').forEach((x) => x.remove());
    const el = document.createElement('div');
    el.className = 'cartao-chegada';
    el.setAttribute('role', 'status');
    el.innerHTML = `<b>${esc(l.nome)}</b><small><span class="hora-cartao">${hora(st.hora)}</span>${l.marcas?.length ? ` · ${esc(l.marcas.join(' · '))}` : ''}</small>${frase ? `<i class="cartao-tempo">${esc(frase)}</i>` : ''}${v?.tipo === 'errada' ? `<span class="carimbo carimbo-p">Ninguém viu</span><em class="cartao-volta">Ninguém ${esc(l.em)} viu quem você procura. Volte ao mapa.</em>` : ''}`;
    tela.appendChild(el);
    tela.classList.add('chegando');
    if (v?.tipo === 'errada') setTimeout(() => som.carmen?.('carimbo'), cerimoniasCurtas() ? 0 : 420);
    let foi = false;
    const encolher = () => {
      if (foi) return;
      foi = true;
      const alvo = tela.querySelector('.lugar-titulo b');
      const a = el.querySelector('b').getBoundingClientRect();
      const b = alvo?.getBoundingClientRect();
      if (b?.width && !cerimoniasCurtas()) {
        el.style.transformOrigin = `${a.left - el.getBoundingClientRect().left}px ${a.top - el.getBoundingClientRect().top}px`;
        el.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${(b.height / a.height).toFixed(3)})`;
      }
      el.classList.add('saindo');
      setTimeout(() => {
        el.remove();
        if (!tela.querySelector('.cartao-chegada')) tela.classList.remove('chegando');
        depois?.();
      }, 420);
    };
    el.addEventListener('click', encolher);
    setTimeout(encolher, frase ? 4000 : cerimoniasCurtas() ? 1200 : 2200);
  }

  // Formato rota: o que a chegada conta. Viagem errada: ninguém viu. Esconderijo: o ladrão está aqui.
  function chegadaDaRota(v, l) {
    if (!v) return;
    if (v.voo) anotar('VOCÊ', l.cidade === 'sp' ? 'A ponte aérea pousa em São Paulo.' : 'A ponte aérea pousa de volta no Rio.');
    if (v.tipo === 'errada') {
      anotar('A FOME', `Nenhum cheiro dele ${l.em}. O rastro não passou por aqui.`);
    } else if (v.esconderijo) {
      st.avistamento = v.avistamento || '';
      momentoCerco();
    }
  }
  // A notícia dos rivais na rota: só o progresso (em que lugar da rota cada um está, pelo número), nunca o lugar.
  function corridaDaRota() {
    const outros = (banco?.ranking || []).filter((x) => !x.voce);
    if (!outros.length) return 'ninguém mais nesta fuga';
    const preso = outros.find((x) => x.resolvido_em);
    if (preso) return `${preso.nome} já fez a prisão`;
    const lider = outros.reduce((m, x) => ((x.passo || 0) > (m.passo || 0) ? x : m));
    return lider.licenca ? `${lider.nome} já tirou a Licença` : `${lider.nome} já está no ${lider.passo || 1}º lugar`;
  }
  const noEsconderijo = () => rota && banco && !st.resolvido && caso.tamanhoRota && banco.estado.rota_passo === caso.tamanhoRota - 1 && (banco.estado.percurso || []).at(-1) === st.lugar;
  const serieLicenca = () => { let h = 7; for (const c of `${caso.id}:${p.id}`) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 100 + (h % 8800); };
  function abrirOArquivo() {
    const e = banco.estado;
    abrirArquivo(tela, {
      caso, conhecidos: e.tracos || [], comPista: e.categorias || null, presos: e.presos || [], licenca: e.licenca,
      pistas: (e.pistas || []).filter((x) => x.tipo === 'traco'),
      indiretas: (e.pistas || []).filter((x) => x.tipo === 'traco' && x.indireta && !x.lida),
      marcados: st.marcados || {},
      aoMudar: (m) => { st.marcados = m; salvar(); },
      // A Licença de Caça: a ordem dela no capítulo (as erradas vêm antes), a hora e a cidade em que saiu.
      // O número é a série do jogador neste capítulo mais a ordem: cada Licença sai com o seu, e o portador é quem joga.
      dadosLicenca: () => ({ numero: serieLicenca() + (banco.estado.acusacoes_erradas || 0), hora: st.licencaHora || '', cidade: caso.lugares[st.lugar]?.cidade === 'sp' ? 'São Paulo' : 'Rio', portador: p.nome }),
      aoPedirLeitura: async (id) => {
        const r = await noBanco(() => F.xerife(caso.id, p.id, id));
        if (!r) return;
        aplicarBanco(r);
        if (r.traco) anotar('XERIFE IOLANDA', `A pista quer dizer: ${r.traco.nome}.`);
        caixa({ rotulo: 'Xerife Iolanda', texto: r.texto, opcoes: [{ html: 'Voltar ao Arquivo', fn: (c) => { c.fechar(); abrirOArquivo(); } }, { html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] });
      },
      aoPedirLicenca: async (quem, tracos) => {
        const r = await noBanco(() => F.licenca(caso.id, p.id, quem, tracos));
        if (!r) return null;
        aplicarBanco(r);
        if (r.licenca) { st.licencaHora = hora(st.hora); salvar(); anotar('XERIFE IOLANDA', 'Licença de Caça emitida. Traga de volta o que foi levado.'); }
        return r;
      },
    });
  }
  // Carmen 2026 (7.5): o momento antes do cerco. Faixas pretas em cima e embaixo, a cena aproxima 1,15, uma
  // batida de coração e o cartão "Está aqui." Sem Licença, o primário é abrir o Arquivo, e cercar fica como
  // secundário, com o risco escrito.
  // Onde o alvo estava na cena (em %), para a foto da prisão: depois do cerco, o ponto sai da cena.
  let posAlvo = null;
  function momentoCerco() {
    if (tela.querySelector('.cartao-cerco')) return;
    const lic = !!banco.estado.licenca;
    // O que o relógio desconta se cercar sem Licença: a mesma tabela de custos do capítulo que o banco usa.
    const semLicenca = caso.custo.semLicenca ?? 30;
    // A câmera aproxima no ponto do esconderijo, que ganha um anel fino: o alvo fica marcado.
    const palcoEl = tela.querySelector('.palco');
    const alvo = tela.querySelector('[data-ponto="cercar"]');
    let alvoEmBaixo = false;
    if (palcoEl && alvo) {
      const a = alvo.getBoundingClientRect();
      const b = palcoEl.getBoundingClientRect();
      const ox = a.left + a.width / 2 - b.left;
      const oy = a.bottom - b.top;
      posAlvo = { x: Math.round((ox / b.width) * 100), y: Math.round(((a.top + a.height / 2 - b.top) / b.height) * 100) };
      palcoEl.style.transformOrigin = `${ox}px ${oy}px`;
      // Leva o alvo para o alto da tela, acima do cartão, sem passar da folga que o zoom de 15% dá nas bordas.
      const entre = (v, min, max) => Math.max(min, Math.min(max, v));
      palcoEl.style.setProperty('--cerco-dx', `${entre(b.width / 2 - ox, -0.15 * (b.width - ox), 0.15 * ox)}px`);
      // No celular, o alvo sobe 16 px a mais, para o anel terminar acima do cartão.
      const dy = entre(b.height * 0.4 - (document.body.classList.contains('celular') ? 16 : 0) - oy, -0.15 * (b.height - oy), 0.15 * oy);
      palcoEl.style.setProperty('--cerco-dy', `${dy}px`);
      // Se nem assim o alvo sobe o bastante, no computador o cartão vai para o alto (no celular fica embaixo, perto do polegar).
      alvoEmBaixo = oy + dy > b.height * 0.5;
      alvo.classList.add('alvo-cerco');
    }
    tela.classList.add('cercando');
    som.reacao?.('susto', 0);
    const el = document.createElement('div');
    el.className = `cerco-camada${alvoEmBaixo ? ' cartao-no-alto' : ''}`;
    el.innerHTML = `<span class="faixa-cerco cima" aria-hidden="true"></span><span class="faixa-cerco baixo" aria-hidden="true"></span>
      <section class="cartao-cerco" role="dialog" aria-label="O esconderijo">
        <h3>Está aqui.</h3>
        ${lic ? `<p class="cerco-licenca">Nº ${String(serieLicenca() + (banco.estado.acusacoes_erradas || 0)).padStart(4, '0')} · ${esc(caso.arquivo?.suspeitos.find((x) => x.id === banco.estado.licenca)?.apelido || caso.arquivo?.suspeitos.find((x) => x.id === banco.estado.licenca)?.nome || '')}</p>` : ''}
        ${st.avistamento ? `<p>${esc(st.avistamento)}</p>` : ''}
        ${lic ? '' : `<p class="cerco-risco">Sem a Licença de Caça, a presa foge, e você perde ${duracao(semLicenca)} até achar o rastro de novo.</p>`}
        <div class="cerco-botoes">${lic
          ? '<button type="button" class="btn destaque" data-cerco="cercar">Cercar</button><button type="button" class="btn" data-cerco="nao">Ainda não</button>'
          : `<button type="button" class="btn destaque" data-cerco="arquivo">Abrir o Arquivo</button><button type="button" class="btn" data-cerco="cercar">Cercar sem Licença <small class="etiqueta-tempo">−${duracao(semLicenca)}</small></button><button type="button" class="btn sutil" data-cerco="nao">Ainda não</button>`}</div>
      </section>`;
    tela.appendChild(el);
    // Sair sem decidir: "Ainda não", Esc ou um toque fora do cartão. A personagem fica onde está, e o relógio não anda.
    const tecla = (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); sair(); } };
    document.addEventListener('keydown', tecla, true);
    // O cartão esmaece em 160 ms. Ao cercar, as faixas, a câmera e o HUD apagado ficam até o fim da cerimônia;
    // nos outros casos, as faixas recolhem em 240 ms e a cena volta.
    let saiu = false;
    const sair = (ficar) => {
      if (saiu) return;
      saiu = true;
      document.removeEventListener('keydown', tecla, true);
      el.style.pointerEvents = 'none';
      el.querySelector('.cartao-cerco')?.classList.add('saindo');
      if (ficar) return;
      alvo?.classList.remove('alvo-cerco');
      recolherCerco(el);
    };
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-cerco]');
      if (!b) { if (!ev.target.closest('.cartao-cerco')) sair(); return; }
      const cerca = b.dataset.cerco === 'cercar';
      sair(cerca);
      if (cerca) cercar(el);
      if (b.dataset.cerco === 'arquivo') abrirOArquivo();
    });
    el.querySelector('.btn')?.focus({ preventScroll: true });
  }
  // Tira a moldura do cerco: as faixas recolhem e o escuro some em 240 ms, e a câmera e o HUD voltam.
  function recolherCerco(camada) {
    tela.classList.remove('cercando');
    if (!camada?.isConnected) return;
    camada.style.pointerEvents = 'none';
    camada.classList.add('recolhendo');
    setTimeout(() => camada.remove(), cerimoniasCurtas() ? 0 : 240);
  }
  // A cerimônia do fim do cerco (6.2): PRESO/PRESA com clarão e a cena em preto e branco, ou FUGIU com a cena escurecendo.
  function cerimoniaCerco(preso, camada) {
    return new Promise((ok) => {
      const s = caso.arquivo?.suspeitos.find((x) => x.id === banco.estado.licenca);
      const texto = preso ? (s?.genero === 'f' ? 'Presa' : 'Preso') : 'Fugiu';
      const el = document.createElement('div');
      el.className = `cerco-fim ${preso ? 'preso' : 'fugiu'}${cerimoniasCurtas() ? ' curta' : ''}`;
      el.innerHTML = `<span class="cerco-clarao" aria-hidden="true"></span><span class="carimbo carimbo-g">${texto}</span>`;
      // O alvo continua no anel: preso, fica na foto; no FUGIU, a silhueta sai do anel e some.
      const alvo = tela.querySelector('[data-ponto="cercar"]');
      alvo?.classList.add('alvo-cerco');
      if (!preso && alvo && !cerimoniasCurtas()) alvo.insertAdjacentHTML('beforeend', '<span class="alvo-fugindo" aria-hidden="true"></span>');
      if (preso) {
        const lim = (v, pad) => Math.max(5, Math.min(95, v ?? pad));
        st.foto = { img: geografia(caso.lugares[st.lugar].geo).imagem, x: lim(posAlvo?.x, 50), y: lim(posAlvo?.y, 60), texto };
        salvar();
      }
      tela.classList.add(preso ? 'cena-preso' : 'cena-fugiu');
      tela.appendChild(el);
      // O carimbo fica acima do anel do alvo, sem cobrir a figura, e dentro da tela.
      const car = el.querySelector('.carimbo');
      const ra = alvo?.getBoundingClientRect();
      if (car && ra?.width) {
        const rt = el.getBoundingClientRect();
        const rc = { width: car.offsetWidth, height: car.offsetHeight }; // sem a escala da batida
        const folga = document.body.classList.contains('celular') ? 16 : 24;
        const meiaL = rc.width / 2 + 8;
        const x = Math.max(meiaL, Math.min(rt.width - meiaL, ra.left + ra.width / 2 - rt.left));
        // O giro de -8 graus aumenta a caixa em cerca de 7% da largura, para cima e para baixo.
        const giro = Math.ceil(rc.width * 0.07);
        let base = ra.top - rt.top - folga - giro;
        // Sem espaço acima, ele vai para baixo do anel.
        if (base - rc.height < 8) base = Math.min(rt.height - 8, ra.bottom - rt.top + folga + giro + rc.height);
        car.classList.add('no-alvo');
        car.style.left = `${Math.round(x)}px`;
        car.style.top = `${Math.round(base)}px`;
      }
      // Com "menos movimento", o carimbo já aparece assentado e fica 1,5 s (ou até o clique).
      const dur = cerimoniasCurtas() ? 1500 : preso ? 1800 : 1500;
      let foi = false;
      // No fim, o carimbo esmaece em 240 ms junto com a volta da cor, e a moldura do cerco sai junto.
      const fim = () => {
        if (foi) return;
        foi = true;
        el.style.pointerEvents = 'none';
        el.classList.add('saindo');
        setTimeout(() => el.remove(), cerimoniasCurtas() ? 0 : 240);
        alvo?.classList.remove('alvo-cerco');
        alvo?.querySelector('.alvo-fugindo')?.remove();
        tela.classList.remove('cena-preso', 'cena-fugiu');
        recolherCerco(camada);
        ok();
      };
      el.style.pointerEvents = 'auto';
      el.addEventListener('click', fim);
      setTimeout(fim, dur);
    });
  }
  async function cercar(camada) {
    const r = await noBanco(() => F.cercar(caso.id, p.id));
    if (!r || !rota) recolherCerco(camada);
    if (!r) return;
    aplicarBanco(r);
    if (r.preso) {
      anotar('VOCÊ', r.acao?.ok ? 'Você fecha a saída antes que a presa se mova.' : 'A presa tenta correr, mas a Licença da Xerife já fechou a cidade.');
      banco.fecho = r.fecho || null;
      banco.ranking = await F.rankingDoCapitulo(caso.id).catch(() => banco.ranking);
      som.carmen?.('preso');
      if (rota) await cerimoniaCerco(true, camada);
      setTimeout(fecho, rota ? 0 : 350);
      return;
    }
    som.carmen?.('fugiu');
    if (rota) await cerimoniaCerco(false, camada);
    const texto = r.motivo === 'sem-licenca'
      ? `Sem a Licença da Xerife, você não tem como segurar a presa. Ela some na noite, e você perde ${duracao(r.minutos)} até achar o rastro de novo. Abra o Arquivo.`
      : `A Licença era contra a pessoa errada. A Xerife cancela a Licença, e você perde ${duracao(r.minutos)}. Volte ao Arquivo.`;
    caixa({ rotulo: 'Escapou', texto, opcoes: [{ html: 'Abrir o Arquivo', fn: (c) => { c.fechar(); abrirOArquivo(); } }, { html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] });
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
    if (noEsconderijo()) pts.push({ id: 'cercar', tipo: 'detalhe', icone: '!', rotulo: 'Cercar a presa', acao: 'Cercar a presa (com a Licença de Caça)', x: geo.entrada?.[0] ?? 0.5, y: Math.max(0.55, (geo.entrada?.[1] ?? 0.85) - 0.12) });
    return pts;
  }
  function genteDo(id) {
    return caso.lugares[id].pessoas.filter((pid) => !st.escondidos.includes(pid)).map((pid) => {
      const pe = caso.pessoas[pid];
      const pos = st.posPessoas[pid];
      return { id: pid, tipo: pe.tipo, nome: pe.nome, sub: subDe(pid), figura: rota ? figuraDoCaso(pid) : pe.figura, x: pos?.[0] ?? pe.x, y: pos?.[1] ?? pe.y, falas: pe.falas };
    });
  }
  const subDe = (pid) => `${caso.pessoas[pid].sub}${!foraDoRastro() && temAssuntoNovo(pid) && st.achados.includes(`conheceu-${pid}`) ? ' · assunto novo' : ''}`;
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
      // Fora do rastro, ninguém tem o que contar sobre a fuga: sem ponto de assunto novo.
      const quer = !fuga && !foraDoRastro() && temAssuntoNovo(pid);
      // Carmen 2026 (7.2): no lugar do balão, o rosto da testemunha num círculo; o ponto de sódio marca
      // assunto novo, e o rosto fica apagado depois da conversa.
      if (rota) {
        let rosto = el.querySelector('.rosto-testemunha');
        const src = figuraDe(pid);
        if (!rosto && src) {
          rosto = document.createElement('span');
          rosto.className = 'rosto-testemunha';
          rosto.setAttribute('aria-hidden', 'true');
          rosto.style.setProperty('--rosto', `url('${new URL(src, location.href).href}')`);
          // Sem figura própria, a silhueta da figura genérica, igual à do cartão.
          if (!caso.pessoas[pid].figura) { rosto.classList.add('silhueta'); rosto.innerHTML = '<i></i>'; rosto.style.cssText += `;${enquadreDe(pid)}`; }
          el.appendChild(rosto);
        }
        rosto?.classList.toggle('nova', quer);
        rosto?.classList.toggle('apagado', !quer && st.achados.includes(`conheceu-${pid}`));
        if (rosto) { el.querySelector('.balao-assunto')?.remove(); continue; }
      }
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
      semPassantes: rota,
      aoFalar: (voz, texto) => anotar(voz, texto),
      aoPausa: (pausado) => tela.querySelector('.botao-pausa')?.setAttribute('aria-pressed', String(!!pausado)),
      aoInteragir: (pt) => {
        if (fuga) return; // na perseguição, tocar em quem foge só faz correr atrás dele
        if (st.resolvido) { telaFinal(); return; }
        if (checarAmanhecer()) return;
        if (pt.tipo === 'pessoa') conversar(pt.caso?.id || pt.id.replace(/^pessoa-/, ''));
        else if (pt.id === 'cercar') momentoCerco();
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

  // --- Infiltração (etapa C) ------------------------------------------------------------------------
  let ultimaInfiltracao = null;
  // A abertura da cena (explica o salto até o ponto de partida e quem vigia).
  function introDaInfiltracao(cfg) {
    return new Promise((resolver) => {
      if (!cfg.intro) { resolver(); return; }
      caixa({ rotulo: cfg.rotulo || 'Infiltração', texto: cfg.intro, fechavel: false, opcoes: [{ html: '<b>Começar</b>', classe: 'destaque', fn: (cam) => { cam.fechar(); resolver(); } }] });
    });
  }
  // Devolve 'conseguiu', 'visto', 'dados' ou 'distraido'. Enquanto dura, nada mais na tela responde.
  function jogarInfiltracao(cfg, semente = crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646 + 1) {
    return new Promise((resolver) => {
      if (st.lugar !== cfg.lugar || !cena) { resolver('visto'); return; }
      fuga = 'infiltracao';
      atualizarCena();
      iniciarInfiltracao({
        cena, palco, camadas: tela, cfg, semente,
        aoFim: (resultado, registro) => {
          fuga = null;
          atualizarCena();
          ultimaInfiltracao = registro;
          banco && (banco.ultimaCena = registro);
          resolver(resultado);
        },
      });
    });
  }

  // --- Confronto por turnos (etapa C) --------------------------------------------------------------
  // Na demonstração, as regras rodam aqui (turnoDoConfronto, com os dados do motor). Na temporada, cada
  // turno é do banco (caso_confronto): a tela só mostra.
  async function comecarConfronto() {
    const cfg = caso.confronto;
    if (fuga || !cfg || st.lugar !== cfg.lugar) return;
    const nome = caso.pessoas[cfg.pessoa]?.nome || 'Ele';
    fuga = 'confronto';
    atualizarCena();
    let estado;
    let jogarTurno;
    if (banco) {
      const r = await noBanco(() => F.confronto(caso.id, p.id, 'inicio'));
      if (!r) { fuga = null; atualizarCena(); return; }
      estado = r.e;
      jogarTurno = async (escolha) => {
        const rt = await F.confronto(caso.id, p.id, escolha).catch((err) => { caixa({ rotulo: 'Não deu', texto: err.message, opcoes: [{ html: 'Voltar', classe: 'sair', fn: (c) => c.fechar() }] }); return null; });
        if (rt?.estado) sincronizar(rt.estado);
        desenharHud();
        if (rt?.e?.fim) banco.fimConfronto = rt;
        return rt;
      };
    } else {
      const vit = vitalidadeDe(calc);
      estado = { vitJ: vit, vitJMax: vit, vitT: cfg.oponente.vitalidade, vitTMax: cfg.oponente.vitalidade, turno: 0, hesita: false, fome: st.fome, fim: null };
      jogarTurno = async (escolha) => {
        const r = turnoDoConfronto(estado, escolha, {
          calc, op: cfg.oponente, maxTurnos: cfg.maxTurnos,
          rolar: (n, fome) => rolarParada({ parada: n, fome, dificuldade: 0 }),
          despertar: () => R.despertar().fomeSobe,
        });
        estado = r.e;
        st.fome = r.e.fome;
        salvar();
        desenharHud();
        return r;
      };
    }
    // A câmera chega perto dos dois durante a luta (focar com prazo longo; volta ao normal no fim).
    const quem = cena?.pessoa(cfg.pessoa);
    if (quem) cena.focar(quem.x, quem.y, 600000);
    abrirConfronto({
      tela, palco, nome, estado, escolhas: escolhasDo(calc, R.temPoder(calc, 'compelir')), jogarTurno,
      retratos: { voce: retratoDe(p), ele: figuraDe(cfg.pessoa) },
      aoFim: async (fim) => {
        fuga = null;
        if (quem) cena.focar(quem.x, quem.y, 0);
        let final = fim === 'venceu' ? 'pego' : 'escapou';
        let prefixo = '';
        if (banco) {
          // O banco já decidiu (nos turnos ou nos dados): o texto e as pistas vêm da última resposta.
          const rb = fim === 'dados' ? await noBanco(() => F.confronto(caso.id, p.id, 'dados')) : banco.fimConfronto;
          banco.fimConfronto = null;
          if (!rb) { atualizarCena(); return; }
          if (rb.teste?.res) {
            await cerimonia(rb.teste.pool, rb.teste.dif, rb.teste.res);
            prefixo = `${R.cabecaDoTeste(rb.teste.pool, rb.teste.dif, rb.teste.res)} Você deixa o instinto brigar.

`;
          }
          if (rb.resultado !== 'pego') cena?.esconderPessoa(cfg.pessoa);
          await depoisDaAcao(rb);
          caixa({ rotulo: rb.resultado === 'pego' ? 'Ele se rende' : 'Ele escapou', texto: `${prefixo}${rb.texto || ''}`, revelar: true, opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] });
          return;
        }
        let min = caso.custo.perseguicao;
        if (fim === 'dados') {
          const pool = ataqueDe(calc);
          const res = R.rolar({ calc, pool, dif: cfg.dados.dif, fome: st.fome });
          await cerimonia(pool, cfg.dados.dif, res);
          final = R.deuCerto(res) ? 'pego' : 'escapou';
          prefixo = `${R.cabecaDoTeste(pool, cfg.dados.dif, res)} Você deixa o instinto brigar.

`;
          min = caso.custo.dados;
        }
        // Os desfechos próprios do confronto (a briga foi no largo); a vitória segue com a confissão.
        const confissao = String(caso.perseguicao.pego.texto).split('\n\n').slice(1).join('\n\n');
        const textoDoConfronto = final === 'pego' ? (cfg.venceu ? `${cfg.venceu}\n\n${confissao}` : null) : cfg.perdeu;
        const r0 = final === 'pego' ? caso.perseguicao.pego : caso.perseguicao.escapou;
        const r = textoDoConfronto ? { ...r0, texto: textoDoConfronto } : r0;
        if (final !== 'pego') { st.escondidos.push(cfg.pessoa); cena?.esconderPessoa(cfg.pessoa); }
        passarTempo(min);
        aplicar(r);
        caixa({ rotulo: final === 'pego' ? 'Ele se rende' : 'Ele escapou', texto: `${prefixo}${r.texto}`, revelar: true, opcoes: [{ html: 'Voltar à cena', classe: 'sair', fn: (c) => c.fechar() }] });
      },
    });
  }

  // --- Perseguição --------------------------------------------------------------------------------
  async function comecarFuga() {
    if (fuga || st.lugar !== caso.perseguicao.lugar) return;
    const cfg = caso.perseguicao;
    const poderes = { rapidez: R.temPoder(calc, 'ligeireza') || R.temDisciplina(calc, ['rapidez', 1]), compelir: R.temPoder(calc, 'compelir') };
    fuga = 'começando';
    atualizarCena(); // os balões de assunto somem durante a fuga
    // A semente da fuga: na temporada, sorteada pelo banco (que vai refazer a fuga e conferir o "pego");
    // na demonstração, sorteada aqui.
    let semente = crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646 + 1;
    if (banco) {
      const r = await noBanco(() => F.comecoDaPerseguicao(caso.id, p.id));
      if (!r) { fuga = null; atualizarCena(); return; }
      semente = r.semente;
    }
    fuga = iniciarPerseguicao({
      cena, palco, camadas: tela, cfg, nome: caso.pessoas[cfg.pessoa].nome, poderes, semente,
      aoUsarSangue: (nome) => usarSangue(nome),
      aoGastarVontade: () => {
        if (st.vontade <= 0) return false;
        st.vontade -= 1;
        anotar('FORÇA DE VONTADE', 'Você força o passo.');
        salvar();
        desenharHud();
        return true;
      },
      aoFim: async (resultadoFuga, pos, registro) => {
        fuga = null;
        // A aba sumiu ou a janela perdeu o foco no meio da corrida: ele escapa.
        const distraido = resultadoFuga === 'distraido';
        const resultado = distraido ? 'escapou' : resultadoFuga;
        if (distraido) anotar('PRONTIDÃO', 'Você se distraiu, e ele escapou.');
        if (banco) {
          // ETAPA C: o banco ainda confia no navegador para "pego" ou "escapou"; "dados" é rolado lá.
          // O banco refaz a fuga com o caminho e só aceita o "pego" se a conta dele também der "pego".
          const rb = await noBanco(() => F.fimDaPerseguicao(caso.id, p.id, resultado, resultado === 'pego' ? registro : null));
          if (!rb) return;
          let prefixoB = distraido ? 'Você se distraiu, e ele escapou.\n\n' : '';
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
        let prefixo = distraido ? 'Você se distraiu, e ele escapou.\n\n' : '';
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
    // Na fuga não há quadro de dedução: o Arquivo faz esse papel; depois de resolvido, o rastro.
    if (rota) { if (st.resolvido) verORastro(); else abrirOArquivo(); return; }
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
        opcoes: rota && !(f.escolhas || []).length ? [{ html: 'Ver o placar do capítulo', fn: (cam) => { cam.fechar(); telaFinalBanco(); } }] : (f.escolhas || []).map((x) => ({ html: esc(x.rotulo), fn: async (cam) => {
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

  // O placar do formato rota (direção de arte, 7.6): uma tela própria sobre a cena escurecida, em três colunas
  // (a prisão e o rastro; a nota; o ranking, as estrelas e os selos). A nota conta de 0 até o valor, as contagens
  // entram uma a uma, a sua linha desliza até a posição e os selos caem. Um clique completa tudo.
  const TODOS_SELOS = ['sem-erros', 'sem-dicas', 'detetive', 'primeiro', 'mais-rapido'];
  // O motivo para voltar: cada selo que faltou diz como se ganha (ao passar o mouse, ao focar ou ao tocar).
  const COMO_GANHAR = {
    'sem-erros': 'Viaje só pelo rastro e peça a Licença certa.',
    'sem-dicas': 'Feche o caso sem pedir dica.',
    detetive: 'Ache todas as pistas do capítulo.',
    primeiro: 'Seja o primeiro a fechar o capítulo.',
    'mais-rapido': 'Feche o capítulo com mais noite de sobra que todos.',
  };
  const ESTRELAS_LINHA = {
    1: ['Por pouco', 'O céu já clareava. A Xerife não comenta, e isso já é um elogio.'],
    2: ['Com folga', 'Ainda sobrou noite. A Xerife anota o seu nome.'],
    3: ['Noite de sobra', 'O sol ainda estava longe. Na Ciranda, já falam de você.'],
  };
  // As faixas são as de js/carmen/regras.js (ESTRELAS): 90 minutos ou mais antes do sol, 3 estrelas; 45, 2.
  const estrelasDoTempo = (restante) => (restante >= 90 ? 3 : restante >= 45 ? 2 : 1);
  const estrelaSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';
  // Cada selo tem o seu desenho no miolo: aceso quando ganho, apagado quando falta (e no cartão do próximo selo).
  const SELO_DESENHO = {
    'sem-erros': '<path d="M17.5 24.5l4.5 4.5 8.5-9.5"/>',
    'sem-dicas': '<path d="M20.5 20.5a3.6 3.6 0 1 1 5 3.3c-1 .5-1.5 1.1-1.5 2.2v.8"/><circle cx="24" cy="30.6" r="0.6"/><path d="M16.5 31.5l15-15"/>',
    detetive: '<circle cx="22.5" cy="22.5" r="5"/><path d="M26.2 26.2l5 5"/>',
    primeiro: '<path d="M20.5 32V16.5l9.5 3.4-9.5 3.4"/>',
    'mais-rapido': '<circle cx="24" cy="24" r="7"/><path d="M24 19.5V24l3 2"/>',
  };
  const seloSvg = (n, s) => `<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="selo-aro" cx="24" cy="24" r="21"/><circle class="selo-miolo" cx="24" cy="24" r="15"/><g class="selo-desenho${n ? '' : ' apagado'}">${SELO_DESENHO[s] || ''}</g></svg>`;

  // Enquanto ninguém mais fechou o capítulo, a coluna da direita não fica vazia: mostra o selo que falta e que é
  // mais fácil de ganhar na próxima noite, com o jeito de ganhar.
  const FACILIDADE = ['sem-dicas', 'sem-erros', 'detetive', 'mais-rapido', 'primeiro'];
  function proximoSelo(ganhos) {
    const s = FACILIDADE.find((x) => !ganhos.includes(x));
    if (!s) return '<aside class="placar-proximo completo"><small>Selos</small><b>Todos os selos deste capítulo</b><p>A Xerife guarda o seu nome na primeira página do Arquivo.</p></aside>';
    return `<aside class="placar-proximo">${seloSvg(false, s)}<div><small>O próximo selo</small><b>${esc(SELOS[s])}</b><p>${esc(COMO_GANHAR[s])}</p></div></aside>`;
  }
  function placarRota() {
    const e = banco.estado;
    const resolvidos = banco.ranking.filter((x) => x.resolvido_em);
    const pos = resolvidos.findIndex((x) => x.voce);
    const horaFim = st.resolvido?.hora ?? e.hora;
    const estrelas = e.revanche ? 1 : estrelasDoTempo(caso.relogio.fim - horaFim);
    const [nomeEstrelas, linhaEstrelas] = ESTRELAS_LINHA[estrelas];
    const suspeito = caso.arquivo?.suspeitos.find((x) => x.id === e.licenca);
    const percurso = e.percurso || [];
    const visitados = [...new Set([...(st.visitados || []), ...percurso])];
    const erradas = e.viagens_erradas || 0;
    const nota = e.nota ?? 0;
    const contagens = [
      ['Lugares no rastro', percurso.length],
      ['Viagens erradas', erradas],
      ['Licenças erradas', e.acusacoes_erradas || 0],
      ['Dicas pedidas', e.dicas_pedidas || 0],
      ['Pistas achadas', (e.pistas || []).length],
      // A ação do cerco só aparece quando foi vencida: perdida, ela não muda nada e soaria como derrota.
      ...(e.acao_vencida ? [['Ação no cerco', 'vencida']] : []),
    ];
    const iniciais = (n) => esc(((n || '').match(/\p{L}+/gu) || ['?']).slice(0, 2).map((x) => x[0]).join('').toUpperCase());
    const linhaRanking = (x, i) => `<li class="${x.voce ? 'voce' : ''}" style="--i:${i}"><span class="placar-pos">${i + 1}º</span><span class="placar-avatar">${iniciais(x.nome)}</span><b>${x.voce ? 'Você' : esc(x.nome)}</b><span class="placar-pontos">${x.nota ?? '—'}</span></li>`;
    abrirJanela(tela, {
      titulo: `${caso.titulo}: placar`,
      classe: 'janela-placar',
      montar: (corpo, camada) => {
        corpo.innerHTML = `
          <div class="placar-tela">
            <section class="placar-col placar-caso">
              <small class="placar-kicker">${esc(caso.rotulo)} · ${esc(caso.titulo)}</small>
              ${fotoPrisao(st.foto, st.foto?.texto, 'placar-foto')}
              <span class="carimbo carimbo-g placar-carimbo">Caso fechado</span>
              <h3>${suspeito?.genero === 'f' ? 'Presa' : 'Preso'} às ${doisDigitos(Math.floor(horaFim / 60) % 24)}:${doisDigitos(horaFim % 60)}</h3>
              <p class="placar-linha">${esc(linhaEstrelas)}</p>
              <figure class="placar-rastro">${miniRastro(caso, { percurso, visitados })}
                <figcaption><span><i class="leg-seguido"></i>seguido</span><span><i class="leg-errado"></i>errado</span></figcaption>
              </figure>
              <p class="placar-resumo">${percurso.length} ${percurso.length === 1 ? 'lugar' : 'lugares'} · ${erradas} ${erradas === 1 ? 'errada' : 'erradas'}</p>
              ${banco.final ? `<p class="placar-semana"><b>Na semana seguinte:</b> ${esc(banco.final.efeito || '')}</p>` : ''}
              <button type="button" class="btn placar-arquivo" data-placar="arquivo">Ver o Arquivo</button>
            </section>
            <section class="placar-col placar-nota" aria-label="Sua nota">
              <div class="placar-numero"><b data-nota style="--alvo:${nota}"><span>${nota}</span></b><small>de 1000</small></div>
              <div class="placar-estrelas" aria-label="${estrelas} de 3 estrelas: ${nomeEstrelas}">
                ${[1, 2, 3].map((n) => `<span class="estrela${n <= estrelas ? ' ganha' : ''}" style="--i:${n}">${estrelaSvg}</span>`).join('')}
                <small>${esc(nomeEstrelas)}</small>
              </div>
              <dl class="placar-contas">${contagens.map(([k, v], i) => `<div style="--i:${i}"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
            </section>
            <section class="placar-col placar-lado">
              <h4>Ranking do capítulo</h4>
              <ol class="placar-ranking${resolvidos.length > 5 ? ' longo' : ''}">${resolvidos.map(linhaRanking).filter((_, i) => i < 5 || i === pos).join('') || '<li class="vazio">Ninguém mais fechou este capítulo ainda.</li>'}</ol>
              <h4>Selos</h4>
              <ul class="placar-selos">${TODOS_SELOS.map((s, i) => {
                const tem = (e.selos || []).includes(s);
                return tem ? `<li class="ganho" style="--i:${i}" title="${esc(SELOS[s])}">${seloSvg(tem, s)}<small>${esc(SELOS[s])}</small></li>`
                  : `<li style="--i:${i}" tabindex="0" aria-label="${esc(SELOS[s])}, ainda não ganho. ${esc(COMO_GANHAR[s])}">${seloSvg(tem, s)}<small>${esc(SELOS[s])}</small><span class="selo-como" aria-hidden="true">${esc(COMO_GANHAR[s])}</span></li>`;
              }).join('')}</ul>
              ${resolvidos.length <= 1 ? proximoSelo(e.selos || []) : ''}
              ${e.patente ? `<h4>Patente</h4><p class="placar-patente">${esc(e.patente)}</p>` : ''}
              <div class="placar-botoes">
                <button type="button" class="btn destaque" data-placar="voltar">${esc(textoVoltar)}</button>
                <button type="button" class="btn sair" data-placar="cena">Andar pela cena</button>
              </div>
            </section>
          </div>`;
        const telaP = corpo.querySelector('.placar-tela');
        const numero = corpo.querySelector('[data-nota]');
        const voce = corpo.querySelector('.placar-ranking .voce');
        // A sua linha começa no fim da lista e sobe até a posição.
        // Com mais de 5, a lista mostra os 5 primeiros e a sua linha.
        const linhas = Math.min(resolvidos.length, 5 + (pos >= 5 ? 1 : 0));
        if (voce && pos > 0) voce.style.setProperty('--sobe', `${(linhas - 1 - Math.min(pos, 5)) * 100}%`);
        // A nota conta em CSS (um contador animado em ::before, 1.400 ms), para a captura poder parar no meio.
        // O tique de máquina cai a cada 50 pontos, na hora em que a curva passa por eles.
        const relogios = [];
        const depois = (ms, fn) => relogios.push(setTimeout(fn, ms));
        const completar = () => {
          relogios.forEach(clearTimeout);
          telaP.classList.add('completo');
        };
        if (cerimoniasCurtas()) completar();
        else {
          telaP.classList.add('animando');
          const dur = 1400;
          for (let m = 50; m <= nota; m += 50) depois(dur * (1 - Math.cbrt(1 - m / nota)), () => som.carmen?.('tecla'));
          depois(dur, () => { numero.classList.add('contou'); som.carmen?.('carimbo'); numero.parentElement.classList.add('pulou'); });
          // Cada selo ganho brilha e soa quando assenta (CSS: 1.900 ms + 140 ms por selo, 420 ms de queda).
          (e.selos || []).forEach((s) => { const i = TODOS_SELOS.indexOf(s); if (i >= 0) depois(2250 + i * 140, () => som.carmen?.('pista')); });
          depois(3200, () => telaP.classList.add('completo'));
          telaP.addEventListener('click', (ev) => { if (!ev.target.closest('button')) completar(); });
        }
        corpo.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-placar]');
          if (!b) return;
          camada.fechar();
          if (b.dataset.placar === 'arquivo') abrirOArquivo();
          if (b.dataset.placar === 'voltar') { cena?.desmontar(); location.hash = voltarPara; }
        });
      },
    });
  }

  async function telaFinalBanco() {
    if (!banco.final && st.final) banco.final = await noBanco(() => F.escolherFinal(caso.id, p.id, st.final));
    if (!banco.final && !rota) { fecho(); return; }
    banco.ranking = await F.rankingDoCapitulo(caso.id).catch(() => banco.ranking);
    if (rota) { placarRota(); return; }
    const e = banco.estado;
    const resolvidos = banco.ranking.filter((x) => x.resolvido_em);
    const html = `
      ${banco.final ? `<div class="texto-narracao">${narracao(banco.final.texto || '')}</div>
      <p class="consequencia"><b>Na semana seguinte:</b> ${esc(banco.final.efeito || '')}</p>` : ''}
      <section class="placar" aria-label="Ranking do capítulo">
        <h3>Ranking do capítulo</h3>
        <ol>${resolvidos.map((x, i) => `<li class="${x.voce ? 'voce' : ''}"><span class="placar-pos">${i + 1}º</span><b>${esc(x.nome)}</b><small>${x.nota} pontos${x.erros ? ` · ${x.erros} ${x.erros > 1 ? 'erros' : 'erro'}` : ''}</small></li>`).join('')}</ol>
        <dl class="placar-numeros">
          <div><dt>Sua nota</dt><dd>${e.nota ?? '—'} de 1000</dd></div>
          <div><dt>Selos</dt><dd>${(e.selos || []).map((s) => esc(SELOS[s] || s)).join(', ') || 'nenhum'}</dd></div>
          <div><dt>Pistas achadas</dt><dd>${(e.pistas || []).length}</dd></div>
          <div><dt>${rota ? 'Licenças erradas' : 'Acusações erradas'}</dt><dd>${e.acusacoes_erradas}</dd></div>${rota ? `
          <div><dt>Viagens erradas</dt><dd>${e.viagens_erradas || 0}</dd></div>` : ''}
        </dl>
      </section>`;
    caixa({
      rotulo: `${caso.titulo} · fim do capítulo`, html, fechavel: true,
      opcoes: [
        rota
          ? { html: 'Ver o rastro', fn: (cam) => { cam.fechar(); verORastro(); } }
          : { html: 'Ver o quadro de pistas', fn: (cam) => { cam.fechar(); abrirOQuadro(); } },
        { html: textoVoltar, fn: (cam) => { cam.fechar(); cena?.desmontar(); location.hash = voltarPara; } },
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
    // A fuga (laco.md, seção 6): o amanhecer encerra a noite, sem prisão. Uma revanche por capítulo, com a mesma
    // rota e o mesmo culpado, sem selos e fora do ranking; ou a volta à temporada (o capítulo seguinte abre).
    if (rota) {
      caixa({
        rotulo: 'O sol nasceu', fechavel: false,
        texto: `[A FOME] O céu clareia sobre o Rio. Volto ao refúgio antes que o sol me queime.

Quem levou a relíquia já está dormindo, em algum lugar da cidade. Esta noite acabou sem prisão.`,
        opcoes: [
          ...(banco.estado.revanche_possivel ? [{ html: 'Revanche: a mesma noite, do começo <small class="etiqueta-teste">sem selos e fora do ranking</small>', fn: (cam) => { cam.fechar(); revanche(); } }] : []),
          { html: textoVoltar, fn: async (cam) => { cam.fechar(); await noBanco(() => F.novaNoite(caso.id, p.id)); cena?.desmontar(); location.hash = voltarPara; } },
        ],
      });
      return;
    }
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

  async function revanche() {
    const r = await noBanco(() => F.recomecar(caso.id, p.id));
    if (!r) return;
    amanheceuPendente = false;
    st = novo();
    st.viuAbertura = true;
    listaRegistro.innerHTML = '';
    aplicarBanco(r);
    await lerLugar(st.lugar);
    salvar();
    fecharTudo();
    montarLugar();
    anotar('XERIFE IOLANDA', 'Revanche: a mesma noite, do começo. Desta vez não vale selo nem ranking.');
    faixa('faixa-chegada', 'Revanche', caso.lugares[st.lugar].nome);
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
  // Carmen 2026 (régua do 10, abertura): o cartão "CAPÍTULO N" por 1,5 s; depois as falas entram uma a uma,
  // 300 ms entre elas, e um clique mostra tudo. Um clique leva à cena: as regras viram dicas na hora certa.
  function aberturaRota() {
    const cartao = document.createElement('div');
    cartao.className = 'cartao-capitulo';
    cartao.innerHTML = `<b>${esc(caso.rotulo)}</b><span>${esc(caso.titulo)}</span>`;
    tela.appendChild(cartao);
    tela.classList.add('abrindo-capitulo');
    let foi = false;
    const seguir = () => {
      if (foi) return;
      foi = true;
      cartao.classList.add('saindo');
      tela.classList.remove('abrindo-capitulo');
      setTimeout(() => cartao.remove(), 300);
      if (som.ligado()) som.trovao?.(0.4);
      // Com os quadros do Narrador (3, curtos, com imagem), a abertura é uma tira de HQ no lugar do texto longo.
      const paineis = Array.isArray(caso.abertura.paineis) && caso.abertura.paineis.length ? caso.abertura.paineis : null;
      const cam = caixa({
        rotulo: `${caso.rotulo} · ${caso.titulo}`, fechavel: false,
        ...(paineis ? { html: quadrinhos(paineis).replace('class="hq ', 'class="hq hq-tira tira-rota ').replaceAll(' loading="lazy"', '') } : { texto: caso.abertura.texto }),
        opcoes: [{ html: '<b>Começar a investigar</b>', fn: (c) => {
          st.viuAbertura = true; salvar(); c.fechar(); olharInicial();
          const chegada = chegadaSemFrase(st.lugar);
          if (chegada) anotar('VOCÊ', chegada);
          // O capítulo também abre com o cartão de chegada; a dica entra 1 s depois de ele encolher.
          cartaoChegada(caso.lugares[st.lugar], null, caso.tempo?.frases?.[st.lugar], () => setTimeout(() =>
            dica('conversa', `${document.body.classList.contains('toque') ? 'Toque' : 'Clique'} no rosto de uma testemunha para conversar.`), 1000));
        } }],
      });
      cam.el.classList.add('abertura-rota');
      // Quem liga é a Xerife: o mesmo cartão de foto da conversa (sem retrato pintado, a silhueta). Na tira, os quadros
      // já mostram a cena, e o cartão fica de fora.
      if (paineis) cam.el.classList.add('com-tira');
      const foto = document.createElement('figure');
      foto.className = 'cartao-testemunha sem-figura xerife';
      foto.setAttribute('aria-hidden', 'true');
      foto.innerHTML = '<span class="ct-foto"></span><figcaption>Iolanda</figcaption><small>Xerife</small>';
      if (!paineis) { cam.el.prepend(foto); cam.el.classList.add('com-cartao'); }
      // A leitura começa do alto, não do botão (este quadro vem depois do que a camada pediu, que rola até o fim).
      const corpo = cam.el.querySelector('.dialogo-corpo');
      requestAnimationFrame(() => { if (corpo) corpo.scrollTop = 0; });
      if (cerimoniasCurtas()) return;
      const falas = [...cam.el.querySelectorAll('.texto-narracao > *, .tira-rota > .painel')];
      falas.forEach((f, i) => f.style.setProperty('--i', i));
      cam.el.classList.add('entrando');
      const tudo = () => cam.el.classList.remove('entrando');
      setTimeout(tudo, falas.length * 300 + 400);
      cam.el.querySelector('.texto-narracao, .tira-rota')?.addEventListener('click', tudo, { once: true });
    };
    cartao.addEventListener('click', seguir);
    setTimeout(seguir, cerimoniasCurtas() ? 600 : 1500);
  }
  // As regras na hora: cada dica aparece uma vez, quando a coisa acontece pela primeira vez.
  function dica(chave, texto) {
    if (!rota) return;
    st.dicasVistas ||= [];
    if (st.dicasVistas.includes(chave)) return;
    st.dicasVistas.push(chave);
    salvar();
    avisar('faixa-dica', 'Dica', texto);
    // Enquanto a dica de conversa está à vista, os rostos das testemunhas pulsam.
    if (chave === 'conversa') {
      tela.classList.add('com-dica-conversa');
      setTimeout(() => tela.classList.remove('com-dica-conversa'), 7000);
    }
  }
  function abertura() {
    if (rota) { aberturaRota(); return; }
    caixa({
      rotulo: `${caso.rotulo} · ${caso.titulo}`, revelar: true, fechavel: false,
      html: caso.abertura.paineis ? tiraAbertura() : '',
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
        // No Carmen 2026, a ficha, o som e a ajuda moram aqui (a cena só tem Mapa, Arquivo e Pistas).
        opcoes: [...(rota ? ['Ver a ficha', som.ligado() ? 'Desligar o som' : 'Ligar o som', 'Como jogar', 'Ver a cena inteira (V)', 'Centrar no personagem (C)', tela.querySelector('.botao-pausa')?.getAttribute('aria-pressed') === 'true' ? 'Soltar a cena (espaço)' : 'Pausar a cena (espaço)', 'Esconder os painéis (H)'] : []), ...(st.resolvido ? [] : ['Pedir uma dica']), 'Ver o ranking da temporada', 'Sair do caso', 'Voltar ao caso'],
      });
      const escolha = [...(rota ? ['ficha', 'som', 'ajuda', 'visao', 'centrar', 'pausa', 'paineis'] : []), ...(st.resolvido ? [] : ['dica']), 'ranking', 'sair', 'voltar'][rb];
      if (escolha === 'ficha') verFicha();
      if (escolha === 'som') { som.alternar(); tela.querySelector('[data-hud="som"]')?.setAttribute('aria-pressed', String(som.ligado())); }
      if (escolha === 'ajuda') ajuda();
      if (escolha === 'visao') cena?.visaoGeral();
      if (escolha === 'centrar') cena?.centrarCamera();
      if (escolha === 'pausa') cena?.alternarPausa();
      if (escolha === 'paineis') alternarPaineis();
      if (escolha === 'dica') pedirDica();
      if (escolha === 'ranking') { cena?.desmontar(); location.hash = voltarPara; }
      if (escolha === 'sair') { cena?.desmontar(); location.hash = voltarPara; }
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
    if (!paineisOcultos && rota) marcasDoTitulo();
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
      case 'arquivo': abrirOArquivo(); break;
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
  // Carmen 2026: cada botão responde com um clique seco (guia, 6.3).
  if (rota) tela.addEventListener('click', (ev) => { if (ev.target.closest('button')) som.carmen?.('clique'); }, true);
  montarLugar();
  // Vitrine: &tela=mapa|arquivo|rastro|placar abre direto um painel, para a avaliação dar nota sem jogar até lá.
  const telaPedida = opcoes.vitrine && (location.hash.match(/[?&]tela=([a-z]+)/) || [])[1];
  if (telaPedida) {
    history.replaceState(null, '', location.hash.replace(/[?&]tela=[a-z]+/, ''));
    st.viuAbertura = true;
    salvar();
    const abrir = { mapa: viajar, arquivo: abrirOArquivo, rastro: verORastro, placar: telaFinal, amanhecer }[telaPedida];
    if (abrir) { setTimeout(abrir, 300); return; }
  }
  if (!st.viuAbertura) abertura();
  else if (st.resolvido && st.final) telaFinal();
  else if (st.resolvido) fecho();
  else if (st.hora >= caso.relogio.fim) amanhecer();
}
