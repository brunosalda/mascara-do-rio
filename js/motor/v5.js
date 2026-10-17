// Motor de regras da V5: tabelas, cálculos da ficha e textos em palavras.
// Não rola dados (isso fica em dados.js, usado só pelo Narrador).
// Roda no navegador (assistente de criação, ficha) e no Node (scripts do Narrador).
// Todas as descrições são textos próprios do jogo, não trechos dos livros.

// ---------------------------------------------------------------------------
// Atributos
// ---------------------------------------------------------------------------

export const GRUPOS = { fisico: 'Físicos', social: 'Sociais', mental: 'Mentais' };

export const ATRIBUTOS = [
  { id: 'forca', nome: 'Força', grupo: 'fisico', desc: 'Músculo e potência física: erguer, empurrar, bater.' },
  { id: 'destreza', nome: 'Destreza', grupo: 'fisico', desc: 'Coordenação, agilidade e precisão dos movimentos.' },
  { id: 'vigor', nome: 'Vigor', grupo: 'fisico', desc: 'Resistência a dor, cansaço e ferimentos.' },
  { id: 'carisma', nome: 'Carisma', grupo: 'social', desc: 'Encanto natural: atrair, inspirar, ser ouvido.' },
  { id: 'manipulacao', nome: 'Manipulação', grupo: 'social', desc: 'Levar os outros a fazer o que você quer.' },
  { id: 'autocontrole', nome: 'Autocontrole', grupo: 'social', desc: 'Sangue-frio: manter a calma e a máscara sob pressão.' },
  { id: 'inteligencia', nome: 'Inteligência', grupo: 'mental', desc: 'Raciocínio, memória e conhecimento.' },
  { id: 'raciocinio', nome: 'Raciocínio', grupo: 'mental', desc: 'Pensar rápido e reagir ao inesperado.' },
  { id: 'determinacao', nome: 'Determinação', grupo: 'mental', desc: 'Foco e força mental para não desistir.' },
];

// Distribuição da criação: um em 4, três em 3, quatro em 2, um em 1.
// No assistente: "maior talento" (4), "três pontos fortes" (3), "fraqueza" (1); o resto fica em 2.
export function niveisAtributos(escolha = {}) {
  const r = Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 2]));
  (escolha.fortes || []).forEach((id) => { if (id in r) r[id] = 3; });
  if (escolha.melhor in r) r[escolha.melhor] = 4;
  if (escolha.fraco in r) r[escolha.fraco] = 1;
  return r;
}

// ---------------------------------------------------------------------------
// Habilidades
// ---------------------------------------------------------------------------

export const HABILIDADES = [
  { id: 'atletismo', nome: 'Atletismo', grupo: 'fisico', desc: 'Correr, saltar, escalar, nadar.' },
  { id: 'briga', nome: 'Briga', grupo: 'fisico', desc: 'Luta de mãos nuas, garras e presas.' },
  { id: 'oficios', nome: 'Ofícios', grupo: 'fisico', desc: 'Fazer e consertar coisas com as mãos.', exigeEsp: true },
  { id: 'conducao', nome: 'Condução', grupo: 'fisico', desc: 'Dirigir bem, inclusive em fuga.' },
  { id: 'armas-de-fogo', nome: 'Armas de Fogo', grupo: 'fisico', desc: 'Atirar, manter e conseguir armas.' },
  { id: 'furto', nome: 'Furto', grupo: 'fisico', desc: 'Abrir fechaduras, bater carteiras, arrombar.' },
  { id: 'armas-brancas', nome: 'Armas Brancas', grupo: 'fisico', desc: 'Facas, bastões, espadas, qualquer coisa à mão.' },
  { id: 'furtividade', nome: 'Furtividade', grupo: 'fisico', desc: 'Passar despercebido, seguir sem ser visto.' },
  { id: 'sobrevivencia', nome: 'Sobrevivência', grupo: 'fisico', desc: 'Rastrear, se abrigar, se virar longe da cidade.' },
  { id: 'trato-animais', nome: 'Trato com Animais', grupo: 'social', desc: 'Entender, acalmar e treinar animais.' },
  { id: 'etiqueta', nome: 'Etiqueta', grupo: 'social', desc: 'Saber se portar em qualquer ambiente, inclusive no Elísio.' },
  { id: 'intuicao', nome: 'Intuição', grupo: 'social', desc: 'Ler intenções, mentiras e emoções.' },
  { id: 'intimidacao', nome: 'Intimidação', grupo: 'social', desc: 'Fazer medo, com ameaça aberta ou velada.' },
  { id: 'lideranca', nome: 'Liderança', grupo: 'social', desc: 'Comandar e inspirar um grupo.' },
  { id: 'performance', nome: 'Performance', grupo: 'social', desc: 'Cantar, tocar, dançar, atuar, discursar.', exigeEsp: true },
  { id: 'persuasao', nome: 'Persuasão', grupo: 'social', desc: 'Convencer com argumentos e charme.' },
  { id: 'manha', nome: 'Manha', grupo: 'social', desc: 'Conhecer as ruas: quem manda, onde comprar, como sumir.' },
  { id: 'labia', nome: 'Lábia', grupo: 'social', desc: 'Mentir, enganar e despistar.' },
  { id: 'academicos', nome: 'Acadêmicos', grupo: 'mental', desc: 'História, letras, direito e outros saberes de estudo.', exigeEsp: true },
  { id: 'prontidao', nome: 'Prontidão', grupo: 'mental', desc: 'Perceber perigo e detalhes ao redor.' },
  { id: 'financas', nome: 'Finanças', grupo: 'mental', desc: 'Dinheiro, mercado, lavagem, contabilidade.' },
  { id: 'investigacao', nome: 'Investigação', grupo: 'mental', desc: 'Achar pistas e ligar os pontos.' },
  { id: 'medicina', nome: 'Medicina', grupo: 'mental', desc: 'Primeiros socorros, anatomia, sangue.' },
  { id: 'ocultismo', nome: 'Ocultismo', grupo: 'mental', desc: 'O sobrenatural, rituais, lendas e segredos.' },
  { id: 'politica', nome: 'Política', grupo: 'mental', desc: 'Poder, burocracia e as tramas das seitas.' },
  { id: 'ciencia', nome: 'Ciência', grupo: 'mental', desc: 'Química, física, biologia e afins.', exigeEsp: true },
  { id: 'tecnologia', nome: 'Tecnologia', grupo: 'mental', desc: 'Computadores, redes, câmeras, celulares.' },
];

