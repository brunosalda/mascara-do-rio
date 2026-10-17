// Mapa do Rio: o vampiro anda pela cidade vista de cima (WASD, setas ou clique) e entra nos bairros
// (E, Enter ou clique). O fundo é uma pintura do Rio visto de cima; os bairros são desenhados por cima.
import { LOCAIS, localDe } from '../cidade.js';
import { COR_CLA } from './silhueta.js';
import { camadaAberta, teclaNaCamada } from './camadas.js';
import { som } from '../ambiente.js';
import { esc } from '../ui.js';
import { cerimoniasCurtas } from '../leitura.js';
import { fraseDescobertas } from './detalhes.js';

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
    <defs>
      <radialGradient id="nevoa-lugar"><stop offset="0" stop-color="#05070a" stop-opacity="0.78"/><stop offset="0.6" stop-color="#0a0e12" stop-opacity="0.55"/><stop offset="1" stop-color="#0a0e12" stop-opacity="0"/></radialGradient>
      <clipPath id="recorte-retrato"><circle r="38"/></clipPath>
      <radialGradient id="brilho-lugar"><stop offset="0" stop-color="#ffb070" stop-opacity="0.6"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient></defs>
    <image href="img/mapa-rio.jpg" x="0" y="0" width="${LARGURA}" height="${ALTURA}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${LARGURA}" height="${ALTURA}" fill="rgba(5, 8, 10, 0.18)"/>
    <text class="mapa-agua" x="1610" y="470">Baía de Guanabara</text>
    <text class="mapa-agua" x="720" y="1030">Oceano Atlântico</text>`;
}
// Área com todos os bairros e rótulos (nome, brasas, frase), com folga: o mapa enquadra esta área
// inteira no computador; numa tela estreita, mostra a altura toda e desliza na horizontal.
const AREA = { x: 90, y: 50, w: 1790, h: 860 };

// Brasas das descobertas dentro do rótulo do bairro (sem números; pedido do Bruno).
const brasasSvg = (d) => (d?.total ? `<tspan class="mapa-brasas" dx="12" dy="-3">${Array.from({ length: d.total }, (_, i) => `<tspan class="brasa-svg${i < d.vistos ? ' acesa' : ''}" dx="${i ? 5 : 0}">●</tspan>`).join('')}</tspan>` : '');

// visitados: bairros já vistos (os outros ficam sob névoa); descobertas: { id: { vistos, total } };
// retrato: aparece no "você está aqui". Clique ou toque num bairro viaja direto, com a rota animada;
// no teclado, setas ou Tab escolhem o bairro e Enter viaja.
export function montarMapa(raiz, { cla, atualId = null, localAtual, aoEntrar, aoTecla, visitados = null, descobertas = {}, retrato = '' } = {}) {
  const atual = atualId || localDe(localAtual)?.id;
  const inicio = POSICOES[atual] || POSICOES.lapa;
  raiz.innerHTML = `
    <div class="mapa">
      <svg class="mapa-svg" viewBox="0 0 ${LARGURA} ${ALTURA}" preserveAspectRatio="xMidYMid slice">
        ${desenhoDoMapa()}
        <g class="mapa-lugares">
          ${LOCAIS.map((l) => {
            const [x, y] = POSICOES[l.id] || [0, 0];
            const novo = visitados && !visitados.has(l.id) && l.id !== atual;
            const d = descobertas[l.id];
            const frase = novo ? 'nunca visitado' : fraseDescobertas(d?.vistos || 0, d?.total || 0);
            return `
              <g class="mapa-lugar ${l.id === atual ? 'atual' : ''} ${novo ? 'nao-visitado' : ''}" data-lugar="${l.id}" transform="translate(${x} ${y})" role="button" aria-label="${esc(l.nome)}${frase ? `: ${frase}` : ''}">
                <title>${esc(l.nome)}${frase ? ` · ${frase}` : ''}</title>
                ${novo ? '<circle class="mapa-nevoa" r="70" fill="url(#nevoa-lugar)"/>' : ''}
                <circle class="mapa-brilho" r="60" fill="url(#brilho-lugar)"/>
                ${l.id === atual && retrato
                  ? `<circle class="mapa-pulso" r="46"/><circle class="mapa-voce" r="46"/><image class="mapa-retrato" href="${esc(retrato)}" x="-38" y="-38" width="76" height="76" clip-path="url(#recorte-retrato)" preserveAspectRatio="xMidYMid slice"/>`
                  : `<circle class="mapa-ponto" r="9"/>${l.id === atual ? '<circle class="mapa-voce" r="18"/>' : ''}`}
                <text class="mapa-nome" y="${l.id === atual && retrato ? -56 : -20}">${esc(l.nome)}${novo ? '' : brasasSvg(d)}</text>
                ${l.id === atual ? `<text class="mapa-aqui" y="${retrato ? 70 : 36}">você está aqui</text>` : ''}
                <text class="mapa-descobertas" y="${l.id === atual ? (retrato ? 94 : 58) : 34}">${esc(frase)}</text>
              </g>`;
          }).join('')}
        </g>
        <path class="mapa-rota" d="" hidden/>
        <g class="mapa-vampiro" style="--cor-cla:${COR_CLA[cla] || '#e2703e'}">
          <ellipse rx="14" ry="5" cy="14" class="sombra"/>
          <circle r="11" class="cabeca-mapa"/>
          <circle r="22" class="aura-mapa"/>
        </g>
      </svg>
      <div class="dica-interagir" hidden></div>
    </div>`;
  const svg = raiz.querySelector('.mapa-svg');
  const caixaMapa = raiz.querySelector('.mapa');

  // Enquadramento: no computador, todos os bairros inteiros; numa tela estreita (celular em pé), a
  // altura toda, centrada no bairro atual, e o dedo arrasta para os lados.
  let desloc = null;
  function enquadrar() {
    const largura = svg.clientWidth || window.innerWidth;
    const altura = svg.clientHeight || window.innerHeight;
    const aspecto = largura / Math.max(1, altura);
    if (aspecto >= 1.3) {
      desloc = null;
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('viewBox', `${AREA.x} ${AREA.y} ${AREA.w} ${AREA.h}`);
      return;
    }
    // Folga no alto para os rótulos de cima não encostarem no título e no botão de voltar.
    const h = AREA.h + 90;
    const w = h * aspecto;
    const centro = (POSICOES[atual] || POSICOES.lapa)[0];
    if (desloc == null) desloc = centro - w / 2;
    desloc = Math.max(AREA.x - 40, Math.min(AREA.x + AREA.w + 40 - w, desloc));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('viewBox', `${desloc.toFixed(1)} ${AREA.y - 90} ${w.toFixed(1)} ${h}`);
  }
  enquadrar();
  window.addEventListener('resize', enquadrar);
  let arraste = null;
  let arrastou = false;
  svg.addEventListener('pointerdown', (ev) => { if (desloc != null) { arraste = { x: ev.clientX, d: desloc }; arrastou = false; } });
  svg.addEventListener('pointermove', (ev) => {
    if (!arraste) return;
    const dx = ev.clientX - arraste.x;
    if (Math.abs(dx) > 8) arrastou = true;
    if (!arrastou) return;
    const escala = ((AREA.h + 90) * (svg.clientWidth / svg.clientHeight)) / svg.clientWidth;
    desloc = arraste.d - dx * escala;
    enquadrar();
  });
  const soltar = () => { arraste = null; };
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);
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

  let viajando = false;
  function entrar(id) {
    if (!id || camadaAberta() || viajando) return;
    som.toque();
    aoEntrar?.(id);
  }

  // Viagem direta: uma linha tracejada sai do bairro atual até o destino (600 ms) e a cena abre.
  const rota = raiz.querySelector('.mapa-rota');
  function viajar(id) {
    if (viajando || camadaAberta()) return;
    caixaMapa.classList.add('viajando');
    const de = POSICOES[atual] || [pos.x, pos.y];
    const ate = POSICOES[id];
    if (!ate || id === atual) { entrar(id); return; }
    viajando = true;
    const mx = (de[0] + ate[0]) / 2;
    const my = Math.min(de[1], ate[1]) - Math.hypot(ate[0] - de[0], ate[1] - de[1]) * 0.25;
    rota.setAttribute('d', `M${de[0]},${de[1]} Q${mx},${my} ${ate[0]},${ate[1]}`);
    rota.hidden = false;
    const comprimento = rota.getTotalLength();
    rota.style.strokeDasharray = `14 10`;
    rota.animate([{ strokeDashoffset: comprimento, opacity: 0.2, clipPath: 'inset(0 100% 0 0)' }, { strokeDashoffset: 0, opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: 600, easing: 'ease-in-out', fill: 'forwards' });
    let t0 = null;
    const passo = (agora) => {
      t0 ??= agora;
      const k = Math.min(1, (agora - t0) / 600);
      const p = rota.getPointAtLength(comprimento * k);
      vampiro.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      pos.x = p.x; pos.y = p.y;
      if (k < 1) requestAnimationFrame(passo);
      else {
        // Passagem de cena: escurece em 250 ms antes de abrir o bairro (com menos movimento, só o corte).
        const reduzido = cerimoniasCurtas();
        if (reduzido) { viajando = false; entrar(id); return; }
        const veu = document.createElement('div');
        veu.className = 'veu-passagem';
        raiz.appendChild(veu);
        setTimeout(() => { viajando = false; entrar(id); }, 250);
      }
    };
    requestAnimationFrame(passo);
  }

  function quadro(agora) {
    if (!vivo) return;
    if (!raiz.isConnected) { desmontar(); return; }
    if (viajando) { ultimo = agora; requestAnimationFrame(quadro); return; }
    const dt = Math.min(0.12, (agora - ultimo) / 1000);
    ultimo = agora;
    void dt;
    requestAnimationFrame(quadro);
  }

  function escolher(id) {
    perto = id;
    svg.querySelectorAll('.mapa-lugar').forEach((g) => g.classList.toggle('perto', g.dataset.lugar === perto));
    dica.hidden = !perto;
    if (perto) dica.innerHTML = `Ir para ${esc(LOCAIS.find((l) => l.id === perto)?.nome || '')} <kbd>Enter</kbd>`;
  }

  const aoApertar = (ev) => {
    if (camadaAberta()) { if (teclaNaCamada(ev)) ev.preventDefault(); return; }
    const k = ev.key.toLowerCase();
    const ordem = LOCAIS.map((l) => l.id);
    const passo = (k === 'arrowright' || k === 'arrowdown' || (k === 'tab' && !ev.shiftKey)) ? 1 : (k === 'arrowleft' || k === 'arrowup' || k === 'tab') ? -1 : 0;
    if (passo) {
      ev.preventDefault();
      const i = ordem.indexOf(perto ?? atual);
      escolher(ordem[(i + passo + ordem.length) % ordem.length]);
      return;
    }
    if ((k === 'e' || k === 'enter' || k === ' ') && perto) { ev.preventDefault(); viajar(perto); return; }
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
    void p;
    if (arrastou) { arrastou = false; return; }
    if (g) viajar(g.dataset.lugar);
  });

  document.addEventListener('keydown', aoApertar);
  document.addEventListener('keyup', aoSoltar);
  window.addEventListener('blur', aoPerderFoco);

  function desmontar() {
    vivo = false;
    window.removeEventListener('resize', enquadrar);
    document.removeEventListener('keydown', aoApertar);
    document.removeEventListener('keyup', aoSoltar);
    window.removeEventListener('blur', aoPerderFoco);
  }

  requestAnimationFrame(quadro);
  return { desmontar };
}
