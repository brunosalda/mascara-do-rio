// Modo vitrine: o capítulo de teste do formato rota jogado sem login, só no servidor local (localhost).
// Serve para a avaliação jogar o laço inteiro (testemunhas, viagens, Arquivo, Licença, cerco e placar).
//
// Tem as mesmas funções de fonte-banco.js, mas as regras rodam aqui, copiadas das funções do Supabase
// (caso_lugar, caso_conversa, caso_agir, caso_licenca, caso_cercar e as auxiliares _cap_*). No site real,
// nada disto roda: tudo continua pelo banco.
//
// Os dados vêm de vitrine/<capítulo>.json, que a pasta vitrine/ guarda fora do git. Para gerar:
//   node ferramentas/carmen-para-banco.mjs 1 --teste --vitrine > vitrine/teste-carmen-1.json
// O progresso fica no aparelho (localStorage). &zerar no endereço começa de novo.
import { ErroDoCaso } from './fonte-banco.js';

let dados = null;
let numeros = null;
let pr = null;
let chave = '';

const erro = (codigo) => new ErroDoCaso(codigo);
const copia = (o) => JSON.parse(JSON.stringify(o));
const algum = (lista, ach) => (lista || []).some((x) => ach.includes(x));
const todos = (lista, ach) => (lista || []).every((x) => ach.includes(x));
const ach = () => [...pr.pistas, ...pr.marcas];
const salvar = () => { try { localStorage.setItem(chave, JSON.stringify(pr)); } catch { /* sem armazenamento */ } };
const cap = () => dados.capitulo;
const pub = () => dados.capitulo.publico;
const seg = () => dados.segredo;

// A ficha de quem joga na vitrine (a vampira fictícia da demonstração), nos números que o banco usa.
export function usarNumeros(n) { numeros = n; }

async function carregar(capitulo) {
  if (dados?.capitulo.id === capitulo) return;
  const r = await fetch(`vitrine/${encodeURIComponent(capitulo)}.json`, { cache: 'no-store' });
  if (!r.ok) throw erro('capitulo-inexistente');
  dados = await r.json();
}

function progresso() {
  if (!pr) throw erro('sem-progresso');
  return pr;
}

// --- dados (_cap_d10, _cap_avaliar, _cap_rolar, _cap_rerrolar, _cap_ok, _cap_parada)
const d10 = () => 1 + Math.floor(Math.random() * 10);
function avaliar(normais, fome, dif) {
  const todosD = [...normais, ...fome];
  const dez = todosD.filter((x) => x === 10).length;
  const pares = Math.floor(dez / 2);
  const suc = todosD.filter((x) => x >= 6).length + pares * 2;
  const crit = pares > 0;
  const sang = crit && fome.includes(10);
  const res = dif <= 0 ? 'contagem'
    : suc >= dif ? (sang ? 'critico-sangrento' : crit ? 'critico' : 'sucesso')
      : fome.includes(1) ? 'falha-bestial' : suc === 0 ? 'falha-total' : 'falha';
  return { normais, dadosFome: fome, dificuldade: dif, sucessos: suc, margem: suc - dif, critico: crit, sangrento: sang, resultado: res };
}
function rolar(parada, fome, dif) {
  const total = Math.max(1, parada || 1);
  const nf = Math.max(0, Math.min(fome || 0, total));
  return { parada: total, fome: nf, ...avaliar(Array.from({ length: total - nf }, d10), Array.from({ length: nf }, d10), dif) };
}
function rerrolar(res) {
  const n = [...res.normais];
  const idx = n.map((v, i) => [v, i]).filter(([v]) => v < 6).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 3).map(([, i]) => i);
  for (const i of idx) n[i] = d10();
  return { parada: res.parada, fome: res.fome, vontadeGasta: true, rerrolados: idx.length, ...avaliar(n, res.dadosFome, res.dificuldade) };
}
const ok = (res) => ['sucesso', 'critico', 'critico-sangrento'].includes(res?.resultado);
const parada = (pool) => Math.max(1, (numeros?.atributos?.[pool[0]] || 0) + (numeros?.habilidades?.[pool[1]] || 0));

