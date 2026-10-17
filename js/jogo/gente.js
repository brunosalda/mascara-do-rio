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
  // Elenco próprio de cada lugar (ordem do Bruno: gente presa ao cenário), escrito pelo roteirista
  // em gerencia/elenco-falas.md.
  // ----- Lapa -----
  sambista: {
    nome: 'Sambista', rotulo: 'um sambista com o pandeiro, encostado num pilar dos Arcos', presa: true,
    falas: ['A roda começa quando o último chegar.', 'Pandeiro molhado não canta.', 'Sabe algum samba? Então senta.'],
    repara: 'conhece pelo nome todo mundo que passa embaixo dos Arcos',
  },
  'dona-do-bar': {
    nome: 'Dona do bar', rotulo: 'a dona do bar, de avental, na porta', presa: false,
    falas: ['Fiado, só pra quem eu conheço.', 'Entra que vai chover.', 'Hoje tá calmo. Calmo demais.'],
    repara: 'lembra de cada rosto que já pagou uma conta ali',
  },

  // ----- Centro (Cinelândia) -----
  'seguranca-theatro': {
    nome: 'Segurança do Theatro', rotulo: 'o segurança do Theatro, de terno, na escadaria', presa: false,
    falas: ['O Theatro está fechado, senhor.', 'Espetáculo, só amanhã.', 'Pode tirar foto daí mesmo.'],
    repara: 'olha mais para a lateral do prédio do que para a porta da frente',
  },
  'musico-de-rua': {
    nome: 'Músico de rua', rotulo: 'um músico de rua com o violão, sentado na mureta da praça', presa: true,
    falas: ['Pede uma que eu toco.', 'Moeda serve, Pix também.', 'Ninguém para mais pra ouvir.'],
    repara: 'toca para a praça vazia e repara em quem fica até o fim',
  },

  // ----- Santa Teresa -----
  motorneiro: {
    nome: 'Motorneiro', rotulo: 'o motorneiro do bonde, de uniforme, ao lado do bonde', presa: true,
    falas: ['A última viagem já foi.', 'Esse bonde tem mais idade que eu.', 'Segura firme na descida.'],
    repara: 'sabe quem mora em cada casarão da linha',
  },
  'senhora-cachorro': {
    nome: 'Senhora com cachorro', rotulo: 'uma senhora levando o cachorro na coleira pela ladeira', presa: true,
    vulneravel: 'Ela mora sozinha e conversa com qualquer um que faça carinho no cachorro.',
    falas: ['Ele não morde, só late.', 'Pode fazer carinho, ele gosta.', 'Na minha idade, a ladeira dobra.'],
    repara: 'o cachorro rosna para você e ela pede desculpas',
  },

  // ----- Zona Sul (orla) -----
  quiosqueiro: {
    nome: 'Dono do quiosque', rotulo: 'o dono do quiosque, atrás do balcão', presa: true,
    falas: ['Água de coco acabou, só cerveja.', 'Fecho quando o último cliente for.', 'Cartão, só acima de vinte.'],
    repara: 'conta o caixa sem tirar os olhos do calçadão',
  },
  corredora: {
    nome: 'Corredora', rotulo: 'uma corredora de fone de ouvido no calçadão', presa: true,
    falas: ['Desculpa, tô no meio do treino.', 'Que horas são? Perdi a conta.', 'Corro de noite pra fugir do sol.'],
    repara: 'corre de fone e não escuta ninguém chegando',
  },

  // ----- Barra -----
  porteiro: {
    nome: 'Porteiro', rotulo: 'o porteiro do prédio, na guarita', presa: false,
    falas: ['Visita? Vou ter que interfonar.', 'Morador entra pela garagem.', 'Câmera grava tudo, viu?'],
    repara: 'cochila na guarita entre uma ronda e outra',
  },
  ciclista: {
    nome: 'Ciclista', rotulo: 'um ciclista parado na ciclovia, com a bicicleta', presa: true,
    falas: ['Furou o pneu, acredita?', 'Daqui pro Recreio é uma hora.', 'Tem bomba de ar aí? Não, né.'],
    repara: 'está sozinho, longe de casa, e o celular está quase sem bateria',
  },

  // ----- Zona Norte -----
  feirante: {
    nome: 'Feirante', rotulo: 'um feirante desmontando a barraca', presa: true,
    falas: ['Acabou a feira, freguês.', 'Leva o resto do abacaxi, é de graça.', 'Já, já apagam a luz do viaduto.'],
    repara: 'é sempre o último a ir embora do viaduto',
  },
  'rapaz-bola': {
    nome: 'Rapaz da bola', rotulo: 'um rapaz de uns vinte anos com a bola debaixo do braço, perto da quadra', presa: true,
    falas: ['Falta um pra fechar o time.', 'Joga na linha ou no gol?', 'A quadra é nossa até a uma.'],
    repara: 'espera os amigos que ainda não chegaram',
  },

  // ----- Morro -----
  mototaxista: {
    nome: 'Mototaxista', rotulo: 'um mototaxista de colete, sentado na moto, na base da escadaria', presa: true,
    falas: ['Subir é dez, descer é cinco.', 'Capacete tá no banco, pode pegar.', 'Vai pra onde?'],
    repara: 'conhece todo mundo que sobe e todo mundo que não deveria subir',
  },
  'mulher-laje': {
    nome: 'Mulher na laje', rotulo: 'uma mulher recolhendo a roupa do varal na laje', presa: false,
    falas: ['Vai chover, tenho que tirar tudo.', 'Tá procurando alguém aqui em cima?', 'Daqui eu vejo a rua toda.'],
    repara: 'vê de cima quem entra e quem sai da escadaria',
  },

  // ----- Cemitério -----
  coveiro: {
    nome: 'Coveiro', rotulo: 'o coveiro com a pá, perto de um túmulo', presa: true,
    falas: ['Enterro às oito. Tenho que terminar.', 'Aqui ninguém reclama do serviço.', 'Já vi de tudo. Quase tudo.'],
    repara: 'trabalha de madrugada sem medo nenhum do escuro',
  },
  'vigia-cemiterio': {
    nome: 'Vigia', rotulo: 'o vigia noturno com a lanterna, perto da capela', presa: true,
    falas: ['O portão fechou às seis. Como entrou?', 'Ronda, só eu e Deus.', 'Ouviu isso? Não? Melhor assim.'],
    repara: 'à meia-noite, some da ronda por uma hora',
  },

  // ----- Porto -----
  estivador: {
    nome: 'Estivador', rotulo: 'um estivador de colete refletivo, perto do armazém', presa: true,
    falas: ['O navio atrasou, tô aqui até cedo.', 'Contêiner não tem hora pra chegar.', 'Isso aqui é área restrita.'],
    repara: 'conhece cada porta do armazém e de quem é cada chave',
  },
  grafiteiro: {
    nome: 'Grafiteiro', rotulo: 'um grafiteiro com a lata de spray, diante do mural', presa: true,
    falas: ['Não conta pra ninguém que me viu.', 'Mural de noite tem outra cor.', 'Gostou? Ainda falta o fundo.'],
    repara: 'pinta de costas para a rua e se assusta com qualquer passo',
  },

  // ----- Baixada -----
  'dono-bar-esquina': {
    nome: 'Dono do bar', rotulo: 'o dono do bar da esquina, atrás do balcão', presa: false,
    falas: ['Primeira vez aqui? Então paga antes.', 'Pergunta demais, bebe de menos.', 'Depois da terceira, a gente conversa.'],
    repara: 'sabe da vida de toda a rua e só fala depois de umas doses',
  },
  churrasqueiro: {
    nome: 'Vendedor de churrasquinho', rotulo: 'o vendedor de churrasquinho na esquina, com a grelha acesa', presa: true,
    falas: ['Carne, frango ou coração?', 'Com farofa é mais um real.', 'Não come não? Tá pálido, hein.'],
    repara: 'a fumaça da grelha esconde quem para na esquina',
  },

  // ----- Niterói -----
  pescador: {
    nome: 'Pescador', rotulo: 'um pescador com a vara, na mureta', presa: true,
    vulneravel: 'Ele está sozinho na mureta há horas, e ninguém espera por ele.',
    falas: ['De noite o peixe vem mais perto.', 'Hoje não deu nem bagre.', 'Daqui a vista do Rio é mais bonita.'],
    repara: 'não tira os olhos da linha e não vê quem chega por trás',
  },
  fotografo: {
    nome: 'Fotógrafo', rotulo: 'um fotógrafo com o tripé, de frente para a vista', presa: true,
    falas: ['Não passa na frente, tô em exposição longa.', 'A luz da ponte fica linda agora.', 'Quer que eu tire uma sua?'],
    repara: 'fotografa tudo, inclusive quem está de passagem',
  },

  // ----- Aeroporto -----
  taxista: {
    nome: 'Taxista', rotulo: 'um taxista de pé no ponto de táxi', presa: true,
    falas: ['Táxi? Até a Zona Sul é tabelado.', 'Aplicativo não entra aqui, não.', 'Voo atrasado de novo, né?'],
    repara: 'espera passageiro há horas e aceita qualquer corrida',
  },
  viajante: {
    nome: 'Viajante', rotulo: 'uma viajante com a mala de rodinha, na calçada do embarque', presa: true,
    vulneravel: 'Ela acabou de chegar e não conhece ninguém na cidade.',
    falas: ['Sabe onde pega o ônibus pro centro?', 'Meu voo foi cancelado, acredita?', 'É seguro andar por aqui de noite?'],
    repara: 'olha o celular sem sinal e não sabe para onde ir',
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
  'sambista': ['lapa-sambista'],
  'dona-do-bar': ['lapa-dona-do-bar'],
  'seguranca-theatro': ['centro-seguranca-theatro'],
  'musico-de-rua': ['centro-musico'],
  'motorneiro': ['santa-teresa-motorneiro'],
  'senhora-cachorro': ['santa-teresa-senhora-cachorro'],
  'quiosqueiro': ['zona-sul-quiosqueiro'],
  'corredora': ['zona-sul-corredora'],
  'porteiro': ['barra-porteiro'],
  'ciclista': ['barra-ciclista'],
  'feirante': ['zona-norte-feirante'],
  'rapaz-bola': ['zona-norte-bola'],
  'mototaxista': ['morro-mototaxista'],
  'mulher-laje': ['morro-mulher-laje'],
  'coveiro': ['cemiterio-coveiro'],
  'vigia-cemiterio': ['cemiterio-vigia'],
  'estivador': ['porto-estivador'],
  'grafiteiro': ['porto-grafiteira'],
  'dono-bar-esquina': ['baixada-dono-do-bar'],
  'churrasqueiro': ['baixada-churrasquinho'],
  'pescador': ['niteroi-pescador'],
  'fotografo': ['niteroi-fotografa'],
  'taxista': ['aeroporto-taxista'],
  'viajante': ['aeroporto-viajante'],
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
