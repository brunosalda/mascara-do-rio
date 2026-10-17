// Lugares do Rio e as imagens de fundo de cada um.
// Pinturas geradas no Higgsfield (gpt_image_2_5) em 17/10/2026. Um lugar sem pintura
// própria (imagem: null) usa o cenário padrão desenhado em código.

export const CENARIO_PADRAO = 'img/cidade/rio-noite.svg';
export const CENARIO_ABERTURA = 'img/cidade/lapa.jpg'; // tela de entrada e criação de personagem
export const RETRATO_PADRAO = 'img/retrato-padrao.svg';

export const LOCAIS = [
  { id: 'lapa', nome: 'Lapa', imagem: 'img/cidade/lapa.jpg', termos: ['lapa', 'arcos', 'mem de sa', 'lavradio', 'selaron', 'riachuelo'] },
  { id: 'centro', nome: 'Centro', imagem: 'img/cidade/centro.jpg', termos: ['centro', 'cinelandia', 'theatro municipal', 'teatro municipal', 'praca xv', 'candelaria', 'saara', 'central do brasil'] },
  { id: 'santa-teresa', nome: 'Santa Teresa', imagem: 'img/cidade/santa-teresa.jpg', termos: ['santa teresa', 'bondinho', 'largo dos guimaraes'] },
  { id: 'zona-sul', nome: 'Zona Sul', imagem: 'img/cidade/zona-sul.jpg', termos: ['copacabana', 'ipanema', 'leblon', 'botafogo', 'flamengo', 'urca', 'leme', 'lagoa', 'gavea', 'zona sul'] },
  { id: 'barra', nome: 'Barra', imagem: 'img/cidade/barra.jpg', termos: ['barra', 'recreio', 'jacarepagua'] },
  { id: 'zona-norte', nome: 'Zona Norte', imagem: 'img/cidade/zona-norte.jpg', termos: ['tijuca', 'madureira', 'maracana', 'meier', 'vila isabel', 'penha', 'zona norte'] },
  { id: 'morro', nome: 'Morro', imagem: 'img/cidade/morro.jpg', termos: ['morro', 'favela', 'comunidade', 'rocinha', 'vidigal', 'alemao', 'mare'] },
  { id: 'cemiterio', nome: 'Cemitério', imagem: 'img/cidade/cemiterio.jpg', termos: ['cemiterio', 'sao joao batista', 'caju'] },
  { id: 'porto', nome: 'Zona Portuária', imagem: 'img/cidade/porto.jpg', termos: ['porto', 'gamboa', 'saude', 'museu do amanha', 'praca maua', 'pequena africa'] },
  { id: 'baixada', nome: 'Baixada', imagem: 'img/cidade/baixada.jpg', termos: ['baixada', 'nova iguacu', 'duque de caxias', 'sao joao de meriti'] },
  { id: 'niteroi', nome: 'Niterói', imagem: 'img/cidade/niteroi.jpg', termos: ['niteroi', 'icarai', 'mac'] },
];

// Retratos que representam cada clã (Higgsfield, 17/10/2026), em img/clas/<id>.jpg.
const CLAS_COM_IMAGEM = new Set([
  'brujah', 'gangrel', 'malkaviano', 'nosferatu', 'toreador', 'tremere', 'ventrue', 'banu-haqim',
  'hecata', 'lasombra', 'ministerio', 'ravnos', 'salubri', 'tzimisce', 'caitiff', 'sangue-fraco',
]);

export function imagemDoCla(id) {
  return CLAS_COM_IMAGEM.has(id) ? `img/clas/${id}.jpg` : RETRATO_PADRAO;
}

const semAcento =(s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function localDe(texto) {
  const t = semAcento(texto);
  if (!t) return null;
  return LOCAIS.find((l) => l.termos.some((termo) => t.includes(termo))) || null;
}

export function imagemDoLocal(texto) {
  return localDe(texto)?.imagem || CENARIO_PADRAO;
}
