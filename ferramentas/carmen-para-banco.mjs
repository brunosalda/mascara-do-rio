// Gera o SQL de carga de um capítulo do formato rota (a fuga pela cidade) a partir do gerador de js/carmen/.
//
//   node ferramentas/carmen-para-banco.mjs 1 --teste > <pasta fora do repositório>/carmen-1.sql
//
// --teste grava como 'teste-carmen-<n>' na temporada 'teste-carmen' (só a conta de teste e o Bruno veem).
// CUIDADO: a saída tem o culpado, a rota e os segredos. Nunca grave a saída dentro do repositório nem a
// cole em mensagens. O gerador lê js/carmen/dados/capitulos.js e suspeitos.js, que ficam fora do git.
//
// Como o capítulo vira tabelas (o mesmo motor do beco):
//   capitulos.publico: todos os lugares do mapa (nunca a rota), a tabela de tempos, o Arquivo público
//     (fichas e categorias, sem os segredos) e o traço do começo.
//   capitulo_segredo: rota { lugares, avistamento, acao }, culpado e fecho.
//   cap_pessoas: as testemunhas de cada lugar, nas posições livres da pintura (lugares-alto.js).
//   cap_conteudos: em cada testemunha, o tópico 'viu' (requer a marca 'rota-<lugar>', que o caso_lugar dá
//     quando o jogador chega ao próximo lugar da rota) e o 'nada' (o "ninguém viu", que some quando o rastro
//     chega ali). As coisas para examinar seguem a mesma regra, com dois pontos no mesmo lugar.
//   cap_pistas: as pistas de destino, de traço (sobre = 'categoria=valor') e de história.
import { prepararCapitulo, arquivoDaXerife } from '../js/carmen/gerador.js';
import { CAPITULO, SUSPEITOS } from '../js/carmen/caso.js';
import { preencher } from '../js/carmen/textos.js';
import { ALTOS } from '../js/jogo/lugares-alto.js';

const args = process.argv.slice(2);
const n = Number(args.find((a) => /^\d+$/.test(a)) || 1);
const teste = args.includes('--teste');
const TEMPORADA = teste ? 'teste-carmen' : 'carmen-1';
const CAP = teste ? `teste-carmen-${n}` : `carmen-${n}`;
const VISIVEL = ['5d94ebb2-3baa-4244-a2c1-d44e48d82ca5', '5557b3b9-c5c1-4b34-9356-015a87e956bb'];

// O capítulo de teste é visível para o Bruno, que também joga a temporada. Por isso ele nunca é o capítulo
// verdadeiro: outro culpado, outra semente e outra rota, e o fecho genérico (o fecho verdadeiro cita o culpado).
function capituloDeTeste() {
  const real = prepararCapitulo(n);
  const def = CAPITULO[n];
  for (let k = 1; k < 400; k++) {
    const culpado = SUSPEITOS[(SUSPEITOS.findIndex((x) => x.id === def.culpado) + k) % SUSPEITOS.length].id;
    if (culpado === def.culpado) continue;
    try {
      const c = prepararCapitulo({ ...def, culpado, semente: def.semente + 7919 * k });
      if (c.segredo.culpado !== real.segredo.culpado && c.segredo.rota.join() !== real.segredo.rota.join()) return c;
    } catch { /* este culpado não fecha com esta semente: tenta o próximo */ }
  }
  throw new Error('Nenhum capítulo de teste diferente do verdadeiro.');
}
const c = teste ? capituloDeTeste() : prepararCapitulo(n);
const arq = arquivoDaXerife();
const q = (s) => (s == null ? 'null' : `'${String(s).replaceAll("'", "''")}'`);
const j = (o) => `${q(JSON.stringify(o))}::jsonb`;
const arr = (a) => `array[${a.map(q).join(', ')}]::text[]`;

const rota = c.segredo.rota;
const indice = Object.fromEntries(rota.map((l, i) => [l, i]));
const pos = (lugar, k) => {
  const p = ALTOS[lugar]?.pontos || [];
  return p[k % Math.max(1, p.length)] || [0.5, 0.8];
};

