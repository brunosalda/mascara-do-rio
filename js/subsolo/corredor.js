// Subsolo: o corredor em primeira pessoa, desenhado em canvas por planos em perspectiva.
// Na fatia de teste não há imagem nova: paredes quase pretas, faixas de luz por distância, chão molhado e gotas.
// Cada quadro desenha as casas de trás para a frente, com custo baixo e fixo: o mapa é pequeno e só vai até a névoa.
import { DIRECOES, ehParede, tipoChao } from './logica.js';

const ALCANCE = 7.5; // além disso, tudo é escuro
const PERTO = 0.07; // plano de corte, logo à frente da câmera
const RECUO = 0.3; // a câmera fica atrás do centro da casa, para enxergar as paredes do lado
const NIVEIS = 9;
const CALORES = 4;

// Cores: cada superfície vai do quase preto até a cor plena, e esquenta conforme a luz de sódio.
const SUPERFICIES = {
  tijolo: { frio: [46, 41, 38], quente: [126, 72, 38] },
  azulejo: { frio: [50, 74, 66], quente: [134, 116, 66] },
  rejunte: { frio: [14, 18, 17], quente: [42, 28, 18] },
  chao: { frio: [32, 36, 36], quente: [100, 64, 36] },
  agua: { frio: [24, 44, 46], quente: [188, 128, 62] },
  teto: { frio: [20, 20, 20], quente: [58, 38, 24] },
  trilho: { frio: [92, 96, 96], quente: [226, 170, 100] },
};
const PRETO = [6, 7, 8];

function montarTabela() {
  const t = {};
  for (const [nome, s] of Object.entries(SUPERFICIES)) {
    t[nome] = [];
    for (let c = 0; c < CALORES; c += 1) {
      const m = c / (CALORES - 1);
      const alvo = s.frio.map((v, i) => v + (s.quente[i] - v) * m);
      const fila = [];
      for (let n = 0; n < NIVEIS; n += 1) {
        const f = n / (NIVEIS - 1);
        fila.push(`rgb(${alvo.map((v, i) => Math.round(PRETO[i] + (v - PRETO[i]) * f)).join(',')})`);
      }
      t[nome].push(fila);
    }
  }
  return t;
}

