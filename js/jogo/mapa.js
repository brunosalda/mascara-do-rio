// Mapa do Rio: o vampiro anda pela cidade vista de cima (WASD, setas ou clique) e entra nos bairros
// (E, Enter ou clique). O fundo é uma pintura do Rio visto de cima; os bairros são desenhados por cima.
import { LOCAIS, localDe } from '../cidade.js';
import { COR_CLA } from './silhueta.js';
import { camadaAberta, teclaNaCamada } from './camadas.js';
import { som } from '../ambiente.js';
import { esc } from '../ui.js';

const LARGURA = 1920;
const ALTURA = 1080;
const VEL = 380;   // unidades do mapa por segundo
const ALCANCE = 75;

// Posição de cada lugar sobre a pintura do mapa (img/mapa-rio.jpg, 1920×1080).
export const POSICOES = {
  baixada: [300, 140], 'zona-norte': [430, 262], porto: [1150, 245], centro: [1185, 335], lapa: [1112, 400],
  'santa-teresa': [985, 385], cemiterio: [1232, 500], 'zona-sul': [1372, 782], morro: [722, 692], barra: [205, 720], niteroi: [1700, 322],
};

function desenhoDoMapa() {
  return `
    <defs><radialGradient id="brilho-lugar"><stop offset="0" stop-color="#ffb070" stop-opacity="0.6"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient></defs>
    <image href="img/mapa-rio.jpg" x="0" y="0" width="${LARGURA}" height="${ALTURA}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${LARGURA}" height="${ALTURA}" fill="rgba(5, 8, 10, 0.18)"/>
    <text class="mapa-agua" x="1610" y="470">Baía de Guanabara</text>
    <text class="mapa-agua" x="720" y="1030">Oceano Atlântico</text>`;
}
export function montarMapa(raiz, { cla, atualId = null, localAtual, aoEntrar, aoTecla } = {}) {
  const atual = atualId || localDe(localAtual)?.id;
  const inicio = POSICOES[atual] || POSICOES.lapa;
  raiz.innerHTML = `
    <div class="mapa">
      <svg class="mapa-svg" viewBox="0 0 ${LARGURA} ${ALTURA}" preserveAspectRatio="xMidYMid slice">
        ${desenhoDoMapa()}
        <g class="mapa-lugares">
          ${LOCAIS.map((l) => {
            const [x, y] = POSICOES[l.id] || [0, 0];
            return `
              <g class="mapa-lugar ${l.id === atual ? 'atual' : ''}" data-lugar="${l.id}" transform="translate(${x} ${y})">
                <circle class="mapa-brilho" r="60" fill="url(#brilho-lugar)"/>
                <circle class="mapa-ponto" r="9"/>
                ${l.id === atual ? '<circle class="mapa-voce" r="18"/>' : ''}
                <text class="mapa-nome" y="-20">${esc(l.nome)}</text>
                ${l.id === atual ? '<text class="mapa-aqui" y="34">você está aqui</text>' : ''}
              </g>`;
          }).join('')}
        </g>
        <g class="mapa-vampiro" style="--cor-cla:${COR_CLA[cla] || '#e2703e'}">
          <ellipse rx="14" ry="5" cy="14" class="sombra"/>
          <circle r="11" class="cabeca-mapa"/>
          <circle r="22" class="aura-mapa"/>
        </g>
      </svg>
      <div class="dica-interagir" hidden></div>
    </div>`;
  const svg = raiz.querySelector('.mapa-svg');
  const vampiro = raiz.querySelector('.mapa-vampiro');
  const dica = raiz.querySelector('.dica-interagir');
  const pos = { x: inicio[0] - 40, y: inicio[1] + 30 };
  const teclas = new Set();
  let alvo = null;
  let perto = null;
  let ultimo = performance.now();
  let vivo = true;
  const DIRS = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };

  function maisPerto() {
    let melhor = null;
    let menor = Infinity;
    for (const [id, [x, y]] of Object.entries(POSICOES)) {
      const d = Math.hypot(x - pos.x, y - pos.y);
      if (d < menor) { menor = d; melhor = id; }
    }
    return menor <= ALCANCE ? melhor : null;
  }

  function entrar(id) {
    if (!id || camadaAberta()) return;
    som.toque();
    aoEntrar?.(id);
  }

  function quadro(agora) {
    if (!vivo) return;
    if (!raiz.isConnected) { desmontar(); return; }
    const dt = Math.min(0.12, (agora - ultimo) / 1000);
    ultimo = agora;
    let dx = 0;
    let dy = 0;
    if (!camadaAberta()) for (const k of teclas) { const v = DIRS[k]; if (v) { dx += v[0]; dy += v[1]; } }
    if (dx || dy) alvo = null;
    if (alvo) {
      const ax = alvo.x - pos.x;
      const ay = alvo.y - pos.y;
      const d = Math.hypot(ax, ay);
      if (d < 6) { const l = alvo.lugar; alvo = null; if (l) entrar(l); } else { dx = ax / d; dy = ay / d; }
    }
    if (dx || dy) {
      const n = Math.hypot(dx, dy);
      pos.x = Math.max(20, Math.min(LARGURA - 20, pos.x + (dx / n) * VEL * dt));
      pos.y = Math.max(20, Math.min(ALTURA - 20, pos.y + (dy / n) * VEL * dt));
    }
    vampiro.setAttribute('transform', `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})`);
    vampiro.classList.toggle('andando', !!(dx || dy));
    const novo = maisPerto();
    if (novo !== perto) {
      perto = novo;
      svg.querySelectorAll('.mapa-lugar').forEach((g) => g.classList.toggle('perto', g.dataset.lugar === perto));
      dica.hidden = !perto;
      if (perto) dica.innerHTML = `<kbd>E</kbd> Ir para ${esc(LOCAIS.find((l) => l.id === perto)?.nome || '')}`;
    }
    requestAnimationFrame(quadro);
  }

  const aoApertar = (ev) => {
    if (camadaAberta()) { if (teclaNaCamada(ev)) ev.preventDefault(); return; }
    const k = ev.key.toLowerCase();
    if (DIRS[k]) { teclas.add(k); ev.preventDefault(); return; }
    if ((k === 'e' || k === 'enter' || k === ' ') && perto) { ev.preventDefault(); entrar(perto); return; }
    aoTecla?.(ev);
  };
  const aoSoltar = (ev) => teclas.delete(ev.key.toLowerCase());
  const aoPerderFoco = () => teclas.clear();

  svg.addEventListener('click', (ev) => {
    const g = ev.target.closest('[data-lugar]');
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    if (g) {
      const [x, y] = POSICOES[g.dataset.lugar];
      if (g.dataset.lugar === perto) entrar(perto);
      else alvo = { x, y, lugar: g.dataset.lugar };
    } else {
      alvo = { x: p.x, y: p.y };
    }
  });

  document.addEventListener('keydown', aoApertar);
  document.addEventListener('keyup', aoSoltar);
  window.addEventListener('blur', aoPerderFoco);

  function desmontar() {
    vivo = false;
    document.removeEventListener('keydown', aoApertar);
    document.removeEventListener('keyup', aoSoltar);
    window.removeEventListener('blur', aoPerderFoco);
  }

  requestAnimationFrame(quadro);
  return { desmontar };
}
