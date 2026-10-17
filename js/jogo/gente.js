// Gente da área na vista do alto (Fase 2): figuras provisórias desenhadas aqui, até chegarem as figuras
// pintadas. Cada tipo tem um rótulo, uma fala curta, o que se repara nele e se pode virar presa.
// Nada da crônica: só gente comum da noite do Rio.

export const TIPOS_GENTE = {
  passante: {
    nome: 'Passante', rotulo: 'um passante com guarda-chuva', presa: true,
    falas: ['Vai cair um temporal, hein.', 'Sabe se o metrô ainda está aberto?', 'Desculpa, tô com pressa.'],
    repara: 'anda rápido e olha o celular a cada esquina',
  },
  ambulante: {
    nome: 'Ambulante', rotulo: 'um ambulante com o isopor', presa: true,
    falas: ['Cerveja, água, mate! Três por dez!', 'Movimento fraco hoje, chefe.', 'Quer uma? Tá trincando.'],
    repara: 'conta o dinheiro do dia e não larga o isopor',
  },
  bebado: {
    nome: 'Bêbado', rotulo: 'um rapaz bêbado procurando o caminho de casa', presa: true, vulneravel: 'Ele mal fica de pé.',
    falas: ['Ô, amigo... qual é a rua aqui?', 'Eu tô ótimo. Tô ótimo.', 'Cadê meu ônibus...'],
    repara: 'aceita ajuda de qualquer um',
  },
  seguranca: {
    nome: 'Segurança', rotulo: 'o segurança do bar', presa: false,
    falas: ['Aqui dentro só com pulseira.', 'Circulando, circulando.', 'Tá olhando o quê?'],
    repara: 'não tira os olhos da porta',
  },
  policial: {
    nome: 'Policial', rotulo: 'um policial fazendo a ronda', presa: false,
    falas: ['Boa noite. Tudo certo por aqui?', 'Documento, por favor.', 'Melhor ir para casa, cidadão.'],
    repara: 'fala no rádio de vez em quando',
  },
  turista: {
    nome: 'Turista', rotulo: 'uma turista perdida com o mapa no celular', presa: true,
    falas: ['Excuse me... Selarón?', 'Is this the right way?', 'Obrigada! Obrigada!'],
    repara: 'procura alguém que fale inglês',
  },
  entregador: {
    nome: 'Entregador', rotulo: 'um entregador encostado na moto', presa: true,
    falas: ['O pedido sumiu do aplicativo, acredita?', 'Chuva assim ninguém dá gorjeta.', 'Tá esperando alguém?'],
    repara: 'espera um pedido que não chega e está entediado',
  },
  celular: {
    nome: 'Mulher ao celular', rotulo: 'uma mulher discutindo ao celular', presa: true,
    falas: ['Não, escuta você agora!', 'Tô na Lapa, pô. Vem me buscar.', 'Desculpa, tô no telefone.'],
    repara: 'está com raiva de alguém e não presta atenção em volta',
  },
  garconete: {
    nome: 'Garçonete', rotulo: 'a garçonete do bar', presa: false,
    falas: ['Mesa pra um? Só lá dentro.', 'A cozinha já fechou, só bebida.', 'Vai querer alguma coisa?'],
    repara: 'conhece todo mundo que entra no bar',
  },
  idoso: {
    nome: 'Senhor no banco', rotulo: 'um senhor sozinho no banco da praça', presa: true, vulneravel: 'Ele só queria ver a noite passar.',
    falas: ['No meu tempo a Lapa era outra coisa.', 'Senta aí, moço. O banco é grande.', 'Essa chuva não para mais.'],
    repara: 'conta histórias para quem para do lado',
  },
};