// --- público
const lugares = {};
for (const l of c.publico.lugares) {
  const a = ALTOS[l.id] || {};
  lugares[l.id] = {
    nome: l.nome, em: l.em, a: l.a, de: l.de, cidade: l.cidade, aeroporto: l.aeroporto, geo: `${l.id}-alto`,
    inicio: a.entrada || [0.45, 0.88], mapa: l.geo, resumo: l.resumo, chegada: l.chegada, pontos: [],
  };
}
const publico = {
  formato: 'rota', rotulo: `Capítulo ${n}`, subtitulo: c.publico.subtitulo, abertura: { paineis: null, texto: c.publico.abertura },
  ajuda: [
    '<b>Ouça as testemunhas</b> de cada lugar. Umas contam para onde a presa foi, sem dizer o nome do lugar; outras contam como ela é.',
    '<b>No mapa</b> (botão Lugares ou M), escolha o próximo lugar. Cada viagem gasta minutos da noite. No lugar errado, ninguém viu nada.',
    '<b>No Arquivo da Xerife</b>, marque os traços que as pistas contaram. Quando sobrar uma ficha só, peça a Licença de Caça.',
    '<b>No esconderijo</b>, com a Licença certa, cerque a presa antes de o sol nascer. Sem Licença, ela foge; com a Licença errada, também, e conta como erro.',
  ],
  novidade: c.publico.novidade, extras: c.publico.extras, mecanicas: c.publico.mecanicas, reliquia: c.publico.reliquia,
  rival: c.publico.rival, lugarInicial: c.publico.lugarInicial, tamanhoRota: rota.length,
  ordem: c.publico.lugares.map((l) => l.id), lugares, tempos: c.publico.tempos,
  tracoInicial: c.segredo.tracos.abertura,
  arquivo: { categorias: arq.categorias, suspeitos: arq.suspeitos, nomes: arq.nomesDosTracos },
};

// --- segredo
const marcas = c.segredo.marcasFinais || {};
const fim = c.segredo.fim.preso;
const fichaDoCulpado = arq.suspeitos.find((x) => x.id === c.segredo.culpado);
const fecho = {
  padrao: 'preso',
  texto: { preso: teste
    ? `Você fecha a última saída. ${fichaDoCulpado.apelido || fichaDoCulpado.nome} ergue as mãos, devagar, e entrega ${c.publico.reliquia?.nome || 'o que levou'}.

**Xerife Iolanda** — Bom trabalho. Este era só um ensaio: a temporada de verdade vem depois.`
    : preencher(fim.texto, { ...marcas, contexto: c.segredo.fim.contexto?.nenhuma || '', amanhecer: '' }) },
  paineis: fim.paineis || null,
  escolhas: fim.escolhas || [],
};

// --- pessoas, conteúdos e pistas
const pessoas = [];
const conteudos = [];
const pistas = new Map();
let ordem = 0;
const visitaDe = Object.fromEntries(c.visitas.map((v) => [v.lugar, v]));
for (const lugar of Object.keys(c.erradas)) {
  const i = indice[lugar];
  const visita = visitaDe[lugar];
  const viva = visita && visita.fontes.length > 0; // o esconderijo não tem testemunhas da rota
  const requer = i > 0 ? [`rota-${lugar}`] : [];
  const erradas = Object.fromEntries(c.erradas[lugar].fontes.map((f) => [f.id, f]));
  const fontes = viva ? visita.fontes : c.erradas[lugar].fontes;
  if (viva) for (const p of Object.values(visita.pistas)) {
    pistas.set(p.id, { id: p.id, titulo: p.resumo, texto: p.resumo, fonte: p.fonte, tipo: p.tipo, sobre: p.tipo === 'traco' ? `${p.categoria}=${p.valor}` : null });
  }
  fontes.forEach((f, k) => {
    const [x, y] = pos(lugar, k);
    const id = `${lugar}.${f.id}`;
    const nada = erradas[f.id]?.texto || f.textoErrada || null;
    if (f.tipo === 'testemunha') {
      const pe = f.pessoa || {};
      pessoas.push({ id, lugar, dados: { nome: f.nome, sub: pe.ocupacao || '', tipo: 'passante', figura: pe.figura || null, x, y, saudacao: pe.jeito ? `*${pe.jeito}*` : `**${f.nome}** — Pois não?` } });
      if (viva) conteudos.push({ chave: `${id}:viu`, tipo: 'topico', pessoa: id, lugar, requer, dados: { id: 'viu', rotulo: 'Perguntar se viu alguém passar', min: f.custo, texto: f.texto, pistas: f.pistas } });
      if (!viva || i > 0) conteudos.push({ chave: `${id}:nada`, tipo: 'topico', pessoa: id, lugar, requer: [], dados: { id: 'nada', rotulo: 'Perguntar se viu alguém passar', min: f.custo, texto: viva ? nada : f.texto, pistas: [], ...(viva ? { escondeSe: requer } : {}) } });
    } else {
      if (viva) conteudos.push({ chave: `x:${id}`, tipo: 'exame', pessoa: null, lugar, requer: [], dados: { min: f.custo, ponto: { x, y, rotulo: f.nome, requer }, texto: f.texto, pistas: f.pistas } });
      if (!viva || i > 0) conteudos.push({ chave: `x:${id}~e`, tipo: 'exame', pessoa: null, lugar, requer: [], dados: { min: f.custo, ponto: { x, y, rotulo: f.nome, ...(viva ? { escondeSe: requer } : {}) }, texto: viva ? nada : f.texto, pistas: [] } });
    }
  });
}
for (const ct of conteudos) ct.ordem = ++ordem;

