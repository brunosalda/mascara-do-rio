// Motor da cena: o personagem anda sobre a pintura do lugar (WASD, setas ou clique; Shift ou clique
// duplo para correr), só onde há chão pintado, passa atrás dos objetos da frente, recebe a luz do
// lugar e interage com os pontos (E, Enter ou clique). Pintura, objetos, pontos e personagem ficam
// num mesmo "mundo" do tamanho da pintura, que a câmera move e aproxima nas conversas.
// A geografia de cada pintura (chão, perspectiva, objetos, luzes) está em lugares.js.

import { camadaAberta, teclaNaCamada, registrarCena } from './camadas.js';
import { som } from '../ambiente.js';
import { esc, grupoVoz } from '../ui.js';
import { geografia, dentro, maisPertoDentro } from './lugares.js';
import { cerimoniasCurtas } from '../leitura.js';

const ASPECTO = 1344 / 752;     // proporção das pinturas
const VEL_X = 0.18;             // larguras da pintura por segundo, no tamanho de referência
const VEL_Y = 0.15;             // alturas da pintura por segundo
const CORRIDA = 1.7;            // Shift ou clique duplo
const ACELERACAO = 9;           // quanto mais alto, mais rápido arranca e para
const ALCANCE = 0.075;          // distância para interagir (em alturas da pintura)
const PERTO_VER = 0.17;         // pontos discretos aparecem a esta distância
const ALTURA_REF = 0.3;
// Gente ao fundo: um vulto genérico desenhado aqui (casaco, guarda-chuva às vezes não), nunca a folha
// do jogador. Fica desfocado, com pouco contraste, e só na faixa do fundo.
const VULTO = '<svg viewBox="0 0 40 100" aria-hidden="true"><ellipse cx="20" cy="12" rx="6.5" ry="7.5"/><path d="M11 22 Q20 17 29 22 L32 66 Q20 70 8 66 Z"/><path d="M14 64 L12 96 L18 96 L20 68 Z"/><path d="M26 64 L28 96 L22 96 L20 68 Z"/></svg>';         // altura de referência do personagem (fração da pintura)
const FIGURA = 0.94;            // a figura ocupa 94% da altura do quadro da folha
const PASSADA = 0.9;            // uma passada completa anda 0,9 altura do boneco
const ZOOM = 1.06;
const ZOOM_CONVERSA = 1.2;
const TECLAS = {
  w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
};

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
const dist = (ax, ay, bx, by) => Math.hypot((ax - bx) * ASPECTO, ay - by);
const reduzido = () => cerimoniasCurtas();
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const pct = (v) => `${(v * 100).toFixed(2)}%`;

function htmlBoneco(sprite) {
  // Sem caminhada própria (antes de o Narrador ativar a ficha), o personagem não aparece na cena:
  // nem sombra nem silhueta (pedido do Bruno, 17/10/2026). O jogador clica direto nos pontos.
  if (!sprite?.url) return '<div class="personagem sem-personagem" aria-hidden="true"></div>';
  const vars = `--quadros:${sprite.quadros};--proporcao:${sprite.largura / sprite.altura}`;
  const folha = `background-image:url('${sprite.url}')`;
  const mascara = `-webkit-mask-image:url('${sprite.url}');mask-image:url('${sprite.url}')`;
  // Corpo, mais uma camada de tinta com a cor da luz do lugar, recortada pela própria figura.
  return `
    <div class="personagem com-sprite${sprite.respira?.url ? ' com-respiracao' : ''}" style="${vars}">
      <span class="sombra-pe"></span>
      <span class="sprite reflexo" style="${folha}"></span>
      <span class="sprite corpo-sprite" style="${folha}"></span>
      <span class="sprite tinta" style="${mascara}"></span>
    </div>`;
}

// Modo de edição (#/noite?editar): mostra chão, objetos, âncoras e luzes, e a coordenada de cada clique.
function htmlDepuracao(geo) {
  const pontos = (pol) => pol.map(([x, y]) => `${x},${y}`).join(' ');
  return `
    <svg class="depuracao" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      <polygon class="dep-chao" points="${pontos(geo.chao)}"/>
      ${geo.frente.map((f) => `<polygon class="dep-frente" points="${pontos(f.poligono)}"/><line class="dep-base" x1="0" x2="1" y1="${f.base}" y2="${f.base}"/>`).join('')}
      <line class="dep-horizonte" x1="0" x2="1" y1="${geo.horizonte}" y2="${geo.horizonte}"/>
      ${geo.luzes.map((l) => `<ellipse class="dep-luz" cx="${l.x}" cy="${l.y}" rx="${l.raio / ASPECTO}" ry="${l.raio}" style="stroke:${l.cor}"/>`).join('')}
    </svg>
    ${Object.entries(geo.ancoras).map(([nome, a]) => `<span class="dep-ancora" style="left:${pct(a.x)};top:${pct(a.y)}">${esc(nome)}${a.papel ? ` · ${a.papel}` : ''}</span>`).join('')}`;
}

