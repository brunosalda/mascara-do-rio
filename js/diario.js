// Diário: todas as noites já narradas (parte pública e a sua parte), do fim para o começo.
import * as banco from './banco.js';
import { esc, narracao, narracaoComPaineis, dataCurta, grupoVoz } from './ui.js';
import { imagemDoLocal, LOCAIS } from './cidade.js';
import { registroDaNoite } from './jogo/registro.js';
import { descobertas, fraseDescobertas } from './jogo/detalhes.js';

// "Esta noite": o que o jogador fez na noite aberta (bairros, detalhes, vozes ouvidas, plano até agora).
function htmlEstaNoite(noite, plano) {
  if (!noite) return '';
  const r = registroDaNoite(noite.id);
  const nome = (id) => LOCAIS.find((l) => l.id === id)?.nome || id;
  const vistosEm = (id) => {
    const todos = descobertas(id, noite.numero).detalhes;
    let n = 0;
    try { n = todos.filter((d) => localStorage.getItem(`mascara.visto.${id}.${d.id}`) === '1').length; } catch { /* sem armazenamento */ }
    return fraseDescobertas(n, todos.length);
  };
  const curtas = [plano?.curta_1, plano?.curta_2].filter((x) => x?.trim());
  return `
    <article class="narracao entrada-diario esta-noite">
      <h3>Seu plano até agora</h3>
      <ul class="lista-palavras">
        <li><span>Ação principal</span><b>${plano?.principal?.trim() ? esc(plano.principal) : 'falta escolher'}</b></li>
        <li><span>Caçada</span><b>${plano?.nao_cacar ? 'não vai caçar' : plano?.cacada?.trim() ? esc(plano.cacada) : 'falta decidir'}</b></li>
        <li><span>Ações curtas</span><b>${curtas.length ? curtas.map(esc).join(' · ') : 'nenhuma'}</b></li>
      </ul>
      <h3>Por onde você andou</h3>
      ${r.visitados.length ? `<ul class="lista-palavras">${r.visitados.map((id) => `<li><span>${esc(nome(id))}</span><b>${vistosEm(id)}</b></li>`).join('')}</ul>` : '<p class="nota">Nenhum bairro ainda.</p>'}
      <h3>O que você examinou</h3>
      ${r.detalhes.length ? r.detalhes.map((d) => `<p class="nota">${esc(nome(d.lugar))} · ${esc(d.rotulo)}</p><div class="texto-narracao">${narracao(`[${d.voz}] ${d.texto}`)}</div>`).join('') : '<p class="nota">Nada ainda. Os pontos com ? na cena são detalhes para examinar.</p>'}
      <h3>O que as vozes disseram</h3>
      ${r.comentarios.length ? `<div class="texto-narracao">${narracao(r.comentarios.map((c) => `[${c.voz}] ${c.texto}`).join('\n\n'))}</div>` : '<p class="nota">Nenhuma voz falou ainda. Ande pela cena.</p>'}
    </article>`;
}

// Rodada 28: o diário vira um livro de pergaminho com abas (Noite, Pistas, Pessoas, Noites passadas).
// Cada entrada tem um carimbo "Noite 3 · 1h20". Só o que é do próprio personagem.
const fmtHoraDiario = new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const carimbo = (numero, t) => {
  if (!t) return `Noite ${numero}`;
  const [h, m] = fmtHoraDiario.format(new Date(t)).split(':');
  return `Noite ${numero} · ${Number(h)}h${m}`;
};
const classeReg = (voz) => { const g = grupoVoz(voz); return g === 'besta' ? 'reg-fome' : `reg-${g}`; };

function abaNoite(noite, plano) {
  if (!noite) return '<p class="nota">A próxima noite ainda não abriu.</p>';
  const r = registroDaNoite(noite.id);
  const linhas = r.linhas.length
    ? r.linhas.map((l) => `<div class="diario-entrada ${classeReg(l.voz)}"><span class="diario-carimbo">${esc(carimbo(noite.numero, l.t))}</span><span><b class="voz">${esc(l.voz)}</b>${esc(l.texto)}</span></div>`).join('')
    : '<p class="nota">O registro desta noite está vazio. O que você examina, ouve e faz na cena entra aqui.</p>';
  return `${htmlEstaNoite(noite, plano)}<h3>Registro da noite</h3>${linhas}`;
}

function abaPistas(noite) {
  if (!noite) return '<p class="nota">Sem noite aberta.</p>';
  const r = registroDaNoite(noite.id);
  const nome = (id) => LOCAIS.find((l) => l.id === id)?.nome || id;
  let vantagens = [];
  try { vantagens = JSON.parse(localStorage.getItem(`mascara.vantagens.${noite.id}`)) || []; } catch { /* sem armazenamento */ }
  const detalhes = r.detalhes.map((d) => `<div class="diario-entrada"><span class="diario-carimbo">${esc(carimbo(noite.numero))}</span><span><b class="voz">${esc(nome(d.lugar))} · ${esc(d.rotulo)}</b><br>${esc(d.texto)}</span></div>`).join('');
  const vant = vantagens.map((v) => `<div class="diario-entrada"><span class="diario-carimbo">✦ ${esc(carimbo(noite.numero))}</span><span><b class="voz">Você sabe algo que ajuda</b><br>${esc(v.nota || '')}</span></div>`).join('');
  return `<h3>Descobertas que dão vantagem</h3>${vant || '<p class="nota">Nenhuma ainda. Alguns detalhes, quando examinados, ajudam uma opção da noite (marca ✦).</p>'}
    <h3>Detalhes examinados</h3>${detalhes || '<p class="nota">Nada examinado ainda. Os pontos com ? na cena são detalhes.</p>'}`;
}