// --publico: só a parte pública (para testar as telas sem banco). Não tem rota nem culpado.
if (args.includes('--publico')) { process.stdout.write(JSON.stringify(publico)); process.exit(0); }

const minimas = c.visitas.filter((v) => v.fontes.length).length * 2;
const sql = [];
sql.push('begin;');
if (teste) sql.push(`insert into public.temporadas (id, titulo, situacao, visivel_para) values (${q(TEMPORADA)}, 'Temporada de teste da fuga', 'teste', ${arr(VISIVEL).replace('::text[]', '::uuid[]')}) on conflict (id) do nothing;`);
sql.push(`delete from public.progresso where capitulo_id = ${q(CAP)};`);
for (const t of ['cap_conteudos', 'cap_pessoas', 'cap_pistas', 'capitulo_segredo']) sql.push(`delete from public.${t} where capitulo_id = ${q(CAP)};`);
sql.push(`delete from public.capitulos where id = ${q(CAP)};`);
const pares = publico.tempos.filter((t, i) => i % 2 === 0).map((t) => `${t.de}|${t.para}|${t.minutos}|${t.voo ? 1 : 0}`).join(',');
const semTempos = { ...publico, tempos: [] };
sql.push(`insert into public.capitulos (id, temporada_id, ordem, titulo, pergunta, relogio_inicio, relogio_fim, custos, publico, tempo_referencia_min, pistas_minimas, formato) values (${q(CAP)}, ${q(TEMPORADA)}, ${n}, ${q(c.publico.titulo)}, 'Para onde foi? Quem é?', ${c.publico.relogio.inicio}, ${c.publico.relogio.fim}, ${j({ cacar: 45, dados: 35, semLicenca: 30, acusacaoErrada: 60 })}, ${j(semTempos)} || jsonb_build_object('tempos', (select jsonb_agg(t order by k, d) from (select k, d, jsonb_build_object('de', case d when 0 then x[1] else x[2] end, 'para', case d when 0 then x[2] else x[1] end, 'minutos', x[3]::int, 'voo', x[4] = '1') t from unnest(string_to_array(${q(pares)}, ',')) with ordinality u(p, k), lateral (select string_to_array(u.p, '|') x) y, (values (0), (1)) v(d)) z)), 40, ${minimas}, 'rota');`);
sql.push(`insert into public.capitulo_segredo (capitulo_id, resposta, eventos, fecho, palavras_por, rota, culpado) values (${q(CAP)}, '{}'::jsonb, '[]'::jsonb, ${j(fecho)}, '{}'::jsonb, ${j({ lugares: rota, avistamento: c.segredo.avistamento, acao: { pool: ['destreza', 'atletismo'], dif: 3 } })}, ${q(c.segredo.culpado)});`);
// Uma inserção por tabela, a partir de uma lista JSON (menos texto repetido na carga). Os conteúdos vão em
// blocos de até 40, para cada comando caber numa chamada.
sql.push(`insert into public.cap_pessoas (capitulo_id, id, lugar, dados) select ${q(CAP)}, e ->> 0, e ->> 1, e -> 2 from jsonb_array_elements(${j(pessoas.map((p) => [p.id, p.lugar, p.dados]))}) e;`);
for (let i = 0; i < conteudos.length; i += 40) {
  const bloco = conteudos.slice(i, i + 40).map((ct) => [ct.chave, ct.tipo, ct.pessoa, ct.lugar, ct.requer, ct.dados, ct.ordem]);
  sql.push(`insert into public.cap_conteudos (capitulo_id, chave, tipo, pessoa, lugar, requer, dados, ordem) select ${q(CAP)}, e ->> 0, e ->> 1, e ->> 2, e ->> 3, array(select jsonb_array_elements_text(e -> 4)), e -> 5, (e ->> 6)::int from jsonb_array_elements(${j(bloco)}) e;`);
}
sql.push(`insert into public.cap_pistas (capitulo_id, id, titulo, texto, fonte, sobre, tipo) select ${q(CAP)}, e ->> 'id', e ->> 'titulo', e ->> 'texto', e ->> 'fonte', e ->> 'sobre', e ->> 'tipo' from jsonb_array_elements(${j([...pistas.values()])}) e;`);
sql.push('commit;');
process.stdout.write(`${sql.join('\n')}\n`);
process.stderr.write(`${CAP}: ${teste ? 'teste com culpado e rota diferentes do capítulo verdadeiro, ' : ''}gerador v${c.versaoGerador}, ${rota.length} lugares na rota, ${pessoas.length} pessoas, ${conteudos.length} conteúdos, ${pistas.size} pistas, ${sql.join('\n').length} caracteres\n`);