// --- estado (_cap_tracos, _cap_presos, _cap_estado, _cap_amanheceu)
function tracos() {
  const t = new Set();
  const ini = pub().tracoInicial;
  if (ini) t.add(`${ini.categoria}=${ini.valor}`);
  for (const p of dados.pistas) if (p.tipo === 'traco' && p.sobre && pr.pistas.includes(p.id)) t.add(p.sobre);
  return [...t];
}
const amanheceu = () => !pr.resolvido_em && pr.hora >= cap().relogio.fim;
function estado() {
  const pistas = pr.pistas.map((id) => dados.pistas.find((p) => p.id === id)).filter(Boolean)
    .map(({ id, titulo, texto, fonte, sobre, tipo }) => ({ id, titulo, texto, fonte, sobre, tipo }));
  return copia({
    lugar: pr.lugar, hora: pr.hora, noites: pr.noites, fome: pr.fome, vontade: pr.vontade,
    pistas, marcas: pr.marcas, palavras: {},
    acusacoes_erradas: pr.acusacoes_erradas, dicas_pedidas: pr.dicas_pedidas, dicas: [],
    feitos: pr.feitos, lidos: pr.lidos, escondidos: pr.escondidos, eventos: pr.eventos,
    resolvido_em: pr.resolvido_em, nota: pr.nota, selos: pr.selos, final: pr.final,
    tempo_ativo_seg: pr.tempo_ativo_seg, acao_vencida: pr.acao_vencida, licenca: pr.licenca,
    viagens_erradas: pr.viagens_erradas, rota_passo: pr.rota_passo,
    percurso: seg().rota.lugares.slice(0, pr.rota_passo + 1), tracos: tracos(), presos: [],
    amanheceu: amanheceu(),
  });
}

// --- tempo e pistas (_cap_tempo, _cap_aplicar)
function tempo(min) {
  const saida = [];
  if (!(min > 0) || pr.resolvido_em) return saida;
  pr.hora += min;
  pr.minutos += min;
  for (const ev of seg().eventos || []) {
    if (pr.eventos.includes(ev.id) || pr.hora < ev.hora || algum(ev.seNao, ach())) continue;
    pr.eventos.push(ev.id);
    if (ev.esconder && !pr.escondidos.includes(ev.esconder)) pr.escondidos.push(ev.esconder);
    for (const m of ev.marcas || []) if (!pr.marcas.includes(m)) pr.marcas.push(m);
    saida.push({ voz: ev.voz, texto: ev.texto, esconder: ev.esconder });
  }
  return saida;
}
function aplicar(ids) {
  const novas = [];
  for (const id of ids || []) {
    if (pr.pistas.includes(id) || pr.marcas.includes(id)) continue;
    const p = dados.pistas.find((x) => x.id === id);
    if (p) { pr.pistas.push(id); novas.push({ id: p.id, titulo: p.titulo, texto: p.texto, fonte: p.fonte, sobre: p.sobre, tipo: p.tipo }); } else pr.marcas.push(id);
  }
  return novas;
}

