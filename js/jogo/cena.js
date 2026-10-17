// Motor da cena: o personagem anda sobre a pintura do lugar (WASD, setas ou clique),
// chega perto dos pontos de interesse e interage (E, Enter ou clique). A câmera acompanha.
// Com folha de caminhada (sprite), os quadros trocam conforme a distância andada, para os pés
// acompanharem o chão; sem ela, aparece a silhueta.
import { silhueta } from './silhueta.js';
import { camadaAberta, teclaNaCamada } from './camadas.js';
import { som } from '../ambiente.js';

const CHAO = { topo: 0.58, base: 0.92 }; // faixa onde dá para andar, em fração da altura da tela
const VEL_X = 0.22;                       // larguras de tela por segundo
const VEL_Y = 0.5;                        // faixas por segundo
const ACELERACAO = 9;                     // quanto mais alto, mais rápido arranca e para
const ALCANCE = 0.08;                     // distância para interagir
const ALTURA_BONECO = 0.31;               // altura do personagem (fração da tela) no meio do chão
const PIXELS_POR_QUADRO = 0.022;          // distância (em telas) entre um quadro e o seguinte
const TECLAS = {
  w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
};

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
const telaY = (y) => CHAO.topo + y * (CHAO.base - CHAO.topo);
const escala = (y) => 0.75 + y * 0.5;

function htmlBoneco(cla, sprite) {
  if (!sprite?.url) return `<div class="personagem">${silhueta(cla)}</div>`;
  const estilo = `background-image:url('${sprite.url}');--quadros:${sprite.quadros};--proporcao:${sprite.largura / sprite.altura}`;
  return `
    <div class="personagem com-sprite">
      <span class="sombra-pe"></span>
      <span class="sprite reflexo" style="${estilo}"></span>
      <span class="sprite corpo-sprite" style="${estilo}"></span>
    </div>`;
}

