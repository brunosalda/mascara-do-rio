// Marcação das âncoras e das reações de cada pintura (rodada 17), por cima de lugares.js.
// Coordenadas de 0 a 1 sobre a pintura, medidas com uma grade sobre cada imagem (e conferíveis no
// modo #/noite?editar).
//
// ancoras: { nome: { contorno, parada, lado, baixo } }
//   contorno: polígono que segue o objeto pintado (acende de perto); parada: onde o personagem para,
//   no chão; lado: para onde ele olha; baixo: objeto no chão (ele se abaixa). Âncoras que são só um
//   trecho de chão (rua, praça, escuro) ficam sem contorno.
// reacoes: coisas da pintura que respondem, sem efeito na regra: { x, y, raio, quando: 'passar' |
//   'parar', som, efeito: 'brilho' | 'onda' | 'pisca' | 'voa', ex, ey (onde o efeito aparece), luz }.
// passantes: faixas do fundo por onde passam vultos (para os lugares que ainda não tinham).
// falas: frases ouvidas de passagem (uma por noite, de um vulto), só sobre a cidade.

export const MARCACAO = {
  lapa: {
    ancoras: {
      bar: { contorno: [[0.778, 0.47], [0.8, 0.43], [0.84, 0.38], [0.9, 0.345], [0.945, 0.33], [0.96, 0.37], [0.955, 0.68], [0.86, 0.69], [0.78, 0.68]], parada: [0.795, 0.735], lado: 'direita' },
      arcos: { contorno: [[0.25, 0.63], [0.25, 0.53], [0.27, 0.49], [0.295, 0.475], [0.32, 0.49], [0.338, 0.53], [0.34, 0.63]], parada: [0.33, 0.7], lado: 'esquerda' },
      fundo: { parada: [0.62, 0.69], lado: 'direita' },
      beco: { parada: [0.88, 0.86], lado: 'direita' },
    },
    reacoes: [
      { x: 0.79, y: 0.72, raio: 0.055, quando: 'passar', som: 'copo', efeito: 'brilho', ex: 0.8, ey: 0.67 },
      { x: 0.47, y: 0.86, raio: 0.05, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.77, y: 0.69, raio: 0.045, quando: 'parar', som: 'zumbido', efeito: 'pisca', luz: 2 },
    ],
    falas: ['…o bonde não sobe mais depois da meia-noite…', '…amanhã eu pago, juro…', '…a roda de samba começa tarde hoje…'],
  },

  centro: {
    ancoras: {
      teatro: { contorno: [[0.18, 0.66], [0.18, 0.36], [0.22, 0.28], [0.27, 0.24], [0.33, 0.2], [0.36, 0.13], [0.39, 0.13], [0.42, 0.2], [0.45, 0.22], [0.48, 0.26], [0.5, 0.3], [0.5, 0.66]], parada: [0.4, 0.71], lado: 'esquerda' },
      bonde: { contorno: [[0.04, 0.72], [0.04, 0.55], [0.07, 0.51], [0.12, 0.5], [0.15, 0.54], [0.15, 0.71]], parada: [0.19, 0.765], lado: 'esquerda' },
      arcada: { contorno: [[0.86, 0.74], [0.86, 0.5], [0.92, 0.46], [0.99, 0.46], [0.99, 0.75]], parada: [0.86, 0.785], lado: 'direita' },
      avenida: { parada: [0.63, 0.71], lado: 'direita' },
    },
    reacoes: [
      { x: 0.26, y: 0.85, raio: 0.06, quando: 'passar', som: 'zumbido' },
      { x: 0.4, y: 0.71, raio: 0.05, quando: 'parar', som: 'janela', efeito: 'brilho', ex: 0.36, ey: 0.42 },
    ],
    falas: ['…o último ônibus já passou faz tempo…', '…ninguém mais vai ao teatro a pé…', '…fecha a grade, que hoje tá esquisito…'],
  },

  'santa-teresa': {
    ancoras: {
      bonde: { contorno: [[0.21, 0.73], [0.21, 0.46], [0.23, 0.42], [0.27, 0.38], [0.33, 0.37], [0.39, 0.39], [0.42, 0.45], [0.42, 0.73]], parada: [0.43, 0.79], lado: 'esquerda' },
      casarao: { contorno: [[0.11, 0.74], [0.11, 0.5], [0.14, 0.46], [0.17, 0.5], [0.17, 0.74]], parada: [0.15, 0.805], lado: 'esquerda' },
      mirante: { parada: [0.56, 0.8], lado: 'direita' },
      ladeira: { parada: [0.5, 0.77], lado: 'direita' },
    },
    reacoes: [
      { x: 0.14, y: 0.8, raio: 0.05, quando: 'parar', som: 'zumbido', efeito: 'pisca', luz: 0 },
      { x: 0.33, y: 0.8, raio: 0.06, quando: 'passar', som: 'bonde', efeito: 'brilho', ex: 0.275, ey: 0.65 },
    ],
    falas: ['…o bondinho voltou a ranger na curva…', '…sobe pela escada, que é mais rápido…', '…a vista daqui ninguém tira da gente…'],
  },

  'zona-sul': {
    ancoras: {
      quiosque: { contorno: [[0.0, 0.55], [0.0, 0.38], [0.04, 0.36], [0.09, 0.39], [0.13, 0.43], [0.1, 0.5], [0.06, 0.55]], parada: [0.07, 0.62], lado: 'esquerda' },
      mar: { contorno: [[0.6, 0.58], [0.72, 0.61], [0.86, 0.67], [0.86, 0.72], [0.72, 0.67], [0.6, 0.63]], parada: [0.68, 0.73], lado: 'direita' },
      calcadao: { parada: [0.38, 0.62], lado: 'esquerda' },
    },
    reacoes: [
      { x: 0.68, y: 0.73, raio: 0.06, quando: 'passar', som: 'onda', efeito: 'brilho', ex: 0.74, ey: 0.66 },
      { x: 0.6, y: 0.8, raio: 0.06, quando: 'passar', som: 'gaivota', efeito: 'voa', ex: 0.64, ey: 0.62 },
    ],
    falas: ['…a água tá gelada, mas eu entro…', '…o quiosque fecha às duas…', '…olha o tamanho dessa onda…'],
  },

  barra: {
    ancoras: {
      predio: { contorno: [[0.08, 0.62], [0.08, 0.02], [0.2, 0.0], [0.25, 0.02], [0.25, 0.6]], parada: [0.15, 0.72], lado: 'esquerda' },
      lagoa: { contorno: [[0.5, 0.66], [0.99, 0.65], [0.99, 0.82], [0.6, 0.8], [0.53, 0.72]], parada: [0.47, 0.79], lado: 'direita' },
      palmeiras: { parada: [0.08, 0.75], lado: 'esquerda' },
    },
    reacoes: [
      { x: 0.47, y: 0.79, raio: 0.05, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.28, y: 0.72, raio: 0.05, quando: 'parar', som: 'zumbido', efeito: 'pisca', luz: 0 },
    ],
    falas: ['…o condomínio novo nem tem morador ainda…', '…vai de carro, que a pé é longe…', '…a lagoa tá cheirando diferente…'],
  },

  'zona-norte': {
    ancoras: {
      quadra: { contorno: [[0.41, 0.6], [0.41, 0.36], [0.47, 0.29], [0.53, 0.26], [0.6, 0.29], [0.65, 0.36], [0.65, 0.6]], parada: [0.6, 0.66], lado: 'esquerda' },
      bar: { contorno: [[0.0, 0.5], [0.0, 0.12], [0.1, 0.18], [0.22, 0.27], [0.34, 0.38], [0.3, 0.42], [0.2, 0.45], [0.1, 0.5]], parada: [0.46, 0.75], lado: 'esquerda' },
      feira: { contorno: [[0.85, 0.72], [0.83, 0.5], [0.9, 0.46], [0.99, 0.45], [0.99, 0.75]], parada: [0.85, 0.77], lado: 'direita' },
      viaduto: { contorno: [[0.4, 0.62], [0.38, 0.1], [0.44, 0.06], [0.46, 0.6]], parada: [0.46, 0.66], lado: 'esquerda' },
      fundo: { contorno: [[0.73, 0.35], [0.76, 0.31], [0.81, 0.3], [0.87, 0.31], [0.88, 0.35], [0.81, 0.37]], parada: [0.76, 0.64], lado: 'direita' },
    },
    reacoes: [
      { x: 0.46, y: 0.76, raio: 0.05, quando: 'passar', som: 'copo', efeito: 'brilho', ex: 0.2, ey: 0.72 },
      { x: 0.6, y: 0.66, raio: 0.05, quando: 'parar', som: 'surdo' },
    ],
    falas: ['…a bateria ensaia até de manhã…', '…o Maracanã tá aceso por quê?…', '…me vê mais uma, que eu tô com sede…'],
  },

  morro: {
    ancoras: {
      vizinho: { contorno: [[0.17, 0.8], [0.16, 0.62], [0.19, 0.55], [0.22, 0.52], [0.24, 0.56], [0.25, 0.66], [0.25, 0.8]], parada: [0.27, 0.75], lado: 'esquerda' },
      janela: { contorno: [[0.32, 0.5], [0.32, 0.44], [0.36, 0.44], [0.36, 0.5]], parada: [0.3, 0.68], lado: 'direita' },
      laje: { contorno: [[0.4, 0.7], [0.41, 0.66], [0.43, 0.65], [0.44, 0.68], [0.43, 0.72]], parada: [0.38, 0.83], lado: 'direita' },
      topo: { parada: [0.27, 0.62], lado: 'direita' },
    },
    reacoes: [
      { x: 0.26, y: 0.72, raio: 0.05, quando: 'parar', som: 'zumbido', efeito: 'pisca', luz: 0 },
      { x: 0.37, y: 0.83, raio: 0.05, quando: 'passar', som: 'cachorro' },
    ],
    passantes: [{ y: 0.6, x0: 0.25, x1: 0.31 }],
    falas: ['…acabou a luz lá em cima de novo…', '…cuidado com o degrau quebrado…', '…sobe logo, que vai chover…'],
  },

  cemiterio: {
    ancoras: {
      anjo: { contorno: [[0.15, 0.84], [0.15, 0.55], [0.16, 0.3], [0.2, 0.22], [0.25, 0.25], [0.28, 0.29], [0.32, 0.5], [0.34, 0.6], [0.34, 0.85]], parada: [0.4, 0.88], lado: 'esquerda' },
      capela: { contorno: [[0.43, 0.8], [0.43, 0.66], [0.46, 0.62], [0.49, 0.62], [0.53, 0.66], [0.53, 0.8]], parada: [0.5, 0.84], lado: 'esquerda' },
      tumulo: { contorno: [[0.32, 0.6], [0.32, 0.45], [0.35, 0.39], [0.38, 0.39], [0.4, 0.45], [0.4, 0.6]], parada: [0.44, 0.87], lado: 'esquerda' },
      grade: { contorno: [[0.58, 0.8], [0.58, 0.69], [0.6, 0.66], [0.63, 0.66], [0.65, 0.7], [0.65, 0.8]], parada: [0.65, 0.84], lado: 'esquerda' },
    },
    reacoes: [
      { x: 0.5, y: 0.84, raio: 0.05, quando: 'passar', som: 'vela', efeito: 'pisca', luz: 0 },
      { x: 0.7, y: 0.89, raio: 0.06, quando: 'passar', som: 'grilo' },
    ],
    passantes: [{ y: 0.83, x0: 0.55, x1: 0.9 }],
    falas: ['…ninguém vem aqui depois do portão fechar…', '…a vela apaga sozinha, eu juro…', '…reza baixo, que ele escuta…'],
  },

  porto: {
    ancoras: {
      mural: { contorno: [[0.73, 0.52], [0.73, 0.35], [0.8, 0.3], [0.9, 0.28], [0.99, 0.3], [0.99, 0.52]], parada: [0.88, 0.7], lado: 'direita' },
      vlt: { contorno: [[0.66, 0.64], [0.66, 0.55], [0.7, 0.52], [0.82, 0.52], [0.85, 0.56], [0.85, 0.64]], parada: [0.74, 0.68], lado: 'direita' },
      orla: { contorno: [[0.02, 0.75], [0.02, 0.6], [0.49, 0.6], [0.47, 0.7], [0.3, 0.73]], parada: [0.3, 0.8], lado: 'esquerda' },
      fundo: { parada: [0.55, 0.64], lado: 'direita' },
    },
    reacoes: [
      { x: 0.3, y: 0.8, raio: 0.06, quando: 'parar', som: 'sino' },
      { x: 0.15, y: 0.79, raio: 0.06, quando: 'passar', som: 'agua', efeito: 'onda' },
    ],
    falas: ['…o navio grande sai de madrugada…', '…o VLT parou de novo…', '…olha a lua em cima do museu…'],
  },

  baixada: {
    ancoras: {
      bar: { contorno: [[0.05, 0.78], [0.05, 0.38], [0.12, 0.28], [0.21, 0.33], [0.21, 0.78]], parada: [0.22, 0.8], lado: 'esquerda' },
      moto: { contorno: [[0.27, 0.78], [0.27, 0.6], [0.3, 0.5], [0.34, 0.48], [0.36, 0.55], [0.36, 0.78]], parada: [0.4, 0.84], lado: 'esquerda' },
      esquina: { contorno: [[0.335, 0.62], [0.335, 0.15], [0.41, 0.12], [0.42, 0.14], [0.345, 0.18], [0.345, 0.62]], parada: [0.4, 0.66], lado: 'esquerda' },
      muro: { contorno: [[0.53, 0.42], [0.53, 0.35], [0.7, 0.3], [0.87, 0.25], [0.9, 0.32], [0.9, 0.4]], parada: [0.72, 0.72], lado: 'direita' },
    },
    reacoes: [
      { x: 0.4, y: 0.84, raio: 0.05, quando: 'parar', som: 'motor' },
      { x: 0.72, y: 0.72, raio: 0.06, quando: 'passar', som: 'trem' },
    ],
    falas: ['…o trem das onze nem passou…', '…me leva até a estação?…', '…a birosca fecha quando o dono dormir…'],
  },

  niteroi: {
    ancoras: {
      museu: { contorno: [[0.21, 0.27], [0.32, 0.24], [0.45, 0.23], [0.58, 0.26], [0.55, 0.33], [0.44, 0.38], [0.42, 0.48], [0.38, 0.48], [0.36, 0.38], [0.25, 0.33]], parada: [0.42, 0.66], lado: 'esquerda' },
      rampa: { contorno: [[0.1, 0.49], [0.15, 0.44], [0.24, 0.4], [0.33, 0.37], [0.33, 0.4], [0.22, 0.45], [0.16, 0.5]], parada: [0.19, 0.66], lado: 'esquerda' },
      mureta: { contorno: [[0.925, 0.62], [0.93, 0.2], [0.915, 0.15], [0.93, 0.08], [0.955, 0.08], [0.965, 0.15], [0.95, 0.2], [0.955, 0.62]], parada: [0.88, 0.72], lado: 'direita' },
      vista: { parada: [0.74, 0.66], lado: 'direita' },
    },
    reacoes: [
      { x: 0.5, y: 0.64, raio: 0.06, quando: 'passar', som: 'agua', efeito: 'onda' },
      { x: 0.88, y: 0.72, raio: 0.05, quando: 'parar', som: 'zumbido', efeito: 'pisca', luz: 1 },
    ],
    falas: ['…a barca das duas é a última…', '…daqui dá pra ver o Rio inteiro…', '…o museu parece que vai sair voando…'],
  },
};