// --- conteúdos (_cap_ponto_visivel, _cap_topicos, _cap_situacao)
const visivel = (ct) => todos(ct.dados.ponto?.requer, ach()) && !(algum(ct.dados.ponto?.escondeSe, ach()) && pr.feitos[ct.chave] !== 'ok');
function topicos(pessoa) {
  const a = ach();
  return dados.conteudos.filter((ct) => ct.tipo === 'topico' && ct.pessoa === pessoa).sort((x, y) => x.ordem - y.ordem)
    .filter((ct) => {
      const d = ct.dados;
      const est = pr.feitos[ct.chave] || 'novo';
      if (!todos(ct.requer, a)) return false;
      if (d.requerAlgum && !algum(d.requerAlgum, a)) return false;
      if (d.requerQuantos && d.requerQuantos.de.filter((x) => a.includes(x)).length < d.requerQuantos.n) return false;
      if (d.poderTopico && !(numeros?.poderes || []).includes(d.poderTopico)) return false;
      if (algum(d.escondeSe, a) && est !== 'ok') return false;
      return true;
    })
    .map((ct) => ({ chave: ct.chave, rotulo: ct.dados.rotulo, min: ct.dados.min, estado: pr.feitos[ct.chave] || 'novo' }));
}
function situacao(a, chaveI) {
  if (pr.tentados.includes(chaveI)) return { pode: false, motivo: 'tentado' };
  if (algum(a.bloqueadaSe, ach())) return { pode: false, motivo: 'bloqueada' };
  if (a.requer && !todos(a.requer, ach())) return { pode: false, motivo: 'falta' };
  if (a.poder) {
    if (!(numeros?.poderes || []).includes(a.poder)) return { pode: false, motivo: 'sem-poder', poder: a.poder };
    if (pr.fome >= 5) return { pode: false, motivo: 'fome-maxima', poder: a.poder };
    return { pode: true, poder: a.poder };
  }
  if (a.disciplina) {
    if ((numeros?.disciplinas?.[a.disciplina[0]] || 0) < (a.disciplina[1] ?? 1)) return { pode: false, motivo: 'sem-poder', disciplina: a.disciplina };
    if (pr.fome >= 5) return { pode: false, motivo: 'fome-maxima', disciplina: a.disciplina };
    return { pode: true, disciplina: a.disciplina };
  }
  if (a.fomeMin != null) return { pode: pr.fome >= a.fomeMin, motivo: pr.fome >= a.fomeMin ? null : 'fome-baixa', fomeMin: a.fomeMin, besta: true };
  if (a.teste) {
    const assusta = !!a.social && pr.fome >= 4;
    return { pode: true, teste: { pool: a.teste.pool, dif: a.teste.dif + (assusta ? 1 : 0), parada: parada(a.teste.pool), fomeAssusta: assusta } };
  }
  return { pode: true };
}
const resultadosDe = (ct) => (ct.tipo === 'exame' ? ct.dados.resultados : dados.pessoas.find((p) => p.id === ct.pessoa)?.dados.resultados) || {};

// --- as funções do caso (mesmos nomes e respostas de fonte-banco.js)
export async function abrir(capitulo) {
  await carregar(capitulo);
  chave = `mascara.vitrine.${capitulo}`;
  const zerar = /[?&]zerar\b/.test(location.hash);
  try { pr = zerar ? null : JSON.parse(localStorage.getItem(chave)); } catch { pr = null; }
  if (!pr) {
    pr = {
      lugar: pub().lugarInicial, hora: cap().relogio.inicio, minutos: 0, noites: 1, fome: 2, vontade: numeros?.forcaVontade || 3,
      pistas: [], marcas: [], feitos: {}, lidos: {}, tentados: [], escondidos: [], eventos: [],
      acusacoes_erradas: 0, dicas_pedidas: 0, resolvido_em: null, nota: null, selos: [], final: null,
      tempo_ativo_seg: 0, acao_vencida: false, licenca: null, viagens_erradas: 0, rota_passo: 0, ultima_rolagem: null,
    };
    salvar();
  }
  if (zerar) history.replaceState(null, '', location.hash.replace(/[?&]zerar\b/, ''));
  // &ate=<lugar da rota, 1 em diante> ou &ate=esconderijo: começa de novo e já joga até ali (todas as
  // testemunhas e exames de cada lugar, mais uma viagem errada), para a avaliação abrir direto numa tela.
  const ate = (location.hash.match(/[?&]ate=([a-z0-9-]+)/) || [])[1];
  if (ate) {
    history.replaceState(null, '', location.hash.replace(/[?&]ate=[a-z0-9-]+/, ''));
    await avancar(ate === 'esconderijo' ? seg().rota.lugares.length - 1 : Number(ate) || 0);
  }
  const c = cap();
  return copia({
    capitulo: { id: c.id, temporada: c.temporada, ordem: c.ordem, titulo: c.titulo, pergunta: c.pergunta, relogio: c.relogio, custos: c.custos, publico: c.publico, tempo_referencia_min: c.tempo_referencia_min },
    ficha_com_numeros: !!numeros, estado: estado(),
  });
}

