// Lugares do Rio e as imagens de fundo de cada um.
// Pinturas geradas no Higgsfield (gpt_image_2_5) em 17/10/2026. Um lugar sem pintura
// própria (imagem: null) usa o cenário padrão desenhado em código.

import { COR_CLA } from './jogo/silhueta.js';

export const CENARIO_PADRAO = 'img/cidade/rio-noite.svg';
export const CENARIO_ABERTURA = 'img/cidade/lapa.jpg'; // tela de entrada e criação de personagem
export const RETRATO_PADRAO = 'img/retrato-padrao.svg';

export const LOCAIS = [
  { id: 'lapa', nome: 'Lapa', em: 'na Lapa', a: 'à Lapa', imagem: 'img/cidade/lapa.jpg', termos: ['lapa', 'arcos', 'mem de sa', 'lavradio', 'selaron', 'riachuelo'] },
  { id: 'centro', nome: 'Centro', em: 'no Centro', a: 'ao Centro', imagem: 'img/cidade/centro.jpg', termos: ['centro', 'cinelandia', 'theatro municipal', 'teatro municipal', 'praca xv', 'candelaria', 'saara', 'central do brasil'] },
  { id: 'santa-teresa', nome: 'Santa Teresa', em: 'em Santa Teresa', a: 'a Santa Teresa', imagem: 'img/cidade/santa-teresa.jpg', termos: ['santa teresa', 'bondinho', 'largo dos guimaraes'] },
  { id: 'zona-sul', nome: 'Zona Sul', em: 'na Zona Sul', a: 'à Zona Sul', imagem: 'img/cidade/zona-sul.jpg', termos: ['copacabana', 'ipanema', 'leblon', 'botafogo', 'flamengo', 'urca', 'leme', 'lagoa', 'gavea', 'zona sul'] },
  { id: 'barra', nome: 'Barra', em: 'na Barra', a: 'à Barra', imagem: 'img/cidade/barra.jpg', termos: ['barra', 'recreio', 'jacarepagua'] },
  { id: 'zona-norte', nome: 'Zona Norte', em: 'na Zona Norte', a: 'à Zona Norte', imagem: 'img/cidade/zona-norte.jpg', termos: ['tijuca', 'madureira', 'maracana', 'meier', 'vila isabel', 'penha', 'zona norte'] },
  { id: 'morro', nome: 'Morro', em: 'no morro', a: 'ao morro', imagem: 'img/cidade/morro.jpg', termos: ['morro', 'favela', 'comunidade', 'rocinha', 'vidigal', 'alemao', 'mare'] },
  { id: 'cemiterio', nome: 'Cemitério', em: 'no cemitério', a: 'ao cemitério', imagem: 'img/cidade/cemiterio.jpg', termos: ['cemiterio', 'sao joao batista', 'caju'] },
  { id: 'porto', nome: 'Zona Portuária', em: 'na Zona Portuária', a: 'à Zona Portuária', imagem: 'img/cidade/porto.jpg', termos: ['porto', 'gamboa', 'saude', 'museu do amanha', 'praca maua', 'pequena africa'] },
  { id: 'baixada', nome: 'Baixada', em: 'na Baixada', a: 'à Baixada', imagem: 'img/cidade/baixada.jpg', termos: ['baixada', 'nova iguacu', 'duque de caxias', 'sao joao de meriti'] },
  { id: 'niteroi', nome: 'Niterói', em: 'em Niterói', a: 'a Niterói', imagem: 'img/cidade/niteroi.jpg', termos: ['niteroi', 'icarai', 'mac'] },
];

// Retratos que representam cada clã (Higgsfield, 17/10/2026), em img/clas/<id>.jpg.
const CLAS_COM_IMAGEM = new Set([
  'brujah', 'gangrel', 'malkaviano', 'nosferatu', 'toreador', 'tremere', 'ventrue', 'banu-haqim',
  'hecata', 'lasombra', 'ministerio', 'ravnos', 'salubri', 'tzimisce', 'caitiff', 'sangue-fraco',
]);

export function imagemDoCla(id) {
  return CLAS_COM_IMAGEM.has(id) ? `img/clas/${id}.jpg` : RETRATO_PADRAO;
}

// Retrato provisório, até o Narrador pintar o do personagem: uma silhueta neutra (sem gênero) com o
// contorno na cor do clã e o símbolo do clã (as iniciais num selo). A pintura do clã fica só na escolha do clã.
const SILHUETA_RETRATO = 'M150 70C190 70 214 102 212 146C210 186 192 214 172 226L178 252C226 262 266 288 282 340L292 375L8 375L18 340C34 288 74 262 122 252L128 226C108 214 90 186 88 146C86 102 110 70 150 70Z';
const provisorios = new Map();
export function retratoProvisorio(claId) {
  const chave = claId || '';
  if (provisorios.has(chave)) return provisorios.get(chave);
  const cor = COR_CLA[claId] || '#a39a8c';
  const nome = { 'banu-haqim': 'BH', 'sangue-fraco': 'SF', ministerio: 'M', malkaviano: 'M' }[claId] || (claId || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 375" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="l" cx="50%" cy="36%" r="72%"><stop offset="0" stop-color="${cor}" stop-opacity=".5"/><stop offset=".5" stop-color="${cor}" stop-opacity=".14"/><stop offset="1" stop-color="#07090b" stop-opacity="0"/></radialGradient></defs>
<rect width="300" height="375" fill="#0b0e11"/><rect width="300" height="375" fill="url(#l)"/>
<path d="${SILHUETA_RETRATO}" fill="#07090b" stroke="${cor}" stroke-opacity=".8" stroke-width="3"/>
<path d="M128 150h14M158 150h14" stroke="#d8213d" stroke-width="3" stroke-linecap="round" opacity=".8"/>
<g transform="translate(150 318)"><circle r="30" fill="#07090b" stroke="${cor}" stroke-width="2.5"/><circle r="24" fill="none" stroke="${cor}" stroke-opacity=".4"/><text y="${nome.length > 1 ? 7 : 9}" text-anchor="middle" font-family="Georgia,serif" font-size="${nome.length > 1 ? 19 : 26}" fill="${cor}">${nome}</text></g>
</svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  provisorios.set(chave, url);
  return url;
}

// O retrato do personagem: o pintado pelo Narrador, se houver; senão, o provisório.
export function retratoDe(p) {
  return typeof p?.retrato === 'string' && /^https:\/\//.test(p.retrato) ? p.retrato : retratoProvisorio(p?.ficha?.cla);
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
