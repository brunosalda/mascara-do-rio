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
    return [id, [Math.round(360 + fx * 1200), Math.round(160 + fy * 720)]];
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
    <b>${hhmm(h)}</b><small${custo > 0 && !passa ? ' class="ao-chegar"' : ''}>${passa ? 'o sol chega antes' : custo > 0 ? `faltam ${duracao(resta - custo)} ao chegar` : resta ? `faltam ${duracao(resta)}` : 'o sol chegou'}</small>
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

export function abrirMapaRota(raiz, { caso, atual, percurso = [], visitados = [], destinos = [], fora = null, relogio = null, restante = null, aoViajar }) {
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
          <g class="rota-rotulo" transform="translate(0 ${R_MED + FOLGA + 2})">
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
                <h3>${fora ? 'Fora do rastro' : 'Para onde foi?'}${destinos.length ? ` <small>${destinos.length}</small>` : ''}</h3>
                ${fora ? `<p class="mapa-fora">Ninguém aqui viu a fuga. Estas são as pistas ouvidas ${esc(fora)}, o último lugar do rastro:</p>` : ''}
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
        // A fonte pode chegar só depois do primeiro desenho do SVG (o "ready" já tinha resolvido).
        document.fonts?.addEventListener('loadingdone', () => { if (corpo.isConnected && pos[cidade] === P) posicionarRotulos(P, ids); }, { once: true });
        selecionar(escolhido && P[escolhido] ? escolhido : null);
        // No celular, o mapa rola de lado: a vista começa enquadrando o Centro (7.1).
        const caixa = corpo.querySelector('.rota-mapa');
        const foco = (caixa.scrollWidth > caixa.clientWidth && P.centro) || P[atual];
        if (caixa.scrollWidth > caixa.clientWidth && foco) caixa.scrollLeft = ((foco[0] - vb.x) / vb.w) * caixa.scrollWidth - caixa.clientWidth / 2;
        caixa.addEventListener('scroll', () => bordas(P, ids), { passive: true });
        bordas(P, ids);
        // A janela entra com animação: as medidas só valem depois que ela assenta.
        for (const ms of [400, 900]) setTimeout(() => { if (corpo.isConnected && pos[cidade] === P) bordas(P, ids); }, ms);
        // E de novo quando a tela muda de tamanho (girar o celular, abrir o teclado).
        const vigia = new ResizeObserver(() => { if (corpo.isConnected && pos[cidade] === P) bordas(P, ids); });
        vigia.observe(caixa);
        if (caixa.firstElementChild) vigia.observe(caixa.firstElementChild);
      }

      // Nenhum rótulo encosta em outro nem passa por cima de um medalhão: cada um tenta o lado preferido (NOME),
      // depois embaixo, à direita, à esquerda e em cima, e fica no primeiro lugar livre (ou no que menos encosta).
      function posicionarRotulos(P, ids, tentativa = 0) {
        let faltou = false;
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
          if (!caixa.width) { faltou = true; continue; }
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
          g.dataset.base = `translate(${melhor.dx} ${melhor.dy - caixa.y + 3})`;
          g.setAttribute('transform', g.dataset.base);
          g.dataset.lado = melhor.k;
          obst.push(melhor.c);
        }
        // Sem medida (a tela ainda não desenhou o texto): tenta de novo no quadro seguinte; até lá, o nome fica embaixo.
        if (faltou && tentativa < 20) requestAnimationFrame(() => { if (corpo.isConnected && pos[cidade] === P) posicionarRotulos(P, ids, tentativa + 1); });
        // Os indicadores de borda dependem de onde os nomes ficaram.
        else if (corpo.querySelector('.mapa-bordas')) bordas(P, ids);
      }

      // No celular: os lugares fora da vista viram indicadores na borda ("‹ Barra 25 min"), que levam até eles.
      function bordas(P, ids) {
        const caixa = corpo.querySelector('.rota-mapa');
        const camadaBordas = corpo.querySelector('.mapa-bordas');
        if (!caixa || !camadaBordas) return;
        if (caixa.scrollWidth <= caixa.clientWidth + 2) { camadaBordas.innerHTML = ''; return; }
        const kx = caixa.scrollWidth / vb.w;
        const ky = caixa.clientHeight / vb.h;
        const rPx = R_MED * kx;
        const W = caixa.clientWidth;
        // Posições calculadas pela geometria do SVG (a leitura da tela pode vir atrasada num painel em segundo plano).
        const tela = (x, y) => [(x - vb.x) * kx - caixa.scrollLeft, (y - vb.y) * ky];
        // Medalhão cortado pela borda também vira indicador: na vista só ficam os inteiros.
        const visiveis = [];
        const fora = ids.map((id) => {
          const px = (P[id][0] - vb.x) * kx - caixa.scrollLeft;
          const lado = px < rPx ? 'esq' : px > W - rPx ? 'dir' : null;
          if (!lado) visiveis.push(id);
          return lado && { id, lado, y: (P[id][1] - vb.y) * ky, t: minutosEntre(caso, atual, id) };
        }).filter(Boolean).sort((a, b) => a.y - b.y);
        // O nome de um medalhão inteiro não sai da vista: se passar da borda, desliza para dentro.
        // O nome de um lugar que virou indicador sai da vista (ficaria cortado na borda).
        const livres = [];
        for (const id of ids) {
          const g = corpo.querySelector(`.rota-lugar[data-lugar="${CSS.escape(id)}"]`);
          const rot = g?.querySelector('.rota-rotulo');
          if (!rot) continue;
          // O medalhão cortado na borda some: o indicador fica no lugar dele.
          g.style.opacity = visiveis.includes(id) ? '' : '0';
          g.style.pointerEvents = visiveis.includes(id) ? '' : 'none';
          if (rot.dataset.base) rot.setAttribute('transform', rot.dataset.base);
          rot.style.visibility = visiveis.includes(id) ? '' : 'hidden';
          if (!visiveis.includes(id)) continue;
          const marcas = rot.querySelector('.rota-marcas');
          if (marcas) marcas.style.display = 'none';
          const bb = rot.getBBox();
          if (marcas) marcas.style.display = '';
          const [tx = 0, ty = 0] = (rot.dataset.base || '').match(/-?[\d.]+/g)?.map(Number) || [];
          const [esq, topo] = tela(P[id][0] + tx + bb.x, P[id][1] + ty + bb.y);
          const [lw, lh] = [bb.width * kx, bb.height * ky];
          const desvio = esq < 6 ? 6 - esq : esq + lw > W - 6 ? W - 6 - (esq + lw) : 0;
          if (desvio) rot.setAttribute('transform', `${rot.getAttribute('transform')} translate(${desvio / kx} 0)`);
          const [mx, my] = tela(P[id][0] - R_MED, P[id][1] - R_MED);
          livres.push({ x: mx, y: my, w: 2 * R_MED * kx, h: 2 * R_MED * ky });
          livres.push({ x: esq + desvio, y: topo, w: lw, h: lh });
        }
        camadaBordas.innerHTML = fora.map((f) => `<button type="button" class="mapa-borda ${f.lado}" data-ir="${esc(f.id)}">${f.lado === 'esq' ? '‹ ' : ''}${esc(caso.lugares[f.id].nome)}${f.t ? ` <small>${duracao(f.t.minutos)}</small>` : ''}${f.lado === 'dir' ? ' ›' : ''}</button>`).join('');
        // Cada indicador fica na altura do lugar, sem cobrir um medalhão nem um nome da vista nem outro indicador.
        const ALT = 44;
        const postos = [];
        [...camadaBordas.children].forEach((b, i) => {
          const f = fora[i];
          const w = b.offsetWidth;
          const x = f.lado === 'esq' ? 6 : W - 6 - w;
          const max = caixa.clientHeight - ALT - 4;
          const ideal = Math.min(max, Math.max(4, f.y - ALT / 2));
          // Outro indicador nunca; medalhão e nome da vista, o mínimo possível; e o mais perto da altura do lugar.
          const custo = (y) => {
            const c = { x, y: y - 3, w, h: ALT + 6 };
            if (postos.some((o) => areaComum(c, o))) return Infinity;
            return livres.reduce((s, o) => s + areaComum(c, o), 0) * 20 + Math.abs(y - ideal);
          };
          let topo = ideal;
          for (let y = 4; y <= max; y += 4) if (custo(y) < custo(topo)) topo = y;
          postos.push({ x, y: topo, w, h: ALT });
          b.style.top = `${Math.round(caixa.offsetTop + topo)}px`;
        });
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

// --- O Arquivo da Xerife (direção de arte, 7.3) -------------------------------------------------------
// Uma frase com lacunas, à esquerda ("Procuro alguém de [aparência], com [sinal]…"), e as fichas da Ciranda
// em papel, à direita. Cada lacuna abre um painel com os valores e o que as pistas disseram daquele tipo de
// traço. As fichas reagem na hora: a que deixa de combinar leva o carimbo FORA e desce para o fundo, menor.
// conhecidos: os traços já conquistados ('categoria=valor'). marcados: { categoria: valor } do jogador.
// aoPedirLicenca(quem, marcados) devolve a resposta do banco.
export function restantesDo(caso, marcados, presos = []) {
  return caso.arquivo.suspeitos.filter((s) => !presos.includes(s.id) && Object.entries(marcados).every(([k, v]) => !v || s.tracos[k] === v));
}
const ICONE_CAT = { aparencia: 'rosto', sinal: 'marca', habito: 'mao', veiculo: 'roda', cla: 'mascara' };
// O texto antes de cada lacuna e o que vem depois dela. O clã fica numa linha à parte.
const FRASE = { aparencia: ['Procuro alguém de ', ','], sinal: [' com ', ','], habito: [' que ', ''], veiculo: [' e foge de ', '.'] };
const TRACOS_FICHA = ['aparencia', 'sinal', 'habito', 'veiculo'];
// pistas: as pistas de traço já ouvidas ({ id, texto, titulo, categoria, indireta, lida }); comPista: os tipos
// de traço com pista (a conta da Licença); aoPedirLeitura(id) pede à Xerife a leitura de uma pista indireta.
// dadosLicenca() devolve { numero, hora, cidade } da Licença emitida, para o documento.
export function abrirArquivo(raiz, { caso, conhecidos = [], comPista = null, pistas = [], indiretas = [], marcados = {}, presos = [], licenca = null, dadosLicenca = () => ({}), aoMudar, aoPedirLicenca, aoPedirLeitura }) {
  const sabidas = new Set(conhecidos.map((t) => t.split('=')[0]));
  const comPistaSet = new Set(comPista || [...sabidas, ...pistas.map((x) => x.categoria).filter(Boolean)]);
  const nome = (cat, val) => caso.arquivo.nomes?.[cat]?.[val] || caso.arquivo.categorias.find((c) => c.id === cat)?.valores.find((v) => v.id === val)?.nome || val;
  const cats = caso.arquivo.categorias;
  const total = caso.arquivo.suspeitos.length;
  return abrirJanela(raiz, {
    titulo: 'Arquivo da Xerife',
    classe: 'janela-arquivo mapa-tela-cheia',
    montar: (corpo, camada) => {
      const sel = { ...marcados };
      let aberta = null;
      let aviso = '';
      let ultima = null;
      corpo.innerHTML = '<div class="arquivo-mesa"><section class="arquivo-esq"></section><section class="arquivo-dir" aria-label="As fichas da Ciranda"></section></div>';
      const esq = corpo.querySelector('.arquivo-esq');
      const dir = corpo.querySelector('.arquivo-dir');
      const algum = () => Object.values(sel).some(Boolean);
      const vivosDe = () => new Set(restantesDo(caso, sel, presos).map((s) => s.id));

      const ficha = (s, vivos, extra = '') => {
        const presa = presos.includes(s.id);
        const fora = !vivos.has(s.id) && !presa;
        const estado = presa ? `<span class="carimbo carimbo-p">${s.genero === 'f' ? 'Presa' : 'Preso'}</span>`
          : licenca === s.id ? '<span class="carimbo carimbo-p">Licença</span>' : fora ? '<span class="carimbo carimbo-p">Fora</span>' : '';
        return `<li class="ficha-ciranda${fora ? ' descartada' : ''}${presa ? ' presa' : ''}${licenca === s.id ? ' com-licenca' : ''}${extra}" data-ficha="${esc(s.id)}">
          <div class="ficha-foto"><span class="ficha-clipe" aria-hidden="true"></span>${retratoFalado(s.tracos, { genero: s.genero })}</div>
          <b class="ficha-nome">${esc(s.apelido || s.nome)}</b>
          <p class="ficha-cla"><small>Clã aparente</small> ${esc(nome('cla', s.tracos.cla))}</p>
          <ul class="ficha-tracos">${TRACOS_FICHA.map((k) => `<li>${icone(ICONE_CAT[k], { tam: 16 })}<span>${esc(nome(k, s.tracos[k]))}</span></li>`).join('')}</ul>
          ${estado}
        </li>`;
      };

      const lacuna = (c) => {
        const v = sel[c.id];
        const semPista = !comPistaSet.has(c.id) && !sabidas.has(c.id);
        return `<button type="button" class="lacuna${v ? ' preenchida' : ''}${semPista ? ' sem-pista' : ''}${ultima === c.id ? ' treme' : ''}" data-lacuna="${esc(c.id)}" aria-expanded="${aberta === c.id}" aria-haspopup="listbox">${icone(semPista ? 'cadeado' : ICONE_CAT[c.id] || 'lupa', { tam: 16 })}<span>${esc(v ? nome(c.id, v) : c.nome.toLowerCase())}</span><i aria-hidden="true">▾</i></button>`;
      };

      const painelDa = (c) => {
        const ditas = pistas.filter((x) => x.categoria === c.id);
        const ler = indiretas.filter((x) => x.categoria === c.id && !sabidas.has(c.id));
        // O traço que se sabe sem pista ouvida (o relato da Xerife no começo da noite) também entra na lista.
        const daXerife = conhecidos.filter((t) => t.split('=')[0] === c.id && !ditas.some((x) => x.sobre === t)).map((t) => nome(c.id, t.split('=')[1]));
        // O resumo da pista começa com o tipo de traço ("Sinal particular: …"): aqui, só o que foi dito e quem disse.
        const semTipo = (t) => String(t || '').replace(/^[^:]{2,32}:\s*/, '');
        return `<div class="lacuna-painel" role="listbox" aria-label="${esc(c.nome)}">
          <ul class="lacuna-valores">${c.valores.map((v) => `<li><button type="button" role="option" data-cat="${esc(c.id)}" data-val="${esc(v.id)}" aria-selected="${sel[c.id] === v.id}">${icone(sel[c.id] === v.id ? 'feito' : ICONE_CAT[c.id] || 'lupa', { tam: 16 })}${esc(v.nome)}</button></li>`).join('')}
            ${sel[c.id] ? `<li><button type="button" class="lacuna-limpar" data-cat="${esc(c.id)}" data-val="">Deixar em branco</button></li>` : ''}</ul>
          <div class="lacuna-pistas"><small>O que as pistas disseram</small>
            ${ditas.length || daXerife.length ? `<ul>${daXerife.map((v) => `<li><q>A Xerife contou: ${esc(v)}</q><cite>Relato do começo da noite</cite></li>`).join('')}${ditas.map((x) => `<li><q>${esc(semTipo(x.texto || x.titulo))}</q>${x.fonte ? `<cite>${esc(x.fonte)}</cite>` : ''}${ler.some((y) => y.id === x.id) ? ` <button type="button" class="btn" data-ler="${esc(x.id)}">Pedir à Xerife que leia <small class="etiqueta-tempo">20 min</small></button>` : ''}</li>`).join('')}</ul>`
              : `<p class="lacuna-cadeado">${icone('cadeado', { tam: 16 })} Nenhuma pista falou disso.</p>`}
          </div>
        </div>`;
      };

      function desenharEsq(vivos) {
        const ladrao = Object.fromEntries(conhecidos.map((t) => t.split('=')));
        const lic = licenca ? caso.arquivo.suspeitos.find((s) => s.id === licenca) : null;
        const sobrou = algum() && vivos.size === 1 ? caso.arquivo.suspeitos.find((s) => vivos.has(s.id)) : null;
        const nTipos = comPistaSet.size;
        const frase = cats.filter((c) => FRASE[c.id]).map((c) => `${esc(FRASE[c.id][0])}${lacuna(c)}${aberta === c.id ? painelDa(c) : ''}${esc(FRASE[c.id][1])}`).join('');
        const outras = cats.filter((c) => !FRASE[c.id]).map((c) => `<span class="frase-linha">${esc(c.id === 'cla' ? 'Clã aparente' : c.nome)}: ${lacuna(c)}${aberta === c.id ? painelDa(c) : ''}</span>`).join('');
        esq.innerHTML = `
          ${lic ? `<button type="button" class="licenca-mini" data-ver-licenca aria-label="Ver a Licença de Caça">
            <span class="licenca-mini-titulo">Licença de Caça <small>Nº ${numeroLicenca(dadosLicenca().numero)}</small></span>
            <span class="licenca-mini-quem">contra <b>${esc(lic.apelido || lic.nome)}</b>. Vá ao esconderijo e cerque.</span>
            <span class="carimbo carimbo-p">Licença</span>
          </button>` : ''}
          <div class="arquivo-ladrao">
            <div class="ficha-foto">${retratoFalado(ladrao)}</div>
            <div><p class="arquivo-pergunta">Quem é?</p>
              <ul class="arquivo-sabidos">${conhecidos.length ? conhecidos.map((t) => { const [c, v] = t.split('='); return `<li>${icone(ICONE_CAT[c] || 'lupa', { tam: 16 })}${esc(nome(c, v))}</li>`; }).join('') : '<li class="nota">Nenhum traço confirmado ainda.</li>'}</ul>
              <p class="arquivo-conta">${Math.min(nTipos, 3)} de 3 tipos de traço com pista</p></div>
          </div>
          <div class="arquivo-frase">${frase}${outras}</div>
          ${sobrou && !lic ? `<ol class="arquivo-sobrou">${ficha(sobrou, vivos, ' sozinha deitada')}</ol>` : ''}
          <div class="arquivo-pe">
            <p class="arquivo-restam-mini">${restamTexto(vivos)}</p>
            ${lic ? '' : `<button type="button" class="btn destaque arquivo-pedir"${sobrou ? ` data-licenca="${esc(sobrou.id)}"` : ' disabled'}>${sobrou ? `Pedir a Licença contra ${esc(sobrou.apelido || sobrou.nome)}` : 'Licença'}</button>`}
          </div>
          ${aviso ? `<p class="arquivo-aviso" role="alert">${esc(aviso)}</p>` : ''}`;
      }
      const restamTexto = (vivos) => (algum() && !vivos.size ? '<b class="nenhuma">Nenhuma ficha combina</b>' : `Restam <b>${vivos.size}</b> de ${total}`);

      function desenharDir(vivos) {
        const lic = !!licenca;
        const sobrou = algum() && vivos.size === 1 && !lic;
        const ordem = [...caso.arquivo.suspeitos].sort((a, b) => Number(!vivos.has(a.id)) - Number(!vivos.has(b.id)));
        // Sobrou uma: ela vai para a coluna da esquerda, embaixo da frase; aqui ficam só as de fora.
        const vivas = sobrou ? [] : ordem.filter((s) => vivos.has(s.id));
        const foras = ordem.filter((s) => !vivos.has(s.id));
        dir.innerHTML = `
          <h3 class="arquivo-restam" aria-live="polite">${algum() && !vivos.size ? '<span class="nenhuma">Nenhuma ficha combina</span>' : `Restam ${vivos.size} de ${total}`}</h3>
          ${vivas.length ? `<ol class="arquivo-fichas vivas">${vivas.map((s) => ficha(s, vivos)).join('')}</ol>` : ''}
          ${foras.length ? `<ol class="arquivo-fichas foras">${foras.map((s) => ficha(s, vivos)).join('')}</ol>` : ''}`;
      }

      // Muda os traços e anima as fichas (FLIP, 320 ms): guarda onde cada ficha estava, redesenha e anima da
      // posição antiga para a nova. A que acabou de sair ganha o carimbo batendo.
      function mudar() {
        const antes = new Map([...corpo.querySelectorAll('[data-ficha]')].map((el) => [el.dataset.ficha + (el.closest('.arquivo-sobrou') ? '*' : ''), el.getBoundingClientRect()]));
        const foraAntes = new Set([...dir.querySelectorAll('.ficha-ciranda.descartada')].map((el) => el.dataset.ficha));
        const vivos = vivosDe();
        desenharEsq(vivos);
        desenharDir(vivos);
        let saiu = false;
        let voltou = false;
        if (!cerimoniasCurtas()) {
          for (const el of corpo.querySelectorAll('[data-ficha]')) {
            const a = antes.get(el.dataset.ficha + (el.closest('.arquivo-sobrou') ? '*' : '')) || antes.get(el.dataset.ficha);
            if (!a) continue;
            const b = el.getBoundingClientRect();
            if (!b.width) continue;
            const dx = a.left - b.left;
            const dy = a.top - b.top;
            const k = a.width / b.width;
            if (Math.abs(dx) + Math.abs(dy) < 1 && Math.abs(k - 1) < 0.01) continue;
            el.animate([{ transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${k})` }, { transformOrigin: '0 0', transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
          }
        }
        for (const el of dir.querySelectorAll('.ficha-ciranda')) {
          const fora = el.classList.contains('descartada');
          if (fora && !foraAntes.has(el.dataset.ficha)) { saiu = true; el.classList.add('carimbando'); }
          if (!fora && foraAntes.has(el.dataset.ficha)) voltou = true;
        }
        if (saiu) som.carmen?.('descartar');
        else if (voltou) som.carmen?.('painel');
      }

      corpo.addEventListener('click', async (ev) => {
        const lac = ev.target.closest('[data-lacuna]');
        if (lac) {
          aberta = aberta === lac.dataset.lacuna ? null : lac.dataset.lacuna;
          ultima = null;
          desenharEsq(vivosDe());
          corpo.querySelector(`.lacuna-painel [aria-selected="true"], .lacuna-painel button`)?.focus({ preventScroll: true });
          return;
        }
        const ch = ev.target.closest('[data-cat]');
        if (ch) {
          const { cat, val } = ch.dataset;
          sel[cat] = val || null;
          aberta = null;
          aviso = '';
          aoMudar?.({ ...sel });
          ultima = algum() && !vivosDe().size ? cat : null;
          mudar();
          corpo.querySelector(`[data-lacuna="${CSS.escape(cat)}"]`)?.focus({ preventScroll: true });
          return;
        }
        if (ev.target.closest('[data-ver-licenca]')) {
          documentoLicenca(raiz, { caso, suspeito: caso.arquivo.suspeitos.find((s) => s.id === licenca), ...dadosLicenca(), jaEmitida: true });
          return;
        }
        const ler = ev.target.closest('[data-ler]');
        if (ler) { camada.fechar(); aoPedirLeitura?.(ler.dataset.ler); return; }
        const b = ev.target.closest('[data-licenca]');
        if (b) {
          b.disabled = true;
          const r = await aoPedirLicenca?.(b.dataset.licenca, Object.fromEntries(Object.entries(sel).filter(([, v]) => v)));
          if (r?.licenca) {
            licenca = r.licenca;
            mudar();
            documentoLicenca(raiz, { caso, suspeito: caso.arquivo.suspeitos.find((s) => s.id === licenca), ...dadosLicenca() });
            return;
          }
          aviso = r?.motivo === 'poucos-tracos' ? 'A Xerife quer pelo menos 3 traços contados por alguém.'
            : r?.motivo === 'traco-sem-pista' ? 'A Xerife pergunta: quem te contou isso? Nenhuma pista falou ainda de um dos tipos de traço que você marcou.'
              : 'A Xerife não emite a Licença com esses traços.';
          mudar();
          return;
        }
        // Clicar fora do painel aberto fecha o painel.
        if (aberta && !ev.target.closest('.lacuna-painel')) { aberta = null; desenharEsq(vivosDe()); }
      });
      const vivos = vivosDe();
      desenharEsq(vivos);
      desenharDir(vivos);
    },
  });
}

// --- A Licença de Caça (direção de arte, 7.4) -----------------------------------------------------------
// Um documento em papel no meio da tela: o retrato e os traços da ficha datilografados, a autorização da
// Xerife com a hora e a assinatura, e o carimbo que cai. É o mesmo com a Licença certa ou errada: quem
// decide se a presa é essa é o cerco. numero: a ordem da Licença no capítulo (1ª, 2ª…). jaEmitida: reabrir
// pelo Arquivo, sem o carimbo cair de novo.
const numeroLicenca = (n) => String(n || 1).padStart(4, '0');
const CAMPOS_LICENCA = [['aparencia', 'Aparência'], ['sinal', 'Sinal particular'], ['habito', 'Hábito'], ['veiculo', 'Como se move']];
export function documentoLicenca(raiz, { caso, suspeito, numero = 1, hora = '', cidade = 'Rio', jaEmitida = false }) {
  if (!suspeito) return null;
  const nome = (cat, val) => caso.arquivo.nomes?.[cat]?.[val] || caso.arquivo.categorias.find((c) => c.id === cat)?.valores.find((v) => v.id === val)?.nome || val;
  return abrirJanela(raiz, {
    titulo: 'Licença de Caça',
    classe: 'janela-licenca',
    montar: (corpo, camada) => {
      corpo.innerHTML = `
        <article class="licenca-doc${jaEmitida ? ' emitida' : ''}">
          <header class="licenca-cabeca"><h3>Licença de Caça</h3><span class="licenca-num">Nº ${numeroLicenca(numero)}</span></header>
          <div class="licenca-quem">
            <div class="ficha-foto"><span class="ficha-clipe" aria-hidden="true"></span>${retratoFalado(suspeito.tracos, { genero: suspeito.genero })}</div>
            <div><small>Codinome</small><b>${esc(suspeito.apelido || suspeito.nome)}</b><p><small>Clã aparente</small> <span class="datilo">${esc(nome('cla', suspeito.tracos.cla))}</span></p></div>
          </div>
          <dl class="licenca-campos">${CAMPOS_LICENCA.map(([k, r]) => `<div><dt>${esc(r)}</dt><dd class="datilo">${esc(nome(k, suspeito.tracos[k]))}</dd></div>`).join('')}</dl>
          <p class="licenca-autorizo datilo">Autorizo a caça. ${esc(cidade)}${hora ? `, ${esc(hora)}` : ''}.</p>
          <p class="licenca-assina"><span>Iolanda</span><small>Xerife</small></p>
          <span class="carimbo carimbo-g licenca-carimbo" aria-hidden="true">Licença</span>
          <button type="button" class="btn destaque licenca-guardar" data-guardar>Guardar a Licença</button>
        </article>`;
      const doc = corpo.querySelector('.licenca-doc');
      corpo.querySelector('[data-guardar]').addEventListener('click', () => camada.fechar());
      if (jaEmitida) return;
      // A cerimônia (guia, 6.2): os valores se datilografam (25 ms por letra, uma tecla a cada 3), a assinatura
      // se desenha (500 ms) e o carimbo cai, com som e um tremor de 2 px. Um clique no papel completa tudo;
      // com "menos movimento", vai direto ao fim.
      const campos = [...doc.querySelectorAll('.datilo')].map((el) => ({ el, txt: el.textContent }));
      const timers = [];
      const depois = (ms, fn) => timers.push(setTimeout(fn, ms));
      let caiu = false;
      const carimbar = () => {
        if (caiu) return;
        caiu = true;
        doc.classList.add('carimbando');
        depois(cerimoniasCurtas() ? 0 : 180, () => { som.carmen?.('carimbo'); doc.classList.add('tremor'); depois(140, () => doc.classList.remove('tremor')); });
      };
      const completar = () => {
        timers.splice(0).forEach(clearTimeout);
        campos.forEach(({ el, txt }) => { el.textContent = txt; });
        doc.classList.add('assinada');
        carimbar();
      };
      if (cerimoniasCurtas()) { completar(); return; }
      campos.forEach(({ el }) => { el.textContent = ''; });
      let t = 420;
      let n = 0;
      for (const { el, txt } of campos) {
        for (let i = 1; i <= txt.length; i += 1) {
          const k = n++;
          depois(t, () => { el.textContent = txt.slice(0, i); if (k % 3 === 0) som.carmen?.('tecla'); });
          t += 25;
        }
        t += 90;
      }
      depois(t, () => doc.classList.add('assinando'));
      depois(t + 560, () => { doc.classList.add('assinada'); carimbar(); });
      doc.addEventListener('click', (ev) => { if (!ev.target.closest('[data-guardar]') && !caiu) completar(); });
    },
  });
}

// O rastro do jogador em miniatura, para o placar (direção de arte, 7.6): a cidade do esconderijo, os trechos
// seguidos em vermelho (desenhados com stroke-dashoffset) e as viagens erradas em cinza tracejado.
export function miniRastro(caso, { percurso = [], visitados = [] } = {}) {
  const fim = percurso.at(-1);
  const cidade = caso.lugares[fim]?.cidade === 'sp' ? 'sp' : 'rio';
  const P = cidade === 'sp' ? posicoesSP(caso) : POS_RIO;
  const ids = [...new Set([...percurso, ...visitados])].filter((id) => P[id] && (caso.lugares[id]?.cidade === 'sp' ? 'sp' : 'rio') === cidade);
  if (!ids.length) return '';
  const xs = ids.map((id) => P[id][0]);
  const ys = ids.map((id) => P[id][1]);
  let vb = { x: Math.min(...xs) - 120, y: Math.min(...ys) - 90, w: Math.max(...xs) - Math.min(...xs) + 240, h: Math.max(...ys) - Math.min(...ys) + 180 };
  // Formato fixo de 16:9, com o rastro no meio.
  if (vb.w / vb.h < 16 / 9) { const w = vb.h * 16 / 9; vb = { ...vb, x: vb.x - (w - vb.w) / 2, w }; } else { const h = vb.w * 9 / 16; vb = { ...vb, y: vb.y - (h - vb.h) / 2, h }; }
  const noRio = percurso.filter((id) => P[id]);
  const seguidos = noRio.slice(1).map((id, i) => `<path class="mini-seguido" pathLength="1" style="--i:${i}" d="M${P[noRio[i]]} L${P[id]}"/>`).join('');
  const erradas = visitados.filter((id) => !percurso.includes(id) && P[id]).map((id) => {
    const antes = visitados.slice(0, visitados.indexOf(id)).reverse().find((x) => P[x]) || noRio[0];
    return P[antes] ? `<path class="mini-errado" d="M${P[antes]} L${P[id]}"/>` : '';
  }).join('');
  const pontos = ids.map((id) => `<circle class="mini-ponto${percurso.includes(id) ? '' : ' errado'}${id === fim ? ' fim' : ''}" cx="${P[id][0]}" cy="${P[id][1]}" r="${id === fim ? 26 : 18}"/>`).join('');
  const fundo = cidade === 'rio'
    ? `<image href="img/mapa-rio.jpg" x="0" y="0" width="${LARGURA}" height="${ALTURA}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect class="rota-fundo-sp" x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}"/>`;
  return `<svg class="mini-rastro" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="O seu rastro no mapa: ${percurso.length} lugares seguidos">
    ${fundo}<rect class="mini-veu" x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}"/>${erradas}${seguidos}${pontos}</svg>`;
}