async function avancar(passo) {
  pr = null;
  try { localStorage.removeItem(chave); } catch { /* sem armazenamento */ }
  await abrir(cap().id); // sem &zerar nem &ate: o estado novo
  const varrer = async () => {
    const l = await lugar(null, null, pr.lugar);
    for (const pe of l.pessoas) for (const t of (await conversa(null, null, pe.id)).topicos) await agir(null, null, t.chave);
    for (const pt of l.pontos) await agir(null, null, pt.chave);
  };
  const rota = seg().rota.lugares;
  await varrer();
  const errada = (pub().tempos || []).find((t) => t.de === rota[0] && !rota.includes(t.para));
  if (errada && passo > 0) { await lugar(null, null, errada.para); await lugar(null, null, rota[0]); }
  for (let i = 1; i <= Math.min(passo, rota.length - 1); i++) {
    await lugar(null, null, rota[i]);
    if (i < rota.length - 1) await varrer();
  }
}

export async function lugar(capitulo, personagem, id) {
  progresso();
  const para = pub().lugares[id];
  if (!para) throw erro('conteudo-inexistente');
  let min = 0;
  let ev = [];
  let viagem = null;
  if (id !== pr.lugar) {
    if (amanheceu()) throw erro('amanheceu');
    if (pr.resolvido_em) throw erro('ja-resolvido');
    const t = (pub().tempos || []).find((x) => x.de === pr.lugar && x.para === id);
    if (!t) throw erro('sem-viagem-direta');
    min = t.minutos;
    const rota = seg().rota.lugares;
    const idx = rota.indexOf(id);
    let tipo;
    if (idx === pr.rota_passo + 1) { tipo = 'certa'; pr.rota_passo = idx; pr.marcas.push(`rota-${id}`); }
    else if (idx >= 0 && idx <= pr.rota_passo) tipo = 'volta';
    else { tipo = 'errada'; pr.viagens_erradas += 1; }
    const esconderijo = tipo !== 'errada' && idx === rota.length - 1;
    viagem = { tipo, minutos: min, voo: !!t.voo, esconderijo, avistamento: esconderijo ? seg().rota.avistamento : null };
    pr.lugar = id;
    ev = tempo(min);
    salvar();
  }
  const pessoas = dados.pessoas.filter((p) => p.lugar === id && !pr.escondidos.includes(p.id)).sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((p) => ({
      id: p.id, nome: p.dados.nome, sub: p.dados.sub, tipo: p.dados.tipo, figura: p.dados.figura, x: p.dados.x, y: p.dados.y, falas: p.dados.falas,
      conhecida: pr.marcas.includes(`conheceu-${p.id}`), assunto_novo: topicos(p.id).some((t) => t.estado === 'novo'),
    }));
  const pontos = dados.conteudos.filter((ct) => ct.tipo === 'exame' && ct.lugar === id && visivel(ct)).sort((a, b) => a.ordem - b.ordem)
    .map((ct) => ({ id: ct.chave.slice(2), chave: ct.chave, rotulo: ct.dados.ponto.rotulo, x: ct.dados.ponto.x, y: ct.dados.ponto.y, estado: pr.feitos[ct.chave] || 'novo' }));
  return copia({ lugar: id, minutos: min, viagem, pessoas, pontos, eventos: ev, estado: estado() });
}

export async function conversa(capitulo, personagem, pessoa) {
  progresso();
  const pe = dados.pessoas.find((p) => p.id === pessoa);
  if (!pe || pe.lugar !== pr.lugar || pr.escondidos.includes(pessoa)) throw erro('fora-do-lugar');
  const primeira = !ach().includes(`conheceu-${pessoa}`);
  if (primeira) aplicar([`conheceu-${pessoa}`]);
  const texto = primeira ? pe.dados.saudacao : `**${pe.dados.nome}** — Mais alguma coisa?`;
  salvar();
  return copia({ pessoa: { id: pe.id, nome: pe.dados.nome, sub: pe.dados.sub }, texto, topicos: topicos(pessoa), estado: estado() });
}