// Figura provisória em SVG: corpo genérico mais um detalhe que diz o tipo (guarda-chuva, isopor,
// boné, garrafa). A cor do casaco muda por tipo; o contorno é claro para ler sobre o chão molhado.
const CORPO = '<ellipse cx="20" cy="12" rx="6.5" ry="7.5"/><path d="M11 22 Q20 17 29 22 L32 66 Q20 70 8 66 Z"/><path d="M14 64 L12 96 L18 96 L20 68 Z"/><path d="M26 64 L28 96 L22 96 L20 68 Z"/>';
const DETALHE = {
  passante: '<path class="acessorio" d="M2 14 Q20 -6 38 14 Z"/><path class="acessorio-linha" d="M20 6 L20 44"/>',
  ambulante: '<rect class="acessorio" x="24" y="40" width="16" height="13" rx="2"/>',
  bebado: '<path class="acessorio" d="M31 34 L35 30 L37 44 L33 46 Z"/>',
  seguranca: '<rect class="acessorio" x="12" y="2" width="16" height="5" rx="1"/>',
  policial: '<path class="acessorio" d="M11 6 Q20 -2 29 6 L30 9 L10 9 Z"/>',
  turista: '<rect class="acessorio" x="27" y="26" width="6" height="10" rx="1"/>',
};
export function figuraGente(tipo) {
  return `<svg viewBox="-4 -8 48 108" aria-hidden="true"><g class="corpo-gente">${CORPO}</g>${DETALHE[tipo] || ''}</svg>`;
}

// Figuras pintadas (etapa C), recortadas do fundo verde: img/gente/<nome>.png. Quando há figura, a
// pessoa fica parada (como na pintura), tingida pela luz do lugar e às vezes espelhada para variar.
export const FIGURAS_GENTE = {
  passante: ['passante-teste', 'passante-celular'],
  turista: ['mulher-guarda-chuva'],
  ambulante: ['ambulante'],
  bebado: ['bebado'],
  seguranca: ['seguranca'],
  policial: ['policial'],
  entregador: ['entregador'],
  celular: ['mulher-celular'],
  garconete: ['garconete'],
  idoso: ['idoso-banco'],
};

// Pistas nas conversas (rodada 34): uma por lugar, com um tipo de pessoa. Conversar com ela dá uma
// vantagem ✦, como os detalhes: liga a uma opção da noite (termos) ou à caçada. Textos genéricos.
export const PISTAS_CONVERSA = {
  lapa: { ambulante: { fala: 'Vi um homem de terno subir a escadaria sem olhar para trás. Ninguém sobe aquilo de terno.', termos: ['seguir', 'escadaria', 'terno', 'homem'], nota: 'o ambulante viu para onde o homem de terno foi' } },
  centro: { ambulante: { fala: 'Tem gente que entra no Theatro pela porta dos fundos, depois que fecha.', termos: ['teatro', 'investigar', 'procurar', 'entrar'], nota: 'sabe da porta dos fundos do Theatro' } },
  'santa-teresa': { idoso: { fala: 'Aquele casarão de muro alto vive de luz apagada. Mas alguém entra lá toda noite.', termos: ['casa', 'casarao', 'vizinho', 'procurar'], nota: 'sabe que o casarão de muro alto tem visita toda noite' } },
  'zona-sul': { ambulante: { fala: 'Depois das duas, o trecho perto do posto fica sem ninguém. Nem a polícia passa.', cacada: true, nota: 'sabe a hora em que a orla esvazia' } },
  barra: { turista: { fala: 'O porteiro do prédio da esquina dorme no turno. Eu vi.', termos: ['predio', 'entrar', 'procurar', 'investigar'], nota: 'sabe que o porteiro da esquina dorme no turno' } },
  'zona-norte': { ambulante: { fala: 'Debaixo do viaduto, depois que a feira fecha, a luz apaga toda.', cacada: true, nota: 'sabe que o viaduto fica no escuro depois da feira' } },
  morro: { idoso: { fala: 'Quem manda aqui não gosta de cara nova. Fala com a dona do bar antes.', termos: ['vizinho', 'perguntar', 'conversar', 'bar'], nota: 'sabe com quem falar antes de circular no morro' } },
  cemiterio: { passante: { fala: 'O vigia faz a ronda da capela à meia-noite e some por uma hora.', cacada: true, nota: 'sabe quando o vigia some da ronda' } },
  porto: { entregador: { fala: 'O armazém do mural tem uma porta lateral que nunca trancam.', termos: ['armazem', 'entrar', 'investigar', 'procurar'], nota: 'sabe da porta lateral do armazém' } },
  baixada: { bebado: { fala: 'O dono do bar da esquina sabe de tudo. Mas só fala depois da terceira.', termos: ['bar', 'dono', 'perguntar'], nota: 'sabe como fazer o dono do bar falar' } },
  niteroi: { turista: { fala: 'Tem uma escada que desce até a pedra, atrás do museu. Ninguém vai lá à noite.', cacada: true, nota: 'achou a escada escura atrás do museu' } },
};