export function montarCena(raiz, {
  cla, sprite = null, imagem = '', lugar = null, pontos = [], inicio = null,
  aoInteragir, aoTecla, comentarios = [], comentar, tempo = 'garoa',
} = {}) {
  const geo = geografia(lugar);
  // Sem caminhada própria, não há personagem na cena: os pontos ficam todos à vista e um clique
  // neles abre a conversa direto (sem andar até lá).
  const semPersonagem = !sprite?.url;
  // Nas rotas de demonstração (#/demo/...?depurar) a cena aparece como no jogo, sem o modo de edição.
  const depurar = /[?&](editar|depurar)\b/.test(location.hash) && !/^#\/demo\//.test(location.hash);
  const fundoUrl = String(imagem || '').replace(/'/g, '%27');
  raiz.innerHTML = `
    <div class="cena">
      <div class="mundo">
        <div class="pintura" style="background-image:url('${fundoUrl}')"></div>
        <div class="pintura-fundo" style="background-image:url('${fundoUrl}');--horizonte:${(geo.horizonte * 100).toFixed(1)}%" aria-hidden="true"></div>
        ${geo.luzes.map((l, i) => (l.raio < 0.5 ? `<span class="brilho-luz${l.falha ? ' com-falha' : ''}" data-luz="${i}" style="left:${pct(l.x)};top:${pct(l.y)};--cor:${l.cor};--raio:${l.raio};animation-delay:${(-i * 1.7).toFixed(1)}s"></span>` : '')).join('')}
        <div class="nevoa-cena" aria-hidden="true"></div>
        ${geo.vida?.farois ? `<div class="farol" style="top:${pct(geo.vida.farois.y0)};height:${pct(geo.vida.farois.y1 - geo.vida.farois.y0)}"></div>` : ''}
        ${geo.vida?.passantes?.length ? `<span class="passante vulto" hidden>${VULTO}</span>` : ''}
        ${geo.frente.map((f) => `<div class="frente" style="background-image:url('${fundoUrl}');clip-path:polygon(${f.poligono.map(([x, y]) => `${pct(x)} ${pct(y)}`).join(',')});z-index:${Math.round(f.base * 1000)}"></div>`).join('')}
        ${htmlBoneco(sprite)}
        <svg class="contornos" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"></svg>
        <svg class="rastro" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><polyline points=""/></svg>
        <div class="balao-voz" hidden></div>
        <div class="fala-passagem" hidden></div>
        <div class="cena-pontos"></div>
        ${depurar ? htmlDepuracao(geo) : ''}
      </div>
      <svg class="linha-conversa" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0"/><circle r="3.5" cx="0" cy="0"/></svg>
      <div class="dica-interagir" hidden></div>
      <div class="atencao-rua" hidden role="status"></div>
      <button type="button" class="seta-borda seta-esq" hidden aria-label="Pontos à esquerda">‹ <b></b></button>
      <button type="button" class="seta-borda seta-dir" hidden aria-label="Pontos à direita"><b></b> ›</button>
      ${depurar ? '<pre class="depuracao-coord">Modo de edição: clique na pintura para ver a coordenada.</pre>' : ''}
    </div>`;
  const cena = raiz.querySelector('.cena');
  const mundo = cena.querySelector('.mundo');
  const camadaPontos = cena.querySelector('.cena-pontos');
  const boneco = cena.querySelector('.personagem');
  const corpo = boneco.querySelector('.corpo-sprite');
  const tinta = boneco.querySelector('.tinta');
  const reflexo = boneco.querySelector('.reflexo');
  const sombra = boneco.querySelector('.sombra-pe');

  const balao = cena.querySelector('.balao-voz');
  const camadaContornos = cena.querySelector('.contornos');
  const camadaFundo = cena.querySelector('.pintura-fundo');
  const objetosFrente = [...cena.querySelectorAll('.frente')];
  const falaPassagem = cena.querySelector('.fala-passagem');
  const dica = cena.querySelector('.dica-interagir');
  const setaEsq = cena.querySelector('.seta-esq');
  const setaDir = cena.querySelector('.seta-dir');
  // Toque (celular, tablet): sem teclas nas dicas; a dica vira botão junto do ponto.
  const toque = window.matchMedia?.('(pointer: coarse)').matches;
  document.body.classList.toggle('toque', !!toque);
  const painelCoord = cena.querySelector('.depuracao-coord');
  // Medidor de quadros por segundo (só no ?depurar / ?editar): média de 2 s e o pior quadro.
  const medidor = painelCoord ? document.createElement('div') : null;
  if (medidor) { medidor.className = 'medidor-fps'; cena.appendChild(medidor); }
  const tempos = [];
  let proximoMedidor = 0;
  const farol = cena.querySelector('.farol');
  const passante = cena.querySelector('.passante');

  // --- Tamanho do mundo: a pintura cobre a tela; no celular em pé, ela fica mais larga que a tela
  //     e a câmera acompanha o personagem. Medido só ao mudar o tamanho da janela.
  let vw = 0; let vh = 0; let mw = 0; let mh = 0; let estreito = false;
  let cameraPronta = false;
  function medir() {
    vw = cena.clientWidth || window.innerWidth;
    vh = cena.clientHeight || window.innerHeight;
    if (vw / vh > ASPECTO) { mw = vw; mh = vw / ASPECTO; } else { mh = vh; mw = vh * ASPECTO; }
    estreito = vw < vh;
    mundo.style.width = `${mw}px`;
    mundo.style.height = `${mh}px`;
    mundo.style.setProperty('--mh', `${mh}px`);
    mundo.style.setProperty('--altura', `${(ALTURA_REF * mh) / FIGURA}px`); // personagem e passantes
    cameraPronta = false;
  }
  medir();
  window.addEventListener('resize', medir);

  const altura = (y) => Math.max(0.05, geo.k * (y - geo.horizonte));
  const escalaPonto = (y) => limitar(altura(y) / ALTURA_REF, 0.7, 1.1).toFixed(3);

  let pos = { x: inicio?.[0] ?? geo.entrada[0], y: inicio?.[1] ?? geo.entrada[1] };
  if (!dentro([pos.x, pos.y], geo.chao)) { const [x, y] = maisPertoDentro([pos.x, pos.y], geo.chao, ASPECTO); pos = { x, y }; }
  const vel = { x: 0, y: 0 };
  const cam = { x: 0, y: 0, z: ZOOM };
  const teclas = new Set();
  let lista = [];
  let alvo = null;          // { x, y, ponto, correr }
  let semProgresso = 0;
  let perto = null;
  let olhandoEsquerda = false;
  let virar = 1;
  let virando = null;       // { para, t0 }
  let ultimo = performance.now();
  let fase = sprite?.parado ?? 0;
  let quadroVisivel = -1;
  let paradoDesde = 0;
  let proximoPasso = 0;
  let proximaLuz = 0;
  let proximaChecagem = 0;
  let conversa = false;
  let pontoDaConversa = null; // o objeto com que o personagem está falando (para a linha e o recuo)
  let recuo = null;           // meio passo para trás ao fechar a conversa: { dx, ate, t0 }
  let ladoDialogo = 'direita';
  let interagindo = false;
  let mostrarTudoAte = 0;
  let falaAte = 0;
  let balaoEscolha = null;   // { opcoes, aoEscolher, ate }: pergunta pequena no balão, sem parar de andar
  let caca = null;           // caçada pela sombra ou de frente: { alvo, modo, limite, t0, atencao, zonas, aoFim }
  let esperaAte = 0;         // antecipação: vira para o destino e só então sai (80 ms)
  let vivo = true;
  // Vida dentro da pintura: passante no fundo, néon que falha, farol que varre a rua.
  const efeitosLigados = () => !document.body.classList.contains('sem-efeitos');
  const sorteio = (min, max) => min + Math.random() * (max - min);
  // O clima da noite muda quanta gente passa: noite seca com lua tem mais gente; tempestade, quase ninguém.
  const INTERVALO_PASSANTE = { lua: [6000, 14000], garoa: [10000, 25000], nevoa: [14000, 30000], tempestade: [25000, 45000] }[tempo] || [10000, 25000];
  const vida = { proximoPassante: performance.now() + sorteio(3000, 7000), passante: null, proximaFalha: performance.now() + sorteio(2500, 6000), falhando: -1, falhaAte: 0, proximoFarol: performance.now() + sorteio(5000, 10000) };
  const feitosAntes = new Set();

  // --- Pontos ----------------------------------------------------------------------------------
  function desenharPontos(recemFeitos = new Set()) {
    camadaPontos.innerHTML = lista.map((p) => `
      <button type="button" class="ponto ponto-${p.tipo || 'acao'}${p.feito ? ' feito' : ''}${p.discreto ? ' discreto' : ''}${p.visto ? ' visto' : ''}${p.alternativa ? ' alternativa' : ''}${p.falta ? ' falta' : ''}${recemFeitos.has(p.id) ? ' recem-feito' : ''}${p.vantagem ? ' vantagem' : ''}"${p.temperamento ? ` data-temperamento="${p.temperamento}"` : ''} data-ponto="${esc(p.id)}"
        style="left:${pct(p.x)};top:${pct(p.y)};--escala:${escalaPonto(p.y)}">
        <span class="ponto-luz" aria-hidden="true"></span>
        <span class="ponto-faiscas" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span class="ponto-contorno" aria-hidden="true"></span>
        <span class="ponto-rotulo">${/^\d$/.test(p.icone || '') ? `${p.icone} · ` : ''}${esc(p.rotulo)}</span>
      </button>`).join('');
    camadaContornos.innerHTML = lista.filter((p) => p.contorno?.length).map((p) =>
      `<polygon data-contorno="${esc(p.id)}" points="${p.contorno.map(([x, y]) => `${x},${y}`).join(' ')}"/>`).join('');
    perto = null;
    proximaChecagem = 0;
  }

  function alcanceEm(y) { return ALCANCE * limitar(altura(y) / ALTURA_REF, 0.6, 1.2); }
  const visivel = (p, agora) => semPersonagem || !p.discreto || agora < mostrarTudoAte || dist(p.x, p.y, pos.x, pos.y) < PERTO_VER;

  function maisPerto(agora) {
    let melhor = null;
    let menor = Infinity;
    for (const p of lista) {
      if (!visivel(p, agora)) continue;
      const d = dist(p.x, p.y, pos.x, pos.y);
      if (d < menor) { menor = d; melhor = p; }
    }
    return menor <= alcanceEm(pos.y) ? melhor : null;
  }

  function virarPara(esquerda) {
    if (esquerda === olhandoEsquerda) return;
    olhandoEsquerda = esquerda;
    virando = { para: esquerda ? -1 : 1, t0: performance.now() };
    if (!virando) virar = esquerda ? -1 : 1;
    proximaLuz = 0;
  }

  // Ao interagir: o anel do ponto se expande, o personagem vira para ele e a conversa abre logo depois.
  function interagir(p) {
    if (!p || camadaAberta() || interagindo) return;
    alvo = null;
    interagindo = true;
    const paraEsquerda = p.lado ? p.lado === 'esquerda' : p.x < pos.x - 0.005;
    virarPara(paraEsquerda);
    // O personagem se inclina para o objeto enquanto a conversa estiver aberta; em objeto baixo
    // (no chão), se abaixa um pouco por 300 ms.
    pontoDaConversa = p;
    boneco.style.setProperty('--inclinacao', `${paraEsquerda ? -3.5 : 3.5}deg`);
    boneco.classList.add('inclinado');
    for (const el of camadaContornos.children) el.classList.toggle('aceso', el.dataset.contorno === p.id);
    if (p.baixo) { boneco.classList.add('abaixado'); setTimeout(() => boneco.classList.remove('abaixado'), 300); }
    const el = camadaPontos.querySelector(`[data-ponto="${CSS.escape(p.id)}"]`);
    if (el) { el.classList.remove('acionado'); void el.offsetWidth; el.classList.add('acionado'); }
    som.anel?.();
    setTimeout(() => {
      interagindo = false;
      if (vivo && !camadaAberta()) aoInteragir?.(p);
      // Sem caixa de conversa (detalhe em balão): endireita logo, sem esperar.
      setTimeout(() => { if (!conversa && pontoDaConversa === p) { boneco.classList.remove('inclinado'); pontoDaConversa = null; } }, 600);
    }, reduzido() ? 100 : 150);
  }

  // --- Voz interior que comenta ao passar perto -------------------------------------------------
  function falar(voz, texto, ms = 3200) {
    // Uma pergunta no balão esperando resposta não é coberta por outra fala.
    if (balaoEscolha && performance.now() < balaoEscolha.ate) return;
    balao.className = `balao-voz voz-${grupoVoz(voz)}`;
    balao.innerHTML = `<b>${esc(voz)}</b> ${esc(texto)}`;
    balao.hidden = false;
    falaAte = performance.now() + ms;
    som.voz?.();
  }

  // Pergunta pequena no balão junto da cabeça ("1 · Olhar mais de perto · 2 · Seguir em frente"),
  // respondida com 1 ou 2 (ou clique) sem parar de andar; some em 6 s.
  function perguntarNoBalao({ voz, texto, opcoes, aoEscolher, aoExpirar, ms = 6000 }) {
    balao.className = `balao-voz balao-escolha voz-${grupoVoz(voz)}`;
    balao.innerHTML = `<b>${esc(voz)}</b> ${esc(texto)}<span class="balao-opcoes">${opcoes.map((o, i) => `<button type="button" data-balao="${i}">${i + 1} · ${esc(o)}</button>`).join('')}</span>`;
    balao.hidden = false;
    falaAte = performance.now() + ms;
    balaoEscolha = { aoEscolher, aoExpirar, ate: falaAte };
    som.voz?.();
  }
  function responderBalao(i) {
    if (!balaoEscolha) return;
    const { aoEscolher } = balaoEscolha;
    balaoEscolha = null;
    falaAte = performance.now();
    som.toque?.();
    aoEscolher?.(i);
  }
  balao.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-balao]');
    if (b) { ev.stopPropagation(); responderBalao(Number(b.dataset.balao)); }
  });

  // --- Caçada pela sombra / de frente (rodada 18) ---------------------------------------------------
  // A visibilidade se lê no próprio personagem: na sombra, ele vira silhueta escura com um contorno
  // vermelho fino; na luz, volta às cores. Correr desenha um anel de barulho no chão; se o anel chega
  // à presa, a rua repara. A presa olha de relance quando ele entra na borda do campo dela. As palavras
  // ("ninguém reparou / alguém olhou / você foi visto") ficam só como resumo, no alto.
  const atencaoEl = cena.querySelector('.atencao-rua');
  const PALAVRAS_ATENCAO = (a) => (a < 0.34 ? 'ninguém reparou' : a < 0.67 ? 'alguém olhou' : 'você foi visto');
  function luzEm(x, y) {
    let s = 0;
    for (const l of geo.luzes) {
      if (l.raio >= 0.5) continue; // lua e céu não contam
      s += (l.forca ?? 1) * Math.max(0, 1 - dist(l.x, l.y, x, y) / (l.raio * 1.3));
    }
    return Math.min(1.5, s);
  }
  function iniciarFurtividade({ alvo, modo = 'sombra', limite = 20, zonas = [], aoFim }) {
    caca = { alvo, modo, limite, zonas, aoFim, t0: performance.now(), atencao: 0, anel: 0, olhou: false };
    cena.classList.add('em-caca');
    atencaoEl.hidden = false;
    atencaoEl.textContent = PALAVRAS_ATENCAO(0);
  }
  function encerrarFurtividade(chegou) {
    const c = caca;
    if (!c) return;
    caca = null;
    cena.classList.remove('em-caca');
    boneco.classList.remove('na-sombra', 'manto');
    atencaoEl.hidden = true;
    c.aoFim?.({ chegou, atencao: c.atencao });
  }
  function anelDeBarulho(x, y) {
    const el = document.createElement('span');
    el.className = 'anel-barulho';
    el.style.left = pct(x);
    el.style.top = pct(y);
    mundo.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
  function atualizarCaca(agora, dt, correndo) {
    const c = caca;
    const andando = Math.hypot(vel.x, vel.y) > 0.01;
    const luz = luzEm(pos.x, pos.y);
    const naSombra = luz < 0.25;
    boneco.classList.toggle('na-sombra', c.modo === 'sombra' && naSombra);
    let taxa = c.modo === 'sombra' ? (naSombra ? -0.03 : luz * 0.09) : 0.035;
    // Ofuscação: Manto de Sombras (parado, some) e Passagem Invisível (alguns segundos, mesmo andando).
    const sumido = (c.manto && !andando) || agora < (c.invisivelAte || 0);
    boneco.classList.toggle('manto', sumido);
    if (sumido) taxa = Math.min(taxa, -0.05);
    if (c.zonas.some((z) => dist(z.x, z.y, pos.x, pos.y) < z.raio)) taxa *= 0.4; // vantagem: canto sem câmera
    // Barulho: correndo, um anel a cada 0,4 s; se o anel alcança a presa, a atenção sobe.
    if (correndo && andando && !c.silencio) {
      c.anel -= dt;
      if (c.anel <= 0) {
        c.anel = 0.4;
        anelDeBarulho(pos.x, pos.y);
        if (dist(c.alvo.x, c.alvo.y, pos.x, pos.y) < 0.12) taxa += 1.2;
      }
    }
    // A presa olha de relance quando ele entra na borda do campo dela.
    const d = dist(c.alvo.x, c.alvo.y, pos.x, pos.y);
    if (!c.olhou && d < 0.22 && !naSombra && !sumido) {
      c.olhou = true;
      const el = camadaPontos.querySelector('.ponto-presa');
      if (el) { el.classList.add('olhou'); setTimeout(() => el.classList.remove('olhou'), 500); }
      efeitoNoMundo('relance', c.alvo.x, c.alvo.y - altura(c.alvo.y) * 0.9, 700);
      taxa += 0.5;
    }
    c.atencao = limitar(c.atencao + taxa * dt, 0, 1);
    const palavras = PALAVRAS_ATENCAO(c.atencao);
    if (atencaoEl.textContent !== palavras) atencaoEl.textContent = palavras;
    atencaoEl.dataset.nivel = c.atencao < 0.34 ? '0' : c.atencao < 0.67 ? '1' : '2';
    if (d <= Math.max(alcanceEm(pos.y) * 1.5, 0.11) && agora - c.t0 > 2500) encerrarFurtividade(true);
    else if (agora - c.t0 > c.limite * 1000) encerrarFurtividade(false);
  }

  // --- Disciplinas em ação (rodada 19): efeitos na cena, sem dados ---------------------------------
  const rastro = cena.querySelector('.rastro polyline');
  let sentidosAte = 0;
  let alvoDoRastro = null;
  function olhosDeSangue() {
    boneco.classList.remove('olhos-sangue');
    void boneco.offsetWidth;
    boneco.classList.add('olhos-sangue');
    setTimeout(() => boneco.classList.remove('olhos-sangue'), 1400);
  }
  // Devolve false quando o poder não serve agora (os da caçada fora da caçada).
  function usarPoder(id, { alvo = null } = {}) {
    const agora = performance.now();
    if (id === 'sentidos-agucados') {
      sentidosAte = agora + 10000;
      alvoDoRastro = alvo || caca?.alvo || lista.filter((p) => p.tipo === 'detalhe' && !p.visto).sort((a, b) => dist(a.x, a.y, pos.x, pos.y) - dist(b.x, b.y, pos.x, pos.y))[0] || null;
      mostrarTudoAte = agora + 10000;
      proximaChecagem = 0;
      cena.classList.add('sentidos');
      som.sentidos?.(true);
      setTimeout(() => { if (performance.now() >= sentidosAte - 50) { cena.classList.remove('sentidos'); rastro.setAttribute('points', ''); som.sentidos?.(false); } }, 10000);
    } else if (id === 'perscrutar-alma') {
      cena.classList.add('perscrutando');
      clearTimeout(usarPoder.tp);
      usarPoder.tp = setTimeout(() => cena.classList.remove('perscrutando'), 12000);
    } else {
      if (!caca) return false;
      if (id === 'manto-sombras') caca.manto = true;
      else if (id === 'silencio-morte') caca.silencio = true;
      else if (id === 'passagem-invisivel') caca.invisivelAte = agora + 8000;
      else if (id === 'ligeireza') caca.ligeireza = true;
      else if (id === 'piscar') {
        const dx = caca.alvo.x - pos.x;
        const dy = caca.alvo.y - pos.y;
        const n = Math.hypot(dx * ASPECTO, dy) || 1;
        const passo = Math.min(0.14, n * 0.8) / n;
        const destino = [pos.x + dx * passo, pos.y + dy * passo];
        if (dentro(destino, geo.chao)) { pos.x = destino[0]; pos.y = destino[1]; boneco.classList.add('piscou'); setTimeout(() => boneco.classList.remove('piscou'), 300); }
      } else return false;
    }
    olhosDeSangue();
    som.reacao?.('disciplina', 0);
    return true;
  }
  function desenharRastro(agora) {
    if (agora > sentidosAte || !alvoDoRastro) return;
    // Um rastro vermelho e tremido do personagem até o alvo.
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = pos.x + (alvoDoRastro.x - pos.x) * t + Math.sin(t * 9 + agora / 900) * 0.006;
      const y = pos.y + (alvoDoRastro.y - pos.y) * t + Math.cos(t * 7) * 0.004;
      pts.push(`${x.toFixed(4)},${y.toFixed(4)}`);
    }
    rastro.setAttribute('points', pts.join(' '));
  }

  // Ao entrar (e ao fechar a narração): os nomes de todos os pontos aparecem por um instante, com
  // faíscas mais fortes, e depois somem devagar.
  function apresentar(ms = 3000) {
    mostrarTudoAte = performance.now() + ms;
    proximaChecagem = 0;
    cena.classList.add('apresentando');
    clearTimeout(apresentar.t);
    apresentar.t = setTimeout(() => cena.classList.remove('apresentando'), ms);
  }

  function checarComentarios() {
    if (conversa || camadaAberta() || balaoEscolha || performance.now() < falaAte + 600) return;
    for (const c of comentarios) {
      if (dist(c.x, c.y, pos.x, pos.y) > c.raio) continue;
      if (comentar && !comentar(c)) continue;
      falar(c.voz, c.texto);
      return;
    }
  }

  // --- Luz do lugar no personagem ----------------------------------------------------------------
  // A pintura reduzida numa tela pequena dá o brilho perto do personagem; as fontes de luz dão a cor.
  const amostra = { dados: null, L: 64, A: 36 };
  if (imagem) {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = amostra.L;
        c.height = amostra.A;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, amostra.L, amostra.A);
        amostra.dados = ctx.getImageData(0, 0, amostra.L, amostra.A).data;
        proximaLuz = 0;
      } catch { amostra.dados = null; }
    };
    img.src = imagem;
  }
  function brilhoDaPintura(x, y, raioY) {
    if (!amostra.dados) return null;
    let soma = 0;
    let n = 0;
    const cx = Math.round(x * (amostra.L - 1));
    const cy = Math.round(y * (amostra.A - 1));
    const ry = Math.max(1, Math.round(raioY * amostra.A));
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = limitar(cx + dx, 0, amostra.L - 1);
        const py = limitar(cy + dy, 0, amostra.A - 1);
        const i = (py * amostra.L + px) * 4;
        soma += (0.2126 * amostra.dados[i] + 0.7152 * amostra.dados[i + 1] + 0.0722 * amostra.dados[i + 2]) / 255;
        n++;
      }
    }
    return soma / n;
  }

  function iluminar() {
    if (!sprite?.url) return;
    const h = altura(pos.y);
    const s = h / ALTURA_REF;
    const ty = pos.y - h * 0.55;
    const tronco = brilhoDaPintura(pos.x, ty, h * 0.25);
    const pes = brilhoDaPintura(pos.x, pos.y - 0.01, 0.02);
    const L = tronco == null ? 0.3 : tronco * 0.5 + pes * 0.5;
    let total = 0; let r = 0; let g = 0; let b = 0; let principal = null; let maior = 0;
    for (const [n, l] of geo.luzes.entries()) {
      if (n === vida.falhando) continue; // a luz que falhou agora não ilumina
      const f = Math.max(0, 1 - dist(l.x, l.y, pos.x, ty) / l.raio);
      const i = f * f * l.forca;
      if (i <= 0) continue;
      const [cr, cg, cb] = rgb(l.cor);
      r += cr * i; g += cg * i; b += cb * i; total += i;
      if (i > maior) { maior = i; principal = l; }
    }
    boneco.style.setProperty('--brilho', limitar(0.7 + L * 0.9 + total * 0.08, 0.74, 1.12).toFixed(3));
    if (total > 0.02) {
      tinta.style.backgroundColor = `rgb(${Math.round(r / total)}, ${Math.round(g / total)}, ${Math.round(b / total)})`;
      tinta.style.opacity = Math.min(0.75, 0.15 + total * 1.1).toFixed(3);
    } else {
      tinta.style.opacity = '0';
    }
    // Contorno de luz do lado de onde ela vem; no escuro, um contorno frio de luar mantém a silhueta legível.
    const comLuz = principal && maior > 0.04;
    const lado = comLuz ? Math.sign(principal.x - pos.x) || 1 : -1;
    const [cr, cg, cb] = rgb(comLuz ? principal.cor : '#9ab6dc');
    const alfa = comLuz ? Math.min(0.5, 0.2 + maior * 0.6) : 0.18; // suave: só do lado da luz; o luar quase some
    boneco.style.setProperty('--rim-x', `${((1.8 / Math.max(0.35, s)) * lado * Math.sign(virar || 1)).toFixed(2)}px`);
    boneco.style.setProperty('--rim-cor', `rgba(${cr}, ${cg}, ${cb}, ${alfa.toFixed(2)})`);
    // Sombra para o lado oposto à luz principal, mais longa quanto mais forte a luz.
    const forca = comLuz ? Math.min(1, maior * 1.6) : 0;
    sombra.style.transform = `translateX(${(-lado * forca * 22).toFixed(1)}%) scaleX(${(1 + forca * 0.5).toFixed(2)})`;
    sombra.style.opacity = (0.8 - forca * 0.2).toFixed(2);
  }

  // Passo em chão molhado: um respingo pequeno sob o pé e uma onda curta no reflexo.
  function respingar() {
    const r = document.createElement('span');
    r.className = 'respingo';
    const s = altura(pos.y) / ALTURA_REF;
    r.style.transform = `translate3d(${(pos.x * mw + (olhandoEsquerda ? -6 : 6) * s).toFixed(1)}px, ${(pos.y * mh).toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`;
    r.style.zIndex = String(Math.round(pos.y * 1000) - 1);
    mundo.appendChild(r);
    setTimeout(() => r.remove(), 600);
    if (reflexo) { reflexo.classList.remove('onda'); void reflexo.offsetWidth; reflexo.classList.add('onda'); }
  }

  // --- Vida dentro da pintura ------------------------------------------------------------------
  // Coisas da pintura que respondem (sem efeito na regra): copo que tilinta, poça que ondula, poste
  // que pisca quando ele para embaixo. Cada uma com um som curto do lado em que acontece.
  const ultimaReacao = new Map();
  function checarReacoes(agora) {
    for (const r of geo.reacoes || []) {
      if (dist(r.x, r.y, pos.x, pos.y) > r.raio) continue;
      if (agora - (ultimaReacao.get(r) || 0) < 9000) continue;
      const parado = Math.hypot(vel.x, vel.y) < 0.01;
      if ((r.quando === 'parar') !== parado) continue;
      ultimaReacao.set(r, agora);
      const ex = r.ex ?? r.x;
      const ey = r.ey ?? r.y - 0.03;
      som.reacao?.(r.som, limitar((ex - 0.5) * 2, -1, 1));
      if (r.efeito === 'onda') {
        if (reflexo) { reflexo.classList.remove('onda'); void reflexo.offsetWidth; reflexo.classList.add('onda'); }
        efeitoNoMundo('onda-agua', r.x, r.y, 1200);
      } else if (r.efeito === 'pisca') {
        const luz = mundo.querySelector(`[data-luz="${r.luz}"]`);
        if (luz) { luz.classList.remove('piscando'); void luz.offsetWidth; luz.classList.add('piscando'); }
      } else if (r.efeito === 'brilho') {
        efeitoNoMundo('brilho-copo', ex, ey, 900);
      } else if (r.efeito === 'voa') {
        efeitoNoMundo('ave-voa', ex, ey, 1800);
      }
    }
  }

  function efeitoNoMundo(classe, x, y, ms) {
    const el = document.createElement('span');
    el.className = classe;
    el.style.left = pct(x);
    el.style.top = pct(y);
    mundo.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // Uma fala ouvida de passagem por noite, vinda do vulto ao fundo (nada da crônica).
  const FALAS_DE_PASSAGEM = geo.falas || [
    '…o bonde não sobe mais depois da meia-noite…',
    '…amanhã eu pago, juro…',
    '…a chuva não para desde terça…',
    '…ele disse que ia voltar, mas nunca volta…',
    '…fecha a porta que vai molhar tudo…',
    '…tu viu o jogo ontem?…',
  ];
  const chaveFala = `mascara.falaPassagem.${lugar || 'x'}.${new Date().toDateString()}`;
  let falouDePassagem = (() => { try { return sessionStorage.getItem(chaveFala) === '1'; } catch { return false; } })();
  function falarDePassagem(x, y, h) {
    if (falouDePassagem || conversa) return;
    falouDePassagem = true;
    try { sessionStorage.setItem(chaveFala, '1'); } catch { /* sem armazenamento */ }
    falaPassagem.textContent = FALAS_DE_PASSAGEM[Math.floor(Math.random() * FALAS_DE_PASSAGEM.length)];
    falaPassagem.style.transform = `translate3d(${(x * mw).toFixed(1)}px, ${((y - h * 0.45) * mh).toFixed(1)}px, 0) translate(-50%, -100%)`;
    falaPassagem.hidden = false;
    falaPassagem.classList.remove('sumindo');
    setTimeout(() => falaPassagem.classList.add('sumindo'), 3200);
    setTimeout(() => { falaPassagem.hidden = true; }, 3800);
  }

  function animarVida(agora, dt) {
    const ligado = efeitosLigados();
    if (!semPersonagem) checarReacoes(agora);
    // Passante: silhueta escura e desfocada que atravessa o fundo, na escala da perspectiva.
    if (passante) {
      const faixas = geo.vida.passantes;
      if (!vida.passante && ligado && agora > vida.proximoPassante) {
        const f = faixas[Math.floor(Math.random() * faixas.length)];
        const ida = Math.random() < 0.5;
        vida.passante = { f, x: ida ? f.x0 : f.x1, dir: ida ? 1 : -1, fase: 0 };
        passante.style.setProperty('--halo', ['255, 70, 60', '255, 180, 70', '90, 140, 255', '140, 180, 160'][Math.floor(Math.random() * 4)]);
        passante.hidden = false;
      }
      const p = vida.passante;
      if (p) {
        const h = altura(p.f.y);
        const v = 0.05 * limitar(h / ALTURA_REF, 0.3, 1.2);
        p.x += p.dir * v * dt;
        p.fase += dt * 2.2;
        if (!p.falou && p.x > p.f.x0 + (p.f.x1 - p.f.x0) * 0.4 && p.x < p.f.x0 + (p.f.x1 - p.f.x0) * 0.6) { p.falou = true; if (Math.random() < 0.5) falarDePassagem(p.x, p.f.y, h); }
        // Vulto: no máximo 40% da altura do personagem naquele ponto, com um balanço leve de passo.
        const bal = Math.sin(p.fase * Math.PI * 2) * 0.6;
        passante.style.transform = `translate3d(${(p.x * mw).toFixed(1)}px, ${(p.f.y * mh - Math.abs(bal) * 2).toFixed(1)}px, 0) translate(-50%, -100%) scale(${((h / ALTURA_REF) * 0.4).toFixed(3)}) scaleX(${p.dir}) rotate(${bal.toFixed(2)}deg)`;
        passante.style.zIndex = String(Math.round(p.f.y * 1000));
        if (p.x < p.f.x0 - 0.02 || p.x > p.f.x1 + 0.02 || !ligado) {
          vida.passante = null;
          passante.hidden = true;
          vida.proximoPassante = agora + sorteio(...INTERVALO_PASSANTE);
        }
      }
    }
    // Néon ou lâmpada que falha: o brilho cai por um instante (e some da luz no personagem).
    if (vida.falhando >= 0 && agora > vida.falhaAte) {
      mundo.querySelector(`.brilho-luz[data-luz="${vida.falhando}"]`)?.classList.remove('falhando');
      vida.falhando = -1;
      proximaLuz = 0;
    }
    if (vida.falhando < 0 && ligado && agora > vida.proximaFalha) {
      const candidatas = geo.luzes.map((l, i) => (l.falha ? i : -1)).filter((i) => i >= 0);
      vida.proximaFalha = agora + sorteio(4000, 11000);
      if (candidatas.length) {
        vida.falhando = candidatas[Math.floor(Math.random() * candidatas.length)];
        vida.falhaAte = agora + sorteio(70, 220);
        mundo.querySelector(`.brilho-luz[data-luz="${vida.falhando}"]`)?.classList.add('falhando');
        proximaLuz = 0;
      }
    }
    // Farol: uma faixa de luz varre a rua de um lado ao outro.
    if (farol && ligado && agora > vida.proximoFarol) {
      vida.proximoFarol = agora + sorteio(18000, 36000);
      farol.classList.remove('varrendo', 'da-direita');
      void farol.offsetWidth;
      farol.classList.toggle('da-direita', Math.random() < 0.5);
      farol.classList.add('varrendo');
    }
  }

  // --- Folha de caminhada --------------------------------------------------------------------------
  // Folhas do personagem: perfil (a principal), frente e costas (andar para baixo e para cima) e
  // respiração (parado). As três últimas são opcionais; sem elas, fica o perfil.
  let folha = sprite;
  function usarFolha(nova) {
    if (!nova?.url || nova === folha) return;
    folha = nova;
    quadroVisivel = -1;
    corpo.style.backgroundImage = `url('${nova.url}')`;
    reflexo.style.backgroundImage = `url('${nova.url}')`;
    tinta.style.webkitMaskImage = `url('${nova.url}')`;
    tinta.style.maskImage = `url('${nova.url}')`;
    boneco.style.setProperty('--quadros', nova.quadros);
    boneco.style.setProperty('--proporcao', nova.largura / nova.altura);
  }
  const posicaoDoQuadro = (n, f = folha) => `${f.quadros > 1 ? (n / (f.quadros - 1)) * 100 : 0}% 0`;
  function mostrarFase(f) {
    if (!folha?.url) return;
    const n = folha.quadros;
    const q = ((Math.floor(f) % n) + n) % n;
    if (q === quadroVisivel) return;
    quadroVisivel = q;
    const p = posicaoDoQuadro(q);
    corpo.style.backgroundPosition = p;
    reflexo.style.backgroundPosition = p;
    tinta.style.webkitMaskPosition = p;
    tinta.style.maskPosition = p;
  }

  // --- Câmera --------------------------------------------------------------------------------------
  function atualizarCamera(dt) {
    // Perto de um objeto marcado, a câmera aproxima um pouco e enquadra o objeto junto.
    const marcado = !conversa && perto && (perto.contorno || perto.parada) ? perto : null;
    const zAlvo = conversa ? ZOOM_CONVERSA : marcado && !estreito ? Math.max(ZOOM, 1.1) : (estreito ? 1 : ZOOM);
    cam.z += (zAlvo - cam.z) * (cameraPronta ? Math.min(1, dt * 4) : 1);
    const W = mw * cam.z;
    const H = mh * cam.z;
    const h = altura(pos.y);
    const fx = (marcado ? pos.x * 0.6 + marcado.x * 0.4 : pos.x) * W;
    const fy = (pos.y - h * 0.5) * H;
    let alvoX;
    let alvoY;
    if (conversa && !estreito) {
      // A caixa de conversa fica de um lado; o personagem vai para o outro.
      alvoX = vw * (ladoDialogo === 'direita' ? 0.3 : 0.7) - fx;
      alvoY = vh * 0.55 - fy;
    } else if (conversa) {
      // No celular, a folha da conversa sobe de baixo: o personagem vai para o alto da tela.
      alvoX = vw * 0.5 - fx;
      alvoY = vh * 0.3 - fy;
    } else {
      // Segue com folga: só mexe quando o personagem sai da faixa central, e antecipa o lado do passo.
      const sx = cam.x + fx;
      alvoX = cam.x;
      const folga = estreito ? 0.12 : 0.15;
      if (sx < vw * (0.5 - folga)) alvoX = vw * (0.5 - folga) - fx;
      else if (sx > vw * (0.5 + folga)) alvoX = vw * (0.5 + folga) - fx;
      alvoX -= (vel.x / VEL_X) * vw * 0.04;
      alvoY = vh * 0.58 - fy;
    }
    alvoX = limitar(alvoX, vw - W, 0);
    alvoY = conversa && estreito ? Math.min(0, alvoY) : limitar(alvoY, vh - H, 0);
    const k = cameraPronta ? Math.min(1, dt * 3) : 1;
    cam.x += (alvoX - cam.x) * k;
    cam.y += (alvoY - cam.y) * k;
    cameraPronta = true;
    mundo.style.transform = `translate3d(${cam.x.toFixed(1)}px, ${cam.y.toFixed(1)}px, 0) scale(${cam.z.toFixed(4)})`;
    // Profundidade sem 3D: o que fica acima do horizonte anda 60% do movimento da câmera, e os objetos
    // da frente andam 115% (no máximo uns 12 px para cada lado).
    const meio = (vw - W) / 2;
    const desvio = cam.x - meio;
    const fundo = limitar(-desvio * 0.4 / cam.z, -12, 12);
    const frente = limitar(desvio * 0.15 / cam.z, -12, 12);
    if (camadaFundo) camadaFundo.style.translate = `${fundo.toFixed(1)}px 0`;
    for (const f of objetosFrente) f.style.translate = `${frente.toFixed(1)}px 0`;
  }

  // Rótulos dos pontos sempre dentro da tela (perto da borda, o rótulo desliza para dentro).
  // Pontos fora da tela (o mundo é mais largo que o celular) ganham uma seta na borda, com o número deles.
  const foraDaTela = { esq: [], dir: [] };
  function ajustarRotulos(agora) {
    foraDaTela.esq = [];
    foraDaTela.dir = [];
    for (const el of camadaPontos.children) {
      const p = lista.find((x) => x.id === el.dataset.ponto);
      if (!p) continue;
      const sx = cam.x + p.x * mw * cam.z;
      el.classList.toggle('rotulo-dir', sx < 110);
      el.classList.toggle('rotulo-esq', sx > vw - 110);
      el.classList.toggle('fora', sx < -10 || sx > vw + 10); // fora da tela: sem rótulo cortado na borda
      if (p.discreto && !visivel(p, agora)) continue;
      if (sx < 8) foraDaTela.esq.push(p); else if (sx > vw - 8) foraDaTela.dir.push(p);
    }
    for (const [seta, grupo] of [[setaEsq, foraDaTela.esq], [setaDir, foraDaTela.dir]]) {
      seta.hidden = !grupo.length || conversa;
      // A caçada que falta e está fora da tela: seta vermelha, com o nome.
      const caca = grupo.find((p) => p.tipo === 'cacar' && p.falta);
      seta.classList.toggle('urgente', !!caca);
      seta.querySelector('b').textContent = caca ? `Caçada${grupo.length > 1 ? ` +${grupo.length - 1}` : ''}` : grupo.length;
    }
    separarRotulos(agora);
    // No toque, a dica fica logo abaixo do ponto mais perto.
    if (toque && perto) {
      dica.style.left = `${(cam.x + perto.x * mw * cam.z).toFixed(0)}px`;
      dica.style.top = `${(cam.y + perto.y * mh * cam.z + 10).toFixed(0)}px`;
    }
  }
  // Rótulos que se cruzam na tela: o do ponto mais distante do personagem fica só com o ícone (o texto
  // volta com o ponto perto, com o mouse em cima ou com "mostrar tudo", aí empilhado para cima).
  function separarRotulos(agora) {
    const tudo = agora < mostrarTudoAte;
    const itens = [];
    for (const el of camadaPontos.children) {
      const p = lista.find((x) => x.id === el.dataset.ponto);
      if (!p || (p.discreto && !visivel(p, agora))) { el.classList.remove('sem-rotulo'); continue; }
      el.style.removeProperty('--empilhar');
      itens.push({ el, p, d: el === camadaPontos.querySelector('.perto') ? -1 : dist(p.x, p.y, pos.x, pos.y) });
    }
    itens.sort((a, b) => a.d - b.d);
    const ocupados = [];
    const cruza = (a, b) => a.left < b.right + 6 && b.left < a.right + 6 && a.top < b.bottom + 6 && b.top < a.bottom + 6;
    for (const it of itens) {
      const rotulo = it.el.querySelector('.ponto-rotulo');
      if (!rotulo) continue;
      let r = rotulo.getBoundingClientRect();
      let bate = ocupados.some((o) => cruza(r, o));
      if (bate && tudo) {
        // Empilha para cima até achar espaço.
        let sobe = 0;
        while (bate && sobe < 200) {
          sobe += r.height + 6;
          const r2 = { left: r.left, right: r.right, top: r.top - sobe, bottom: r.bottom - sobe };
          bate = ocupados.some((o) => cruza(r2, o));
          if (!bate) { it.el.style.setProperty('--empilhar', `${-sobe}px`); r = r2; }
        }
      }
      it.el.classList.toggle('sem-rotulo', bate && !tudo);
      if (!bate || tudo) ocupados.push(r);
    }
  }

  function irParaFora(grupo) {
    const p = grupo.reduce((a, b) => (dist(a.x, a.y, pos.x, pos.y) < dist(b.x, b.y, pos.x, pos.y) ? a : b));
    const [x, y] = maisPertoDentro([p.x, p.y], geo.chao, ASPECTO);
    alvo = { x, y, ponto: p };
    semProgresso = 0;
  }
  for (const [seta, lado] of [[setaEsq, 'esq'], [setaDir, 'dir']]) {
    seta.addEventListener('click', (ev) => { ev.stopPropagation(); if (foraDaTela[lado].length) irParaFora(foraDaTela[lado]); });
  }
  dica.addEventListener('click', (ev) => { ev.stopPropagation(); if (perto) interagir(perto); });

  // --- Movimento ---------------------------------------------------------------------------------
  function mover(dx, dy) {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (dentro([nx, ny], geo.chao)) { pos.x = nx; pos.y = ny; return true; }
    // Fora do chão: desliza pela borda.
    if (dx && dentro([nx, pos.y], geo.chao)) { pos.x = nx; vel.y = 0; return true; }
    if (dy && dentro([pos.x, ny], geo.chao)) { pos.y = ny; vel.x = 0; return true; }
    vel.x = 0;
    vel.y = 0;
    return false;
  }

  function quadro(agora) {
    if (!vivo) return;
    if (!raiz.isConnected) { desmontar(); return; }
    const dtReal = agora - ultimo;
    const dt = Math.min(0.12, dtReal / 1000);
    if (medidor) {
      tempos.push([agora, dtReal]);
      while (tempos.length && agora - tempos[0][0] > 2000) tempos.shift();
      if (agora > proximoMedidor && tempos.length > 1) {
        proximoMedidor = agora + 500;
        const media = tempos.reduce((s, t) => s + t[1], 0) / tempos.length;
        const pior = Math.max(...tempos.map((t) => t[1]));
        medidor.textContent = `${Math.round(1000 / media)} qps · pior quadro ${Math.round(pior)} ms`;
        medidor.classList.toggle('ruim', media > 25 || pior > 50);
      }
    }
    ultimo = agora;

    let dx = 0;
    let dy = 0;
    if (!camadaAberta() && !semPersonagem) for (const k of teclas) { const v = TECLAS[k]; if (v) { dx += v[0]; dy += v[1]; } }
    if (dx || dy) alvo = null;
    let correndo = teclas.has('shift');
    if (alvo) {
      correndo ||= !!alvo.correr;
      const ax = alvo.x - pos.x;
      const ay = alvo.y - pos.y;
      const d = dist(alvo.x, alvo.y, pos.x, pos.y);
      const chegouPerto = alvo.ponto && !alvo.ponto.parada && !alvo.aproximar && dist(alvo.ponto.x, alvo.ponto.y, pos.x, pos.y) <= alcanceEm(pos.y) * 0.8;
      if (d < 0.008 || chegouPerto || semProgresso > 0.5) {
        const ponto = alvo.ponto;
        const travou = semProgresso > 0.5;
        alvo = null;
        semProgresso = 0;
        if (ponto && (!travou || chegouPerto || dist(ponto.x, ponto.y, pos.x, pos.y) <= alcanceEm(pos.y) * 1.6)) interagir(ponto);
      } else {
        const n = Math.hypot(ax * ASPECTO, ay) || 1;
        if (agora >= esperaAte) {
          dx = (ax * ASPECTO) / n;
          dy = ay / n;
        }
      }
    }
    if (camadaAberta()) { dx = 0; dy = 0; }
    const norma = Math.hypot(dx, dy) || 1;
    const fator = limitar(altura(pos.y) / ALTURA_REF, 0.45, 1.3) * (correndo ? CORRIDA * (caca?.ligeireza ? 1.55 : 1) : 1);
    const desejadoX = (dx / norma) * VEL_X * fator;
    const desejadoY = (dy / norma) * VEL_Y * fator;
    const k = Math.min(1, dt * ACELERACAO);
    vel.x += (desejadoX - vel.x) * k;
    vel.y += (desejadoY - vel.y) * k;
    if (caca) atualizarCaca(agora, dt, correndo);
    desenharRastro(agora);
    if (Math.abs(vel.x) < 0.002 && !dx) vel.x = 0;
    if (Math.abs(vel.y) < 0.002 && !dy) vel.y = 0;
    const antes = { x: pos.x, y: pos.y };
    if (vel.x || vel.y) mover(vel.x * dt, vel.y * dt);
    if (alvo) semProgresso = dist(antes.x, antes.y, pos.x, pos.y) < 0.0004 ? semProgresso + dt : 0;

    const rapidez = Math.hypot(vel.x / VEL_X, vel.y / VEL_Y);
    const andando = rapidez > 0.12;
    if (Math.abs(vel.x) > 0.02) virarPara(vel.x < 0);
    if (andando) paradoDesde = agora;

    // Virar: compressão rápida (a figura estreita e espelha no meio), em vez de espelhar de uma vez.
    if (virando) {
      const t = (agora - virando.t0) / 110;
      if (t >= 1) { virar = virando.para; virando = null; } else {
        virar = t < 0.5 ? -virando.para * (1 - t * 0.9) : virando.para * (0.55 + (t - 0.5) * 0.9);
      }
    }

    // Passada: avança pela distância andada, proporcional ao tamanho do boneco. Ao parar, termina o
    // passo depressa até a pose de pernas juntas mais próxima (há uma em cada metade da passada).
    if (sprite?.url) {
      // Qual folha: andando mais na vertical que na horizontal, frente (para baixo) ou costas (para cima);
      // parado há um tempo, a respiração; senão, o perfil.
      let alvoFolha = sprite;
      if (rapidez > 0.05) {
        const sx = Math.abs(vel.x * mw);
        const sy = Math.abs(vel.y * mh);
        if (sy > sx * 1.15) alvoFolha = (vel.y > 0 ? sprite.frente : sprite.costas) || sprite;
      } else if (agora - paradoDesde > 450 && sprite.respira) {
        alvoFolha = sprite.respira;
      } else if (folha === sprite.frente || folha === sprite.costas) {
        alvoFolha = folha; // termina o passo de frente ou de costas antes de virar de perfil
      }
      usarFolha(alvoFolha);
    }
    if (sprite?.url && folha === sprite.respira) {
      // Respiração: os quadros vão e voltam num ciclo de 3,2 s.
      const t = (agora % 3200) / 3200;
      mostrarFase(Math.round((t < 0.5 ? t * 2 : (1 - t) * 2) * (folha.quadros - 1)));
    } else if (sprite?.url) {
      const n = folha.quadros;
      if (rapidez > 0.05) {
        const andouPx = Math.hypot(vel.x * mw, vel.y * mh * 0.6) * dt;
        const passoPx = (altura(pos.y) * mh * PASSADA * (correndo ? 1.3 : 1)) / n;
        fase += andouPx / Math.max(1, passoPx);
      } else {
        const parado = folha.parado ?? 0;
        const juntas = n % 2 === 0 ? [parado, (parado + n / 2) % n] : [parado];
        const falta = Math.min(...juntas.map((j) => ((j - Math.floor(fase)) % n + n) % n));
        if (falta > 0) fase = Math.floor(fase) + Math.min(falta, (fase % 1) + dt * 16);
      }
      mostrarFase(fase);
    }
    if (andando && agora > proximoPasso) {
      som.passo?.();
      proximoPasso = agora + (correndo ? 250 : 360);
      if (geo.molhado !== false && !document.body.classList.contains('sem-efeitos')) respingar();
    }

    // Personagem: posição no mundo, escala pela perspectiva da pintura, profundidade pelo pé.
    const h = altura(pos.y);
    const s = h / ALTURA_REF;
    boneco.style.transform = `translate3d(${(pos.x * mw).toFixed(1)}px, ${(pos.y * mh).toFixed(1)}px, 0) translate(-50%, -100%) scale(${s.toFixed(3)})`;
    boneco.style.zIndex = String(Math.round(pos.y * 1000));
    boneco.classList.toggle('andando', andando);
    boneco.classList.toggle('correndo', andando && correndo);
    boneco.classList.toggle('parado', agora - paradoDesde > 300);
    boneco.style.setProperty('--virar', virar.toFixed(3));
    boneco.style.setProperty('--inclinar', `${(olhandoEsquerda ? -1 : 1) * Math.min(1.3, rapidez) * (correndo ? 4 : 2.5)}deg`);

    if (recuo) {
      // 300 ms, desacelerando; só onde há chão.
      const k = Math.min(1, (performance.now() - recuo.t0) / 300);
      const alvoK = 1 - (1 - k) ** 2;
      const passo = recuo.dx * (alvoK - recuo.feito);
      recuo.feito = alvoK;
      if (dentro([pos.x + passo, pos.y], geo.chao)) pos.x += passo;
      if (k >= 1) recuo = null;
    }
    atualizarCamera(dt);
    if (conversa && pontoDaConversa) desenharLinha();

    // Balão da voz interior acima da cabeça.
    if (!balao.hidden) {
      balao.style.transform = `translate3d(${(pos.x * mw).toFixed(1)}px, ${((pos.y - h) * mh - 10).toFixed(1)}px, 0) translate(-50%, -100%)`;
      balao.classList.toggle('sumindo', agora > falaAte);
      if (agora > falaAte + 400) {
        balao.hidden = true;
        const expirou = balaoEscolha;
        balaoEscolha = null;
        expirou?.aoExpirar?.();
      }
    }

    if (proximaLuz === 0 || (agora > proximaLuz && (andando || virando))) { iluminar(); proximaLuz = agora + 100; }
    animarVida(agora, dt);

    // Pontos: discretos aparecem de perto; o mais próximo acende. Checagem a cada 120 ms.
    if (agora > proximaChecagem) {
      proximaChecagem = agora + 120;
      cena.classList.toggle('mostrar-tudo', agora < mostrarTudoAte);
      for (const el of camadaPontos.children) {
        const p = lista.find((x) => x.id === el.dataset.ponto);
        if (p?.discreto) el.classList.toggle('revelado', visivel(p, agora));
      }
      const novo = maisPerto(agora);
      if (novo !== perto) {
        perto = novo;
        for (const el of camadaPontos.children) el.classList.toggle('perto', el.dataset.ponto === perto?.id);
        for (const el of camadaContornos.children) el.classList.toggle('aceso', el.dataset.contorno === (pontoDaConversa || perto)?.id);
        dica.hidden = !perto;
        if (perto) dica.innerHTML = toque ? esc(perto.acao || perto.rotulo) : `<kbd>E</kbd> ${esc(perto.acao || perto.rotulo)}`;
      }
      ajustarRotulos(agora);
      checarComentarios();
    }
    requestAnimationFrame(quadro);
  }

  // Linha fina do objeto até a borda da caixa de conversa (a caixa do jogo mais recente na tela).
  const linha = cena.querySelector('.linha-conversa');
  function desenharLinha() {
    const caixa = [...document.querySelectorAll('.dialogo-cena:not(.dialogo-pergunta)')].at(-1);
    if (!caixa) { linha.classList.remove('visivel'); return; }
    const rc = cena.getBoundingClientRect();
    const rd = caixa.getBoundingClientRect();
    const px = cam.x + pontoDaConversa.x * mw * cam.z;
    const py = cam.y + (pontoDaConversa.y - altura(pontoDaConversa.y) * 0.35) * mh * cam.z;
    const esquerda = rd.left - rc.left;
    const direita = rd.right - rc.left;
    const ex = px < esquerda ? esquerda : px > direita ? direita : null;
    if (ex == null) { linha.classList.remove('visivel'); return; }
    const ey = limitar(py, rd.top - rc.top + 24, rd.bottom - rc.top - 24);
    const l = linha.querySelector('line');
    l.setAttribute('x1', px.toFixed(1)); l.setAttribute('y1', py.toFixed(1));
    l.setAttribute('x2', ex.toFixed(1)); l.setAttribute('y2', ey.toFixed(1));
    const c = linha.querySelector('circle');
    c.setAttribute('cx', px.toFixed(1)); c.setAttribute('cy', py.toFixed(1));
    linha.classList.add('visivel');
  }

  // --- Entrada --------------------------------------------------------------------------------------
  function telaParaPintura(cx, cy) {
    const r = cena.getBoundingClientRect();
    return [(cx - r.left - cam.x) / (mw * cam.z), (cy - r.top - cam.y) / (mh * cam.z)];
  }

  function mostrarTudo() { mostrarTudoAte = performance.now() + 2000; proximaChecagem = 0; }

  const aoApertar = (ev) => {
    if (camadaAberta()) {
      if (teclaNaCamada(ev)) ev.preventDefault();
      return;
    }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    const k = ev.key.toLowerCase();
    if (k === 'shift') { teclas.add('shift'); return; }
    if (TECLAS[k]) { teclas.add(k); ev.preventDefault(); return; }
    if (k === 'tab') { ev.preventDefault(); mostrarTudo(); return; }
    if (balaoEscolha && /^[1-3]$/.test(k) && balao.querySelector(`[data-balao="${Number(k) - 1}"]`)) { ev.preventDefault(); responderBalao(Number(k) - 1); return; }
    if (k === 'e' || k === 'enter' || k === ' ') {
      if (perto) { ev.preventDefault(); interagir(perto); }
      return;
    }
    aoTecla?.(ev);
  };
  const aoSoltar = (ev) => teclas.delete(ev.key.toLowerCase());
  const aoPerderFoco = () => teclas.clear();

  // Toque longo (celular) mostra todos os pontos por 2 segundos.
  let pressao = null;
  let ignorarClique = false;
  cena.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('[data-ponto]')) return;
    clearTimeout(pressao);
    const x0 = ev.clientX;
    const y0 = ev.clientY;
    pressao = setTimeout(() => { ignorarClique = true; mostrarTudo(); }, 550);
    const cancelar = (e) => {
      if (e.type === 'pointermove' && Math.hypot(e.clientX - x0, e.clientY - y0) < 10) return;
      clearTimeout(pressao);
      cena.removeEventListener('pointermove', cancelar);
    };
    cena.addEventListener('pointermove', cancelar);
    cena.addEventListener('pointerup', cancelar, { once: true });
  });

  cena.addEventListener('click', (ev) => {
    if (ignorarClique) { ignorarClique = false; return; }
    if (camadaAberta()) return;
    const [px, py] = telaParaPintura(ev.clientX, ev.clientY);
    if (painelCoord) {
      const linha = `[${px.toFixed(3)}, ${py.toFixed(3)}]`;
      console.log('[editar]', linha);
      painelCoord.textContent = `${linha}\n${painelCoord.textContent.split('\n').slice(0, 7).join('\n')}`;
    }
    const botao = ev.target.closest('[data-ponto]');
    if (botao) {
      const p = lista.find((x) => x.id === botao.dataset.ponto);
      if (!p) return;
      if (p === perto || semPersonagem) { interagir(p); return; }
      // A presa da caçada: ele vai até perto dela (correndo, se longe), parando fora do campo dela,
      // e a pergunta da abordagem abre ali.
      if (p.tipo === 'presa' && !p.alvo) {
        const d = dist(p.x, p.y, pos.x, pos.y);
        if (d < 0.3) { interagir(p); return; }
        const k = 0.22 / d;
        const [x, y] = maisPertoDentro([p.x + (pos.x - p.x) * k, p.y + (pos.y - p.y) * k], geo.chao, ASPECTO);
        alvo = { x, y, ponto: p, aproximar: true, correr: Math.abs(x - pos.x) * mw * cam.z > vw * 0.4 };
        virarPara(x < pos.x);
        esperaAte = performance.now() + (reduzido() ? 0 : 80);
        semProgresso = 0;
        return;
      }
      const [x, y] = p.parada && dentro(p.parada, geo.chao) ? p.parada : maisPertoDentro([p.x, p.y], geo.chao, ASPECTO);
      // Longe (mais de 40% da largura da tela): vai correndo. Vira para o destino e sai 80 ms depois.
      const longe = Math.abs(x - pos.x) * mw * cam.z > vw * 0.4;
      alvo = { x, y, ponto: p, correr: longe };
      virarPara(x < pos.x);
      esperaAte = performance.now() + (reduzido() ? 0 : 80);
      semProgresso = 0;
      return;
    }
    // Clique no chão: anda até lá (fora do chão, até o ponto de chão mais perto).
    if (semPersonagem) return;
    const [x, y] = maisPertoDentro([px, py], geo.chao, ASPECTO);
    alvo = { x, y, correr: Math.abs(x - pos.x) * mw * cam.z > vw * 0.4 };
    virarPara(x < pos.x);
    esperaAte = performance.now() + (reduzido() ? 0 : 80);
    semProgresso = 0;
  });
  cena.addEventListener('dblclick', () => { if (alvo) alvo.correr = true; });

  document.addEventListener('keydown', aoApertar);
  document.addEventListener('keyup', aoSoltar);
  window.addEventListener('blur', aoPerderFoco);

  // A caixa de conversa abre do lado oposto ao personagem, e a câmera aproxima enquanto ela está aberta.
  const ladoLivre = () => (cam.x + pos.x * mw * cam.z > vw / 2 ? 'esquerda' : 'direita');
  const desregistrar = registrarCena({
    lado: ladoLivre,
    conversa: (aberta) => {
      if (aberta && !conversa) ladoDialogo = ladoLivre();
      if (!aberta && conversa && pontoDaConversa) {
        // Ao fechar: endireita e dá meio passo para trás, sem virar de costas.
        const dx = (pontoDaConversa.x < pos.x ? 1 : -1) * 0.012;
        recuo = { dx, feito: 0, t0: performance.now() };
        boneco.classList.remove('inclinado');
        pontoDaConversa = null;
        linha.classList.remove('visivel');
        for (const el of camadaContornos.children) el.classList.remove('aceso');
      }
      conversa = aberta;
      document.body.classList.toggle('em-conversa', aberta);
      som.abafar?.(aberta);
      if (aberta) { balao.hidden = true; falaAte = 0; }
    },
  });

  function desmontar() {
    if (!vivo) return;
    vivo = false;
    window.removeEventListener('resize', medir);
    document.removeEventListener('keydown', aoApertar);
    document.removeEventListener('keyup', aoSoltar);
    window.removeEventListener('blur', aoPerderFoco);
    if (desregistrar()) document.body.classList.remove('em-conversa');
  }

  lista = pontos;
  lista.forEach((p) => { if (p.feito) feitosAntes.add(p.id); });
  desenharPontos();
  setTimeout(() => { if (vivo && !camadaAberta()) apresentar(3000); }, 500);
  mostrarFase(fase);
  requestAnimationFrame(quadro);

  return {
    atualizarPontos(novos) {
      const recem = new Set(novos.filter((p) => p.feito && !feitosAntes.has(p.id)).map((p) => p.id));
      feitosAntes.clear();
      novos.forEach((p) => { if (p.feito) feitosAntes.add(p.id); });
      lista = novos;
      desenharPontos(recem);
    },
    posicao: () => ({ ...pos }),
    falar,
    perguntarNoBalao,
    apresentar,
    iniciarFurtividade,
    usarPoder,
    emFurtividade: () => !!caca,
    // Anda até um ponto (de frente, na caçada: ele vai direto até a presa).
    irAte: (p) => {
      const [x, y] = p.parada && dentro(p.parada, geo.chao) ? p.parada : maisPertoDentro([p.x, p.y], geo.chao, ASPECTO);
      alvo = { x, y, correr: Math.abs(x - pos.x) * mw * cam.z > vw * 0.4 };
      virarPara(x < pos.x);
      semProgresso = 0;
    },
    cancelarFurtividade: () => { if (caca) { caca.aoFim = null; encerrarFurtividade(false); } },
    desmontar,
  };
}