function agirCom(chaveC, abordagem, usarVontade) {
  progresso();
  const ct = dados.conteudos.find((x) => x.chave === chaveC);
  if (!ct) throw erro('conteudo-inexistente');
  const d = ct.dados;
  const exame = ct.tipo === 'exame';
  if (exame) {
    if (ct.lugar !== pr.lugar || !visivel(ct)) throw erro('fora-do-lugar');
  } else {
    const pe = dados.pessoas.find((p) => p.id === ct.pessoa);
    if (!pe || pe.lugar !== pr.lugar || pr.escondidos.includes(pe.id)) throw erro('fora-do-lugar');
    if (!topicos(ct.pessoa).some((t) => t.chave === chaveC)) throw erro('conteudo-inexistente');
  }
  const resultados = resultadosDe(ct);
  if (usarVontade) {
    const ur = pr.ultima_rolagem;
    if (!ur || ur.chave !== chaveC || ur.i !== abordagem || !ur.pode_repetir || pr.vontade <= 0) throw erro('sem-repeticao');
    const a = d.abordagens[abordagem];
    const res = rerrolar(ur.res);
    const deu = ok(res);
    const r = deu ? resultados[a.sucesso] : null;
    const novas = deu ? aplicar([...(r?.pistas || []), ...(r?.marcas || [])]) : [];
    const lido = { abordagem: a.rotulo, teste: { pool: ur.pool, dif: ur.dif, res }, vontade: true, texto: r?.texto ?? null };
    pr.vontade -= 1;
    pr.ultima_rolagem = null;
    if (deu) { pr.feitos[chaveC] = 'ok'; pr.lidos[chaveC] = lido; }
    return { ...lido, ok: deu, novas, eventos: [], pode_repetir: false, estado: estado() };
  }
  if (pr.feitos[chaveC] === 'ok' && pr.lidos[chaveC]) return { ...pr.lidos[chaveC], ok: true, repetido: true, novas: [], eventos: [], estado: estado() };
  if (amanheceu()) throw erro('amanheceu');
  if (d.acao === 'perseguicao' || d.acao === 'confronto') throw erro('acao-indisponivel'); // fora do formato rota
  if (!d.abordagens) {
    const ev = tempo(d.min);
    const novas = aplicar([...(d.pistas || []), ...(d.marcas || [])]);
    let texto = d.texto;
    if (d.passivo && (numeros?.habilidades?.[d.passivo.hab] || 0) >= d.passivo.min) {
      novas.push(...aplicar(d.passivo.pistas));
      texto = `${texto}\n\n${d.passivo.texto}`;
    }
    const lido = { texto };
    pr.feitos[chaveC] = 'ok';
    pr.lidos[chaveC] = lido;
    return { ...lido, ok: true, novas, eventos: ev, estado: estado() };
  }
  if (abordagem == null) {
    if (exame && d.marcas) aplicar(d.marcas);
    const abordagens = d.abordagens.map((a, i) => ({ i, rotulo: a.rotulo, cena: a.cena, ...situacao(a, `${chaveC}#${i}`) }));
    return { pergunta: exame ? [d.texto, d.pergunta].filter(Boolean).join('\n\n') : d.pergunta, min: d.min, abordagens, estado: estado() };
  }
  const a = d.abordagens[abordagem];
  if (!a) throw erro('abordagem-indisponivel');
  const sit = situacao(a, `${chaveC}#${abordagem}`);
  if (!sit.pode) throw erro('abordagem-indisponivel');
  pr.tentados.push(`${chaveC}#${abordagem}`);
  let res = null;
  let deu = true;
  let extra = 0;
  let sangue = null;
  if (a.teste) {
    res = rolar(sit.teste.parada, pr.fome, sit.teste.dif);
    deu = ok(res);
    if (res.resultado === 'falha-bestial') extra = 15;
  } else if (a.poder || a.disciplina) {
    const sobe = d10() < 6;
    if (sobe) pr.fome = Math.min(5, pr.fome + 1);
    sangue = { poder: a.poder ?? null, disciplina: a.disciplina ?? null, fomeSobe: sobe };
  }
  const r = resultados[deu ? a.sucesso : a.falha] || {};
  const ev = tempo((d.min || 0) + extra);
  const novas = aplicar([...(r.pistas || []), ...(r.marcas || [])]);
  const lido = { abordagem: a.rotulo, texto: r.texto ?? null, sangue, besta: a.fomeMin != null, teste: res ? { pool: sit.teste.pool, dif: sit.teste.dif, res } : null };
  const podeRepetir = !deu && !!res && pr.vontade > 0;
  pr.feitos[chaveC] = deu || pr.feitos[chaveC] === 'ok' ? 'ok' : 'tentado';
  if (deu) pr.lidos[chaveC] = lido;
  pr.ultima_rolagem = res ? { chave: chaveC, i: abordagem, res, pool: sit.teste.pool, dif: sit.teste.dif, pode_repetir: podeRepetir } : null;
  return { ...lido, ok: deu, novas, eventos: ev, pode_repetir: podeRepetir, outras: exame && !deu, estado: estado() };
}
export async function agir(capitulo, personagem, chaveC, abordagem = null) {
  try { return copia(agirCom(chaveC, abordagem, false)); } finally { salvar(); }
}
export async function insistir(capitulo, personagem, chaveC, abordagem) {
  try { return copia(agirCom(chaveC, abordagem, true)); } finally { salvar(); }
}

