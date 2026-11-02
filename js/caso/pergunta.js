// A pergunta às testemunhas: descreve quem o jogador procura, só com os traços que ele já sabe ao certo.
// Cópia de PERGUNTA_TRACO e perguntaPor() de js/carmen/textos.js (do Replanejamento), que não vai ao site.
// Mudou lá, muda aqui.
//
// conhecidos: os traços conquistados ('categoria=valor', como em estado.tracos do banco). As indiretas só entram
// depois que a Xerife lê a pista, então a pergunta nunca entrega um traço. O clã fica de fora: ninguém pergunta
// a um mortal pelo clã de um vampiro. Cada trecho completa "alguém ...", sem supor o gênero.
const PERGUNTA_TRACO = {
  aparencia: {
    'cabelo-branco': 'de cabelo branco bem rente',
    ruivo: 'de cabeleira ruiva presa num lenço',
    trancas: 'de tranças compridas com fios dourados',
    'careca-oculos': 'de cabeça raspada e óculos redondos',
    'muito-alto': 'muito alto',
    miudo: 'bem miúdo',
  },
  sinal: {
    'dedo-faltando': 'sem a ponta de um dedo',
    'brinco-perola': 'com um brinco de pérola numa orelha só',
    ancora: 'com uma âncora tatuada no pulso',
    cicatriz: 'com uma cicatriz na sobrancelha',
    'anel-serpente': 'com um anel de serpente',
    medalha: 'com uma medalha de São Jorge no pescoço',
  },
  habito: {
    'rola-moeda': 'que rola uma moeda entre os dedos',
    jasmim: 'que cheira um raminho de jasmim',
    barquinho: 'que dobra guardanapos em barquinhos',
    baralho: 'que embaralha um baralho velho',
    caderninho: 'que anota tudo num caderninho',
    assobia: 'que assobia um samba antigo',
  },
  veiculo: {
    taxi: 'de táxi',
    bicicleta: 'numa bicicleta de carga',
    'moto-vermelha': 'numa moto vermelha',
    'sedan-preto': 'num sedã preto de vidros escuros',
    'kombi-azul': 'numa Kombi azul',
    caminhonete: 'numa caminhonete de feira',
  },
};

const PERGUNTA = 'Você pergunta se alguém viu passar a pessoa que você procura.';

// O rótulo dos tópicos "viu" e "nada" (o mesmo de ferramentas/carmen-para-banco.mjs).
export const ROTULO_PERGUNTA = 'Perguntar por quem você procura';

export function perguntaPor(conhecidos = []) {
  const t = Object.fromEntries(conhecidos.map((x) => x.split('=')));
  const de = (cat) => (t[cat] ? PERGUNTA_TRACO[cat][t[cat]] : null);
  const partes = ['aparencia', 'sinal', 'habito'].map(de).filter(Boolean);
  const veiculo = de('veiculo');
  if (!partes.length && !veiculo) return PERGUNTA;
  const corpo = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : partes[0];
  return `Você pergunta se passou por aqui alguém ${[corpo, veiculo].filter(Boolean).join(', ')}.`;
}
