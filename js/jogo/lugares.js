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
// luzes:     { x, y, cor, raio, forca } (raio em alturas da pintura).

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
      { x: 0.885, y: 0.45, cor: '#ff2c3c', raio: 0.24, forca: 1 },     // neon do bar
      { x: 0.836, y: 0.53, cor: '#ff5a2a', raio: 0.2, forca: 0.9 },    // salão do bar
      { x: 0.766, y: 0.433, cor: '#ffc46a', raio: 0.22, forca: 0.9 },  // poste
      { x: 0.196, y: 0.55, cor: '#ffb04a', raio: 0.2, forca: 0.8 },    // luminárias sob os arcos
      { x: 0.425, y: 0.58, cor: '#ffb04a', raio: 0.17, forca: 0.7 },
      { x: 0.535, y: 0.575, cor: '#ffb04a', raio: 0.15, forca: 0.6 },
      { x: 0.03, y: 0.54, cor: '#ff3a2a', raio: 0.16, forca: 0.7 },    // bar da esquerda
    ],
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
      { x: 0.125, y: 0.27, cor: '#ffc060', raio: 0.32, forca: 0.9 },   // lampião na parede
      { x: 0.275, y: 0.65, cor: '#fff0c0', raio: 0.16, forca: 0.9 },   // farol do bonde
      { x: 0.33, y: 0.5, cor: '#ffb050', raio: 0.26, forca: 0.8 },     // salão do bonde
      { x: 0.52, y: 0.665, cor: '#ffb050', raio: 0.1, forca: 0.6 },    // poste ao fundo
      { x: 0.575, y: 0.08, cor: '#cfe0ff', raio: 0.6, forca: 0.25 },   // lua
    ],
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