// Pessoas: quem fala nas narrações do próprio personagem (as falas marcadas "[NOME]"), sem as vozes
// interiores. Mostra a primeira noite em que a pessoa apareceu.
function abaPessoas(minhasOrdenadas) {
  const pessoas = new Map();
  for (const { rotulo, texto } of minhasOrdenadas) {
    for (const m of String(texto || '').matchAll(/^\[([^\]]{2,40})\]/gm)) {
      const quem = m[1].trim();
      if (grupoVoz(quem) !== 'outra' || /^(VOCÊ|VOCE|NARRADOR)$/i.test(quem)) continue;
      if (!pessoas.has(quem)) pessoas.set(quem, rotulo);
    }
  }
  if (!pessoas.size) return '<p class="nota">Ninguém ainda. As pessoas que falarem nas suas narrações aparecem aqui.</p>';
  return [...pessoas].map(([quem, onde]) => `<div class="diario-pessoa"><span class="diario-carimbo">${esc(onde)}</span> <b>${esc(quem.charAt(0) + quem.slice(1).toLowerCase())}</b></div>`).join('');
}

// Feitos (fase 3.3, parte da tela): títulos ganhos ao longo das noites, dados pelo Narrador.
function abaFeitos(p) {
  const feitos = p.estado?.feitos || [];
  const escolha = ''; // escolha das três noites: fica para depois (seção 7)
  if (!feitos.length) return `${escolha}<p class="nota">Nenhum feito ainda. Os feitos aparecem aqui quando o Narrador reconhece algo que você fez ("Conhece cada beco da Lapa").</p>`;
  return escolha + feitos.map((f) => `<div class="diario-entrada diario-feito"><span class="diario-carimbo">${esc(f.quando || '')}</span><span><b class="voz">${esc(f.titulo)}</b><br>${esc(f.texto || '')}</span></div>`).join('');
}

export async function telaDiario(raiz, p, { noite = null, plano = null } = {}) {
  raiz.innerHTML = '<p class="carregando">Abrindo o diário…</p>';
  let narracoes = [];
  let resolvidas = [];
  try { [narracoes, resolvidas] = await Promise.all([banco.narracoesDoPersonagem(p.id), banco.noitesResolvidas()]); } catch { /* demonstração ou sem rede */ }
  const minhas = new Map(narracoes.filter((n) => n.tipo === 'noite').map((n) => [n.noite_id, n]));
  const preludio = narracoes.find((n) => n.tipo === 'preludio');
  const cenario = imagemDoLocal(p.estado?.local);

  const noites = resolvidas.map((n) => {
    const minha = minhas.get(n.id);
    return `
      <article class="narracao entrada-diario">
        <p class="sobretitulo"><span class="diario-carimbo">Noite ${n.numero}${n.resolvida_em ? ` · ${dataCurta(n.resolvida_em)}` : ''}</span></p>
        ${n.narracao_publica || n.paineis?.length ? `<h3>Nas ruas do Rio</h3>${narracaoComPaineis(n.narracao_publica, n.paineis, { cenario })}` : ''}
        ${minha ? `<h3>Só você sabe</h3>${narracaoComPaineis(minha.texto, minha.paineis, { cenario, classe: 'privada' })}` : ''}
      </article>`;
  }).join('');
  const ordenadas = [
    ...(preludio ? [{ rotulo: 'Prelúdio', texto: preludio.texto }] : []),
    ...resolvidas.slice().reverse().filter((n) => minhas.has(n.id)).map((n) => ({ rotulo: `Noite ${n.numero}`, texto: minhas.get(n.id).texto })),
  ];
  const passadas = `${noites || '<p class="nota">Nenhuma noite narrada ainda.</p>'}
    ${preludio ? `<article class="narracao entrada-diario"><p class="sobretitulo"><span class="diario-carimbo">Prelúdio</span></p>${narracaoComPaineis(preludio.texto, preludio.paineis, { cenario, classe: 'privada' })}</article>` : ''}`;

  const abas = [
    ['noite', noite ? `Noite ${noite.numero}` : 'Noite', () => abaNoite(noite, plano)],
    ['pistas', 'Pistas', () => abaPistas(noite)],
    ['pessoas', 'Pessoas', () => abaPessoas(ordenadas)],
    ['feitos', 'Feitos', () => abaFeitos(p)],
    ['passadas', 'Noites passadas', () => passadas],
  ];
  let escolhida = 'noite';
  try { escolhida = sessionStorage.getItem('mascara.abaDiario') || 'noite'; } catch { /* sem armazenamento */ }
  if (!abas.some(([id]) => id === escolhida)) escolhida = 'noite';
  raiz.innerHTML = `
    <section class="diario-livro">
      <div class="diario-abas" role="tablist">${abas.map(([id, nome]) => `<button type="button" role="tab" data-aba="${id}" aria-selected="${id === escolhida}">${esc(nome)}</button>`).join('')}</div>
      <div class="diario-pagina" role="tabpanel"></div>
    </section>`;
  const pagina = raiz.querySelector('.diario-pagina');
  const mostrar = (id) => {
    escolhida = id;
    try { sessionStorage.setItem('mascara.abaDiario', id); } catch { /* sem armazenamento */ }
    raiz.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === id)));
    pagina.innerHTML = abas.find(([a]) => a === id)[2]();
  };
  raiz.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => mostrar(b.dataset.aba); });
  pagina.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-escolha3]');
    if (!b) return;
    try { localStorage.setItem(`mascara.escolha3.${p.id}.${Math.floor((p.estado?.noites_jogadas ?? 0) / 3)}`, b.dataset.escolha3); } catch { /* sem armazenamento */ }
    mostrar('feitos');
  });
  mostrar(escolhida);
}
