// Caçada na hora (rodada 18): textos e regras do minijogo, sem dados. O minijogo monta o texto da
// caçada do plano (a presa, a abordagem e como foi); o Narrador continua rolando no fechamento.
// Textos genéricos, sem nada da crônica.

// Presas genéricas: uma linha cada. "vulneravel" faz a voz de HUMANIDADE comentar (sem efeito na regra).
export const PRESAS = [
  { id: 'ponto', rotulo: 'um homem sozinho no ponto de ônibus' },
  { id: 'casal', rotulo: 'um casal saindo de um bar' },
  { id: 'marquise', rotulo: 'alguém dormindo sob a marquise', vulneravel: 'Ele não tem para onde ir.' },
  { id: 'entregador', rotulo: 'um entregador encostado na moto' },
  { id: 'celular', rotulo: 'uma mulher discutindo ao celular' },
  { id: 'bebado', rotulo: 'um rapaz bêbado procurando o caminho de casa', vulneravel: 'Ele mal fica de pé.' },
  { id: 'turista', rotulo: 'um turista perdido com o mapa no celular' },
];

// Três presas para este lugar e esta noite, presas a âncoras diferentes (sorteio fixo pela noite).
export function presasDoLugar(geo, noite = 0) {
  const ancoras = Object.entries(geo.ancoras).filter(([, a]) => a.papel !== 'memoria');
  const semente = (noite || 0) * 31 + ancoras.length;
  const ordem = (lista, s) => lista.map((x, i) => [x, Math.sin(s * 97 + i * 13.7) * 1000 % 1]).sort((a, b) => a[1] - b[1]).map(([x]) => x);
  const lugares = ordem(ancoras, semente).slice(0, 3);
  const quem = ordem(PRESAS, semente + 5).slice(0, lugares.length);
  return lugares.map(([nome, a], i) => ({
    ...quem[i], id: `presa-${quem[i].id}`, ancora: nome,
    x: a.x, y: a.y, parada: a.parada, lado: a.lado,
  }));
}

export const ABORDAGENS = {
  sombra: {
    nome: 'Pela sombra',
    explica: 'Chegue até a presa pelo escuro. Na luz, a rua repara em você; correndo, faz barulho.',
    texto: 'emboscando pelo escuro',
    curto: 'emboscada pela sombra',
  },
  conversa: {
    nome: 'Pela conversa',
    explica: 'Puxe conversa e leve a presa para um canto. Duas escolhas rápidas, sem parar de andar.',
    texto: 'levando na conversa para um canto',
    curto: 'na conversa',
  },
  frente: {
    nome: 'De frente',
    explica: 'Chegue perto e diga a frase certa para ninguém gritar. Se demorar, a rua repara.',
    texto: 'abordando de frente',
    curto: 'de frente',
  },
};

// O jeito do tipo de predador vem primeiro (os outros continuam possíveis).
const JEITO = {
  'gato-de-beco': 'sombra', sonambulo: 'sombra', ensacador: 'frente', sanguessuga: 'frente', cutelo: 'conversa',
  consensual: 'conversa', fazendeiro: 'sombra', osiris: 'conversa', 'rainha-da-cena': 'conversa', sereia: 'conversa',
};
export function abordagensPara(predadorId) {
  const primeira = JEITO[predadorId] || 'sombra';
  return [primeira, ...Object.keys(ABORDAGENS).filter((k) => k !== primeira)];
}

// Conversa: duas escolhas rápidas. A primeira de cada par funciona melhor; demorar também conta.
export const PERGUNTAS_CONVERSA = [
  { texto: 'Como puxar assunto?', opcoes: ['Perguntar as horas, com um sorriso', 'Chegar perto demais, calado'] },
  { texto: 'Para onde levar?', opcoes: ['Um canto escuro, "para fugir da chuva"', 'Direto para o beco'] },
];

// Frase certa na abordagem de frente.
export const FRASES_FRENTE = { texto: 'O que dizer?', opcoes: ['"Fica calmo. Isso não vai doer."', '"Passa o celular!"'] };

export function atencaoEmPalavras(a) {
  if (a < 0.34) return 'ninguém reparou';
  if (a < 0.67) return 'alguém olhou';
  return 'você foi visto';
}

// O texto da caçada para o plano e a linha curta do quadro.
export function textoDaCacada({ presa, abordagem, atencao, deuCerto, onde, vantagem, extras = [] }) {
  const a = ABORDAGENS[abordagem];
  const rua = atencaoEmPalavras(atencao).replace('você foi visto', 'foi visto');
  const juntos = extras.join('; ');
  const nota = `${juntos ? ` ${juntos.charAt(0).toUpperCase()}${juntos.slice(1)}.` : ''}${vantagem ? ` [vantagem: ${vantagem}]` : ''}`;
  const texto = deuCerto
    ? `Caçou ${presa.rotulo} ${onde}, ${a.texto}; ${rua}.${nota}`
    : `Tentou caçar ${presa.rotulo} ${onde}, ${a.texto}, mas a presa escapou antes; ${rua}.${nota}`;
  const curto = `${a.curto} · ${rua}`;
  return { texto, curto };
}