// Número fixo por face, para o azulejo quebrado não mudar de lugar a cada quadro.
function sorteioFixo(x, y, f) {
  let h = (x * 374761393 + y * 668265263 + f * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function criarCorredor(canvas, mapa, { aoCarregar } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const tabela = montarTabela();

  // Texturas do acervo (versões pequenas de rastro/assets/texturas/p/). Sem elas, vale o desenho por planos.
  let texParede = null;
  let chaoP = null;
  let tetoP = null;
  let chaoTam = 1;
  let tetoTam = 1;
  let texBanda = null;
  let texReboco = null;
  function carregar(nome, pronto) {
    const img = new Image();
    img.onload = () => { pronto(img); aoCarregar?.(); };
    img.src = `rastro/assets/texturas/p/${nome}-cor.jpg`;
  }
  carregar('cantaria', (img) => { texParede = img; });
  carregar('azulejo-boteco', (img) => { texBanda = img; });
  carregar('reboco', (img) => { texReboco = img; });
  carregar('paralelepipedo', (img) => { chaoP = ctx.createPattern(img, 'repeat'); chaoTam = img.width / 2; });
  carregar('laje', (img) => { tetoP = ctx.createPattern(img, 'repeat'); tetoTam = img.width; });

  // Luz sobre a textura: uma cor multiplicada, nas mesmas faixas de sempre.
  const luzMultiplica = [];
  for (let c = 0; c < CALORES; c += 1) {
    const m = c / (CALORES - 1);
    const alvo = [128 + 127 * m, 158 + 42 * m, 150 - 10 * m];
    const fila = [];
    for (let n = 0; n < NIVEIS; n += 1) {
      const f = (n / (NIVEIS - 1)) ** 0.75;
      fila.push(`rgb(${alvo.map((v) => Math.round(8 + (v - 8) * f)).join(',')})`);
    }
    luzMultiplica.push(fila);
  }
  let L = 1;
  let A = 1;
  let foco = 1;
  let vinheta = null;
  let halo = null;

  // Luz de sódio em cada casa: fixa, calculada uma vez.
  const sodio = [];
  for (let y = 0; y < mapa.altura; y += 1) {
    sodio.push([]);
    for (let x = 0; x < mapa.largura; x += 1) {
      let s = 0;
      for (const l of mapa.luzes) {
        const d2 = (l.x - x) ** 2 + (l.y - y) ** 2;
        s += 1 / (1 + d2 * 1.5);
      }
      sodio[y].push(Math.min(1, s));
    }
  }

  function redimensionar() {
    const caixa = canvas.getBoundingClientRect();
    const escala = Math.min(window.devicePixelRatio || 1, 1.5);
    L = Math.max(2, Math.round(caixa.width * escala));
    A = Math.max(2, Math.round(caixa.height * escala));
    canvas.width = L;
    canvas.height = A;
    foco = Math.max(L * 0.62, A * 0.78);
    vinheta = document.createElement('canvas');
    vinheta.width = L;
    vinheta.height = A;
    const cv = vinheta.getContext('2d');
    const g = cv.createRadialGradient(L / 2, A / 2, Math.min(L, A) * 0.3, L / 2, A / 2, Math.hypot(L, A) * 0.58);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.72)');
    cv.fillStyle = g;
    cv.fillRect(0, 0, L, A);
    halo = document.createElement('canvas');
    halo.width = 128;
    halo.height = 128;
    const ch = halo.getContext('2d');
    const gh = ch.createRadialGradient(64, 64, 2, 64, 64, 64);
    gh.addColorStop(0, 'rgba(255,190,110,0.85)');
    gh.addColorStop(0.25, 'rgba(226,130,60,0.3)');
    gh.addColorStop(1, 'rgba(226,112,62,0)');
    ch.fillStyle = gh;
    ch.fillRect(0, 0, 128, 128);
  }

  // Câmera do quadro atual.
  const cam = { x: 0, y: 0, z: 0.5, dx: 0, dy: 0, rx: 0, ry: 0 };

  function posicionar(pose) {
    cam.dx = Math.cos(pose.ang);
    cam.dy = Math.sin(pose.ang);
    cam.rx = -cam.dy;
    cam.ry = cam.dx;
    cam.x = pose.x - cam.dx * RECUO + (pose.empurraX ?? 0);
    cam.y = pose.y - cam.dy * RECUO + (pose.empurraY ?? 0);
    cam.z = 0.5 + (pose.balanco ?? 0);
  }

  // Corta o polígono no plano logo à frente da câmera e projeta. Devolve pontos de tela em buffer fixo.
  const vista = new Float64Array(30);
  const saida = new Float64Array(20);
  function projetar(p, n) {
    // p: [x, y, z] × n, no mundo.
    for (let i = 0; i < n; i += 1) {
      const wx = p[i * 3] - cam.x;
      const wy = p[i * 3 + 1] - cam.y;
      vista[i * 3] = wx * cam.rx + wy * cam.ry; // lateral
      vista[i * 3 + 1] = p[i * 3 + 2] - cam.z; // altura
      vista[i * 3 + 2] = wx * cam.dx + wy * cam.dy; // profundidade
    }
    let m = 0;
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      const zi = vista[i * 3 + 2];
      const zj = vista[j * 3 + 2];
      if (zi >= PERTO) {
        saida[m * 2] = L / 2 + (vista[i * 3] * foco) / zi;
        saida[m * 2 + 1] = A / 2 - (vista[i * 3 + 1] * foco) / zi;
        m += 1;
      }
      if ((zi >= PERTO) !== (zj >= PERTO)) {
        const t = (PERTO - zi) / (zj - zi);
        saida[m * 2] = L / 2 + ((vista[i * 3] + (vista[j * 3] - vista[i * 3]) * t) * foco) / PERTO;
        saida[m * 2 + 1] = A / 2 - ((vista[i * 3 + 1] + (vista[j * 3 + 1] - vista[i * 3 + 1]) * t) * foco) / PERTO;
        m += 1;
      }
    }
    return m;
  }

  const q = new Float64Array(12);
  function plano(cor, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
    q[0] = ax; q[1] = ay; q[2] = az; q[3] = bx; q[4] = by; q[5] = bz;
    q[6] = cx; q[7] = cy; q[8] = cz; q[9] = dx; q[10] = dy; q[11] = dz;
    const m = projetar(q, 4);
    if (m < 3) return;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(saida[0], saida[1]);
    for (let i = 1; i < m; i += 1) ctx.lineTo(saida[i * 2], saida[i * 2 + 1]);
    ctx.closePath();
    ctx.fill();
  }

  function multiplicar(luz, calor, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
    const n = Math.max(0, Math.min(NIVEIS - 1, Math.round(luz * (NIVEIS - 1))));
    const c = Math.max(0, Math.min(CALORES - 1, Math.round(calor * (CALORES - 1))));
    ctx.globalCompositeOperation = 'multiply';
    plano(luzMultiplica[c][n], ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Parede com textura: fatias verticais de largura igual na tela, cada uma na altura certa.
  function paredeComTextura(ax, ay, bx, by, tex = texParede, zBase = 0, zTopo = 1, vDe = 0, vAte = 1) {
    let xa = (ax - cam.x) * cam.rx + (ay - cam.y) * cam.ry;
    let za = (ax - cam.x) * cam.dx + (ay - cam.y) * cam.dy;
    let xb = (bx - cam.x) * cam.rx + (by - cam.y) * cam.ry;
    let zb = (bx - cam.x) * cam.dx + (by - cam.y) * cam.dy;
    if (za < PERTO && zb < PERTO) return;
    let u0 = 0;
    let u1 = 1;
    if (za < PERTO) { const k = (PERTO - za) / (zb - za); xa += (xb - xa) * k; za = PERTO; u0 = k; }
    if (zb < PERTO) { const k = (PERTO - zb) / (za - zb); xb += (xa - xb) * k; zb = PERTO; u1 = 1 - k; }
    const sa = L / 2 + (xa * foco) / za;
    const sb = L / 2 + (xb * foco) / zb;
    if (Math.max(sa, sb) < 0 || Math.min(sa, sb) > L) return;
    const fatias = Math.max(1, Math.min(48, Math.ceil(Math.abs(sb - sa) / (L / 150))));
    const tw = tex.width;
    const th = tex.height;
    const uDe = (q) => { const p = q / zb / ((1 - q) / za + q / zb); return u0 + (u1 - u0) * p; };
    for (let i = 0; i < fatias; i += 1) {
      const q0 = i / fatias;
      const q1 = (i + 1) / fatias;
      const s0 = sa + (sb - sa) * q0;
      const s1 = sa + (sb - sa) * q1;
      const esq = Math.min(s0, s1);
      const larg = Math.abs(s1 - s0);
      if (esq > L || esq + larg < 0) continue;
      const inv = (1 - (q0 + q1) / 2) / za + ((q0 + q1) / 2) / zb; // 1/z no meio da fatia
      const topo = A / 2 - (zTopo - cam.z) * foco * inv;
      const altura = (zTopo - zBase) * foco * inv;
      const v0 = uDe(q0) * tw;
      const v1 = uDe(q1) * tw;
      ctx.drawImage(tex, Math.min(v0, v1), th * vDe, Math.max(1, Math.abs(v1 - v0)), th * (vAte - vDe), esq, topo, larg + 0.8, altura);
    }
  }

  // Chão e teto: uma passada só, por faixas horizontais. Cada faixa é uma transformação simples da textura.
  function planosTexturados() {
    const passo = Math.max(2, Math.round(A / 320));
    for (const [padrao, tam, h, lado] of [[chaoP, chaoTam, cam.z, 1], [tetoP, tetoTam, 1 - cam.z, -1]]) {
      if (!padrao) continue;
      ctx.fillStyle = padrao;
      for (let dy = passo; dy < A / 2 + passo; dy += passo) {
        const z = (h * foco) / dy;
        if (z > 6.3 || z < PERTO) continue;
        const k = -(dy * dy) / (h * foco);
        const yTela = A / 2 + lado * dy;
        const s = foco / z;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.beginPath();
        ctx.rect(0, lado > 0 ? yTela - 0.5 : yTela - passo - 0.5, L, passo + 1);
        ctx.setTransform(
          (cam.rx * s) / tam, (lado * cam.dx * k) / tam,
          (cam.ry * s) / tam, (lado * cam.dy * k) / tam,
          L / 2 - (cam.x * cam.rx + cam.y * cam.ry) * s,
          yTela + lado * k * (-(cam.x * cam.dx + cam.y * cam.dy) - z),
        );
        ctx.fill();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  function cor(superficie, luz, calor) {
    const n = Math.max(0, Math.min(NIVEIS - 1, Math.round(luz * (NIVEIS - 1))));
    const c = Math.max(0, Math.min(CALORES - 1, Math.round(calor * (CALORES - 1))));
    return tabela[superficie][c][n];
  }

  // Luz em faixas: a da distância (fria e fraca) somada à do poste de sódio (quente).
  function luzDa(cx, cy, s) {
    const d = Math.hypot(cx - cam.x, cy - cam.y);
    const queda = Math.max(0, 1 - d / ALCANCE);
    const base = queda * queda * 0.5;
    const quente = s * s * Math.sqrt(queda) * 0.92;
    // A visão noturna do vampiro: fria, fraca e só nos trechos sem poste.
    const visao = Math.max(0, 1 - s * 3) * Math.max(0, 1 - d / 6.2) * 0.52;
    return { luz: Math.min(1, base + quente + visao), calor: Math.min(1, quente / (base + quente + visao + 0.001)), d };
  }

  // Uma face de parede: tijolo em cima, faixa de azulejo verde embaixo, com peças quebradas.
  function face(cx, cy, f, ax, ay, bx, by) {
    const s = sodio[cy + DIRECOES[f].y]?.[cx + DIRECOES[f].x] ?? 0;
    const meioX = (ax + bx) / 2;
    const meioY = (ay + by) / 2;
    const { luz: l0, calor, d } = luzDa(meioX, meioY, s);
    if (texParede) {
      // Os trechos do Rio: faixa baixa de azulejo de boteco, e reboco descascado em parte das galerias.
      const trecho = Math.floor(cx / 2) + Math.floor(cy / 2);
      paredeComTextura(ax, ay, bx, by, texReboco && trecho % 3 === 1 ? texReboco : texParede);
      if (texBanda && trecho % 2 === 0) {
        paredeComTextura(ax, ay, bx, by, texBanda, 0, 0.42, 0, 0.84);
        plano('rgb(20,18,16)', ax, ay, 0.44, bx, by, 0.44, bx, by, 0.42, ax, ay, 0.42);
      }
      multiplicar(f % 2 === 0 ? l0 : l0 * 0.8, calor, ax, ay, 1, bx, by, 1, bx, by, 0, ax, ay, 0);
      return;
    }
    if (l0 <= 0.012) return;
    const luz = f % 2 === 0 ? l0 : l0 * 0.8; // duas orientações de parede, para os cantos aparecerem
    const corte = 0.42;
    plano(cor('tijolo', luz, calor), ax, ay, 1, bx, by, 1, bx, by, corte, ax, ay, corte);
    plano(cor('azulejo', luz, calor), ax, ay, corte, bx, by, corte, bx, by, 0, ax, ay, 0);
    if (d > 4.2) return;
    const dx = bx - ax;
    const dy = by - ay;
    const tracoLuz = cor('rejunte', luz, calor);
    // Friso escuro entre o azulejo e o tijolo.
    plano(tracoLuz, ax, ay, corte + 0.02, bx, by, corte + 0.02, bx, by, corte, ax, ay, corte);
    // Azulejos: 5 colunas por 2 fileiras. Algumas peças caíram e mostram o reboco.
    const colunas = 5;
    for (let c = 0; c < colunas; c += 1) {
      for (let v = 0; v < 2; v += 1) {
        if (sorteioFixo(cx * 7 + f, cy * 11 + c, v) > 0.86) {
          const u0 = c / colunas;
          const u1 = (c + 1) / colunas;
          const z0 = (v * corte) / 2;
          const z1 = ((v + 1) * corte) / 2;
          plano(cor('tijolo', luz * 0.55, calor), ax + dx * u0, ay + dy * u0, z1, ax + dx * u1, ay + dy * u1, z1, ax + dx * u1, ay + dy * u1, z0, ax + dx * u0, ay + dy * u0, z0);
        }
      }
    }
    if (d > 2.9) return;
    // Rejunte: linhas finas em perspectiva.
    for (let c = 1; c < colunas; c += 1) {
      const u = c / colunas;
      const e = 0.0022;
      plano(tracoLuz, ax + dx * (u - e), ay + dy * (u - e), corte, ax + dx * (u + e), ay + dy * (u + e), corte, ax + dx * (u + e), ay + dy * (u + e), 0, ax + dx * (u - e), ay + dy * (u - e), 0);
    }
    plano(tracoLuz, ax, ay, corte / 2 + 0.0025, bx, by, corte / 2 + 0.0025, bx, by, corte / 2 - 0.0025, ax, ay, corte / 2 - 0.0025);
    // Fiadas de tijolo, cada uma desencontrada da anterior.
    const altura = 0.095;
    let fiada = 0;
    for (let z = corte + 0.02; z < 1; z += altura) {
      plano(tracoLuz, ax, ay, z + 0.002, bx, by, z + 0.002, bx, by, z - 0.002, ax, ay, z - 0.002);
      if (d < 2.1) {
        const topo = Math.min(1, z + altura);
        for (let c = 0; c < 4; c += 1) {
          const u = (c + (fiada % 2 ? 0.5 : 0.1)) / 4;
          const e = 0.0028;
          plano(tracoLuz, ax + dx * (u - e), ay + dy * (u - e), topo, ax + dx * (u + e), ay + dy * (u + e), topo, ax + dx * (u + e), ay + dy * (u + e), z, ax + dx * (u - e), ay + dy * (u - e), z);
        }
      }
      fiada += 1;
    }
  }

  function trilhos(x, y, s) {
    const { luz, calor } = luzDa(x + 0.5, y + 0.5, s);
    const leste = !ehParede(mapa, x - 1, y) || !ehParede(mapa, x + 1, y);
    const corDoTrilho = cor('trilho', Math.min(1, luz * 1.35), calor);
    for (const m of [0.3, 0.7]) {
      if (leste) plano(corDoTrilho, x, y + m - 0.016, 0.004, x + 1, y + m - 0.016, 0.004, x + 1, y + m + 0.016, 0.004, x, y + m + 0.016, 0.004);
      else plano(corDoTrilho, x + m - 0.016, y, 0.004, x + m + 0.016, y, 0.004, x + m + 0.016, y + 1, 0.004, x + m - 0.016, y + 1, 0.004);
    }
  }

  // O chão molhado: poça irregular que devolve a luz. Sem poste por perto, é só uma mancha escura.
  const borda = new Float64Array(24);
  function poca(x, y, luz, calor, chao, s) {
    const pontos = 8;
    const agua = chao === 'agua';
    const raio = agua ? 0.5 : 0.32;
    for (let i = 0; i < pontos; i += 1) {
      const a = (i / pontos) * Math.PI * 2;
      const r = raio * (0.62 + sorteioFixo(x, y, i + 20) * 0.5);
      borda[i * 3] = x + 0.5 + Math.cos(a) * r * (agua ? 1 : 0.8);
      borda[i * 3 + 1] = y + 0.5 + Math.sin(a) * r * 1.15;
      borda[i * 3 + 2] = 0.002;
    }
    const m = projetar(borda, pontos);
    if (m < 3) return;
    const reflexo = agua ? 1.5 + s * 1.6 : s > 0.2 ? 1.1 + s * 2.2 : 0.72;
    ctx.fillStyle = cor(agua ? 'agua' : 'chao', Math.min(1, luz * reflexo), Math.min(1, calor + 0.1));
    ctx.beginPath();
    ctx.moveTo(saida[0], saida[1]);
    for (let i = 1; i < m; i += 1) ctx.lineTo(saida[i * 2], saida[i * 2 + 1]);
    ctx.closePath();
    ctx.fill();
  }

  function aberta(x, y) {
    const s = sodio[y][x];
    const { luz, calor, d } = luzDa(x + 0.5, y + 0.5, s);
    if (luz <= 0.012 && !chaoP) return;
    const chao = tipoChao(mapa, x, y);
    if (chaoP) multiplicar(chao === 'agua' ? luz * 0.7 : luz, calor, x, y, 0, x + 1, y, 0, x + 1, y + 1, 0, x, y + 1, 0);
    else plano(cor(chao === 'agua' ? 'agua' : 'chao', luz * 0.85, calor), x, y, 0, x + 1, y, 0, x + 1, y + 1, 0, x, y + 1, 0);
    if (d < 5.5 && (chao === 'agua' || sorteioFixo(x, y, 9) > 0.3)) {
      ctx.globalAlpha = chaoP ? 0.45 : 1;
      poca(x, y, luz, calor, chao, s);
      ctx.globalAlpha = 1;
    }
    if (chao === 'trilho') trilhos(x, y, s);
    if (tetoP) multiplicar(luz * 0.75, calor, x, y, 1, x + 1, y, 1, x + 1, y + 1, 1, x, y + 1, 1);
    else plano(cor('teto', luz * 0.8, calor), x, y, 1, x + 1, y, 1, x + 1, y + 1, 1, x, y + 1, 1);
    if (x === mapa.fim.x && y === mapa.fim.y) {
      // O alçapão de saída: uma tampa de ferro no chão.
      plano(cor('rejunte', Math.min(1, luz * 1.1), calor), x + 0.2, y + 0.2, 0.003, x + 0.8, y + 0.2, 0.003, x + 0.8, y + 0.8, 0.003, x + 0.2, y + 0.8, 0.003);
      plano(cor('trilho', Math.min(1, luz), calor), x + 0.46, y + 0.2, 0.004, x + 0.54, y + 0.2, 0.004, x + 0.54, y + 0.8, 0.004, x + 0.46, y + 0.8, 0.004);
      const fresta = 'rgb(255,196,120)';
      plano(fresta, x + 0.17, y + 0.17, 0.005, x + 0.83, y + 0.17, 0.005, x + 0.83, y + 0.205, 0.005, x + 0.17, y + 0.205, 0.005);
      plano(fresta, x + 0.17, y + 0.795, 0.005, x + 0.83, y + 0.795, 0.005, x + 0.83, y + 0.83, 0.005, x + 0.17, y + 0.83, 0.005);
      plano(fresta, x + 0.17, y + 0.17, 0.005, x + 0.205, y + 0.17, 0.005, x + 0.205, y + 0.83, 0.005, x + 0.17, y + 0.83, 0.005);
      plano(fresta, x + 0.795, y + 0.17, 0.005, x + 0.83, y + 0.17, 0.005, x + 0.83, y + 0.83, 0.005, x + 0.795, y + 0.83, 0.005);
      clarao(x + 0.5, y + 0.5, 0.02, 0.5, 0.42);
    }
  }

  function clarao(px, py, altura, raioMundo, forca) {
    const wx = px - cam.x;
    const wy = py - cam.y;
    const z = wx * cam.dx + wy * cam.dy;
    if (z < 0.25) return;
    const sx = L / 2 + ((wx * cam.rx + wy * cam.ry) * foco) / z;
    const sy = A / 2 - ((altura - cam.z) * foco) / z;
    const raio = (raioMundo * foco) / z;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = forca * Math.max(0, 1 - z / ALCANCE);
    ctx.drawImage(halo, sx - raio, sy - raio, raio * 2, raio * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function poste(l) {
    const px = l.x + 0.5;
    const py = l.y + 0.5;
    plano(cor('trilho', 0.95, 1), px - 0.07, py - 0.05, 0.985, px + 0.07, py - 0.05, 0.985, px + 0.07, py + 0.05, 0.985, px - 0.07, py + 0.05, 0.985);
    const wx = px - cam.x;
    const wy = py - cam.y;
    const z = wx * cam.dx + wy * cam.dy;
    if (z < 0.25) return;
    const sx = L / 2 + ((wx * cam.rx + wy * cam.ry) * foco) / z;
    const sy = A / 2 - ((0.97 - cam.z) * foco) / z;
    const raio = Math.min(A * 0.7, (0.5 * foco) / z);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, 1 - z / ALCANCE);
    ctx.drawImage(halo, sx - raio, sy - raio, raio * 2, raio * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function gotas(lista, agora) {
    for (const g of lista) {
      const t = (agora - g.inicio) / g.duracao;
      if (t < 0 || t > 1) continue;
      const pontos = 10;
      const raio = 0.03 + t * 0.2;
      const pq = new Float64Array(pontos * 3);
      for (let i = 0; i < pontos; i += 1) {
        const a = (i / pontos) * Math.PI * 2;
        pq[i * 3] = g.x + Math.cos(a) * raio;
        pq[i * 3 + 1] = g.y + Math.sin(a) * raio;
        pq[i * 3 + 2] = 0.006;
      }
      if (projetarLinha(pq, pontos)) {
        ctx.strokeStyle = `rgba(226,190,140,${(1 - t) * 0.55})`;
        ctx.lineWidth = Math.max(1, L / 900);
        ctx.stroke();
      }
    }
  }

  function projetarLinha(p, n) {
    const tela = new Float64Array(n * 2);
    for (let i = 0; i < n; i += 1) {
      const wx = p[i * 3] - cam.x;
      const wy = p[i * 3 + 1] - cam.y;
      const z = wx * cam.dx + wy * cam.dy;
      if (z < PERTO) return false;
      tela[i * 2] = L / 2 + ((wx * cam.rx + wy * cam.ry) * foco) / z;
      tela[i * 2 + 1] = A / 2 - ((p[i * 3 + 2] - cam.z) * foco) / z;
    }
    ctx.beginPath();
    ctx.moveTo(tela[0], tela[1]);
    for (let i = 1; i < n; i += 1) ctx.lineTo(tela[i * 2], tela[i * 2 + 1]);
    ctx.closePath();
    return true;
  }

  // A seta pintada no chão: para onde o inimigo vai no próximo passo.
  function seta(m) {
    const cx = m.x + 0.5;
    const cy = m.y + 0.5;
    const cor2 = m.alerta ? 'rgba(214,56,44,0.72)' : 'rgba(208,146,78,0.5)';
    if (m.parado) {
      const pontos = 8;
      for (let i = 0; i < pontos; i += 1) {
        const a = (i / pontos) * Math.PI * 2;
        borda[i * 3] = cx + Math.cos(a) * 0.28;
        borda[i * 3 + 1] = cy + Math.sin(a) * 0.28;
        borda[i * 3 + 2] = 0.006;
      }
      const n = projetar(borda, pontos);
      if (n < 3) return;
      ctx.strokeStyle = cor2;
      ctx.lineWidth = Math.max(1.5, L / 620);
      ctx.beginPath();
      ctx.moveTo(saida[0], saida[1]);
      for (let i = 1; i < n; i += 1) ctx.lineTo(saida[i * 2], saida[i * 2 + 1]);
      ctx.closePath();
      ctx.stroke();
      return;
    }
    const lx = -m.dy;
    const ly = m.dx;
    const larg = 0.2;
    const fundo = -0.04;
    const ponta = 0.16;
    const grossura = 0.09;
    const trecho = (s) => plano(cor2, cx + m.dx * fundo + lx * larg * s, cy + m.dy * fundo + ly * larg * s, 0.006, cx + m.dx * ponta, cy + m.dy * ponta, 0.006, cx + m.dx * (ponta - grossura), cy + m.dy * (ponta - grossura), 0.006, cx + m.dx * (fundo - grossura) + lx * larg * s, cy + m.dy * (fundo - grossura) + ly * larg * s, 0.006);
    trecho(1);
    trecho(-1);
  }

  // Silhueta encurvada contra a luz, em 3 tamanhos prontos: nunca uma figura recortada e iluminada de frente.
  function contorno(c, a) {
    const u = a;
    c.beginPath();
    c.moveTo(0.37 * u, 0.2 * u);
    c.quadraticCurveTo(0.27 * u, 0.22 * u, 0.2 * u, 0.31 * u);
    c.lineTo(0.12 * u, 0.4 * u);
    c.lineTo(0.06 * u, 0.6 * u);
    c.lineTo(0.02 * u, 0.84 * u);
    c.lineTo(0.07 * u, 0.87 * u);
    c.lineTo(0.12 * u, 0.66 * u);
    c.lineTo(0.19 * u, 0.46 * u);
    c.lineTo(0.17 * u, 0.64 * u);
    c.lineTo(0.12 * u, 0.77 * u);
    c.lineTo(0.19 * u, 0.73 * u);
    c.lineTo(0.23 * u, 0.79 * u);
    c.lineTo(0.28 * u, 0.74 * u);
    c.lineTo(0.26 * u, 0.98 * u);
    c.lineTo(0.34 * u, 0.98 * u);
    c.lineTo(0.36 * u, 0.75 * u);
    c.lineTo(0.41 * u, 0.75 * u);
    c.lineTo(0.44 * u, 0.98 * u);
    c.lineTo(0.53 * u, 0.98 * u);
    c.lineTo(0.48 * u, 0.74 * u);
    c.lineTo(0.53 * u, 0.77 * u);
    c.lineTo(0.57 * u, 0.71 * u);
    c.lineTo(0.61 * u, 0.76 * u);
    c.lineTo(0.55 * u, 0.58 * u);
    c.lineTo(0.51 * u, 0.42 * u);
    c.lineTo(0.58 * u, 0.5 * u);
    c.lineTo(0.63 * u, 0.56 * u);
    c.lineTo(0.66 * u, 0.5 * u);
    c.lineTo(0.61 * u, 0.4 * u);
    c.lineTo(0.56 * u, 0.27 * u);
    c.quadraticCurveTo(0.54 * u, 0.2 * u, 0.49 * u, 0.19 * u);
    c.lineTo(0.47 * u, 0.2 * u);
    c.quadraticCurveTo(0.56 * u, 0.17 * u, 0.54 * u, 0.1 * u);
    c.quadraticCurveTo(0.51 * u, 0.03 * u, 0.45 * u, 0.04 * u);
    c.quadraticCurveTo(0.37 * u, 0.05 * u, 0.38 * u, 0.12 * u);
    c.quadraticCurveTo(0.38 * u, 0.17 * u, 0.37 * u, 0.2 * u);
    c.closePath();
  }

  function criarSilhuetas() {
    return [120, 260, 520].map((a) => {
      const nova = () => {
        const n = document.createElement('canvas');
        n.width = Math.ceil(a * 0.68);
        n.height = a;
        const c = n.getContext('2d');
        c.lineJoin = 'round';
        return [n, c];
      };
      const [corpo, c1] = nova();
      contorno(c1, a);
      c1.fillStyle = 'rgb(9,9,9)';
      c1.fill();
      // Grão de pedra sobre a figura, para ela não parecer recortada de outro material.
      c1.globalCompositeOperation = 'source-atop';
      const grao = Math.round((corpo.width * corpo.height) / 14);
      for (let i = 0; i < grao; i += 1) {
        const claro = Math.random() < 0.5;
        c1.fillStyle = claro ? `rgba(120,112,98,${0.05 + Math.random() * 0.13})` : 'rgba(0,0,0,0.3)';
        const t2 = 1 + Math.random() * (a / 240);
        c1.fillRect(Math.random() * corpo.width, Math.random() * corpo.height, t2, t2);
      }
      c1.globalCompositeOperation = 'source-over';
      const borda2 = (tom) => {
        const [n, c] = nova();
        contorno(c, a);
        c.fillStyle = tom;
        c.fill();
        c.globalCompositeOperation = 'destination-out';
        c.translate(a * 0.005, a * 0.006);
        contorno(c, a);
        c.fill();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'source-over';
        if (a >= 260) {
          // Dobras do casaco, com a luz por dentro: é o que dá volume de perto.
          c.save();
          contorno(c, a);
          c.clip();
          c.strokeStyle = tom;
          c.lineCap = 'round';
          for (const [x0, y0, cx, cy, x1, y1, largura, alfa] of [[0.25, 0.34, 0.31, 0.5, 0.25, 0.7, 0.006, 0.3], [0.33, 0.3, 0.42, 0.48, 0.39, 0.72, 0.004, 0.2], [0.5, 0.36, 0.45, 0.52, 0.5, 0.68, 0.005, 0.25], [0.16, 0.43, 0.11, 0.56, 0.09, 0.72, 0.004, 0.2]]) {
            c.globalAlpha = alfa;
            c.lineWidth = a * largura;
            c.beginPath();
            c.moveTo(x0 * a, y0 * a);
            c.quadraticCurveTo(cx * a, cy * a, x1 * a, y1 * a);
            c.stroke();
          }
          c.restore();
        }
        // Borra a luz: reduzir e ampliar de novo funciona em todos os navegadores.
        const pequena = document.createElement('canvas');
        pequena.width = Math.ceil(n.width * 0.4);
        pequena.height = Math.ceil(n.height * 0.4);
        pequena.getContext('2d').drawImage(n, 0, 0, pequena.width, pequena.height);
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'copy';
        c.drawImage(pequena, 0, 0, n.width, n.height);
        return n;
      };
      return { altura: a, corpo, quente: borda2('rgb(255,178,100)'), frio: borda2('rgb(150,190,180)') };
    });
  }
  const silhuetas = criarSilhuetas();

  function inimigo(e, s) {
    // Sombra no chão.
    const pontos = 8;
    for (let i = 0; i < pontos; i += 1) {
      const a = (i / pontos) * Math.PI * 2;
      borda[i * 3] = e.x + Math.cos(a) * 0.27;
      borda[i * 3 + 1] = e.y + Math.sin(a) * 0.27;
      borda[i * 3 + 2] = 0.007;
    }
    const n = projetar(borda, pontos);
    if (n >= 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.beginPath();
      ctx.moveTo(saida[0], saida[1]);
      for (let i = 1; i < n; i += 1) ctx.lineTo(saida[i * 2], saida[i * 2 + 1]);
      ctx.closePath();
      ctx.fill();
    }
    const wx = e.x - cam.x;
    const wy = e.y - cam.y;
    const z = wx * cam.dx + wy * cam.dy;
    if (z < 0.22) return;
    const sx = L / 2 + ((wx * cam.rx + wy * cam.ry) * foco) / z;
    const chao = A / 2 + (cam.z * foco) / z;
    const h = (0.9 * foco) / z;
    const quanto = Math.max(0, 1 - z / ALCANCE);
    // A luz atrás do vulto: do poste, se houver; senão, um véu frio e fraco que recorta a figura no escuro.
    clarao(e.x + cam.dx * 0.15, e.y + cam.dy * 0.15, 0.48, 0.66, 0.34 + s * 0.8);
    const tam = silhuetas.find((v) => v.altura >= h) ?? silhuetas[2];
    const w = h * 0.68;
    const inclina = Math.sin(e.andar * Math.PI) * 0.035;
    ctx.save();
    ctx.translate(sx, chao);
    ctx.rotate(inclina);
    ctx.drawImage(tam.corpo, -w / 2, -h, w, h);
    ctx.globalAlpha = Math.min(1, (0.3 + s * 1.3) * Math.max(0.25, quanto) * 1.7);
    ctx.drawImage(s > 0.2 ? tam.quente : tam.frio, -w / 2, -h, w, h);
    ctx.globalAlpha = 1;
    if (e.olhaOGrupo) {
      ctx.fillStyle = e.alerta ? 'rgb(255,70,50)' : 'rgb(214,120,60)';
      // Olhos: pelo menos 4 pixels de altura mesmo de longe, com um brilho curto.
      const sc = L / 1268;
      const raioOlho = Math.min(4 * sc, Math.max(2.3 * sc, h * 0.008));
      const y = -h * 0.895;
      for (const x of [h * 0.09, h * 0.17]) {
        ctx.globalCompositeOperation = 'lighter';
        const raio = raioOlho * 3.4;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(halo, x - raio, y - raio, raio * 2, raio * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(x, y, raioOlho, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  const ordem = [];
  function desenhar(pose, extras = {}) {
    posicionar(pose);
    ctx.fillStyle = 'rgb(6,7,8)';
    ctx.fillRect(0, 0, L, A);
    planosTexturados();
    ordem.length = 0;
    for (let y = 0; y < mapa.altura; y += 1) {
      for (let x = 0; x < mapa.largura; x += 1) {
        const cx = x + 0.5 - cam.x;
        const cy = y + 0.5 - cam.y;
        const d = Math.hypot(cx, cy);
        if (d > ALCANCE + 1) continue;
        // Atrás da câmera, só importa a casa colada nela.
        if (cx * cam.dx + cy * cam.dy < -1) continue;
        ordem.push({ x, y, d });
      }
    }
    ordem.sort((a, b) => b.d - a.d);
    const postes = new Map(mapa.luzes.map((l) => [`${l.x},${l.y}`, l]));
    for (const c of ordem) {
      const { x, y } = c;
      if (ehParede(mapa, x, y)) {
        // Só as faces que dão para uma casa aberta e olham para a câmera.
        if (cam.y < y && !ehParede(mapa, x, y - 1)) face(x, y, 0, x, y, x + 1, y);
        if (cam.x > x + 1 && !ehParede(mapa, x + 1, y)) face(x, y, 1, x + 1, y, x + 1, y + 1);
        if (cam.y > y + 1 && !ehParede(mapa, x, y + 1)) face(x, y, 2, x + 1, y + 1, x, y + 1);
        if (cam.x < x && !ehParede(mapa, x - 1, y)) face(x, y, 3, x, y + 1, x, y);
      } else {
        aberta(x, y);
        const l = postes.get(`${x},${y}`);
        if (l) poste(l);
        for (const m of extras.marcas ?? []) if (m.x === x && m.y === y) seta(m);
        for (const e of extras.inimigos ?? []) if (Math.floor(e.x) === x && Math.floor(e.y) === y) inimigo(e, sodio[y][x]);
      }
    }
    if (extras.gotas) gotas(extras.gotas, extras.agora);
    ctx.drawImage(vinheta, 0, 0);
  }

  redimensionar();
  return { desenhar, redimensionar };
}
