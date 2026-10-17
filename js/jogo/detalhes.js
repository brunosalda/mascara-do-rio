// Descobertas de cada lugar, só sobre o lugar (nada da crônica, que é do Narrador):
// - detalhes: coisas que dá para examinar de perto; abrem uma fala curta de uma voz interior;
// - comentarios: uma voz interior fala sozinha quando o personagem passa perto (uma vez por noite).
// Coordenadas de 0 a 1 sobre a pintura, como em lugares.js. Vozes com os nomes das habilidades
// (a cor vem do grupo: mental, social, físico) ou A FOME.

export const DESCOBERTAS = {
  lapa: {
    detalhes: [
      { id: 'arcos', x: 0.23, y: 0.678, rotulo: 'Os Arcos', voz: 'ACADÊMICOS',
        texto: 'Um aqueduto de 1750, feito para trazer água do rio Carioca até o Centro. Hoje é o bondinho de Santa Teresa que passa lá em cima. Quase trezentos anos de pé, e ninguém aqui embaixo olha para cima.' },
      { id: 'chapa', x: 0.78, y: 0.725, rotulo: 'Cheiro do bar', voz: 'A FOME',
        texto: 'Linguiça na chapa e cerveja derramada. Você lembra que gostava disso. Agora o estômago nem se mexe. O único cheiro que ainda abre o seu apetite vem das pessoas sentadas às mesas.' },
      { id: 'poca', x: 0.56, y: 0.8, rotulo: 'A poça', voz: 'PRONTIDÃO',
        texto: 'Na poça aparecem o poste, os arcos e as pessoas, de cabeça para baixo. Você se inclina. O seu reflexo também aparece, mas borrado, como foto tremida. Melhor ninguém reparar.' },
      { id: 'passante', x: 0.12, y: 0.8, rotulo: 'O homem que passa', voz: 'INTUIÇÃO',
        texto: 'Ele anda depressa, mão no bolso, olho no chão. Não é a pressa de quem vai para algum lugar. É a pressa de quem quer sair daqui.' },
    ],
    comentarios: [
      { id: 'multidao', x: 0.32, y: 0.69, raio: 0.09, voz: 'MANHA', texto: 'Sexta-feira isto aqui ferve. Quem quer sumir no meio do povo vem para a Lapa.' },
      { id: 'mesas', x: 0.83, y: 0.72, raio: 0.08, voz: 'A FOME', texto: 'Tanta gente distraída. Tanto pescoço à mostra.' },
      { id: 'canto', x: 0.95, y: 0.85, raio: 0.07, voz: 'PRONTIDÃO', texto: 'Aqui a luz não chega. As câmeras também não.' },
    ],
  },

  'santa-teresa': {
    detalhes: [
      { id: 'bonde', x: 0.36, y: 0.8, rotulo: 'O bondinho', voz: 'ACADÊMICOS',
        texto: 'O bonde amarelo sobe o morro desde o século XIX. Os trilhos ainda guincham quando ele passa, e dá para ouvir lá de baixo, da Lapa.' },
      { id: 'vista', x: 0.56, y: 0.77, rotulo: 'A vista', voz: 'INTUIÇÃO',
        texto: 'Lá embaixo, a baía inteira acesa e o Pão de Açúcar escuro no meio. Daqui de cima, a cidade parece calma. Ela nunca é.' },
      { id: 'lampiao', x: 0.13, y: 0.79, rotulo: 'O lampião', voz: 'PRONTIDÃO',
        texto: 'Lampião antigo, vidro rachado. A luz amarela deixa todo mundo com cara de retrato velho. Você também.' },
    ],
    comentarios: [
      { id: 'muro', x: 0.57, y: 0.89, raio: 0.08, voz: 'A FOME', texto: 'Muro alto, mato fechado, rua sem movimento. Ninguém ouviria nada.' },
      { id: 'subida', x: 0.31, y: 0.8, raio: 0.08, voz: 'MANHA', texto: 'De dia, turista. De noite, só sobe quem mora aqui ou quem sabe o caminho.' },
    ],
  },

  centro: {
    detalhes: [
      { id: 'teatro', x: 0.44, y: 0.69, rotulo: 'O Theatro Municipal', voz: 'ACADÊMICOS',
        texto: 'Inaugurado em 1909, inspirado na Ópera de Paris. Ouro, mármore e anjos no telhado. Os ricos daquele tempo queriam que o Rio parecesse a Europa.' },
      { id: 'trilhos', x: 0.3, y: 0.87, rotulo: 'Os trilhos', voz: 'PRONTIDÃO',
        texto: 'Os trilhos do VLT riscam a praça molhada. O último bonde passou faz tempo. O próximo, só de manhã.' },
      { id: 'praca', x: 0.62, y: 0.8, rotulo: 'A Cinelândia', voz: 'INTUIÇÃO',
        texto: 'De dia, aqui tem protesto, camelô e gente com pressa. De madrugada, a praça é de quem dorme no banco e de quem caça.' },
    ],
    comentarios: [
      { id: 'marquise', x: 0.9, y: 0.77, raio: 0.08, voz: 'A FOME', texto: 'Debaixo das marquises tem gente dormindo. A Fome repara antes de você.' },
      { id: 'escadaria', x: 0.4, y: 0.7, raio: 0.08, voz: 'ETIQUETA', texto: 'Em noite de estreia, esta escadaria se enche de gente importante. Hoje está vazia, mas o porteiro ainda mede você de cima a baixo.' },
    ],
  },

  'zona-sul': {
    detalhes: [
      { id: 'ondas', x: 0.42, y: 0.62, rotulo: 'As ondas do calçadão', voz: 'ACADÊMICOS',
        texto: 'As ondas pretas e brancas do calçadão imitam um desenho de Lisboa. Burle Marx esticou o desenho por quatro quilômetros de orla, nos anos 1970.' },
      { id: 'mar', x: 0.7, y: 0.74, rotulo: 'O mar', voz: 'A FOME',
        texto: 'O mar não tem cheiro de nada que interesse. O que interessa está no calçadão, de chinelo, com o celular na mão.' },
      { id: 'mulher', x: 0.33, y: 0.7, rotulo: 'A mulher de vermelho', voz: 'INTUIÇÃO',
        texto: 'Ela olha o mar há muito tempo, sem piscar. Quem espera alguém olha para os lados. Ela não espera ninguém.' },
    ],
    comentarios: [
      { id: 'orla', x: 0.4, y: 0.6, raio: 0.08, voz: 'MANHA', texto: 'De madrugada, a orla é de quem corre, de quem vende e de quem não tem para onde ir.' },
      { id: 'areia', x: 0.62, y: 0.8, raio: 0.09, voz: 'PRONTIDÃO', texto: 'Areia molhada guarda pegada. Melhor andar onde a onda apaga.' },
    ],
  },

  barra: {
    detalhes: [
      { id: 'predios', x: 0.14, y: 0.73, rotulo: 'Os condomínios', voz: 'FINANÇAS',
        texto: 'Portaria, câmera, cancela e segurança armado. Na Barra, o dinheiro mora em ilhas cercadas. Para entrar, precisa de nome na lista.' },
      { id: 'avenida', x: 0.3, y: 0.86, rotulo: 'A avenida', voz: 'PRONTIDÃO',
        texto: 'Seis pistas e nenhum pedestre. Aqui quem anda a pé de madrugada chama mais atenção que um carro sem placa.' },
    ],
    comentarios: [
      { id: 'lagoa', x: 0.5, y: 0.8, raio: 0.08, voz: 'SOBREVIVÊNCIA', texto: 'Jacaré na lagoa. Ele não sabe que você é mais perigoso que ele.' },
      { id: 'pista', x: 0.25, y: 0.78, raio: 0.09, voz: 'MANHA', texto: 'Aqui ninguém pergunta quem você é. Perguntam qual é o seu carro.' },
    ],
  },

  'zona-norte': {
    detalhes: [
      { id: 'quadra', x: 0.58, y: 0.66, rotulo: 'A quadra da escola', voz: 'PERFORMANCE',
        texto: 'Lá dentro, a bateria ensaia para o Carnaval. O surdo bate no peito antes de chegar ao ouvido. Seu coração parado quase volta a acompanhar.' },
      { id: 'frutas', x: 0.84, y: 0.8, rotulo: 'A barraca de frutas', voz: 'A FOME',
        texto: 'Manga, caju, abacaxi. Cores que antes davam água na boca. Agora você só repara no pulso do vendedor.' },
      { id: 'estadio', x: 0.74, y: 0.64, rotulo: 'O Maracanã', voz: 'ACADÊMICOS',
        texto: 'O Maracanã aceso lá no fundo. Em 1950, duzentas mil pessoas viram o Brasil perder a Copa ali dentro, em silêncio.' },
    ],
    comentarios: [
      { id: 'bar', x: 0.48, y: 0.76, raio: 0.08, voz: 'INTUIÇÃO', texto: 'Ninguém aqui é desconhecido. Você é. Já repararam.' },
      { id: 'viaduto', x: 0.47, y: 0.66, raio: 0.07, voz: 'PRONTIDÃO', texto: 'Debaixo do viaduto, o barulho do trem cobre qualquer grito.' },
    ],
  },

  morro: {
    detalhes: [
      { id: 'fios', x: 0.3, y: 0.66, rotulo: 'Os fios', voz: 'TECNOLOGIA',
        texto: 'Um nó de fios em cada poste: luz, internet e TV, metade puxada no improviso. Se a luz cai, cai o morro inteiro.' },
      { id: 'vista', x: 0.38, y: 0.83, rotulo: 'A cidade lá embaixo', voz: 'INTUIÇÃO',
        texto: 'Daqui de cima dá para ver o Cristo, a baía e o asfalto inteiro. Lá de baixo, quase ninguém olha para cá.' },
    ],
    comentarios: [
      { id: 'sentado', x: 0.25, y: 0.78, raio: 0.06, voz: 'MANHA', texto: 'Ele não está só sentado. Está vendo quem sobe e quem desce.' },
      { id: 'topo', x: 0.28, y: 0.62, raio: 0.06, voz: 'PRONTIDÃO', texto: 'Escada estreita, uma saída só. Lugar ruim para ser encurralado.' },
    ],
  },

  cemiterio: {
    detalhes: [
      { id: 'anjo', x: 0.4, y: 0.9, rotulo: 'O anjo', voz: 'OCULTISMO',
        texto: 'Um anjo de mármore chora sobre o túmulo de uma família rica. Faz cem anos que ele chora. Ninguém mais vem visitar.' },
      { id: 'vela', x: 0.47, y: 0.84, rotulo: 'A vela acesa', voz: 'INVESTIGAÇÃO',
        texto: 'Uma vela acesa há pouco, com a cera ainda mole. Alguém esteve aqui esta noite.' },
    ],
    comentarios: [
      { id: 'portao', x: 0.62, y: 0.82, raio: 0.07, voz: 'A FOME', texto: 'Aqui só tem sangue velho, e velho demais.' },
      { id: 'tumulos', x: 0.8, y: 0.84, raio: 0.08, voz: 'PRONTIDÃO', texto: 'Os túmulos fazem um labirinto. Bom para sumir. Bom também para ser seguido.' },
    ],
  },

  porto: {
    detalhes: [
      { id: 'museu', x: 0.38, y: 0.73, rotulo: 'O Museu do Amanhã', voz: 'CIÊNCIA',
        texto: 'Um esqueleto branco de aço que se abre sobre a baía, feito por Santiago Calatrava. Fala do futuro. Você já tem tempo de sobra para ele.' },
      { id: 'mural', x: 0.86, y: 0.69, rotulo: 'O mural', voz: 'ACADÊMICOS',
        texto: 'Rostos enormes pintados no armazém. Ali perto ficava o Cais do Valongo, por onde chegaram centenas de milhares de africanos escravizados.' },
      { id: 'vlt', x: 0.73, y: 0.68, rotulo: 'O VLT', voz: 'PRONTIDÃO',
        texto: 'O VLT passa quase sem barulho. É a única coisa nesta orla que chega sem avisar.' },
    ],
    comentarios: [
      { id: 'cais', x: 0.3, y: 0.79, raio: 0.08, voz: 'INTUIÇÃO', texto: 'Esta água viu muita gente chegar à força. Ainda pesa.' },
      { id: 'casal', x: 0.2, y: 0.82, raio: 0.07, voz: 'A FOME', texto: 'Dois. Distraídos um com o outro.' },
    ],
  },

  baixada: {
    detalhes: [
      { id: 'birosca', x: 0.22, y: 0.82, rotulo: 'A birosca', voz: 'MANHA',
        texto: 'Luz vermelha, cerveja quente e o dono que conhece todo mundo pelo apelido. Quem quer saber o que acontece no bairro pergunta aqui.' },
      { id: 'trem', x: 0.74, y: 0.74, rotulo: 'O trem', voz: 'PRONTIDÃO',
        texto: 'O último trem passa atrás do muro, lotado mesmo de madrugada. Ninguém olha pela janela.' },
      { id: 'moto', x: 0.37, y: 0.84, rotulo: 'A moto', voz: 'CONDUÇÃO',
        texto: 'Mototáxi de farol alto. Leva qualquer um a qualquer lugar e não pergunta nada. Bom para saber.' },
    ],
    comentarios: [
      { id: 'esquina', x: 0.42, y: 0.66, raio: 0.07, voz: 'INTUIÇÃO', texto: 'O rapaz da moto diminuiu ao passar. Olhou demais.' },
      { id: 'escuro', x: 0.86, y: 0.86, raio: 0.08, voz: 'A FOME', texto: 'Rua sem poste. A Fome gosta de rua sem poste.' },
    ],
  },

  niteroi: {
    detalhes: [
      { id: 'mac', x: 0.4, y: 0.64, rotulo: 'O MAC', voz: 'ACADÊMICOS',
        texto: 'O Museu de Arte Contemporânea, de Oscar Niemeyer, pousado na pedra como um disco voador. Lá dentro, as janelas mostram o Rio inteiro.' },
      { id: 'baia', x: 0.74, y: 0.65, rotulo: 'A baía', voz: 'INTUIÇÃO',
        texto: 'Do outro lado da baía, o Rio brilha. De lá, Niterói é só uma linha de luzes. Daqui, quem parece pequeno é o Rio.' },
    ],
    comentarios: [
      { id: 'espelho', x: 0.35, y: 0.62, raio: 0.08, voz: 'PRONTIDÃO', texto: 'O espelho d\'água reflete o museu inteiro. O seu reflexo sai borrado. Ainda bem que está escuro.' },
      { id: 'barca', x: 0.78, y: 0.66, raio: 0.08, voz: 'MANHA', texto: 'A última barca para o Rio sai à meia-noite e meia. Depois, só pela ponte.' },
    ],
  },
};

