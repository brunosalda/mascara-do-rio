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

// Narração com os painéis de HQ espalhados entre os parágrafos (como cortes de cena).
export function narracaoComPaineis(texto, paineis, { cenario, classe = '' } = {}) {
  const partes = String(texto ?? '').trim().split(/\n\s*\n/).filter((p) => p.trim());
  const lista = (Array.isArray(paineis) ? paineis : []).filter((p) => p && (p.legenda || p.imagem || p.baloes?.length));
  const n = partes.length;
  const posicoes = lista.map((_, k) => Math.round((k * n) / Math.max(lista.length, 1))); // 0, n/3, 2n/3…
  let html = '';
  partes.forEach((p, i) => {
    lista.forEach((painel, k) => { if (posicoes[k] === i) html += quadrinhos([painel], { cenario, solto: true, indice: k }); });
    html += paragrafo(p.trim());
  });
  return `<div class="texto-narracao ${classe}">${html}</div>`;
}

// --- Revelação aos poucos ----------------------------------------------------------------
// A narração aparece fala por fala, com "Continuar" (ou espaço/Enter). Depois de lida até o fim,
// fica marcada no aparelho e aparece inteira nas próximas visitas.

// As palavras de um parágrafo surgem uma a uma, como se estivessem sendo escritas.
const RITMO_PALAVRA = 34;

function escreverPalavras(p) {
  const nos = [];
  const andar = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  while (andar.nextNode()) nos.push(andar.currentNode);
  let i = 0;
  for (const no of nos) {
    const frag = document.createDocumentFragment();
    for (const parte of no.textContent.split(/(\s+)/)) {
      if (!parte) continue;
      if (/^\s+$/.test(parte)) { frag.append(parte); continue; }
      const s = document.createElement('span');
      s.className = 'palavra';
      s.style.animationDelay = `${i++ * RITMO_PALAVRA}ms`;
      s.textContent = parte;
      frag.append(s);
    }
    no.replaceWith(frag);
  }
  return i * RITMO_PALAVRA + 350;
}

export function revelarAosPoucos(artigo, chave, { aoTerminar, aoAvancar } = {}) {
  const itens = [...artigo.querySelectorAll('h3, .hq, .texto-narracao > p, .escolhas')];
  let lido = false;
  try { lido = localStorage.getItem(`mascara.lido.${chave}`) === '1'; } catch { /* sem armazenamento */ }
  if (lido || itens.length < 3) { aoTerminar?.(); return { avancar() { return false; }, terminou: () => true }; }

  itens.forEach((el) => el.classList.add('oculto'));
  const barra = document.createElement('div');
  barra.className = 'continuar';
  barra.innerHTML = '<button type="button" class="btn-continuar">Continuar <span aria-hidden="true">▸</span></button><button type="button" class="btn-texto" data-tudo>Mostrar tudo</button>';
  let i = 0;
  let fim = false;
  let escrevendo = null; // { el, ate }

  function terminar() {
    fim = true;
    barra.remove();
    try { localStorage.setItem(`mascara.lido.${chave}`, '1'); } catch { /* sem armazenamento */ }
    aoTerminar?.();
  }

  function mostrar() {
    // Se o parágrafo ainda está sendo escrito, o primeiro clique só completa o texto.
    if (escrevendo && Date.now() < escrevendo.ate) {
      escrevendo.el.classList.add('pronto');
      escrevendo = null;
      return;
    }
    // Um título aparece junto com o item seguinte.
    while (i < itens.length) {
      const el = itens[i++];
      el.classList.remove('oculto');
      el.classList.add('surgir');
      if (el.tagName === 'P') escrevendo = { el, ate: Date.now() + escreverPalavras(el) };
      if (el.tagName !== 'H3') break;
    }
    aoAvancar?.();
    if (i >= itens.length) { terminar(); return; }
    itens[i - 1].after(barra);
    barra.querySelector('.btn-continuar').focus({ preventScroll: true });
    barra.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  barra.querySelector('.btn-continuar').onclick = mostrar;
  barra.querySelector('[data-tudo]').onclick = () => {
    itens.forEach((el) => { el.classList.remove('oculto'); el.classList.add('pronto'); });
    i = itens.length;
    terminar();
  };
  mostrar();
  return { avancar() { if (fim) return false; mostrar(); return true; }, terminou: () => fim };
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

export function quadrinhos(paineis, { cenario = CENARIO_PADRAO, solto = false, indice = 0 } = {}) {
  const lista = (Array.isArray(paineis) ? paineis : []).filter((p) => p && (p.legenda || p.imagem || p.baloes?.length));
  if (!lista.length) return '';
  return `
    <div class="hq ${solto ? 'hq-solto' : `hq-${Math.min(lista.length, 3)}`}">
      ${lista.map((p, j) => {
        const i = solto ? indice : j;
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
