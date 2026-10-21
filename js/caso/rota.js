// Telas do formato rota (a fuga pela cidade, gerencia/proposta-carmen-v3.md, seção 7): o mapa com a linha
// do rastro e o Arquivo da Xerife com as fichas da Ciranda e o retrato falado desenhado em código.
// Só mostra o que o banco já deu: o mapa nunca sabe a rota (só o percurso já seguido), e o Arquivo só tem
// as fichas públicas. Quem decide a viagem, a Licença e o cerco é o banco (fonte-banco.js).
import { abrirJanela } from '../jogo/camadas.js';
import { esc } from '../ui.js';
import { POSICOES } from '../jogo/mapa.js';

const LARGURA = 1920;
const ALTURA = 1080;
// Posições sobre a pintura do Rio (img/mapa-rio.jpg). As do Centro e arredores ficam um pouco afastadas das do
// mapa da cidade, para os nomes não se encostarem; o aeroporto Santos Dumont fica na beira da baía.
const POS_RIO = {
  ...POSICOES, lapa: [1090, 430], centro: [1205, 330], porto: [1130, 215], 'santa-teresa': [925, 390],
  cemiterio: [1250, 545], 'aeroporto-rio': [1360, 360],
};
// Onde vai o nome de cada lugar: embaixo (padrão), em cima, à esquerda ou à direita do medalhão.
const NOME = { 'santa-teresa': 'esq', centro: 'dir', porto: 'cima' };