// Mais descobertas por lugar: cada noite mostra só uma parte delas (escolhidas pelo número da noite),
// para a cena não ser igual em todas as noites.
const MAIS = {
  lapa: {
    detalhes: [
      { id: 'selaron', x: 0.04, y: 0.8, rotulo: 'Azulejos no chão', voz: 'ACADÊMICOS',
        texto: 'Cacos de azulejo colorido grudados num degrau. Vieram da Escadaria Selarón, aqui do lado, que um artista chileno cobriu de azulejos durante vinte anos.' },
      { id: 'garrafa', x: 0.66, y: 0.7, rotulo: 'A garrafa', voz: 'PRONTIDÃO',
        texto: 'Uma garrafa quebrada no meio-fio, com o gargalo ainda inteiro. Alguém saiu daqui com pressa, ou com raiva.' },
    ],
    comentarios: [
      { id: 'samba', x: 0.5, y: 0.75, raio: 0.1, voz: 'PERFORMANCE', texto: 'Um samba sai de algum bar. O cavaquinho está meio tom abaixo, e ninguém liga.' },
      { id: 'policia', x: 0.66, y: 0.68, raio: 0.08, voz: 'PRONTIDÃO', texto: 'Viatura parada na esquina, motor ligado. Melhor não olhar demais.' },
    ],
  },
  'santa-teresa': {
    detalhes: [
      { id: 'escadinha', x: 0.05, y: 0.82, rotulo: 'A escadinha', voz: 'ATLETISMO',
        texto: 'Degraus de pedra gastos, subindo entre as casas. Atalho de morador, íngreme e escuro. Dá para sumir por aqui em segundos.' },
      { id: 'grade', x: 0.5, y: 0.76, rotulo: 'O portão de ferro', voz: 'INVESTIGAÇÃO',
        texto: 'Um portão de ferro trabalhado, com cadeado novo num casarão velho. Alguém ainda tem algo a guardar aí dentro.' },
    ],
    comentarios: [
      { id: 'cachorro', x: 0.45, y: 0.8, raio: 0.1, voz: 'A FOME', texto: 'Um cachorro late num quintal. Os animais sempre sabem.' },
      { id: 'atelie', x: 0.12, y: 0.82, raio: 0.08, voz: 'INTUIÇÃO', texto: 'Luz acesa num ateliê. Artista trabalha de madrugada. Ninguém estranha quem anda acordado aqui.' },
    ],
  },
  centro: {
    detalhes: [
      { id: 'cartaz', x: 0.75, y: 0.7, rotulo: 'O cartaz', voz: 'POLÍTICA',
        texto: 'Um cartaz de protesto colado no poste, já meio rasgado: "O Centro é do povo". Embaixo, outro, de um show de pagode.' },
      { id: 'pombos', x: 0.45, y: 0.78, rotulo: 'Os pombos', voz: 'SOBREVIVÊNCIA',
        texto: 'Os pombos dormem nas cornijas do teatro. Nenhum se mexe quando você passa. Bicho dormindo não sente perigo.' },
    ],
    comentarios: [
      { id: 'vazio', x: 0.6, y: 0.75, raio: 0.1, voz: 'INTUIÇÃO', texto: 'De madrugada, o Centro parece abandonado. Por isso mesmo, quem está acordado aqui está procurando alguma coisa.' },
      { id: 'janela', x: 0.2, y: 0.78, raio: 0.08, voz: 'PRONTIDÃO', texto: 'O bonde parado está com uma janela aberta. Dentro, ninguém. Ou ninguém à vista.' },
    ],
  },
  'zona-sul': {
    detalhes: [
      { id: 'quiosque', x: 0.06, y: 0.64, rotulo: 'O quiosque', voz: 'MANHA',
        texto: 'O quiosque fecha tarde e abre cedo. O dono vê tudo o que passa no calçadão e só conta para quem paga a conta.' },
      { id: 'pegadas', x: 0.78, y: 0.82, rotulo: 'Pegadas na areia', voz: 'INVESTIGAÇÃO',
        texto: 'Pegadas descalças indo para o mar. Nenhuma voltando. Deve ter sido a maré. Deve.' },
    ],
    comentarios: [
      { id: 'corredor', x: 0.45, y: 0.62, raio: 0.09, voz: 'ATLETISMO', texto: 'Um corredor passa de fone, sem olhar para os lados. Fácil. Fácil demais.' },
      { id: 'predios', x: 0.85, y: 0.82, raio: 0.09, voz: 'INTUIÇÃO', texto: 'As luzes dos prédios apagam uma a uma. A orla fica para quem não dorme.' },
    ],
  },
  barra: {
    detalhes: [
      { id: 'palmeira', x: 0.06, y: 0.77, rotulo: 'As palmeiras', voz: 'ACADÊMICOS',
        texto: 'Palmeiras plantadas em fila, todas da mesma idade. A Barra foi desenhada em prancheta nos anos 1970: tudo aqui é novo e reto.' },
      { id: 'carro', x: 0.4, y: 0.72, rotulo: 'O carro parado', voz: 'CONDUÇÃO',
        texto: 'Um carro importado parado no acostamento, pisca-alerta ligado, ninguém dentro. Chave na ignição.' },
    ],
    comentarios: [
      { id: 'vento', x: 0.45, y: 0.85, raio: 0.1, voz: 'SOBREVIVÊNCIA', texto: 'O vento vem da lagoa com cheiro de mangue. Nenhum cheiro de gente por perto.' },
      { id: 'condo', x: 0.12, y: 0.73, raio: 0.08, voz: 'FINANÇAS', texto: 'Cada apartamento desses vale uma vida inteira de quem passa a pé por aqui.' },
    ],
  },
  'zona-norte': {
    detalhes: [
      { id: 'bandeira', x: 0.62, y: 0.65, rotulo: 'As cores da escola', voz: 'PERFORMANCE',
        texto: 'Azul e branco pintados na parede da quadra. A comunidade inteira veste essas cores em fevereiro, até quem jura que não gosta de samba.' },
      { id: 'trem', x: 0.47, y: 0.68, rotulo: 'O trem no viaduto', voz: 'PRONTIDÃO',
        texto: 'O trem passa no viaduto e o chão treme. Por alguns segundos, ninguém escuta nada aqui embaixo.' },
    ],
    comentarios: [
      { id: 'tamborim', x: 0.58, y: 0.66, raio: 0.08, voz: 'PERFORMANCE', texto: 'O tamborim errou a entrada. O mestre de bateria vai cobrar.' },
      { id: 'vendedor', x: 0.84, y: 0.76, raio: 0.08, voz: 'INTUIÇÃO', texto: 'O vendedor de frutas guarda o dinheiro na meia. Já foi assaltado antes.' },
    ],
  },
  morro: {
    detalhes: [
      { id: 'grafite', x: 0.3, y: 0.62, rotulo: 'O muro pintado', voz: 'MANHA',
        texto: 'Um nome pintado no muro, com data e uma cruz. Homenagem a alguém da comunidade. Aqui todo mundo sabe quem foi.' },
      { id: 'radio', x: 0.37, y: 0.82, rotulo: 'O rádio', voz: 'PERFORMANCE',
        texto: 'Um rádio toca funk baixinho numa laje. O grave atravessa as paredes de tijolo e chega até a escada.' },
    ],
    comentarios: [
      { id: 'olheiro', x: 0.3, y: 0.7, raio: 0.06, voz: 'PRONTIDÃO', texto: 'Um assobio lá em cima, e outro responde. Já sabem que você está subindo.' },
      { id: 'rede', x: 0.32, y: 0.66, raio: 0.06, voz: 'A FOME', texto: 'Janela aberta, alguém dormindo de rede. A Fome conta os passos até lá.' },
    ],
  },
  cemiterio: {
    detalhes: [
      { id: 'flores', x: 0.75, y: 0.86, rotulo: 'As flores', voz: 'INTUIÇÃO',
        texto: 'Flores frescas num túmulo de cem anos. Alguém ainda lembra. Ou alguém ainda deve.' },
      { id: 'corrente', x: 0.6, y: 0.82, rotulo: 'O cadeado', voz: 'FURTO',
        texto: 'O cadeado do portão é velho e a corrente está frouxa. Quem quer entrar à noite, entra.' },
    ],
    comentarios: [
      { id: 'coruja', x: 0.5, y: 0.82, raio: 0.09, voz: 'SOBREVIVÊNCIA', texto: 'Uma coruja olha você de cima de uma cruz. Ela não foge.' },
      { id: 'terra', x: 0.88, y: 0.88, raio: 0.08, voz: 'OCULTISMO', texto: 'Terra revirada há pouco num canto. Enterro de hoje, ou coisa pior.' },
    ],
  },
  porto: {
    detalhes: [
      { id: 'navio', x: 0.2, y: 0.8, rotulo: 'O navio ao longe', voz: 'PRONTIDÃO',
        texto: 'Um navio cargueiro espera para atracar, todo aceso. Contêiner entra e sai deste porto sem ninguém abrir metade deles.' },
      { id: 'maua', x: 0.62, y: 0.82, rotulo: 'A Praça Mauá', voz: 'ACADÊMICOS',
        texto: 'Até 2013, um viaduto escuro passava por cima desta orla. Derrubaram, e o porto virou cartão-postal. As ruas de trás continuam as mesmas.' },
    ],
    comentarios: [
      { id: 'sino', x: 0.4, y: 0.72, raio: 0.09, voz: 'INTUIÇÃO', texto: 'Um sino de navio toca longe, na baía. Alguém chegando de madrugada.' },
      { id: 'porta', x: 0.95, y: 0.85, raio: 0.08, voz: 'MANHA', texto: 'Armazém de porta entreaberta. Aqui, quem entra sem ser chamado não sai contando.' },
    ],
  },
  baixada: {
    detalhes: [
      { id: 'gato', x: 0.55, y: 0.7, rotulo: 'A ligação clandestina', voz: 'TECNOLOGIA',
        texto: 'Fios puxados do poste para três casas, com fita isolante. Gato de luz. Quando chove forte, falta luz na rua toda.' },
      { id: 'igreja', x: 0.45, y: 0.62, rotulo: 'A placa da igreja', voz: 'INTUIÇÃO',
        texto: 'Uma placa pintada à mão: "Culto de libertação, sexta 19h". Aqui, quem promete expulsar demônio enche o salão.' },
    ],
    comentarios: [
      { id: 'resolve', x: 0.22, y: 0.82, raio: 0.08, voz: 'MANHA', texto: 'Ninguém aqui chama a polícia. Resolve na birosca.' },
      { id: 'cachorros', x: 0.62, y: 0.72, raio: 0.09, voz: 'A FOME', texto: 'Os cachorros da rua param de latir quando você passa. Todos ao mesmo tempo.' },
    ],
  },
  niteroi: {
    detalhes: [
      { id: 'rampa', x: 0.2, y: 0.64, rotulo: 'A rampa vermelha', voz: 'ACADÊMICOS',
        texto: 'A rampa vermelha sobe em curva até a entrada do museu. Niemeyer dizia que a linha reta não tinha graça.' },
      { id: 'pescador', x: 0.9, y: 0.75, rotulo: 'A vara de pesca', voz: 'SOBREVIVÊNCIA',
        texto: 'Uma vara de pesca esquecida na mureta, com a linha ainda na água. Do pescador, só o balde vazio.' },
    ],
    comentarios: [
      { id: 'vento', x: 0.6, y: 0.75, raio: 0.1, voz: 'PRONTIDÃO', texto: 'O vento da baía leva qualquer som. Do outro lado, ninguém escuta nada.' },
      { id: 'rio', x: 0.75, y: 0.64, raio: 0.08, voz: 'INTUIÇÃO', texto: 'Visto daqui, o Rio parece tranquilo. Você sabe que não é.' },
    ],
  },
};

