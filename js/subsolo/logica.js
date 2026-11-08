// Subsolo: as regras do tabuleiro, sem canvas e sem tela. O robô de teste roda este módulo em node.
// Fatia de teste (etapa 1 de gerencia/carmen-2026/jogabilidade-subsolo.md): só na vitrine e sem banco.

// Direções na ordem dos giros à direita: 0 norte, 1 leste, 2 sul, 3 oeste.
export const DIRECOES = [
  { x: 0, y: -1, letra: 'N' },
  { x: 1, y: 0, letra: 'L' },
  { x: 0, y: 1, letra: 'S' },
  { x: -1, y: 0, letra: 'O' },
];

// Cada comando de andar diz para que lado o grupo vai, em giros a partir de onde olha.
const DESVIO = { frente: 0, 'lado-d': 1, tras: 2, 'lado-e': 3 };
export const PASSOS_POR_MINUTO = 4;

const CHAO = { '.': 'pedra', S: 'pedra', F: 'pedra', '~': 'agua', '=': 'trilho' };

export function criarMapa(def) {
  const linhas = def.linhas;
  const celulas = linhas.map((l) => [...l]);
  let inicio = null;
  let fim = null;
  celulas.forEach((linha, y) => linha.forEach((c, x) => {
    if (c === 'S') inicio = { x, y };
    if (c === 'F') fim = { x, y };
  }));
  return { largura: linhas[0].length, altura: linhas.length, celulas, inicio, fim, luzes: def.luzes ?? [], direcao: def.direcao ?? 1 };
}

export function ehParede(mapa, x, y) {
  return x < 0 || y < 0 || x >= mapa.largura || y >= mapa.altura || mapa.celulas[y][x] === '#';
}

export function tipoChao(mapa, x, y) {
  return CHAO[mapa.celulas[y]?.[x]] ?? 'pedra';
}

export function criarPartida(def, inicioMinutos = 3 * 60 + 40) {
  const mapa = criarMapa(def);
  return { mapa, x: mapa.inicio.x, y: mapa.inicio.y, dir: mapa.direcao, passos: 0, inicioMinutos, chegou: false };
}

export function minutosDaNoite(p) {
  return p.inicioMinutos + Math.floor(p.passos / PASSOS_POR_MINUTO);
}

// Aplica um comando na hora e devolve o que a tela precisa animar. A lógica nunca espera a animação.
export function aplicarComando(p, comando) {
  const de = { x: p.x, y: p.y, dir: p.dir };
  if (comando === 'gira-e' || comando === 'gira-d') {
    p.dir = (p.dir + (comando === 'gira-d' ? 1 : 3)) % 4;
    return { tipo: 'giro', de, para: { x: p.x, y: p.y, dir: p.dir }, sentido: comando === 'gira-d' ? 1 : -1 };
  }
  const direcao = DIRECOES[(p.dir + DESVIO[comando]) % 4];
  const nx = p.x + direcao.x;
  const ny = p.y + direcao.y;
  if (ehParede(p.mapa, nx, ny)) return { tipo: 'tranco', de, para: de, direcao };
  p.x = nx;
  p.y = ny;
  p.passos += 1;
  const chegouAgora = !p.chegou && nx === p.mapa.fim.x && ny === p.mapa.fim.y;
  if (chegouAgora) p.chegou = true;
  return { tipo: 'passo', de, para: { x: nx, y: ny, dir: p.dir }, chao: tipoChao(p.mapa, nx, ny), chegouAgora };
}
