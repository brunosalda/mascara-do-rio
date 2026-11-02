// A pergunta às testemunhas: descreve quem o jogador procura, só com os traços que ele já sabe ao certo.
// Cópia de PERGUNTA_TRACO, PERGUNTA_PRETEXTOS, PERGUNTA_CLA e perguntaPor() de js/carmen/textos.js (do
// Replanejamento), que não vai ao site. Mudou lá, muda aqui.
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

// A pergunta conforme quem ouve. Ao mortal, o jogador dá um pretexto, sempre o mesmo para a mesma testemunha.
// Ao carniçal, fala baixo, de alguém da noite. Ao vampiro, pede licença em nome da Xerife. Os dois últimos
// sabem de clã, então a pergunta pode dizer o clã já conhecido.
const PERGUNTA_PRETEXTOS = [
  'Você diz que a família está preocupada',
  'Você mostra um documento achado na rua, diz que quer devolver',
  'Você diz que tem uma entrega sem endereço',
  'Você conta que levou um bolo num encontro marcado pelo aplicativo',
  'Você mostra um crachá de seguradora que ninguém confere',
];
const PERGUNTA_CLA = {
  ravnos: 'do clã Ravnos',
  toreador: 'do clã Toreador',
  nosferatu: 'do clã Nosferatu',
  'banu-haqim': 'do clã Banu Haqim',
  brujah: 'do clã Brujah',
  malkaviano: 'do clã Malkaviano',
  lasombra: 'do clã Lasombra',
  'sangue-fraco': 'de sangue fraco',
  ministerio: 'do Ministério',
  hecata: 'do clã Hecata',
};
const somaDoId = (id) => [...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0);

// O rótulo dos tópicos "viu" e "nada" (o mesmo de ferramentas/carmen-para-banco.mjs).
export const ROTULO_PERGUNTA = 'Perguntar por quem você procura';

// quem: { pessoa, id } da testemunha (pessoa = mortal, carnical ou vampiro; id como no gerador, sem o lugar).
// Sem quem, a pergunta é a neutra, igual para todos.
export function perguntaPor(conhecidos = [], quem = null) {
  const t = Array.isArray(conhecidos) ? Object.fromEntries(conhecidos.map((x) => x.split('='))) : conhecidos;
  const de = (cat) => (t[cat] ? PERGUNTA_TRACO[cat][t[cat]] : null);
  const partes = ['aparencia', 'sinal', 'habito'].map(de).filter(Boolean);
  const veiculo = de('veiculo');
  const sabeCla = quem && quem.pessoa !== 'mortal' && t.cla ? PERGUNTA_CLA[t.cla] : null;
  if (!partes.length && !veiculo && !sabeCla) return PERGUNTA;
  const corpo = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : partes[0];
  const descricao = [corpo, veiculo].filter(Boolean).join(', ');
  if (!quem?.pessoa) return `Você pergunta se passou por aqui alguém ${descricao}.`;
  if (quem.pessoa === 'vampiro') {
    return `Você pede licença em nome da Xerife e pergunta se passou pelo domínio alguém ${[sabeCla, descricao].filter(Boolean).join(', ')}.`;
  }
  if (quem.pessoa === 'carnical') {
    return `Você baixa a voz, como se fala com quem serve a um vampiro, e pergunta se passou por aqui alguém ${[sabeCla || 'da noite', descricao].filter(Boolean).join(', ')}.`;
  }
  const pretexto = PERGUNTA_PRETEXTOS[somaDoId(quem.id) % PERGUNTA_PRETEXTOS.length];
  return `${pretexto} e pergunta se passou por aqui alguém ${descricao}.`;
}