export async function licenca(capitulo, personagem, quem, marcados) {
  progresso();
  if (pr.resolvido_em) throw erro('ja-resolvido');
  if (amanheceu()) throw erro('amanheceu');
  const tem = tracos();
  const marc = Object.entries(marcados || {}).filter(([, v]) => v !== '').map(([k, v]) => `${k}=${v}`);
  if (tem.length < 3) return copia({ licenca: null, motivo: 'poucos-tracos', conquistados: tem.length, estado: estado() });
  const categorias = tem.map((t) => t.split('=')[0]);
  if (!marc.length || marc.some((m) => !categorias.includes(m.split('=')[0]))) return copia({ licenca: null, motivo: 'traco-sem-pista', estado: estado() });
  const rest = (pub().arquivo?.suspeitos || [])
    .filter((s) => !Object.entries(marcados).some(([k, v]) => v !== '' && (s.tracos?.[k] ?? '') !== v)).map((s) => s.id);
  if (rest.length !== 1 || rest[0] !== quem) return copia({ licenca: null, motivo: 'nao-sobra-um', restantes: rest.length, estado: estado() });
  pr.licenca = quem;
  salvar();
  return copia({ licenca: quem, estado: estado() });
}

// A nota é a do banco (_cap_nota com o tempo zerado, menos 15 por viagem errada, até 100).
function nota() {
  const np = pr.pistas.length;
  const base = 920 - 200 * pr.acusacoes_erradas - 60 * pr.dicas_pedidas
    + Math.min(60, 10 * Math.max(0, np - cap().pistas_minimas)) + (pr.acao_vencida ? 20 : 0);
  return Math.max(0, Math.max(0, Math.min(1000, base)) - Math.min(100, 15 * pr.viagens_erradas));
}

