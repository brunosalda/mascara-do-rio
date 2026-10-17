// Textos da progressão, escritos pelo roteirista em gerencia/progressao-textos.md (gerado a partir dele).
// Pedidos do elenco, feitos com títulos, falas "de casa", níveis do nome no bairro e degraus da idade.
export const PEDIDOS = {
  "sambista": {
    "nome": "Sambista",
    "fala": "Meu pandeiro sumiu na roda de ontem. Sem ele, não tem samba.",
    "resolver": "perguntar na roda (Carisma + Manha) ou procurar nos bares (Raciocínio + Prontidão). O pandeiro está com um rapaz que o penhorou num bar.",
    "recompensa": "1 favor e nome no bairro.",
    "dobra": "Humanidade (devolver sem humilhar o rapaz).",
    "fioSolto": false
  },
  "dona-do-bar": {
    "nome": "Dona do bar",
    "fala": "Tem um cara que senta toda noite na mesma mesa e não pede nada. Descobre o que ele quer.",
    "resolver": "observar (Raciocínio + Intuição), puxar conversa (Manipulação + Lábia) ou segui-lo quando ele sai (Destreza + Furtividade). Ele anota as placas dos carros que param na frente.",
    "recompensa": "1 favor e nome no bairro.",
    "dobra": "Máscara (ele anota tudo, inclusive você).",
    "fioSolto": true
  },
  "seguranca-theatro": {
    "nome": "Segurança do Theatro",
    "fala": "Alguém picha a porta lateral toda madrugada. Me ajuda a pegar?",
    "resolver": "vigiar a porta (Raciocínio + Prontidão) e seguir o pichador (Destreza + Furtividade). É um estudante de arte.",
    "recompensa": "nome no bairro e a Lanterna de bolso.",
    "dobra": "Máscara (a câmera da lateral grava você também).",
    "fioSolto": false
  },
  "musico-de-rua": {
    "nome": "Músico de rua",
    "fala": "Levaram minha caixinha com o dinheiro da noite. Foi um de boné, correu pra Carioca.",
    "resolver": "correr atrás (Destreza + Atletismo) ou achar pelo bairro (Raciocínio + Manha). Depois, convencer o ladrão a devolver (Persuasão ou Intimidação).",
    "recompensa": "1 favor.",
    "dobra": "Fome (o ladrão está sozinho num beco escuro).",
    "fioSolto": false
  },
  "motorneiro": {
    "nome": "Motorneiro",
    "fala": "Tem gente andando nos trilhos de madrugada. O primeiro bonde vai pegar alguém.",
    "resolver": "vigiar a linha (Raciocínio + Prontidão). É um senhor confuso que procura a casa onde morava. Levá-lo para casa pede Carisma + Persuasão, ou Inteligência + Medicina para perceber que ele precisa de cuidado.",
    "recompensa": "1 favor e nome no bairro.",
    "dobra": "Humanidade.",
    "fioSolto": false
  },
  "senhora-cachorro": {
    "nome": "Senhora com cachorro",
    "fala": "Meu cachorro fugiu na ladeira. Ele nunca fez isso.",
    "resolver": "rastrear (Raciocínio + Sobrevivência) e acalmar o bicho (Carisma + Trato com Animais).",
    "recompensa": "1 favor, e ela passa a chamar você para o café (nome no bairro).",
    "dobra": "o cachorro fugiu de medo de você. Trazê-lo de volta é encarar isso.",
    "fioSolto": false
  },
  "quiosqueiro": {
    "nome": "Dono do quiosque",
    "fala": "Um grupo vem toda noite, consome e sai sem pagar. Me ajuda a cobrar.",
    "resolver": "Persuasão, Lábia ou Intimidação, sem briga no calçadão.",
    "recompensa": "1 favor.",
    "dobra": "Máscara (briga na orla vira vídeo).",
    "fioSolto": false
  },
  "corredora": {
    "nome": "Corredora",
    "fala": "Tem alguém me seguindo nas últimas noites. Corre comigo hoje?",
    "resolver": "correr junto (Vigor + Atletismo), observar (Raciocínio + Prontidão) e confrontar quem segue (Intimidação). É um homem de moto, que some quando você aparece.",
    "recompensa": "nome no bairro.",
    "dobra": "Fome (ela está sozinha e confia em você).",
    "fioSolto": true
  },
  "porteiro": {
    "nome": "Porteiro",
    "fala": "Sumiu uma encomenda da portaria, e o morador diz que fui eu.",
    "resolver": "ver a gravação (Inteligência + Tecnologia) ou perguntar ao entregador (Manipulação + Lábia). O vizinho do lado pegou por engano.",
    "recompensa": "1 favor, e ele deixa você entrar no prédio (nome no bairro).",
    "dobra": "Máscara (a gravação também mostra você).",
    "fioSolto": false
  },
  "ciclista": {
    "nome": "Ciclista",
    "fala": "Furou o pneu e o celular tá morrendo. Me empresta o seu?",
    "resolver": "emprestar o celular, consertar o pneu (Destreza + Ofícios) ou levá-lo até um ponto seguro.",
    "recompensa": "nome no bairro.",
    "dobra": "Fome e Humanidade (ele está sozinho, longe de casa, e ninguém viu você chegar).",
    "fioSolto": false
  },
  "feirante": {
    "nome": "Feirante",
    "fala": "Ajuda a guardar a barraca antes que apaguem a luz do viaduto? Minha coluna não aguenta.",
    "resolver": "carregar (Força + Atletismo) sem mostrar força demais (Autocontrole).",
    "recompensa": "1 favor.",
    "dobra": "Máscara (ninguém carrega três caixas de uma vez).",
    "fioSolto": false
  },
  "rapaz-bola": {
    "nome": "Rapaz da bola",
    "fala": "Falta um pro time. Joga com a gente?",
    "resolver": "jogar (Destreza + Atletismo) sem correr rápido demais (Autocontrole + Atletismo).",
    "recompensa": "nome no bairro.",
    "dobra": "Máscara (um tombo e um joelho ralado que não sangra).",
    "fioSolto": false
  },
  "mototaxista": {
    "nome": "Mototaxista",
    "fala": "Leva essa marmita lá em cima pra minha mãe? Não posso sair do ponto.",
    "resolver": "subir (Vigor + Atletismo) e achar a casa (Raciocínio + Manha). A mãe oferece café, e você precisa fingir que bebe (Rubor da Vida, um Despertar).",
    "recompensa": "1 favor e nome no bairro.",
    "dobra": "Máscara e Humanidade.",
    "fioSolto": false
  },
  "mulher-laje": {
    "nome": "Mulher na laje",
    "fala": "Meu filho tá com febre e eu não posso descer. Busca o remédio na farmácia 24 horas?",
    "resolver": "descer, comprar e voltar antes que feche (Vigor + Atletismo). Se a receita estiver vencida, é preciso convencer o farmacêutico (Manipulação + Persuasão).",
    "recompensa": "1 favor e nome no bairro.",
    "dobra": "Humanidade (um favor sem preço nenhum).",
    "fioSolto": false
  },
  "coveiro": {
    "nome": "Coveiro",
    "fala": "Alguém deixa flores frescas no túmulo errado toda madrugada. Quero saber quem.",
    "resolver": "esperar escondido (Raciocínio + Furtividade) e seguir quem vem (Destreza + Furtividade). É uma mulher que leva flores a um túmulo sem nome.",
    "recompensa": "1 favor.",
    "dobra": "os mortos (alguém visita um túmulo onde talvez não haja ninguém).",
    "fioSolto": true
  },
  "vigia-cemiterio": {
    "nome": "Vigia",
    "fala": "Tem barulho na capela toda meia-noite. Sozinho eu não entro.",
    "resolver": "entrar com ele (Autocontrole + Determinação) e procurar (Raciocínio + Investigação). São gatos e um homem que dorme na capela para fugir da chuva.",
    "recompensa": "nome no bairro, e ele deixa você entrar depois que o portão fecha.",
    "dobra": "ele estranha que você não tenha medo nenhum do escuro.",
    "fioSolto": false
  },
  "estivador": {
    "nome": "Estivador",
    "fala": "O navio atrasou e falta gente pra descarregar. Pago em dinheiro, sem pergunta.",
    "resolver": "trabalhar (Força + Atletismo) sem mostrar força demais (Autocontrole).",
    "recompensa": "1 favor e nome no bairro.",
    "dobra": "Máscara.",
    "fioSolto": true
  },
  "grafiteiro": {
    "nome": "Grafiteiro",
    "fala": "Apagaram meu mural com tinta cinza. Me ajuda a refazer antes do sol?",
    "resolver": "vigiar enquanto ele pinta (Raciocínio + Prontidão) ou ajudar a pintar (Destreza + Ofícios).",
    "recompensa": "1 favor e nome no bairro.",
    "dobra": "o sol (vocês precisam terminar antes de clarear).",
    "fioSolto": false
  },
  "dono-bar-esquina": {
    "nome": "Dono do bar da esquina",
    "fala": "Um cliente deixou uma conta grande e sumiu. Não quero briga, quero o dinheiro.",
    "resolver": "achar o cliente (Raciocínio + Manha) e convencer (Persuasão) ou assustar (Intimidação).",
    "recompensa": "1 favor e nome no bairro.",
    "dobra": "Fome (o devedor está sozinho em casa, bêbado).",
    "fioSolto": false
  },
  "churrasqueiro": {
    "nome": "Vendedor de churrasquinho",
    "fala": "O botijão tá vazando e ninguém quer chegar perto. Me ajuda a levar até o posto?",
    "resolver": "carregar (Força + Atletismo) perto da grelha acesa sem entrar em pânico (Autocontrole + Determinação, contra o terror do fogo).",
    "recompensa": "1 favor e um espetinho por conta da casa, que você não pode comer.",
    "dobra": "fogo.",
    "fioSolto": false
  },
  "pescador": {
    "nome": "Pescador",
    "fala": "Minha rede enganchou nas pedras lá embaixo. Na minha idade, eu não desço.",
    "resolver": "descer as pedras molhadas (Destreza + Atletismo). Vampiro não precisa respirar, então dá para mergulhar o tempo que for, se ninguém estiver olhando.",
    "recompensa": "1 favor e nome no bairro.",
    "dobra": "Máscara.",
    "fioSolto": false
  },
  "fotografo": {
    "nome": "Fotógrafo",
    "fala": "Levaram meu cartão de memória com o trabalho da semana. O cara correu pras barcas.",
    "resolver": "alcançar o ladrão (Destreza + Atletismo) ou achá-lo na estação (Raciocínio + Manha).",
    "recompensa": "1 favor.",
    "dobra": "Máscara.",
    "fioSolto": true
  },
  "taxista": {
    "nome": "Taxista",
    "fala": "Tô aqui há seis horas sem corrida. Me arruma um passageiro que eu te levo de graça.",
    "resolver": "convencer alguém a pegar o táxi (Carisma + Persuasão).",
    "recompensa": "uma corrida de graça (troca de bairro sem custo, uma vez) e nome no bairro.",
    "dobra": "nenhuma. É o pedido leve do aeroporto.",
    "fioSolto": false
  },
  "viajante": {
    "nome": "Viajante",
    "fala": "Meu voo foi cancelado e o hotel não tem vaga. Sabe onde dá pra ficar seguro?",
    "resolver": "indicar um lugar e levá-la até lá (Raciocínio + Manha).",
    "recompensa": "1 favor e nome no bairro.",
    "dobra": "Fome e Humanidade (ela está sozinha, perdida e confia em você).",
    "fioSolto": false
  }
};
export const FEITOS = [
  {
    "n": 1,
    "nome": "Becos da Lapa",
    "como": "Visitar todos os pontos da Lapa",
    "titulo": "Conhece cada beco da Lapa"
  },
  {
    "n": 2,
    "nome": "Noites da Cinelândia",
    "como": "Visitar todos os pontos do Centro",
    "titulo": "Sombra da Cinelândia"
  },
  {
    "n": 3,
    "nome": "Ladeira acima",
    "como": "Visitar todos os pontos de Santa Teresa",
    "titulo": "Sobe a ladeira sem cansar"
  },
  {
    "n": 4,
    "nome": "Orla vazia",
    "como": "Visitar todos os pontos da Zona Sul",
    "titulo": "Conhece a orla de madrugada"
  },
  {
    "n": 5,
    "nome": "Atrás dos muros",
    "como": "Visitar todos os pontos da Barra",
    "titulo": "Passa por qualquer portaria"
  },
  {
    "n": 6,
    "nome": "Subúrbio",
    "como": "Visitar todos os pontos da Zona Norte",
    "titulo": "De casa no subúrbio"
  },
  {
    "n": 7,
    "nome": "Escadaria",
    "como": "Visitar todos os pontos do morro",
    "titulo": "Conhece cada degrau"
  },
  {
    "n": 8,
    "nome": "Entre os túmulos",
    "como": "Visitar todos os pontos do cemitério",
    "titulo": "Amigo dos mortos"
  },
  {
    "n": 9,
    "nome": "Cais",
    "como": "Visitar todos os pontos do porto",
    "titulo": "Rato do cais"
  },
  {
    "n": 10,
    "nome": "Baixada",
    "como": "Visitar todos os pontos da Baixada",
    "titulo": "Conhece a Baixada de cor"
  },
  {
    "n": 11,
    "nome": "Outra margem",
    "como": "Visitar todos os pontos de Niterói",
    "titulo": "Do outro lado da baía"
  },
  {
    "n": 12,
    "nome": "Saguão vazio",
    "como": "Visitar todos os pontos do aeroporto",
    "titulo": "Conhece o aeroporto de noite"
  },
  {
    "n": 13,
    "nome": "Cidade inteira",
    "como": "Visitar todos os lugares do Rio",
    "titulo": "Conhece o Rio inteiro de noite"
  },
  {
    "n": 14,
    "nome": "Primeiro gole",
    "como": "Fazer a primeira caçada bem-sucedida",
    "titulo": "Provou a cidade"
  },
  {
    "n": 15,
    "nome": "Sem rastro",
    "como": "Fazer 5 caçadas bem-sucedidas sem deixar marca",
    "titulo": "Nunca deixou testemunha"
  },
  {
    "n": 16,
    "nome": "Paladar",
    "como": "Caçar com sucesso em 6 lugares diferentes",
    "titulo": "Paladar carioca"
  },
  {
    "n": 17,
    "nome": "Rédea curta",
    "como": "Terminar 3 noites seguidas com a Fome em 1 ou 2",
    "titulo": "Fome na rédea"
  },
  {
    "n": 18,
    "nome": "Com a fera solta",
    "como": "Ter sucesso numa caçada com a Fome em 4 ou mais",
    "titulo": "Mordeu sem perder a cabeça"
  },
  {
    "n": 19,
    "nome": "Primeiro favor",
    "como": "Terminar o primeiro pedido",
    "titulo": "Gente boa"
  },
  {
    "n": 20,
    "nome": "De casa",
    "como": "Chegar a \"De casa\" num bairro",
    "titulo": "Tem nome na rua"
  },
  {
    "n": 21,
    "nome": "Rede",
    "como": "Chegar a \"Conhecido\" em 6 bairros",
    "titulo": "Conhecido em toda parte"
  },
  {
    "n": 22,
    "nome": "História inteira",
    "como": "Terminar todos os pedidos de uma figura",
    "titulo": "Ouviu a história toda"
  },
  {
    "n": 23,
    "nome": "Ainda gente",
    "como": "Terminar 5 noites seguidas sem manchas",
    "titulo": "Ainda humano"
  },
  {
    "n": 24,
    "nome": "Dez noites",
    "como": "Jogar 10 noites",
    "titulo": "Sobrevivente da noite"
  },
  {
    "n": 25,
    "nome": "Segurou a Besta",
    "como": "Terminar uma noite com a Fome em 4 sem cair em frenesi",
    "titulo": "Segurou a Besta"
  },
  {
    "n": 26,
    "nome": "Teto",
    "como": "Melhorar o refúgio pela primeira vez",
    "titulo": "Tem onde cair morto"
  },
  {
    "n": 27,
    "nome": "Equipado",
    "como": "Usar os 5 espaços de equipamento ao mesmo tempo",
    "titulo": "Pronto pra qualquer noite"
  },
  {
    "n": 28,
    "nome": "Achado",
    "como": "Ter um item raro",
    "titulo": "Tem coisa boa no bolso"
  },
  {
    "n": 29,
    "nome": "Ponte aérea",
    "como": "Ir a São Paulo e voltar",
    "titulo": "Conhece a ponte aérea"
  },
  {
    "n": 30,
    "nome": "Antes do sol",
    "como": "Voltar de uma viagem e dormir no próprio refúgio na mesma noite",
    "titulo": "Saiu do aeroporto antes do sol"
  }
];
export const FALAS_DE_CASA = {
  "sambista": "Senta na roda, parceiro. Hoje o samba é teu também.",
  "dona-do-bar": "Pra você eu abro a conta. Mas não some, hein.",
  "seguranca-theatro": "Se precisar passar pela lateral, me avisa antes.",
  "musico-de-rua": "Essa aqui eu toco pra você. Ninguém mais pede.",
  "motorneiro": "Sobe que eu te deixo no Largo, mesmo fora de hora.",
  "senhora-cachorro": "Ele já não late pra você. Vai entender.",
  "quiosqueiro": "A tua é por conta da casa. Mesmo que você nunca beba.",
  "corredora": "Agora eu corro tranquila. Você tá sempre por aí, né?",
  "porteiro": "Pode subir. Pra você eu nem interfono.",
  "ciclista": "Quando passar no Recreio, toca a campainha lá de casa.",
  "feirante": "Você nunca leva nada, rapaz. Leva pra alguém, então.",
  "rapaz-bola": "Teu lugar no time tá guardado. Mesmo atrasado.",
  "mototaxista": "Pra você, subir é de graça. Minha mãe mandou.",
  "mulher-laje": "Meu filho melhorou. Quando quiser, tem prato aqui.",
  "coveiro": "Você é o único que me faz companhia. Os outros só vêm de dia.",
  "vigia-cemiterio": "Pode entrar depois do portão. Eu não vi nada.",
  "estivador": "Quando quiser trabalho, é só aparecer. Tua palavra vale aqui.",
  "grafiteiro": "Deixei um canto do mural pra você assinar.",
  "dono-bar-esquina": "Senta aí. Contigo eu falo antes da terceira.",
  "churrasqueiro": "Guardei o melhor espeto. Sei que você não come, mas é teu.",
  "pescador": "Hoje veio peixe. Acho que você me dá sorte.",
  "fotografo": "Prometo: você nunca aparece nas minhas fotos.",
  "taxista": "Precisando correr pra algum lugar, me liga. Qualquer hora.",
  "viajante": "Voltei pro Rio e lembrei de você. Ainda tá por aqui?"
};
export const NIVEIS_NOME_BAIRRO = ["Estranho", "Conhecido", "De casa", "Gente nossa"];
export const DEGRAUS = ["Recém-Abraçado", "Cara nova na noite", "Neonato com nome", "Tem nome nos becos", "Respeitado entre os jovens", "À porta dos antigos"];
