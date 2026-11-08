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

export function criarCorredor(canvas, mapa) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const tabela = montarTabela();
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
    return { luz: Math.min(1, base + quente), calor: Math.min(1, quente / (base + quente + 0.001)), d };
  }

  // Uma face de parede: tijolo em cima, faixa de azulejo verde embaixo, com peças quebradas.
  function face(cx, cy, f, ax, ay, bx, by) {
    const s = sodio[cy + DIRECOES[f].y]?.[cx + DIRECOES[f].x] ?? 0;
    const meioX = (ax + bx) / 2;
    const meioY = (ay + by) / 2;
    const { luz: l0, calor, d } = luzDa(meioX, meioY, s);
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
    if (luz <= 0.012) return;
    const chao = tipoChao(mapa, x, y);
    plano(cor(chao === 'agua' ? 'agua' : 'chao', luz * 0.85, calor), x, y, 0, x + 1, y, 0, x + 1, y + 1, 0, x, y + 1, 0);
    if (d < 5.5 && (chao === 'agua' || sorteioFixo(x, y, 9) > 0.3)) poca(x, y, luz, calor, chao, s);
    if (chao === 'trilho') trilhos(x, y, s);
    plano(cor('teto', luz * 0.8, calor), x, y, 1, x + 1, y, 1, x + 1, y + 1, 1, x, y + 1, 1);
    if (x === mapa.fim.x && y === mapa.fim.y) {
      // O alçapão de saída: uma tampa de ferro no chão.
      plano(cor('rejunte', Math.min(1, luz * 1.1), calor), x + 0.2, y + 0.2, 0.003, x + 0.8, y + 0.2, 0.003, x + 0.8, y + 0.8, 0.003, x + 0.2, y + 0.8, 0.003);
      plano(cor('trilho', Math.min(1, luz), calor), x + 0.46, y + 0.2, 0.004, x + 0.54, y + 0.2, 0.004, x + 0.54, y + 0.8, 0.004, x + 0.46, y + 0.8, 0.004);
    }
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
    const raio = Math.min(A * 1.1, (0.95 * foco) / z);
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

  const ordem = [];
  function desenhar(pose, extras = {}) {
    posicionar(pose);
    ctx.fillStyle = 'rgb(6,7,8)';
    ctx.fillRect(0, 0, L, A);
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
      }
    }
    if (extras.gotas) gotas(extras.gotas, extras.agora);
    ctx.drawImage(vinheta, 0, 0);
  }

  redimensionar();
  return { desenhar, redimensionar };
}
