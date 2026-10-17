// Disciplinas em ação (rodada 19): os poderes que funcionam na cena, sem dados. Cada uso fica anotado
// no plano ("usou Sentidos Aguçados (Despertar)") para o Narrador rolar o Despertar no fechamento.
// Só aparecem os poderes que o personagem tem (a ficha já guarda os poderes pelo nível).

// quando: 'sempre' (na cena) ou 'caca' (só durante a caçada na hora). dur: segundos de efeito.
export const PODERES_DA_CENA = [
  { id: 'sentidos-agucados', disc: 'auspicios', quando: 'sempre', dur: 10, efeito: 'A pintura escurece, os rastros aparecem e os sons distantes ficam mais altos.' },
  { id: 'perscrutar-alma', disc: 'auspicios', quando: 'sempre', dur: 12, efeito: 'Cada pessoa ganha um halo da cor do que sente.' },
  { id: 'manto-sombras', disc: 'ofuscacao', quando: 'caca', efeito: 'Parado, você some da vista de todos.' },
  { id: 'silencio-morte', disc: 'ofuscacao', quando: 'caca', efeito: 'Seus passos não fazem barulho, nem correndo.' },
  { id: 'passagem-invisivel', disc: 'ofuscacao', quando: 'caca', dur: 8, efeito: 'Por alguns segundos, ninguém vê você, nem andando.' },
  { id: 'ligeireza', disc: 'rapidez', quando: 'caca', efeito: 'Você corre muito mais rápido.' },
  { id: 'piscar', disc: 'rapidez', quando: 'caca', efeito: 'Num piscar de olhos, você atravessa um trecho curto.' },
  { id: 'assombro', disc: 'presenca', quando: 'caca', efeito: 'Na conversa ou de frente, uma escolha a mais: a presa fica encantada com você.' },
  { id: 'intimidar', disc: 'presenca', quando: 'caca', efeito: 'Na conversa ou de frente, uma escolha a mais: a presa congela de medo.' },
  { id: 'nublar-memoria', disc: 'dominacao', quando: 'caca', efeito: 'No fim da caçada, quem viu você esquece.' },
];

// Temperamentos (Ressonância do sangue) para Perscrutar a Alma, com a cor do halo.
export const TEMPERAMENTOS = {
  colerico: { nome: 'colérica', cor: '255, 70, 60' },
  sanguineo: { nome: 'sanguínea', cor: '255, 180, 70' },
  melancolico: { nome: 'melancólica', cor: '90, 140, 255' },
  fleumatico: { nome: 'fleumática', cor: '140, 180, 160' },
};
const LISTA_T = Object.keys(TEMPERAMENTOS);
export function temperamentoDe(id) {
  const n = [...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0);
  return LISTA_T[n % LISTA_T.length];
}

export const AVISO_DESPERTAR = 'Usar o sangue pede um teste de Despertar quando a noite fechar: a Fome pode subir. Este aviso só aparece no primeiro uso da noite.';
