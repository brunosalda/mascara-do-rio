// Silhueta do personagem: casaco longo, contorno na cor do clã, olhos que brilham.
// As pernas e os braços balançam quando o personagem anda (classe .andando no pai).

export const COR_CLA = {
  brujah: '#e2573a', gangrel: '#9bbf5a', malkaviano: '#9f7fe0', nosferatu: '#6fa58f', toreador: '#e86a9e',
  tremere: '#c23b52', ventrue: '#5f8fe0', 'banu-haqim': '#d9b44a', hecata: '#b8c4c8', lasombra: '#7a5ccf',
  ministerio: '#e0a03a', ravnos: '#4fc7c0', salubri: '#f0e6c8', tzimisce: '#b05a8a', caitiff: '#a39a8c', 'sangue-fraco': '#ff6b5a',
};

// Sombra pintada: a folha de caminhada em vídeo (perfil, frente, costas e respiração) escurecida até
// virar sombra, para quem ainda não tem caminhada própria (a ficha não foi ativada). A cena acende o
// contorno na cor do clã. Gerada sem crédito a partir da primeira folha de vídeo do jogo.
export const SOMBRA_GENERICA = {
  url: 'img/sprites/sombra-perfil.png', quadros: 10, largura: 154, altura: 300, parado: 5,
  frente: { url: 'img/sprites/sombra-frente.png', quadros: 10, largura: 112, altura: 300, parado: 4 },
  costas: { url: 'img/sprites/sombra-costas.png', quadros: 10, largura: 110, altura: 300, parado: 1 },
  respira: { url: 'img/sprites/sombra-respira.png', quadros: 8, largura: 78, altura: 300 },
};

// Silhueta vetorial: só de reserva, se nenhuma folha carregar.
export function silhueta(cla) {
  const cor = COR_CLA[cla] || '#e2703e';
  return `
    <svg class="silhueta" viewBox="0 0 80 200" aria-hidden="true" style="--cor-cla:${cor}">
      <ellipse class="sombra" cx="40" cy="194" rx="26" ry="5"/>
      <g class="corpo">
        <g class="perna perna-esq"><path d="M33 128 L30 186 L38 188 L40 130 Z"/><path class="sapato" d="M28 184 h12 v5 h-14 z"/></g>
        <g class="perna perna-dir"><path d="M40 130 L42 188 L50 186 L47 128 Z"/><path class="sapato" d="M40 184 h12 v5 h-12 z"/></g>
        <path class="casaco" d="M24 56 Q40 46 56 56 L62 138 Q40 146 18 138 Z"/>
        <g class="braco braco-esq"><path d="M25 60 Q17 92 21 122 L27 122 Q27 94 31 66 Z"/></g>
        <g class="braco braco-dir"><path d="M55 60 Q63 92 59 122 L53 122 Q53 94 49 66 Z"/></g>
        <path class="gola" d="M30 54 L40 70 L50 54 Q40 48 30 54 Z"/>
        <ellipse class="cabeca" cx="40" cy="38" rx="11" ry="13"/>
        <path class="cabelo" d="M29 36 Q30 22 40 22 Q51 22 51 35 Q46 28 40 29 Q33 29 29 36 Z"/>
        <circle class="olho" cx="36" cy="38" r="1.3"/><circle class="olho" cx="44" cy="38" r="1.3"/>
      </g>
    </svg>`;
}
