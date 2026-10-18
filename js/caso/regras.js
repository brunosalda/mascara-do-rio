// Regras do caso: paradas tiradas da ficha, chance em palavras, rolagem e Despertar.
// Os dados vêm do motor de regras (motor/dados.js), nunca de texto escrito pela IA.
// Etapa A (demonstração, sem banco): o motor roda no navegador. Na etapa B, a mesma rolagem passa
// para uma função do banco, para ninguém poder mexer nela pelo console.
import * as v5 from '../motor/v5.js';
import { rolarParada, rerrolarComVontade, testeDespertar } from '../motor/dados.js';

export const DIFICULDADE = ['Trivial', 'Fácil', 'Médio', 'Difícil', 'Muito difícil', 'Quase impossível'];

const nomeHab = (id) => v5.HABILIDADES.find((h) => h.id === id)?.nome || v5.ATRIBUTOS.find((a) => a.id === id)?.nome || id;

// A ficha em números (atributos, habilidades, disciplinas, poderes, Força de Vontade).
export function numeros(ficha) {
  try { return v5.calcular(ficha || {}); } catch { return { atributos: {}, habilidades: {}, disciplinas: {}, poderes: [], forcaVontade: 3, vitalidade: 5, humanidade: 7 }; }
}

export function parada(calc, [atr, hab]) {
  return Math.max(1, (calc.atributos?.[atr] || 0) + (calc.habilidades?.[hab] || 0));
}

// A voz do teste é a habilidade (PERSUASÃO, INTUIÇÃO), que já tem a cor do grupo na narração.
export const vozDoTeste = (pool) => nomeHab(pool[1]).toUpperCase();

// Chance exata de conseguir `dif` sucessos com `n` dados (só para mostrar em palavras antes de escolher).
// Cada dado: 6 a 9 (40%) vale 1, 10 (10%) vale 1, e cada par de 10 vale 2 a mais. A Fome não muda a
// chance de sucesso, só o tipo de crítico e de falha.
const fat = (k) => (k <= 1 ? 1 : k * fat(k - 1));
export function chance(n, dif) {
  let p = 0;
  for (let t = 0; t <= n; t++) {
    for (let s = 0; s <= n - t; s++) {
      const total = s + t + Math.floor(t / 2) * 2;
      if (total < dif) continue;
      p += (fat(n) / (fat(t) * fat(s) * fat(n - t - s))) * 0.1 ** t * 0.4 ** s * 0.5 ** (n - t - s);
    }
  }
  return p;
}

export function palavraDaChance(p) {
  if (p >= 0.85) return 'fácil';
  if (p >= 0.6) return 'provável';
  if (p >= 0.4) return 'arriscado';
  if (p >= 0.15) return 'difícil';
  return 'quase impossível';
}

export function rolar({ calc, pool, dif, fome }) {
  return rolarParada({ parada: parada(calc, pool), fome, dificuldade: dif });
}

export const rerrolar = (anterior) => rerrolarComVontade(anterior);

export function deuCerto(res) {
  return ['sucesso', 'critico', 'critico-sangrento'].includes(res.resultado);
}

export function rotuloResultado(res) {
  return {
    sucesso: 'Sucesso', critico: 'Crítico', 'critico-sangrento': 'Crítico sangrento',
    falha: 'Falha', 'falha-total': 'Falha', 'falha-bestial': 'Falha bestial',
  }[res.resultado] || 'Falha';
}

// "[PERSUASÃO — Difícil: Sucesso]" para a narração (a cor e os dois tempos vêm do ui.js).
export function cabecaDoTeste(pool, dif, res) {
  return `[${vozDoTeste(pool)} — ${DIFICULDADE[dif] || 'Médio'}: ${rotuloResultado(res)}]`;
}

// Despertar: usar o sangue pode subir a Fome (motor: 6 ou mais não sobe).
export const despertar = () => testeDespertar();

// O que o personagem tem: um poder pelo id, ou uma disciplina num nível mínimo.
export function temPoder(calc, id) {
  return (calc.poderes || []).includes(id);
}
export function temDisciplina(calc, [disc, nivel]) {
  return (calc.disciplinas?.[disc] || 0) >= nivel;
}

export function nomePoder(id) {
  for (const d of Object.values(v5.DISCIPLINAS)) {
    const p = d.poderes.find((x) => x.id === id);
    if (p) return { poder: p.nome, disciplina: d.nome };
  }
  return { poder: id, disciplina: '' };
}
export const nomeDisciplina = (id) => v5.DISCIPLINAS[id]?.nome || id;
export const nomeHabilidade = nomeHab;
