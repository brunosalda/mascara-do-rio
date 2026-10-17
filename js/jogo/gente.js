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
