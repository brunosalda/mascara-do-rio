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

// Caminhos entre vizinhos (pontilhados no pergaminho).
const VIZINHOS = [
  ['baixada', 'zona-norte'], ['zona-norte', 'porto'], ['zona-norte', 'santa-teresa'], ['porto', 'centro'], ['centro', 'lapa'],
  ['lapa', 'santa-teresa'], ['lapa', 'cemiterio'], ['centro', 'niteroi'], ['cemiterio', 'zona-sul'], ['santa-teresa', 'morro'],
  ['zona-sul', 'morro'], ['morro', 'barra'], ['barra', 'zona-norte'],
];

// Rodada 28: o mapa vira pergaminho. O papel é feito uma vez (gradiente e ruído); a pintura do Rio
// entra como traço de tinta sépia, multiplicada sobre o papel; as bordas escurecem, irregulares.
function desenhoDoMapa() {
  return `
    <defs>
      <radialGradient id="nevoa-lugar"><stop offset="0" stop-color="#3a2a18" stop-opacity="0.35"/><stop offset="1" stop-color="#3a2a18" stop-opacity="0"/></radialGradient>
      <clipPath id="recorte-retrato"><circle r="38"/></clipPath>
      <clipPath id="recorte-medalhao"><circle r="23"/></clipPath>
      <radialGradient id="brilho-lugar"><stop offset="0" stop-color="#b8202e" stop-opacity="0.35"/><stop offset="1" stop-color="#b8202e" stop-opacity="0"/></radialGradient>
      <radialGradient id="papel" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#e8d7b0"/><stop offset="0.6" stop-color="#d9c194"/><stop offset="1" stop-color="#a88a5a"/></radialGradient>
      <radialGradient id="borda-papel" cx="50%" cy="50%" r="72%"><stop offset="0.62" stop-color="#3a2410" stop-opacity="0"/><stop offset="0.9" stop-color="#3a2410" stop-opacity="0.45"/><stop offset="1" stop-color="#1e1208" stop-opacity="0.85"/></radialGradient>
      <filter id="fibras" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0 0.12 0 0 0 0.22 0"/></filter>
      <filter id="manchas" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 0.4 0 0 0 0 0.28 0 0 0 0 0.12 0 0 0 0.35 -0.08"/></filter>
      <filter id="tinta-sepia"><feColorMatrix type="matrix" values="0.36 0.5 0.12 0 0.02  0.3 0.44 0.1 0 0.0  0.2 0.32 0.08 0 -0.02  0 0 0 1 0"/><feComponentTransfer><feFuncR type="linear" slope="1.5" intercept="-0.1"/><feFuncG type="linear" slope="1.5" intercept="-0.1"/><feFuncB type="linear" slope="1.5" intercept="-0.1"/></feComponentTransfer></filter>
      <filter id="borda-rasgada"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="2"/><feDisplacementMap in="SourceGraphic" scale="40"/></filter>
    </defs>
    <rect width="${LARGURA}" height="${ALTURA}" fill="#1c140c"/>
    <g filter="url(#borda-rasgada)">
      <rect x="20" y="16" width="${LARGURA - 40}" height="${ALTURA - 32}" fill="url(#papel)"/>
    </g>
    <image href="img/mapa-rio.jpg" x="0" y="0" width="${LARGURA}" height="${ALTURA}" preserveAspectRatio="xMidYMid slice" filter="url(#tinta-sepia)" opacity="0.48" style="mix-blend-mode:multiply"/>
    <rect width="${LARGURA}" height="${ALTURA}" filter="url(#manchas)"/>
    <rect width="${LARGURA}" height="${ALTURA}" filter="url(#fibras)"/>
    <rect width="${LARGURA}" height="${ALTURA}" fill="url(#borda-papel)"/>
    <g class="mapa-caminhos">${VIZINHOS.map(([a, b]) => { const pa = POSICOES[a]; const pb = POSICOES[b]; if (!pa || !pb) return ''; const mx = (pa[0] + pb[0]) / 2 + (pb[1] - pa[1]) * 0.12; const my = (pa[1] + pb[1]) / 2 - (pb[0] - pa[0]) * 0.12; return `<path data-de="${a}" data-ate="${b}" d="M${pa[0]},${pa[1]} Q${mx.toFixed(0)},${my.toFixed(0)} ${pb[0]},${pb[1]}"/>`; }).join('')}</g>
    <text class="mapa-agua" x="1610" y="470">Baía de Guanabara</text>
    <text class="mapa-agua" x="720" y="1030">Oceano Atlântico</text>
    <g class="rosa-ventos" transform="translate(1760 900)"><circle r="54"/><path d="M0 -70 L10 0 L0 70 L-10 0 Z"/><path d="M-70 0 L0 -10 L70 0 L0 10 Z"/><text y="-78">N</text></g>`;
}
// Área com todos os bairros e rótulos (nome, brasas, frase), com folga: o mapa enquadra esta área
// inteira no computador; numa tela estreita, mostra a altura toda e desliza na horizontal.
const AREA = { x: 90, y: 50, w: 1790, h: 860 };

