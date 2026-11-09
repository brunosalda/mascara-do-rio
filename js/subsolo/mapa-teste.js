// Mapa inventado da fatia de teste do Subsolo: galeria de 10 × 10, sem relação com nenhum capítulo.
// # parede · . pedra · = trilho de bonde · ~ água parada · S início · F alçapão de saída
export const MAPA_TESTE = {
  linhas: [
    '##########',
    '#S.==.==.#',
    '###.####.#',
    '#...#~~~.#',
    '#.#.#~#.##',
    '#.#...#..#',
    '#.#.###.##',
    '#...#....#',
    '####..F..#',
    '##########',
  ],
  direcao: 1,
  // Postes de luz de sódio presos ao teto.
  luzes: [{ x: 5, y: 1 }, { x: 8, y: 3 }, { x: 3, y: 5 }, { x: 7, y: 7 }],
  // Quem faz ronda: dir é para onde olha ao começar; rota são os pontos da volta.
  inimigos: [
    { id: 'ronda-galeria', x: 7, y: 1, dir: 3, rota: [{ x: 5, y: 1 }, { x: 8, y: 1 }, { x: 8, y: 3 }, { x: 8, y: 1 }] },
    { id: 'ronda-oeste', x: 1, y: 5, dir: 0, rota: [{ x: 1, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 7 }, { x: 1, y: 7 }] },
  ],
};
