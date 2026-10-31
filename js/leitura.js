// Opções de leitura, guardadas no aparelho: tamanho do texto, velocidade das palavras e cerimônias
// completas ou curtas. Valem na hora (classes e variáveis no body) e depois de recarregar.

const CHAVE = 'mascara.leitura';
const PADRAO = { tamanho: 'normal', ritmo: 34, cerimonias: 'completas' };

export const TAMANHOS = { normal: 1, grande: 1.15, 'muito-grande': 1.3 };
export const RITMOS = { lenta: 55, normal: 34, rapida: 15, instantanea: 0 };

export function lerLeitura() {
  try { return { ...PADRAO, ...(JSON.parse(localStorage.getItem(CHAVE)) || {}) }; } catch { return { ...PADRAO }; }
}

export function aplicarLeitura(prefs = lerLeitura()) {
  document.body.style.setProperty('--escala-texto', String(TAMANHOS[prefs.tamanho] || 1));
  document.body.classList.toggle('cerimonias-curtas', prefs.cerimonias === 'curtas');
}

export function gravarLeitura(mudanca) {
  const prefs = { ...lerLeitura(), ...mudanca };
  try { localStorage.setItem(CHAVE, JSON.stringify(prefs)); } catch { /* sem armazenamento */ }
  aplicarLeitura(prefs);
  return prefs;
}

// Milissegundos entre uma palavra e a seguinte (0 = o parágrafo aparece inteiro de uma vez).
export function ritmoDasPalavras() {
  const r = Number(lerLeitura().ritmo);
  return Number.isFinite(r) ? r : 34;
}

// Vitrine: &movimento liga as animações mesmo com "menos movimento" no sistema, para a avaliação conferir quadro a
// quadro (&movimento=0 desliga). Fica guardado na aba, porque a vitrine apaga os parâmetros do endereço. A classe do
// body desliga as regras de prefers-reduced-motion do CSS.
function lerMovimento() {
  const m = location.hash.match(/[?&]movimento(=0)?(?=$|&)/);
  try {
    if (m) sessionStorage.setItem('mascara.movimento', m[1] ? '0' : '1');
    return sessionStorage.getItem('mascara.movimento') === '1';
  } catch { return !!m && !m[1]; }
}
function aplicarMovimento() { document.body?.classList.toggle('movimento-forcado', lerMovimento()); }
aplicarMovimento();
window.addEventListener('hashchange', aplicarMovimento);

// Cerimônias curtas: pedido do sistema (menos movimento) ou escolha do jogador.
export function cerimoniasCurtas() {
  if (document.body.classList.contains('movimento-forcado')) return false;
  return document.body.classList.contains('cerimonias-curtas') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
