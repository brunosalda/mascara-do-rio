// Rodada 40: a moldura de pedra e bronze da noite também nas telas de fora dela (entrada, criação e
// espera), para tudo parecer o mesmo jogo. Só desenho: não recebe cliques.
export const CANTO = '<svg viewBox="0 0 64 64" aria-hidden="true"><path class="placa" d="M4 36 L28 60 L4 84 L-20 60 Z"/><path class="placa-dentro" d="M4 47 L17 60 L4 73 L-9 60 Z"/><path class="galho" d="M4 60 C10 40 18 26 34 18 S56 8 60 4"/><path class="galho" d="M4 60 C22 54 36 46 46 30"/><path class="galho fino" d="M18 34 C24 30 28 24 26 16"/><path class="galho fino" d="M34 46 C40 44 46 40 50 34"/><path class="espinho" d="M30 21 l-5 -7 l8 4 z"/><path class="espinho" d="M42 34 l7 -2 l-4 6 z"/><circle class="no" cx="4" cy="60" r="3.2"/></svg>';

export function molduraTela() {
  return `<div class="moldura moldura-tela" aria-hidden="true"><span class="canto canto-se">${CANTO}</span><span class="canto canto-sd">${CANTO}</span><span class="canto canto-ie">${CANTO}</span><span class="canto canto-id">${CANTO}</span><span class="pedra-chave"><i></i></span></div>`;
}