export function montarCena(raiz, { cla, sprite = null, pontos = [], inicio = { x: 0.25, y: 0.55 }, aoInteragir, aoTecla } = {}) {
  raiz.innerHTML = `
    <div class="cena">
      <div class="cena-pontos"></div>
      ${htmlBoneco(cla, sprite)}
      <div class="dica-interagir" hidden></div>
    </div>`;
  const cena = raiz.querySelector('.cena');
  const camadaPontos = cena.querySelector('.cena-pontos');
  const boneco = cena.querySelector('.personagem');
  const quadrosSprite = [...boneco.querySelectorAll('.sprite')];
  const dica = cena.querySelector('.dica-interagir');
  const fundo = document.getElementById('cenario');

  const pos = { ...inicio };
  const vel = { x: 0, y: 0 };
  const camera = { x: 0, y: 0 };
  const teclas = new Set();
  let lista = [];
  let alvo = null;
  let perto = null;
  let olhandoEsquerda = false;
  let ultimo = performance.now();
  let andado = 0;          // distância acumulada, para trocar os quadros
  let quadroAtual = -1;
  let proximoPasso = 0;
  let vivo = true;

  function desenharPontos() {
    camadaPontos.innerHTML = lista.map((p) => `
      <button type="button" class="ponto ponto-${p.tipo || 'acao'} ${p.feito ? 'feito' : ''}" data-ponto="${p.id}"
        style="left:${p.x * 100}%;top:${telaY(p.y) * 100}%;--escala:${escala(p.y)};z-index:${Math.round(10 + p.y * 80)}">
        <span class="ponto-anel"></span>
        <span class="ponto-icone">${p.icone || '!'}</span>
        <span class="ponto-rotulo">${p.rotulo}</span>
      </button>`).join('');
  }

  function maisPerto() {
    let melhor = null;
    let menor = Infinity;
    for (const p of lista) {
      const d = Math.hypot(p.x - pos.x, (p.y - pos.y) * (CHAO.base - CHAO.topo));
      if (d < menor) { menor = d; melhor = p; }
    }
    return menor <= ALCANCE ? melhor : null;
  }

  function interagir(p) {
    if (!p || camadaAberta()) return;
    alvo = null;
    som.toque();
    aoInteragir?.(p);
  }

  function mostrarQuadro(n) {
    if (!sprite?.url || n === quadroAtual) return;
    quadroAtual = n;
    const deslocamento = sprite.quadros > 1 ? (n / (sprite.quadros - 1)) * 100 : 0;
    for (const el of quadrosSprite) el.style.backgroundPosition = `${deslocamento}% 0`;
  }

  function quadro(agora) {
    if (!vivo) return;
    if (!raiz.isConnected) { desmontar(); return; }
    const dt = Math.min(0.12, (agora - ultimo) / 1000); // limite alto o bastante para aparelhos lentos
    ultimo = agora;

    // Direção desejada: teclado ou caminho até o alvo do clique.
    let dx = 0;
    let dy = 0;
    if (!camadaAberta()) for (const k of teclas) { const v = TECLAS[k]; if (v) { dx += v[0]; dy += v[1]; } }
    if (dx || dy) alvo = null;
    if (alvo) {
      const ax = alvo.x - pos.x;
      const ay = alvo.y - pos.y;
      const dist = Math.hypot(ax, ay * 0.6);
      if (dist < 0.012) {
        const ponto = alvo.ponto;
        alvo = null;
        if (ponto) interagir(ponto);
      } else {
        dx = ax / dist;
        dy = ay / dist;
      }
    }
    const norma = Math.hypot(dx, dy) || 1;
    const desejadoX = (dx / norma) * VEL_X;
    const desejadoY = (dy / norma) * VEL_Y;

    // Aceleração suave: arranca e para sem tranco.
    const k = Math.min(1, dt * ACELERACAO);
    vel.x += (desejadoX - vel.x) * k;
    vel.y += (desejadoY - vel.y) * k;
    if (Math.abs(vel.x) < 0.002 && !dx) vel.x = 0;
    if (Math.abs(vel.y) < 0.004 && !dy) vel.y = 0;
    pos.x = limitar(pos.x + vel.x * dt, 0.03, 0.97);
    pos.y = limitar(pos.y + vel.y * dt, 0, 1);

    const rapidez = Math.hypot(vel.x / VEL_X, vel.y / VEL_Y); // 0 parado, 1 andando
    const andando = rapidez > 0.15;
    if (Math.abs(vel.x) > 0.02) olhandoEsquerda = vel.x < 0;

    // Quadros da caminhada pela distância andada; parado, o quadro de descanso.
    if (sprite?.url) {
      if (andando) {
        andado += Math.hypot(vel.x, vel.y * (CHAO.base - CHAO.topo)) * dt;
        mostrarQuadro(Math.floor(andado / PIXELS_POR_QUADRO) % sprite.quadros);
      } else {
        mostrarQuadro(sprite.parado ?? 0);
      }
    }
    if (andando && agora > proximoPasso) { som.passo?.(); proximoPasso = agora + 360; }

    const s = escala(pos.y);
    boneco.classList.toggle('andando', andando);
    boneco.style.left = `${pos.x * 100}%`;
    boneco.style.top = `${telaY(pos.y) * 100}%`;
    boneco.style.zIndex = String(Math.round(10 + pos.y * 80));
    boneco.style.setProperty('--altura', `${ALTURA_BONECO * s * 100}vh`);
    boneco.style.setProperty('--virar', olhandoEsquerda ? -1 : 1);
    // Leve inclinação para a frente quando anda.
    boneco.style.setProperty('--inclinar', `${(olhandoEsquerda ? -1 : 1) * rapidez * 2.5}deg`);

    // Câmera: a pintura desliza um pouco para o lado oposto, dando profundidade.
    camera.x += ((0.5 - pos.x) * 5 - camera.x) * Math.min(1, dt * 2.5);
    camera.y += ((0.5 - pos.y) * 1.5 - camera.y) * Math.min(1, dt * 2.5);
    if (fundo) fundo.style.transform = `scale(1.12) translate(${camera.x.toFixed(2)}%, ${camera.y.toFixed(2)}%)`;

    const novo = maisPerto();
    if (novo !== perto) {
      perto = novo;
      camadaPontos.querySelectorAll('.ponto').forEach((b) => b.classList.toggle('perto', b.dataset.ponto === perto?.id));
      dica.hidden = !perto;
      if (perto) dica.innerHTML = `<kbd>E</kbd> ${perto.acao || perto.rotulo}`;
    }
    requestAnimationFrame(quadro);
  }

  const aoApertar = (ev) => {
    if (camadaAberta()) {
      if (teclaNaCamada(ev)) ev.preventDefault();
      return;
    }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    const k = ev.key.toLowerCase();
    if (TECLAS[k]) { teclas.add(k); ev.preventDefault(); return; }
    if (k === 'e' || k === 'enter' || k === ' ') {
      if (perto) { ev.preventDefault(); interagir(perto); }
      return;
    }
    aoTecla?.(ev);
  };
  const aoSoltar = (ev) => teclas.delete(ev.key.toLowerCase());
  const aoPerderFoco = () => teclas.clear();

  cena.addEventListener('click', (ev) => {
    if (camadaAberta()) return;
    const botao = ev.target.closest('[data-ponto]');
    if (botao) {
      const p = lista.find((x) => x.id === botao.dataset.ponto);
      if (!p) return;
      if (p === perto) interagir(p);
      else alvo = { x: p.x, y: p.y, ponto: p };
      return;
    }
    // Clique no chão: anda até lá.
    const r = cena.getBoundingClientRect();
    const fy = (ev.clientY - r.top) / r.height;
    const y = limitar((fy - CHAO.topo) / (CHAO.base - CHAO.topo), 0, 1);
    alvo = { x: limitar((ev.clientX - r.left) / r.width, 0.03, 0.97), y };
  });

  document.addEventListener('keydown', aoApertar);
  document.addEventListener('keyup', aoSoltar);
  window.addEventListener('blur', aoPerderFoco);

  function desmontar() {
    vivo = false;
    document.removeEventListener('keydown', aoApertar);
    document.removeEventListener('keyup', aoSoltar);
    window.removeEventListener('blur', aoPerderFoco);
    if (fundo) fundo.style.transform = '';
  }

  lista = pontos;
  desenharPontos();
  mostrarQuadro(sprite?.parado ?? 0);
  requestAnimationFrame(quadro);

  return {
    atualizarPontos(novos) { lista = novos; perto = null; desenharPontos(); },
    posicao: () => ({ ...pos }),
    desmontar,
  };
}
