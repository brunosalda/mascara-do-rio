// Utilitários de interface: escapar texto, formatar narração (vozes, falas, HQ), datas e avisos.
import * as v5 from './motor/v5.js';
import { CENARIO_PADRAO } from './cidade.js';

export function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Vozes interiores ---------------------------------------------------------------
// Na narração, um parágrafo "[MANHA] texto" ou "[INTUIÇÃO — Difícil: Sucesso] texto"
// vira uma voz interior, colorida pelo grupo: mental, social, físico, disciplina, Besta ou alma.

const normal = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().trim();

const GRUPO_VOZ = new Map();
v5.ATRIBUTOS.forEach((a) => GRUPO_VOZ.set(normal(a.nome), a.grupo));
v5.HABILIDADES.forEach((h) => GRUPO_VOZ.set(normal(h.nome), h.grupo));
Object.values(v5.DISCIPLINAS).forEach((d) => GRUPO_VOZ.set(normal(d.nome), 'disciplina'));
['A BESTA', 'BESTA', 'A FOME', 'FOME'].forEach((n) => GRUPO_VOZ.set(n, 'besta'));
['O SANGUE', 'SANGUE', 'A MASCARA', 'MASCARA', 'HUMANIDADE', 'A CONSCIENCIA', 'CONSCIENCIA', 'O TOUCHSTONE'].forEach((n) => GRUPO_VOZ.set(n, 'alma'));

export function grupoVoz(nome) {
  return GRUPO_VOZ.get(normal(nome)) || 'outra';
}

function inline(texto) {
  return esc(texto)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function paragrafo(p) {
  const voz = p.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
  if (voz) {
    const [, cabeca, resto] = voz;
    const [nome, teste] = cabeca.split(/\s*[—|]\s*/, 2);
    return `<p class="voz voz-${grupoVoz(nome)}"><span class="voz-nome">${esc(nome.trim().toUpperCase())}</span>${teste ? ` <span class="voz-teste">[${esc(teste.trim())}]</span>` : ''} — ${inline(resto.replace(/^[—–-]\s*/, ''))}</p>`;
  }
  // Fala de NPC: "**Seu Antônio** — texto"
  const fala = p.match(/^\*\*(.+?)\*\*\s*[—–-]\s*([\s\S]*)$/);
  if (fala) {
    return `<p class="fala"><span class="falante">${esc(fala[1].toUpperCase())}</span> — ${inline(fala[2])}</p>`;
  }
  return `<p>${inline(p)}</p>`;
}

// Narração do Narrador: parágrafos separados por linha em branco.
export function narracao(texto) {
  return String(texto ?? '')
    .trim()
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => paragrafo(p.trim()))
    .join('');
}

// --- Escolhas numeradas (como as falas de diálogo) ---------------------------------

export function escolhas(opcoes) {
  if (!opcoes?.length) return '';
  return `
    <ol class="escolhas">
      ${opcoes.map((o, i) => `<li><button type="button" data-escolha="${i}"><span class="escolha-num">${i + 1}.</span> — ${esc(o)}</button></li>`).join('')}
    </ol>`;
}

// --- Painéis de HQ ----------------------------------------------------------------------
// painel = { imagem, legenda, baloes: [{ quem, texto }] }. Sem imagem, usa um recorte do cenário.

const ENQUADRAMENTOS = ['18% 70%', '55% 40%', '85% 75%', '35% 85%'];

function urlSegura(u) {
  return typeof u === 'string' && /^(https:\/\/|img\/)/.test(u) ? u : null;
}

export function quadrinhos(paineis, { cenario = CENARIO_PADRAO } = {}) {
  const lista = (Array.isArray(paineis) ? paineis : []).filter((p) => p && (p.legenda || p.imagem || p.baloes?.length));
  if (!lista.length) return '';
  return `
    <div class="hq hq-${Math.min(lista.length, 3)}">
      ${lista.map((p, i) => {
        const img = urlSegura(p.imagem);
        const fundo = img
          ? `<img src="${esc(img)}" alt="${esc(p.legenda || 'Painel')}" loading="lazy">`
          : `<div class="painel-cenario" style="background-image:url('${esc(urlSegura(cenario) || CENARIO_PADRAO)}');background-position:${ENQUADRAMENTOS[i % ENQUADRAMENTOS.length]}"></div>`;
        const baloes = (p.baloes || []).slice(0, 2).map((b, j) => `
          <div class="balao balao-${j}"><b>${esc(String(b.quem || '').toUpperCase())}</b>${esc(b.texto || '')}</div>`).join('');
        return `
          <figure class="painel ${img ? '' : 'sem-imagem'}">
            ${fundo}
            ${p.legenda ? `<figcaption class="legenda">${esc(p.legenda)}</figcaption>` : ''}
            ${baloes}
          </figure>`;
      }).join('')}
    </div>`;
}

const fmtData = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
});
const fmtHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
});

export function dataLonga(iso) {
  return iso ? fmtData.format(new Date(iso)) : '';
}

export function dataCurta(iso) {
  return iso ? fmtHora.format(new Date(iso)) : '';
}

export function pontos(n, max = 5) {
  return `<span class="pontos" aria-label="${n} de ${max}">${'●'.repeat(n)}${'○'.repeat(Math.max(0, max - n))}</span>`;
}

let timerAviso;
export function aviso(texto, tipo = 'info') {
  let el = document.getElementById('aviso');
  if (!el) {
    el = document.createElement('div');
    el.id = 'aviso';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.className = `aviso aviso-${tipo} visivel`;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => el.classList.remove('visivel'), 4200);
}

// Liga eventos por delegação: on(raiz, 'click', '[data-acao=x]', fn)
export function on(raiz, evento, seletor, fn) {
  raiz.addEventListener(evento, (e) => {
    const alvo = e.target.closest(seletor);
    if (alvo && raiz.contains(alvo)) fn(e, alvo);
  });
}