// Sorteio fixo: a mesma noite mostra sempre as mesmas descobertas; outra noite, outras.
function embaralhar(lista, semente) {
  const r = [...lista];
  let a = semente >>> 0;
  const aleatorio = () => { // mulberry32: sementes vizinhas dão sorteios bem diferentes
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// Todas as descobertas do lugar (para o mapa contar quantas faltam).
export function todasDescobertas(id) {
  return [...(DESCOBERTAS[id]?.detalhes || []), ...(MAIS[id]?.detalhes || [])];
}

// Descobertas sem números (pedido do Bruno, 17/10/2026): uma frase em palavras e três brasas que
// acendem em âmbar conforme os detalhes da noite são examinados.
const EXTENSO = ['nenhum', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis'];
export function fraseDescobertas(vistos, total) {
  if (!total) return '';
  if (vistos >= total) return 'tudo visto esta noite';
  if (vistos <= 0) return 'nada visto ainda';
  if (total - vistos === 1) return 'falta um detalhe';
  if (vistos === 1) return 'um detalhe visto';
  return `${EXTENSO[vistos] || vistos} detalhes vistos`;
}

// As brasas em HTML: o passar do mouse, o foco ou um toque mostram a frase (balão do glossário).
export function brasas(vistos, total) {
  if (!total) return '';
  const frase = fraseDescobertas(vistos, total);
  const pontos = Array.from({ length: total }, (_, i) => `<span class="brasa${i < vistos ? ' acesa' : ''}"></span>`).join('');
  return `<span class="termo brasas" tabindex="0" role="img" data-def="Descobertas: ${frase}." aria-label="Descobertas: ${frase}">${pontos}</span>`;
}

export function descobertas(id, noite = 0) {
  const detalhes = todasDescobertas(id);
  const comentarios = [...(DESCOBERTAS[id]?.comentarios || []), ...(MAIS[id]?.comentarios || [])];
  const semente = (noite || 0) * 7919 + [...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0);
  return {
    detalhes: embaralhar(detalhes, semente).slice(0, 3),
    comentarios: embaralhar(comentarios, semente + 1).slice(0, 2),
  };
}

// Detalhes escondidos (rodada 17): só aparecem para quem tem a habilidade no nível pedido. É uma
// leitura da ficha, sem rolar dados (dados, só o motor). Quem não tem a habilidade não vê nada.
// Textos só sobre os lugares, sem nada da crônica.
export const ESCONDIDOS = {
  lapa: [
    { id: 'esc-cartaz', x: 0.27, y: 0.7, raio: 0.09, hab: 'investigacao', nivel: 2, voz: 'INVESTIGAÇÃO', texto: 'O cartaz do show na pilastra foi colado por cima de outro, mais novo. Alguém quis esconder a data.' },
    { id: 'esc-ponto', x: 0.86, y: 0.8, raio: 0.09, hab: 'manha', nivel: 3, voz: 'MANHA', texto: 'O vendedor de bala na esquina não vende bala. Ele conta quem entra e quem sai do bar.' },
  ],
  centro: [
    { id: 'esc-marquise', x: 0.82, y: 0.76, raio: 0.09, hab: 'prontidao', nivel: 2, voz: 'PRONTIDÃO', texto: 'Debaixo da marquise, uma câmera de segurança está virada para a parede. Alguém mexeu nela.' },
  ],
  'santa-teresa': [
    { id: 'esc-simbolo', x: 0.2, y: 0.82, raio: 0.09, hab: 'ocultismo', nivel: 2, voz: 'OCULTISMO', texto: 'Na soleira do casarão, um desenho de giz quase apagado: um círculo com três traços. Proteção, das antigas.' },
  ],
  'zona-sul': [
    { id: 'esc-pegadas', x: 0.52, y: 0.78, raio: 0.09, hab: 'prontidao', nivel: 2, voz: 'PRONTIDÃO', texto: 'Na areia molhada, pegadas descalças vão até a água e não voltam.' },
  ],
  barra: [
    { id: 'esc-carro', x: 0.3, y: 0.8, raio: 0.09, hab: 'investigacao', nivel: 2, voz: 'INVESTIGAÇÃO', texto: 'O carro parado no acostamento está com o motor quente e ninguém dentro.' },
  ],
  'zona-norte': [
    { id: 'esc-recado', x: 0.62, y: 0.7, raio: 0.09, hab: 'manha', nivel: 2, voz: 'MANHA', texto: 'O pichado novo no muro da quadra é recado de quem manda na área: daqui pra frente, só com licença.' },
  ],
  morro: [
    { id: 'esc-olheiro', x: 0.3, y: 0.7, raio: 0.09, hab: 'prontidao', nivel: 2, voz: 'PRONTIDÃO', texto: 'Na laje de cima, uma brasa de cigarro acende e apaga. Tem alguém olhando a escada.' },
  ],
  cemiterio: [
    { id: 'esc-flores', x: 0.48, y: 0.86, raio: 0.09, hab: 'ocultismo', nivel: 2, voz: 'OCULTISMO', texto: 'As flores do túmulo estão frescas, mas viradas de cabeça para baixo. Isso não é homenagem.' },
  ],
  porto: [
    { id: 'esc-container', x: 0.9, y: 0.86, raio: 0.09, hab: 'investigacao', nivel: 2, voz: 'INVESTIGAÇÃO', texto: 'O cadeado do armazém é novo, mas a corrente está cortada por dentro.' },
  ],
  baixada: [
    { id: 'esc-moto', x: 0.45, y: 0.8, raio: 0.09, hab: 'manha', nivel: 2, voz: 'MANHA', texto: 'O motoboy passa duas vezes pela mesma esquina sem entregar nada. Está levando recado.' },
  ],
  niteroi: [
    { id: 'esc-pescador', x: 0.85, y: 0.74, raio: 0.09, hab: 'intuicao', nivel: 2, voz: 'INTUIÇÃO', texto: 'O pescador na mureta não olha para a linha. Olha para a barca que chega.' },
  ],
};

// Os escondidos que este personagem percebe, pela habilidade da ficha.
export function escondidosPara(lugarId, habilidades = {}) {
  return (ESCONDIDOS[lugarId] || []).filter((e) => (habilidades[e.hab] | 0) >= e.nivel);
}

// Descobertas que dão vantagem (rodada 18): o detalhe examinado (ou o escondido percebido) liga-se a
// uma opção da noite pelas palavras dela, ou à caçada. A opção ganha a marca dourada e, se escolhida,
// leva a nota "[vantagem: …]" no plano, para o Narrador decidir no fechamento (pode dar um dado a mais).
// Na caçada pela sombra, a atenção da rua sobe mais devagar perto do detalhe.
export const VANTAGENS = {
  lapa: {
    chapa: { termos: ['bar', 'dono', 'balcao', 'antonio', 'perguntar'], nota: 'sabe quem trabalha no balcão do bar e a que horas' },
    garrafa: { cacada: true, nota: 'achou um canto sem luz atrás das mesas do bar' },
  },
  centro: { cartaz: { termos: ['investigar', 'pesquisar', 'procurar', 'teatro', 'cartaz'], nota: 'leu no cartaz quem frequenta o teatro à noite' } },
  'santa-teresa': { grade: { cacada: true, nota: 'viu que o portão de ferro dá para um quintal escuro' } },
  'zona-sul': { quiosque: { termos: ['quiosque', 'bar', 'perguntar', 'procurar'], nota: 'sabe que o dono do quiosque vê tudo o que acontece na orla' } },
  barra: { carro: { cacada: true, nota: 'reparou que o acostamento fica sem luz entre dois postes' } },
  'zona-norte': { frutas: { termos: ['feira', 'barraca', 'perguntar', 'procurar'], nota: 'sabe que a dona da barraca conhece todo mundo na rua' } },
  morro: { fios: { cacada: true, nota: 'viu que a luz da escada cai quando chove' } },
  cemiterio: { corrente: { termos: ['portao', 'entrar', 'capela', 'tumulo'], nota: 'viu que o cadeado do portão lateral está aberto' } },
  porto: { navio: { termos: ['cais', 'navio', 'porto', 'agua', 'barco'], nota: 'sabe a hora em que o navio grande sai' } },
  baixada: { gato: { cacada: true, nota: 'viu que a rua de trás fica no escuro por causa do gato de luz' } },
  niteroi: { pescador: { termos: ['mureta', 'pescador', 'barca', 'mar'], nota: 'sabe que o pescador da mureta vê quem chega de barca' } },
};
// Os escondidos também podem trazer vantagem (pelo id do escondido).
export const VANTAGENS_ESCONDIDOS = {
  'esc-cartaz': { termos: ['investigar', 'pesquisar', 'procurar', 'show', 'cartaz'], nota: 'viu que o cartaz do show esconde outro, com outra data' },
  'esc-ponto': { termos: ['procurar', 'alguem', 'perguntar', 'seguir', 'homem'], nota: 'sabe que o vendedor de bala vigia quem entra no bar' },
  'esc-marquise': { cacada: true, nota: 'viu que a câmera da marquise está virada para a parede' },
  'esc-olheiro': { termos: ['subir', 'escada', 'topo', 'procurar'], nota: 'sabe que tem alguém vigiando a escada da laje de cima' },
};
