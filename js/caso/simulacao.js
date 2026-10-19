// Etapa C: a fuga da perseguição como simulação determinística em NÚMEROS INTEIROS.
// A tela roda esta simulação a 20 passos por segundo e desenha por cima; o banco refaz a mesma conta em
// PL/pgSQL (supabase/migrations/..._etapa_c_simulacao.sql) com o caminho do jogador e a semente que ele
// sorteou, e confere o resultado. Por isso tudo aqui é inteiro, com divisão truncada (como no Postgres):
// nada de Math.cos, Math.random nem ponto flutuante. QUALQUER MUDANÇA AQUI TEM DE IR TAMBÉM PARA O SQL.
//
// Unidades: a pintura vai de 0 a 10000 nos dois eixos. A distância é medida em "alturas da pintura"
// (x corrigido pelo aspecto 21:9 = 7/3), também × 10000. Um passo da simulação = 50 ms.

export const ESCALA = 10000;
export const PASSO_MS = 50;
export const PASSOS_MAX = 1200;          // 60 s
// As 24 direções (cos e sen × 1000), fixas.
export const COS = [1000, 966, 866, 707, 500, 259, 0, -259, -500, -707, -866, -966, -1000, -966, -866, -707, -500, -259, 0, 259, 500, 707, 866, 966];
export const SEN = [0, 259, 500, 707, 866, 966, 1000, 966, 866, 707, 500, 259, 0, -259, -500, -707, -866, -966, -1000, -966, -866, -707, -500, -259];
const N_DIR = 24;

// Os números da cena (cena.js e perseguicao.js), em inteiros.
export const C = {
  VEL_X: 1800, VEL_Y: 1500,     // por segundo, em unidades da pintura
  CORRIDA: 1700,                // × 1000
  ALTURA_REF: 3000,
  SUSTO: 8,                     // passos parado na largada (400 ms)
  CAPTURA_DEPOIS: 20,           // só pega depois de 1 s (o empurrão da largada)
  PEGA: 850,                    // raio de captura (0,085: com folga; antes 0,07)
  LONGE: 9000, TEMPO_LONGE: 80, // longe por 4 s = escapou
  SAIDA_RAIO: 500,
  DECIDE_A_CADA: 2,
  CADEIRA_PARADA: 5, CADEIRA_BASE: 52, CADEIRA_VARIA: 24, CADEIRA_PERTO: 3500,
  DRIBLE_PERTO: 1700, DRIBLE_DURA: 12, DRIBLE_A_CADA: 64, DRIBLE_GIRO: 7,
  IMPULSO_PERTO: 1800, IMPULSO_DURA: 18, IMPULSO_A_CADA: 60,
  FUGA_ABERTA: 160,             // 8 s preferindo o lado com mais chão
  ORDEM_ALCANCE: 3000,
};

const tr = (a, b) => Math.trunc(a / b);
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

// Raiz quadrada inteira (piso), pelo método de Newton: igual no banco.
export function raiz(n) {
  if (n <= 0) return 0;
  let x = n;
  let y = tr(x + 1, 2);
  while (y < x) { x = y; y = tr(x + tr(n, x), 2); }
  return x;
}
// Distância em alturas da pintura × 10000 (x corrigido por 7/3).
export function distancia(ax, ay, bx, by) {
  const dx = (ax - bx) * 7;
  const dy = (ay - by) * 3;
  return tr(raiz(dx * dx + dy * dy), 3);
}
// Ponto dentro do polígono (raio horizontal), só com inteiros.
export function dentroInt(x, y, pol) {
  let d = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i];
    const [xj, yj] = pol[j];
    if ((yi > y) !== (yj > y)) {
      const dy = yj - yi;
      const esq = (x - xi) * dy;
      const dir = (xj - xi) * (y - yi);
      if (dy > 0 ? esq < dir : esq > dir) d = !d;
    }
  }
  return d;
}
// Sorteio: gerador de Park-Miller (cabe em 53 bits no JS e em bigint no banco).
export function sortear(s) { return (s * 48271) % 2147483647; }

