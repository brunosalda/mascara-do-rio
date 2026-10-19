// Caso de demonstração do formato v3 (etapa A): um capítulo curto e inventado, que não faz parte da
// temporada de verdade. Pode ser lido por qualquer um, inclusive pelo Bruno.
// Nos capítulos de verdade, este mesmo formato fica no banco, e cada pista chega só quando é conquistada.
//
// Formato:
// - lugares: a pintura vista do alto, os pontos para examinar e as pessoas do caso.
// - pessoas: tópicos de conversa. Um tópico tem texto direto ou abordagens (testes, poderes, a Besta).
// - pistas: o que vai para o quadro. "sobre" diz em que coluna do quadro a pista fica.
// - palavras: as opções de cada lacuna da dedução; cada uma aparece quando uma pista dela é achada.
// - Testes: pool = [atributo, habilidade]; dif = sucessos necessários. Os dados vêm do motor (dados.js).

export const CASO = {
  id: 'demo-beco',
  titulo: 'O Beijo no Beco',
  rotulo: 'Caso de demonstração',
  pergunta: 'Quem atacou a Ritinha no beco do bar, como enganou quem viu e por quê?',
  // Minutos desde a meia-noite da véspera: 22h00 até 5h30 (29 × 60 + 30).
  relogio: { inicio: 22 * 60, fim: 29 * 60 + 30 },
  lugarInicial: 'lapa',
  custo: { viagem: 30, acusacaoErrada: 60, cacar: 45, perseguicao: 20, dados: 35 },

  abertura: {
    paineis: [
      { legenda: 'Lapa, madrugada passada. A ambulância leva Ritinha, garçonete do bar.', baloes: [{ quem: 'Paramédico', texto: 'Perdeu muito sangue. Tá viva por pouco.' }] },
      { legenda: 'Durante o dia, um vídeo da maca corre pelos celulares.', baloes: [{ quem: 'Vídeo', texto: 'Duas marcas no pescoço, gente! Olha isso!' }] },
      { legenda: 'Hoje, ao acordar, uma mensagem no seu celular.', baloes: [{ quem: 'Xerife Iolanda', texto: 'Quero o culpado antes de o sol nascer.' }] },
    ],
    texto: `Você acorda às dez da noite com o celular vibrando. É a Xerife Iolanda Bastos, a vampira que faz valer as leis do Príncipe no Rio.

**Xerife Iolanda** — Ontem, alguém bebeu o sangue de uma garçonete no beco do Bar da Cida, na Lapa, e largou a moça lá, quase morta. Já tem vídeo das marcas na internet. Isso põe a Máscara em risco: os mortais não podem saber que a gente existe.

**Xerife Iolanda** — Descubra quem foi, como enganou quem viu e por quê. Você tem até o sol nascer, às cinco e meia.

[MANHA] Ela não mandou essa mensagem só para você. Outros vampiros da cidade estão no mesmo caso. Quem resolver primeiro ganha a gratidão da Xerife.

[A FOME] E eu continuo aqui. Usar o sangue me acorda.`,
  },

  // Como jogar, na primeira vez (e no botão "?").
  ajuda: [
    'Ande pela cena e examine os pontos marcados com <b>?</b>.',
    'Fale com as pessoas: cada pergunta pode render uma pista.',
    'Cada conversa, exame ou viagem gasta tempo da noite. O sol nasce às 5h30.',
    'As pistas vão para o <b>Quadro</b> (tecla <kbd>Q</kbd>). Quando souber a resposta, monte a dedução e acuse.',
    'Errar a acusação custa 1 hora. Dá para tentar de novo.',
  ],

  lugares: {
    lapa: {
      nome: 'Lapa',
      em: 'na Lapa',
      geo: 'lapa-alto',
      inicio: [0.45, 0.88],
      tempo: 'garoa',
      pessoas: ['cida', 'jaque', 'ze', 'tiao'],
      pontos: [
        { id: 'ir-beco', tipo: 'passagem', destino: 'beco', rotulo: 'Entrar no beco do bar', x: 0.95, y: 0.86 },
        { id: 'balcao', rotulo: 'O notebook do balcão', x: 0.79, y: 0.735, requer: ['camera-negada'], escondeSe: ['camera'] },
        { id: 'cacar', tipo: 'cacar', rotulo: 'Caçar', x: 0.52, y: 0.68 },
      ],
      comentarios: [
        { id: 'c-beco', x: 0.93, y: 0.85, raio: 0.08, voz: 'A FOME', texto: 'Sangue velho, ali no beco. Fraco, mas ainda está lá.' },
        { id: 'c-portao', x: 0.74, y: 0.72, raio: 0.07, voz: 'PRONTIDÃO', texto: 'O segurança segue você com os olhos desde que você chegou.' },
        { id: 'c-arcos', x: 0.45, y: 0.66, raio: 0.08, voz: 'MANHA', texto: 'Tem viatura na esquina. A Lapa está mais quieta do que devia.' },
      ],
    },
    // O beco ao lado do bar: uma parte da Lapa (entrar e sair leva 2 minutos).
    beco: {
      nome: 'Beco do Bar da Cida',
      em: 'no beco do bar',
      dentro: 'lapa',
      geo: 'beco-lapa-alto',
      perto: false, // a pintura do beco já é funda e de perto: sem a câmera mais perto da rodada 46
      inicio: [0.56, 0.93],
      tempo: 'garoa',
      saida: { rotulo: 'Voltar ao largo da Lapa', destino: 'lapa' },
      pessoas: [],
      pontos: [
        { id: 'beco-chao', rotulo: 'O chão do beco', x: 0.56, y: 0.81 },
        { id: 'cacamba', rotulo: 'A caçamba de lixo', x: 0.69, y: 0.77 },
        { id: 'deposito', rotulo: 'A porta do depósito', x: 0.6, y: 0.46 },
      ],
      comentarios: [
        { id: 'c-poca', x: 0.6, y: 0.8, raio: 0.08, voz: 'A FOME', texto: 'Foi aqui. O cheiro dela ainda está na pedra.' },
        { id: 'c-barracao', x: 0.58, y: 0.5, raio: 0.07, voz: 'PRONTIDÃO', texto: 'Cadeado novo numa porta velha. Alguém guarda coisa aí.' },
      ],
    },
    'santa-teresa': {
      nome: 'Santa Teresa',
      em: 'em Santa Teresa',
      geo: 'santa-teresa-alto',
      inicio: [0.47, 0.9],
      tempo: 'nevoa',
      pessoas: ['arlindo', 'zuleide', 'breno'],
      pontos: [
        { id: 'casarao', rotulo: 'A porta do casarão', x: 0.8, y: 0.79 },
        { id: 'cacar', tipo: 'cacar', rotulo: 'Caçar', x: 0.62, y: 0.84 },
      ],
      comentarios: [
        { id: 'c-casarao', x: 0.79, y: 0.77, raio: 0.08, voz: 'PRONTIDÃO', texto: 'A pichação naquela porta é nova. Alguém passou por aqui com raiva.' },
        { id: 'c-bonde', x: 0.5, y: 0.72, raio: 0.08, voz: 'MANHA', texto: 'O último bonde desce às duas. Quem vem depois, vem a pé.' },
      ],
    },
  },

  // Colunas do quadro de pistas, na ordem.
  colunas: [
    { id: 'cena', nome: 'O crime' },
    { id: 'tiao', nome: 'Tião', pessoa: 'tiao' },
    { id: 'breno', nome: 'Breno', pessoa: 'breno' },
    { id: 'ze', nome: 'Zé do Cavaco', pessoa: 'ze' },
    { id: 'cida', nome: 'Dona Cida', pessoa: 'cida' },
  ],

  pessoas: {
    cida: {
      nome: 'Dona Cida', sub: 'dona do bar', tipo: 'dona-do-bar', lugar: 'lapa', x: 0.915, y: 0.79,
      falas: ['Hoje o bar fecha cedo, meu bem.'],
      saudacao: '**Dona Cida** — Hoje não tem samba pra você, meu bem. A polícia passou aqui de tarde. Quer o quê?',
      topicos: [
        {
          id: 'o-que-houve', rotulo: 'Perguntar o que aconteceu com a Ritinha', min: 10, pistas: ['ritinha-achada'],
          texto: `**Dona Cida** — Ontem, quase três da manhã, o Zé do Cavaco achou a Ritinha caída no beco, aqui atrás. Branca, fria, com duas marcas no pescoço. Chamei a ambulância, e alguém filmou a maca.

**Dona Cida** — Ela tá no hospital, viva. Mas não lembra de nada.`,
        },
        {
          id: 'quem-viu', rotulo: 'Perguntar se ela viu a Ritinha sair com alguém', min: 10, pistas: ['cida-viu-chapeu'],
          texto: `**Dona Cida** — Vi. Umas duas e dez, ela foi pro beco de braço dado com um homem alto, de chapéu panamá. Era o chapéu do Breno, aquele fotógrafo que vive aqui. Fita vermelha, não tem outro igual.

[INTUIÇÃO] Ela diz "o chapéu do Breno", e não "o Breno". Ela não viu o rosto do homem.`,
        },
        {
          id: 'breno', rotulo: 'Perguntar pelo Breno', min: 10, requer: ['cida-viu-chapeu'], pistas: ['chapeu-esquecido'],
          texto: `**Dona Cida** — O Breno esteve aqui cedo, sim. Saiu lá pela uma e meia, dizendo que ia fotografar o último bonde de Santa Teresa. Esqueceu o chapéu no balcão, como sempre.

**Dona Cida** — Quando fui guardar, o chapéu já tinha sumido. Achei que ele tinha voltado pra buscar.`,
        },
        {
          id: 'camera', rotulo: 'Pedir para ver a câmera do bar', min: 15, escondeSe: ['camera'],
          pergunta: '**Dona Cida** — A câmera? Pra que você quer ver a câmera do meu bar?',
          abordagens: [
            { rotulo: 'Pedir com jeito, em nome da Xerife', teste: { pool: ['carisma', 'persuasao'], dif: 2 }, social: true, sucesso: 'camera-ok', falha: 'camera-nao' },
            { rotulo: 'Ameaçar: a Xerife pode fechar o bar', teste: { pool: ['manipulacao', 'intimidacao'], dif: 2 }, social: true, sucesso: 'camera-ok', falha: 'camera-brava' },
            { rotulo: 'Dar uma ordem com o olhar (Dominação)', poder: 'compelir', sucesso: 'camera-ok' },
            { rotulo: 'Encantá-la com a Presença', poder: 'assombro', sucesso: 'camera-ok' },
          ],
        },
        {
          id: 'chave', rotulo: 'Pedir a chave do depósito', min: 10, requer: ['deposito-trancado'], escondeSe: ['tem-chave', 'mochila'],
          pergunta: '**Dona Cida** — A chave do depósito? Isso é coisa minha, meu bem.',
          abordagens: [
            { rotulo: 'Pedir com calma', teste: { pool: ['carisma', 'persuasao'], dif: 2 }, social: true, bloqueadaSe: ['cida-brava'], sucesso: 'chave-ok', falha: 'chave-nao' },
            { rotulo: 'Dar uma ordem com o olhar (Dominação)', poder: 'compelir', sucesso: 'chave-ok' },
          ],
        },
        {
          id: 'quem-caca', rotulo: 'Perguntar quem mais caça aqui na Lapa', min: 15,
          pergunta: '**Dona Cida** — Caça? Que caça? Aqui é um bar.', requerAlgum: ['cida-viu-chapeu', 'camera', 'ritinha-achada'], escondeSe: ['cida-carnical'],
          abordagens: [
            { rotulo: 'Perguntar olhando bem para ela', teste: { pool: ['raciocinio', 'intuicao'], dif: 2 }, sucesso: 'cida-revela', falha: 'cida-desconversa' },
            { rotulo: 'Ler a aura dela (Auspícios)', poder: 'perscrutar-alma', sucesso: 'cida-revela' },
          ],
        },
        {
          id: 'escandalo', rotulo: 'Perguntar quem ganha com o escândalo', min: 10, requer: ['ritinha-achada'], pistas: ['teoria-anarquistas'],
          texto: `**Dona Cida** — Sei lá. Dizem que os Anarquistas querem derrubar a Xerife. Um vídeo desses deixa ela mal com o Príncipe.

[POLÍTICA] Os Anarquistas são os vampiros que não aceitam o Príncipe. Um escândalo serviria a eles. Mas quem quer escândalo não larga a vítima viva.`,
        },
      ],
      resultados: {
        'camera-ok': {
          pistas: ['camera'],
          texto: `Ela vira o notebook para você. A imagem é escura, mas dá para ver.

**2h10**: um homem alto, de chapéu panamá, leva a Ritinha pelo braço até o beco. Ele **manca da perna esquerda**. Na orelha, um fone preto de fio enrolado, como o dos seguranças.

**2h31**: o homem sai do beco sozinho, sem o chapéu. Ele levanta a gola da camisa e sai da imagem.`,
        },
        'camera-nao': {
          pistas: ['cida-olha-tiao'], marcas: ['camera-negada'],
          texto: `**Dona Cida** — Câmera é coisa do dono, meu bem. E o dono sou eu.

[PRONTIDÃO] Quando você fala em câmera, ela olha rápido para o portão, onde está o Tião, o segurança. O notebook com as imagens fica atrás do balcão.`,
        },
        'camera-brava': {
          pistas: ['cida-olha-tiao'], marcas: ['camera-negada', 'cida-brava'],
          texto: `**Dona Cida** — Ameaça na minha casa, não. Pode tirar o cavalinho da chuva.

[PRONTIDÃO] Ela fica brava, mas olha rápido para o portão, onde está o Tião, o segurança. O notebook com as imagens fica atrás do balcão.`,
        },
        'chave-ok': {
          pistas: ['chave-cida'], marcas: ['tem-chave'],
          texto: '**Dona Cida** — Só eu e o Tião temos a chave do depósito. Toma. Mas não mexe nas coisas dele, que ele guarda a mochila lá.',
        },
        'chave-nao': {
          pistas: ['chave-cida'],
          texto: '**Dona Cida** — A chave fica comigo. Só eu e o Tião temos, e ele guarda as coisas dele lá dentro.',
        },
        'cida-revela': {
          pistas: ['cida-carnical', 'breno-expulsou'],
          texto: `[INTUIÇÃO] O pulso dela não acelera quando você chega perto. Ela já viu muitos como você. Dona Cida é uma carniçal: uma mortal que bebe o sangue de um vampiro e o serve.

**Dona Cida** — Tá bom. Eu sirvo o Breno há doze anos. A Lapa é o domínio dele, e ele não divide. Semana passada, ele botou pra correr um sangue-ralo que vinha caçando aqui.

[MANHA] Sangue-ralo é o apelido maldoso dos sangues-fracos: vampiros de sangue tão diluído que quase passam por gente.`,
        },
        'cida-desconversa': {
          pistas: ['cida-sabe'],
          texto: `**Dona Cida** — Caça? Aqui só se caça cerveja gelada, meu bem.

[INTUIÇÃO] Ela sabe muito bem do que você está falando. Só não confia em você.`,
        },
      },
    },

    jaque: {
      nome: 'Jaque', sub: 'garçonete', tipo: 'garconete', lugar: 'lapa', x: 0.82, y: 0.72,
      falas: ['Fala baixo, que a Cida tá de olho.'],
      saudacao: '**Jaque** — Se é sobre a Ritinha, fala baixo. A Cida não quer ninguém falando disso no salão.',
      topicos: [
        {
          id: 'saiu', rotulo: 'Perguntar como a Ritinha saiu do salão', min: 10, pistas: ['jaque-cravo'],
          texto: `**Jaque** — Duas e pouco, ela passou por mim sorrindo, de braço dado com um homem de chapéu. Achei que era o Breno. Ela é doida por ele.

**Jaque** — Mas o homem tinha um cheiro forte de cigarro de cravo. O Breno não fuma.`,
        },
        {
          id: 'cravo', rotulo: 'Perguntar quem fuma cigarro de cravo', min: 5, requer: ['jaque-cravo'], pistas: ['tiao-cravo'],
          texto: '**Jaque** — Aqui? Só o Tião, o segurança. O bar inteiro fede quando ele chega.',
        },
        {
          id: 'tiao', rotulo: 'Perguntar pelo Tião', min: 10, requerAlgum: ['tiao-cravo', 'cida-olha-tiao', 'ze-tiao-sumiu', 'conheceu-tiao'], pistas: ['tiao-nao-come'],
          texto: `**Jaque** — O Tião nunca come nada. Nem o pastel que eu levo pra ele. E de uma semana pra cá anda branco que nem papel, tremendo.

[A FOME] Ninguém vive sem comer. A não ser gente como você.`,
        },
      ],
    },

    ze: {
      nome: 'Zé do Cavaco', sub: 'sambista', tipo: 'sambista', lugar: 'lapa', x: 0.335, y: 0.635,
      falas: ['Hoje não tem roda, não.'],
      saudacao: '**Zé do Cavaco** — Fui eu que achei ela, tá? Já contei pra polícia. Contei pra Cida. Vai querer ouvir de novo?',
      topicos: [
        {
          id: 'achou', rotulo: 'Pedir que conte como achou a Ritinha', min: 10, pistas: ['duas-mordidas'],
          texto: `**Zé do Cavaco** — Duas e quarenta, saí pra fumar no beco. Ela tava caída perto da caçamba, gelada. Achei que tava morta.

**Zé do Cavaco** — No pescoço, duas marcas. Uma pequena, fechadinha. A outra rasgada, ainda sangrando.

[MEDICINA] Duas mordidas diferentes. Quem fez a primeira fechou a ferida com cuidado. Quem fez a segunda não se importou.`,
        },
        {
          id: 'ritinha', rotulo: 'Perguntar o que ele sente pela Ritinha', min: 10, pistas: ['ze-ciume'],
          texto: `**Zé do Cavaco** — Gosto dela, pô. Todo mundo sabe. Mas ela só tem olho pro fotógrafo. Semana passada eu disse pro Breno que ia quebrar a câmera dele na cabeça dele.

[INTUIÇÃO] Ciúme de verdade. E ele nem tenta esconder.`,
        },
        {
          id: 'onde', rotulo: 'Perguntar onde ele estava às duas e dez', min: 10, pistas: ['ze-live'],
          texto: `**Zé do Cavaco** — No palco, tocando, desde quase duas até quase três. O bar fez live. Tá no perfil do bar, pode ver.

[TECNOLOGIA] Você abre a live no celular. Lá está ele, tocando sem parar, de 1h50 a 2h50.`,
        },
        {
          id: 'tiao', rotulo: 'Perguntar se ele viu o segurança naquela hora', min: 10, pistas: ['ze-tiao-sumiu', 'tiao-manca'],
          texto: `**Zé do Cavaco** — Do palco eu vejo o portão. O Tião sumiu de lá umas duas horas e só voltou depois das duas e meia, de gola levantada. Achei que tinha ido ao banheiro. Demorou, né?

**Zé do Cavaco** — E ele manca, coitado. Levou um tiro na perna esquerda, anos atrás, num assalto.`,
        },
      ],
    },

    tiao: {
      nome: 'Tião', sub: 'segurança do bar', tipo: 'seguranca', lugar: 'lapa', x: 0.76, y: 0.7,
      falas: ['Circulando, chefia.'],
      saudacao: '**Tião** — Bar fechado pra conversa, chefia. Circulando.',
      // Quando a perseguição acaba, a conversa muda (veja a perseguição).
      topicos: [
        {
          id: 'onde', rotulo: 'Perguntar onde ele estava às duas e dez', min: 10,
          pergunta: '**Tião** — Por que você quer saber, chefia?',
          abordagens: [
            { rotulo: 'Ouvir e reparar se ele mente', teste: { pool: ['raciocinio', 'intuicao'], dif: 2 }, sucesso: 'tiao-mente', falha: 'tiao-gola' },
          ],
        },
        {
          id: 'cheiro', rotulo: 'Chegar perto dele e reparar', min: 10, escondeSe: ['tiao-vampiro'],
          pergunta: 'O Tião está a um passo de você, de braços cruzados. Ele não olha nos seus olhos.',
          abordagens: [
            { rotulo: 'Reparar na roupa dele', teste: { pool: ['raciocinio', 'prontidao'], dif: 2 }, sucesso: 'gola-sangue', falha: 'tiao-vira' },
            { rotulo: 'Usar os Sentidos Aguçados (Auspícios)', poder: 'sentidos-agucados', sucesso: 'gola-sangue' },
            { rotulo: 'Ler a aura dele (Auspícios)', poder: 'perscrutar-alma', sucesso: 'tiao-aura' },
            { rotulo: 'Sentir a Besta dele (Animalismo)', poder: 'sentir-besta', sucesso: 'tiao-aura' },
            { rotulo: 'Deixar a Besta farejar', fomeMin: 3, sucesso: 'tiao-besta' },
          ],
        },
        {
          id: 'chapeu', rotulo: 'Mostrar a ele o chapéu do Breno', min: 5, requer: ['chapeu-beco'], acao: 'perseguicao', pistas: ['conheceu-tiao'],
          texto: `Você mostra o chapéu panamá. O Tião olha para o chapéu, depois para você.

[PRONTIDÃO] Os ombros dele descem. Ele vai correr.

**Tião** — Isso não é meu.`,
        },
        {
          id: 'acusar', rotulo: 'Dizer que sabe o que ele fez', min: 5, requerQuantos: { n: 2, de: ['camera', 'ze-tiao-sumiu', 'tiao-cravo', 'gola-sangue', 'tiao-vampiro', 'breno-manca', 'pegadas'] }, escondeSe: ['chapeu-mostrado'], acao: 'perseguicao', pistas: ['conheceu-tiao'],
          texto: `Você chega bem perto e fala baixo, para só ele ouvir.

**Tião** — Tá maluco? Eu não saí deste portão.

[PRONTIDÃO] A perna esquerda dele já está virada para a rua. Ele vai correr.`,
        },
      ],
      resultados: {
        'tiao-mente': {
          pistas: ['tiao-mente', 'conheceu-tiao'],
          texto: `**Tião** — No portão. A noite toda. Não saí daqui.

[INTUIÇÃO] Ele mente. A mão vai à gola da camisa e fica lá, como quem esconde alguma coisa.`,
        },
        'tiao-gola': {
          pistas: ['tiao-gola', 'conheceu-tiao'],
          texto: `**Tião** — No portão. A noite toda.

[INTUIÇÃO] Você não sabe se ele mente. Mas ele puxa a gola da camisa para cima enquanto fala.`,
        },
        'gola-sangue': {
          pistas: ['gola-sangue', 'conheceu-tiao'],
          texto: '[PRONTIDÃO] Debaixo do cheiro de cravo, há uma mancha escura e seca na gola da camisa dele, do tamanho de uma moeda. É sangue. E não é dele.',
        },
        'tiao-vira': {
          pistas: ['conheceu-tiao'], marcas: ['tiao-desconfia'],
          texto: '[PRONTIDÃO] Ele percebe o seu olhar, levanta a gola e vira de costas para você.',
        },
        'tiao-aura': {
          pistas: ['tiao-vampiro', 'conheceu-tiao'],
          texto: '[AUSPÍCIOS] A aura dele é cinzenta e treme, cortada por fios escuros de fome. Ele não é mortal. É um sangue-fraco: um vampiro de sangue tão ralo que quase passa por gente.',
        },
        'tiao-besta': {
          pistas: ['tiao-vampiro', 'gola-sangue', 'conheceu-tiao'],
          texto: '[A BESTA] Sangue de mulher na gola dele. E ele tem o nosso cheiro. Fraco, ralo, mas é o nosso. Ele é um de nós.',
        },
      },
    },

    breno: {
      nome: 'Breno', sub: 'fotógrafo', tipo: 'passante', figura: 'passante-celular', lugar: 'santa-teresa', x: 0.74, y: 0.71,
      falas: ['Cuidado com o flash.'],
      saudacao: '**Breno** — Já sei. Viram o meu chapéu e acham que fui eu. Pergunta logo.',
      topicos: [
        {
          id: 'onde', rotulo: 'Perguntar onde ele estava às duas e dez', min: 10,
          pergunta: '**Breno** — Aqui, fotografando o último bonde. Quer ver as fotos?',
          abordagens: [
            { rotulo: 'Pedir as fotos e conferir os dados delas', teste: { pool: ['inteligencia', 'tecnologia'], dif: 2 }, sucesso: 'fotos-ok', falha: 'fotos-duvida' },
            { rotulo: 'Só olhar as fotos', sucesso: 'fotos-duvida' },
          ],
        },
        {
          id: 'chapeu', rotulo: 'Perguntar pelo chapéu dele', min: 5, pistas: ['breno-sem-chapeu'],
          texto: '**Breno** — Esqueci no balcão da Cida, à uma e meia. Saí correndo pra pegar o último bonde. Por quê?',
        },
        {
          id: 'mordida', rotulo: 'Perguntar se ele mordeu a Ritinha', min: 10, escondeSe: ['breno-mordeu'],
          pergunta: '**Breno** — Que pergunta é essa?',
          abordagens: [
            { rotulo: 'Perguntar direto, olhando nos olhos', teste: { pool: ['raciocinio', 'intuicao'], dif: 2 }, sucesso: 'breno-confessa', falha: 'breno-esconde' },
            { rotulo: 'Dar uma ordem com o olhar (Dominação)', poder: 'compelir', sucesso: 'breno-confessa' },
          ],
        },
        {
          id: 'inimigos', rotulo: 'Perguntar quem ia querer incriminá-lo', min: 10, requerAlgum: ['cida-viu-chapeu', 'chapeu-beco', 'camera', 'jaque-cravo'], pistas: ['breno-expulsou', 'breno-manca'],
          texto: `**Breno** — Inimigo eu tenho de monte. Mas semana passada eu expulsei um sangue-ralo que caçava no meu domínio, a Lapa. Um grandalhão. Mancava da perna esquerda.

**Breno** — Dei um último aviso: se pegasse ele caçando lá de novo, entregava pra Xerife. Nunca soube o nome dele.`,
        },
      ],
      resultados: {
        'fotos-ok': {
          pistas: ['fotos-breno'],
          texto: `Ele mostra as fotos no celular: o bonde, a ladeira, um gato no muro.

[TECNOLOGIA] Os dados guardados nas fotos batem: ontem, das 2h05 às 2h22, aqui em Santa Teresa. Ninguém mexeu nelas.`,
        },
        'fotos-duvida': {
          pistas: ['fotos-breno-duvida'],
          texto: `Ele mostra as fotos no celular: o bonde, a ladeira, um gato no muro. Na tela, a hora de cada foto: de 2h05 a 2h22.

[TECNOLOGIA] Pode ser verdade. Pode ser montagem. Sozinho, você não tem como saber.`,
        },
        'breno-confessa': {
          pistas: ['breno-mordeu'],
          texto: `**Breno** — Mordi, sim. À uma da manhã, na sala dos fundos. Com a Presença, ela nem sente medo. Bebi pouco e fechei a ferida com a língua, como manda a regra. Saí uma e meia, e ela estava ótima.

[INTUIÇÃO] É verdade. Ele tem vergonha, mas não mente.`,
        },
        'breno-esconde': {
          pistas: ['breno-esconde'],
          texto: `**Breno** — Isso não é da sua conta.

[INTUIÇÃO] Ele esconde alguma coisa. Pode ser culpa. Pode ser só vergonha.`,
        },
      },
    },

    arlindo: {
      nome: 'Seu Arlindo', sub: 'motorneiro do bonde', tipo: 'motorneiro', lugar: 'santa-teresa', x: 0.455, y: 0.74,
      falas: ['Último bonde já foi.'],
      saudacao: '**Seu Arlindo** — Último bonde já foi, moço. Agora só amanhã.',
      topicos: [
        {
          id: 'breno', rotulo: 'Perguntar se ele viu o fotógrafo ontem', min: 10, pistas: ['arlindo-breno'],
          texto: `**Seu Arlindo** — O rapaz da câmera? Vi, sim. Pegou o bonde das duas, lá embaixo, e desceu aqui em cima. Fotografou a viagem inteira.

**Seu Arlindo** — Estranhei que tava sem aquele chapéu dele. Disse que tinha esquecido num bar da Lapa.`,
        },
      ],
    },

    zuleide: {
      nome: 'Dona Zuleide', sub: 'e o cachorro Bidu', tipo: 'senhora-cachorro', lugar: 'santa-teresa', x: 0.48, y: 0.62,
      falas: ['O Bidu não morde, não.'],
      saudacao: '**Dona Zuleide** — Não repara no Bidu. Ele late pra tudo que é gente da noite.',
      topicos: [
        {
          id: 'bidu', rotulo: 'Perguntar se o Bidu latiu para alguém', min: 10, pistas: ['zuleide-breno', 'zuleide-manco'],
          texto: `**Dona Zuleide** — Ontem, duas e quinze, latiu pro rapaz bonito da câmera, que vive fotografando o casarão.

**Dona Zuleide** — E hoje de madrugada, antes de clarear, latiu de novo, pra um homem grande que subiu a ladeira mancando.`,
        },
        {
          id: 'cachorro', rotulo: 'Perguntar ao próprio Bidu (Animalismo)', min: 10, poderTopico: 'sussurros-selvagens', pistas: ['bidu-cravo'],
          texto: '[ANIMALISMO] O Bidu lembra de dois cheiros. O rapaz da câmera, de madrugada. E, quase de manhã, um homem grande com cheiro de cravo e de sangue, que parou na porta do casarão.',
        },
      ],
    },
  },

  // Pontos para examinar: texto direto ou abordagens, como nas conversas.
  exames: {
    'beco-chao': {
      min: 10,
      pergunta: 'O chão do beco está molhado: sacos de lixo, uma poça e uma grade de esgoto. A ambulância já levou a Ritinha, mas alguma coisa ficou.',
      abordagens: [
        { rotulo: 'Procurar marcas no chão', teste: { pool: ['raciocinio', 'investigacao'], dif: 2 }, sucesso: 'pegadas', falha: 'beco-cravo' },
        { rotulo: 'Usar os Sentidos Aguçados (Auspícios)', poder: 'sentidos-agucados', sucesso: 'beco-tudo' },
      ],
      resultados: {
        pegadas: { pistas: ['pegadas'], texto: '[INVESTIGAÇÃO] Pegadas fundas de bota pesada, com bico reforçado, como as de segurança. A da direita afunda; a da esquerda arrasta. Quem andou aqui manca.' },
        'beco-cravo': { pistas: ['beco-cravo'], texto: '[INVESTIGAÇÃO] Só lixo, água suja e sangue seco. Mas no ar ficou um cheiro doce e enjoado de cigarro de cravo.' },
        'beco-tudo': { pistas: ['pegadas', 'beco-cravo'], texto: '[AUSPÍCIOS] O beco inteiro se acende. Pegadas de bota pesada, uma afundando e a outra arrastando: quem andou aqui manca. E um cheiro de cravo que ninguém mais sentiria.' },
      },
    },
    cacamba: {
      min: 10, pistas: ['chapeu-beco'], marcas: ['tem-chapeu'],
      texto: `Debaixo de sacos de gelo vazios, você acha um chapéu panamá com fita vermelha. Na aba, uma gota de sangue seco.

[A FOME] O sangue é da moça. Mas o chapéu cheira a cigarro de cravo.`,
    },
    deposito: {
      min: 10, marcas: ['deposito-trancado'], escondeSe: ['mochila'],
      texto: 'Uma porta de ferro com um cadeado novo. Na plaquinha: DEPÓSITO, SÓ FUNCIONÁRIOS.',
      pergunta: 'Como você entra?',
      abordagens: [
        { rotulo: 'Abrir com a chave da Dona Cida', requer: ['tem-chave'], sucesso: 'mochila' },
        { rotulo: 'Abrir o cadeado sem chave', teste: { pool: ['destreza', 'furto'], dif: 2 }, sucesso: 'mochila', falha: 'cadeado' },
        { rotulo: 'Arrebentar o cadeado (Potência)', disciplina: ['potencia', 1], sucesso: 'mochila' },
        { rotulo: 'Forçar a porta no braço', teste: { pool: ['forca', 'atletismo'], dif: 3 }, sucesso: 'mochila', falha: 'porta-aguenta' },
      ],
      resultados: {
        mochila: {
          pistas: ['mochila'],
          texto: `Lá dentro, entre engradados de cerveja, há uma mochila preta de costura gasta. É a do Tião: o crachá dele está preso na alça.

Dentro dela, três bolsas de sangue de hospital, vazias e secas há dias. E um bilhete dobrado: *Última vez que eu aviso. A Lapa é minha. Some daqui. B.*

[A FOME] Bolsa velha não mata a fome de ninguém.`,
        },
        cadeado: { marcas: ['tiao-desconfia'], texto: '[FURTO] O cadeado não cede. Do outro lado do largo, o Tião olha para você.' },
        'porta-aguenta': { texto: '[ATLETISMO] A porta range, mas aguenta. Melhor achar outro jeito.' },
      },
    },
    balcao: {
      min: 10,
      pergunta: 'O notebook está aberto atrás do balcão. A Jaque passa por ali de tempos em tempos.',
      abordagens: [
        { rotulo: 'Ver as imagens sem ninguém notar', teste: { pool: ['destreza', 'furtividade'], dif: 2 }, sucesso: 'camera-ok', falha: 'pego' },
        { rotulo: 'Sumir de vista e ver as imagens (Ofuscação)', poder: 'manto-sombras', sucesso: 'camera-ok' },
        { rotulo: 'Passar invisível e ver as imagens (Ofuscação)', poder: 'passagem-invisivel', sucesso: 'camera-ok' },
      ],
      resultados: {
        'camera-ok': {
          pistas: ['camera'],
          texto: `Atrás do balcão, você volta as imagens da câmera para ontem. A imagem é escura, mas dá para ver.

**2h10**: um homem alto, de chapéu panamá, leva a Ritinha pelo braço até o beco. Ele **manca da perna esquerda**. Na orelha, um fone preto de fio enrolado, como o dos seguranças.

**2h31**: o homem sai do beco sozinho, sem o chapéu. Ele levanta a gola da camisa e sai da imagem.`,
        },
        pego: { marcas: ['tiao-desconfia'], texto: '**Jaque** — Ei! Sai daí! Isso é da Cida!\n\n[FURTIVIDADE] Você se afasta do balcão antes que alguém mais veja.' },
      },
    },
    casarao: {
      min: 10, pistas: ['pichacao'],
      texto: `Um casarão antigo, de janelas pintadas de preto por dentro. Deve ser o refúgio do Breno, o lugar onde ele dorme de dia.

Na porta, alguém pichou com tinta vermelha, nova, de hoje: **SANGUE-RALO TAMBÉM COME**.`,
      passivo: { hab: 'prontidao', min: 2, pistas: ['bituca-cravo'], texto: '[PRONTIDÃO] Junto da porta, uma bituca de cigarro de cravo, ainda inteira.' },
    },
  },

  // Caçar: baixa a Fome e gasta tempo. Sem Fome, não precisa.
  cacada: {
    abordagens: [
      { rotulo: 'Seduzir alguém no meio da noite', teste: { pool: ['carisma', 'persuasao'], dif: 2 } },
      { rotulo: 'Pegar alguém sozinho numa rua escura', teste: { pool: ['destreza', 'furtividade'], dif: 2 } },
      { rotulo: 'Assustar e beber rápido', teste: { pool: ['forca', 'intimidacao'], dif: 2 } },
    ],
    sucesso: '[A FOME] Um gole quente, depressa, num canto escuro. A pessoa vai embora tonta, achando que bebeu demais. Eu me calo por um tempo.',
    falha: '[A FOME] Ninguém cai na sua conversa, e a noite está cheia de olhos. Você volta de mãos vazias.',
    bestial: '[A BESTA] Eu bebo demais. A pessoa desmaia nos seus braços, e você precisa carregá-la até um banco e sumir antes que alguém veja. Perdemos tempo.',
  },

  pistas: {
    'ritinha-achada': { titulo: 'Achada no beco', texto: 'O Zé do Cavaco achou a Ritinha no beco às 2h40. Ela está viva, mas não lembra de nada.', fonte: 'Dona Cida', sobre: 'cena', tipo: 'testemunho' },
    'cida-viu-chapeu': { titulo: 'O homem de chapéu', texto: 'Às 2h10, a Ritinha foi para o beco com um homem alto de chapéu panamá. Era o chapéu do Breno, mas a Cida não viu o rosto.', fonte: 'Dona Cida', sobre: 'cena', tipo: 'testemunho' },
    'chapeu-esquecido': { titulo: 'O chapéu esquecido', texto: 'O Breno saiu do bar à 1h30 e esqueceu o chapéu no balcão. Logo depois, o chapéu sumiu.', fonte: 'Dona Cida', sobre: 'breno', tipo: 'testemunho' },
    camera: { titulo: 'A câmera do bar', texto: '2h10: um homem de chapéu leva a Ritinha ao beco. Ele manca da perna esquerda e usa fone de segurança. 2h31: sai sozinho, sem o chapéu.', fonte: 'Câmera do bar', sobre: 'cena', tipo: 'documento' },
    'cida-olha-tiao': { titulo: 'Um olhar para o portão', texto: 'Quando você falou em câmera, a Dona Cida olhou para o Tião, o segurança.', fonte: 'Dona Cida', sobre: 'tiao', tipo: 'comportamento' },
    'chave-cida': { titulo: 'A chave do depósito', texto: 'Só a Dona Cida e o Tião têm a chave do depósito. O Tião guarda a mochila lá.', fonte: 'Dona Cida', sobre: 'cida', tipo: 'testemunho' },
    'cida-carnical': { titulo: 'A carniçal do Breno', texto: 'A Dona Cida serve o Breno há doze anos. É uma mortal que bebe o sangue dele.', fonte: 'Dona Cida', sobre: 'cida', tipo: 'sobrenatural' },
    'cida-sabe': { titulo: 'Ela sabe de vampiros', texto: 'A Dona Cida desconversou, mas entendeu muito bem a pergunta sobre quem caça na Lapa.', fonte: 'Dona Cida', sobre: 'cida', tipo: 'comportamento' },
    'breno-expulsou': { titulo: 'Expulso da Lapa', texto: 'Semana passada, o Breno expulsou da Lapa um sangue-fraco que caçava ali e ameaçou entregá-lo à Xerife.', fonte: 'Breno e Dona Cida', sobre: 'breno', tipo: 'testemunho' },
    'teoria-anarquistas': { titulo: 'Os Anarquistas?', texto: 'Dizem que os Anarquistas querem um escândalo para derrubar a Xerife. Mas quem quer escândalo não larga a vítima viva.', fonte: 'Dona Cida', sobre: 'cida', tipo: 'rumor' },
    'jaque-cravo': { titulo: 'Cheiro de cravo', texto: 'O homem de chapéu tinha cheiro forte de cigarro de cravo. O Breno não fuma.', fonte: 'Jaque', sobre: 'cena', tipo: 'testemunho' },
    'tiao-cravo': { titulo: 'Quem fuma cravo', texto: 'No bar, só o Tião, o segurança, fuma cigarro de cravo.', fonte: 'Jaque', sobre: 'tiao', tipo: 'testemunho' },
    'tiao-nao-come': { titulo: 'Ele nunca come', texto: 'O Tião nunca come nada. De uma semana para cá, anda pálido e tremendo.', fonte: 'Jaque', sobre: 'tiao', tipo: 'comportamento' },
    'duas-mordidas': { titulo: 'Duas mordidas', texto: 'A Ritinha tinha duas mordidas: uma pequena e fechada com cuidado, outra rasgada.', fonte: 'Zé do Cavaco', sobre: 'cena', tipo: 'fisica' },
    'ze-ciume': { titulo: 'Ciúme', texto: 'O Zé gosta da Ritinha e ameaçou o Breno na semana passada.', fonte: 'Zé do Cavaco', sobre: 'ze', tipo: 'testemunho' },
    'ze-live': { titulo: 'No palco', texto: 'A live do bar mostra o Zé tocando sem parar das 1h50 às 2h50.', fonte: 'Live do bar', sobre: 'ze', tipo: 'documento' },
    'ze-tiao-sumiu': { titulo: 'O portão vazio', texto: 'O Tião sumiu do portão por volta das 2h e voltou depois das 2h30, de gola levantada.', fonte: 'Zé do Cavaco', sobre: 'tiao', tipo: 'ausencia' },
    'tiao-manca': { titulo: 'Um tiro na perna', texto: 'O Tião manca da perna esquerda desde um tiro que levou anos atrás.', fonte: 'Zé do Cavaco', sobre: 'tiao', tipo: 'testemunho' },
    'tiao-mente': { titulo: 'Ele mente', texto: 'O Tião diz que não saiu do portão. É mentira: a mão dele foi à gola da camisa.', fonte: 'Tião', sobre: 'tiao', tipo: 'comportamento' },
    'tiao-gola': { titulo: 'A gola levantada', texto: 'O Tião puxa a gola da camisa para cima quando fala da noite do crime.', fonte: 'Tião', sobre: 'tiao', tipo: 'comportamento' },
    'gola-sangue': { titulo: 'Sangue na gola', texto: 'Há sangue seco na gola da camisa do Tião, e não é dele.', fonte: 'Tião', sobre: 'tiao', tipo: 'fisica' },
    'tiao-vampiro': { titulo: 'Um sangue-fraco', texto: 'O Tião não é mortal. É um vampiro sangue-fraco.', fonte: 'O sangue', sobre: 'tiao', tipo: 'sobrenatural' },
    pegadas: { titulo: 'Pegadas no beco', texto: 'Pegadas de bota de segurança no beco. Quem as deixou manca.', fonte: 'O beco', sobre: 'cena', tipo: 'fisica' },
    'beco-cravo': { titulo: 'Cravo no beco', texto: 'O beco ainda cheira a cigarro de cravo.', fonte: 'O beco', sobre: 'cena', tipo: 'fisica' },
    'chapeu-beco': { titulo: 'O chapéu na caçamba', texto: 'O chapéu panamá de fita vermelha estava na caçamba do beco, com sangue na aba e cheiro de cravo.', fonte: 'A caçamba', sobre: 'cena', tipo: 'fisica' },
    mochila: { titulo: 'A mochila do Tião', texto: 'No depósito, a mochila do Tião: bolsas de sangue vazias e um bilhete de "B.": "A Lapa é minha. Some daqui."', fonte: 'O depósito', sobre: 'tiao', tipo: 'fisica' },
    'fotos-breno': { titulo: 'As fotos do Breno', texto: 'As fotos do Breno são de ontem, das 2h05 às 2h22, em Santa Teresa. Os dados das fotos confirmam.', fonte: 'Breno', sobre: 'breno', tipo: 'documento' },
    'fotos-breno-duvida': { titulo: 'As fotos do Breno?', texto: 'O Breno mostrou fotos de Santa Teresa marcadas das 2h05 às 2h22. Podem ser verdadeiras ou montadas.', fonte: 'Breno', sobre: 'breno', tipo: 'documento' },
    'breno-sem-chapeu': { titulo: 'Sem chapéu', texto: 'O Breno diz que esqueceu o chapéu no bar à 1h30, para pegar o último bonde.', fonte: 'Breno', sobre: 'breno', tipo: 'testemunho' },
    'breno-mordeu': { titulo: 'A primeira mordida', texto: 'O Breno mordeu a Ritinha à 1h, com a Presença, bebeu pouco e fechou a ferida. Saiu à 1h30.', fonte: 'Breno', sobre: 'breno', tipo: 'testemunho' },
    'breno-esconde': { titulo: 'O Breno esconde algo', texto: 'O Breno não quis dizer se mordeu a Ritinha.', fonte: 'Breno', sobre: 'breno', tipo: 'comportamento' },
    'breno-manca': { titulo: 'O expulso manca', texto: 'O sangue-fraco que o Breno expulsou da Lapa é um grandalhão que manca da perna esquerda.', fonte: 'Breno', sobre: 'tiao', tipo: 'testemunho' },
    'arlindo-breno': { titulo: 'No bonde das duas', texto: 'O Breno pegou o bonde das 2h e fotografou a viagem inteira, sem chapéu.', fonte: 'Seu Arlindo', sobre: 'breno', tipo: 'testemunho' },
    'zuleide-breno': { titulo: 'O latido das 2h15', texto: 'O Bidu latiu para o Breno às 2h15, em Santa Teresa.', fonte: 'Dona Zuleide', sobre: 'breno', tipo: 'testemunho' },
    'zuleide-manco': { titulo: 'Um homem mancando', texto: 'Hoje de madrugada, antes de clarear, um homem grande subiu a ladeira de Santa Teresa mancando.', fonte: 'Dona Zuleide', sobre: 'tiao', tipo: 'testemunho' },
    'bidu-cravo': { titulo: 'O faro do Bidu', texto: 'Quase de manhã, um homem com cheiro de cravo e de sangue parou na porta do casarão.', fonte: 'Bidu', sobre: 'tiao', tipo: 'sobrenatural' },
    pichacao: { titulo: 'A pichação', texto: 'Na porta do casarão do Breno, pichado hoje: "SANGUE-RALO TAMBÉM COME".', fonte: 'O casarão', sobre: 'breno', tipo: 'fisica' },
    'bituca-cravo': { titulo: 'Uma bituca de cravo', texto: 'Junto da porta pichada do casarão, uma bituca de cigarro de cravo.', fonte: 'O casarão', sobre: 'tiao', tipo: 'fisica' },
    confissao: { titulo: 'A confissão', texto: 'O Tião confessou: nove noites sem beber, expulso da Lapa pelo Breno, usou o chapéu dele para ser confundido com ele.', fonte: 'Tião', sobre: 'tiao', tipo: 'testemunho' },
    'celular-tiao': { titulo: 'O celular do Tião', texto: 'No celular que o Tião deixou cair, uma mensagem de "B.": "Se eu te pegar caçando na Lapa, te entrego pra Xerife."', fonte: 'Tião', sobre: 'tiao', tipo: 'documento' },
    // Marcas que contam como pista só para liberar conversas (não aparecem no quadro).
    'conheceu-tiao': { marca: true },
  },

  // A dedução: três lacunas. Cada palavra aparece quando uma das pistas listadas é achada.
  lacunas: [
    { id: 'quem', rotulo: 'Quem atacou a Ritinha' },
    { id: 'como', rotulo: 'Como enganou quem viu' },
    { id: 'porque', rotulo: 'Por quê' },
  ],
  palavras: {
    quem: [
      { id: 'breno', texto: 'Breno, o fotógrafo', por: ['cida-viu-chapeu', 'jaque-cravo', 'conheceu-breno'] },
      { id: 'tiao', texto: 'Tião, o segurança', por: ['tiao-cravo', 'ze-tiao-sumiu', 'cida-olha-tiao', 'conheceu-tiao', 'mochila'] },
      { id: 'ze', texto: 'Zé do Cavaco, o sambista', por: ['ritinha-achada', 'conheceu-ze'] },
      { id: 'cida', texto: 'Dona Cida, a dona do bar', por: ['conheceu-cida'] },
    ],
    como: [
      { id: 'chapeu', texto: 'usou o chapéu esquecido do Breno', por: ['cida-viu-chapeu', 'chapeu-beco', 'camera', 'breno-sem-chapeu', 'chapeu-esquecido'] },
      { id: 'presenca', texto: 'a atraiu com o poder da Presença', por: ['breno-mordeu'] },
      { id: 'chave', texto: 'entrou e saiu pelo depósito, com a chave do bar', por: ['chave-cida'] },
    ],
    porque: [
      { id: 'fome', texto: 'a Fome, depois que o Breno o proibiu de caçar na Lapa', por: ['breno-expulsou', 'mochila', 'celular-tiao', 'confissao', 'pichacao'] },
      { id: 'ciume', texto: 'ciúme, porque a Ritinha só tinha olhos para o Breno', por: ['ze-ciume'] },
      { id: 'politica', texto: 'política: um escândalo para derrubar a Xerife', por: ['teoria-anarquistas'] },
    ],
  },
  // Só na demonstração a resposta fica no navegador. No jogo de verdade, quem confere é o banco.
  resposta: { quem: 'tiao', como: 'chapeu', porque: 'fome' },

  // O mundo anda sozinho: às 4h, se ninguém o confrontou, o Tião some da Lapa.
  eventos: [
    { hora: 28 * 60, id: 'tiao-some', seNao: ['perseguido'], esconder: 'tiao', marcas: ['tiao-sumiu'], voz: 'MANHA', texto: 'O portão do bar está sem segurança. O Tião foi embora antes de o bar fechar.' },
  ],
  // Rivais fictícios, só para mostrar a corrida.
  rivais: [
    { hora: 24 * 60 + 30, texto: 'Corvo, outro vampiro no caso, chegou à Lapa.' },
    { hora: 25 * 60 + 40, texto: 'Dandara, outra vampira no caso, foi vista em Santa Teresa conversando com o fotógrafo.' },
    { hora: 26 * 60 + 50, texto: 'Corvo acusou alguém diante da Xerife e errou. Perdeu uma hora.' },
    { hora: 28 * 60 + 10, texto: 'Dandara acertou a dedução. Ainda dá para ficar em segundo lugar.', acertou: { nome: 'Dandara', hora: 28 * 60 + 10 } },
    { hora: 28 * 60 + 50, texto: 'Corvo acertou a dedução na segunda tentativa.', acertou: { nome: 'Corvo', hora: 28 * 60 + 50 } },
  ],

  perseguicao: {
    lugar: 'lapa', pessoa: 'tiao',
    // Ele foge pelo largo; depois de tempoSaida segundos, corre para a saída (a rua dos Arcos).
    saida: [0.12, 0.7],
    tempoSaida: 11,
    avisoSaida: 'ele corre para a rua dos Arcos',
    cadeiras: 4,
    velocidade: 0.98,            // em relação à corrida do personagem: quase igual
    dados: { pool: ['destreza', 'atletismo'], dif: 2 },
    // Depois da perseguição, a conversa com ele muda.
    depois: {
      pego: '**Tião** — Já falei tudo. Faz o que tiver que fazer.',
    },
    pego: {
      pistas: ['confissao'], marcas: ['perseguido', 'tiao-pego'],
      texto: `Você alcança o Tião debaixo dos Arcos e o encosta na parede. Ele não tenta mais fugir.

**Tião** — Nove noites. Fazia nove noites que eu não bebia nada. Só umas bolsas de hospital, velhas, que não matam a fome de ninguém.

**Tião** — O Breno me tirou da Lapa. Disse que, se me pegasse caçando aqui, me entregava pra Xerife. Aí eu vi o chapéu dele no balcão e pensei: se me virem, vão achar que é ele.

**Tião** — Eu só queria um gole. Quando vi, ela não acordava mais.

[HUMANIDADE] Ele chora sem lágrimas. Numa noite ruim, você poderia ser ele.`,
    },
    escapou: {
      pistas: ['celular-tiao'], marcas: ['perseguido', 'tiao-fugiu'],
      texto: `O Tião some entre os carros, para os lados dos Arcos. No chão, onde ele escorregou, ficou o celular dele, com a tela trincada.

[TECNOLOGIA] O celular está sem senha. A última mensagem é de um número salvo como "B.": *Se eu te pegar caçando na Lapa de novo, te entrego pra Xerife.*`,
    },
  },

  // Depois de acertar: a escolha com preço, como no fim de cada temporada.
  fecho: {
    paineis: [
      { legenda: 'Antes do amanhecer, a verdade chega à Xerife.', baloes: [{ quem: 'Xerife Iolanda', texto: 'Bom trabalho. Agora, o que eu faço com ele?' }] },
    ],
    texto: {
      pego: 'O Tião está sentado no meio-fio, com as mãos nos joelhos. A Xerife Iolanda chega de carro preto e pergunta o que você quer que aconteça com ele.',
      fugiu: 'O Tião fugiu, mas agora você sabe quem ele é. A Xerife Iolanda liga e pergunta o que você quer que ela faça com o nome.',
      solto: 'O Tião não sabe que você descobriu. A Xerife Iolanda liga e pergunta o que você quer que ela faça com o nome dele.',
    },
    escolhas: [
      { id: 'entregar', rotulo: 'Entregar o Tião à Xerife. A lei é a lei.', texto: 'A Xerife leva o Tião. Ninguém na cidade volta a vê-lo. A Máscara está salva, e a Xerife lembra do seu nome.', efeito: 'Prestígio maior com a Camarilla. O Breno fica sem inimigo.' },
      { id: 'poupar', rotulo: 'Dizer que foi um forasteiro e deixar o Tião sumir do Rio.', texto: 'Você mente para a Xerife. O Tião pega um ônibus para longe, antes de o sol nascer. Ele não vai esquecer o que você fez.', efeito: 'O Tião te deve a vida. Se a Xerife descobrir, você paga caro.' },
      { id: 'breno', rotulo: 'Contar tudo ao Breno e deixar que ele resolva.', texto: 'O Breno agradece com um sorriso frio. Na noite seguinte, ninguém mais fala do Tião. O Breno agora te deve um favor.', efeito: 'Um favor do Breno. A sua consciência pesa.' },
    ],
  },
};
