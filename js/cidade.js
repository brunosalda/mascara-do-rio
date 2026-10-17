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

// Lugares que ainda não estão no mapa do jogo (o aeroporto e São Paulo, fase 3.2): só abrem na
// demonstração da vista do alto (#/demo/cena?depurar&lugar=<id>-alto). Sem termos, para o texto do
// Narrador nunca cair neles por engano.
export const LOCAIS_EXTRA = [
  { id: 'aeroporto-rio', cidade: 'rio', nome: 'Aeroporto Santos Dumont', em: 'no aeroporto', a: 'ao aeroporto', imagem: 'img/cidade/alto/aeroporto-rio.jpg', termos: [] },
  { id: 'se', cidade: 'sp', nome: 'Praça da Sé', em: 'na Praça da Sé', a: 'à Praça da Sé', imagem: 'img/cidade/alto/se.jpg', termos: [] },
  { id: 'centro-sp', cidade: 'sp', nome: 'Vale do Anhangabaú', em: 'no Vale do Anhangabaú', a: 'ao Vale do Anhangabaú', imagem: 'img/cidade/alto/centro-sp.jpg', termos: [] },
  { id: 'paulista', cidade: 'sp', nome: 'Avenida Paulista', em: 'na Paulista', a: 'à Paulista', imagem: 'img/cidade/alto/paulista.jpg', termos: [] },
  { id: 'liberdade', cidade: 'sp', nome: 'Liberdade', em: 'na Liberdade', a: 'à Liberdade', imagem: 'img/cidade/alto/liberdade.jpg', termos: [] },
  { id: 'augusta', cidade: 'sp', nome: 'Rua Augusta', em: 'na Augusta', a: 'à Augusta', imagem: 'img/cidade/alto/augusta.jpg', termos: [] },
];

// Retratos que representam cada clã (Higgsfield, 17/10/2026), em img/clas/<id>.jpg.
const CLAS_COM_IMAGEM = new Set([
  'brujah', 'gangrel', 'malkaviano', 'nosferatu', 'toreador', 'tremere', 'ventrue', 'banu-haqim',
  'hecata', 'lasombra', 'ministerio', 'ravnos', 'salubri', 'tzimisce', 'caitiff', 'sangue-fraco',
]);

export function imagemDoCla(id) {
  return CLAS_COM_IMAGEM.has(id) ? `img/clas/${id}.jpg` : RETRATO_PADRAO;
}

// Retrato provisório, até o Narrador pintar o do personagem: um recorte da pintura da Lapa (um
// passante de costas contra a luz, sem rosto e sem gênero), escurecido e tingido na cor do clã, com
// vinheta e o selo do clã. Gerado sem crédito a partir de img/cidade/lapa.jpg, em img/retratos/.
// A pintura do clã fica só na escolha do clã.
export function retratoProvisorio(claId) {
  return `img/retratos/provisorio-${COR_CLA[claId] ? claId : 'sem-cla'}.jpg`;
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
