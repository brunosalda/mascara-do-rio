// Subsolo: a tela da fatia de teste (só na vitrine, sem banco). Junta a lógica, o corredor e os controles.
import { aplicarComando, criarPartida, DIRECOES, minutosDaNoite, tipoChao } from './logica.js';
import { MAPA_TESTE } from './mapa-teste.js';
import { criarCorredor } from './corredor.js';

const DURACAO = { passo: 180, giro: 170, tranco: 120 }; // milissegundos

// O grupo de teste: o agente e três vampiros, com as pinturas de clã que já existem.
const GRUPO = [
  { id: 'agente', nome: 'Agente', papel: 'Frente', img: 'img/clas/caitiff.jpg' },
  { id: 'brujah', nome: 'Brujah', papel: 'Frente', img: 'img/clas/brujah.jpg' },
  { id: 'nosferatu', nome: 'Nosferatu', papel: 'Atrás', img: 'img/clas/nosferatu.jpg' },
  { id: 'tremere', nome: 'Tremere', papel: 'Atrás', img: 'img/clas/tremere.jpg' },
];

const BOTOES = [
  { cmd: 'gira-e', rotulo: 'Girar à esquerda', icone: '↺', tecla: 'Q' },
  { cmd: 'frente', rotulo: 'Andar para a frente', icone: '▲', tecla: 'W' },
  { cmd: 'gira-d', rotulo: 'Girar à direita', icone: '↻', tecla: 'E' },
  { cmd: 'lado-e', rotulo: 'Passo para a esquerda', icone: '◀', tecla: 'A' },
  { cmd: 'tras', rotulo: 'Passo para trás', icone: '▼', tecla: 'S' },
  { cmd: 'lado-d', rotulo: 'Passo para a direita', icone: '▶', tecla: 'D' },
];

const TECLAS = {
  arrowup: 'frente', w: 'frente', arrowdown: 'tras', s: 'tras',
  a: 'lado-e', d: 'lado-d', arrowleft: 'gira-e', q: 'gira-e', arrowright: 'gira-d', e: 'gira-d',
};

const SE_REPETE = new Set(['frente', 'tras', 'lado-e', 'lado-d']);

function angulo(dir) {
  return ((dir - 1) * Math.PI) / 2; // 1 (leste) é o ângulo zero, com y crescendo para o sul
}

