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
};
