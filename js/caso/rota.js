// Telas do formato rota (a fuga pela cidade, gerencia/proposta-carmen-v3.md, seção 7): o mapa com a linha
// do rastro e o Arquivo da Xerife com as fichas da Ciranda e o retrato falado desenhado em código.
// Só mostra o que o banco já deu: o mapa nunca sabe a rota (só o percurso já seguido), e o Arquivo só tem
// as fichas públicas. Quem decide a viagem, a Licença e o cerco é o banco (fonte-banco.js).
import { icone } from './icones.js';
import { abrirJanela } from '../jogo/camadas.js';
import { esc } from '../ui.js';
import { som } from '../ambiente.js';
import { cerimoniasCurtas } from '../leitura.js';
import { POSICOES } from '../jogo/mapa.js';

const LARGURA = 1920;
const ALTURA = 1080;
// O mapa pintado de São Paulo (direção de arte, seção 8) ainda não existe: quando chegar em img/, ponha o caminho
// aqui e ele entra com o mesmo tratamento do Rio. Até lá, o fundo plano com o rio Tietê.
const MAPA_SP = null;
// Posições sobre a pintura do Rio (img/mapa-rio.jpg). As do Centro e arredores ficam um pouco afastadas das do
// mapa da cidade, para os nomes não se encostarem; o aeroporto Santos Dumont fica na beira da baía.
const POS_RIO = {
  ...POSICOES, lapa: [1080, 445], centro: [1215, 325], porto: [1150, 170], 'santa-teresa': [920, 380],
  cemiterio: [1270, 575], 'aeroporto-rio': [1455, 300],
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

// --- O relógio da noite (direção de arte, 5.5): um arco de 220° da hora de começo ao sol. O que já passou fica
// apagado; o que resta, em sódio; a última hora, em vermelho. custo: o trecho que a próxima ação vai gastar.
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export function relogioArco({ inicio, fim, hora, custo = 0 }) {
  const total = Math.max(1, fim - inicio);
  const R = 46;
  const ang = (m) => -110 + 220 * Math.min(1, Math.max(0, (m - inicio) / total));
  const pt = (a, r = R) => [60 + r * Math.sin((a * Math.PI) / 180), 58 - r * Math.cos((a * Math.PI) / 180)].map((v) => v.toFixed(1));
  const arco = (m0, m1, classe) => {
    if (m1 <= m0) return '';
    const [a0, a1] = [ang(m0), ang(m1)];
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    return `<path class="${classe}" d="M${x0} ${y0} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}"/>`;
  };
  let tracos = '';
  for (let m = Math.ceil(inicio / 30) * 30; m <= fim; m += 30) {
    const [x0, y0] = pt(ang(m), R + 5);
    const [x1, y1] = pt(ang(m), R + (m % 60 ? 9 : 13));
    tracos += `<path class="${m % 60 ? 'meia' : 'cheia'}" d="M${x0} ${y0} L${x1} ${y1}"/>`;
  }
  const h = Math.min(fim, hora);
  const resta = Math.max(0, fim - hora);
  const ultima = resta > 0 && resta <= 60;
  const passa = custo > 0 && hora + custo > fim;
  const [px, py] = pt(ang(h));
  return `<div class="relogio-arco${ultima ? ' ultima-hora' : ''}${passa ? ' passa' : ''}" role="img" aria-label="São ${hhmm(h)}; ${resta ? `faltam ${duracao(resta)} até o sol` : 'o sol chegou'}">
    <svg viewBox="0 0 120 84" aria-hidden="true">
      <g class="tracos">${tracos}</g>
      ${arco(inicio, h, 'gasto')}${arco(h, fim, 'resta')}${custo > 0 ? arco(h, Math.min(fim, hora + custo), 'custo') : ''}
      <circle class="ponteiro" cx="${px}" cy="${py}" r="4.5"/>
    </svg>
    <b>${hhmm(h)}</b><small>${passa ? 'o sol chega antes' : resta ? `faltam ${duracao(resta)}` : 'o sol chegou'}</small>
  </div>`;
}

// --- O mapa da fuga (direção de arte, 7.1): tela cheia, os medalhões com a pintura de cada lugar, a coluna
// "Para onde foi?" com as pistas de destino ouvidas aqui e a lista dos lugares; a viagem é animada.
// percurso: os lugares do rastro já seguidos, na ordem. visitados: onde o jogador já esteve, na ordem da visita.
// destinos: as pistas de destino ouvidas no lugar atual ({ titulo, fonte }). relogio: { inicio, fim, hora }.
// aoViajar(id) só é chamado depois de escolher o lugar, tocar em "Viajar" e ver a viagem.
// Sem aoViajar (o capítulo já resolvido), o mapa só mostra o rastro: nada de viagem nem de lista.
const R_MED = 62;
const FOLGA = 8;
const areaComum = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const meioDe = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const veiculo = (de, para, t) => (t?.voo ? 'aviao' : [de, para].includes('niteroi') ? 'barca' : 'carro');

export function abrirMapaRota(raiz, { caso, atual, percurso = [], visitados = [], destinos = [], relogio = null, restante = null, aoViajar }) {
  const voos = caso.tempos.filter((t) => t.voo);
  const temSP = caso.ordem.some((id) => caso.lugares[id].cidade === 'sp');
  const pos = { rio: POS_RIO, sp: posicoesSP(caso) };
  const restanteAgora = relogio ? Math.max(0, relogio.fim - relogio.hora) : restante;
  return abrirJanela(raiz, {
    titulo: aoViajar ? 'Mapa da fuga' : 'O rastro da fuga',
    classe: 'janela-mapa-rota mapa-tela-cheia',
    montar: (corpo, camada) => {
      let escolhido = null;
      let viajando = false;
      let cidade = caso.lugares[atual]?.cidade === 'sp' ? 'sp' : 'rio';
      let vb = null;

      const relogioHtml = (custo = 0) => (relogio ? relogioArco({ ...relogio, custo }) : '');
      function medalhao(id, P) {
        const l = caso.lugares[id];
        const t = minutosEntre(caso, atual, id);
        const errado = visitados.includes(id) && !percurso.includes(id);
        const classes = ['rota-lugar', id === atual ? 'atual' : '', percurso.includes(id) ? 'no-rastro' : '', errado ? 'errado' : '',
          visitados.includes(id) || percurso.includes(id) || id === atual ? 'visitado' : 'novo', !t && id !== atual ? 'sem-ligacao' : ''].filter(Boolean).join(' ');
        const [x, y] = P[id];
        const tempo = t ? `${t.voo ? 'VOO ' : ''}${duracao(t.minutos).toUpperCase()}` : '';
        const largura = tempo.length * 12 + 26;
        // O aeroporto é de onde saem os voos para a outra cidade (mais de um destino).
        const aeroporto = /aeroporto/.test(id) || voos.filter((v) => v.de === id).length > 1;
        return `<g class="${classes}" data-lugar="${esc(id)}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(l.nome)}${t ? `, ${duracao(t.minutos)}` : ''}${id === atual ? ', você está aqui' : ''}">
          <g class="rota-corpo">
            <circle class="rota-alvo" r="${R_MED + 18}"/>
            ${id === atual ? `<circle class="rota-onda" r="${R_MED}"/>` : ''}
            <circle class="rota-miolo" r="${R_MED}"/>
            <image class="rota-pintura-lugar" href="img/cidade/alto/${esc(id)}.webp" x="${-R_MED}" y="${-R_MED}" width="${R_MED * 2}" height="${R_MED * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#rota-recorte)"/>
            ${aeroporto ? `<circle class="rota-selo-aviao" r="26"/>${icone('aviao', { svg: true, tam: 30, classe: 'rota-aviao' })}` : ''}
            <circle class="rota-aro" r="${R_MED}"/>
          </g>
          ${id === atual ? `<text class="rota-voce-tag" y="${-R_MED - 16}">VOCÊ</text>` : ''}
          <g class="rota-rotulo">
            <text class="rota-nome" y="24">${esc(l.nome)}</text>
            ${tempo ? `<g class="rota-pilula"><rect x="${-largura / 2}" y="34" width="${largura}" height="30" rx="15"/><text y="56">${esc(tempo)}</text></g>` : ''}
            ${l.marcas?.length ? `<text class="rota-marcas" y="${tempo ? 92 : 62}">${esc(l.marcas.join(' · '))}</text>` : ''}
          </g>
        </g>`;
      }

      // As linhas: só o rastro (vermelho, com seta no meio de cada trecho), as viagens erradas (cinza tracejado) e a
      // viagem proposta (sódio pontilhado). Dentro da cidade, todos os lugares se ligam: não se desenha cada ligação.
      function linhas(P) {
        const rastro = percurso.slice(1).map((id, i) => {
          const a = P[percurso[i]];
          const b = P[id];
          if (!a || !b) return '';
          return `<path class="rota-rastro" d="M${a} L${meioDe(a, b)} L${b}" marker-mid="url(#rota-seta)"/>`;
        }).join('');
        const erradas = visitados.filter((id) => !percurso.includes(id)).map((id) => {
          const antes = visitados.slice(0, visitados.indexOf(id)).reverse().find((x) => P[x]) || percurso[0];
          return P[antes] && P[id] ? `<path class="rota-errada" d="M${P[antes]} L${P[id]}"/>` : '';
        }).join('');
        return rastro + erradas;
      }

      // A ponte aérea sai pela borda do mapa: "São Paulo ›" no Rio, "‹ Rio" em São Paulo.
      function ponteAerea(P) {
        if (!temSP) return '';
        const v = voos.find((x) => x.de === atual && !P[x.para]) || voos.find((x) => P[x.de] && !P[x.para]);
        if (!v) return '';
        const [x, y] = P[v.de];
        const direita = cidade === 'rio';
        const bx = direita ? vb.x + vb.w - 24 : vb.x + 24;
        const by = direita ? vb.y + 70 : vb.y + vb.h * 0.55;
        return `<path class="rota-ponte" d="M${x} ${y} Q${(x + bx) / 2} ${by - 40} ${bx} ${by + 14}"/>
          <g class="rota-outra-cidade" data-cidade="${direita ? 'sp' : 'rio'}" role="button" tabindex="0" aria-label="Ver o mapa ${direita ? 'de São Paulo' : 'do Rio'}" transform="translate(${bx} ${by})">
            <text text-anchor="${direita ? 'end' : 'start'}">${direita ? 'São Paulo ›' : '‹ Rio'}</text>
          </g>`;
      }

      // O mapa enquadra só a área dos lugares (com folga para os rótulos e a ponte aérea).
      function enquadrar(P, ids) {
        const xs = ids.map((id) => P[id][0]);
        const ys = ids.map((id) => P[id][1]);
        const extraD = temSP && cidade === 'rio' ? 120 : 0;
        const extraE = temSP && cidade === 'sp' ? 120 : 0;
        const x = Math.min(...xs) - 210 - extraE;
        const y = Math.min(...ys) - 160;
        const caixa = { x, y, w: Math.max(...xs) + 210 + extraD - x, h: Math.max(...ys) + 180 - y };
        // No computador, o enquadramento acompanha o formato da área do mapa, sem faixas vazias; no Rio, sem
        // passar da pintura (as posições dos lugares são sobre ela).
        const estreito = corpo.clientWidth <= 760;
        const [larg, alt] = [corpo.clientWidth - 360, corpo.clientHeight];
        if (estreito || larg < 200 || alt < 200) return caixa;
        const r = larg / alt;
        const limite = cidade === 'rio' ? { w: LARGURA, h: ALTURA } : { w: Infinity, h: Infinity };
        if (caixa.w / caixa.h > r) {
          const h = Math.max(caixa.h, Math.min(caixa.w / r, limite.h));
          const y0 = caixa.y + caixa.h / 2 - h / 2;
          caixa.y = cidade === 'rio' && h <= ALTURA ? Math.min(Math.max(0, y0), ALTURA - h) : y0;
          caixa.h = h;
        } else {
          const w = Math.max(caixa.w, Math.min(caixa.h * r, limite.w));
          const x0 = caixa.x + caixa.w / 2 - w / 2;
          caixa.x = cidade === 'rio' && w <= LARGURA ? Math.min(Math.max(0, x0), LARGURA - w) : x0;
          caixa.w = w;
        }
        return caixa;
      }

      function desenhar() {
        const P = pos[cidade];
        const ids = caso.ordem.filter((id) => caso.lugares[id].cidade === cidade && P[id]);
        vb = enquadrar(P, ids);
        const fundo = cidade === 'rio'
          ? `<image class="rota-pintura" href="img/mapa-rio.jpg" x="0" y="0" width="${LARGURA}" height="${ALTURA}" preserveAspectRatio="xMidYMid slice"/><rect class="rota-agua" x="-600" y="-600" width="${LARGURA + 1200}" height="${ALTURA + 1200}"/>
            <rect class="rota-borda-pintura" x="-600" y="-600" width="${LARGURA + 1200}" height="600"/><rect class="rota-borda-pintura" x="-600" y="${ALTURA}" width="${LARGURA + 1200}" height="600"/>
            <rect x="-600" y="0" width="${LARGURA + 1200}" height="120" fill="url(#rota-esfuma-cima)"/><rect x="-600" y="${ALTURA - 120}" width="${LARGURA + 1200}" height="120" fill="url(#rota-esfuma-baixo)"/>`
          : MAPA_SP ? `<image class="rota-pintura" href="${MAPA_SP}" x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" preserveAspectRatio="xMidYMid slice"/><rect class="rota-agua" x="-600" y="-600" width="${LARGURA + 1200}" height="${ALTURA + 1200}"/>`
          : `<rect class="rota-fundo-sp" x="-600" y="-600" width="${LARGURA + 1200}" height="${ALTURA + 1200}"/><path class="rota-tiete" d="M${vb.x - 200} ${vb.y + 70} C ${vb.x + vb.w * 0.25} ${vb.y + 10}, ${vb.x + vb.w * 0.45} ${vb.y + 130}, ${vb.x + vb.w * 0.6} ${vb.y + 60} S ${vb.x + vb.w * 0.9} ${vb.y + 30}, ${vb.x + vb.w + 200} ${vb.y + 100}"/><text class="rota-agua-nome" x="${vb.x + vb.w * 0.62}" y="${vb.y + 40}">rio Tietê</text>`;
        const lista = ids.filter((id) => id !== atual)
          .map((id) => ({ id, t: minutosEntre(caso, atual, id) }))
          .sort((a, b) => (a.t ? a.t.minutos : 1e4) - (b.t ? b.t.minutos : 1e4));
        corpo.innerHTML = `
          <div class="mapa-tela">
            <div class="mapa-area">
              <div class="mapa-barra">
                ${temSP ? `<div class="rota-abas" role="tablist">${[['rio', 'Rio'], ['sp', 'São Paulo']].map(([k, n]) => `<button type="button" role="tab" class="chip${cidade === k ? ' marcado' : ''}" aria-selected="${cidade === k}" data-cidade="${k}">${n}</button>`).join('')}</div>` : '<span></span>'}
                <div class="mapa-relogio">${relogioHtml()}</div>
              </div>
              <div class="rota-mapa">
                <svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" style="aspect-ratio:${vb.w} / ${vb.h}" preserveAspectRatio="xMidYMid meet" aria-label="Mapa de ${cidade === 'sp' ? 'São Paulo' : 'Rio de Janeiro'}">
                  <defs>
                    <clipPath id="rota-recorte"><circle r="${R_MED}"/></clipPath>
                    <linearGradient id="rota-esfuma-cima" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1322"/><stop offset="1" stop-color="#0d1322" stop-opacity="0"/></linearGradient>
                    <linearGradient id="rota-esfuma-baixo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1322" stop-opacity="0"/><stop offset="1" stop-color="#0d1322"/></linearGradient>
                    <marker id="rota-seta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M1 1 L9 5 L1 9z"/></marker>
                  </defs>
                  ${fundo}
                  <g class="rota-linhas">${linhas(P)}</g>
                  <g class="rota-proposta-g"></g>
                  ${ponteAerea(P)}
                  ${ids.map((id) => medalhao(id, P)).join('')}
                  <g class="rota-viagem-g"></g>
                </svg>
              </div>
              <div class="mapa-bordas"></div>
              <ul class="mapa-legenda" aria-hidden="true">
                <li><i class="leg-voce"></i>você</li><li><i class="leg-rastro"></i>rastro</li><li><i class="leg-errada"></i>viagem errada</li>${aoViajar ? '<li><i class="leg-proposta"></i>viagem escolhida</li>' : ''}
              </ul>
            </div>
            <aside class="mapa-coluna">
              ${aoViajar ? `<section class="mapa-pistas">
                <h3>Para onde foi?${destinos.length ? ` <small>${destinos.length}</small>` : ''}</h3>
                ${destinos.length ? destinos.map((d) => `<blockquote class="mapa-pista"><p>${esc(d.titulo)}</p>${d.fonte ? `<cite>${esc(d.fonte)}</cite>` : ''}</blockquote>`).join('')
                  : '<p class="mapa-vazio">Ninguém daqui disse ainda para onde a fuga seguiu. Converse com as testemunhas antes de viajar.</p>'}
              </section>
              <section class="mapa-lugares">
                <h3>Lugares</h3>
                <ul class="rota-lista">${lista.map(({ id, t }) => `<li><button type="button" data-lugar="${esc(id)}" aria-pressed="false"><b>${esc(caso.lugares[id].nome)}</b><small>${t ? `${t.voo ? icone('aviao', { tam: 16 }) : ''}${duracao(t.minutos)}` : 'só pela ponte aérea'}</small>${caso.lugares[id].marcas?.length ? `<span>${esc(caso.lugares[id].marcas.join(' · '))}</span>` : ''}</button></li>`).join('')}</ul>
              </section>` : `<section class="mapa-pistas"><h3>O rastro</h3><p>A linha vermelha é o rastro que você seguiu: ${percurso.length} ${percurso.length > 1 ? 'lugares' : 'lugar'}, do começo ao esconderijo.</p></section>`}
              <div class="mapa-acao" aria-live="polite"></div>
            </aside>
          </div>`;
        posicionarRotulos(P, ids);
        // A medida dos rótulos depende da fonte: quando ela termina de chegar, os rótulos são postos de novo.
        document.fonts?.ready.then(() => { if (corpo.isConnected && pos[cidade] === P) posicionarRotulos(P, ids); });
        selecionar(escolhido && P[escolhido] ? escolhido : null);
        // No celular, o mapa rola de lado: a vista começa enquadrando o Centro (7.1).
        const caixa = corpo.querySelector('.rota-mapa');
        const foco = (caixa.scrollWidth > caixa.clientWidth && P.centro) || P[atual];
        if (caixa.scrollWidth > caixa.clientWidth && foco) caixa.scrollLeft = ((foco[0] - vb.x) / vb.w) * caixa.scrollWidth - caixa.clientWidth / 2;
        caixa.addEventListener('scroll', () => bordas(P, ids), { passive: true });
        bordas(P, ids);
      }

      // Nenhum rótulo encosta em outro nem passa por cima de um medalhão: cada um tenta o lado preferido (NOME),
      // depois embaixo, à direita, à esquerda e em cima, e fica no primeiro lugar livre (ou no que menos encosta).
      function posicionarRotulos(P, ids) {
        const obst = ids.map((id) => {
          const voce = id === atual ? 44 : 0;
          return { x: P[id][0] - R_MED - FOLGA, y: P[id][1] - R_MED - FOLGA - voce, w: 2 * (R_MED + FOLGA), h: 2 * (R_MED + FOLGA) + voce };
        });
        const ordem = [atual, ...ids.filter((id) => id !== atual)].filter((id) => P[id]);
        for (const id of ordem) {
          const g = corpo.querySelector(`.rota-lugar[data-lugar="${CSS.escape(id)}"] .rota-rotulo`);
          if (!g?.getBBox) continue;
          // As marcas só aparecem no mouse, no foco e no escolhido: não contam para a vaga do rótulo.
          const marcas = g.querySelector('.rota-marcas');
          if (marcas) marcas.style.display = 'none';
          const caixa = g.getBBox();
          if (marcas) marcas.style.display = '';
          if (!caixa.width) continue;
          const [w, h] = [caixa.width + 10, caixa.height + 6];
          const [x, y] = P[id];
          const lados = { baixo: [0, R_MED + FOLGA + 2], dir: [R_MED + FOLGA + 8 + w / 2, -h / 2], esq: [-(R_MED + FOLGA + 8 + w / 2), -h / 2], cima: [0, -R_MED - FOLGA - 4 - h - (id === atual ? 44 : 0)] };
          const pref = lados[NOME[id]] ? NOME[id] : 'baixo';
          let melhor = null;
          for (const k of [pref, ...['baixo', 'dir', 'esq', 'cima'].filter((x_) => x_ !== pref)]) {
            const [dx, dy] = lados[k];
            const c = { x: x + dx - w / 2, y: y + dy, w, h };
            const choque = obst.reduce((s, o) => s + areaComum(c, o), 0);
            if (!melhor || choque < melhor.choque) melhor = { k, dx, dy, c, choque };
            if (!choque) break;
          }
          g.setAttribute('transform', `translate(${melhor.dx} ${melhor.dy - caixa.y + 3})`);
          g.dataset.lado = melhor.k;
          obst.push(melhor.c);
        }
      }

      // No celular: os lugares fora da vista viram indicadores na borda ("‹ Barra 25 min"), que levam até eles.
      function bordas(P, ids) {
        const caixa = corpo.querySelector('.rota-mapa');
        const camadaBordas = corpo.querySelector('.mapa-bordas');
        if (!caixa || !camadaBordas) return;
        if (caixa.scrollWidth <= caixa.clientWidth + 2) { camadaBordas.innerHTML = ''; return; }
        const kx = caixa.scrollWidth / vb.w;
        const ky = caixa.clientHeight / vb.h;
        const rPx = R_MED * kx * 0.6;
        const fora = ids.map((id) => {
          const px = (P[id][0] - vb.x) * kx - caixa.scrollLeft;
          const lado = px < rPx ? 'esq' : px > caixa.clientWidth - rPx ? 'dir' : null;
          return lado && { id, lado, y: (P[id][1] - vb.y) * ky, t: minutosEntre(caso, atual, id) };
        }).filter(Boolean).sort((a, b) => a.y - b.y);
        const ocupado = { esq: -99, dir: -99 };
        camadaBordas.innerHTML = fora.map((f) => {
          const topo = Math.min(caixa.clientHeight - 32, Math.max(ocupado[f.lado] + 36, f.y - 16, 4));
          ocupado[f.lado] = topo;
          return `<button type="button" class="mapa-borda ${f.lado}" data-ir="${esc(f.id)}" style="top:${Math.round(caixa.offsetTop + topo)}px">${f.lado === 'esq' ? '‹ ' : ''}${esc(caso.lugares[f.id].nome)}${f.t ? ` <small>${duracao(f.t.minutos)}</small>` : ''}${f.lado === 'dir' ? ' ›' : ''}</button>`;
        }).join('');
      }

      function selecionar(id) {
        escolhido = id;
        const P = pos[cidade];
        corpo.querySelectorAll('.rota-lugar').forEach((g) => g.classList.toggle('escolhido', g.dataset.lugar === id));
        corpo.querySelectorAll('.rota-lista [data-lugar]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lugar === id)));
        const t = id ? minutosEntre(caso, atual, id) : null;
        const prop = corpo.querySelector('.rota-proposta-g');
        if (prop) prop.innerHTML = aoViajar && id && t && P[atual] && P[id] ? `<path class="rota-proposta" d="M${P[atual]} L${P[id]}"/>` : '';
        const rel = corpo.querySelector('.mapa-relogio');
        if (rel) rel.innerHTML = relogioHtml(aoViajar && t ? t.minutos : 0);
        const acao = corpo.querySelector('.mapa-acao');
        if (!acao) return;
        const l = id ? caso.lugares[id] : null;
        if (!l) { acao.innerHTML = aoViajar ? '<p class="mapa-dica">Escolha um lugar no mapa ou na lista.</p>' : ''; return; }
        const falta = restanteAgora != null && t && t.minutos >= restanteAgora;
        acao.innerHTML = `<article class="mapa-cartao">
            <img src="img/cidade/alto/${esc(id)}.webp" alt="" loading="lazy">
            <div class="mapa-cartao-nome"><b>${esc(l.nome)}</b>${t ? `<span class="mapa-tempo">${duracao(t.minutos)}</span>` : ''}</div>
            ${l.marcas?.length ? `<small>${esc(l.marcas.join(' · '))}</small>` : ''}
            ${!aoViajar ? `<p>${percurso.includes(id) ? 'Este lugar está no rastro que você seguiu.' : esc(l.resumo || '')}</p>`
              : id === atual ? '<p>Você está aqui.</p>'
              : t ? `${t.voo ? `<p class="rota-custo">A ponte aérea leva ${duracao(t.minutos)} da noite. Na volta, também.</p>` : ''}${falta ? '<p class="mapa-alerta">O sol nasce antes de você chegar.</p>' : ''}
                <button type="button" class="btn destaque" data-viajar="${esc(id)}">${icone(veiculo(atual, id, t), { tam: 20 })}${t.voo ? `Voar ${esc(l.a || `para ${l.nome}`)}` : `Viajar ${esc(l.a || `para ${l.nome}`)}`}</button>`
              : '<p class="rota-custo">Não há viagem direta daqui. Entre o Rio e São Paulo, só pela ponte aérea, a partir do aeroporto.</p>'}
          </article>`;
      }

      // A viagem (6.2): a linha se desenha do lugar atual ao destino, o veículo anda por ela e o relógio gasta o
      // tempo no mesmo ritmo. 10 min = 0,9 s; 25 min = 1,6 s; voo = 2,4 s, num arco que sai pela borda.
      function animarViagem(id) {
        const P = pos[cidade];
        const t = minutosEntre(caso, atual, id);
        if (!t || cerimoniasCurtas() || !P[atual]) return Promise.resolve();
        const dur = t.voo ? 2400 : Math.round(Math.min(2000, 500 + t.minutos * 44));
        const [x0, y0] = P[atual];
        const [x1, y1] = P[id] || [vb.x + vb.w + 140, y0 - 80];
        const curva = t.voo ? `M${x0} ${y0} Q${(x0 + x1) / 2} ${Math.min(y0, y1) - 220} ${x1} ${y1}` : `M${x0} ${y0} L${x1} ${y1}`;
        const g = corpo.querySelector('.rota-viagem-g');
        corpo.querySelector('.rota-proposta-g').innerHTML = '';
        g.innerHTML = `<path class="rota-viagem" d="${curva}"/><g class="rota-veiculo"><circle r="30"/>${icone(veiculo(atual, id, t), { svg: true, tam: 36 })}</g>`;
        const linha = g.querySelector('.rota-viagem');
        const carro = g.querySelector('.rota-veiculo');
        const total = linha.getTotalLength();
        linha.style.strokeDasharray = `${total}`;
        som.carmen?.(t.voo ? 'voo' : 'viagem', dur / 1000);
        const rel = corpo.querySelector('.mapa-relogio');
        return new Promise((pronto) => {
          const t0 = performance.now();
          let ultimoMin = -1;
          function quadro(agora) {
            const f = Math.min(1, (agora - t0) / dur);
            const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
            linha.style.strokeDashoffset = `${total * (1 - e)}`;
            const p = linha.getPointAtLength(total * e);
            const p2 = linha.getPointAtLength(Math.min(total, total * e + 2));
            const giro = (Math.atan2(p2.y - p.y, p2.x - p.x) * 180) / Math.PI;
            carro.setAttribute('transform', `translate(${p.x} ${p.y})${t.voo ? ` rotate(${(giro + 90).toFixed(1)})` : ''}`);
            const min = Math.round(t.minutos * e);
            if (relogio && rel && min !== ultimoMin) { ultimoMin = min; rel.innerHTML = relogioArco({ ...relogio, hora: relogio.hora + min }); }
            if (f < 1) requestAnimationFrame(quadro);
            else setTimeout(pronto, 180);
          }
          requestAnimationFrame(quadro);
        });
      }

      corpo.addEventListener('click', async (ev) => {
        if (viajando) return;
        const b = ev.target.closest('[data-viajar]');
        if (b) {
          const id = b.dataset.viajar;
          viajando = true;
          corpo.classList.add('viajando');
          await animarViagem(id);
          camada.fechar();
          aoViajar?.(id);
          return;
        }
        const ir = ev.target.closest('[data-ir]');
        if (ir) {
          const caixa = corpo.querySelector('.rota-mapa');
          const P = pos[cidade];
          caixa.scrollTo({ left: ((P[ir.dataset.ir][0] - vb.x) / vb.w) * caixa.scrollWidth - caixa.clientWidth / 2, behavior: cerimoniasCurtas() ? 'auto' : 'smooth' });
          selecionar(ir.dataset.ir);
          return;
        }
        const c = ev.target.closest('[data-cidade]');
        if (c) { cidade = c.dataset.cidade; escolhido = null; desenhar(); return; }
        const g = ev.target.closest('[data-lugar]');
        if (g) {
          selecionar(g.dataset.lugar);
          if (g.closest('.rota-lista')) corpo.querySelector('.mapa-acao')?.scrollIntoView?.({ block: 'nearest' });
        }
      });
      corpo.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        const c = ev.target.closest?.('g[data-cidade]');
        if (c) { ev.preventDefault(); cidade = c.dataset.cidade; escolhido = null; desenhar(); return; }
        const g = ev.target.closest?.('g[data-lugar]');
        if (g) { ev.preventDefault(); selecionar(g.dataset.lugar); corpo.querySelector('[data-viajar]')?.focus(); }
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
// indiretas: as pistas que só descrevem um traço (a partir do capítulo 2), ainda sem a leitura da Xerife;
// nCategorias: quantos tipos de traço já têm pista (a conta da Licença); aoPedirLeitura(id) pede a leitura.
export function abrirArquivo(raiz, { caso, conhecidos = [], nCategorias = conhecidos.length, indiretas = [], marcados = {}, presos = [], licenca = null, aoMudar, aoPedirLicenca, aoPedirLeitura }) {
  const nome = (cat, val) => caso.arquivo.nomes?.[cat]?.[val] || val;
  return abrirJanela(raiz, {
    titulo: 'Arquivo da Xerife',
    classe: 'janela-arquivo',
    montar: (corpo, camada) => {
      const sel = { ...marcados };
      let aviso = '';
      function desenhar() {
        const rest = restantesDo(caso, sel, presos);
        const vivos = new Set(rest.map((s) => s.id));
        const ladrao = Object.fromEntries(conhecidos.map((t) => t.split('=')));
        const lic = licenca ? caso.arquivo.suspeitos.find((s) => s.id === licenca) : null;
        const fichas = [...caso.arquivo.suspeitos].sort((a, b) => Number(!vivos.has(a.id)) - Number(!vivos.has(b.id)));
        corpo.innerHTML = `
          <section class="arquivo-ladrao" aria-label="O que se sabe de quem fugiu">
            ${retratoFalado(ladrao)}
            <div>
              <p class="arquivo-pergunta">Quem é?</p>
              <ul class="arquivo-sabidos">${conhecidos.length ? conhecidos.map((t) => { const [c, v] = t.split('='); return `<li><b>${esc(caso.arquivo.categorias.find((x) => x.id === c)?.nome || c)}:</b> ${esc(nome(c, v))}</li>`; }).join('') : '<li>Ainda nada.</li>'}</ul>
              <p class="nota">${nCategorias > 3 ? `${nCategorias} tipos de traço com pista (bastam 3 para a Xerife emitir a Licença de Caça).` : `${nCategorias} de 3 tipos de traço com pista para a Xerife emitir a Licença de Caça.`}</p>
            </div>
          </section>
          ${indiretas.length ? `<section class="arquivo-indiretas" aria-label="Pistas que só descrevem">
            <p class="nota">Estas testemunhas descreveram um traço sem dizer qual. Compare com as fichas, ou peça à Xerife que leia.</p>
            <ul>${indiretas.map((x) => `<li><q>${esc(x.texto || x.titulo || '')}</q> <small>${esc(caso.arquivo.categorias.find((c) => c.id === x.categoria)?.nome || '')}</small>
              <button type="button" class="btn" data-ler="${esc(x.id)}">Pedir à Xerife que leia <small class="etiqueta-tempo">20 min</small></button></li>`).join('')}</ul>
          </section>` : ''}
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
        const ler = ev.target.closest('[data-ler]');
        if (ler) { camada.fechar(); aoPedirLeitura?.(ler.dataset.ler); return; }
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
