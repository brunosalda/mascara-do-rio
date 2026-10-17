// Criação por conversa: o roteiro das lembranças e a montagem automática da ficha.
// Cada resposta pesa em atributos, habilidades, disciplinas, clãs, vantagens e defeitos;
// no fim, montarFicha() distribui tudo pelas regras da V5. Sem DOM: roda no navegador e no Node.
import * as v5 from './v5.js';

// Abreviação: e({ atr, hab, disc, cla, vant, def }) — pesos somados por resposta.
const e = (pesos) => pesos;

export const FALAS_CLA = {
  brujah: 'A cidade é nossa. Só falta alguém ter coragem de tomar.',
  gangrel: 'Paredes são para quem tem medo do escuro.',
  malkaviano: 'Você também ouviu isso? Não? Que pena.',
  nosferatu: 'Eles não te veem. É por isso que você vê tudo.',
  toreador: 'Tudo isto vai apodrecer. Menos o que é belo.',
  tremere: 'Sangue é só uma língua. E você vai aprender a falar.',
  ventrue: 'Alguém precisa mandar. Que seja quem nasceu para isso.',
  'banu-haqim': 'Todo crime cobra um preço. Alguém tem que cobrar.',
  hecata: 'Os mortos falam. Você só precisa parar de gritar.',
  lasombra: 'A sombra que você projeta é maior que você. Use.',
  ministerio: 'Toda corrente se parte. Basta querer o bastante.',
  ravnos: 'Fique parado e o sol te acha. Corra.',
  salubri: 'Dói em você. Sempre vai doer. É isso que te mantém inteiro.',
  tzimisce: 'Isto é meu. E isto. E você também, se eu quiser.',
  caitiff: 'Ninguém te deu nada. Então nada te prende.',
  'sangue-fraco': 'Quase vivo, quase morto. Livre dos dois.',
};