// A geografia do lugar em inteiros (feita uma vez a partir de lugares.js; o banco recebe pronta).
export function geoInteira(geo) {
  const I = (v) => Math.round(v * ESCALA);
  return {
    chao: geo.chao.map(([x, y]) => [I(x), I(y)]),
    obst: (geo.obstaculos || []).map((o) => o.map(([x, y]) => [I(x), I(y)])),
    H: I(geo.horizonte), K: I(geo.k),
  };
}
export const livre = (g, x, y) => dentroInt(x, y, g.chao) && !g.obst.some((o) => dentroInt(x, y, o));
// O fator de velocidade pela perspectiva (× 1000): limitar(altura / ALTURA_REF, 0,6, 1,3).
export function fator(g, y) {
  const alt = Math.max(500, tr(g.K * (y - g.H), ESCALA));
  return limitar(tr(alt * 1000, C.ALTURA_REF), 600, 1300);
}
// O passo (por 50 ms) de quem corre, em x e em y, com o ritmo (× 1000).
export function passoDe(g, y, vel, ritmo) {
  let v = tr(fator(g, y) * C.CORRIDA, 1000);
  v = tr(v * vel, 1000);
  v = tr(v * ritmo, 1000);
  return [tr(tr(C.VEL_X * v, 1000), 20), tr(tr(C.VEL_Y * v, 1000), 20)];
}
const mover = (x, y, d, [px, py], n = 1) => [x + tr(px * COS[d] * n, 1000), y + tr(py * SEN[d] * n, 1000)];
// A direção (das 24) que mais se afasta de (ax, ay) partindo de (bx, by).
function direcaoContra(ax, ay, bx, by) {
  const vx = (bx - ax) * 7;
  const vy = (by - ay) * 3;
  let melhor = 0;
  let nota = -Infinity;
  for (let k = 0; k < N_DIR; k++) {
    const p = vx * COS[k] + vy * SEN[k];
    if (p > nota) { nota = p; melhor = k; }
  }
  return melhor;
}

// cfg: { g (geoInteira), x, y (onde ele está), saida: [x, y] (inteiros), tempoSaida (s), velocidade (× 1000),
//        cadeiras (máx.), semente }. jogador: { x, y } inteiros na largada.
export function novaFuga(cfg, jogador) {
  const g = cfg.g;
  let { x, y } = cfg;
  // O empurrão: um passo na direção contrária à sua, se houver chão.
  const d0 = direcaoContra(jogador.x, jogador.y, x, y);
  const nx = x + tr(COS[d0] * 214, 1000);
  const ny = y + tr(SEN[d0] * 200, 1000);
  if (livre(g, nx, ny)) { x = nx; y = ny; }
  return {
    cfg, x, y, dir: d0, passo: 0, semente: cfg.semente,
    proxDecisao: 0, proxCadeira: 0, paradoAte: 0, dribleAte: 0, proxDrible: 0, impulsoAte: 0, proxImpulso: 0,
    longe: 0, cadeiras: [], fim: null, eventos: [],
  };
}