export const minutosEntre = (caso, de, para) => caso.tempos.find((t) => t.de === de && t.para === para) || null;
const duracao = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`);

// São Paulo tem um mapa à parte, desenhado: as posições saem da latitude e da longitude de cada lugar.
function posicoesSP(caso) {
  const sp = caso.ordem.filter((id) => caso.lugares[id].cidade === 'sp');
  const geo = sp.map((id) => caso.lugares[id].mapa || { lat: 0, lon: 0 });
  const lats = geo.map((g) => g.lat);
  const lons = geo.map((g) => g.lon);
  const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  return Object.fromEntries(sp.map((id, i) => {
    const fx = lo1 > lo0 ? (geo[i].lon - lo0) / (lo1 - lo0) : 0.5;
    const fy = la1 > la0 ? (la1 - geo[i].lat) / (la1 - la0) : 0.5;
    return [id, [Math.round(560 + fx * 800), Math.round(200 + fy * 640)]];
  }));
}

function rotulos(lado) {
  if (lado === 'esq') return { anc: 'end', nx: -48, ny: 4, my: 40 };
  if (lado === 'dir') return { anc: 'start', nx: 48, ny: 4, my: 40 };
  if (lado === 'cima') return { anc: 'middle', nx: 0, ny: -84, my: -50 };
  return { anc: 'middle', nx: 0, ny: 76, my: 110 };
}

// O mapa. percurso: os lugares do rastro já seguidos, na ordem. visitados: onde o jogador já esteve.
// aoViajar(id) só é chamado depois de escolher o lugar e tocar em "Viajar" (no voo, com o aviso das 2 horas).
export function abrirMapaRota(raiz, { caso, atual, percurso = [], visitados = [], restante = null, aoViajar }) {
  const temSP = caso.ordem.some((id) => caso.lugares[id].cidade === 'sp');
  const pos = { rio: POS_RIO, sp: posicoesSP(caso) };
  return abrirJanela(raiz, {
    titulo: 'Mapa da fuga',
    classe: 'janela-mapa-rota',
    montar: (corpo, camada) => {
      let escolhido = null;
      let cidade = caso.lugares[atual]?.cidade === 'sp' ? 'sp' : 'rio';
      function desenhar() {
        const P = pos[cidade];
        const ids = caso.ordem.filter((id) => caso.lugares[id].cidade === cidade && P[id]);
        const linha = percurso.filter((id) => P[id]).map((id) => P[id].join(',')).join(' ');
        const medalhoes = ids.map((id) => {
          const l = caso.lugares[id];
          const t = minutosEntre(caso, atual, id);
          const r = rotulos(NOME[id]);
          const classes = ['rota-lugar', id === atual ? 'atual' : '', percurso.includes(id) ? 'no-rastro' : '', visitados.includes(id) ? 'visitado' : '', !t && id !== atual ? 'sem-ligacao' : '', id === escolhido ? 'escolhido' : ''].filter(Boolean).join(' ');
          const [x, y] = P[id];
          return `<g class="${classes}" data-lugar="${esc(id)}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(l.nome)}${t ? `, ${duracao(t.minutos)}` : ''}">
            <circle class="rota-alvo" r="60"/><circle class="rota-aro" r="36"/><circle class="rota-miolo" r="28"/>
            ${id === atual ? '<text class="rota-voce" y="10">●</text>' : visitados.includes(id) ? '<text class="rota-visto" y="10">✓</text>' : ''}
            <text class="rota-nome" x="${r.nx}" y="${r.ny}" text-anchor="${r.anc}">${esc(l.nome)}</text>
            ${cidade === 'sp' && l.marcas?.length ? `<text class="rota-marcas" x="${r.nx}" y="${r.my + 36}" text-anchor="${r.anc}">${esc(l.marcas.join(' · '))}</text>` : ''}
            ${t ? `<text class="rota-min" x="${r.nx}" y="${r.my}" text-anchor="${r.anc}">${t.voo ? '✈ ' : ''}${duracao(t.minutos)}</text>` : ''}
          </g>`;
        }).join('');
        const l = escolhido ? caso.lugares[escolhido] : null;
        const t = escolhido ? minutosEntre(caso, atual, escolhido) : null;
        const falta = restante != null && t && t.minutos >= restante;
        const fundo = cidade === 'rio'
          ? `<image href="img/mapa-rio.jpg" x="0" y="0" width="${LARGURA}" height="${ALTURA}" preserveAspectRatio="xMidYMid slice" opacity="0.55"/><rect class="rota-veu" width="${LARGURA}" height="${ALTURA}"/>`
          : `<rect class="rota-fundo-sp" width="${LARGURA}" height="${ALTURA}"/><path class="rota-ruas-sp" d="M300 900 L700 520 L1100 420 L1560 180 M520 260 L860 520 L1200 860 M200 520 H1700 M960 120 V1000"/><text class="rota-cidade" x="80" y="110">São Paulo</text>`;
        corpo.innerHTML = `
          ${temSP ? `<div class="rota-abas" role="tablist">${[['rio', 'Rio de Janeiro'], ['sp', 'São Paulo']].map(([k, n]) => `<button type="button" role="tab" class="chip${cidade === k ? ' marcado' : ''}" aria-selected="${cidade === k}" data-cidade="${k}">${n}</button>`).join('')}</div>` : ''}
          <div class="rota-mapa">
            <svg viewBox="0 0 ${LARGURA} ${ALTURA}" preserveAspectRatio="xMidYMid meet" aria-label="Mapa de ${cidade === 'sp' ? 'São Paulo' : 'Rio de Janeiro'}">
              ${fundo}
              ${linha ? `<polyline class="rota-linha" points="${linha}"/>` : ''}
              ${medalhoes}
            </svg>
          </div>
          <div class="rota-painel" aria-live="polite">
            ${l ? `<b>${esc(l.nome)}</b>${l.marcas?.length ? ` <small class="rota-custo">${esc(l.marcas.join(' · '))}</small>` : ''}<p>${esc(l.resumo || '')}</p>
              ${t ? `<p class="rota-custo">${t.voo ? `A ponte aérea leva ${duracao(t.minutos)} da noite. Na volta, também.` : `A viagem leva ${duracao(t.minutos)}.`}${falta ? ' O sol nasce antes de você chegar.' : ''}</p>
                <button type="button" class="btn${t.voo ? ' destaque' : ''}" data-viajar="${esc(escolhido)}">${t.voo ? `Voar ${esc(l.a || `para ${l.nome}`)}` : `Viajar ${esc(l.a || `para ${l.nome}`)}`}</button>`
              : escolhido === atual ? '<p>Você está aqui.</p>' : '<p class="rota-custo">Não há viagem direta daqui. Entre o Rio e São Paulo, só pela ponte aérea, a partir do aeroporto.</p>'}`
            : `<p>Toque num lugar do mapa ou da lista para viajar.${percurso.length > 1 ? ' A linha vermelha é o rastro que você já seguiu.' : ''}</p>
              <ul class="rota-lista">${ids.filter((id) => id !== atual).map((id) => { const t = minutosEntre(caso, atual, id); return `<li><button type="button" data-lugar="${esc(id)}"><b>${esc(caso.lugares[id].nome)}</b><span>${esc((caso.lugares[id].marcas || []).join(' · ') || caso.lugares[id].resumo || '')}</span><small>${t ? `${t.voo ? '✈ ' : ''}${duracao(t.minutos)}` : 'só pela ponte aérea'}</small></button></li>`; }).join('')}</ul>`}
          </div>`;
        // No celular, o mapa rola de lado: começa centrado onde você está.
        const caixa = corpo.querySelector('.rota-mapa');
        const aqui = P[atual];
        if (caixa.scrollWidth > caixa.clientWidth && aqui) caixa.scrollLeft = (aqui[0] / LARGURA) * caixa.scrollWidth - caixa.clientWidth / 2;
      }
      corpo.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-viajar]');
        if (b) { const id = b.dataset.viajar; camada.fechar(); aoViajar?.(id); return; }
        const c = ev.target.closest('[data-cidade]');
        if (c) { cidade = c.dataset.cidade; escolhido = null; desenhar(); return; }
        const g = ev.target.closest('[data-lugar]');
        if (g) { escolhido = g.dataset.lugar; desenhar(); corpo.querySelector('.rota-painel')?.scrollIntoView?.({ block: 'nearest' }); }
      });
      corpo.addEventListener('keydown', (ev) => {
        const g = ev.target.closest?.('[data-lugar]');
        if (g && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); escolhido = g.dataset.lugar; desenhar(); corpo.querySelector('[data-viajar]')?.focus(); }
      });
      desenhar();
    },
  });
}

// --- O retrato falado ---------------------------------------------------------------------------------
// Silhueta de busto. Cada traço conhecido acrescenta um detalhe: o cabelo (aparência), o sinal particular e,
// no rodapé, o clã aparente. Sem traço, só a sombra.
const CABELO = {
  'cabelo-branco': '<path class="rf-cabelo branco" d="M30 38 Q50 18 70 38 L70 34 Q50 12 30 34 Z"/>',
  ruivo: '<path class="rf-cabelo ruivo" d="M26 46 Q24 16 50 14 Q78 16 74 46 Q70 30 50 28 Q32 30 26 46 Z"/>',
  trancas: '<path class="rf-cabelo trancas" d="M28 40 Q50 10 72 40 Z"/><path class="rf-tranca" d="M30 40 L26 78 M70 40 L74 78"/>',
  'careca-oculos': '<g class="rf-oculos"><circle cx="42" cy="44" r="6"/><circle cx="58" cy="44" r="6"/><path d="M48 44 h4"/></g>',
};
const SINAL = {
  'dedo-faltando': '<path class="rf-sinal" d="M80 92 v-10 m4 10 v-12 m4 12 v-6"/>',
  'brinco-perola': '<circle class="rf-sinal perola" cx="30" cy="54" r="2.6"/>',
  ancora: '<path class="rf-sinal" d="M60 66 v8 m-4 -4 h8 m-8 6 q4 4 8 0"/>',
  cicatriz: '<path class="rf-sinal" d="M54 34 l8 6"/>',
  'anel-serpente': '<circle class="rf-sinal" cx="20" cy="92" r="3"/>',
  medalha: '<circle class="rf-sinal ouro" cx="50" cy="80" r="3.4"/>',
};
export function retratoFalado(tr = {}, { genero = null } = {}) {
  const alto = tr.aparencia === 'muito-alto';
  const miudo = tr.aparencia === 'miudo';
  const esc0 = miudo ? 'translate(10 14) scale(0.8)' : alto ? 'translate(-4 -6) scale(1.08)' : '';
  return `<svg class="retrato-falado${genero ? ` g-${genero}` : ''}" viewBox="0 0 100 100" aria-hidden="true">
    <rect class="rf-fundo" width="100" height="100"/>
    <g transform="${esc0}">
      <path class="rf-busto" d="M14 100 Q16 72 38 66 L62 66 Q84 72 86 100 Z"/>
      <ellipse class="rf-cabeca" cx="50" cy="44" rx="${genero === 'f' ? 17 : 18}" ry="22"/>
      ${CABELO[tr.aparencia] || ''}
      ${SINAL[tr.sinal] || ''}
    </g>
    ${alto ? '<path class="rf-regua" d="M94 8 v84 m-3 0 h6 m-6 -84 h6"/>' : ''}
  </svg>`;
}

// --- O Arquivo da Xerife ------------------------------------------------------------------------------
// conhecidos: os traços já conquistados ('categoria=valor'). marcados: { categoria: valor } do jogador.
// aoPedirLicenca(quem, marcados) devolve a resposta do banco.
export function restantesDo(caso, marcados, presos = []) {
  return caso.arquivo.suspeitos.filter((s) => !presos.includes(s.id) && Object.entries(marcados).every(([k, v]) => !v || s.tracos[k] === v));
}
export function abrirArquivo(raiz, { caso, conhecidos = [], marcados = {}, presos = [], licenca = null, aoMudar, aoPedirLicenca }) {
  const nome = (cat, val) => caso.arquivo.nomes?.[cat]?.[val] || val;
  return abrirJanela(raiz, {
    titulo: 'Arquivo da Xerife',
    classe: 'janela-arquivo',
    montar: (corpo) => {
      const sel = { ...marcados };
      let aviso = '';
      function desenhar() {
        const rest = restantesDo(caso, sel, presos);
        const vivos = new Set(rest.map((s) => s.id));
        const ladrao = Object.fromEntries(conhecidos.map((t) => t.split('=')));
        const lic = licenca ? caso.arquivo.suspeitos.find((s) => s.id === licenca) : null;
        const fichas = [...caso.arquivo.suspeitos].sort((a, b) => Number(!vivos.has(a.id)) - Number(!vivos.has(b.id)));
        corpo.innerHTML = `
          <section class="arquivo-ladrao" aria-label="O que se sabe do ladrão">
            ${retratoFalado(ladrao)}
            <div>
              <p class="arquivo-pergunta">Quem é?</p>
              <ul class="arquivo-sabidos">${conhecidos.length ? conhecidos.map((t) => { const [c, v] = t.split('='); return `<li><b>${esc(caso.arquivo.categorias.find((x) => x.id === c)?.nome || c)}:</b> ${esc(nome(c, v))}</li>`; }).join('') : '<li>Ainda nada.</li>'}</ul>
              <p class="nota">${conhecidos.length} de 3 traços para a Xerife emitir a Licença de Caça.</p>
            </div>
          </section>
          <section class="arquivo-marcar" aria-label="Marcar traços">
            ${caso.arquivo.categorias.map((c) => `<div class="arquivo-categoria"><b title="${esc(c.dica || '')}">${esc(c.nome)}</b>
              <span class="arquivo-valores">${c.valores.map((v) => `<button type="button" class="chip${sel[c.id] === v.id ? ' marcado' : ''}" data-cat="${esc(c.id)}" data-val="${esc(v.id)}" aria-pressed="${sel[c.id] === v.id}">${esc(v.nome)}</button>`).join('')}</span></div>`).join('')}
          </section>
          <p class="arquivo-restam" aria-live="polite">${Object.values(sel).some(Boolean) ? (rest.length === 1 ? 'Sobrou uma ficha só.' : rest.length ? `Restam ${rest.length} fichas.` : 'Nenhuma ficha combina. Algum traço está errado.') : 'Marque os traços que as pistas contaram. As fichas que não combinam saem do quadro.'}${aviso ? ` <b>${esc(aviso)}</b>` : ''}</p>
          ${lic ? `<p class="arquivo-licenca"><span class="carimbo">Licença de Caça</span> contra ${esc(lic.apelido || lic.nome)}. Vá ao esconderijo e cerque.</p>`
            : rest.length === 1 && Object.values(sel).some(Boolean) ? `<p><button type="button" class="btn destaque" data-licenca="${esc(rest[0].id)}">Pedir à Xerife a Licença de Caça contra ${esc(rest[0].apelido || rest[0].nome)}</button></p>` : ''}
          <ol class="arquivo-fichas">${fichas.map((s) => `<li class="ficha-ciranda${vivos.has(s.id) ? '' : ' descartada'}${presos.includes(s.id) ? ' presa' : ''}${licenca === s.id ? ' com-licenca' : ''}">
            ${retratoFalado(s.tracos, { genero: s.genero })}
            <b>${esc(s.apelido || s.nome)}</b><small>${esc(nome('cla', s.tracos.cla))} aparente</small>
            <ul>${['aparencia', 'sinal', 'habito', 'veiculo'].map((k) => `<li>${esc(nome(k, s.tracos[k]))}</li>`).join('')}</ul>
            ${presos.includes(s.id) ? '<span class="carimbo">preso</span>' : vivos.has(s.id) ? '' : '<span class="carimbo">descartado</span>'}
          </li>`).join('')}</ol>`;
      }
      corpo.addEventListener('click', async (ev) => {
        const ch = ev.target.closest('[data-cat]');
        if (ch) {
          const { cat, val } = ch.dataset;
          sel[cat] = sel[cat] === val ? null : val;
          aviso = '';
          aoMudar?.({ ...sel });
          desenhar();
          return;
        }
        const b = ev.target.closest('[data-licenca]');
        if (b) {
          b.disabled = true;
          const r = await aoPedirLicenca?.(b.dataset.licenca, Object.fromEntries(Object.entries(sel).filter(([, v]) => v)));
          if (r?.licenca) licenca = r.licenca;
          else aviso = r?.motivo === 'poucos-tracos' ? 'A Xerife quer pelo menos 3 traços contados por alguém.'
            : r?.motivo === 'traco-sem-pista' ? 'A Xerife pergunta: quem te contou isso? Nenhuma pista falou ainda de um dos tipos de traço que você marcou.'
              : 'A Xerife não emite a Licença com esses traços.';
          desenhar();
        }
      });
      desenhar();
    },
  });
}