// Cenas, na ordem. Tipos: 'campos' (texto livre), 'opcoes' (escolha), 'cla' (linhagem), 'fim'.
// {nome}, {bairro} e {touchstone} são trocados pelo que o jogador já respondeu.
export const CENAS = [
  {
    id: 'nome',
    tipo: 'campos',
    texto: `Rio de Janeiro. Esta é a história da sua última noite como uma pessoa comum.

Depois dela, você nunca mais vai ver o sol nascer.

[A CONSCIÊNCIA] Vamos começar pelo começo. Como te chamavam?`,
    campos: [{ id: 'nomeEmVida', rotulo: 'Seu nome em vida', max: 80, obrigatorio: true }],
  },
  {
    id: 'oficio',
    tipo: 'opcoes',
    texto: `**{nome}**. O nome soa estranho agora, como roupa de outra pessoa.

[INTUIÇÃO] E o que você fazia para pagar as contas?`,
    opcoes: [
      { texto: 'Ganhava a vida na rua: camelô, motoboy, segurança, faz-tudo.', dados: { ocupacao: 'Trabalhador da rua' },
        pesos: e({ atr: { forca: 2, raciocinio: 2, vigor: 1 }, hab: { manha: 3, briga: 2, conducao: 2, atletismo: 1, prontidao: 1 }, cla: { brujah: 1, gangrel: 1, caitiff: 1 }, vant: { contatos: 1 } }),
        reacao: '[MANHA] A rua ensina o que nenhuma escola ensina. Você vai precisar disso.' },
      { texto: 'Trabalhava com as mãos e a cabeça: técnico, enfermeira, mecânico, programador.', dados: { ocupacao: 'Técnico' },
        pesos: e({ atr: { inteligencia: 2, destreza: 2, determinacao: 1 }, hab: { tecnologia: 3, medicina: 2, oficios: 2, investigacao: 1, ciencia: 1 }, cla: { tremere: 1, nosferatu: 1, salubri: 1 }, vant: { recursos: 1 } }),
        reacao: '[INTELIGÊNCIA] Mãos firmes, cabeça fria. Coisa rara numa cidade quente.' },
      { texto: 'Vivia da voz e do charme: vendedor, artista, promoter, pastor.', dados: { ocupacao: 'Artista e vendedor' },
        pesos: e({ atr: { carisma: 3, manipulacao: 2 }, hab: { persuasao: 3, performance: 2, labia: 2, etiqueta: 1 }, cla: { toreador: 2, ministerio: 1 }, vant: { fama: 1 } }),
        reacao: '[CARISMA] Todo mundo gostava de você. Quase todo mundo.' },
      { texto: 'Lidava com papel e poder: advogado, servidor, empresário, jornalista.', dados: { ocupacao: 'Profissional liberal' },
        pesos: e({ atr: { inteligencia: 2, manipulacao: 2, autocontrole: 1 }, hab: { politica: 3, financas: 2, academicos: 2, investigacao: 1 }, cla: { ventrue: 2, lasombra: 1 }, vant: { recursos: 1, influencia: 1 } }),
        reacao: '[POLÍTICA] Você já sabia que a cidade tem donos. Só não sabia quem eram.' },
      { texto: 'Andava do lado errado da lei: tráfico, milícia, contrabando, golpe.', dados: { ocupacao: 'Gente do crime' },
        pesos: e({ atr: { forca: 1, manipulacao: 2, raciocinio: 2 }, hab: { intimidacao: 3, 'armas-de-fogo': 2, furto: 2, manha: 1, labia: 1 }, cla: { brujah: 1, 'banu-haqim': 1, ravnos: 1 }, vant: { aliados: 1 }, def: { inimigo: 2 } }),
        reacao: '[INTIMIDAÇÃO] Você já sabia fazer medo. Agora vai fazer de verdade.' },
      { texto: 'Mexia com o invisível: terreiro, cartas, tatuagem, ocultismo.', dados: { ocupacao: 'Iniciado no oculto' },
        pesos: e({ atr: { raciocinio: 2, carisma: 1, determinacao: 2 }, hab: { ocultismo: 3, intuicao: 2, performance: 1, academicos: 1 }, cla: { malkaviano: 1, hecata: 1, tremere: 1, salubri: 1 } }),
        reacao: '[OCULTISMO] Você sempre soube que havia algo lá fora. Agora você é esse algo.' },
    ],
  },
  {
    id: 'bairro',
    tipo: 'opcoes',
    texto: '[MANHA] E de onde você era?',
    opcoes: [
      { texto: 'Zona Norte: Madureira, Tijuca, Penha.', dados: { bairro: 'Madureira' }, pesos: e({ hab: { briga: 1, performance: 1 } }), reacao: '[A CONSCIÊNCIA] Madureira. O samba ainda toca em algum lugar dentro de você.' },
      { texto: 'Zona Sul: Copacabana, Botafogo, Leblon.', dados: { bairro: 'Copacabana' }, pesos: e({ hab: { etiqueta: 1 }, vant: { recursos: 1 } }), reacao: '[A CONSCIÊNCIA] Copacabana. O mar continua lá. Você é que mudou.' },
      { texto: 'Centro e Lapa.', dados: { bairro: 'Lapa' }, pesos: e({ hab: { manha: 1, intuicao: 1 } }), reacao: '[A CONSCIÊNCIA] A Lapa nunca dorme. Agora você também não.' },
      { texto: 'O morro, a comunidade lá em cima.', dados: { bairro: 'Morro' }, pesos: e({ hab: { manha: 1, atletismo: 1 }, vant: { aliados: 1 } }), reacao: '[A CONSCIÊNCIA] Lá de cima, a cidade inteira parece pequena. Parece presa.' },
      { texto: 'Baixada: trem lotado todo dia.', dados: { bairro: 'Baixada' }, pesos: e({ atr: { vigor: 1, determinacao: 1 } }), reacao: '[A CONSCIÊNCIA] Quem aguenta a Central às seis da tarde aguenta qualquer coisa.' },
      { texto: 'Zona Oeste: Barra, Jacarepaguá, Campo Grande.', dados: { bairro: 'Barra' }, pesos: e({ hab: { conducao: 1, financas: 1 } }), reacao: '[A CONSCIÊNCIA] Avenidas largas, condomínios fechados. Muito espaço para sumir.' },
    ],
  },
  {
    id: 'briga',
    tipo: 'opcoes',
    texto: `Uma lembrança aparece sem pedir licença: uma briga de bar, cadeiras voando, alguém gritando seu nome.

[PRONTIDÃO] O que você fez?`,
    opcoes: [
      { texto: 'Parti pra cima antes de todo mundo.', pesos: e({ atr: { forca: 2, vigor: 1 }, hab: { briga: 2, atletismo: 1 }, disc: { potencia: 2, rapidez: 1 }, cla: { brujah: 2, gangrel: 1 } }), reacao: '[A BESTA] Isso. Mais disso.' },
      { texto: 'Sumi antes da primeira garrafa voar.', pesos: e({ atr: { destreza: 2, raciocinio: 1 }, hab: { furtividade: 2, prontidao: 1 }, disc: { ofuscacao: 2, rapidez: 1 }, cla: { nosferatu: 2, ravnos: 1 } }), reacao: '[FURTIVIDADE] Ninguém viu você sair. Ninguém nunca vê.' },
      { texto: 'Acalmei todo mundo com duas palavras.', pesos: e({ atr: { carisma: 1, autocontrole: 2 }, hab: { lideranca: 2, persuasao: 1 }, disc: { presenca: 2, dominacao: 1 }, cla: { ventrue: 2, toreador: 1 } }), reacao: '[LIDERANÇA] As pessoas obedecem quando você fala baixo. Lembre disso.' },
      { texto: 'Fiquei olhando, decorando cada rosto.', pesos: e({ atr: { raciocinio: 1, inteligencia: 1, determinacao: 1 }, hab: { intuicao: 2, investigacao: 1 }, disc: { auspicios: 2 }, cla: { malkaviano: 1, tremere: 1, hecata: 1 } }), reacao: '[INTUIÇÃO] O cara de camisa amarela tinha uma faca. Só você notou.' },
    ],
  },
  {
    id: 'fama',
    tipo: 'opcoes',
    texto: '[A CONSCIÊNCIA] O que diziam de você pelas costas?',
    opcoes: [
      { texto: 'Que eu era bonito demais para prestar.', pesos: e({ atr: { carisma: 2 }, hab: { performance: 1, persuasao: 1 }, disc: { presenca: 1 }, cla: { toreador: 2 }, vant: { beleza: 2 } }), reacao: '[A MÁSCARA] Beleza abre portas. E pescoços.' },
      { texto: 'Que eu não sabia a hora de parar.', pesos: e({ atr: { vigor: 2, determinacao: 1 }, hab: { atletismo: 1, sobrevivencia: 1 }, disc: { fortitude: 2, metamorfose: 1 }, cla: { gangrel: 2, brujah: 1 }, def: { vicio: 1 } }), reacao: '[A BESTA] Parar? Para quê?' },
      { texto: 'Que eu sabia demais da vida dos outros.', pesos: e({ atr: { inteligencia: 1, manipulacao: 1 }, hab: { investigacao: 1, labia: 1, tecnologia: 1 }, disc: { auspicios: 1, ofuscacao: 1 }, cla: { nosferatu: 2, malkaviano: 1 }, vant: { contatos: 2 }, def: { 'segredo-sombrio': 1 } }), reacao: '[INVESTIGAÇÃO] Todo segredo tem um preço. Você sempre soube cobrar.' },
      { texto: 'Que eu ia longe. Ou ia cair de muito alto.', pesos: e({ atr: { manipulacao: 2, autocontrole: 1 }, hab: { politica: 1, financas: 1 }, disc: { dominacao: 2 }, cla: { lasombra: 2, ventrue: 1 }, vant: { recursos: 1, status: 1 }, def: { malvisto: 1 } }), reacao: '[MANIPULAÇÃO] As duas coisas. Você vai subir muito e cair de muito alto.' },
    ],
  },
  {
    id: 'afeto',
    tipo: 'opcoes',
    texto: '[O SANGUE] Quem você tinha?',
    opcoes: [
      { texto: 'Família grande e barulhenta, sempre por perto.', dados: { relacao: 'da família' }, pesos: e({ vant: { aliados: 1 } }), reacao: '[HUMANIDADE] Sua família ainda deixa a luz da varanda acesa para você.' },
      { texto: 'Uma pessoa só, que era tudo para mim.', dados: { relacao: 'o grande amor' }, pesos: e({ atr: { determinacao: 1 } }), reacao: '[HUMANIDADE] Uma pessoa só basta para manter você humano.' },
      { texto: 'A turma da rua, os amigos de sempre.', dados: { relacao: 'amizade de infância' }, pesos: e({ vant: { aliados: 1, contatos: 1 } }), reacao: '[HUMANIDADE] Seus amigos vão perguntar por você. O que você vai dizer?' },
      { texto: 'Ninguém. E estava bem assim.', dados: { relacao: 'alguém que ainda importa, mesmo que pouco' }, pesos: e({ atr: { autocontrole: 1, determinacao: 1 }, def: { 'sem-refugio': 1 } }), reacao: '[A BESTA] Ótimo. Ninguém para chorar.' },
    ],
  },
  {
    id: 'touchstone',
    tipo: 'campos',
    texto: '[HUMANIDADE] Diga um nome. Alguém vivo, que ainda importa. Dizer em voz alta ajuda a não esquecer.',
    campos: [{ id: 'touchstone', rotulo: 'Nome dessa pessoa', max: 80, obrigatorio: true }],
  },
  {
    id: 'abraco',
    tipo: 'opcoes',
    texto: `Então veio a noite do Abraço: a noite em que um vampiro tirou o seu sangue e te deu o dele. Você lembra pouco.

[A FOME] Mas lembra do gosto.

Do que mais você lembra?`,
    opcoes: [
      { texto: 'De um sorriso no meio da multidão de um baile.', pesos: e({ disc: { presenca: 1 }, cla: { toreador: 2, ministerio: 2, ventrue: 1 } }), reacao: '[O SANGUE] Alguém escolheu você. Escolheu com cuidado.' },
      { texto: 'De dentes no escuro de um beco, e de um cheiro de bicho.', pesos: e({ disc: { animalismo: 1 }, cla: { gangrel: 2, nosferatu: 2, tzimisce: 1 } }), reacao: '[O SANGUE] Não foi gentil. Nada do que vem agora vai ser.' },
      { texto: 'De uma voz dentro da cabeça mandando você não gritar.', pesos: e({ disc: { dominacao: 1 }, cla: { tremere: 2, lasombra: 2, malkaviano: 1 } }), reacao: '[O SANGUE] Você obedeceu. Ainda obedece, um pouco.' },
      { texto: 'De uma briga que você estava ganhando. Até não estar mais.', pesos: e({ disc: { rapidez: 1 }, cla: { brujah: 2, 'banu-haqim': 2 } }), reacao: '[O SANGUE] Quem te venceu viu algo em você. Valor, talvez. Ou utilidade.' },
      { texto: 'De velas, de reza, de alguém chorando por um morto.', pesos: e({ disc: { fortitude: 1 }, cla: { hecata: 3, salubri: 1 } }), reacao: '[O SANGUE] O morto era você. Ainda é.' },
      { texto: 'De nada. Acordei sozinho, num lugar estranho, sem ninguém para explicar.', pesos: e({ cla: { caitiff: 3, 'sangue-fraco': 2, ravnos: 1 } }), reacao: '[O SANGUE] Ninguém veio. Ninguém vem. Acostume-se.' },
    ],
  },
  {
    id: 'cla',
    tipo: 'cla',
    texto: `O sangue de quem te Abraçou corre em você agora. Ele vem de uma linhagem, um clã, com nome, história e dívidas.

[O SANGUE] Escute. Ele diz quem você é.`,
  },
  {
    id: 'fome',
    tipo: 'opcoes',
    texto: `Na noite seguinte, veio a primeira fome. Não era fome de comida: era sede de sangue.

[A FOME] E você obedeceu. Como?`,
    opcoes: [
      { texto: 'Arrastei alguém para um beco.', predador: 'gato-de-beco', reacao: '[A BESTA] Rápido. Simples. Delicioso.' },
      { texto: 'Seduzi alguém numa boate.', predador: 'sereia', reacao: '[A MÁSCARA] A pessoa achou que a noite tinha terminado bem. De certo modo, terminou.' },
      { texto: 'Entrei numa casa e bebi de quem dormia.', predador: 'sonambulo', reacao: '[FURTIVIDADE] Quem dormia acordou cansado. Só isso, desta vez.' },
      { texto: 'Bebi de alguém que eu conhecia. Essa pessoa nunca soube.', predador: 'cutelo', reacao: '[HUMANIDADE] Você vai sentar à mesa com essa pessoa no domingo. E sorrir.' },
      { texto: 'Pedi. E alguém deixou.', predador: 'consensual', reacao: '[A CONSCIÊNCIA] Existe gente que diz sim. Guarde bem esses nomes.' },
      { texto: 'Achei um cachorro na rua. Não tive coragem de mais.', predador: 'fazendeiro', reacao: '[A FOME] Sangue de bicho não me segura por muito tempo. Você sabe disso.' },
    ],
  },
  {
    id: 'ambicao',
    tipo: 'opcoes',
    texto: '[DETERMINAÇÃO] Agora você tem todo o tempo do mundo. O que vai fazer com ele?',
    opcoes: [
      { texto: 'Tomar um pedaço desta cidade para mim.', dados: { ambicao: 'Ser dono de um pedaço do Rio' }, pesos: e({ vant: { influencia: 1, status: 1 } }), reacao: '[MANIPULAÇÃO] Comece pequeno. Uma rua. Depois o bairro.' },
      { texto: 'Encontrar quem fez isso comigo e cobrar.', dados: { ambicao: 'Encontrar quem me Abraçou e cobrar a dívida' }, pesos: e({ atr: { determinacao: 1 } }), reacao: '[A BESTA] Cobrar com juros.' },
      { texto: 'Proteger quem eu deixei para trás.', dados: { ambicao: 'Proteger {touchstone} e os meus' }, pesos: e({ vant: { refugio: 1 } }), reacao: '[HUMANIDADE] Proteger, inclusive de você mesmo.' },
      { texto: 'Entender o que eu me tornei.', dados: { ambicao: 'Descobrir a verdade sobre o que eu sou' }, pesos: e({ hab: { ocultismo: 1 } }), reacao: '[OCULTISMO] As respostas existem. Têm dono, e o dono cobra caro.' },
    ],
  },
  {
    id: 'desejo',
    tipo: 'opcoes',
    texto: '[A FOME] E agora, nas próximas noites, o que você quer?',
    opcoes: [
      { texto: 'Descobrir quem me Abraçou.', dados: { desejo: 'Descobrir quem me Abraçou' }, reacao: '[INVESTIGAÇÃO] Alguém na cidade sabe. Sempre tem alguém que sabe.' },
      { texto: 'Arranjar um lugar seguro para dormir.', dados: { desejo: 'Arranjar um refúgio seguro' }, pesos: e({ vant: { refugio: 1 } }), reacao: '[PRONTIDÃO] Sem janelas. Com tranca. Com saída pelos fundos.' },
      { texto: 'Ver {touchstone} de novo, nem que seja de longe.', dados: { desejo: 'Ver {touchstone} de novo' }, reacao: '[HUMANIDADE] De longe. Bem de longe.' },
      { texto: 'Provar o sangue de alguém importante.', dados: { desejo: 'Provar o sangue de alguém poderoso' }, reacao: '[A BESTA] Agora sim.' },
    ],
  },
  {
    id: 'conviccao',
    tipo: 'opcoes',
    texto: '[HUMANIDADE] Uma linha que você não cruza. Nem morto.',
    opcoes: [
      { texto: 'Nunca machucar uma criança.', dados: { conviccao: 'Nunca machucar uma criança' }, reacao: '[HUMANIDADE] Segure essa linha. Ela vai ser testada.' },
      { texto: 'Nunca trair quem confia em mim.', dados: { conviccao: 'Nunca trair quem confia em mim' }, reacao: '[HUMANIDADE] Nesta cidade, isso é quase uma excentricidade.' },
      { texto: 'Nunca matar quem não merece.', dados: { conviccao: 'Nunca matar quem não merece' }, reacao: '[A BESTA] E quem decide quem merece? Você?' },
      { texto: 'Nunca abandonar os meus.', dados: { conviccao: 'Nunca abandonar os meus' }, reacao: '[HUMANIDADE] Quando você esquecer quem é, lembre de quem são os seus.' },
    ],
  },
  {
    id: 'mascara',
    tipo: 'campos',
    texto: '[A MÁSCARA] Nas ruas, como vão te chamar agora? E como os outros te veem?',
    campos: [
      { id: 'apelido', rotulo: 'Nome ou apelido de agora (deixe em branco para manter o seu)', max: 80 },
      { id: 'aparencia', rotulo: 'Aparência em poucas palavras (opcional)', max: 300, longo: true },
    ],
  },
  { id: 'fim', tipo: 'fim' },
];

