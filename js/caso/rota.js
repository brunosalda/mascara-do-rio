// Telas do formato rota (a fuga pela cidade, gerencia/proposta-carmen-v3.md, seção 7): o mapa com a linha
// do rastro e o Arquivo da Xerife com as fichas da Ciranda e o retrato falado desenhado em código.
// Só mostra o que o banco já deu: o mapa nunca sabe a rota (só o percurso já seguido), e o Arquivo só tem
// as fichas públicas. Quem decide a viagem, a Licença e o cerco é o banco (fonte-banco.js).
import { icone } from './icones.js';
import { abrirJanela } from '../jogo/camadas.js';
import { esc } from '../ui.js';
import { som } from '../ambiente.js';
import { cerimoniasCurtas } from '../leitura.js';
import { POSICOES, VIZINHOS } from '../jogo/mapa.js';

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
// projecaoSP devolve a conta (lat, lon) → ponto do mapa, a mesma dos lugares, para as avenidas.
function projecaoSP(caso) {
  const sp = caso.ordem.filter((id) => caso.lugares[id].cidade === 'sp');
  const geo = sp.map((id) => caso.lugares[id].mapa || { lat: 0, lon: 0 });
  const lats = geo.map((g) => g.lat);
  const lons = geo.map((g) => g.lon);
  const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  return (lat, lon) => {
    const fx = lo1 > lo0 ? (lon - lo0) / (lo1 - lo0) : 0.5;
    const fy = la1 > la0 ? (la1 - lat) / (la1 - la0) : 0.5;
    return [Math.round(360 + fx * 1200), Math.round(160 + fy * 720)];
  };
}
function posicoesSP(caso) {
  const p = projecaoSP(caso);
  return Object.fromEntries(caso.ordem.filter((id) => caso.lugares[id].cidade === 'sp')
    .map((id) => [id, p(caso.lugares[id].mapa?.lat ?? 0, caso.lugares[id].mapa?.lon ?? 0)]));
}
// As avenidas de São Paulo que aparecem no mapa (latitude e longitude aproximadas das pontas e de uma curva).
const AVENIDAS_SP = [
  { nome: 'Av. Paulista', pts: [[-23.5552, -46.6623], [-23.5632, -46.6538], [-23.5713, -46.6448]] },
  { nome: 'R. da Consolação', pts: [[-23.5552, -46.6623], [-23.5500, -46.6522], [-23.5443, -46.6430]] },
  { nome: 'Av. 23 de Maio', pts: [[-23.5735, -46.6440], [-23.5600, -46.6400], [-23.5480, -46.6365]] },
  { nome: 'Radial Leste', pts: [[-23.5480, -46.6340], [-23.5455, -46.6220], [-23.5440, -46.6100]] },
];
// As luzes acesas da pintura do Rio (medidas uma vez na imagem, em 1920 × 1080): as luzes do mapa vivo piscam
// só onde a pintura já tem cidade acesa, nunca na água.
const LUZES_RIO = '252,122 322,116 456,124 694,126 98,172 134,162 224,182 248,182 352,154 360,152 486,156 504,166 588,132 662,128 736,158 780,162 812,162 1052,182 1088,182 1648,186 290,250 298,232 402,208 432,200 522,242 562,234 624,234 870,250 874,252 968,202 1026,230 1100,240 1212,212 1284,210 1620,236 174,306 232,306 350,316 412,318 424,268 626,256 862,274 872,256 960,270 1048,314 1064,304 1140,316 1498,296 1568,308 1632,314 1674,316 1760,316 1780,268 1852,284 164,320 206,336 252,342 298,352 366,352 470,324 500,330 998,342 1030,324 1114,376 1140,326 1192,354 1268,376 1334,338 1472,324 1630,328 1674,328 1730,328 1768,360 1856,376 514,402 778,440 1058,392 1102,404 1188,398 1220,404 1256,388 1372,442 1416,418 66,510 710,482 744,478 1110,478 1162,472 1222,498 1294,456 1364,462 1698,476 1710,480 92,540 116,570 184,518 1022,556 1120,572 1140,518 1224,520 1258,534 1542,566 1576,566 1780,566 66,582 160,596 224,602 238,584 320,626 368,616 1036,592 1076,594 1180,626 1204,576 1266,626 1360,634 1402,624 1538,580 1638,616 1644,632 1786,578 46,696 106,696 282,668 320,680 372,682 484,700 490,696 1188,642 1236,676 1258,682 1378,660 1402,668 1462,702 1638,642 1682,652 1762,670 1806,694 1840,684 92,710 140,714 226,740 248,716 304,762 410,762 434,750 498,718 1028,762 1110,744 1148,740 1206,710 1280,750 1326,738 1402,742 1462,766 1532,732 1576,754 1664,712 1848,708 252,768 318,768 372,792 482,814 548,772 560,782 628,774 790,814 832,822 902,820 996,782 1060,830 1092,816 1188,830 1202,812 1268,790 1378,786 1430,776 1452,772 1670,776 1742,806 334,860 394,860 448,846 538,834 592,872 646,870 718,864 754,870 846,864 890,836 992,832 1056,836 1118,892 1172,850 1222,876 1256,846 350,900 448,900 532,902 980,898 1040,924 1094,910 1138,906 1134,982'.split(' ').map((p) => p.split(',').map(Number));

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
  const arco = (m0, m1, classe, r = R) => {
    if (m1 <= m0) return '';
    const [a0, a1] = [ang(m0), ang(m1)];
    const [x0, y0] = pt(a0, r);
    const [x1, y1] = pt(a1, r);
    return `<path class="${classe}" d="M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}"/>`;
  };
  // O custo corre num anel por fora (raio + 10), longe do ponteiro, e termina num pino na hora de chegada:
  // numa viagem de 10 minutos o trecho é curto, mas o pino se vê.
  const custoDe = (h0, h1) => {
    const [x0, y0] = pt(ang(h1), R + 5);
    const [x1, y1] = pt(ang(h1), R + 16);
    return `${arco(h0, h1, 'custo', R + 10)}<path class="custo-pino" d="M${x0} ${y0} L${x1} ${y1}"/>`;
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
      ${arco(inicio, h, 'gasto')}${arco(h, fim, 'resta')}${custo > 0 ? custoDe(h, Math.min(fim, hora + custo)) : ''}
      <circle class="ponteiro" cx="${px}" cy="${py}" r="4.5"/>
    </svg>
    <b>${hhmm(h)}</b><small${custo > 0 && !passa ? ' class="ao-chegar"' : ''}>${passa ? 'o sol chega antes' : custo > 0 ? `<span class="faltam">faltam </span>${duracao(resta - custo)} ao chegar` : resta ? `faltam ${duracao(resta)}` : 'o sol chegou'}</small>
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
      let gruposBorda = {};

      const relogioHtml = (custo = 0) => (relogio ? relogioArco({ ...relogio, custo }) : '');
      function medalhao(id, P) {
        const l = caso.lugares[id];
        const t = minutosEntre(caso, atual, id);
        const errado = visitados.includes(id) && !percurso.includes(id);
        const classes = ['rota-lugar', id === atual ? 'atual' : '', percurso.includes(id) ? 'no-rastro' : '', errado ? 'errado' : '',
          visitados.includes(id) || percurso.includes(id) || id === atual ? 'visitado' : 'novo', !t && id !== atual ? 'sem-ligacao' : ''].filter(Boolean).join(' ');
        const [x, y] = P[id];
        const tempo = t ? `${t.voo ? 'VOO ' : ''}${duracao(t.minutos).toUpperCase()}` : '';
        const largura = tempo.length * 14 + 28;
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
          <g class="rota-rotulo" transform="translate(0 ${R_MED + FOLGA + 2})"><g class="rota-rotulo-esc">
            <text class="rota-nome" y="24">${esc(l.nome)}</text>
            ${tempo ? `<g class="rota-pilula"><rect x="${-largura / 2}" y="34" width="${largura}" height="30" rx="15"/><text y="56">${esc(tempo)}</text></g>` : ''}
            ${l.marcas?.length ? `<text class="rota-marcas" y="${tempo ? 94 : 62}">${esc(l.marcas.join(' · '))}</text>` : ''}
          </g></g>
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

      // O mapa vivo (Caminho até o 10, Mapa, item 3): as luzes da cidade piscam devagar, faróis correm nas vias e a
      // barca cruza a baía. Só SVG e CSS, em opacidade baixa, para não puxar o olho; com menos movimento, nada disso.
      // As luzes são pontos de 2 a 4 px com brilho em degradê: no Rio, sobre as luzes da própria pintura; em São
      // Paulo, sobre os quarteirões.
      function vivo(P) {
        if (cerimoniasCurtas()) return '';
        let semente = 7;
        const sorte = () => (semente = (semente * 9301 + 49297) % 233280) / 233280;
        const longeDosMedalhoes = ([x, y]) => Object.values(P).every(([px, py]) => Math.hypot(x - px, y - py) > R_MED + 14);
        // Em São Paulo, a maior parte das luzes acompanha as avenidas, dos dois lados, a cada 7% do traçado; o resto
        // fica solto pelos quarteirões.
        const aoLongo = cidade === 'sp' ? AVENIDAS_SP.flatMap((av) => {
          const q = av.pts.map(([la, lo]) => projSP(la, lo));
          return Array.from({ length: 14 }, (_, i) => 0.04 + i * 0.07).flatMap((t) => {
            const [x, y] = [0, 1].map((k) => (1 - t) ** 2 * q[0][k] + 2 * (1 - t) * t * q[1][k] + t ** 2 * q[2][k]);
            const [dx, dy] = [0, 1].map((k) => 2 * (1 - t) * (q[1][k] - q[0][k]) + 2 * t * (q[2][k] - q[1][k]));
            const n = Math.hypot(dx, dy) || 1;
            return [1, -1].map((lado) => [x - (dy / n) * lado * (15 + sorte() * 6), y + (dx / n) * lado * (15 + sorte() * 6), true]);
          });
        }) : [];
        const pontos = cidade === 'rio' ? LUZES_RIO
          : [...aoLongo, ...Array.from({ length: 50 }, () => [vb.x + sorte() * vb.w, vb.y + sorte() * vb.h])];
        const luzes = pontos.filter(longeDosMedalhoes).map(([x, y, av]) => `<circle class="vivo-luz${av ? ' avenida' : ''}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(av ? 6 + sorte() * 2 : 4 + sorte() * 3).toFixed(1)}" fill="url(#vivo-brilho)" style="animation-duration:${(4 + sorte() * 4).toFixed(1)}s;animation-delay:-${(sorte() * 6).toFixed(1)}s"/>`).join('');
        const trechos = cidade === 'rio'
          ? VIZINHOS.filter(([a, b]) => P[a] && P[b] && !(a === 'centro' && b === 'niteroi')).map(([a, b]) => `M${P[a]} L${P[b]}`)
          : AVENIDAS_SP.map((av) => `M${av.pts.map(([la, lo]) => projSP(la, lo)).join(' L')}`);
        const vias = trechos.map((d, i) => `<circle class="vivo-farol" r="5"><animateMotion dur="${9 + (i % 4) * 2.5}s" begin="-${(i * 1.7).toFixed(1)}s" repeatCount="indefinite" ${i % 2 ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear" ' : ''}path="${d}"/></circle>`).join('');
        // A barca: um casco alongado com a esteira, que vai do Centro a Niterói por baixo do aeroporto e volta.
        let barca = '';
        if (cidade === 'rio' && P.centro && P.niteroi) {
          const [cx, cy] = P.centro;
          const [nx, ny] = P.niteroi;
          const ida = `M${cx + 70} ${cy + 40} C ${cx + 180} ${cy + 170}, ${nx - 200} ${ny + 170}, ${nx - 70} ${ny + 40}`;
          const volta = `C ${nx - 210} ${ny + 210}, ${cx + 170} ${cy + 210}, ${cx + 70} ${cy + 40}`;
          barca = `<g class="vivo-barca"><path class="vivo-esteira" d="M-12 0 L-46 -7 M-12 0 L-46 7"/><path class="vivo-casco" d="M-16 -5 L10 -5 Q18 -5 22 0 Q18 5 10 5 L-16 5 Z"/><rect class="vivo-cabine" x="-8" y="-3" width="12" height="6" rx="1.5"/><animateMotion dur="34s" repeatCount="indefinite" rotate="auto" calcMode="linear" keyPoints="0;0.5;0.5;1;1" keyTimes="0;0.42;0.5;0.92;1" path="${ida} ${volta}"/></g>`;
        }
        const nevoa = cidade === 'sp' ? [0.25, 0.6, 0.85].map((f, i) => `<ellipse class="vivo-nevoa" cx="${(vb.x + vb.w * f).toFixed(0)}" cy="${(vb.y + vb.h * (0.3 + i * 0.22)).toFixed(0)}" rx="${(vb.w * 0.28).toFixed(0)}" ry="${(vb.h * 0.12).toFixed(0)}" fill="url(#vivo-nevoa)" style="animation-delay:-${i * 9}s"/>`).join('') : '';
        return `<g class="rota-vivo" aria-hidden="true">${luzes}${vias}${barca}${nevoa}</g>`;
      }

      // A trama de São Paulo em 3 × 3 células de 200 × 132 (600 × 396 até repetir, em vez de 200 × 132): cada célula
      // tem uma das quatro divisões de quarteirão, diferente da vizinha da esquerda, às vezes uma praça, e janelas em
      // lugares sorteados. Algumas janelas piscam devagar (sem movimento, ficam acesas). O Centro, em 4 × 4 (280 × 280).
      function tramaSP() {
        let semente = 11;
        const sorte = () => (semente = (semente * 9301 + 49297) % 233280) / 233280;
        const piscar = !cerimoniasCurtas();
        const janelas = (x, y, w, h, quantas) => Array.from({ length: quantas }, () => {
          const [jx, jy, r] = [x + 6 + sorte() * (w - 17), y + 6 + sorte() * (h - 14), sorte()];
          const pisca = piscar && r > 0.86
            ? `<animate attributeName="opacity" values="0.55;0.55;0.06;0.06;0.55" keyTimes="0;0.6;0.64;0.8;1" dur="${(6 + sorte() * 7).toFixed(1)}s" begin="-${(sorte() * 9).toFixed(1)}s" repeatCount="indefinite"/>` : '';
          return `<rect class="sp-janela${r < 0.3 ? ' fraca' : ''}" x="${jx.toFixed(0)}" y="${jy.toFixed(0)}" width="5" height="4">${pisca}</rect>`;
        }).join('');
        const DIVISOES = [
          [[4, 4, 118, 52], [128, 4, 68, 52], [4, 62, 60, 66], [70, 62, 126, 66]],
          [[4, 4, 60, 124], [70, 4, 126, 40], [70, 50, 60, 78], [136, 50, 60, 78]],
          [[4, 4, 192, 36], [4, 46, 90, 82], [100, 46, 96, 38], [100, 90, 96, 38]],
          [[4, 4, 86, 58], [96, 4, 100, 58], [4, 68, 140, 60], [150, 68, 46, 60]],
        ];
        let a = '';
        for (let l = 0; l < 3; l++) {
          let antes = -1;
          for (let c = 0; c < 3; c++) {
            let k = Math.floor(sorte() * 4);
            if (k === antes) k = (k + 1) % 4;
            antes = k;
            for (const [x, y, w, h] of DIVISOES[k]) {
              const [qx, qy] = [c * 200 + x, l * 132 + y];
              const praca = sorte() < 0.08;
              a += `<rect class="sp-quadra${praca ? ' praca' : ''}" x="${qx}" y="${qy}" width="${w}" height="${h}" rx="2"/>`;
              if (!praca) a += janelas(qx, qy, w, h, Math.max(1, Math.round(((w * h) / 2600) * (0.6 + sorte()))));
            }
          }
        }
        let b = '';
        for (let i = 0; i < 16; i++) {
          const [x, y] = [(i % 4) * 70, Math.floor(i / 4) * 70];
          b += `<rect class="sp-quadra centro" x="${x + 5}" y="${y + 5}" width="60" height="60" rx="2"/>${janelas(x + 5, y + 5, 60, 60, 1 + Math.floor(sorte() * 4))}`;
        }
        return `<pattern id="sp-quadras-a" width="600" height="396" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect class="sp-rua" width="600" height="396"/>${a}</pattern>
                    <pattern id="sp-quadras-b" width="280" height="280" patternUnits="userSpaceOnUse" patternTransform="rotate(9)"><rect class="sp-rua" width="280" height="280"/>${b}</pattern>`;
      }

      // São Paulo sem pintura (decisão do Bruno de 30/10: nenhuma imagem nova): uma trama de ruas em SVG nas cores da
      // pintura do Rio. Quarteirões escuros com janelas acesas, as ruas em sódio apagado, o Centro com a trama em
      // outro ângulo, as avenidas mais fortes com o nome e a Marginal ao longo do Tietê.
      function fundoSP() {
        const P = pos.sp;
        const centro = ['se', 'centro-sp', 'liberdade'].map((id) => P[id]).filter(Boolean);
        const [mx, my] = centro.length ? centro.reduce(([a, b], [x, y]) => [a + x / centro.length, b + y / centro.length], [0, 0]) : [vb.x + vb.w * 0.7, vb.y + vb.h * 0.4];
        const avenidas = AVENIDAS_SP.map((av) => {
          const pts = av.pts.map(([la, lo]) => projSP(la, lo));
          const d = `M${pts[0]} Q${pts[1]} ${pts[2]}`;
          const [x0, y0] = pts[0];
          const [x2, y2] = pts[2];
          const ang = (Math.atan2(y2 - y0, x2 - x0) * 180) / Math.PI;
          const giro = ang > 90 || ang < -90 ? ang + 180 : ang;
          // O nome vai a 72% da avenida, longe do meio, onde costuma ficar um lugar; se ali sair do quadro, tenta
          // 50%, 28% e 85% (nomesAvenidas, depois da medida).
          const vagas = [0.72, 0.5, 0.28, 0.85].map((t) => [0, 1].map((k) => (1 - t) ** 2 * pts[0][k] + 2 * (1 - t) * t * pts[1][k] + t ** 2 * pts[2][k]).map((v) => v.toFixed(0)).join(' '));
          return `<path class="sp-avenida-brilho" d="${d}"/><path class="sp-avenida" d="${d}"/>
            <text class="sp-avenida-nome" data-vagas="${vagas.join(';')}" data-giro="${giro.toFixed(0)}" transform="translate(${vagas[0]}) rotate(${giro.toFixed(0)})" y="-14">${esc(av.nome)}</text>`;
        }).join('');
        const tiete = `M${vb.x - 200} ${vb.y + 70} C ${vb.x + vb.w * 0.25} ${vb.y + 10}, ${vb.x + vb.w * 0.45} ${vb.y + 130}, ${vb.x + vb.w * 0.6} ${vb.y + 60} S ${vb.x + vb.w * 0.9} ${vb.y + 30}, ${vb.x + vb.w + 200} ${vb.y + 100}`;
        return `<rect class="rota-fundo-sp" x="-600" y="-600" width="${LARGURA + 1200}" height="${ALTURA + 1200}"/>
          <rect x="-600" y="-600" width="${LARGURA + 1200}" height="${ALTURA + 1200}" fill="url(#sp-quadras-a)"/>
          <circle cx="${mx.toFixed(0)}" cy="${my.toFixed(0)}" r="300" fill="url(#sp-quadras-b)"/>
          <path class="rota-tiete" d="${tiete}"/><path class="sp-marginal" d="${tiete}" transform="translate(0 26)"/>
          <text class="rota-agua-nome" x="${vb.x + vb.w * 0.62}" y="${vb.y + 40}">rio Tietê</text>
          ${avenidas}
          <rect class="sp-escuro" x="-600" y="-600" width="${LARGURA + 1200}" height="${ALTURA + 1200}" fill="url(#sp-vinheta)"/>`;
      }
      const projSP = projecaoSP(caso);

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
          : fundoSP();
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
                    <radialGradient id="vivo-brilho"><stop offset="0" stop-color="#fff3d0"/><stop offset="0.3" stop-color="#ffd27a" stop-opacity="0.85"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
                    ${cidade === 'sp' ? `<radialGradient id="vivo-nevoa"><stop offset="0" stop-color="#9fb4d8" stop-opacity="0.14"/><stop offset="1" stop-color="#9fb4d8" stop-opacity="0"/></radialGradient>
                    <radialGradient id="sp-vinheta" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#0a0f1c" stop-opacity="0"/><stop offset="1" stop-color="#0a0f1c" stop-opacity="0.85"/></radialGradient>
                    ${tramaSP()}` : ''}
                  </defs>
                  ${fundo}
                  ${vivo(P)}
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
        ajustarLetra();
        // A última hora (item 5): a borda de baixo do mapa ganha o brilho do amanhecer.
        corpo.classList.toggle('ultima-hora', restanteAgora != null && restanteAgora > 0 && restanteAgora <= 60);
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
        const vigia = new ResizeObserver(() => {
          if (!corpo.isConnected || pos[cidade] !== P) return;
          if (ajustarLetra()) posicionarRotulos(P, ids);
          else bordas(P, ids);
        });
        vigia.observe(caixa);
        if (caixa.firstElementChild) vigia.observe(caixa.firstElementChild);
      }

      // O mapa é desenhado em escala: numa tela pequena, os rótulos encolheriam abaixo de 11 px (Base, item 2).
      // --u aumenta os rótulos na medida certa para a pílula de tempo (24 unidades) ficar com 11,5 px na tela.
      // Devolve verdadeiro quando a escala mudou (os rótulos precisam ser postos de novo).
      function ajustarLetra() {
        const svg = corpo.querySelector('.rota-mapa svg');
        if (!svg?.clientWidth || !vb) return false;
        const k = Math.min(svg.clientWidth / vb.w, svg.clientHeight / vb.h || Infinity);
        const u = Math.max(1, 11.5 / (24 * k)).toFixed(2);
        if (svg.style.getPropertyValue('--u') === u) return false;
        svg.style.setProperty('--u', u);
        return true;
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
        nomesAvenidas(P, ids, obst.slice(ids.length));
        // Sem medida (a tela ainda não desenhou o texto): tenta de novo no quadro seguinte; até lá, o nome fica embaixo.
        if (faltou && tentativa < 20) requestAnimationFrame(() => { if (corpo.isConnected && pos[cidade] === P) posicionarRotulos(P, ids, tentativa + 1); });
        // Os indicadores de borda dependem de onde os nomes ficaram.
        else if (corpo.querySelector('.mapa-bordas')) bordas(P, ids);
      }

      // Cada nome de avenida fica na primeira vaga em que cabe inteiro no quadro (com 30 de folga), longe dos
      // medalhões e sem cobrir um nome de lugar. Se nenhuma vaga servir, o nome não aparece.
      function nomesAvenidas(P, ids, nomes) {
        for (const txt of corpo.querySelectorAll('.sp-avenida-nome[data-vagas]')) {
          const bb = txt.getBBox?.();
          if (!bb?.width) continue;
          const giro = (Number(txt.dataset.giro) * Math.PI) / 180;
          const [cs, sn] = [Math.cos(giro), Math.sin(giro)];
          const cantos = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]];
          const serve = ([ox, oy]) => {
            const pts = cantos.map(([a, b]) => [ox + a * cs - b * sn, oy + a * sn + b * cs]);
            if (pts.some(([x, y]) => x < vb.x + 30 || x > vb.x + vb.w - 30 || y < vb.y + 30 || y > vb.y + vb.h - 30)) return false;
            // O medalhão no sistema do texto: a distância do centro dele à caixa do nome.
            const longe = ids.every((id) => {
              const [dx, dy] = [P[id][0] - ox, P[id][1] - oy];
              const [lx, ly] = [dx * cs + dy * sn, -dx * sn + dy * cs];
              const [qx, qy] = [Math.max(bb.x - lx, 0, lx - bb.x - bb.width), Math.max(bb.y - ly, 0, ly - bb.y - bb.height)];
              return Math.hypot(qx, qy) > R_MED + 20 + (id === atual ? 44 : 0);
            });
            if (!longe) return false;
            const xs = pts.map((q) => q[0]);
            const ys = pts.map((q) => q[1]);
            const c = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
            return nomes.every((o) => !areaComum(c, o));
          };
          const vaga = txt.dataset.vagas.split(';').map((v) => v.split(' ').map(Number)).find(serve);
          txt.style.display = vaga ? '' : 'none';
          if (vaga) txt.setAttribute('transform', `translate(${vaga[0]} ${vaga[1]}) rotate(${txt.dataset.giro})`);
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
        const nomesVista = [];
        const nomesMapa = [];
        // Em São Paulo, o Tietê, a Marginal (26 abaixo) e o nome do rio também são obstáculos: caixas a cada 20 do
        // traçado, cobrindo o rio e a Marginal, e a caixa do nome.
        const rio = corpo.querySelector('.rota-tiete');
        const agua = [];
        if (rio?.getTotalLength) {
          const total = rio.getTotalLength();
          for (let l = 0; l <= total; l += 20) {
            const pt = rio.getPointAtLength(l);
            agua.push({ x: pt.x - 10, y: pt.y - 8, w: 20, h: 26 + 16 });
          }
        }
        const nomeRio = corpo.querySelector('.rota-agua-nome')?.getBBox?.();
        if (nomeRio?.width) agua.push({ x: nomeRio.x - 4, y: nomeRio.y - 2, w: nomeRio.width + 8, h: nomeRio.height + 4 });
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
          let [tx = 0, ty = 0] = (rot.dataset.base || '').match(/-?[\d.]+/g)?.map(Number) || [];
          let [esq, topo] = tela(P[id][0] + tx + bb.x, P[id][1] + ty + bb.y);
          const [lw, lh] = [bb.width * kx, bb.height * ky];
          // Nenhum nome entra no aro de um medalhão da vista, nem no do próprio (Santa Teresa, ao lado, deslizaria para
          // cima dele): tenta a vaga de sempre, embaixo e em cima, cada uma deslizada para dentro da tela, e fica na
          // primeira livre (ou na que menos entra). Também não cobre o nome de outro lugar já posto.
          const meio = -bb.y - bb.height / 2;
          const vagas = [[tx, ty], [0, R_MED + FOLGA + 2 - bb.y + 3], [0, -(R_MED + FOLGA + 4) - (bb.y + bb.height) - (id === atual ? 44 : 0)],
            [R_MED + FOLGA + 8 + bb.width / 2, meio], [-(R_MED + FOLGA + 8 + bb.width / 2), meio]];
          // E as de cima e de baixo um pouco mais longe, para fugir do aro do vizinho.
          for (const mais of [24, 48]) vagas.push([0, vagas[1][1] + mais], [0, vagas[2][1] - mais]);
          let melhor = null;
          for (const [vx, vy] of vagas) {
            const [e] = tela(P[id][0] + vx + bb.x, 0);
            const dv = e < 6 ? 6 - e : e + lw > W - 6 ? W - 6 - (e + lw) : 0;
            const [x0, y0] = [P[id][0] + vx + bb.x + dv / kx, P[id][1] + vy + bb.y];
            const entra = visiveis.reduce((soma, o) => {
              const [cx, cy] = P[o];
              const d = Math.hypot(Math.max(x0 - cx, 0, cx - x0 - bb.width), Math.max(y0 - cy, 0, cy - y0 - bb.height));
              return soma + Math.max(0, R_MED + 3 + (o === atual ? 4 : 0) - d);
            }, 0) + nomesVista.reduce((soma, n) => {
              const [ex, ey] = tela(x0, y0);
              return soma + areaComum({ x: ex, y: ey, w: lw, h: lh }, n) / 20;
            }, 0) + (agua.some((a) => areaComum({ x: x0, y: y0, w: bb.width, h: bb.height }, a)) ? 6 : 0);
            if (!melhor || entra < melhor.entra) melhor = { vx, vy, dv, entra };
            if (!entra) break;
          }
          [tx, ty] = [melhor.vx, melhor.vy];
          const desvio = melhor.dv;
          rot.setAttribute('transform', `translate(${tx} ${ty})${desvio ? ` translate(${desvio / kx} 0)` : ''}`);
          [esq, topo] = tela(P[id][0] + tx + bb.x, P[id][1] + ty + bb.y);
          const [mx, my] = tela(P[id][0] - R_MED, P[id][1] - R_MED);
          livres.push({ x: mx, y: my, w: 2 * R_MED * kx, h: 2 * R_MED * ky });
          // Sem vaga livre (um nome largo num canto apertado, perto da borda), o nome some até a rolagem abrir espaço:
          // o lugar continua no medalhão e na lista.
          if (melhor.entra > 8) { rot.style.visibility = 'hidden'; continue; }
          livres.push({ x: esq + desvio, y: topo, w: lw, h: lh });
          nomesVista.push({ x: esq + desvio, y: topo, w: lw, h: lh });
          nomesMapa.push({ x: P[id][0] + tx + bb.x + desvio / kx, y: P[id][1] + ty + bb.y, w: bb.width, h: bb.height });
        }
        // Os nomes das avenidas fogem dos nomes de lugar onde eles ficaram agora, não onde estavam antes.
        nomesAvenidas(P, ids, nomesMapa);
        // Dois ou mais lugares na mesma borda viram um indicador só ("‹ 3 lugares"), que abre a lista deles
        // (item 4): as pílulas não cobrem o mapa.
        const itens = ['esq', 'dir'].map((lado) => fora.filter((f) => f.lado === lado)).filter((l) => l.length)
          .map((l) => (l.length === 1 ? l[0] : { lado: l[0].lado, grupo: l, y: l.reduce((s, f) => s + f.y, 0) / l.length }));
        gruposBorda = Object.fromEntries(itens.filter((f) => f.grupo).map((f) => [f.lado, f.grupo]));
        camadaBordas.innerHTML = itens.map((f) => (f.grupo
          ? `<button type="button" class="mapa-borda ${f.lado} grupo" data-grupo="${f.lado}" aria-expanded="false">${f.lado === 'esq' ? '‹ ' : ''}${f.grupo.length} lugares${f.lado === 'dir' ? ' ›' : ''}</button>`
          : `<button type="button" class="mapa-borda ${f.lado}" data-vai="${esc(f.id)}">${f.lado === 'esq' ? '‹ ' : ''}${esc(caso.lugares[f.id].nome)}${f.t ? ` <small>${duracao(f.t.minutos)}</small>` : ''}${f.lado === 'dir' ? ' ›' : ''}</button>`)).join('');
        // Cada indicador fica na altura do lugar, sem cobrir um medalhão nem um nome da vista nem outro indicador.
        const ALT = 44;
        const postos = [];
        [...camadaBordas.children].forEach((b, i) => {
          const f = itens[i];
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

      // O indicador de grupo abre (e fecha) a lista dos lugares daquela borda, logo abaixo dele.
      function abrirGrupo(b) {
        const camadaBordas = corpo.querySelector('.mapa-bordas');
        const aberto = b.getAttribute('aria-expanded') === 'true';
        camadaBordas.querySelector('.mapa-borda-lista')?.remove();
        camadaBordas.querySelectorAll('[data-grupo]').forEach((x) => x.setAttribute('aria-expanded', 'false'));
        if (aberto) return;
        b.setAttribute('aria-expanded', 'true');
        const el = document.createElement('div');
        el.className = `mapa-borda-lista ${b.dataset.grupo}`;
        el.innerHTML = (gruposBorda[b.dataset.grupo] || []).map((f) => `<button type="button" data-vai="${esc(f.id)}">${esc(caso.lugares[f.id].nome)}${f.t ? ` <small>${duracao(f.t.minutos)}</small>` : ''}</button>`).join('');
        camadaBordas.append(el);
        // A lista abre embaixo do indicador; sem espaço, em cima, mas sem subir na chave Rio/São Paulo.
        const minimo = (corpo.querySelector('.rota-mapa')?.offsetTop || 0) + 4;
        const abaixo = b.offsetTop + b.offsetHeight + 6;
        el.style.top = `${abaixo + el.offsetHeight > camadaBordas.clientHeight - 6 ? Math.max(minimo, b.offsetTop - el.offsetHeight - 6) : abaixo}px`;
        el.querySelector('button')?.focus();
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
        g.innerHTML = `<path class="rota-viagem" d="${curva}"/><g class="rota-veiculo"><circle r="40"/>${icone(veiculo(atual, id, t), { svg: true, tam: 50 })}</g>`;
        const linha = g.querySelector('.rota-viagem');
        const carro = g.querySelector('.rota-veiculo');
        const total = linha.getTotalLength();
        // O traço da viagem é medido em unidades do mapa, como o comprimento: sem o non-scaling-stroke, o tracejado
        // anda junto com o veículo. A espessura de 5 px na tela vem da escala atual.
        const k = linha.getScreenCTM()?.a || 1;
        linha.style.vectorEffect = 'none';
        linha.style.strokeWidth = `${5 / k}`;
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
        const gr = ev.target.closest('[data-grupo]');
        if (gr) { abrirGrupo(gr); return; }
        const ir = ev.target.closest('[data-vai]');
        if (ir) {
          const caixa = corpo.querySelector('.rota-mapa');
          const P = pos[cidade];
          caixa.scrollTo({ left: ((P[ir.dataset.vai][0] - vb.x) / vb.w) * caixa.scrollWidth - caixa.clientWidth / 2, behavior: cerimoniasCurtas() ? 'auto' : 'smooth' });
          selecionar(ir.dataset.vai);
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

// --- A foto da prisão -----------------------------------------------------------------------------------
// A lembrança do cerco: a pintura do esconderijo em preto e branco, a silhueta do alvo onde ele estava e o
// carimbo. foto: { img, x, y } (x e y em % da cena), guardada no estado do capítulo na hora da prisão.
export function fotoPrisao(foto, texto = 'Preso', classe = '') {
  if (!foto?.img) return '';
  const url = new URL(foto.img, location.href).href;
  return `<figure class="foto-prisao ${classe}" style="--foto:url('${esc(url)}')" aria-label="A foto da prisão">
    <span class="foto-alvo" style="left:${Number(foto.x) || 50}%;top:${Number(foto.y) || 60}%" aria-hidden="true"></span>
    <span class="carimbo carimbo-p">${esc(texto)}</span>
  </figure>`;
}

// --- O retrato falado ---------------------------------------------------------------------------------
// O desenho de um perito, a grafite no papel: cabeça, orelhas, olhos e boca variam pela ficha (a semente),
// a sombra é hachura de lápis e o traço treme um pouco. Cada traço conhecido entra no lugar certo: o cabelo
// (aparência), o sinal particular no rosto ou na mão e a roupa que combina com o hábito. Sem traço, só o
// rosto sem cabelo, como o retrato do alto da mesa no começo.
// As cabeças: o contorno, a meia largura na altura das orelhas e a linha do queixo.
const elipse = (rx, ry, cy = 42) => `M${50 - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;
const CABECAS = [
  { d: elipse(17, 22), w: 17, topo: 20, queixo: 64 },
  { d: 'M33 31 Q33 20 50 20 Q67 20 67 31 L67 50 Q66 62 50 64 Q34 62 33 50 Z', w: 17, topo: 20, queixo: 64 },
  { d: elipse(15, 25), w: 15, topo: 17, queixo: 67 },
  { d: elipse(19, 20), w: 19, topo: 22, queixo: 62 },
];
const OMBROS = ['M14 100 Q16 74 40 70 L60 70 Q84 74 86 100 Z', 'M20 100 Q22 76 41 71 L59 71 Q78 76 80 100 Z', 'M8 100 Q12 72 38 69 L62 69 Q88 72 92 100 Z'];
// O cabelo pela aparência; muito alto e miúdo não dizem o cabelo, então ele varia pela ficha.
function cabelo(ap, c, f, v) {
  const e = 50 - c.w;
  const d = 50 + c.w;
  const t = c.topo;
  switch (ap) {
    case 'cabelo-branco': // rente, também nas mulheres; nelas, com uma franja de lado
      return `${f ? `<path class="rf-cabelo branco" d="M${e + 1} 36 Q${e + 4} ${t + 1} 52 ${t + 3} Q${d - 2} ${t + 6} ${d - 4} ${t + 13} Q${d - 9} ${t + 7} 50 ${t + 7} Q${e + 5} ${t + 9} ${e + 1} 36 Z"/>` : ''}<path class="rf-cabelo branco" d="M${e} 38 Q${e - 1} ${t - 3} 50 ${t - 3} Q${d + 1} ${t - 3} ${d} 38 Q${d - 3} ${t + 5} 50 ${t + 5} Q${e + 3} ${t + 5} ${e} 38 Z"/><path class="rf-fio" d="M42 ${t} l2 4 M48 ${t - 2} l1 4 M55 ${t - 1} l-1 4 M61 ${t + 1} l-2 4"/>`;
    case 'ruivo':
      return f
        ? `<path class="rf-cabelo ruivo" d="M${e - 4} 74 Q${e - 9} 50 ${e - 4} 30 Q${e} ${t - 6} 50 ${t - 5} Q${d} ${t - 6} ${d + 4} 30 Q${d + 9} 50 ${d + 4} 74 Q${d - 2} 60 ${d - 1} 40 Q${d - 6} ${t + 6} 50 ${t + 7} Q${e + 6} ${t + 6} ${e + 1} 40 Q${e + 2} 60 ${e - 4} 74 Z"/>`
        : `<path class="rf-cabelo ruivo" d="M${e - 2} 44 Q${e - 6} ${t - 2} ${e + 4} ${t - 4} Q50 ${t - 10} ${d - 4} ${t - 4} Q${d + 6} ${t - 2} ${d + 2} 44 Q${d - 2} ${t + 6} 50 ${t + 6} Q${e + 2} ${t + 6} ${e - 2} 44 Z"/>`;
    case 'trancas': {
      const contas = (x) => [0, 1, 2, 3, 4, 5].map((i) => `<circle class="rf-tranca" cx="${x}" cy="${46 + i * 4.8}" r="2.4"/>`).join('');
      return `<path class="rf-cabelo trancas" d="M${e - 1} 44 Q${e - 2} ${t - 3} 50 ${t - 3} Q${d + 2} ${t - 3} ${d + 1} 44 Q${d - 2} ${t + 4} 50 ${t + 4} Q${e + 2} ${t + 4} ${e - 1} 44 Z"/><path class="rf-fio" d="M50 ${t - 3} v7"/>${contas(e - 6)}${contas(d + 6)}`;
    }
    case 'careca-oculos':
      return `<path class="rf-fio" d="M43 ${t + 3} q6 -3 12 0"/><g class="rf-oculos"><circle cx="44" cy="42" r="5.6"/><circle cx="56" cy="42" r="5.6"/><path d="M49.6 41.4 q0.4 -1 0.8 0 M38.4 41 L${e} 40 M61.6 41 L${d} 40"/></g>`;
    case 'muito-alto':
    case 'miudo': {
      const estilos = f
        ? [`M${e - 2} 62 Q${e - 4} ${t - 4} 50 ${t - 3} Q${d + 4} ${t - 4} ${d + 2} 62 Q${d - 1} 34 50 ${t + 6} Q${e + 1} 34 ${e - 2} 62 Z`,
          `M${e} 42 Q${e - 2} ${t - 3} 50 ${t - 3} Q${d + 2} ${t - 3} ${d} 42 Q${d - 6} ${t + 4} 44 ${t + 6} Q${e + 3} ${t + 8} ${e} 42 Z M${d - 2} ${t + 1} q8 2 6 12 q-4 -6 -7 -6 Z`,
          `M${e - 1} 50 Q${e - 3} ${t - 4} 50 ${t - 3} Q${d + 3} ${t - 4} ${d + 1} 50 Q${d - 2} ${t + 5} 50 ${t + 5} Q${e + 2} ${t + 5} ${e - 1} 50 Z`]
        : [`M${e} 38 Q${e} ${t - 3} 50 ${t - 3} Q${d} ${t - 3} ${d} 38 Q${d - 2} ${t + 4} 50 ${t + 4} Q${e + 2} ${t + 4} ${e} 38 Z`,
          `M${e} 40 Q${e - 1} ${t - 2} 44 ${t - 4} Q${d + 2} ${t - 4} ${d} 38 Q${d - 4} ${t + 2} 46 ${t + 3} L44 ${t + 6} Q${e + 2} ${t + 6} ${e} 40 Z`,
          `M${e + 1} 34 Q${e + 2} ${t - 5} 50 ${t - 6} Q${d - 2} ${t - 5} ${d - 1} 34 Q${d - 4} ${t + 2} 50 ${t + 1} Q${e + 4} ${t + 2} ${e + 1} 34 Z`];
      return `<path class="rf-cabelo" d="${estilos[v % 3]}"/>`;
    }
    default: return '';
  }
}
// O sinal particular, no rosto, no pescoço ou na mão.
function sinal(s, c) {
  const e = 50 - c.w;
  const q = c.queixo;
  // A mão erguida: os dedos em contorno (um traço grosso de grafite com o miolo de papel por cima).
  const mao = (x, dedos, extra = '') => `<path class="rf-dedo" d="${dedos}"/><path class="rf-dedo-miolo" d="${dedos}"/><path class="rf-mao" d="M${x - 8} 100 L${x - 8} 88 Q${x - 8} 84 ${x - 4} 84 L${x + 4} 84 Q${x + 8} 84 ${x + 8} 88 L${x + 8} 100"/>${extra}`;
  switch (s) {
    case 'dedo-faltando': return mao(80, 'M74.4 85 v-9 M78.4 85 v-11 M82.4 85 v-1.6 M86.2 85 v-8', '<path class="rf-sinal" d="M80.8 82.4 q1.6 -1.4 3.2 0"/>');
    case 'anel-serpente': return mao(20, 'M13.8 85 v-8 M17.8 85 v-10 M21.8 85 v-10 M25.6 85 v-8', '<path class="rf-sinal ouro-linha" d="M19.8 80 h4 M19.8 78.4 h4"/><circle class="rf-sinal ouro" cx="24.6" cy="77.6" r="1.1"/>');
    case 'brinco-perola': return `<path class="rf-sinal ouro-linha" d="M${e - 1.4} 48.6 v5.2"/><circle class="rf-sinal perola" cx="${e - 1.4}" cy="56.6" r="2.8"/><circle class="rf-brilho" cx="${e - 2.4}" cy="55.6" r="0.8"/>`;
    case 'ancora': return `<path class="rf-sinal rf-tinta" d="M59 ${q + 1} v8 m-3 -5.5 h6 m-6.5 3.5 q3.5 4 7 0 M59 ${q + 1} m-1.2 -1.2 a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0"/>`;
    case 'cicatriz': return '<path class="rf-sinal" d="M54.6 32 L61.4 46 M55.2 35.2 l2.6 -1.2 M56.8 38.6 l2.6 -1.2 M58.4 42 l2.6 -1.2"/>';
    case 'medalha': return `<path class="rf-corrente" d="M43 ${q + 5} Q50 ${q + 19} 57 ${q + 5}"/><circle class="rf-sinal ouro" cx="50" cy="${q + 15.5}" r="3.4"/>`;
    default: return '';
  }
}
// A roupa pelo hábito: o paletó de quem rola a moeda, o jasmim na lapela, a gola de marinheiro, o colete com
// gravata-borboleta do jogador, o bolso com lápis do caderninho e a camisa aberta de quem assobia.
const ROUPA = {
  'rola-moeda': '<path class="rf-roupa-linha" d="M44 70 L50 84 L56 70 M41 71 L47 100 M59 71 L53 100"/>',
  jasmim: '<path class="rf-roupa-linha" d="M44 70 L50 82 L56 70 M41 71 L46 100 M59 71 L54 100"/><g class="rf-flor"><circle cx="36" cy="82" r="1.8"/><circle cx="39.2" cy="83.6" r="1.8"/><circle cx="38" cy="86.8" r="1.8"/><circle cx="34.4" cy="86.6" r="1.8"/><circle cx="33" cy="83.4" r="1.8"/></g>',
  barquinho: '<path class="rf-roupa-linha" d="M40 70 L50 84 L60 70 M37 72 L34 88 L50 84 L66 88 L63 72 M35.6 82 L50 79 L64.4 82"/>',
  baralho: '<path class="rf-roupa-linha" d="M44 70 L50 78 L56 70 M42 76 L50 96 L58 76"/><path class="rf-gravata" d="M44 72.6 l6 3 l-6 3 Z M56 72.6 l-6 3 l6 3 Z"/>',
  caderninho: '<path class="rf-roupa-linha" d="M44 70 L48 78 L50 74 L52 78 L56 70 M50 78 V100 M56 84 h9 v8 h-9 Z"/><path class="rf-lapis" d="M59 84 L61 75"/>',
  assobia: '<path class="rf-roupa-linha" d="M43 70 L48 80 L50 76 L52 80 L57 70"/><circle class="rf-botao" cx="50" cy="86" r="0.9"/><circle class="rf-botao" cx="50" cy="93" r="0.9"/>',
};
// O rosto pela ficha: três olhos (amendoado, de pálpebra pesada, estreito) e três narizes (curto, comprido e reto,
// largo); os lábios, finos ou cheios, vão no meio do retrato.
const OLHOS = [
  'M41 42 q3 -2.4 6 0 q-3 1.6 -6 0 M53 42 q3 -2.4 6 0 q-3 1.6 -6 0',
  'M41 42.4 q3 -3.2 6 0 q-3 1.4 -6 0 M53 42.4 q3 -3.2 6 0 q-3 1.4 -6 0 M40.8 40.4 q3.2 -1.6 6.4 0.2 M52.8 40.6 q3.2 -1.8 6.4 -0.2',
  'M40.6 42 q3.4 -1.8 6.8 0 q-3.4 0.8 -6.8 0 M52.6 42 q3.4 -1.8 6.8 0 q-3.4 0.8 -6.8 0',
];
const NARIZES = [
  'M50 44 q-2 6 -0.6 8 q1.6 0.8 3.2 -0.2',
  'M50.4 42.6 L49 52.4 q1.8 1.2 3.8 -0.2',
  'M50 45 q-0.8 4.6 -2.8 6.2 q1.8 1.6 3.2 0.4 q1.6 1.2 3.4 -0.4 q-1.4 -0.8 -1.6 -2',
];
const semear = (txt) => [...String(txt)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
let retratos = 0;
export function retratoFalado(tr = {}, { genero = null, semente = null, novos = null } = {}) {
  const alto = tr.aparencia === 'muito-alto';
  const miudo = tr.aparencia === 'miudo';
  const esc0 = miudo ? 'translate(10 16) scale(0.8)' : alto ? 'translate(-4 -6) scale(1.08)' : '';
  const h = semente == null ? 0 : semear(semente);
  const f = genero === 'f';
  const c = CABECAS[(h >> 2) % 4];
  const u = `rf${(retratos += 1)}`;
  const e = 50 - c.w;
  const d = 50 + c.w;
  const q = c.queixo;
  const orelha = 3.5 + ((h >> 11) % 2) * 1.2;
  const sobr = (((h >> 9) % 3) - 1) * 1.2;
  const boca = [0.5, -0.5, 0.1][(h >> 13) % 3];
  const lapis = (cat, svg) => (svg && novos?.has(cat) ? `<g class="rf-novo">${svg.replace(/<(path|circle)\b/g, '<$1 pathLength="1"')}</g>` : svg);
  const regua = alto ? '<path class="rf-regua" d="M94 8 v84 m-3 0 h6 m-6 -84 h6"/>'
    : miudo ? '<path class="rf-regua" d="M94 8 v84 m-3 0 h6 m-6 -84 h6 m-6 28 h6"/>' : '';
  return `<svg class="retrato-falado esboco${genero ? ` g-${genero}` : ''}" viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <pattern id="${u}h" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0 V3" class="rf-hachura"/></pattern>
      <pattern id="${u}r" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><path d="M0 0 V2.4" class="rf-hachura ruiva"/></pattern>
      <clipPath id="${u}c"><path d="${c.d}"/></clipPath>
      <filter id="${u}t" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="turbulence" baseFrequency="0.06" numOctaves="2" seed="${h % 97}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.3" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="${u}g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${(h >> 4) % 97}"/><feColorMatrix values="0 0 0 0 0.24  0 0 0 0 0.2  0 0 0 0 0.16  0 0 0 0.7 -0.28"/></filter>
    </defs>
    <rect class="rf-fundo" width="100" height="100"/>
    <rect width="100" height="100" filter="url(#${u}g)"/>
    <g style="--hachura:url(#${u}h);--ruiva:url(#${u}r)" filter="url(#${u}t)">
      <g transform="${esc0}">
        <path class="rf-busto" d="${OMBROS[f ? 1 : (h >> 5) % 3]}"/>
        <path class="rf-sombra" d="${OMBROS[f ? 1 : (h >> 5) % 3]}" fill="url(#${u}h)"/>
        ${lapis('habito', ROUPA[tr.habito] || '')}
        <path class="rf-linha" d="M44 ${q - 3} L44 70 M56 ${q - 3} L56 70"/>
        <path class="rf-sombra" d="M44 ${q - 1} Q50 ${q + 5} 56 ${q - 1} L56 ${q + 5} Q50 ${q + 8} 44 ${q + 5} Z" fill="url(#${u}h)"/>
        <path class="rf-orelha" d="M${e} 38 q-${orelha} 0.6 -${orelha - 0.6} 5 q0.4 3.6 ${orelha - 0.6} 4.4 M${d} 38 q${orelha} 0.6 ${orelha - 0.6} 5 q-0.4 3.6 -${orelha - 0.6} 4.4"/>
        <path class="rf-cabeca" d="${c.d}"/>
        <rect x="55" y="10" width="30" height="64" fill="url(#${u}h)" clip-path="url(#${u}c)" class="rf-sombra"/>
        <path class="rf-linha fina" d="M40 ${37 + sobr} q4 -2.2 8 -0.4 M52 ${36.6} q4 -1.8 8 ${0.4 + sobr}"/>
        <path class="rf-linha" d="${OLHOS[(h >> 21) % 3]}"/>
        <circle class="rf-olho" cx="44" cy="42" r="0.95"/><circle class="rf-olho" cx="56" cy="42" r="0.95"/>
        ${f ? '<path class="rf-linha fina" d="M40.8 41.2 l-1.6 -1.2 M41.2 40.4 l-1 -1.6 M59.2 41.2 l1.6 -1.2 M58.8 40.4 l1 -1.6"/>' : ''}
        ${tr.aparencia === 'cabelo-branco' ? `<path class="rf-linha fina leve" d="M43 ${c.topo + 11} q7 -1.6 14 0 M44.4 ${c.topo + 14} q5.6 -1.2 11.2 0 M39.6 43.6 l-1.8 0.8 M39.8 42 l-2 -0.2 M60.4 43.6 l1.8 0.8 M60.2 42 l2 -0.2 M46 50 q-2.4 3.4 -1.6 6.4 M54 50 q2.4 3.4 1.6 6.4"/>` : ''}
        <path class="rf-sombra" d="M${e + 2} 48 q4 ${4 + ((h >> 19) % 3)} 9 6 l-1 2 q-6 -1 -8 -6 Z M52 44 l-1.4 7 l2.6 -0.4 Z" fill="url(#${u}h)"/>
        <path class="rf-linha fina leve" d="M41.6 44.6 q2.4 1 4.8 0 M53.6 44.6 q2.4 1 4.8 0"/>
        <path class="rf-linha fina" d="${NARIZES[(h >> 23) % 3]} ${f || (h >> 25) % 2 ? `M45 ${q - 9} q2.5 -1.6 5 -0.4 q2.5 -1.2 5 0.4 M45 ${q - 9} q5 ${boca} 10 0 M46.4 ${q - 8.4} q3.6 2.8 7.2 0` : `M45 ${q - 9} q5 ${boca} 10 0`}${(h >> 15) % 2 ? ` M48.6 ${q - 3} q1.4 0.8 2.8 0` : ''}"/>
        ${lapis('aparencia', cabelo(tr.aparencia, c, f, h >> 17))}
        ${lapis('sinal', sinal(tr.sinal, c))}
      </g>
      ${lapis('aparencia', regua)}
    </g>
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
// Os traços que o retrato falado já mostrou, por caso: o que for novo ao abrir o Arquivo se desenha a lápis.
const retratoVisto = new WeakMap();
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
      let monteAberto = false;
      const visto = retratoVisto.get(caso.arquivo) || new Set();
      const novos = cerimoniasCurtas() ? new Set() : new Set(conhecidos.filter((t) => !visto.has(t)).map((t) => t.split('=')[0]));
      retratoVisto.set(caso.arquivo, new Set([...visto, ...conhecidos]));
      if (novos.size) setTimeout(() => som.carmen?.('lapis'), 200);
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
          <div class="ficha-foto"><span class="ficha-clipe" aria-hidden="true"></span>${retratoFalado(s.tracos, { genero: s.genero, semente: s.id })}</div>
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
            <div class="ficha-foto">${retratoFalado(ladrao, { novos })}</div>
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
          ${foras.length ? `<div class="foras-monte${monteAberto ? ' aberto' : ''}">
            <button type="button" class="foras-botao" data-monte aria-expanded="${monteAberto}">${foras.length} ${foras.length === 1 ? 'ficha fora' : 'fichas fora'} <i aria-hidden="true">${monteAberto ? '▴' : '▾'}</i></button>
            <ol class="arquivo-fichas foras">${foras.map((s) => ficha(s, vivos)).join('')}</ol></div>` : ''}`;
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
        // Celular: as fichas de fora ficam num monte de papéis, que abre e fecha com um toque.
        if (ev.target.closest('[data-monte]')) {
          monteAberto = !monteAberto;
          desenharDir(vivosDe());
          corpo.querySelector('[data-monte]')?.focus({ preventScroll: true });
          return;
        }
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
      novos.clear();
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
export function documentoLicenca(raiz, { caso, suspeito, numero = 1, hora = '', cidade = 'Rio', portador = '', jaEmitida = false }) {
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
            <div class="ficha-foto"><span class="ficha-clipe" aria-hidden="true"></span>${retratoFalado(suspeito.tracos, { genero: suspeito.genero, semente: suspeito.id })}</div>
            <div><small>Codinome</small><b>${esc(suspeito.apelido || suspeito.nome)}</b><p><small>Clã aparente</small> <span class="datilo">${esc(nome('cla', suspeito.tracos.cla))}</span></p></div>
          </div>
          <dl class="licenca-campos">${CAMPOS_LICENCA.map(([k, r]) => `<div><dt>${esc(r)}</dt><dd class="datilo">${esc(nome(k, suspeito.tracos[k]))}</dd></div>`).join('')}</dl>
          <p class="licenca-autorizo datilo">${portador ? `Autorizo ${esc(portador)} a caçar` : 'Autorizo a caça'}. ${esc(cidade)}${hora ? `, ${esc(hora)}` : ''}.</p>
          <p class="licenca-assina"><span>Iolanda</span><small>Xerife</small></p>
          <span class="carimbo carimbo-g licenca-carimbo" aria-hidden="true">Licença</span>
          <button type="button" class="btn destaque licenca-guardar" data-guardar>Guardar a Licença</button>
        </article>`;
      const doc = corpo.querySelector('.licenca-doc');
      // Guardar: o papel encolhe e voa até a miniatura no alto do Arquivo (400 ms), que pisca ao receber.
      let guardando = false;
      corpo.querySelector('[data-guardar]').addEventListener('click', () => {
        const mini = raiz.querySelector('.licenca-mini');
        if (guardando) return;
        if (!mini || cerimoniasCurtas() || !doc.animate) { camada.fechar(); return; }
        guardando = true;
        doc.getAnimations().forEach((a) => { try { a.finish(); } catch { a.cancel(); } });
        doc.style.animation = 'none';
        const de = doc.getBoundingClientRect();
        const para = mini.getBoundingClientRect();
        const dx = para.left + para.width / 2 - (de.left + de.width / 2);
        const dy = para.top + para.height / 2 - (de.top + de.height / 2);
        const k = Math.max(0.08, Math.min(para.width / de.width, para.height / de.height));
        camada.el.classList.add('guardando');
        const voo = doc.animate([
          { transform: 'none', opacity: 1 },
          { transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(${(1 + k) / 2}) rotate(-4deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(${dx * 0.92}px, ${dy * 0.92}px) scale(${k + (1 - k) * 0.08}) rotate(-1.4deg)`, opacity: 1, offset: 0.85 },
          { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(-1deg)`, opacity: 0 },
        ], { duration: 400, delay: 80, easing: 'cubic-bezier(0.55, 0, 0.35, 1)', fill: 'forwards' });
        // O botão Guardar se apaga em 80 ms (CSS) antes de o papel sair, para não voar junto.
        // Se a aba perder o foco no meio, o voo não trava a tela.
        const reserva = setTimeout(() => voo.finish(), 780);
        voo.onfinish = () => {
          clearTimeout(reserva);
          camada.fechar();
          mini.classList.remove('recebe');
          void mini.offsetWidth;
          mini.classList.add('recebe');
          som.carmen?.('papel');
        };
      });
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
      // 25 ms por letra, mas a datilografia inteira cabe em 1,7 s: a assinatura começa antes de 2,5 s.
      const passo = Math.min(25, 1700 / Math.max(1, campos.reduce((n, c) => n + c.txt.length, 0)));
      let t = 420;
      // A tecla soa no máximo a cada 90 ms: mais que isso vira chocalho.
      let ultimaTecla = -Infinity;
      for (const { el, txt } of campos) {
        for (let i = 1; i <= txt.length; i += 1) {
          const toca = t - ultimaTecla >= 90;
          if (toca) ultimaTecla = t;
          depois(t, () => { el.textContent = txt.slice(0, i); if (toca) som.carmen?.('tecla'); });
          t += passo;
        }
        t += 60;
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
