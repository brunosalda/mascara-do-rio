// Rodada 37: imagens mais leves. As pinturas vistas do alto existem em WebP grande (2688 px, telas largas)
// e pequeno (1344 px, celular), com o JPEG de 1344 px de reserva para quem não lê WebP. As figuras da
// gente vêm em WebP, com o PNG de reserva. O mapa pré-carrega a pintura do lugar sob o mouse ou o dedo.
const leWebp = (() => {
  try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch { return false; }
})();
const telaPequena = () => (typeof window !== 'undefined' ? window.innerWidth <= 900 : true);

export function pinturaLeve(url) {
  const m = String(url || '').match(/^(.*img\/cidade\/alto\/)([^/]+)\.jpg$/);
  if (!m || !leWebp) return url;
  return telaPequena() ? `${m[1]}p/${m[2]}.webp` : `${m[1]}${m[2]}.webp`;
}

export function figuraLeve(src) {
  return leWebp ? String(src).replace(/\.png$/, '.webp') : src;
}

const jaPedidas = new Set();
export function preCarregar(url) {
  const u = pinturaLeve(url);
  if (!u || jaPedidas.has(u)) return;
  jaPedidas.add(u);
  const img = new Image();
  img.decoding = 'async';
  img.src = u;
}