// --- Montagem da ficha -------------------------------------------------------------------

const ESPECIALIZACAO_LIVRE = {
  manha: '{bairro}', briga: 'Briga de rua', persuasao: 'Vender qualquer coisa', intimidacao: 'Ameaças veladas',
  tecnologia: 'Celulares e câmeras', medicina: 'Primeiros socorros', politica: 'Prefeitura', ocultismo: 'Religiões afro-brasileiras',
  investigacao: 'Seguir pessoas', labia: 'Golpes', performance: 'Samba', lideranca: 'Multidões', conducao: 'Moto',
  furtividade: 'Becos', atletismo: 'Escalada', intuicao: 'Mentiras', financas: 'Lavagem de dinheiro', 'armas-de-fogo': 'Pistolas',
  etiqueta: 'Festas da alta sociedade', academicos: 'Direito', furto: 'Fechaduras', prontidao: 'Emboscadas',
};
const ESPECIALIZACAO_OBRIGATORIA = { oficios: 'Mecânica', performance: 'Samba', academicos: 'Direito', ciencia: 'Química' };

function somar(alvo, fonte) {
  for (const [k, v] of Object.entries(fonte || {})) alvo[k] = (alvo[k] || 0) + v;
}

// Desempate estável que varia de pessoa para pessoa (pelo nome), para fichas parecidas não ficarem iguais.
function hash(texto) {
  let h = 2166136261;
  for (const c of String(texto)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function ordenar(ids, pesos, semente) {
  return [...ids].sort((a, b) => (pesos[b] || 0) - (pesos[a] || 0) || (hash(semente + a) % 997) - (hash(semente + b) % 997));
}

export function trocar(texto, estado) {
  const r = estado?.respostas || {};
  const c = estado?.campos || {};
  const bairro = dadosDe('bairro', r)?.bairro || 'Rio';
  return String(texto || '')
    .replaceAll('{nome}', c.nomeEmVida || 'Você')
    .replaceAll('{bairro}', bairro)
    .replaceAll('{touchstone}', c.touchstone || 'alguém que eu amo');
}

function cena(id) {
  return CENAS.find((x) => x.id === id);
}

function opcaoEscolhida(id, respostas) {
  const i = respostas?.[id];
  return i == null ? null : cena(id)?.opcoes?.[i] || null;
}

function dadosDe(id, respostas) {
  return opcaoEscolhida(id, respostas)?.dados || null;
}

export function pesosDe(estado) {
  const p = { atr: {}, hab: {}, disc: {}, cla: {}, vant: {}, def: {} };
  for (const c of CENAS) {
    const op = opcaoEscolhida(c.id, estado.respostas);
    if (!op?.pesos) continue;
    for (const k of Object.keys(p)) somar(p[k], op.pesos[k]);
  }
  return p;
}

// Os 3 clãs que mais combinam com as respostas até agora.
export function clasSugeridos(estado, qtd = 3) {
  const p = pesosDe(estado);
  return ordenar(v5.CLAS.map((c) => c.id), p.cla, estado.campos?.nomeEmVida || '').slice(0, qtd);
}

// Distribui exatamente `total` marcas: a mais pesada leva até 3, as seguintes até 2, depois 1;
// se faltar candidato, completa com os itens `padrao`.
function distribuirMarcas(pesos, catalogo, total, padrao, semente) {
  const ids = [...ordenar(catalogo.map((x) => x.id), pesos, semente).filter((id) => (pesos[id] || 0) > 0), ...padrao];
  const cotas = [3, 2, 2, 1, 1, 1, 1];
  const lista = [];
  let resta = total;
  for (const id of ids) {
    if (resta <= 0) break;
    const item = catalogo.find((x) => x.id === id);
    if (!item || lista.some((x) => x.id === id)) continue;
    const n = item.fixo ?? Math.min(item.max, cotas[lista.length] ?? 1, resta);
    if (n > resta) continue; // item de valor fixo que não cabe mais
    lista.push({ id, nivel: n, nota: '' });
    resta -= n;
  }
  for (const it of lista) {
    if (resta <= 0) break;
    const item = catalogo.find((x) => x.id === it.id);
    if (item.fixo) continue;
    const mais = Math.min(item.max - it.nivel, resta);
    it.nivel += mais;
    resta -= mais;
  }
  return lista;
}

function escolherPoderes(disc, nivel, usados) {
  const poderes = v5.DISCIPLINAS[disc].poderes;
  const escolhidos = [];
  for (let k = 1; k <= nivel; k++) {
    const p = poderes.find((pw) => pw.nivel === k && !usados.includes(pw.id) && !escolhidos.includes(pw.id))
      || poderes.find((pw) => pw.nivel <= nivel && !usados.includes(pw.id) && !escolhidos.includes(pw.id));
    if (p) escolhidos.push(p.id);
  }
  return escolhidos;
}

export function montarFicha(estado) {
  const r = estado.respostas || {};
  const campos = estado.campos || {};
  const semente = campos.nomeEmVida || '';
  const p = pesosDe(estado);
  const cla = v5.cla(estado.cla);
  const bairro = dadosDe('bairro', r)?.bairro || '';
  const ocupacao = dadosDe('oficio', r)?.ocupacao || '';
  const predadorId = opcaoEscolhida('fome', r)?.predador || 'gato-de-beco';

  // Atributos: maior talento, três fortes e a fraqueza, pelos pesos.
  const atrs = ordenar(v5.ATRIBUTOS.map((a) => a.id), p.atr, semente);
  const atributos = { melhor: atrs[0], fortes: atrs.slice(1, 4), fraco: atrs[8] };

  // Habilidades: perfil equilibrado (3 experientes, 5 práticas, 7 com noções).
  const habsOrdenadas = ordenar(v5.HABILIDADES.map((h) => h.id), p.hab, semente)
    .filter((id) => !v5.HABILIDADES.find((h) => h.id === id).exigeEsp || (p.hab[id] || 0) >= 2);
  const niveis = {};
  habsOrdenadas.slice(0, 3).forEach((id) => { niveis[id] = 3; });
  habsOrdenadas.slice(3, 8).forEach((id) => { niveis[id] = 2; });
  habsOrdenadas.slice(8, 15).forEach((id) => { niveis[id] = 1; });
  const especializacoes = [];
  const topo = habsOrdenadas[0];
  especializacoes.push({ hab: topo, nome: trocar(ESPECIALIZACAO_LIVRE[topo] || 'Rio de Janeiro', estado), origem: 'livre' });
  for (const [hab, nome] of Object.entries(ESPECIALIZACAO_OBRIGATORIA)) {
    if (niveis[hab]) especializacoes.push({ hab, nome, origem: 'obrigatoria' });
  }

  const ficha = {
    _modo: 'conversa',
    _etapa: v5.ETAPAS.length - 1,
    origem: {
      nomeEmVida: campos.nomeEmVida || '',
      conceito: [ocupacao, bairro].filter(Boolean).join(', '),
      ocupacao,
      bairro,
      idade: '',
      abraco: 'há poucas semanas',
    },
    cla: cla?.id || null,
    atributos,
    habilidades: { perfil: 'equilibrado', niveis, especializacoes },
    predador: { id: predadorId, especializacao: 0, disciplina: null },
    disciplinas: {},
    alquimia: {},
    vantagens: [],
    defeitos: [],
    conviccoes: [{
      texto: dadosDe('conviccao', r)?.conviccao || 'Nunca abandonar os meus',
      touchstone: { nome: campos.touchstone || '', relacao: dadosDe('afeto', r)?.relacao || '' },
    }],
    ambicao: trocar(dadosDe('ambicao', r)?.ambicao || '', estado),
    desejo: trocar(dadosDe('desejo', r)?.desejo || '', estado),
    nome: (campos.apelido || '').trim() || campos.nomeEmVida || '',
    aparencia: campos.aparencia || '',
    senhor: { modo: 'narrador', texto: '' },
  };

  // Disciplina do predador: a que mais combina, entre as permitidas.
  const discsPredador = v5.disciplinasDoPredador(predadorId, ficha.cla);
  if (discsPredador.length) {
    const preferidas = discsPredador.filter((d) => cla?.disciplinas.includes(d));
    ficha.predador.disciplina = ordenar(preferidas.length ? preferidas : discsPredador, p.disc, semente)[0];
  }

  if (cla?.sangueFraco) {
    ficha.alquimia = { formulas: ['nevoa'] };
    ficha.meritosSangueFraco = [];
    ficha.defeitosSangueFraco = [];
  } else if (cla) {
    const opcoes = cla.livre ? Object.keys(v5.DISCIPLINAS).filter((d) => d !== 'alquimia') : cla.disciplinas;
    const ordem = ordenar(opcoes, p.disc, semente);
    ficha.disciplinas = { principal: ordem[0], secundaria: ordem[1], poderes: [] };
    const niveisDisc = v5.niveisDisciplinas(ficha);
    for (const [disc, n] of Object.entries(niveisDisc)) {
      ficha.disciplinas.poderes.push(...escolherPoderes(disc, n, ficha.disciplinas.poderes));
    }
  }

  ficha.vantagens = distribuirMarcas(p.vant, v5.VANTAGENS, v5.PONTOS_VANTAGEM, ['recursos', 'contatos', 'refugio', 'aliados'], semente);
  ficha.defeitos = distribuirMarcas(p.def, v5.DEFEITOS, v5.PONTOS_DEFEITO, ['inimigo', 'malvisto'], semente);

  return ficha;
}
