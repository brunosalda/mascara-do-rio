// Progressão (fase 3, etapa P1; desenho em gerencia/analise-progressao.md, seção 5). Tudo lido do estado
// do personagem e dos "ganhos" que o Narrador grava em cada narração (quando o campo existir). Sem banco
// próprio: o site só soma e mostra. Os números das regras ficam escondidos; o jogador vê palavras.

// Idade na noite (seção 7): degraus dentro da fase de neonato, um a cada 5 de experiência GANHA no total.
// Não trava nada: dá um título e abre pedidos mais difíceis. Ancilla só pela história, pelo Narrador
// (estado.idade_narrador). Nomes de exemplo, até o roteirista mandar os definitivos.
export const DEGRAUS_IDADE = ['Recém-Abraçado', 'Neonato com nome', 'Respeitado entre os jovens', 'À porta dos antigos'];
export function famaDe(xpTotal = 0, idadeNarrador = null) {
  const nivel = Math.floor(Math.max(0, xpTotal) / 5) + 1;
  const nome = idadeNarrador || DEGRAUS_IDADE[Math.min(nivel - 1, DEGRAUS_IDADE.length - 1)];
  return { nivel, nome, fracao: (xpTotal % 5) / 5 };
}
// O que cada nível libera (tabela 5.2).
export const LIBERA = [
  [2, 'o terceiro espaço de equipamento e a segunda tarefa da noite'],
  [3, 'a primeira Folha do Rio e um contato no aeroporto (voo com menos risco)'],
  [4, 'melhorar o refúgio e o quarto espaço de equipamento'],
  [5, 'a segunda Folha do Rio e o quinto espaço de equipamento'],
  [6, 'um título por nível e tarefas mais difíceis nos bairros'],
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
export const NIVEIS_BAIRRO = ['estranho', 'conhecido', 'de casa', 'de confiança'];

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
