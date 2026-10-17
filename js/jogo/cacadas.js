// Sugestões de caçada por tipo de predador (V5), para quem não sabe o que escrever. Genéricas: nada
// da crônica. O jogador pode escolher uma, caçar do jeito de sempre, escrever outra ou não caçar.

export const SUGESTOES_CACADA = {
  'gato-de-beco': [
    'Emboscar alguém que sai sozinho de um bar, num canto sem luz.',
    'Seguir um bêbado até uma rua vazia.',
    'Esperar na saída do metrô por quem volta tarde para casa.',
  ],
  ensacador: [
    'Comprar bolsas de sangue de um técnico de banco de sangue.',
    'Pegar bolsas vencidas no descarte de um hospital.',
    'Usar as bolsas guardadas na geladeira do refúgio.',
  ],
  sanguessuga: [
    'Beber de um vampiro que me deve um favor.',
    'Procurar um sangue-fraco sozinho e tomar dele à força.',
    'Seguir um carniçal descuidado e beber do sangue que ele carrega.',
  ],
  cutelo: [
    'Visitar alguém da minha antiga família enquanto dorme.',
    'Jantar com um amigo antigo e beber dele quando pegar no sono.',
    'Passar na casa de um parente com uma desculpa e beber sem ele perceber.',
  ],
  consensual: [
    'Beber de alguém que aceita, num encontro combinado.',
    'Ir a uma festa onde há quem ofereça o pescoço de bom grado.',
    'Pagar um doador de confiança, que não faz perguntas.',
  ],
  fazendeiro: [
    'Caçar ratos e gatos de rua num terreno baldio.',
    'Beber dos cavalos de um estábulo, de madrugada.',
    'Comprar animais vivos numa feira e beber no refúgio.',
  ],
  osiris: [
    'Beber de um seguidor que me admira.',
    'Reunir alguns fiéis e escolher um deles.',
    'Chamar um devoto ao refúgio.',
  ],
  sonambulo: [
    'Entrar num apartamento de janela aberta e beber de quem dorme.',
    'Beber de alguém que dorme na rua, debaixo de uma marquise.',
    'Entrar de madrugada num quarto de hotel barato.',
  ],
  'rainha-da-cena': [
    'Beber de alguém da minha turma, numa festa onde todos me conhecem.',
    'Chamar alguém para os bastidores do baile de sempre.',
    'Escolher na pista alguém que quer chamar minha atenção.',
  ],
  sereia: [
    'Seduzir alguém num bar e beber no carro.',
    'Marcar um encontro por aplicativo e beber no fim da noite.',
    'Atrair alguém da pista de dança para um canto escuro.',
  ],
};

export function sugestoesDeCacada(predadorId) {
  return SUGESTOES_CACADA[predadorId] || SUGESTOES_CACADA['gato-de-beco'];
}
