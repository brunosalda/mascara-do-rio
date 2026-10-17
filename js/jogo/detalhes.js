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
};

export function descobertas(id) {
  return DESCOBERTAS[id] || { detalhes: [], comentarios: [] };
}
