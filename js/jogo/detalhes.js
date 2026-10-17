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

export function descobertas(id) {
  return DESCOBERTAS[id] || { detalhes: [], comentarios: [] };
}
