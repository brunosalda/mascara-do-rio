// Rodada 36: as pinturas de foto (vista do alto) voltam a se mexer. Coordenadas de 0 a 1 sobre a pintura,
// medidas com uma grade sobre cada imagem.
//
// vivos: coisas que se mexem sozinhas, só com transform e opacity:
//   neon    { x, y, w, h, cor }      brilho de néon que falha de vez em quando;
//   agua    { x, y, w, h }           reflexos que tremulam na água da baía ou do mar;
//   onda    { x, y, w }              espuma que chega na areia e some;
//   veiculo { de: [x, y], ate: [x, y], dur, cor, som }  par de luzes que atravessa (bonde, VLT, trem, carro, barco);
//           som: 'bonde' (padrão) ou 'motor'.
//   janela  { x, y }                 janela que acende e apaga devagar;
//   lanterna{ x, y }                 facho que varre o chão (o vigia);
//   fumaca  { x, y }                 fumaça que sobe (o churrasquinho).
// Além disso, cada luz pequena do lugar ganha um brilho que tremula na poça embaixo dela (em cena.js).
// reacoes: o que reage quando o personagem passa ou para (mesmo formato de marcacao.js).

export const VIVOS_ALTO = {
  lapa: {
    vivos: [
      { tipo: 'neon', x: 0.775, y: 0.615, w: 0.05, h: 0.05, cor: '#ff2c3c' },
      { tipo: 'neon', x: 0.85, y: 0.64, w: 0.04, h: 0.04, cor: '#ff3a4a' },
      { tipo: 'veiculo', de: [0.2, 0.26], ate: [0.62, 0.33], dur: 46, cor: '#ffd27a' },
      { tipo: 'janela', x: 0.33, y: 0.18 },
      { tipo: 'janela', x: 0.62, y: 0.12 },
    ],
    reacoes: [
      { x: 0.5, y: 0.76, raio: 0.07, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.3, y: 0.66, raio: 0.06, quando: 'parar', som: 'gaivota', efeito: 'voa', ex: 0.3, ey: 0.5 },
      { x: 0.8, y: 0.72, raio: 0.06, quando: 'passar', som: 'copo', efeito: 'brilho', ex: 0.81, ey: 0.66 },
    ],
  },
  centro: {
    vivos: [
      { tipo: 'veiculo', de: [0.585, 0.5], ate: [0.66, 0.98], dur: 38, cor: '#f6f2e0' },
      { tipo: 'janela', x: 0.63, y: 0.08 },
      { tipo: 'janela', x: 0.72, y: 0.12 },
      { tipo: 'janela', x: 0.27, y: 0.05 },
    ],
    reacoes: [
      { x: 0.5, y: 0.66, raio: 0.06, quando: 'parar', som: 'gaivota', efeito: 'voa', ex: 0.5, ey: 0.52 },
      { x: 0.45, y: 0.8, raio: 0.06, quando: 'passar', som: 'agua', efeito: 'onda' },
    ],
  },
  'santa-teresa': {
    vivos: [
      { tipo: 'veiculo', de: [0.43, 0.58], ate: [0.5, 0.96], dur: 42, cor: '#ffc870' },
      { tipo: 'agua', x: 0.08, y: 0.18, w: 0.3, h: 0.06 },
      { tipo: 'janela', x: 0.76, y: 0.45 },
      { tipo: 'janela', x: 0.45, y: 0.4 },
    ],
    reacoes: [
      { x: 0.55, y: 0.82, raio: 0.06, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.47, y: 0.66, raio: 0.06, quando: 'parar', som: 'bonde', efeito: 'brilho', ex: 0.44, ey: 0.57 },
    ],
  },
  'zona-sul': {
    vivos: [
      { tipo: 'onda', x: 0.02, y: 0.5, w: 0.5 },
      { tipo: 'onda', x: 0.2, y: 0.4, w: 0.45 },
      { tipo: 'agua', x: 0.05, y: 0.22, w: 0.55, h: 0.12 },
      { tipo: 'veiculo', som: 'motor', de: [0.9, 0.56], ate: [0.6, 0.99], dur: 14, cor: '#fff4d8' },
    ],
    reacoes: [
      { x: 0.5, y: 0.8, raio: 0.07, quando: 'passar', som: 'onda', efeito: 'onda' },
      { x: 0.42, y: 0.79, raio: 0.05, quando: 'parar', som: 'copo', efeito: 'brilho', ex: 0.44, ey: 0.74 },
    ],
  },
  barra: {
    vivos: [
      { tipo: 'onda', x: 0.68, y: 0.44, w: 0.3 },
      { tipo: 'agua', x: 0.74, y: 0.3, w: 0.25, h: 0.1 },
      { tipo: 'veiculo', som: 'motor', de: [0.52, 0.36], ate: [0.63, 0.99], dur: 12, cor: '#fff4d8' },
      { tipo: 'janela', x: 0.3, y: 0.15 },
      { tipo: 'janela', x: 0.05, y: 0.25 },
    ],
    reacoes: [
      { x: 0.8, y: 0.82, raio: 0.07, quando: 'passar', som: 'onda', efeito: 'onda' },
      { x: 0.9, y: 0.62, raio: 0.06, quando: 'parar', som: 'gaivota', efeito: 'voa', ex: 0.9, ey: 0.45 },
    ],
  },
  'zona-norte': {
    vivos: [
      { tipo: 'veiculo', de: [0.24, 0.26], ate: [0.99, 0.29], dur: 26, cor: '#ffe0a0' },
      { tipo: 'janela', x: 0.6, y: 0.12 },
      { tipo: 'janela', x: 0.86, y: 0.15 },
      { tipo: 'neon', x: 0.79, y: 0.55, w: 0.03, h: 0.04, cor: '#ff4a3a' },
    ],
    reacoes: [
      { x: 0.55, y: 0.75, raio: 0.07, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.35, y: 0.72, raio: 0.06, quando: 'parar', som: 'cachorro' },
    ],
  },
  morro: {
    vivos: [
      { tipo: 'veiculo', de: [0.75, 0.2], ate: [0.86, 0.56], dur: 34, cor: '#ffd890' },
      { tipo: 'agua', x: 0.02, y: 0.41, w: 0.3, h: 0.05 },
      { tipo: 'janela', x: 0.6, y: 0.42 },
      { tipo: 'janela', x: 0.73, y: 0.3 },
      { tipo: 'janela', x: 0.94, y: 0.87 },
    ],
    reacoes: [
      { x: 0.43, y: 0.85, raio: 0.07, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.62, y: 0.74, raio: 0.06, quando: 'parar', som: 'cachorro' },
    ],
  },
  cemiterio: {
    vivos: [
      { tipo: 'lanterna', x: 0.73, y: 0.7 },
      { tipo: 'neon', x: 0.64, y: 0.81, w: 0.02, h: 0.03, cor: '#ffb040' },
      { tipo: 'neon', x: 0.94, y: 0.74, w: 0.02, h: 0.03, cor: '#ffb040' },
    ],
    reacoes: [
      { x: 0.66, y: 0.6, raio: 0.07, quando: 'passar', som: 'gaivota', efeito: 'voa', ex: 0.66, ey: 0.42 },
      { x: 0.73, y: 0.86, raio: 0.06, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.62, y: 0.82, raio: 0.05, quando: 'parar', som: 'vela', efeito: 'brilho', ex: 0.64, ey: 0.79 },
    ],
  },
  porto: {
    vivos: [
      { tipo: 'agua', x: 0.1, y: 0.36, w: 0.35, h: 0.06 },
      { tipo: 'veiculo', de: [0.1, 0.56], ate: [0.95, 0.92], dur: 36, cor: '#f6f2e0' },
      { tipo: 'janela', x: 0.71, y: 0.14 },
      { tipo: 'janela', x: 0.69, y: 0.22 },
    ],
    reacoes: [
      { x: 0.6, y: 0.75, raio: 0.07, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.32, y: 0.55, raio: 0.06, quando: 'parar', som: 'gaivota', efeito: 'voa', ex: 0.32, ey: 0.4 },
    ],
  },
  baixada: {
    vivos: [
      { tipo: 'veiculo', de: [0.55, 0.33], ate: [0.99, 0.4], dur: 28, cor: '#ffe0a0' },
      { tipo: 'fumaca', x: 0.21, y: 0.5 },
      { tipo: 'janela', x: 0.86, y: 0.24 },
      { tipo: 'janela', x: 0.62, y: 0.06 },
    ],
    reacoes: [
      { x: 0.4, y: 0.75, raio: 0.07, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.24, y: 0.56, raio: 0.05, quando: 'parar', som: 'copo', efeito: 'brilho', ex: 0.22, ey: 0.5 },
    ],
  },
  niteroi: {
    vivos: [
      { tipo: 'agua', x: 0.08, y: 0.45, w: 0.45, h: 0.12 },
      { tipo: 'veiculo', som: 'motor', de: [0.08, 0.38], ate: [0.5, 0.4], dur: 70, cor: '#fff0c0' },
      { tipo: 'neon', x: 0.8, y: 0.53, w: 0.12, h: 0.05, cor: '#ff3030' },
    ],
    reacoes: [
      { x: 0.7, y: 0.75, raio: 0.07, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.4, y: 0.76, raio: 0.06, quando: 'parar', som: 'gaivota', efeito: 'voa', ex: 0.3, ey: 0.55 },
    ],
  },
  'aeroporto-rio': {
    vivos: [
      { tipo: 'veiculo', som: 'motor', de: [0.62, 0.36], ate: [0.98, 0.3], dur: 30, cor: '#fff6e0' },
      { tipo: 'agua', x: 0.72, y: 0.43, w: 0.27, h: 0.06 },
    ],
    reacoes: [
      { x: 0.55, y: 0.75, raio: 0.07, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.45, y: 0.6, raio: 0.06, quando: 'parar', som: 'motor' },
    ],
  },
};
