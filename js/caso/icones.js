// Ícones do Carmen 2026 (guia visual, seção 4.3): um conjunto só, 24 × 24, traço de 1,75 px e cantos redondos,
// na cor do texto (currentColor). Nada de emoji: o "✈", o "✓" e o "●" viram estes ícones.
const D = {
  aviao: '<path d="M10.5 21h3l1-6.5L21 12v-2l-6.5 1L14 4.5a2 2 0 0 0-4 0L9.5 11 3 10v2l6.5 2.5z"/>',
  carro: '<path d="M5 16V12l2-5h10l2 5v4"/><path d="M3 16h18v2H3z"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/><path d="M5 12h14"/>',
  barca: '<path d="M3 15h18l-2.5 4h-13z"/><path d="M6 15V9h9l3 6"/><path d="M9 9V6h4v3"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  seta: '<path d="M5 12h13"/><path d="m13 6 6 6-6 6"/>',
  digital: '<path d="M7 18c-1.5-2-2-4-2-6a7 7 0 0 1 12.5-4.3"/><path d="M9.5 20c-1-1.8-1.5-3.8-1.5-6a4 4 0 0 1 8 0c0 1.5.2 3 .7 4.5"/><path d="M12 14c0 2.5.6 4.8 1.6 6.6"/><path d="M19 11.5c.3 1 .4 2 .3 3"/>',
  olho: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  carimbo: '<path d="M9 13V9.5a3 3 0 1 1 6 0V13"/><path d="M5 13h14v4H5z"/><path d="M5 20h14"/>',
  trofeu: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20h7M10 17h4"/>',
  estrela: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  feito: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  aqui: '<circle cx="12" cy="12" r="4" fill="currentColor"/><circle cx="12" cy="12" r="8.5"/>',
  lupa: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/>',
  mapa: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
  arquivo: '<path d="M4 7h16v13H4z"/><path d="M4 7l2-3h12l2 3"/><path d="M10 11h4"/>',
  // Os tipos de traço do Arquivo (guia, 5.2): rosto, marca, mão, roda e máscara (clã); e o cadeado da lacuna sem pista.
  rosto: '<circle cx="12" cy="9" r="4.5"/><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
  marca: '<path d="M12 3.5 14 9l5.5.5-4.2 3.6 1.3 5.4L12 15.6l-4.6 2.9 1.3-5.4L4.5 9.5 10 9z"/>',
  mao: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 11.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5a5.5 5.5 0 0 1-4.6-2.5L3.5 14a1.6 1.6 0 0 1 2.6-1.8L8 14.5"/>',
  roda: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3.5v6M12 14.5v6M3.5 12h6M14.5 12h6"/>',
  mascara: '<path d="M3 8c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0 0 6-3 10-6 10-1.6 0-2.4-1.5-3-3-.6 1.5-1.4 3-3 3-3 0-6-4-6-10z"/><path d="M7 11.5h2.5M14.5 11.5H17"/>',
  cadeado: '<rect x="5" y="11" width="14" height="9.5" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};

export const NOMES_ICONES = Object.keys(D);

// icone('aviao') devolve o SVG; no SVG do mapa, icone('aviao', { svg: true, x, y, tam }) devolve um <g>.
export function icone(nome, { classe = '', svg = false, x = 0, y = 0, tam = 24, rotulo = '' } = {}) {
  const corpo = D[nome] || '';
  const tracos = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
  if (svg) return `<g class="icone icone-${nome} ${classe}" transform="translate(${x - tam / 2} ${y - tam / 2}) scale(${tam / 24})" ${tracos}>${corpo}</g>`;
  const aria = rotulo ? `role="img" aria-label="${rotulo}"` : 'aria-hidden="true"';
  return `<svg class="icone icone-${nome} ${classe}" viewBox="0 0 24 24" width="${tam}" height="${tam}" ${aria} ${tracos}>${corpo}</svg>`;
}