// Brasas das descobertas dentro do rótulo do bairro (sem números; pedido do Bruno).
const brasasSvg = (d) => (d?.total ? `<tspan class="mapa-brasas" dx="12" dy="-3">${Array.from({ length: d.total }, (_, i) => `<tspan class="brasa-svg${i < d.vistos ? ' acesa' : ''}" dx="${i ? 5 : 0}">●</tspan>`).join('')}</tspan>` : '');

// visitados: bairros já vistos (os outros ficam sob névoa); descobertas: { id: { vistos, total } };
// retrato: aparece no "você está aqui". Clique ou toque num bairro viaja direto, com a rota animada;
// no teclado, setas ou Tab escolhem o bairro e Enter viaja.
export function montarMapa(raiz, { cla, atualId = null, localAtual, aoEntrar, aoTecla, visitados = null, descobertas = {}, retrato = '', clima = '' } = {}) {
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
            const frase = novo ? 'nunca visitado' : d?.total ? `${d.vistos || 0} de ${d.total} descobertas` : fraseDescobertas(d?.vistos || 0, d?.total || 0);
            return `
              <g class="mapa-lugar ${l.id === atual ? 'atual' : ''} ${novo ? 'nao-visitado' : ''}" data-lugar="${l.id}" transform="translate(${x} ${y})" role="button" aria-label="${esc(l.nome)}${frase ? `: ${frase}` : ''}">
                <title>${esc(l.nome)}${frase ? ` · ${frase}` : ''}${clima ? ` · ${clima}` : ''}</title>
                ${novo ? '<circle class="mapa-nevoa" r="70" fill="url(#nevoa-lugar)"/>' : ''}
                <circle class="mapa-brilho" r="62" fill="url(#brilho-lugar)"/>
                <circle class="medalhao-aro" r="28"/>
                ${l.imagem ? `<image class="medalhao-pintura" href="${esc(l.imagem)}" x="-23" y="-23" width="46" height="46" clip-path="url(#recorte-medalhao)" preserveAspectRatio="xMidYMid slice"/>` : '<circle class="medalhao-vazio" r="23"/>'}
                <circle class="medalhao-filete" r="23"/>
                ${l.id === atual ? '<circle class="mapa-pulso" r="34"/><path class="mapa-gota" d="M0 -66 C6 -56 10 -51 10 -45 A10 10 0 0 1 -10 -45 C-10 -51 -6 -56 0 -66 Z"/>' : ''}
                <text class="mapa-nome" y="50">${esc(l.nome)}${novo ? '' : brasasSvg(d)}</text>
                ${l.id === atual ? '<text class="mapa-aqui" y="70">você está aqui</text>' : ''}
                <text class="mapa-descobertas" y="${l.id === atual ? 90 : 70}">${esc(frase)}${clima ? ` · ${esc(clima)}` : ''}</text>
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
