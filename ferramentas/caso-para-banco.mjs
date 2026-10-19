// Etapa B, passo 3: converte um caso no formato de js/caso/demo-beco.js no SQL do capítulo no banco.
// A parte pública vai para `capitulos`; pessoas, conversas, exames, pistas, dicas, resposta, eventos,
// fecho e o resultado da cena de ação vão para as tabelas de segredo (sem acesso para o jogador).
//
// Uso:
//   node ferramentas/caso-para-banco.mjs --temporada teste --titulo "Temporada de teste" \
//     --ver <uuid>,<uuid> [--ordem 1] [--personagem-teste <uuid do usuário>] > capitulo.sql
//
// --ver: quem vê a temporada de teste (situacao 'teste'). --personagem-teste: cria, para essa conta,
// uma vampira de teste com a ficha em números (a mesma da demonstração), só se a conta não tiver personagem.
// O SQL apaga e recria o capítulo (on delete cascade leva o progresso dele junto): use só no de teste.
import { CASO } from '../js/caso/demo-beco.js';
import { CENAS, clasSugeridos, montarFicha } from '../js/motor/roteiro.js';
import * as v5 from '../js/motor/v5.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []));
const temporada = args.temporada || 'teste';
const tituloTemporada = args.titulo || 'Temporada de teste';
const ver = (args.ver || '').split(',').filter(Boolean);
const ordem = Number(args.ordem || 1);

const caso = CASO;
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const j = (o) => {
  const t = JSON.stringify(o ?? null);
  if (t.includes('$j$')) throw new Error('texto com $j$');
  return `$j$${t}$j$::jsonb`;
};
const arr = (a) => `array[${(a || []).map(q).join(',')}]::text[]`;
const tira = (o, ...chaves) => Object.fromEntries(Object.entries(o).filter(([k]) => !chaves.includes(k)));

// Dicas do capítulo de teste: cada uma aponta para uma pista ainda não achada, sem dar a resposta.
const DICAS = [
  { pista: 'cida-viu-chapeu', texto: 'A dona do bar viu a Ritinha sair do salão. Pergunte a ela com quem.' },
  { pista: 'jaque-cravo', texto: 'A garçonete passou pela Ritinha na saída e sentiu alguma coisa no homem.' },
  { pista: 'chapeu-beco', texto: 'Quem foge de um beco às vezes larga coisa no lixo. Olhe a caçamba.' },
  { pista: 'ze-tiao-sumiu', texto: 'Do palco, o sambista vê o portão do bar a noite toda. Pergunte o que ele viu lá.' },
];

const cap = `${temporada}-${caso.id}`;
const pontosFixos = (l) => l.pontos.filter((p) => p.tipo === 'passagem' || p.tipo === 'cacar');
const publico = {
  rotulo: caso.rotulo,
  lugarInicial: caso.lugarInicial,
  abertura: caso.abertura,
  ajuda: caso.ajuda,
  lugares: Object.fromEntries(Object.entries(caso.lugares).map(([id, l]) => [id, { ...tira(l, 'pessoas', 'pontos'), pontos: pontosFixos(l) }])),
  colunas: caso.colunas.map((c) => ({ ...c, ...(c.pessoa ? { tipo: caso.pessoas[c.pessoa].tipo, figura: caso.pessoas[c.pessoa].figura || null } : {}) })),
  lacunas: caso.lacunas,
  palavras: Object.fromEntries(Object.entries(caso.palavras).map(([l, ws]) => [l, ws.map((w) => ({ id: w.id, texto: w.texto }))])),
  cacada: caso.cacada,
  perseguicao: { ...tira(caso.perseguicao, 'pego', 'escapou', 'depois'), marca: 'chapeu-mostrado' },
};
const pistasReais = Object.entries(caso.pistas).filter(([, p]) => !p.marca);

const sql = [];
sql.push('begin;');
sql.push(`insert into public.temporadas (id, titulo, situacao, visivel_para) values (${q(temporada)}, ${q(tituloTemporada)}, 'teste', array[${ver.map((u) => `${q(u)}::uuid`).join(',')}]::uuid[])
  on conflict (id) do update set titulo = excluded.titulo, visivel_para = excluded.visivel_para;`);
sql.push(`delete from public.capitulos where id = ${q(cap)};`);
sql.push(`insert into public.capitulos (id, temporada_id, ordem, titulo, pergunta, relogio_inicio, relogio_fim, custos, publico, tempo_referencia_min, pistas_minimas)
  values (${q(cap)}, ${q(temporada)}, ${ordem}, ${q(caso.titulo)}, ${q(caso.pergunta)}, ${caso.relogio.inicio}, ${caso.relogio.fim}, ${j(caso.custo)}, ${j(publico)}, 40, 8);`);
