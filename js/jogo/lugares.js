// Geografia de cada pintura: onde há chão, a perspectiva, os lugares com nome (âncoras), os objetos
// da frente (o personagem passa atrás deles) e as fontes de luz. Coordenadas de 0 a 1 sobre a
// pintura (x na largura, y na altura). Para marcar um lugar novo, abra a cena com #/noite?editar:
// cada clique mostra a coordenada, e os polígonos aparecem por cima da pintura.
//
// chao:      polígono onde os pés podem pisar.
// horizonte: altura da linha do horizonte; altura do personagem = k × (y dos pés − horizonte).
// ancoras:   { nome: { x, y, termos, papel } }. papel: 'memoria' (o que aconteceu), 'escuro' (caçar),
//            'livre' (outra ideia). As opções da noite vão para a âncora cujos termos aparecem no texto.
// frente:    objetos da frente: { poligono, base } (base = y onde o objeto toca o chão).
// luzes:     { x, y, cor, raio, forca, falha } (raio em alturas da pintura; falha = néon ou lâmpada que pisca).
// vida:      passantes (silhuetas que atravessam o fundo, na altura y, entre x0 e x1) e farois (faixa
//            de luz que varre o chão entre y0 e y1).

export const LUGARES = {
  lapa: {
    horizonte: 0.568,
    k: 1.12,
    chao: [[0.01, 0.70], [0.12, 0.685], [0.3, 0.668], [0.5, 0.66], [0.66, 0.658], [0.72, 0.668], [0.76, 0.685],
      [0.92, 0.69], [0.93, 0.745], [0.99, 0.79], [0.99, 0.94], [0.01, 0.94]],
    entrada: [0.13, 0.84],
    saida: [0.055, 0.83],
    ancoras: {
      arcos: { x: 0.32, y: 0.68, papel: 'memoria', termos: ['arcos', 'aqueduto', 'bonde', 'bondinho'] },
      bar: { x: 0.83, y: 0.715, termos: ['bar', 'boteco', 'botequim', 'dono', 'balcao', 'bebida', 'cerveja', 'garcom', 'mesa', 'antonio'] },
      rua: { x: 0.5, y: 0.82, papel: 'livre', termos: ['rua', 'praca', 'gente', 'multidao', 'policia', 'carro', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      fundo: { x: 0.64, y: 0.672, termos: ['seguir', 'centro', 'caminho', 'andar', 'ir ', 'procurar', 'encontrar'] },
      beco: { x: 0.95, y: 0.86, papel: 'escuro', termos: ['beco', 'escondido', 'sombra', 'esconder', 'vigiar', 'observar'] },
      calcada: { x: 0.24, y: 0.76, termos: [] },
    },
    frente: [
      // O homem pintado que passa à esquerda.
      { base: 0.785, poligono: [[0.077, 0.556], [0.092, 0.556], [0.097, 0.575], [0.1, 0.585], [0.106, 0.62], [0.108, 0.668], [0.097, 0.672],
        [0.095, 0.72], [0.092, 0.785], [0.083, 0.785], [0.081, 0.73], [0.078, 0.785], [0.07, 0.785], [0.068, 0.72], [0.066, 0.668],
        [0.055, 0.665], [0.057, 0.62], [0.06, 0.585], [0.07, 0.575]] },
      // Mesas e cadeiras da calçada do bar.
      { base: 0.705, poligono: [[0.745, 0.64], [0.92, 0.635], [0.922, 0.705], [0.745, 0.705]] },
    ],
    luzes: [
      { x: 0.885, y: 0.45, cor: '#ff2c3c', raio: 0.24, forca: 1, falha: true },  // neon do bar
      { x: 0.836, y: 0.53, cor: '#ff5a2a', raio: 0.2, forca: 0.9 },    // salão do bar
      { x: 0.766, y: 0.433, cor: '#ffc46a', raio: 0.22, forca: 0.9 },  // poste
      { x: 0.196, y: 0.55, cor: '#ffb04a', raio: 0.2, forca: 0.8 },    // luminárias sob os arcos
      { x: 0.425, y: 0.58, cor: '#ffb04a', raio: 0.17, forca: 0.7 },
      { x: 0.535, y: 0.575, cor: '#ffb04a', raio: 0.15, forca: 0.6 },
      { x: 0.03, y: 0.54, cor: '#ff3a2a', raio: 0.16, forca: 0.7 },    // bar da esquerda
    ],
    vida: { passantes: [{ y: 0.645, x0: 0.14, x1: 0.68 }], farois: { y0: 0.66, y1: 0.94 } },
  },

  'santa-teresa': {
    horizonte: 0.6,
    k: 1.1,
    chao: [[0.01, 0.80], [0.08, 0.785], [0.2, 0.776], [0.3, 0.776], [0.4, 0.765], [0.44, 0.746], [0.55, 0.746],
      [0.59, 0.77], [0.6, 0.85], [0.6, 0.94], [0.01, 0.94]],
    entrada: [0.12, 0.87],
    saida: [0.055, 0.86],
    ancoras: {
      casarao: { x: 0.1, y: 0.8, papel: 'memoria', termos: ['casa', 'casarao', 'porta', 'janela', 'atelie', 'vizinho'] },
      bonde: { x: 0.31, y: 0.795, termos: ['bonde', 'bondinho', 'trilho', 'motorneiro'] },
      mirante: { x: 0.585, y: 0.795, termos: ['vista', 'baia', 'cidade', 'mirante', 'olhar', 'observar', 'vigiar'] },
      ladeira: { x: 0.5, y: 0.755, termos: ['ladeira', 'subir', 'seguir', 'caminho', 'largo', 'procurar', 'encontrar'] },
      trilhos: { x: 0.33, y: 0.9, papel: 'livre', termos: ['rua', 'gente', 'carro', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      muro: { x: 0.57, y: 0.9, papel: 'escuro', termos: ['muro', 'mato', 'escuro', 'esconder', 'sombra'] },
    },
    frente: [
      // O bonde: quem anda pela ladeira passa atrás dele.
      { base: 0.768, poligono: [[0.21, 0.395], [0.3, 0.37], [0.42, 0.4], [0.425, 0.765], [0.21, 0.772]] },
    ],
    luzes: [
      { x: 0.125, y: 0.27, cor: '#ffc060', raio: 0.32, forca: 0.9, falha: true }, // lampião na parede
      { x: 0.275, y: 0.65, cor: '#fff0c0', raio: 0.16, forca: 0.9 },   // farol do bonde
      { x: 0.33, y: 0.5, cor: '#ffb050', raio: 0.26, forca: 0.8 },     // salão do bonde
      { x: 0.52, y: 0.665, cor: '#ffb050', raio: 0.1, forca: 0.6 },    // poste ao fundo
      { x: 0.575, y: 0.08, cor: '#cfe0ff', raio: 0.6, forca: 0.25 },   // lua
    ],
    vida: { passantes: [{ y: 0.748, x0: 0.44, x1: 0.56 }] },
  },

  centro: {
    horizonte: 0.56,
    k: 0.85,
    chao: [[0.02, 0.80], [0.1, 0.78], [0.152, 0.748], [0.158, 0.715], [0.22, 0.695], [0.3, 0.68], [0.5, 0.678],
      [0.62, 0.682], [0.75, 0.68], [0.82, 0.69], [0.9, 0.715], [0.98, 0.745], [0.98, 0.94], [0.02, 0.94]],
    entrada: [0.14, 0.87],
    saida: [0.06, 0.87],
    ancoras: {
      teatro: { x: 0.4, y: 0.69, papel: 'memoria', termos: ['teatro', 'theatro', 'municipal', 'escadaria', 'opera', 'espetaculo'] },
      bonde: { x: 0.18, y: 0.755, termos: ['bonde', 'vlt', 'trilho', 'onibus', 'metro'] },
      praca: { x: 0.55, y: 0.8, papel: 'livre', termos: ['praca', 'cinelandia', 'gente', 'multidao', 'protesto', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      avenida: { x: 0.65, y: 0.69, termos: ['avenida', 'rio branco', 'seguir', 'caminho', 'procurar', 'encontrar', 'predio', 'escritorio'] },
      arcada: { x: 0.9, y: 0.77, papel: 'escuro', termos: ['marquise', 'arcada', 'esconder', 'sombra', 'beco', 'dormir'] },
      calcada: { x: 0.3, y: 0.82, termos: [] },
    },
    frente: [
      // O bonde parado à esquerda.
      { base: 0.745, poligono: [[0.035, 0.51], [0.15, 0.505], [0.156, 0.745], [0.04, 0.75]] },
    ],
    luzes: [
      { x: 0.095, y: 0.32, cor: '#ffc060', raio: 0.26, forca: 0.8 },   // poste da esquerda
      { x: 0.175, y: 0.47, cor: '#ffc46a', raio: 0.18, forca: 0.8 },   // luminárias da praça
      { x: 0.29, y: 0.53, cor: '#ffc46a', raio: 0.16, forca: 0.7 },
      { x: 0.36, y: 0.5, cor: '#ff9a40', raio: 0.3, forca: 0.6 },      // fachada do teatro
      { x: 0.46, y: 0.55, cor: '#ffc46a', raio: 0.14, forca: 0.6 },
      { x: 0.58, y: 0.55, cor: '#ffc46a', raio: 0.14, forca: 0.6 },
      { x: 0.76, y: 0.56, cor: '#ffc46a', raio: 0.12, forca: 0.5 },
      { x: 0.1, y: 0.6, cor: '#ffb050', raio: 0.15, forca: 0.6 },      // salão do bonde
    ],
    vida: { passantes: [{ y: 0.676, x0: 0.2, x1: 0.8 }], farois: { y0: 0.68, y1: 0.94 } },
  },

  // Copacabana: calçadão, areia e mar. A mulher pintada em primeiro plano tapa quem passa atrás dela.
  'zona-sul': {
    horizonte: 0.47,
    k: 1.0,
    chao: [[0.02, 0.62], [0.2, 0.56], [0.32, 0.525], [0.42, 0.505], [0.5, 0.51], [0.58, 0.58], [0.68, 0.66],
      [0.8, 0.73], [0.9, 0.79], [0.98, 0.85], [0.98, 0.9], [0.02, 0.9]],
    entrada: [0.42, 0.8],
    saida: [0.4, 0.525],
    ancoras: {
      calcadao: { x: 0.38, y: 0.6, papel: 'memoria', termos: ['calcadao', 'orla', 'copacabana', 'ipanema', 'caminhar'] },
      quiosque: { x: 0.04, y: 0.62, termos: ['quiosque', 'bar', 'cerveja', 'coco', 'mesa', 'garcom'] },
      mar: { x: 0.72, y: 0.72, termos: ['mar', 'praia', 'onda', 'agua', 'nadar'] },
      areia: { x: 0.6, y: 0.8, termos: ['areia', 'seguir', 'caminho', 'procurar', 'encontrar'] },
      meio: { x: 0.45, y: 0.84, papel: 'livre', termos: ['gente', 'turista', 'policia', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      escuro: { x: 0.93, y: 0.86, papel: 'escuro', termos: ['escuro', 'sombra', 'esconder', 'vigiar'] },
    },
    frente: [
      { base: 0.995, poligono: [[0.15, 0.27], [0.2, 0.24], [0.25, 0.25], [0.26, 0.32], [0.27, 0.44], [0.29, 0.5], [0.3, 0.62],
        [0.3, 1.0], [0.08, 1.0], [0.09, 0.7], [0.1, 0.55], [0.12, 0.45], [0.14, 0.36]] },
    ],
    luzes: [
      { x: 0.255, y: 0.165, cor: '#ffd890', raio: 0.25, forca: 0.8 },
      { x: 0.32, y: 0.3, cor: '#ffd890', raio: 0.18, forca: 0.7 },
      { x: 0.34, y: 0.36, cor: '#ffd890', raio: 0.15, forca: 0.6 },
      { x: 0.76, y: 0.19, cor: '#e0e8ff', raio: 0.6, forca: 0.25 },
    ],
    vida: { passantes: [{ y: 0.515, x0: 0.33, x1: 0.47 }] },
  },

  // Barra: a avenida larga, os prédios e a lagoa à direita (não dá para pisar na água).
  barra: {
    horizonte: 0.62,
    k: 0.8,
    chao: [[0.02, 0.72], [0.2, 0.69], [0.35, 0.67], [0.45, 0.655], [0.47, 0.66], [0.5, 0.75], [0.53, 0.85], [0.56, 0.94], [0.02, 0.94]],
    entrada: [0.22, 0.86],
    saida: [0.06, 0.84],
    ancoras: {
      predio: { x: 0.12, y: 0.72, papel: 'memoria', termos: ['predio', 'condominio', 'apartamento', 'portaria', 'porteiro'] },
      pista: { x: 0.28, y: 0.82, papel: 'livre', termos: ['carro', 'avenida', 'pista', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      lagoa: { x: 0.5, y: 0.8, termos: ['lagoa', 'agua', 'beira', 'canal'] },
      fundo: { x: 0.42, y: 0.675, termos: ['seguir', 'caminho', 'procurar', 'encontrar', 'shopping'] },
      palmeiras: { x: 0.06, y: 0.76, termos: ['palmeira', 'calcada', 'esperar'] },
      escuro: { x: 0.53, y: 0.9, papel: 'escuro', termos: ['mato', 'escuro', 'esconder', 'sombra'] },
    },
    frente: [],
    luzes: [
      { x: 0.275, y: 0.5, cor: '#ffb050', raio: 0.22, forca: 0.8 },
      { x: 0.345, y: 0.56, cor: '#ffb050', raio: 0.15, forca: 0.6 },
      { x: 0.74, y: 0.32, cor: '#e0e8ff', raio: 0.6, forca: 0.2 },
    ],
    vida: { passantes: [{ y: 0.685, x0: 0.05, x1: 0.42 }], farois: { y0: 0.66, y1: 0.94 } },
  },

  // Zona Norte: a rua do samba debaixo do viaduto. O bar lotado à esquerda e a barraca de frutas à
  // direita ficam na frente de quem anda pela rua.
  'zona-norte': {
    horizonte: 0.5,
    k: 0.95,
    chao: [[0.43, 0.8], [0.42, 0.68], [0.44, 0.64], [0.55, 0.63], [0.7, 0.62], [0.8, 0.63], [0.86, 0.68], [0.9, 0.78], [0.92, 0.9], [0.44, 0.9]],
    entrada: [0.62, 0.84],
    saida: [0.56, 0.885],
    ancoras: {
      quadra: { x: 0.57, y: 0.645, papel: 'memoria', termos: ['samba', 'escola', 'quadra', 'ensaio', 'bateria'] },
      bar: { x: 0.47, y: 0.78, termos: ['bar', 'boteco', 'cerveja', 'mesa', 'pagode', 'dono'] },
      feira: { x: 0.86, y: 0.76, termos: ['feira', 'fruta', 'barraca', 'vendedor', 'camelo'] },
      rua: { x: 0.72, y: 0.82, papel: 'livre', termos: ['rua', 'gente', 'carro', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      fundo: { x: 0.76, y: 0.635, termos: ['maracana', 'estadio', 'seguir', 'caminho', 'procurar', 'encontrar'] },
      viaduto: { x: 0.46, y: 0.66, papel: 'escuro', termos: ['viaduto', 'pilastra', 'escuro', 'esconder', 'sombra'] },
    },
    frente: [
      { base: 0.995, poligono: [[0, 0.4], [0.4, 0.42], [0.44, 0.47], [0.445, 0.56], [0.43, 0.62], [0.425, 1.0], [0, 1.0]] },
      { base: 0.99, poligono: [[0.88, 0.5], [1.0, 0.48], [1.0, 1.0], [0.92, 1.0], [0.9, 0.8], [0.88, 0.65]] },
    ],
    luzes: [
      { x: 0.02, y: 0.2, cor: '#ff8040', raio: 0.3, forca: 0.7 },
      { x: 0.53, y: 0.27, cor: '#bfe0ff', raio: 0.25, forca: 0.6 },
      { x: 0.91, y: 0.25, cor: '#ffb050', raio: 0.3, forca: 0.8 },
      { x: 0.965, y: 0.5, cor: '#ffd080', raio: 0.18, forca: 0.8 },
      { x: 0.81, y: 0.33, cor: '#e0f0ff', raio: 0.3, forca: 0.4 },
    ],
    vida: { passantes: [{ y: 0.625, x0: 0.46, x1: 0.84 }], farois: { y0: 0.62, y1: 0.9 } },
  },

  // Morro: a escadaria do beco. O homem sentado à esquerda tapa quem passa atrás dele.
  morro: {
    horizonte: 0.4,
    k: 0.55,
    chao: [[0.255, 0.58], [0.3, 0.58], [0.33, 0.68], [0.37, 0.78], [0.41, 0.87], [0.44, 0.94], [0.19, 0.94], [0.2, 0.85], [0.23, 0.78], [0.25, 0.68]],
    entrada: [0.31, 0.88],
    saida: [0.22, 0.91],
    ancoras: {
      vizinho: { x: 0.245, y: 0.74, papel: 'memoria', termos: ['vizinho', 'morador', 'homem', 'conversar', 'senhor'] },
      escadaria: { x: 0.34, y: 0.79, papel: 'livre', termos: ['escada', 'beco', 'gente', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      laje: { x: 0.385, y: 0.85, termos: ['laje', 'vista', 'cidade', 'olhar', 'observar', 'vigiar'] },
      topo: { x: 0.275, y: 0.6, termos: ['subir', 'seguir', 'boca', 'procurar', 'encontrar', 'caminho'] },
      janela: { x: 0.305, y: 0.67, termos: ['casa', 'janela', 'porta', 'barraco'] },
      escuro: { x: 0.42, y: 0.92, papel: 'escuro', termos: ['escuro', 'esconder', 'sombra', 'esquina'] },
    },
    frente: [
      { base: 0.775, poligono: [[0.2, 0.52], [0.22, 0.5], [0.24, 0.52], [0.245, 0.6], [0.26, 0.66], [0.27, 0.75], [0.25, 0.775], [0.17, 0.775], [0.165, 0.66], [0.19, 0.58]] },
    ],
    luzes: [
      { x: 0.2, y: 0.21, cor: '#ffb040', raio: 0.32, forca: 0.9, falha: true },
      { x: 0.265, y: 0.39, cor: '#ffb040', raio: 0.16, forca: 0.7 },
      { x: 0.335, y: 0.47, cor: '#ffa040', raio: 0.14, forca: 0.6 },
    ],
    vida: {},
  },

  // Cemitério: o caminho molhado até o portão. O anjo à esquerda fica na frente de tudo.
  cemiterio: {
    horizonte: 0.6,
    k: 0.75,
    chao: [[0.38, 0.84], [0.5, 0.8], [0.62, 0.8], [0.78, 0.81], [0.9, 0.84], [0.97, 0.88], [0.97, 0.94], [0.38, 0.94]],
    entrada: [0.66, 0.9],
    saida: [0.62, 0.815],
    ancoras: {
      tumulo: { x: 0.46, y: 0.86, papel: 'memoria', termos: ['tumulo', 'jazigo', 'cova', 'morto', 'enterro', 'lapide'] },
      anjo: { x: 0.4, y: 0.9, termos: ['anjo', 'estatua'] },
      caminho: { x: 0.7, y: 0.89, papel: 'livre', termos: ['caminho', 'gente', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      capela: { x: 0.52, y: 0.815, termos: ['capela', 'vela', 'rezar', 'padre', 'coveiro'] },
      grade: { x: 0.8, y: 0.83, termos: ['seguir', 'procurar', 'encontrar', 'grade', 'muro'] },
      escuro: { x: 0.93, y: 0.9, papel: 'escuro', termos: ['escuro', 'esconder', 'sombra'] },
    },
    frente: [
      { base: 0.95, poligono: [[0.15, 0.32], [0.2, 0.24], [0.27, 0.22], [0.31, 0.26], [0.33, 0.35], [0.34, 0.5], [0.37, 0.82], [0.37, 0.88], [0.31, 0.96], [0.2, 0.96], [0.13, 0.8], [0.14, 0.6]] },
    ],
    luzes: [
      { x: 0.447, y: 0.71, cor: '#ffa040', raio: 0.16, forca: 0.9, falha: true },
      { x: 0.645, y: 0.105, cor: '#e8eeff', raio: 0.6, forca: 0.3 },
    ],
    vida: {},
  },

  // Zona Portuária: a orla do Museu do Amanhã e o VLT. A baía à esquerda não é chão; o casal à
  // esquerda tapa quem passa atrás dele.
  porto: {
    horizonte: 0.52,
    k: 0.6,
    chao: [[0.01, 0.8], [0.12, 0.775], [0.25, 0.745], [0.4, 0.715], [0.48, 0.685], [0.5, 0.61], [0.6, 0.6], [0.7, 0.635], [0.85, 0.64],
      [0.99, 0.66], [0.99, 0.94], [0.01, 0.94]],
    entrada: [0.45, 0.87],
    saida: [0.95, 0.78],
    ancoras: {
      mural: { x: 0.88, y: 0.67, papel: 'memoria', termos: ['mural', 'pequena africa', 'historia', 'gamboa', 'saude', 'samba'] },
      vlt: { x: 0.75, y: 0.66, termos: ['vlt', 'bonde', 'trem'] },
      orla: { x: 0.3, y: 0.8, termos: ['agua', 'baia', 'cais', 'mar', 'barco', 'museu', 'amanha'] },
      praca: { x: 0.6, y: 0.8, papel: 'livre', termos: ['praca', 'maua', 'gente', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      fundo: { x: 0.56, y: 0.625, termos: ['seguir', 'caminho', 'procurar', 'encontrar'] },
      armazem: { x: 0.97, y: 0.9, papel: 'escuro', termos: ['armazem', 'beco', 'escuro', 'esconder', 'sombra'] },
    },
    frente: [
      { base: 0.85, poligono: [[0.12, 0.69], [0.135, 0.67], [0.15, 0.68], [0.165, 0.7], [0.175, 0.71], [0.18, 0.75], [0.17, 0.85], [0.125, 0.85], [0.118, 0.76]] },
    ],
    luzes: [
      { x: 0.35, y: 0.47, cor: '#fff0c8', raio: 0.35, forca: 0.6 },
      { x: 0.81, y: 0.6, cor: '#fff0d0', raio: 0.15, forca: 0.8 },
      { x: 0.55, y: 0.48, cor: '#ffc060', raio: 0.15, forca: 0.6 },
      { x: 0.65, y: 0.5, cor: '#ffc060', raio: 0.15, forca: 0.6 },
      { x: 0.82, y: 0.7, cor: '#ff4040', raio: 0.15, forca: 0.5 },
    ],
    vida: { passantes: [{ y: 0.605, x0: 0.5, x1: 0.98 }], farois: { y0: 0.6, y1: 0.94 } },
  },

  // Baixada: a rua de paralelepípedo, o bar de esquina e a moto. A moto e os homens do bar ficam na frente.
  baixada: {
    horizonte: 0.55,
    k: 1.1,
    chao: [[0.12, 0.8], [0.25, 0.72], [0.38, 0.64], [0.44, 0.6], [0.5, 0.6], [0.6, 0.63], [0.72, 0.7], [0.85, 0.8], [0.93, 0.9], [0.08, 0.9]],
    entrada: [0.55, 0.85],
    saida: [0.47, 0.605],
    ancoras: {
      esquina: { x: 0.42, y: 0.65, papel: 'memoria', termos: ['esquina', 'poste', 'vizinho', 'morador'] },
      bar: { x: 0.21, y: 0.79, termos: ['bar', 'boteco', 'birosca', 'cerveja', 'mesa', 'dono'] },
      rua: { x: 0.52, y: 0.82, papel: 'livre', termos: ['rua', 'gente', 'carro', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      moto: { x: 0.38, y: 0.83, termos: ['moto', 'motoboy', 'mototaxi', 'entrega'] },
      muro: { x: 0.74, y: 0.73, termos: ['trem', 'linha', 'muro', 'estacao', 'seguir', 'procurar', 'encontrar'] },
      escuro: { x: 0.88, y: 0.88, papel: 'escuro', termos: ['escuro', 'esconder', 'sombra', 'beco'] },
    },
    frente: [
      { base: 0.79, poligono: [[0.28, 0.5], [0.32, 0.47], [0.35, 0.49], [0.37, 0.55], [0.37, 0.68], [0.34, 0.79], [0.29, 0.8], [0.27, 0.7], [0.27, 0.57]] },
      { base: 0.8, poligono: [[0.03, 0.54], [0.08, 0.53], [0.1, 0.6], [0.12, 0.7], [0.11, 0.8], [0.0, 0.8], [0.0, 0.6]] },
    ],
    luzes: [
      { x: 0.15, y: 0.39, cor: '#ff3020', raio: 0.32, forca: 1, falha: true },
      { x: 0.405, y: 0.125, cor: '#ffc060', raio: 0.36, forca: 0.8 },
      { x: 0.295, y: 0.645, cor: '#fff0c0', raio: 0.15, forca: 0.8 },
      { x: 0.41, y: 0.48, cor: '#60d0e0', raio: 0.12, forca: 0.5 },
      { x: 0.76, y: 0.33, cor: '#ffd890', raio: 0.25, forca: 0.4 },
    ],
    vida: { passantes: [{ y: 0.605, x0: 0.43, x1: 0.56 }], farois: { y0: 0.6, y1: 0.9 } },
  },

  // Niterói: a praça molhada diante do MAC, com a baía e o Rio ao fundo (pintura refeita em 17/10/2026).
  niteroi: {
    horizonte: 0.46,
    k: 0.75,
    chao: [[0.01, 0.6], [0.3, 0.6], [0.67, 0.6], [0.85, 0.62], [0.92, 0.66], [0.99, 0.72], [0.99, 0.94], [0.01, 0.94]],
    entrada: [0.45, 0.86],
    saida: [0.04, 0.7],
    ancoras: {
      museu: { x: 0.4, y: 0.63, papel: 'memoria', termos: ['museu', 'mac', 'niemeyer', 'arte', 'exposicao'] },
      vista: { x: 0.75, y: 0.64, termos: ['vista', 'baia', 'rio', 'olhar', 'observar', 'vigiar', 'barca'] },
      mureta: { x: 0.9, y: 0.74, termos: ['mureta', 'mar', 'pescador', 'icarai', 'praia'] },
      praca: { x: 0.5, y: 0.82, papel: 'livre', termos: ['praca', 'gente', 'placa', 'internet', 'celular', 'rastrear', 'pesquisar'] },
      rampa: { x: 0.18, y: 0.63, termos: ['rampa', 'seguir', 'caminho', 'procurar', 'encontrar'] },
      escuro: { x: 0.06, y: 0.86, papel: 'escuro', termos: ['escuro', 'esconder', 'sombra', 'mato'] },
    },
    frente: [],
    luzes: [
      { x: 0.94, y: 0.2, cor: '#ffc060', raio: 0.35, forca: 0.9, falha: true },
      { x: 0.87, y: 0.45, cor: '#ffc060', raio: 0.18, forca: 0.7 },
      { x: 0.045, y: 0.42, cor: '#ffc060', raio: 0.2, forca: 0.7 },
      { x: 0.4, y: 0.32, cor: '#ffd890', raio: 0.35, forca: 0.7 },
      { x: 0.22, y: 0.45, cor: '#ff4030', raio: 0.15, forca: 0.5 },
    ],
    vida: { passantes: [{ y: 0.61, x0: 0.05, x1: 0.65 }] },
  },
};

// Lugares ainda sem marcação: chão na parte de baixo da pintura e âncoras espalhadas.
const PADRAO = {
  horizonte: 0.56,
  k: 1.0,
  chao: [[0.02, 0.70], [0.98, 0.70], [0.98, 0.94], [0.02, 0.94]],
  entrada: [0.12, 0.86],
  saida: [0.055, 0.84],
  ancoras: {
    a: { x: 0.22, y: 0.76, papel: 'memoria', termos: [] },
    b: { x: 0.4, y: 0.86, termos: [] },
    c: { x: 0.52, y: 0.74, papel: 'livre', termos: [] },
    d: { x: 0.66, y: 0.88, termos: [] },
    e: { x: 0.8, y: 0.76, termos: [] },
    f: { x: 0.92, y: 0.88, papel: 'escuro', termos: [] },
    g: { x: 0.34, y: 0.72, termos: [] },
    h: { x: 0.6, y: 0.8, termos: [] },
  },
  frente: [],
  luzes: [],
  vida: {},
};

export function geografia(id) {
  return LUGARES[id] || PADRAO;
}

// --- Geometria -------------------------------------------------------------------------------

export function dentro([x, y], poligono) {
  let dentroDele = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentroDele = !dentroDele;
  }
  return dentroDele;
}

// Ponto do polígono mais perto de (x, y), um pouco para dentro (para um clique fora do chão).
export function maisPertoDentro([x, y], poligono, aspecto = 1) {
  if (dentro([x, y], poligono)) return [x, y];
  let melhor = null;
  let menor = Infinity;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [ax, ay] = poligono[j];
    const [bx, by] = poligono[i];
    const dx = (bx - ax) * aspecto;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, (((x - ax) * aspecto) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    const px = ax + (bx - ax) * t;
    const py = ay + (by - ay) * t;
    const d = Math.hypot((px - x) * aspecto, py - y);
    if (d < menor) { menor = d; melhor = [px, py]; }
  }
  // Puxa um pouco para o centro do polígono, para não ficar exatamente na borda.
  const cx = poligono.reduce((s, p) => s + p[0], 0) / poligono.length;
  const cy = poligono.reduce((s, p) => s + p[1], 0) / poligono.length;
  for (let f = 0.01; f < 0.2; f += 0.01) {
    const q = [melhor[0] + (cx - melhor[0]) * f, melhor[1] + (cy - melhor[1]) * f];
    if (dentro(q, poligono)) return q;
  }
  return melhor;
}

// Âncoras para os pontos da noite: memória, caçada, outra ideia e as opções (por palavra-chave).
const semAcento = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function distribuirAncoras(geo, pedidos) {
  const livres = Object.entries(geo.ancoras).map(([nome, a]) => ({ nome, ...a }));
  const tirar = (a) => { const i = livres.indexOf(a); if (i >= 0) livres.splice(i, 1); return a; };
  const porPapel = (papel) => livres.find((a) => a.papel === papel);
  const resultado = new Map();
  // 1. memória e caçada no lugar delas; 2. opções da noite pela palavra-chave;
  // 3. "outra ideia" no lugar livre, se sobrou; 4. o resto, na ordem.
  for (const p of pedidos) if (p.papel && p.papel !== 'livre') { const a = porPapel(p.papel); if (a) resultado.set(p.id, tirar(a)); }
  for (const p of pedidos) {
    if (resultado.has(p.id) || !p.texto) continue;
    const t = ` ${semAcento(p.texto)} `;
    const a = livres.find((x) => x.termos?.some((termo) => t.includes(termo)));
    if (a) resultado.set(p.id, tirar(a));
  }
  for (const p of pedidos) if (p.papel === 'livre' && !resultado.has(p.id)) { const a = porPapel('livre'); if (a) resultado.set(p.id, tirar(a)); }
  for (const p of pedidos) {
    if (resultado.has(p.id)) continue;
    const a = livres.find((x) => !x.papel) || livres[0];
    if (a) resultado.set(p.id, tirar(a));
  }
  return resultado;
}