function hora(minutos) {
  const m = ((minutos % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}h${String(m % 60).padStart(2, '0')}`;
}

// Sons feitos na hora, sem arquivo: ruído filtrado conforme o chão.
function criarSom() {
  let ctx = null;
  let ligado = true;
  let ruido = null;
  function preparar() {
    if (ctx || !ligado) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    ctx = new C();
    ruido = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  }
  function estouro(tipoFiltro, freq, q, dur, vol, atraso = 0) {
    const t = ctx.currentTime + atraso;
    const s = ctx.createBufferSource();
    s.buffer = ruido;
    const f = ctx.createBiquadFilter();
    f.type = tipoFiltro;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f).connect(g).connect(ctx.destination);
    s.start(t);
    s.stop(t + dur + 0.02);
  }
  function tom(de, para, dur, vol, tipo = 'sine') {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(de, t);
    o.frequency.exponentialRampToValueAtTime(para, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  return {
    preparar,
    alternar() { ligado = !ligado; if (ligado) preparar(); return ligado; },
    passo(chao) {
      if (!ctx || !ligado) return;
      if (chao === 'agua') { estouro('bandpass', 1500, 0.8, 0.17, 0.3); estouro('lowpass', 420, 0.7, 0.1, 0.22); }
      else if (chao === 'trilho') { estouro('lowpass', 800, 0.8, 0.07, 0.3); tom(2100, 1800, 0.09, 0.03, 'triangle'); }
      else estouro('lowpass', 950, 0.8, 0.07, 0.34);
    },
    tranco() { if (ctx && ligado) { estouro('lowpass', 240, 1, 0.13, 0.55); } },
    gota() { if (ctx && ligado) tom(1050, 520, 0.08, 0.05); },
  };
}

export function telaSubsolo(tela) {
  const hash = location.hash;
  const movimento = /[?&]movimento\b/.test(hash) || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (/[?&]raf=timer\b/.test(hash) && !window.__rafDeTeste) {
    window.__rafDeTeste = true;
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
  }

  // Folha de estilo própria, carregada só nesta tela, com a mesma versão dos módulos.
  if (!document.getElementById('estilo-subsolo')) {
    const versao = import.meta.url.match(/\?v=\d+/)?.[0] ?? '';
    const link = document.createElement('link');
    link.id = 'estilo-subsolo';
    link.rel = 'stylesheet';
    link.href = `css/subsolo.css${versao}`;
    document.head.appendChild(link);
  }

  // Vai direto no corpo da página: a moldura das telas tem animação, e dentro dela o "fixed" não cobre tudo.
  document.querySelector('.subsolo')?.remove();
  tela.innerHTML = '';
  document.body.insertAdjacentHTML('beforeend', `
    <section class="subsolo" aria-label="Subsolo, teste de andar">
      <div class="ss-vista">
        <canvas class="ss-canvas" aria-hidden="true"></canvas>
        <div class="ss-topo">
          <span class="ss-bussola" title="Para onde você olha"></span>
          <span class="ss-hora" title="Hora da noite"></span>
          <button class="ss-som" type="button" aria-pressed="true">Som ligado</button>
        </div>
        <p class="ss-aviso" role="status" hidden></p>
      </div>
      <div class="ss-grupo">
        ${GRUPO.map((v) => `
          <article class="ss-vampiro">
            <img src="${v.img}" alt="">
            <div><b>${v.nome}</b><small>${v.papel}</small></div>
          </article>`).join('')}
      </div>
      <div class="ss-botoes" role="group" aria-label="Andar">
        ${BOTOES.map((b) => `<button type="button" data-cmd="${b.cmd}" aria-label="${b.rotulo}"><span>${b.icone}</span><kbd>${b.tecla}</kbd></button>`).join('')}
      </div>
    </section>`);

  const raiz = document.body.querySelector('.subsolo');
  const canvas = raiz.querySelector('.ss-canvas');
  const bussola = raiz.querySelector('.ss-bussola');
  const relogio = raiz.querySelector('.ss-hora');
  const aviso = raiz.querySelector('.ss-aviso');
  const botaoSom = raiz.querySelector('.ss-som');

  const partida = criarPartida(MAPA_TESTE);
  const corredor = criarCorredor(canvas, partida.mapa);
  const som = criarSom();

  // Pose desenhada: coordenadas contínuas da câmera, interpoladas pela animação.
  const pose = { x: partida.x + 0.5, y: partida.y + 0.5, ang: angulo(partida.dir), balanco: 0, empurraX: 0, empurraY: 0 };
  let anim = null;
  let fila = null;
  let seguro = null;
  let sujo = true;
  let gotasAtivas = [];
  let proximaGota = performance.now() + 900;

  const medidas = { comandos: 0, executados: 0, respostas: [], quadros: [] };
  window.__subsolo = { partida, medidas };

  function atualizarPainel() {
    bussola.textContent = DIRECOES[partida.dir].letra;
    relogio.textContent = hora(minutosDaNoite(partida));
  }

  function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
  }

  function fecharAnim() {
    if (!anim) return;
    pose.x = anim.para.x;
    pose.y = anim.para.y;
    pose.ang = anim.para.ang;
    pose.balanco = 0;
    pose.empurraX = 0;
    pose.empurraY = 0;
    anim = null;
    sujo = true;
  }

  function iniciar(cmd, agora) {
    fecharAnim();
    const r = aplicarComando(partida, cmd);
    medidas.executados += 1;
    atualizarPainel();
    const alvo = { x: r.para.x + 0.5, y: r.para.y + 0.5, ang: pose.ang };
    if (r.tipo === 'giro') alvo.ang = pose.ang + (Math.PI / 2) * r.sentido;
    if (r.tipo === 'passo') som.passo(r.chao);
    if (r.tipo === 'tranco') som.tranco();
    if (r.chegouAgora) mostrarAviso('Você chegou ao alçapão. Fim do teste de andar: pode continuar andando.');
    if (!movimento) {
      pose.x = alvo.x;
      pose.y = alvo.y;
      pose.ang = alvo.ang;
      sujo = true;
      return;
    }
    anim = {
      tipo: r.tipo,
      inicio: agora,
      duracao: DURACAO[r.tipo],
      de: { x: pose.x, y: pose.y, ang: pose.ang },
      para: alvo,
      direcao: r.direcao,
    };
    sujo = true;
  }

  function pedir(cmd) {
    const agora = performance.now();
    medidas.comandos += 1;
    som.preparar();
    if (!anim) { iniciar(cmd, agora); medidas.respostas.push(performance.now() - agora); return; }
    if (fila === null) { fila = cmd; return; }
    // Fila cheia: o passo atual termina na hora e nenhum comando se perde.
    const guardado = fila;
    fila = cmd;
    iniciar(guardado, agora);
  }

  function atualizarAnim(agora) {
    if (!anim) return;
    const t = Math.min(1, (agora - anim.inicio) / anim.duracao);
    if (anim.tipo === 'tranco') {
      const f = Math.sin(t * Math.PI) * 0.09;
      pose.empurraX = anim.direcao.x * f;
      pose.empurraY = anim.direcao.y * f;
    } else {
      const e = 1 - (1 - t) ** 2.4; // sai rápido, para a resposta ser imediata, e assenta
      pose.x = anim.de.x + (anim.para.x - anim.de.x) * e;
      pose.y = anim.de.y + (anim.para.y - anim.de.y) * e;
      pose.ang = anim.de.ang + (anim.para.ang - anim.de.ang) * e;
      pose.balanco = anim.tipo === 'passo' ? -Math.sin(t * Math.PI) * 0.016 : 0;
    }
    sujo = true;
    if (t >= 1) {
      fecharAnim();
      if (fila !== null) { const c = fila; fila = null; iniciar(c, agora); }
      else if (seguro !== null) iniciar(seguro, agora);
    }
  }

  function gotejar(agora) {
    if (movimento && agora > proximaGota) {
      proximaGota = agora + 1100 + Math.random() * 2200;
      const d = DIRECOES[partida.dir];
      const distancia = 1 + Math.floor(Math.random() * 3);
      const x = partida.x + d.x * distancia;
      const y = partida.y + d.y * distancia;
      if (partida.mapa.celulas[y]?.[x] && partida.mapa.celulas[y][x] !== '#') {
        const lado = tipoChao(partida.mapa, x, y) === 'agua' ? 0.35 : 0.2;
        gotasAtivas.push({ x: x + 0.5 + (Math.random() - 0.5) * lado, y: y + 0.5 + (Math.random() - 0.5) * lado, inicio: agora, duracao: 620 });
        som.gota();
      }
    }
    if (gotasAtivas.length) {
      gotasAtivas = gotasAtivas.filter((g) => agora - g.inicio < g.duracao);
      sujo = true;
    }
  }

  function quadro() {
    if (!canvas.isConnected) { desligar(); return; }
    const agora = performance.now();
    atualizarAnim(agora);
    gotejar(agora);
    if (sujo) {
      sujo = false;
      const t0 = performance.now();
      corredor.desenhar(pose, { gotas: gotasAtivas, agora });
      if (medidas.quadros.length < 2000) medidas.quadros.push(performance.now() - t0);
    }
    requestAnimationFrame(quadro);
  }

  function aoTeclar(e) {
    const cmd = TECLAS[e.key.toLowerCase()];
    if (!cmd || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    if (e.repeat) return;
    if (SE_REPETE.has(cmd)) seguro = cmd;
    pedir(cmd);
  }

  function aoSoltarTecla(e) {
    const cmd = TECLAS[e.key.toLowerCase()];
    if (cmd && cmd === seguro) seguro = null;
  }

  function aoSoltarDedo() {
    seguro = null;
  }

  function aoPerderFoco() {
    seguro = null;
  }

  raiz.querySelectorAll('.ss-botoes button').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (SE_REPETE.has(b.dataset.cmd)) seguro = b.dataset.cmd;
      pedir(b.dataset.cmd);
    });
    // Sem o menu do toque longo no celular.
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  botaoSom.addEventListener('click', () => {
    const ligado = som.alternar();
    botaoSom.textContent = ligado ? 'Som ligado' : 'Som desligado';
    botaoSom.setAttribute('aria-pressed', String(ligado));
  });

  const observador = new ResizeObserver(() => { corredor.redimensionar(); sujo = true; });
  observador.observe(canvas);
  window.addEventListener('keydown', aoTeclar);
  window.addEventListener('keyup', aoSoltarTecla);
  window.addEventListener('pointerup', aoSoltarDedo);
  window.addEventListener('pointercancel', aoSoltarDedo);
  window.addEventListener('blur', aoPerderFoco);
  window.addEventListener('hashchange', aoSair);

  function aoSair() {
    raiz.remove();
    desligar();
  }

  function desligar() {
    observador.disconnect();
    window.removeEventListener('hashchange', aoSair);
    window.removeEventListener('keydown', aoTeclar);
    window.removeEventListener('keyup', aoSoltarTecla);
    window.removeEventListener('pointerup', aoSoltarDedo);
    window.removeEventListener('pointercancel', aoSoltarDedo);
    window.removeEventListener('blur', aoPerderFoco);
  }

  atualizarPainel();
  requestAnimationFrame(quadro);
}
