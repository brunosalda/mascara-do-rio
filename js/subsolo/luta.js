// Subsolo: a luta no corredor, sem canvas e sem tela. O robô de teste roda este módulo em node.
// Fatia de teste: os dados vêm do motor local (js/motor/dados.js). No jogo completo, virão do servidor.
import { rolarParada, testeDespertar } from '../motor/dados.js';
import { DIRECOES, ehParede, primeiroPasso } from './logica.js';

export const RODADAS = 4;
const MINUTOS_DA_DERROTA = 60;
const DIF_ATAQUE = 2;
const ALCANCE_DO_SANGUE = 3;

// O agente e três vampiros. A ordem da lista é a formação: 0 e 1 na frente, 2 e 3 atrás.
export function criarGrupo() {
  const v = (id, nome, vit, fv, fome, ataque, dano, poder) => ({ id, nome, vit, sup: 0, agr: 0, fv, fvMax: fv, fome, ataque, dano, poder, torpor: false, agiu: false, perdeTurno: false, defende: false });
  return [
    v('agente', 'Agente', 7, 5, 1, 6, 2, 'ler'),
    v('brujah', 'Brujah', 8, 4, 2, 7, 3, 'varredura'),
    v('nosferatu', 'Nosferatu', 6, 4, 2, 5, 2, 'sombra'),
    v('tremere', 'Tremere', 5, 5, 2, 4, 1, 'sangue'),
  ];
}

export const NOME_PODER = { ler: 'Ler o golpe', varredura: 'Varredura', sombra: 'Golpe na sombra', sangue: 'Sangue fervente' };

export const TIPOS = {
  carnical: { nome: 'Carniçal', vit: 5, parada: 6, dif: 2, dano: 4, agravado: true },
  atirador: { nome: 'Atirador', vit: 4, parada: 5, dif: 2, dano: 4, agravado: false },
};

// Chance exata de tirar pelo menos "dif" sucessos: cada dado falha (50%), dá sucesso (40%) ou dá 10 (10%), e cada par de 10 vale +2.
export function chance(parada, dif) {
  const n = Math.max(1, parada);
  const fat = [1];
  for (let i = 1; i <= n; i += 1) fat[i] = fat[i - 1] * i;
  let total = 0;
  for (let t = 0; t <= n; t += 1) {
    for (let s = 0; s <= n - t; s += 1) {
      if (s + t + Math.floor(t / 2) * 2 >= dif) total += (fat[n] / (fat[t] * fat[s] * fat[n - t - s])) * 0.1 ** t * 0.4 ** s * 0.5 ** (n - t - s);
    }
  }
  return Math.round(total * 100);
}