sql.push(`insert into public.capitulo_segredo (capitulo_id, resposta, eventos, fecho, palavras_por, perseguicao) values (${q(cap)}, ${j(caso.resposta)}, ${j(caso.eventos)},
  ${j({ ...caso.fecho, variantes: [{ marca: 'tiao-pego', texto: 'pego' }, { marca: 'tiao-fugiu', texto: 'fugiu' }], padrao: 'solto' })},
  ${j(Object.fromEntries(Object.entries(caso.palavras).map(([l, ws]) => [l, Object.fromEntries(ws.map((w) => [w.id, w.por]))])))},
  ${j({ pego: caso.perseguicao.pego, escapou: caso.perseguicao.escapou, depois: caso.perseguicao.depois })});`);
for (const [id, pe] of Object.entries(caso.pessoas)) {
  sql.push(`insert into public.cap_pessoas (capitulo_id, id, lugar, dados) values (${q(cap)}, ${q(id)}, ${q(pe.lugar)}, ${j(tira(pe, 'topicos', 'lugar'))});`);
  pe.topicos.forEach((t, i) => {
    sql.push(`insert into public.cap_conteudos (capitulo_id, chave, tipo, pessoa, lugar, requer, dados, ordem) values (${q(cap)}, ${q(`${id}:${t.id}`)}, 'topico', ${q(id)}, ${q(pe.lugar)}, ${arr(t.requer)}, ${j(tira(t, 'requer'))}, ${i});`);
  });
}
let n = 0;
for (const [lid, l] of Object.entries(caso.lugares)) {
  for (const pt of l.pontos) {
    if (pt.tipo === 'passagem' || pt.tipo === 'cacar') continue;
    const ex = caso.exames[pt.id];
    if (!ex) throw new Error(`exame sem dados: ${pt.id}`);
    sql.push(`insert into public.cap_conteudos (capitulo_id, chave, tipo, lugar, dados, ordem) values (${q(cap)}, ${q(`x:${pt.id}`)}, 'exame', ${q(lid)}, ${j({ ...ex, ponto: tira(pt, 'id') })}, ${n++});`);
  }
}
for (const [id, p] of pistasReais) {
  sql.push(`insert into public.cap_pistas (capitulo_id, id, titulo, texto, fonte, sobre, tipo) values (${q(cap)}, ${q(id)}, ${q(p.titulo)}, ${q(p.texto)}, ${q(p.fonte)}, ${q(p.sobre)}, ${q(p.tipo)});`);
}
DICAS.forEach((d, i) => {
  if (!caso.pistas[d.pista]) throw new Error(`dica para pista inexistente: ${d.pista}`);
  sql.push(`insert into public.cap_dicas (capitulo_id, ordem, pista_id, texto) values (${q(cap)}, ${i + 1}, ${q(d.pista)}, ${q(d.texto)});`);
});

// A vampira de teste (a mesma da demonstração), com a ficha em números calculada pelo v5.js.
if (args['personagem-teste']) {
  const e = { passo: 0, respostas: {}, campos: { nomeEmVida: 'Marina Costa', apelido: 'Nina', touchstone: 'Pedro', aparencia: 'Cabelo raspado, jaqueta de couro.' }, cla: null, log: [] };
  for (const c of CENAS) {
    if (c.tipo === 'opcoes') e.respostas[c.id] = 1 % c.opcoes.length;
    if (c.tipo === 'cla') e.cla = clasSugeridos(e)[0];
  }
  const ficha = montarFicha(e);
  const calc = v5.calcular(ficha);
  const numeros = { atributos: calc.atributos, habilidades: calc.habilidades, disciplinas: calc.disciplinas, poderes: calc.poderes, forcaVontade: calc.forcaVontade };
  const uid = args['personagem-teste'];
  sql.push(`insert into public.personagens (user_id, nome, status, ficha, estado, numeros)
  select ${q(uid)}::uuid, ${q(`${ficha.nome} (teste)`)}, 'ativo', ${j(ficha)}, ${j({ fome: 2 })}, ${j(numeros)}
  where not exists (select 1 from public.personagens p where p.user_id = ${q(uid)}::uuid);`);
}
sql.push('commit;');
process.stdout.write(`${sql.join('\n')}\n`);
process.stderr.write(`capítulo ${cap}: ${Object.keys(caso.pessoas).length} pessoas, ${pistasReais.length} pistas, ${DICAS.length} dicas\n`);
