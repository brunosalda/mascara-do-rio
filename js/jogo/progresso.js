// Progressão (fase 3, etapa P1; desenho em gerencia/analise-progressao.md, seção 5). Tudo lido do estado
// do personagem e dos "ganhos" que o Narrador grava em cada narração (quando o campo existir). Sem banco
// próprio: o site só soma e mostra. Os números das regras ficam escondidos; o jogador vê palavras.

// Idade na noite (seção 7): degraus dentro da fase de neonato, um a cada 5 de experiência GANHA no total.
// Não trava nada: dá um título e abre pedidos mais difíceis. Ancilla só pela história, pelo Narrador
// (estado.idade_narrador). Nomes de exemplo, até o roteirista mandar os definitivos.
import { DEGRAUS, NIVEIS_NOME_BAIRRO, FEITOS } from './progressao-textos.js';
export const DEGRAUS_IDADE = DEGRAUS;
export function famaDe(xpTotal = 0, idadeNarrador = null) {
  const nivel = Math.floor(Math.max(0, xpTotal) / 5) + 1;
  const nome = idadeNarrador || DEGRAUS_IDADE[Math.min(nivel - 1, DEGRAUS_IDADE.length - 1)];
  return { nivel, nome, fracao: (xpTotal % 5) / 5 };
}
// O que cada nível libera (tabela 5.2).
// O que cada degrau da idade na noite dá (seção 7 da análise da progressão): um título e pedidos mais
// difíceis; no 3, também um contato no aeroporto. Os 5 espaços de equipamento ficam abertos desde o
// começo, e as Folhas do Rio ficaram para depois. (Lista de consulta: nenhuma tela a mostra hoje.)
export const LIBERA = [
  [2, 'um título e pedidos mais difíceis nos bairros'],
  [3, 'um título, pedidos mais difíceis e um contato no aeroporto (voo com menos risco)'],
  [4, 'um título e pedidos mais difíceis nos bairros'],
  [5, 'um título e pedidos mais difíceis nos bairros'],
  [6, 'um título e os pedidos mais difíceis da cidade'],
];

// Equipamento: 5 espaços abertos desde o começo (limitados pelos Recursos); consumíveis numa linha.
export const ESPACOS = [
  { id: 'roupa', nome: 'Roupa' },
  { id: 'ferramenta', nome: 'Ferramenta' },
  { id: 'eletronico', nome: 'Celular ou eletrônico' },
  { id: 'arma', nome: 'Arma escondida' },
  { id: 'veiculo', nome: 'Veículo' },
];
export const RARIDADES = { comum: 'comum', bom: 'bom', raro: 'raro', reliquia: 'relíquia' };
export const NIVEIS_BAIRRO = NIVEIS_NOME_BAIRRO;
// O título que aparece sob o nome: o escolhido (estado.titulo) ou o do feito mais recente.
export function tituloDe(estado = {}) {
  if (estado.titulo) return estado.titulo;
  const f = (estado.feitos || []).at(-1);
  if (!f) return '';
  const nome = f.titulo || f;
  return FEITOS.find((x) => x.nome === nome || x.titulo === nome)?.titulo || nome;
}

// Soma o estado com os ganhos de cada narração (do mais antigo ao mais novo).
export function progressoDe(estado = {}, narracoes = []) {
  const ganhos = narracoes.slice().reverse().map((n) => n.ganhos).filter(Boolean);
  const xpGanhos = ganhos.reduce((s, g) => s + (Number(g.xp) || 0), 0);
  const xpTotal = (estado.experiencia_total ?? 0) + xpGanhos;
  const xpGuardada = (estado.experiencia ?? 0) + xpGanhos;
  let itens = [...(estado.itens || [])];
  const status = { ...(estado.status || {}) };
  const feitos = [...(estado.feitos || [])];
  const refugio = { ...(estado.refugio || {}) };
  for (const g of ganhos) {
    for (const it of g.itens || []) itens.push({ ...it, espaco: it.tipo || it.espaco, novo: true });
    for (const pe of g.perdas || []) itens = itens.filter((it) => it.nome !== pe.item);
    for (const st of g.status || []) status[st.faccao] = st.para;
    for (const f of g.feitos || []) if (!feitos.some((x) => (x.titulo || x) === f)) feitos.push({ titulo: f });
    for (const r of g.refugio || []) refugio[r.aspecto] = r.para;
  }
  const fama = famaDe(xpTotal, estado.idade_narrador);
  return { xpTotal, xpGuardada, fama, itens, status, feitos, refugio, bairros: estado.bairros || {}, noitesJogadas: estado.noites_jogadas ?? 0, descansado: !!estado.descansado };
}

// Itens equipados que dão vantagem ✦ numa opção (o traço do item tem termos, como as descobertas).
export function vantagemDosItens(estado, texto) {
  const t = ` ${String(texto || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()} `;
  return (estado?.itens || []).filter((it) => it.equipado && it.termos?.some((x) => t.includes(x)))
    .map((it) => ({ nota: `${it.nome}: ${it.traco}`, item: it.nome }))[0] || null;
}
