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
  const p = { mapa, x: mapa.inicio.x, y: mapa.inicio.y, dir: mapa.direcao, passos: 0, inicioMinutos, chegou: false, inimigos: (def.inimigos ?? []).map(criarInimigo) };
  p.inimigos.forEach((e) => planejar(p, e));
  return p;
}

export function minutosDaNoite(p) {
  return p.inicioMinutos + Math.floor(p.passos / PASSOS_POR_MINUTO) + (p.minutosExtra ?? 0);
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
  // Andar para cima de um inimigo começa a luta, e o grupo fica na casa onde estava.
  const encontrado = p.inimigos.find((e) => e.x === nx && e.y === ny);
  if (encontrado) {
    const pelasCostas = encontrado.dir === (p.dir + DESVIO[comando]) % 4;
    return { tipo: 'contato', de, para: de, direcao, contato: { id: encontrado.id, como: pelasCostas ? 'costas' : 'frente' }, movimentos: [] };
  }
  p.x = nx;
  p.y = ny;
  p.passos += 1;
  const { movimentos, contato } = moverInimigos(p);
  const chegouAgora = !p.chegou && nx === p.mapa.fim.x && ny === p.mapa.fim.y;
  if (chegouAgora) p.chegou = true;
  return { tipo: 'passo', de, para: { x: nx, y: ny, dir: p.dir }, chao: tipoChao(p.mapa, nx, ny), chegouAgora, movimentos, contato };
}

// Inimigos: o mundo só anda quando o grupo dá um passo. Girar e bater na parede não contam.
const PAUSA_NA_ROTA = 2; // passos parado em cada ponto da ronda
const ALCANCE_DA_VISTA = 4;
const TEMPO_DE_ALERTA = 4; // passos que continua caçando depois de perder o grupo de vista

function criarInimigo(d) {
  return { id: d.id, x: d.x, y: d.y, dir: d.dir, rota: d.rota, alvo: 0, pausa: 0, alerta: 0, prox: null, origem: { x: d.x, y: d.y, dir: d.dir } };
}

// O primeiro passo do caminho mais curto de uma casa até outra (busca em largura).
export function primeiroPasso(p, de, para, ocupadas) {
  if (de.x === para.x && de.y === para.y) return null;
  const chave = (x, y) => y * p.mapa.largura + x;
  const veioDe = new Map([[chave(de.x, de.y), null]]);
  const fila = [de];
  for (let i = 0; i < fila.length; i += 1) {
    const c = fila[i];
    for (const d of DIRECOES) {
      const v = { x: c.x + d.x, y: c.y + d.y };
      const k = chave(v.x, v.y);
      if (veioDe.has(k) || ehParede(p.mapa, v.x, v.y)) continue;
      if (ocupadas.has(k) && !(v.x === para.x && v.y === para.y)) continue;
      veioDe.set(k, c);
      if (v.x === para.x && v.y === para.y) {
        let a = v;
        while (veioDe.get(chave(a.x, a.y)) !== de) a = veioDe.get(chave(a.x, a.y));
        return a;
      }
      fila.push(v);
    }
  }
  return null;
}

function veOGrupo(p, e) {
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  if (Math.abs(dx) + Math.abs(dy) === 1) {
    const atras = DIRECOES[(e.dir + 2) % 4];
    return !(dx === atras.x && dy === atras.y);
  }
  if (dx !== 0 && dy !== 0) return false;
  const distancia = Math.abs(dx) + Math.abs(dy);
  if (distancia === 0 || distancia > ALCANCE_DA_VISTA) return false;
  const olhar = DIRECOES[e.dir];
  if (Math.sign(dx) !== olhar.x || Math.sign(dy) !== olhar.y) return false;
  for (let i = 1; i < distancia; i += 1) {
    if (ehParede(p.mapa, e.x + olhar.x * i, e.y + olhar.y * i)) return false;
  }
  return true;
}

// Decide e guarda o próximo passo do inimigo: é o que a seta no chão mostra ao jogador.
function planejar(p, e) {
  if (veOGrupo(p, e)) e.alerta = TEMPO_DE_ALERTA;
  const cacando = e.alerta > 0;
  if (e.pausa > 0 && !cacando) { e.prox = null; return; }
  const destino = cacando ? { x: p.x, y: p.y } : e.rota[e.alvo];
  const chave = (x, y) => y * p.mapa.largura + x;
  const ocupadas = new Set(p.inimigos.filter((o) => o !== e).map((o) => chave(o.x, o.y)));
  e.prox = primeiroPasso(p, e, destino, ocupadas);
}

function moverInimigos(p) {
  const movimentos = [];
  let contato = null;
  for (const e of p.inimigos) {
    const de = { x: e.x, y: e.y, dir: e.dir };
    if (e.pausa > 0 && !(e.alerta > 0)) {
      e.pausa -= 1;
    } else if (e.prox) {
      const dirNova = DIRECOES.findIndex((d) => d.x === e.prox.x - e.x && d.y === e.prox.y - e.y);
      e.dir = dirNova;
      const ocupada = p.inimigos.some((o) => o !== e && o.x === e.prox.x && o.y === e.prox.y);
      if (e.prox.x === p.x && e.prox.y === p.y) {
        // Alcançou o grupo: para na casa ao lado e a luta começa.
        const olhar = DIRECOES[p.dir];
        const deFrente = e.x === p.x + olhar.x && e.y === p.y + olhar.y;
        contato ??= { id: e.id, como: deFrente ? 'frente' : 'alcancado' };
      } else if (!ocupada) {
        e.x = e.prox.x;
        e.y = e.prox.y;
      }
    }
    const ponto = e.rota[e.alvo];
    if (e.x === ponto.x && e.y === ponto.y && !(e.alerta > 0)) {
      e.alvo = (e.alvo + 1) % e.rota.length;
      e.pausa = PAUSA_NA_ROTA;
    }
    if (e.alerta > 0) e.alerta -= 1;
    movimentos.push({ id: e.id, de, para: { x: e.x, y: e.y, dir: e.dir } });
  }
  p.inimigos.forEach((e) => planejar(p, e));
  return { movimentos, contato };
}

// Até a luta existir (passo 3), o inimigo do contato volta ao começo da ronda.
export function devolverInimigo(p, id) {
  const e = p.inimigos.find((o) => o.id === id);
  const livre = [e.origem, ...e.rota].find((c) => !(c.x === p.x && c.y === p.y) && !p.inimigos.some((o) => o !== e && o.x === c.x && o.y === c.y));
  Object.assign(e, { x: livre.x, y: livre.y, dir: e.origem.dir, alvo: 0, pausa: 0, alerta: 0 });
  p.inimigos.forEach((o) => planejar(p, o));
}