export async function cercar() {
  progresso();
  if (pr.resolvido_em) return copia({ preso: true, ja_resolvido: true, estado: estado() });
  if (amanheceu()) throw erro('amanheceu');
  const rota = seg().rota.lugares;
  if (pr.rota_passo !== rota.length - 1 || pr.lugar !== rota[rota.length - 1]) throw erro('fora-do-esconderijo');
  try {
    if (!pr.licenca) {
      const min = cap().custos.semLicenca ?? 30;
      return copia({ preso: false, motivo: 'sem-licenca', minutos: min, eventos: tempo(min), estado: estado() });
    }
    if (pr.licenca !== seg().culpado) {
      const min = cap().custos.acusacaoErrada ?? 60;
      pr.acusacoes_erradas += 1;
      pr.licenca = null;
      return copia({ preso: false, motivo: 'licenca-errada', erros: pr.acusacoes_erradas, minutos: min, eventos: tempo(min), estado: estado() });
    }
    const acao = seg().rota.acao || {};
    const rol = rolar(parada(acao.pool || ['destreza', 'atletismo']), pr.fome, acao.dif ?? 3);
    pr.acao_vencida = ok(rol);
    const selos = [];
    if (pr.acusacoes_erradas === 0) selos.push('sem-erros');
    if (pr.dicas_pedidas === 0) selos.push('sem-dicas');
    if (dados.pistas.length && pr.pistas.length >= dados.pistas.length) selos.push('detetive');
    selos.push('primeiro', 'mais-rapido');
    Object.assign(pr, { resolvido_em: new Date().toISOString(), nota: nota(), selos });
    const f = seg().fecho;
    return copia({
      preso: true, acao: { ok: pr.acao_vencida, rolagem: rol }, nota: pr.nota, selos: pr.selos,
      fecho: { paineis: f.paineis, texto: f.texto?.[f.padrao || ''] ?? null, escolhas: (f.escolhas || []).map((e) => ({ id: e.id, rotulo: e.rotulo })) },
      proximo: null, estado: estado(),
    });
  } finally { salvar(); }
}

export async function fecho() {
  progresso();
  if (!pr.resolvido_em) throw erro('nao-resolvido');
  const f = seg().fecho;
  return copia({ paineis: f.paineis, texto: f.texto?.[f.padrao || ''] ?? null, escolhas: (f.escolhas || []).map((e) => ({ id: e.id, rotulo: e.rotulo })), nota: pr.nota, selos: pr.selos, final: pr.final });
}

export async function escolherFinal(capitulo, personagem, escolha) {
  progresso();
  if (!pr.resolvido_em) throw erro('nao-resolvido');
  pr.final = pr.final || escolha;
  salvar();
  return copia({ final: pr.final, estado: estado() });
}

export async function dica() {
  progresso();
  if (pr.resolvido_em) throw erro('acao-indisponivel');
  return copia({ texto: null, estado: estado() });
}

export async function novaNoite() {
  progresso();
  if (pr.resolvido_em || pr.hora < cap().relogio.fim) throw erro('ainda-noite');
  pr.noites += 1;
  pr.hora = cap().relogio.inicio;
  const sobe = d10() < 6;
  if (sobe) pr.fome = Math.min(5, pr.fome + 1);
  salvar();
  return copia({ fomeSobe: sobe, estado: estado() });
}

// O placar do capítulo: na vitrine, só quem joga neste aparelho.
export async function rankingDoCapitulo() {
  if (!pr) return [];
  return copia([{
    nome: 'Você (vitrine)', cla: null, resolvido_em: pr.resolvido_em, nota: pr.nota, erros: pr.acusacoes_erradas, selos: pr.selos, voce: true,
    passo: pr.rota_passo + 1, licenca: pr.licenca != null, viagens_erradas: pr.viagens_erradas,
  }]);
}
export async function ranking() { return []; }

// Fora do formato rota (beco, infiltração, confronto, perseguição e acusação): a vitrine não tem.
const indisponivel = async () => { throw erro('acao-indisponivel'); };
export const infiltracao = indisponivel;
export const confronto = indisponivel;
export const cacar = indisponivel;
export const comecoDaPerseguicao = indisponivel;
export const fimDaPerseguicao = indisponivel;
export const acusar = indisponivel;

export function iniciarPulso() {
  const id = setInterval(() => {
    if (pr && !pr.resolvido_em && document.visibilityState === 'visible') { pr.tempo_ativo_seg += 60; salvar(); }
  }, 60_000);
  return () => clearInterval(id);
}