export const PERFIS_HABILIDADE = {
  'faz-tudo': {
    nome: 'Faz-tudo',
    desc: 'Sabe um pouco de quase tudo, mas não se destaca em nada.',
    faixas: [{ nivel: 3, qtd: 1 }, { nivel: 2, qtd: 8 }, { nivel: 1, qtd: 10 }],
  },
  equilibrado: {
    nome: 'Equilibrado',
    desc: 'Algumas áreas fortes e uma boa base no resto.',
    faixas: [{ nivel: 3, qtd: 3 }, { nivel: 2, qtd: 5 }, { nivel: 1, qtd: 7 }],
  },
  especialista: {
    nome: 'Especialista',
    desc: 'Excelente em uma coisa, bom em poucas, ignorante no resto.',
    faixas: [{ nivel: 4, qtd: 1 }, { nivel: 3, qtd: 3 }, { nivel: 2, qtd: 3 }, { nivel: 1, qtd: 3 }],
  },
};

// ---------------------------------------------------------------------------
// Disciplinas e poderes (níveis 1 a 3 no protótipo)
// ---------------------------------------------------------------------------

export const DISCIPLINAS = {
  animalismo: {
    nome: 'Animalismo',
    desc: 'Domínio sobre animais e sobre a Besta, em si e nos outros.',
    poderes: [
      { id: 'vinculo-famulo', nivel: 1, nome: 'Vínculo com o Fâmulo', desc: 'Um animal se torna seu servo leal, ligado pelo sangue.' },
      { id: 'sentir-besta', nivel: 1, nome: 'Sentir a Besta', desc: 'Percebe a fome, a raiva e a natureza predatória de quem está perto.' },
      { id: 'sussurros-selvagens', nivel: 2, nome: 'Sussurros Selvagens', desc: 'Conversa com animais e chama os que estão por perto.' },
      { id: 'suculencia-animal', nivel: 3, nome: 'Suculência Animal', desc: 'Sangue de animal passa a saciar quase como o humano.' },
      { id: 'acalmar-besta', nivel: 3, nome: 'Acalmar a Besta', desc: 'Apaga a fúria ou o medo de um mortal ou vampiro.' },
    ],
  },
  auspicios: {
    nome: 'Auspícios',
    desc: 'Sentidos sobrenaturais: ver além, prever, ler almas.',
    poderes: [
      { id: 'sentidos-agucados', nivel: 1, nome: 'Sentidos Aguçados', desc: 'Visão, audição e olfato muito além do humano.' },
      { id: 'sentir-invisivel', nivel: 1, nome: 'Sentir o Invisível', desc: 'Nota presenças ocultas, fantasmas e magia no ar.' },
      { id: 'premonicao', nivel: 2, nome: 'Premonição', desc: 'Lampejos do que está para acontecer.' },
      { id: 'perscrutar-alma', nivel: 3, nome: 'Perscrutar a Alma', desc: 'Lê a aura: emoções, natureza e segredos de alguém.' },
      { id: 'compartilhar-sentidos', nivel: 3, nome: 'Compartilhar os Sentidos', desc: 'Vê e ouve pelos sentidos de outra pessoa.' },
    ],
  },
  feiticaria: {
    nome: 'Feitiçaria de Sangue',
    desc: 'Magia do sangue, ciumentamente guardada.',
    poderes: [
      { id: 'vitae-corrosiva', nivel: 1, nome: 'Vitae Corrosiva', desc: 'Seu sangue corrói matéria inanimada.' },
      { id: 'gosto-sangue', nivel: 1, nome: 'Gosto de Sangue', desc: 'Prova o sangue e descobre a força e a origem de quem o tinha.' },
      { id: 'extinguir-vitae', nivel: 2, nome: 'Extinguir Vitae', desc: 'Faz o sangue de outro vampiro se consumir, aumentando a fome dele.' },
      { id: 'sangue-potencia', nivel: 3, nome: 'Sangue de Potência', desc: 'Concentra o próprio sangue, ficando mais poderoso por uma noite.' },
      { id: 'toque-escorpiao', nivel: 3, nome: 'Toque do Escorpião', desc: 'Transforma o sangue em veneno paralisante.' },
    ],
  },
  rapidez: {
    nome: 'Rapidez',
    desc: 'Velocidade e reflexos impossíveis.',
    poderes: [
      { id: 'graca-felina', nivel: 1, nome: 'Graça Felina', desc: 'Equilíbrio perfeito, até em fios e beirais.' },
      { id: 'reflexos-rapidos', nivel: 1, nome: 'Reflexos Rápidos', desc: 'Reage antes que os outros percebam.' },
      { id: 'ligeireza', nivel: 2, nome: 'Ligeireza', desc: 'Move-se mais rápido que o olho acompanha, em luta ou em fuga.' },
      { id: 'piscar', nivel: 3, nome: 'Piscar', desc: 'Atravessa uma distância curta num instante.' },
      { id: 'travessia', nivel: 3, nome: 'Travessia', desc: 'Corre por paredes e sobre a água.' },
    ],
  },
  dominacao: {
    nome: 'Dominação',
    desc: 'Controle da mente pelo olhar e pela voz.',
    poderes: [
      { id: 'nublar-memoria', nivel: 1, nome: 'Nublar a Memória', desc: 'Faz alguém esquecer os últimos instantes.' },
      { id: 'compelir', nivel: 1, nome: 'Compelir', desc: 'Uma ordem curta, obedecida na hora.' },
      { id: 'hipnotizar', nivel: 2, nome: 'Hipnotizar', desc: 'Ordens mais complexas, cumpridas como se fossem ideia da pessoa.' },
      { id: 'mente-esquecida', nivel: 3, nome: 'Mente Esquecida', desc: 'Reescreve lembranças inteiras.' },
      { id: 'diretriz-submersa', nivel: 3, nome: 'Diretriz Submersa', desc: 'Planta uma ordem que dispara depois, num gatilho.' },
    ],
  },
  fortitude: {
    nome: 'Fortitude',
    desc: 'Resistência sobrenatural do corpo e da mente.',
    poderes: [
      { id: 'resiliencia', nivel: 1, nome: 'Resiliência', desc: 'Aguenta muito mais dano antes de cair.' },
      { id: 'mente-inabalavel', nivel: 1, nome: 'Mente Inabalável', desc: 'Resiste a manipulação e controle mental.' },
      { id: 'robustez', nivel: 2, nome: 'Robustez', desc: 'Golpes e tiros fazem menos efeito.' },
      { id: 'desafiar-perdicao', nivel: 3, nome: 'Desafiar a Perdição', desc: 'Resiste por um tempo a fogo, sol e outras fraquezas.' },
      { id: 'fachada-interior', nivel: 3, nome: 'Fortificar a Fachada Interior', desc: 'Protege a mente contra leitura e invasão.' },
    ],
  },
  ofuscacao: {
    nome: 'Ofuscação',
    desc: 'Passar despercebido, ficar invisível, assumir outro rosto.',
    poderes: [
      { id: 'manto-sombras', nivel: 1, nome: 'Manto de Sombras', desc: 'Some de vista enquanto ficar parado.' },
      { id: 'silencio-morte', nivel: 1, nome: 'Silêncio da Morte', desc: 'Não faz nenhum som.' },
      { id: 'passagem-invisivel', nivel: 2, nome: 'Passagem Invisível', desc: 'Continua invisível mesmo se movendo.' },
      { id: 'fantasma-maquina', nivel: 3, nome: 'Fantasma na Máquina', desc: 'Os poderes de ocultação valem também para câmeras e gravações.' },
      { id: 'mil-faces', nivel: 3, nome: 'Máscara de Mil Faces', desc: 'Os outros veem um rosto diferente do seu.' },
    ],
  },
  potencia: {
    nome: 'Potência',
    desc: 'Força física sobre-humana.',
    poderes: [
      { id: 'corpo-letal', nivel: 1, nome: 'Corpo Letal', desc: 'Mãos nuas que matam como armas.' },
      { id: 'salto-prodigioso', nivel: 1, nome: 'Salto Prodigioso', desc: 'Saltos enormes, de telhado em telhado.' },
      { id: 'proeza', nivel: 2, nome: 'Proeza', desc: 'Força bruta muito acima de qualquer humano.' },
      { id: 'alimentacao-brutal', nivel: 3, nome: 'Alimentação Brutal', desc: 'Drena uma vítima em segundos.' },
      { id: 'pegada-implacavel', nivel: 3, nome: 'Pegada Implacável', desc: 'Agarra-se a qualquer superfície ou pessoa e não solta.' },
    ],
  },
  presenca: {
    nome: 'Presença',
    desc: 'Arrastar emoções: fascínio, devoção, terror.',
    poderes: [
      { id: 'assombro', nivel: 1, nome: 'Assombro', desc: 'Todos prestam atenção e querem agradá-lo.' },
      { id: 'intimidar', nivel: 1, nome: 'Intimidar', desc: 'Ninguém ousa se aproximar ou enfrentá-lo.' },
      { id: 'beijo-persistente', nivel: 2, nome: 'Beijo Persistente', desc: 'Quem você morde passa a desejar a mordida de novo.' },
      { id: 'olhar-aterrador', nivel: 3, nome: 'Olhar Aterrador', desc: 'Revela a Besta e faz a vítima fugir em pânico.' },
      { id: 'encantamento', nivel: 3, nome: 'Encantamento', desc: 'Alguém passa a adorá-lo e fará quase tudo por você.' },
    ],
  },
  metamorfose: {
    nome: 'Metamorfose',
    desc: 'Mudar o próprio corpo: garras, formas animais, fundir-se à terra.',
    poderes: [
      { id: 'olhos-besta', nivel: 1, nome: 'Olhos da Besta', desc: 'Enxerga no escuro total; os olhos brilham.' },
      { id: 'peso-pluma', nivel: 1, nome: 'Peso da Pluma', desc: 'Fica leve: quedas e impactos machucam menos.' },
      { id: 'armas-ferais', nivel: 2, nome: 'Armas Ferais', desc: 'Garras e presas que rasgam como lâminas.' },
      { id: 'fundir-terra', nivel: 3, nome: 'Fundir-se à Terra', desc: 'Afunda no solo e dorme protegido.' },
      { id: 'mudar-forma', nivel: 3, nome: 'Mudar de Forma', desc: 'Vira um animal do seu tamanho, como um lobo ou um cão.' },
    ],
  },
  oblivio: {
    nome: 'Oblívio',
    desc: 'Sombras vivas e a força da morte.',
    poderes: [
      { id: 'capa-sombras', nivel: 1, nome: 'Capa de Sombras', desc: 'Envolve-se em sombras que escondem e protegem.' },
      { id: 'visao-oblivio', nivel: 1, nome: 'Visão do Oblívio', desc: 'Vê na escuridão total e enxerga fantasmas.' },
      { id: 'projetar-sombra', nivel: 2, nome: 'Projetar Sombra', desc: 'Molda sombras ao redor para assustar ou ocultar.' },
      { id: 'veu-afina', nivel: 2, nome: 'Onde o Véu Afina', desc: 'Sente onde a fronteira com o mundo dos mortos é fraca.' },
      { id: 'aura-decadencia', nivel: 3, nome: 'Aura de Decadência', desc: 'Coisas apodrecem, enferrujam e murcham ao seu redor.' },
      { id: 'toque-oblivio', nivel: 3, nome: 'Toque do Oblívio', desc: 'Seu toque faz a carne murchar.' },
    ],
  },
  alquimia: {
    nome: 'Alquimia de Sangue-Fraco',
    desc: 'Fórmulas que imitam os poderes dos vampiros de verdade, à custa de sangue e preparo.',
    poderes: [
      { id: 'alcance-distante', nivel: 1, nome: 'Alcance Distante', desc: 'Move objetos à distância.' },
      { id: 'nevoa', nivel: 1, nome: 'Névoa', desc: 'Cria uma névoa que esconde e confunde.' },
      { id: 'hieros-gamos', nivel: 1, nome: 'Hieros Gamos Profano', desc: 'Muda a própria aparência por uma noite.' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Clãs
// ---------------------------------------------------------------------------

export const CLAS = [
  {
    id: 'brujah', nome: 'Brujah', disciplinas: ['rapidez', 'potencia', 'presenca'],
    desc: 'Rebeldes de sangue quente: ativistas, brigões, filósofos de rua. Odeiam correntes, inclusive as da Camarilla.',
    perdicao: 'Temperamento violento: segurar a fúria é mais difícil para eles.',
    compulsao: 'Rebeldia: quando a Besta aperta, precisam desafiar quem manda.',
  },
  {
    id: 'gangrel', nome: 'Gangrel', disciplinas: ['animalismo', 'fortitude', 'metamorfose'],
    desc: 'Andarilhos e sobreviventes, mais próximos da Besta que qualquer outro clã. Desconfiam das cortes.',
    perdicao: 'Traços bestiais: cada frenesi deixa marcas animais no corpo.',
    compulsao: 'Impulsos selvagens: agem por instinto, como bicho acuado.',
  },
  {
    id: 'malkaviano', nome: 'Malkaviano', disciplinas: ['auspicios', 'dominacao', 'ofuscacao'],
    desc: 'Videntes partidos: o sangue lhes dá lampejos da verdade e leva parte da sanidade.',
    perdicao: 'Perspectiva fraturada: carregam uma perturbação mental que piora sob pressão.',
    compulsao: 'Delírio: confundem o real e o imaginado.',
  },
  {
    id: 'nosferatu', nome: 'Nosferatu', disciplinas: ['animalismo', 'ofuscacao', 'potencia'],
    desc: 'Monstros deformados pelo Abraço, mestres dos esgotos e dos segredos da cidade.',
    perdicao: 'Repulsivos: a aparência monstruosa não passa por humana sem poderes.',
    compulsao: 'Criptofilia: obsessão por descobrir um segredo.',
  },
  {
    id: 'toreador', nome: 'Toreador', disciplinas: ['auspicios', 'rapidez', 'presenca'],
    desc: 'Artistas, estetas e anfitriões. Vivem pela beleza e pelo prestígio nas cortes.',
    perdicao: 'Fixação estética: ambientes feios os deixam distraídos e desconfortáveis.',
    compulsao: 'Obsessão: ficam presos a algo belo e esquecem o resto.',
  },
  {
    id: 'tremere', nome: 'Tremere', disciplinas: ['auspicios', 'dominacao', 'feiticaria'],
    desc: 'Feiticeiros do sangue, outrora uma hierarquia rígida, hoje rachados em facções.',
    perdicao: 'Sangue deficiente: o sangue deles já não prende outros vampiros em Laços de Sangue.',
    compulsao: 'Perfeccionismo: nada menos que o perfeito serve.',
  },
  {
    id: 'ventrue', nome: 'Ventrue', disciplinas: ['dominacao', 'fortitude', 'presenca'],
    desc: 'Aristocratas e executivos, os pilares do poder da Camarilla.',
    perdicao: 'Paladar refinado: só conseguem se alimentar de um tipo específico de pessoa.',
    compulsao: 'Arrogância: precisam ser obedecidos.',
  },
  {
    id: 'banu-haqim', nome: 'Banu Haqim', disciplinas: ['feiticaria', 'rapidez', 'ofuscacao'],
    desc: 'Juízes e executores que se veem como guardiões contra os excessos dos vampiros.',
    perdicao: 'Vício em sangue: sangue de vampiro os vicia com facilidade.',
    compulsao: 'Julgamento: precisam punir quem erra.',
  },
  {
    id: 'hecata', nome: 'Hecata', disciplinas: ['auspicios', 'fortitude', 'oblivio'],
    desc: 'Um clã de famílias necromantes, unidas pela morte e pelos fantasmas.',
    perdicao: 'Beijo doloroso: a mordida deles dói em vez de dar prazer.',
    compulsao: 'Morbidez: fascínio pela morte e pelo que vem depois.',
  },
  {
    id: 'lasombra', nome: 'Lasombra', disciplinas: ['dominacao', 'oblivio', 'potencia'],
    desc: 'Senhores das sombras, ambiciosos e implacáveis, recém-chegados à Camarilla.',
    perdicao: 'Imagem distorcida: reflexos e gravações saem estranhos, e a tecnologia falha perto deles.',
    compulsao: 'Crueldade: precisam vencer, custe o que custar.',
  },
  {
    id: 'ministerio', nome: 'Ministério', disciplinas: ['ofuscacao', 'presenca', 'metamorfose'],
    desc: 'Um culto que liberta (e prende) os outros pelos próprios desejos.',
    perdicao: 'Aversão à luz: luz forte os fere e atrapalha mais que aos outros.',
    compulsao: 'Transgressão: precisam quebrar uma regra ou tabu.',
  },
  {
    id: 'ravnos', nome: 'Ravnos', disciplinas: ['animalismo', 'ofuscacao', 'presenca'],
    desc: 'Viajantes e ilusionistas, sobreviventes de um clã quase destruído.',
    perdicao: 'Condenados: se dormem demais no mesmo lugar, o sol os encontra.',
    compulsao: 'Tentar o destino: precisam correr riscos.',
  },
  {
    id: 'salubri', nome: 'Salubri', disciplinas: ['auspicios', 'dominacao', 'fortitude'],
    desc: 'Curandeiros raros, caçados há séculos, marcados por um terceiro olho.',
    perdicao: 'Caçados: o sangue deles é cobiçado, e o terceiro olho se abre quando usam poderes.',
    compulsao: 'Empatia afetiva: sentem a dor dos outros como própria.',
  },
  {
    id: 'tzimisce', nome: 'Tzimisce', disciplinas: ['animalismo', 'dominacao', 'metamorfose'],
    desc: 'Senhores possessivos que moldam carne e reivindicam o que é seu.',
    perdicao: 'Enraizados: precisam dormir cercados por algo que consideram seu.',
    compulsao: 'Cobiça: precisam possuir algo ou alguém.',
  },
  {
    id: 'caitiff', nome: 'Caitiff', disciplinas: [], livre: true,
    desc: 'Sem clã: vampiros cujo sangue não carrega herança. Desprezados, mas livres para aprender qualquer disciplina.',
    perdicao: 'Párias: a sociedade vampírica os trata com desconfiança.',
    compulsao: 'Nenhuma própria do clã.',
  },
  {
    id: 'sangue-fraco', nome: 'Sangue-Fraco', disciplinas: ['alquimia'], sangueFraco: true,
    desc: 'Quase mortais: comem, suportam um pouco de sol e fazem alquimia com o sangue. Muitos vampiros querem vê-los mortos.',
    perdicao: 'Sangue ralo: poderes fracos e uma vida de fuga das seitas.',
    compulsao: 'Nenhuma própria do clã.',
  },
];

export function cla(id) {
  return CLAS.find((c) => c.id === id) || null;
}

// ---------------------------------------------------------------------------
// Tipos de predador (como o personagem caça)
// ---------------------------------------------------------------------------

export const PREDADORES = [
  {
    id: 'gato-de-beco', nome: 'Gato de Beco',
    desc: 'Toma o sangue à força: assalto, emboscada, briga de beco.',
    parada: ['forca', 'briga'],
    disciplinas: ['rapidez', 'potencia'],
    especializacoes: [{ hab: 'intimidacao', nome: 'Assaltos' }, { hab: 'briga', nome: 'Imobilizações' }],
    humanidade: -1,
    vantagens: [{ id: 'contatos', nivel: 3, nota: 'criminosos' }],
    defeitos: [],
  },
  {
    id: 'ensacador', nome: 'Ensacador',
    desc: 'Vive de bolsas de sangue: hospitais, bancos de sangue, mercado negro.',
    parada: ['inteligencia', 'manha'],
    disciplinas: ['feiticaria', 'ofuscacao'],
    restricoes: { feiticaria: ['tremere', 'banu-haqim'] },
    especializacoes: [{ hab: 'furto', nome: 'Fechaduras' }, { hab: 'manha', nome: 'Mercado negro' }],
    humanidade: 0,
    vantagens: [{ id: 'estomago-ferro', nivel: 3 }],
    defeitos: [{ id: 'inimigo', nivel: 2, nota: 'alguém que você roubou ou traiu' }],
  },
  {
    id: 'sanguessuga', nome: 'Sanguessuga',
    desc: 'Bebe de outros vampiros. Crime grave e caminho perigoso.',
    parada: null,
    disciplinas: ['rapidez', 'metamorfose'],
    especializacoes: [{ hab: 'briga', nome: 'Contra vampiros' }, { hab: 'furtividade', nome: 'Contra vampiros' }],
    humanidade: -1,
    potencia: 1,
    vantagens: [],
    defeitos: [{ id: 'segredo-sombrio', nivel: 2, nota: 'diablerista ou rejeitado' }, { id: 'presa-exclusiva', nivel: 2, nota: 'não se alimenta de mortais' }],
  },
  {
    id: 'cutelo', nome: 'Cutelo',
    desc: 'Alimenta-se da própria família ou amigos mortais, escondendo deles o que é.',
    parada: ['manipulacao', 'labia'],
    disciplinas: ['dominacao', 'animalismo'],
    especializacoes: [{ hab: 'persuasao', nome: 'Manipulação emocional' }, { hab: 'labia', nome: 'Encobrimentos' }],
    humanidade: 0,
    vantagens: [{ id: 'rebanho', nivel: 2, nota: 'a família ou o círculo de amigos' }],
    defeitos: [{ id: 'segredo-sombrio', nivel: 1, nota: 'o que faz com a própria família' }],
  },
  {
    id: 'consensual', nome: 'Consensual',
    desc: 'Só bebe de quem aceita: doadores, fetichistas, voluntários.',
    parada: ['manipulacao', 'persuasao'],
    disciplinas: ['auspicios', 'fortitude'],
    especializacoes: [{ hab: 'medicina', nome: 'Coleta de sangue' }, { hab: 'persuasao', nome: 'Doadores' }],
    humanidade: 1,
    vantagens: [],
    defeitos: [{ id: 'segredo-sombrio', nivel: 1, nota: 'quebra da Máscara para conseguir doadores' }, { id: 'presa-exclusiva', nivel: 1, nota: 'só quem consente' }],
  },
  {
    id: 'fazendeiro', nome: 'Fazendeiro',
    desc: 'Recusa sangue humano e vive de animais. Fome constante.',
    parada: ['autocontrole', 'trato-animais'],
    disciplinas: ['animalismo', 'metamorfose'],
    especializacoes: [{ hab: 'trato-animais', nome: 'Um tipo de animal' }, { hab: 'sobrevivencia', nome: 'Caça' }],
    humanidade: 1,
    vantagens: [],
    defeitos: [{ id: 'dieta-animal', nivel: 2 }],
  },
  {
    id: 'osiris', nome: 'Osíris',
    desc: 'Tem seguidores: fãs, fiéis, uma seita. Eles vêm até você.',
    parada: ['manipulacao', 'labia'],
    disciplinas: ['feiticaria', 'presenca'],
    restricoes: { feiticaria: ['tremere', 'banu-haqim'] },
    especializacoes: [{ hab: 'ocultismo', nome: 'A própria seita' }, { hab: 'performance', nome: 'Pregação' }],
    humanidade: 0,
    vantagens: [{ id: 'rebanho', nivel: 3, nota: 'seus seguidores' }],
    defeitos: [{ id: 'inimigo', nivel: 2, nota: 'rivais ou ex-seguidores' }],
  },
  {
    id: 'sonambulo', nome: 'Sonâmbulo',
    desc: 'Bebe de quem dorme: invade casas, quartos de hotel, enfermarias.',
    parada: ['destreza', 'furtividade'],
    disciplinas: ['auspicios', 'ofuscacao'],
    especializacoes: [{ hab: 'medicina', nome: 'Anestésicos' }, { hab: 'furtividade', nome: 'Invasões' }],
    humanidade: 0,
    vantagens: [{ id: 'recursos', nivel: 1 }],
    defeitos: [],
  },
  {
    id: 'rainha-da-cena', nome: 'Rainha da Cena',
    desc: 'Domina uma cena (baile, boate, torcida, igreja) e caça dentro dela.',
    parada: ['manipulacao', 'persuasao'],
    disciplinas: ['dominacao', 'potencia'],
    especializacoes: [{ hab: 'etiqueta', nome: 'A sua cena' }, { hab: 'lideranca', nome: 'A sua cena' }, { hab: 'manha', nome: 'A sua cena' }],
    humanidade: 0,
    vantagens: [{ id: 'fama', nivel: 1, nota: 'na sua cena' }, { id: 'contatos', nivel: 1, nota: 'na sua cena' }],
    defeitos: [{ id: 'malvisto', nivel: 1, nota: 'fora da sua cena' }],
  },
  {
    id: 'sereia', nome: 'Sereia',
    desc: 'Seduz: encontros, aplicativos, noitadas. A vítima vem por vontade própria.',
    parada: ['carisma', 'labia'],
    disciplinas: ['fortitude', 'presenca'],
    especializacoes: [{ hab: 'persuasao', nome: 'Sedução' }, { hab: 'labia', nome: 'Sedução' }],
    humanidade: 0,
    vantagens: [{ id: 'beleza', nivel: 2 }],
    defeitos: [{ id: 'inimigo', nivel: 1, nota: 'alguém que você seduziu e descartou' }],
  },
];

export function predador(id) {
  return PREDADORES.find((p) => p.id === id) || null;
}

// Disciplinas que o predador pode dar a este clã (respeita restrições, ignora sangue-fraco).
export function disciplinasDoPredador(predadorId, claId) {
  const p = predador(predadorId);
  if (!p || cla(claId)?.sangueFraco) return [];
  return p.disciplinas.filter((d) => !p.restricoes?.[d] || p.restricoes[d].includes(claId));
}

// ---------------------------------------------------------------------------
// Vantagens e defeitos
// ---------------------------------------------------------------------------

export const PONTOS_VANTAGEM = 7;
export const PONTOS_DEFEITO = 2;

export const VANTAGENS = [
  { id: 'aliados', nome: 'Aliados', max: 5, desc: 'Mortais que ajudam você: uma gangue, um policial, uma família influente.' },
  { id: 'contatos', nome: 'Contatos', max: 3, desc: 'Gente que passa informação e consegue coisas.' },
  { id: 'fama', nome: 'Fama', max: 5, desc: 'Você é conhecido no mundo mortal. Abre portas e atrai olhares.' },
  { id: 'rebanho', nome: 'Rebanho', max: 5, desc: 'Mortais de quem você se alimenta com facilidade.' },
  { id: 'influencia', nome: 'Influência', max: 5, desc: 'Poder sobre uma instituição mortal: polícia, prefeitura, imprensa, tráfico.' },
  { id: 'refugio', nome: 'Refúgio', max: 3, desc: 'Um esconderijo seguro e bem localizado para dormir.' },
  { id: 'identidade', nome: 'Identidade Falsa', max: 2, desc: 'Documentos e histórico de uma vida mortal convincente.' },
  { id: 'mentor', nome: 'Mentor', max: 5, desc: 'Um vampiro mais velho que protege e aconselha você.' },
  { id: 'recursos', nome: 'Recursos', max: 5, desc: 'Dinheiro e bens.' },
  { id: 'lacaios', nome: 'Lacaios', max: 3, desc: 'Servos leais, talvez carniçais alimentados com seu sangue.' },
  { id: 'status', nome: 'Status', max: 5, desc: 'Prestígio dentro de uma seita.' },
  { id: 'beleza', nome: 'Beleza', max: 4, desc: 'Aparência marcante que facilita as interações.' },
  { id: 'estomago-ferro', nome: 'Estômago de Ferro', max: 3, fixo: 3, desc: 'Consegue se alimentar de sangue velho, frio ou de bolsa.' },
  { id: 'idiomas', nome: 'Idiomas', max: 3, desc: 'Fala outras línguas além do português (uma por ponto).' },
];

export const DEFEITOS = [
  { id: 'inimigo', nome: 'Inimigo', max: 2, desc: 'Alguém quer prejudicar você.' },
  { id: 'segredo-sombrio', nome: 'Segredo Sombrio', max: 2, desc: 'Algo que, se vier à tona, destrói sua reputação ou sua existência.' },
  { id: 'suspeito', nome: 'Suspeito', max: 1, desc: 'Uma seita desconfia de você.' },
  { id: 'malvisto', nome: 'Malvisto', max: 2, desc: 'Um grupo de mortais ou vampiros não gosta de você.' },
  { id: 'presa-exclusiva', nome: 'Presa Exclusiva', max: 2, desc: 'Há gente de quem você não se alimenta, por princípio.' },
  { id: 'sem-refugio', nome: 'Sem Refúgio', max: 1, desc: 'Não tem onde dormir com segurança.' },
  { id: 'vicio', nome: 'Vício', max: 2, desc: 'Só se sente bem bebendo sangue de quem usou certa droga.' },
  { id: 'feiura', nome: 'Feiura', max: 2, desc: 'Aparência que incomoda ou assusta.' },
  { id: 'dieta-animal', nome: 'Dieta Animal', max: 2, fixo: 2, desc: 'Só se alimenta de animais.' },
];

// Méritos e defeitos próprios de sangue-fraco (devem se equilibrar).
export const MERITOS_SANGUE_FRACO = [
  { id: 'afinidade-disciplina', nome: 'Afinidade com Disciplina', desc: 'Ganha um nível em uma disciplina de vampiro.' },
  { id: 'bebe-de-dia', nome: 'Bebe de Dia', desc: 'Aguenta melhor o sol, mas perde um pouco da força do sangue quando se expõe.' },
  { id: 'aparencia-viva', nome: 'Aparência Viva', desc: 'Parece totalmente vivo: corado, quente, com pulso.' },
  { id: 'alquimista', nome: 'Alquimista', desc: 'Um nível a mais de Alquimia e uma fórmula extra.' },
  { id: 'resistencia-vampirica', nome: 'Resistência Vampírica', desc: 'Sofre dano como um vampiro de verdade, menos frágil.' },
];
export const DEFEITOS_SANGUE_FRACO = [
  { id: 'dentes-de-leite', nome: 'Dentes de Leite', desc: 'As presas não servem: precisa de faca ou agulha para beber.' },
  { id: 'temperamento-bestial', nome: 'Temperamento Bestial', desc: 'Entra em frenesi como os vampiros comuns.' },
  { id: 'marcado-camarilla', nome: 'Marcado pela Camarilla', desc: 'A Camarilla sabe quem você é e vigia seus passos.' },
  { id: 'carne-morta', nome: 'Carne Morta', desc: 'Parece um cadáver: pálido e frio.' },
  { id: 'fragilidade-mortal', nome: 'Fragilidade Mortal', desc: 'Não consegue curar ferimentos com sangue.' },
];

// ---------------------------------------------------------------------------
// Palavras no lugar dos números
// ---------------------------------------------------------------------------

export const NIVEIS = {
  atributo: ['Nulo', 'Fraco', 'Comum', 'Bom', 'Excelente', 'Excepcional'],
  habilidade: ['Sem treino', 'Noções', 'Prático', 'Experiente', 'Especialista', 'Mestre'],
  disciplina: ['—', 'Iniciado', 'Praticante', 'Adepto', 'Mestre', 'Lendário'],
};

export function palavra(tipo, nivel) {
  const lista = NIVEIS[tipo];
  return lista ? lista[Math.max(0, Math.min(lista.length - 1, nivel | 0))] : String(nivel);
}

export const FOME = [
  { nome: 'Saciado', texto: 'O sangue repousa quieto nas veias.' },
  { nome: 'Inquieto', texto: 'Uma sede leve, fácil de ignorar.' },
  { nome: 'Com sede', texto: 'Você nota o pulso das pessoas ao redor.' },
  { nome: 'Faminto', texto: 'A Besta arranha por dentro. Difícil pensar em outra coisa.' },
  { nome: 'Voraz', texto: 'Cada pescoço é uma tentação. O controle está por um fio.' },
  { nome: 'À beira da Besta', texto: 'A fome manda. Qualquer faísca e a Besta assume.' },
];

export const HUMANIDADE = [
  'Perdido para a Besta',
  'Um monstro que mal lembra o que era ser gente',
  'Frio e cruel; mortais são gado',
  'A humanidade é uma lembrança distante',
  'Um predador que ainda se importa com poucos',
  'Rachado: ainda sente culpa, às vezes',
  'Ainda reconhece o certo e o errado',
  'Equilibrado entre a pessoa e o predador',
  'Ainda muito humano por dentro',
  'Quase como em vida',
  'Uma alma intocada pela Besta',
];

export function textoFome(n) {
  return FOME[Math.max(0, Math.min(5, n | 0))];
}

export function textoHumanidade(n) {
  return HUMANIDADE[Math.max(0, Math.min(10, n | 0))];
}

// Dano em palavras. max = caixas; sup = superficial; agr = agravado.
export function textoVitalidade(max, sup = 0, agr = 0) {
  if (agr >= max) return 'Em torpor';
  const livres = max - sup - agr;
  if (livres <= 0) return 'Prostrado';
  if (sup + agr === 0) return 'Ileso';
  const fracao = (sup + agr) / max;
  if (agr > 0 && fracao >= 0.5) return 'Gravemente ferido';
  if (fracao >= 0.6) return 'Muito ferido';
  if (fracao >= 0.3) return 'Ferido';
  return 'Arranhado';
}

export function textoVontade(max, sup = 0, agr = 0) {
  const livres = max - sup - agr;
  if (livres <= 0) return 'Esgotado';
  if (sup + agr === 0) return 'Firme';
  const fracao = (sup + agr) / max;
  if (fracao >= 0.6) return 'Abalado';
  if (fracao >= 0.3) return 'Cansado';
  return 'Um pouco cansado';
}

// ---------------------------------------------------------------------------
// Experiência (custos da V5)
// ---------------------------------------------------------------------------

export const XP_INICIAL_NEONATO = 15;

export function custoXp(tipo, novoNivel = 1) {
  switch (tipo) {
    case 'atributo': return novoNivel * 5;
    case 'habilidade': return novoNivel * 3;
    case 'especializacao': return 3;
    case 'disciplina-cla': return novoNivel * 5;
    case 'disciplina-caitiff': return novoNivel * 6;
    case 'disciplina-fora': return novoNivel * 7;
    case 'ritual':
    case 'formula': return novoNivel * 3;
    case 'vantagem': return 3;
    case 'potencia': return novoNivel * 10;
    default: throw new Error(`Tipo de custo desconhecido: ${tipo}`);
  }
}

// ---------------------------------------------------------------------------
// Ficha completa a partir das escolhas do assistente
// ---------------------------------------------------------------------------

// Pontos de disciplina da criação: [principal, secundária] (2 e 1), mais o do predador.
export function niveisDisciplinas(ficha) {
  const c = cla(ficha.cla);
  const r = {};
  if (!c) return r;
  if (c.sangueFraco) {
    r.alquimia = 1;
    if ((ficha.meritosSangueFraco || []).includes('alquimista')) r.alquimia += 1;
    const afinidade = ficha.afinidadeDisciplina;
    if ((ficha.meritosSangueFraco || []).includes('afinidade-disciplina') && afinidade && afinidade !== 'alquimia') {
      r[afinidade] = 1;
    }
    return r;
  }
  const d = ficha.disciplinas || {};
  if (d.principal) r[d.principal] = 2;
  if (d.secundaria && d.secundaria !== d.principal) r[d.secundaria] = (r[d.secundaria] || 0) + 1;
  const dp = ficha.predador?.disciplina;
  if (dp && disciplinasDoPredador(ficha.predador.id, ficha.cla).includes(dp)) r[dp] = (r[dp] || 0) + 1;
  return r;
}

export function niveisHabilidades(ficha) {
  const r = Object.fromEntries(HABILIDADES.map((h) => [h.id, 0]));
  for (const [id, n] of Object.entries(ficha.habilidades?.niveis || {})) {
    if (id in r) r[id] = n | 0;
  }
  return r;
}

export function especializacoes(ficha) {
  const lista = [...(ficha.habilidades?.especializacoes || [])];
  const p = predador(ficha.predador?.id);
  const escolhida = p?.especializacoes?.[ficha.predador?.especializacao];
  if (escolhida) lista.push({ hab: escolhida.hab, nome: escolhida.nome, origem: 'predador' });
  return lista;
}

export function calcular(ficha) {
  const c = cla(ficha.cla);
  const p = predador(ficha.predador?.id);
  const atributos = niveisAtributos(ficha.atributos);
  const habilidades = niveisHabilidades(ficha);
  const disciplinas = niveisDisciplinas(ficha);
  // Uma especialização de predador numa habilidade sem treino dá o primeiro nível nela.
  for (const e of especializacoes(ficha)) {
    if (e.origem === 'predador' && habilidades[e.hab] === 0) habilidades[e.hab] = 1;
  }
  const sangueFraco = !!c?.sangueFraco;
  return {
    atributos,
    habilidades,
    especializacoes: especializacoes(ficha),
    disciplinas,
    poderes: [...(ficha.disciplinas?.poderes || []), ...(ficha.alquimia?.formulas || [])],
    humanidade: Math.max(0, Math.min(10, 7 + (p?.humanidade || 0))),
    vitalidade: atributos.vigor + 3,
    forcaVontade: atributos.autocontrole + atributos.determinacao,
    potencia: sangueFraco ? 0 : 1 + (p?.potencia || 0),
    geracao: sangueFraco ? 14 : 13,
    vantagens: [...(p?.vantagens || []).map((v) => ({ ...v, origem: 'predador' })), ...(ficha.vantagens || [])],
    defeitos: [...(p?.defeitos || []).map((v) => ({ ...v, origem: 'predador' })), ...(ficha.defeitos || [])],
    paradaCacada: p?.parada || null,
  };
}

// Estado inicial do personagem, gravado pelo Narrador ao ativar a ficha.
export function estadoInicial(ficha) {
  const f = calcular(ficha);
  return {
    fome: 1,
    vitalidade: { max: f.vitalidade, superficial: 0, agravado: 0 },
    vontade: { max: f.forcaVontade, superficial: 0, agravado: 0 },
    humanidade: f.humanidade,
    manchas: 0,
    potencia: f.potencia,
    xp: { total: XP_INICIAL_NEONATO, gasto: 0 },
    local: '',
  };
}

// ---------------------------------------------------------------------------
// Validação por etapa do assistente (lista de pendências; vazia = ok)
// ---------------------------------------------------------------------------

function pontos(lista) {
  return (lista || []).reduce((s, v) => s + (v.nivel | 0), 0);
}

export function pendencias(etapa, ficha) {
  const p = [];
  const c = cla(ficha.cla);
  switch (etapa) {
    case 'origem': {
      const o = ficha.origem || {};
      if (!o.nomeEmVida?.trim()) p.push('Dê um nome ao personagem.');
      if (!o.conceito?.trim()) p.push('Descreva em poucas palavras quem ele era.');
      break;
    }
    case 'cla':
      if (!c) p.push('Escolha um clã.');
      break;
    case 'atributos': {
      const a = ficha.atributos || {};
      if (!a.melhor) p.push('Escolha o maior talento.');
      const fortes = (a.fortes || []).filter((id) => id !== a.melhor);
      if (fortes.length !== 3) p.push('Escolha exatamente três pontos fortes.');
      if (!a.fraco) p.push('Escolha a fraqueza.');
      if (a.fraco && (a.fraco === a.melhor || fortes.includes(a.fraco))) p.push('A fraqueza não pode ser um talento.');
      break;
    }
    case 'habilidades': {
      const h = ficha.habilidades || {};
      const perfil = PERFIS_HABILIDADE[h.perfil];
      if (!perfil) { p.push('Escolha um perfil.'); break; }
      const niveis = Object.values(h.niveis || {});
      for (const f of perfil.faixas) {
        const n = niveis.filter((x) => x === f.nivel).length;
        if (n !== f.qtd) p.push(`Escolha ${f.qtd} habilidade${f.qtd > 1 ? 's' : ''} como "${palavra('habilidade', f.nivel)}" (faltam ${f.qtd - n}).`);
      }
      const esp = h.especializacoes || [];
      for (const hab of HABILIDADES.filter((x) => x.exigeEsp && (h.niveis?.[x.id] | 0) > 0)) {
        if (!esp.some((e) => e.hab === hab.id && e.nome?.trim())) p.push(`${hab.nome} pede uma especialização (ex.: qual ofício, arte, área).`);
      }
      if (!esp.some((e) => e.origem === 'livre' && e.nome?.trim())) p.push('Escolha uma especialização livre.');
      break;
    }
    case 'predador': {
      const pr = predador(ficha.predador?.id);
      if (!pr) { p.push('Escolha como você caça.'); break; }
      if (ficha.predador.especializacao == null) p.push('Escolha a especialização que vem com o tipo de predador.');
      if (!c?.sangueFraco && disciplinasDoPredador(pr.id, ficha.cla).length && !ficha.predador.disciplina) p.push('Escolha a disciplina que vem com o tipo de predador.');
      break;
    }
    case 'disciplinas': {
      if (c?.sangueFraco) {
        const formulas = ficha.alquimia?.formulas || [];
        const niveis = niveisDisciplinas(ficha);
        if (formulas.length !== niveis.alquimia) p.push(`Escolha ${niveis.alquimia} fórmula${niveis.alquimia > 1 ? 's' : ''} de alquimia.`);
        const m = (ficha.meritosSangueFraco || []).length;
        const d = (ficha.defeitosSangueFraco || []).length;
        if (m !== d) p.push('Méritos e defeitos de sangue-fraco precisam estar em igual número.');
        if (m > 3) p.push('No máximo três méritos e três defeitos de sangue-fraco.');
        if ((ficha.meritosSangueFraco || []).includes('afinidade-disciplina') && !ficha.afinidadeDisciplina) p.push('Escolha a disciplina da Afinidade.');
        break;
      }
      const d = ficha.disciplinas || {};
      if (!d.principal) p.push('Escolha a disciplina principal.');
      if (!d.secundaria || d.secundaria === d.principal) p.push('Escolha uma disciplina secundária diferente da principal.');
      if (!c?.livre && c && [d.principal, d.secundaria].some((x) => x && !c.disciplinas.includes(x))) p.push('As disciplinas precisam ser do seu clã.');
      const niveis = niveisDisciplinas(ficha);
      const esperados = Object.values(niveis).reduce((s, n) => s + n, 0);
      const poderes = d.poderes || [];
      if (poderes.length !== esperados) p.push(`Escolha ${esperados} poderes, um para cada nível de disciplina (faltam ${esperados - poderes.length}).`);
      for (const [disc, nivel] of Object.entries(niveis)) {
        const escolhidos = poderes.filter((id) => DISCIPLINAS[disc]?.poderes.some((pw) => pw.id === id));
        if (escolhidos.length !== nivel) p.push(`${DISCIPLINAS[disc].nome}: escolha ${nivel} poder${nivel > 1 ? 'es' : ''}.`);
      }
      break;
    }
    case 'vantagens': {
      const v = pontos(ficha.vantagens);
      const d = pontos(ficha.defeitos);
      if (v !== PONTOS_VANTAGEM) p.push(`Distribua exatamente ${PONTOS_VANTAGEM} marcas de vantagem (usadas: ${v}).`);
      if (d !== PONTOS_DEFEITO) p.push(`Escolha exatamente ${PONTOS_DEFEITO} marcas de defeito (usadas: ${d}).`);
      break;
    }
    case 'conviccoes': {
      const cv = (ficha.conviccoes || []).filter((x) => x.texto?.trim());
      if (cv.length < 1) p.push('Escreva pelo menos uma convicção.');
      if (cv.some((x) => !x.touchstone?.nome?.trim())) p.push('Cada convicção precisa de uma pessoa (touchstone) ligada a ela.');
      if (!ficha.ambicao?.trim()) p.push('Escreva a ambição do personagem.');
      if (!ficha.desejo?.trim()) p.push('Escreva o desejo do personagem.');
      break;
    }
    case 'final':
      if (!ficha.nome?.trim()) p.push('Escolha o nome pelo qual o personagem é conhecido hoje.');
      break;
    default:
      break;
  }
  return p;
}

export const ETAPAS = ['origem', 'cla', 'atributos', 'habilidades', 'predador', 'disciplinas', 'vantagens', 'conviccoes', 'final'];

export function fichaCompleta(ficha) {
  return ETAPAS.every((e) => pendencias(e, ficha).length === 0);
}