function distancia(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

// Para que lado do grupo fica o inimigo colado nele: 'frente', 'esquerda', 'direita' ou 'costas'.
function lado(p, e) {
  const i = DIRECOES.findIndex((d) => d.x === e.x - p.x && d.y === e.y - p.y);
  return ['frente', 'direita', 'costas', 'esquerda'][(i - p.dir + 4) % 4];
}

function vivo(v) { return !v.torpor; }

function ehFrente(p, v) { return p.grupo.indexOf(v) < 2; }

// O grupo cobre a casa inteira: quem está na frente alcança qualquer um colado; quem está atrás só alcança quem chegou pelo lado ou pelas costas.
function alcancaveis(l, v) {
  const p = l.p;
  return l.inimigos.filter((e) => distancia(p, e) === 1 && (ehFrente(p, v) || lado(p, e) !== 'frente'));
}

function maisFerido(lista) { return [...lista].sort((a, b) => a.vit - b.vit)[0]; }

function alvoDoSangue(l) {
  const p = l.p;
  const longe = l.inimigos.filter((e) => distancia(p, e) >= 2 && distancia(p, e) <= ALCANCE_DO_SANGUE);
  if (longe.length) return { alvo: maisFerido(longe), dif: 2 };
  const perto = l.inimigos.filter((e) => distancia(p, e) === 1);
  return perto.length ? { alvo: maisFerido(perto), dif: 4 } : null;
}

function parada(l, v, base) {
  return Math.max(1, base + l.bonus - l.penalidade);
}

export function vezAtual(l) {
  return l.p.grupo.find((v) => vivo(v) && !v.agiu) ?? null;
}

export function podeRecuar(l) {
  if (l.recuou || l.p.grupo.some((v) => v.agiu && !v.perdeuAgora)) return false;
  const d = DIRECOES[(l.p.dir + 2) % 4];
  const x = l.p.x + d.x;
  const y = l.p.y + d.y;
  return !ehParede(l.p.mapa, x, y) && !l.p.inimigos.some((e) => e.x === x && e.y === y);
}

// As ordens possíveis para quem está na vez, com a chance mostrada antes de confirmar.
export function opcoes(l, v) {
  const lista = [];
  const alvos = alcancaveis(l, v);
  const alvo = alvos.length ? maisFerido(alvos) : null;
  const pAtaque = parada(l, v, v.ataque);
  lista.push({ acao: 'atacar', rotulo: 'Atacar', ok: !!alvo, detalhe: alvo ? `${alvo.nome} · ${chance(pAtaque, DIF_ATAQUE)}%` : ehFrente(l.p, v) ? 'ninguém colado' : 'atrás, sem alcance' });
  lista.push(opcaoDePoder(l, v));
  lista.push({ acao: 'defender', rotulo: 'Defender', ok: v.fv > 0, detalhe: v.fv > 0 ? '1 Vontade · metade do dano' : 'sem Vontade' });
  const parceiro = l.p.grupo[(l.p.grupo.indexOf(v) + 2) % 4];
  lista.push({ acao: 'trocar', rotulo: 'Trocar', ok: true, detalhe: `com ${parceiro.nome}${parceiro.torpor ? ' (caído)' : ''}` });
  return lista;
}

function opcaoDePoder(l, v) {
  const rotulo = NOME_PODER[v.poder];
  const custo = v.fome >= 5 ? ' · Fome no máximo' : '';
  if (v.poder === 'ler') return { acao: 'poder', rotulo, ok: l.bonus === 0, detalhe: `todos +2 dados nesta rodada${custo}` };
  if (v.poder === 'varredura') {
    const n = l.inimigos.filter((e) => distancia(l.p, e) === 1).length;
    return { acao: 'poder', rotulo, ok: n > 0 && ehFrente(l.p, v), detalhe: n && ehFrente(l.p, v) ? `acerta ${n} colado${n > 1 ? 's' : ''} · ${chance(parada(l, v, v.ataque - 1), DIF_ATAQUE)}%${custo}` : 'só na frente, com alguém colado' };
  }
  if (v.poder === 'sombra') {
    const colados = l.inimigos.filter((e) => distancia(l.p, e) === 1);
    return { acao: 'poder', rotulo, ok: colados.length > 0, detalhe: colados.length ? `${maisFerido(colados).nome} · ${chance(parada(l, v, 6), DIF_ATAQUE)}%${custo}` : 'ninguém colado' };
  }
  const s = alvoDoSangue(l);
  return { acao: 'poder', rotulo, ok: !!s, detalhe: s ? `${s.alvo.nome}${s.dif > 2 ? ' colado, difícil' : ''} · ${chance(parada(l, v, 6), s.dif)}%${custo}` : 'sem alvo a 3 casas' };
}

function ferirInimigo(l, e, dano, saida) {
  e.vit -= dano;
  const morreu = e.vit <= 0;
  saida.push({ id: e.id, nome: e.nome, dano, morreu });
  if (morreu) {
    l.inimigos = l.inimigos.filter((o) => o !== e);
    l.p.inimigos = l.p.inimigos.filter((o) => o !== e);
  }
}

function danoDoGolpe(base, r) {
  let d = base + Math.max(0, Math.min(2, r.margem));
  if (r.resultado === 'critico') d += 2;
  if (r.resultado === 'critico-sangrento') d += 4;
  return d;
}

function ferirVampiro(v, dano, agravado) {
  const real = v.defende ? Math.ceil(dano / 2) : dano;
  if (agravado) v.agr += real; else v.sup += Math.ceil(real / 2);
  if (v.sup + v.agr >= v.vit) v.torpor = true;
  return real;
}

// A Besta cobra o Crítico sujo: o vampiro acerta quem estiver ao lado dele. A falha bestial tira o próximo turno.
function consequencias(l, v, r, ev) {
  if (r.resultado === 'critico-sangrento') {
    const i = l.p.grupo.indexOf(v);
    const ao = l.p.grupo[i % 2 === 0 ? i + 1 : i - 1];
    if (vivo(ao)) { ferirVampiro(ao, 2, false); ev.besta = `A Besta acerta ${ao.nome}.`; } else ev.besta = 'A Besta rasga a parede: a Máscara sofre lá em cima.';
  }
  if (r.resultado === 'falha-bestial') { v.perdeTurno = true; ev.besta = `${v.nome} perde o próximo turno para a Besta.`; }
}

function despertar(v, ev) {
  const t = testeDespertar();
  ev.despertar = t;
  if (t.fomeSubiu || t.fomeSobe) { v.fome = Math.min(5, v.fome + 1); ev.fomeSubiu = true; }
}

export function agir(l, acao) {
  const v = vezAtual(l);
  const ev = { vampiro: v.id, nome: v.nome, acao, acertos: [] };
  v.agiu = true;
  if (acao !== 'repetir') l.ultimas[v.id] = acao;
  if (acao === 'atacar') {
    const alvo = maisFerido(alcancaveis(l, v));
    const r = rolarParada({ parada: parada(l, v, v.ataque), fome: v.fome, dificuldade: DIF_ATAQUE });
    ev.rolagem = r;
    if (r.margem >= 0) ferirInimigo(l, alvo, danoDoGolpe(v.dano, r), ev.acertos);
    consequencias(l, v, r, ev);
  } else if (acao === 'defender') {
    v.fv -= 1;
    v.defende = true;
  } else if (acao === 'trocar') {
    const g = l.p.grupo;
    const i = g.indexOf(v);
    const j = (i + 2) % 4;
    [g[i], g[j]] = [g[j], g[i]];
    planejar(l, true);
  } else if (acao === 'poder') {
    despertar(v, ev);
    if (v.poder === 'ler') {
      l.bonus = 2;
    } else if (v.poder === 'varredura') {
      const colados = l.inimigos.filter((e) => distancia(l.p, e) === 1);
      const r = rolarParada({ parada: parada(l, v, v.ataque - 1), fome: v.fome, dificuldade: DIF_ATAQUE });
      ev.rolagem = r;
      if (r.margem >= 0) for (const e of colados) ferirInimigo(l, e, danoDoGolpe(2, r), ev.acertos);
      consequencias(l, v, r, ev);
    } else if (v.poder === 'sombra') {
      const alvo = maisFerido(l.inimigos.filter((e) => distancia(l.p, e) === 1));
      const r = rolarParada({ parada: parada(l, v, 6), fome: v.fome, dificuldade: DIF_ATAQUE });
      ev.rolagem = r;
      if (r.margem >= 0) ferirInimigo(l, alvo, danoDoGolpe(4, r), ev.acertos);
      consequencias(l, v, r, ev);
    } else {
      const s = alvoDoSangue(l);
      const r = rolarParada({ parada: parada(l, v, 6), fome: v.fome, dificuldade: s.dif });
      ev.rolagem = r;
      if (r.margem >= 0) ferirInimigo(l, s.alvo, danoDoGolpe(3, r), ev.acertos);
      consequencias(l, v, r, ev);
    }
  }
  if (!l.inimigos.length) l.fim = 'vitoria';
  return ev;
}

// A ordem da rodada anterior, se ainda for possível; senão, atacar; senão, nada a repetir.
export function ordemRepetida(l, v) {
  const lista = opcoes(l, v);
  const anterior = l.ultimas[v.id];
  const velha = lista.find((o) => o.acao === anterior && o.ok && o.acao !== 'trocar');
  if (velha) return velha.acao;
  if (lista[0].ok) return 'atacar';
  if (lista[1].ok && v.poder !== 'ler') return 'poder';
  return lista[2].ok ? 'defender' : 'trocar';
}

function casaDoAlvo(l, e) {
  const p = l.p;
  const g = p.grupo;
  const i = l.inimigos.indexOf(e) % 2;
  let ordem;
  if (e.tipo === 'atirador') ordem = [2 + i, 3 - i, i, 1 - i];
  else if (lado(p, e) === 'frente') ordem = [i, 1 - i, 2 + i, 3 - i];
  else if (lado(p, e) === 'direita') ordem = [3, 2, 1, 0];
  else ordem = [2, 3, 0, 1];
  return ordem.find((k) => vivo(g[k]));
}

function linhaLivre(p, e) {
  if (e.x !== p.x && e.y !== p.y) return false;
  const passos = distancia(p, e);
  if (passos === 0 || passos > 4) return false;
  const sx = Math.sign(p.x - e.x);
  const sy = Math.sign(p.y - e.y);
  for (let k = 1; k < passos; k += 1) if (ehParede(p.mapa, e.x + sx * k, e.y + sy * k)) return false;
  return true;
}

// O que cada inimigo vai fazer: fica à mostra antes de o grupo decidir.
function planejar(l, soAlvos = false) {
  const p = l.p;
  const chave = (x, y) => y * p.mapa.largura + x;
  const ocupadas = new Set(p.inimigos.map((e) => chave(e.x, e.y)));
  for (const e of l.inimigos) {
    const t = TIPOS[e.tipo];
    const colado = distancia(p, e) === 1;
    e.alerta = 1;
    if (e.tipo === 'atirador' && linhaLivre(p, e) && l.inimigos.some((o) => o !== e && distancia(p, o) === 1)) {
      e.prox = null;
      e.intencao = { tipo: 'atira', casa: casaDoAlvo(l, e), dano: t.dano };
    } else if (colado) {
      e.prox = null;
      e.intencao = { tipo: 'ataca', casa: casaDoAlvo(l, e), dano: t.dano };
    } else if (!soAlvos) {
      ocupadas.delete(chave(e.x, e.y));
      const passo = primeiroPasso(p, e, { x: p.x, y: p.y }, ocupadas);
      const ok = passo && !(passo.x === p.x && passo.y === p.y);
      e.prox = ok ? passo : null;
      ocupadas.add(ok ? chave(passo.x, passo.y) : chave(e.x, e.y));
      e.intencao = ok ? { tipo: 'anda' } : { tipo: 'espera' };
    }
    const alvo = e.prox ?? p;
    const d = DIRECOES.findIndex((o) => o.x === Math.sign(alvo.x - e.x) && o.y === Math.sign(alvo.y - e.y));
    if (d >= 0) e.dir = d;
  }
}

function novaRodada(l) {
  l.rodada += 1;
  l.bonus = 0;
  l.penalidade = 0;
  for (const v of l.p.grupo) {
    v.agiu = false;
    v.defende = false;
    if (v.perdeTurno) { v.agiu = true; v.perdeTurno = false; v.perdeuAgora = true; } else v.perdeuAgora = false;
  }
  planejar(l);
}

function moverInimigo(l, e, movimentos) {
  if (e.prox && !l.p.inimigos.some((o) => o !== e && o.x === e.prox.x && o.y === e.prox.y) && !(e.prox.x === l.p.x && e.prox.y === l.p.y)) {
    movimentos.push({ id: e.id, de: { x: e.x, y: e.y }, para: { x: e.prox.x, y: e.prox.y } });
    e.x = e.prox.x;
    e.y = e.prox.y;
    e.prox = null;
  }
}

function golpear(l, e, saida, soAtirador) {
  const t = TIPOS[e.tipo];
  const i = e.intencao;
  if (i.tipo === 'atira' || (i.tipo === 'ataca' && !soAtirador && distancia(l.p, e) === 1)) {
    const anunciado = l.p.grupo[i.casa];
    const v = anunciado && !anunciado.torpor ? anunciado : l.p.grupo[casaDoAlvo(l, e)];
    if (!v) return;
    const r = rolarParada({ parada: t.parada, dificuldade: t.dif });
    const acertou = r.margem >= 0;
    const dano = acertou ? ferirVampiro(v, t.dano + Math.max(0, Math.min(1, r.margem)), t.agravado) : 0;
    saida.push({ tipo: 'golpe', inimigo: e.nome, alvo: v.nome, acertou, dano, torpor: v.torpor, atira: i.tipo === 'atira' });
  }
}

function fecharRodada(l) {
  if (l.p.grupo.every((v) => v.torpor)) l.fim = 'derrota';
  else if (!l.inimigos.length) l.fim = 'vitoria';
  else if (l.rodada >= RODADAS) l.fim = 'fugiram';
  else novaRodada(l);
  l.p.minutosExtra = (l.p.minutosExtra ?? 0) + 1;
}

// A vez dos inimigos: cada um faz o que mostrou. Quem andou não golpeia na mesma rodada.
export function inimigosAgem(l) {
  const eventos = [];
  for (const e of [...l.inimigos]) {
    if (l.p.grupo.every((v) => v.torpor)) break;
    if (e.intencao.tipo === 'anda') {
      const movimentos = [];
      moverInimigo(l, e, movimentos);
      eventos.push({ tipo: 'anda', movimentos });
    } else golpear(l, e, eventos, false);
  }
  fecharRodada(l);
  return eventos;
}

// Recuar gasta a rodada do grupo inteiro: quem estava colado só caminha atrás; o atirador ainda dispara.
export function recuar(l) {
  const p = l.p;
  l.recuou = true;
  const d = DIRECOES[(p.dir + 2) % 4];
  p.x += d.x;
  p.y += d.y;
  planejar(l);
  const eventos = [];
  for (const e of [...l.inimigos]) {
    if (e.intencao.tipo === 'anda') {
      const movimentos = [];
      moverInimigo(l, e, movimentos);
      eventos.push({ tipo: 'anda', movimentos });
    } else golpear(l, e, eventos, true);
  }
  for (const v of p.grupo) v.agiu = true;
  l.rodada -= 1; // recuar, uma vez por luta, não conta nas 4 rodadas
  fecharRodada(l);
  return eventos;
}

// Começa a luta: o vigia do contato e mais dois saem da sombra, nas casas livres mais próximas dele.
export function comecarLuta(p, contato) {
  const e0 = p.inimigos.find((e) => e.id === contato.id);
  const rumo = DIRECOES.findIndex((d) => d.x === e0.x - p.x && d.y === e0.y - p.y);
  if (rumo >= 0) p.dir = rumo;
  const livre = (x, y) => !ehParede(p.mapa, x, y) && !(x === p.x && y === p.y) && !p.inimigos.some((e) => e.x === x && e.y === y);
  const achados = [];
  const vistos = new Set([`${e0.x},${e0.y}`]);
  const fila = [e0];
  for (let i = 0; i < fila.length && achados.length < 2; i += 1) {
    for (const d of DIRECOES) {
      const c = { x: fila[i].x + d.x, y: fila[i].y + d.y };
      const k = `${c.x},${c.y}`;
      if (vistos.has(k) || ehParede(p.mapa, c.x, c.y) || (c.x === p.x && c.y === p.y)) continue;
      vistos.add(k);
      fila.push(c);
      if (livre(c.x, c.y) && achados.length < 2) achados.push(c);
    }
  }
  const montar = (e, tipo, n) => Object.assign(e, { tipo, nome: `${TIPOS[tipo].nome}${n ? ` ${n}` : ''}`, vit: TIPOS[tipo].vit, max: TIPOS[tipo].vit, luta: true, pausa: 0 });
  montar(e0, 'carnical', 1);
  const novos = achados.map((c, i) => montar({ id: `sombra-${i}`, x: c.x, y: c.y, dir: 0, rota: [c], alvo: 0, alerta: 1, prox: null, origem: { ...c } }, i === 0 ? 'atirador' : 'carnical', i === 0 ? 0 : 2));
  p.inimigos.push(...novos);
  // Quem fugiu da luta anterior volta mais forte: cada fugitivo soma 1 de Vitalidade a todos os da próxima.
  const reforco = Math.min(3, p.fugitivos ?? 0);
  p.fugitivos = 0;
  for (const e of [e0, ...novos]) { e.vit += reforco; e.max += reforco; }
  const l = { p, inimigos: [e0, ...novos], rodada: 1, bonus: 0, penalidade: contato.como === 'alcancado' ? 1 : 0, ultimas: {}, fim: null, como: contato.como, golpeInicial: null };
  for (const v of p.grupo) { v.agiu = false; v.defende = false; v.perdeTurno = false; v.perdeuAgora = false; }
  if (contato.como === 'costas') {
    const saida = [];
    ferirInimigo(l, e0, 4, saida);
    l.golpeInicial = saida[0];
  }
  planejar(l);
  return l;
}

// Fecha a luta. Quem sobrou vai embora; na derrota, os homens da Xerife tiram o grupo de lá e custa 1 hora.
export function encerrarLuta(l) {
  const p = l.p;
  if (l.fim === 'fugiram') p.fugitivos = (p.fugitivos ?? 0) + l.inimigos.length;
  p.inimigos = p.inimigos.filter((e) => !l.inimigos.includes(e));
  if (l.fim === 'derrota') {
    p.minutosExtra = (p.minutosExtra ?? 0) + MINUTOS_DA_DERROTA;
    p.x = p.mapa.inicio.x;
    p.y = p.mapa.inicio.y;
    p.dir = p.mapa.direcao;
    for (const v of p.grupo) { v.torpor = false; v.sup = Math.min(v.sup, v.vit - 1); v.agr = Math.min(v.agr, v.vit - 1 - v.sup); }
  }
  for (const v of p.grupo) { v.agiu = false; v.defende = false; v.perdeTurno = false; }
}