// Um passo da fuga, com a posição do jogador neste passo. ordem: o jogador usou "Pare!" neste passo.
export function passoDaFuga(f, jx, jy, { ordem = false, temOrdem = false } = {}) {
  if (f.fim) return f;
  const { cfg } = f;
  const g = cfg.g;
  f.eventos = [];
  const t = f.passo;
  const d = distancia(jx, jy, f.x, f.y);
  const paraSaida = t > cfg.tempoSaida * 20;
  if (paraSaida && !f.avisouSaida) { f.avisouSaida = true; f.eventos.push('saida'); }
  if (d < C.IMPULSO_PERTO && t >= f.proxImpulso) { f.impulsoAte = t + C.IMPULSO_DURA; f.proxImpulso = t + C.IMPULSO_A_CADA; }
  const mod = t < f.dribleAte ? 1400 : t < f.impulsoAte ? 1100 : 1000;
  const p = passoDe(g, f.y, cfg.velocidade, mod);

  if (t >= f.proxDecisao && t >= f.dribleAte) {
    f.proxDecisao = t + C.DECIDE_A_CADA;
    let melhor = -1;
    let melhorNota = 0;
    for (let k = 0; k < N_DIR; k++) {
      const [qx, qy] = mover(f.x, f.y, k, p, 9);
      if (!livre(g, qx, qy)) continue;
      const [q2x, q2y] = mover(f.x, f.y, k, p, 18);
      let espaco = 0;
      for (const s of [6, 12, 18, 24, 30]) { const [sx, sy] = mover(f.x, f.y, k, p, s); if (!livre(g, sx, sy)) break; espaco = s; }
      const cosd = tr(COS[k] * COS[f.dir] + SEN[k] * SEN[f.dir], 1000);
      let nota;
      if (paraSaida) {
        nota = tr(6 * distancia(qx, qy, jx, jy), 10) - tr(14 * distancia(qx, qy, cfg.saida[0], cfg.saida[1]), 10) + tr(cosd, 2);
      } else {
        nota = distancia(qx, qy, jx, jy) + cosd - (livre(g, q2x, q2y) ? 0 : 2500) + (t < C.FUGA_ABERTA ? 225 : 50) * espaco - (espaco < 12 ? 2000 : 0);
      }
      if (melhor < 0 || nota > melhorNota) { melhor = k; melhorNota = nota; }
    }
    if (melhor >= 0) f.dir = melhor;
    // Com você quase encostando, ele tenta escapar pelo lado num arranque curto.
    if (melhor >= 0 && !paraSaida && d < C.DRIBLE_PERTO && t >= f.proxDrible && t > C.SUSTO + 12) {
      const contra = direcaoContra(jx, jy, f.x, f.y);
      const pd = passoDe(g, f.y, cfg.velocidade, 1400);
      const opcoes = [(contra + C.DRIBLE_GIRO) % N_DIR, (contra + N_DIR - C.DRIBLE_GIRO) % N_DIR].map((k) => {
        let esp = 0;
        for (const s of [4, 8, 12]) { const [sx, sy] = mover(f.x, f.y, k, pd, s); if (!livre(g, sx, sy)) break; esp = s; }
        return { k, esp };
      });
      const escolha = opcoes[1].esp > opcoes[0].esp ? opcoes[1] : opcoes[0];
      if (escolha.esp > 0) {
        f.dir = escolha.k;
        f.dribleAte = t + C.DRIBLE_DURA;
        f.proxDrible = t + C.DRIBLE_A_CADA;
        f.eventos.push('drible');
      }
    }
  }

  if (t >= f.paradoAte) {
    const [nx, ny] = mover(f.x, f.y, f.dir, p);
    if (livre(g, nx, ny)) { f.x = nx; f.y = ny; } else f.proxDecisao = 0;
    // Com você perto e atrás dele, de tempos em tempos ele derruba uma cadeira (e perde um instante).
    if (t >= C.SUSTO && d < C.CADEIRA_PERTO && t >= f.proxCadeira && f.cadeiras.length < (cfg.cadeiras ?? 4)) {
      f.semente = sortear(f.semente);
      f.proxCadeira = t + C.CADEIRA_BASE + (f.semente % C.CADEIRA_VARIA);
      f.paradoAte = t + C.CADEIRA_PARADA;
      f.cadeiras.push([f.x, f.y]);
      f.eventos.push('cadeira');
    }
    if (paraSaida && distancia(f.x, f.y, cfg.saida[0], cfg.saida[1]) < C.SAIDA_RAIO) f.fim = 'escapou';
  }

  const d2 = distancia(jx, jy, f.x, f.y);
  if (!f.fim && ordem && temOrdem && t > C.SUSTO && d2 <= C.ORDEM_ALCANCE) f.fim = 'pego';
  if (!f.fim && t > C.CAPTURA_DEPOIS && d2 < C.PEGA) f.fim = 'pego';
  f.longe = d2 > C.LONGE ? f.longe + 1 : 0;
  if (!f.fim && f.longe > C.TEMPO_LONGE) f.fim = 'escapou';
  f.passo = t + 1;
  if (!f.fim && f.passo >= PASSOS_MAX) f.fim = 'escapou';
  f.distancia = d2;
  return f;
}

// O jogador não pode correr mais do que corre: o passo máximo dele (× 1,3 de folga para a amostragem).
export function passoMaximoDoJogador(g, y, ritmo) {
  const [px, py] = passoDe(g, y, 1000, ritmo);
  return [tr(px * 13, 10) + 30, tr(py * 13, 10) + 30];
}
