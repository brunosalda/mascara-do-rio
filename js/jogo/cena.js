// Motor da cena: o personagem anda sobre a pintura do lugar (WASD, setas ou clique; Shift ou clique
// duplo para correr), só onde há chão pintado, passa atrás dos objetos da frente, recebe a luz do
// lugar e interage com os pontos (E, Enter ou clique). Pintura, objetos, pontos e personagem ficam
// num mesmo "mundo" do tamanho da pintura, que a câmera move e aproxima nas conversas.
// A geografia de cada pintura (chão, perspectiva, objetos, luzes) está em lugares.js.

import { camadaAberta, teclaNaCamada, registrarCena } from './camadas.js';
import { som } from '../ambiente.js';
import { esc, grupoVoz } from '../ui.js';
import { TIPOS_GENTE, figuraGente, FIGURAS_GENTE } from './gente.js';
import { geografia, dentro as dentroPoligono, maisPertoDentro } from './lugares.js';
import { cerimoniasCurtas } from '../leitura.js';
import { pinturaLeve, figuraLeve } from './imagens.js';

let ASPECTO = 1344 / 752;       // proporção da pintura (a vista do alto em 21:9 troca ao montar)
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
const ZOOM_ALTO = 1.55;          // vista do alto: a área é maior que a tela e a câmera rola por ela
const ZOOM_ALTO_CELULAR = 1.15;
const VEL_CAMERA = 900;          // px por segundo, com setas ou na borda da tela
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
    <div class="personagem com-sprite${sprite.respira?.url ? ' com-respiracao' : ''}${sprite.frente?.url && sprite.costas?.url ? '' : ' sem-folhas'}" style="${vars}">
      <span class="sombra-pe"></span>
      <span class="circulo-escolhido" aria-hidden="true"></span>
      <span class="sprite reflexo" style="${folha}"></span>
      <span class="sprite corpo-sprite" style="${folha}"></span>
      <span class="sprite tinta" style="${mascara}"></span>
    </div>`;
}

// Rodada 36: o que se mexe sozinho nas pinturas de foto (vivos-alto.js) e o brilho que tremula na poça
// embaixo de cada luz pequena. Tudo com transform e opacity, num atraso diferente para cada um.
function htmlVivos(geo) {
  const p = (v) => `${(v * 100).toFixed(2)}%`;
  const vivos = (geo.vivos || []).map((v, i) => {
    const atraso = `animation-delay:${(-i * 2.3).toFixed(1)}s`;
    if (v.tipo === 'veiculo') {
      const [x0, y0] = v.de; const [x1, y1] = v.ate;
      return `<span class="vivo vivo-veiculo" style="left:${p(x0)};top:${p(y0)};--dx:${((x1 - x0) * 100).toFixed(2)}cqw;--dy:${((y1 - y0) * 100).toFixed(2)}cqh;--cor:${v.cor || '#fff0c0'};animation-duration:${v.dur || 30}s;${atraso}"></span>`;
    }
    const caixa = v.w ? `width:${p(v.w)};height:${p(v.h || v.w * 0.2)};` : '';
    return `<span class="vivo vivo-${v.tipo}" style="left:${p(v.x)};top:${p(v.y)};${caixa}${v.cor ? `--cor:${v.cor};` : ''}${atraso}"></span>`;
  });
  const pocas = geo.luzes.filter((l) => l.raio < 0.5 && l.y < 0.93).slice(0, 6)
    .map((l, i) => `<span class="vivo vivo-poca" style="left:${p(l.x)};top:${p(Math.min(0.97, l.y + 0.06))};--cor:${l.cor};animation-delay:${(-i * 0.9).toFixed(1)}s"></span>`);
  return `<div class="vivos" aria-hidden="true">${vivos.join('')}${pocas.join('')}</div>`;
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
  nome = '', nevoa = false, nevoaLonge = false, temPedido = null, ajudado = null, fome = 0, rastros = [], recados = [], nitido = false, painel = null, aoFalar = null, aoMostrarTudo = null, aoPausa = null, aoPresaVai = null, aoPoderAcabou = null,
  // Caso (formato v3): a gente da área com nome próprio, figura e falas do caso, no lugar da gente do lugar.
  gente: genteDoCaso = null,
  // Rodada 46: no caso, a gente maior e a câmera mais perto. figuras multiplica a altura de todas as figuras
  // (personagem, gente, pontos, caçada); niveis são os 3 zooms da câmera (começa no do meio), mesmo se a pintura
  // for pequena.
  aproximar = null,
} = {}) {
  const geo = geografia(lugar);
  ASPECTO = geo.aspecto || 1344 / 752;
  imagem = pinturaLeve(imagem);
  // Obstáculos dentro do chão (o VLT parado no Centro): o ponto no chão só vale fora deles.
  const dentro = (q, pol) => dentroPoligono(q, pol) && !(pol === geo.chao && (geo.obstaculos || []).some((o) => dentroPoligono(q, o)));
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
        <div class="pintura-cinza" style="background-image:url('${fundoUrl}')" aria-hidden="true"></div>
        ${geo.luzes.map((l, i) => (l.raio < 0.5 ? `<span class="brilho-luz${l.falha ? ' com-falha' : ''}" data-luz="${i}" style="left:${pct(l.x)};top:${pct(l.y)};--cor:${l.cor};--raio:${l.raio};animation-delay:${(-i * 1.7).toFixed(1)}s"></span>` : '')).join('')}
        ${geo.alto ? htmlVivos(geo) : ''}
        <div class="nevoa-cena" aria-hidden="true"></div>
        <canvas class="veu-area" aria-hidden="true" hidden></canvas>
        <canvas class="veu-longe" aria-hidden="true" hidden></canvas>
        ${geo.vida?.farois ? `<div class="farol" style="top:${pct(geo.vida.farois.y0)};height:${pct(geo.vida.farois.y1 - geo.vida.farois.y0)}"></div>` : ''}
        ${geo.vida?.passantes?.length ? `<span class="passante vulto" hidden>${VULTO}</span>` : ''}
        ${geo.frente.map((f) => `<div class="frente" style="background-image:url('${fundoUrl}');clip-path:polygon(${f.poligono.map(([x, y]) => `${pct(x)} ${pct(y)}`).join(',')});z-index:${Math.round(f.base * 1000)}"></div>`).join('')}
        ${htmlBoneco(sprite)}
        <svg class="contornos" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"></svg>
        <svg class="rastro" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><polyline points=""/></svg>
        <canvas class="sombra-caca" aria-hidden="true"></canvas>
        <svg class="campo-presa" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><path d=""/></svg>
        <div class="balao-voz" hidden></div>
        <div class="fala-passagem" hidden></div>
        <svg class="fio-escolha" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><line pathLength="1" x1="0" y1="0" x2="0" y2="0"/></svg>
        <span class="marca-destino" aria-hidden="true" hidden></span>
        <div class="cena-pontos"></div>
        ${depurar ? htmlDepuracao(geo) : ''}
      </div>
      <svg class="linha-conversa" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0"/><circle r="3.5" cx="0" cy="0"/></svg>
      <div class="dica-interagir" hidden></div>
      <div class="atencao-rua" hidden role="status"><span class="olho" aria-hidden="true"></span><span class="palavras"></span><span class="poderes-ativos"></span><button type="button" class="caca-ajuda" data-caca-ajuda aria-label="Como funciona a caçada">?</button><button type="button" class="caca-sair" data-caca-desistir>Desistir</button></div>
      <button type="button" class="borda-saida" hidden><span class="borda-destino"></span></button>
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
  // Medidor (só no ?depurar / ?editar, também nas demonstrações): quadros por segundo, o pior quadro,
  // o custo do laço em ms e o número de elementos da página.
  const medidor = painelCoord || /[?&]depurar\b/.test(location.hash) ? document.createElement('div') : null;
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

  const aumento = aproximar?.figuras || 1;
  const altura = (y) => Math.max(0.05, geo.k * (y - geo.horizonte)) * aumento;
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
  let focoBeijo = null;      // o Beijo: a câmera fecha no par
  let esperaAte = 0;         // antecipação: vira para o destino e só então sai (80 ms)
  let ritmo = 1;             // caso (perseguição): multiplica a velocidade (tropeço, arrancada)
  let correrSempre = false;  // caso (perseguição): corre sem Shift
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
      <button type="button" class="ponto ponto-${p.tipo || 'acao'}${p.feito ? ' feito' : ''}${p.discreto ? ' discreto' : ''}${p.visto ? ' visto' : ''}${p.alternativa ? ' alternativa' : ''}${p.falta ? ' falta' : ''}${recemFeitos.has(p.id) ? ' recem-feito' : ''}${p.vantagem ? ' vantagem' : ''}${p.brasa ? ` brasa-${p.brasa}` : ''}${p.porta ? ' ponto-porta' : ''}"${p.temperamento ? ` data-temperamento="${p.temperamento}"` : ''} data-ponto="${esc(p.id)}"
        style="left:${pct(p.x)};top:${pct(p.y)};--escala:${escalaPonto(p.y)}">
        <span class="ponto-luz" aria-hidden="true"></span>
        <span class="ponto-faiscas" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span class="ponto-contorno" aria-hidden="true"></span>
        <span class="ponto-rotulo">${/^\d$/.test(p.icone || '') ? `${p.icone} · ` : ''}${esc(p.rotulo)}${p.estado ? `<small class="ponto-estado">${esc(p.estado)}</small>` : ''}</span>
      </button>`).join('');
    camadaContornos.innerHTML = lista.filter((p) => p.contorno?.length).map((p) =>
      `<polygon data-contorno="${esc(p.id)}" points="${p.contorno.map(([x, y]) => `${x},${y}`).join(' ')}"/>`).join('');
    perto = null;
    proximaChecagem = 0;
    prepararBorda?.();
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
    // No caso, a gente da área também responde ao E (na noite, só ao clique).
    if (genteDoCaso) {
      for (const p of gente) {
        if (p.escondida || p.fugindo) continue;
        const d = dist(p.x, p.y, pos.x, pos.y);
        if (d < menor) { menor = d; melhor = p; }
      }
    }
    return menor <= alcanceEm(pos.y) * (melhor?.tipo === 'pessoa' ? 1.4 : 1) ? melhor : null;
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
    aoFalar?.(voz, texto);
    // Uma pergunta no balão esperando resposta não é coberta por outra fala.
    if (balaoEscolha && performance.now() < balaoEscolha.ate && !balaoEscolha.noPainel) return;
    balao.className = `balao-voz voz-${grupoVoz(voz)}`;
    balao.innerHTML = `<b>${esc(voz)}</b> ${esc(texto)}`;
    // A fala flutua e sobe de novo a cada fala (reinicia a animação).
    balao.style.animation = 'none';
    void balao.offsetWidth;
    balao.style.animation = '';
    balao.hidden = false;
    falaAte = performance.now() + ms;
    som.voz?.();
  }

  // Pergunta pequena no balão junto da cabeça ("1 · Olhar mais de perto · 2 · Seguir em frente"),
  // respondida com 1 ou 2 (ou clique) sem parar de andar; some em 6 s.
  // Com os painéis à mostra (rodada 25), a pergunta abre no painel de baixo, como as respostas de um
  // diálogo; o balão junto da cabeça fica para as falas.
  const painelVisivel = () => !!painel?.parentElement && painel.parentElement.offsetParent !== null;
  function caixaDaPergunta() { return balaoEscolha?.noPainel ? painel : balao; }
  function limparPainel() { if (painel) { painel.innerHTML = ''; painel.classList.remove('com-pergunta'); } }
  // Rodada 44: uma opção que vira ação curta termina em "§curta" e ganha a etiqueta pequena "ação curta".
  const rotuloOpcao = (o) => (String(o).endsWith('§curta') ? `${esc(String(o).slice(0, -6).trim())} <small class="etiqueta-curta">ação curta</small>` : esc(o));
  function perguntarNoBalao({ voz, texto, opcoes, aoEscolher, aoExpirar, aoCancelar, perto: pertoDe = null, ms = 6000 }) {
    if (painelVisivel()) {
      const prazoP = ms < 1e8 ? `<span class="balao-prazo" style="animation-duration:${ms}ms"></span>` : '';
      painel.className = `painel-pergunta com-pergunta voz-${grupoVoz(voz)}`;
      painel.innerHTML = `<p class="painel-quem"><b>${esc(voz)}</b> <span class="balao-texto">${esc(texto)}</span></p><ol class="painel-respostas">${opcoes.map((o, i) => `<li><button type="button" data-balao="${i}"><span class="escolha-num">${i + 1}.</span> ${rotuloOpcao(o)}</button></li>`).join('')}</ol>${prazoP}`;
      falaAte = performance.now() + Math.min(ms, 1e9);
      balao.hidden = true;
      balaoEscolha = { aoEscolher, aoExpirar, aoCancelar, pertoDe, ate: falaAte, desde: performance.now(), noPainel: true };
      som.voz?.();
      return;
    }
    balao.className = `balao-voz balao-escolha voz-${grupoVoz(voz)}`;
    // Balão com prazo mostra o prazo: uma linha fina que se esvazia embaixo das escolhas.
    const prazo = ms < 1e8 ? `<span class="balao-prazo" style="animation-duration:${ms}ms"></span>` : '';
    balao.innerHTML = `<b>${esc(voz)}</b> <span class="balao-texto">${esc(texto)}</span><span class="balao-opcoes">${opcoes.map((o, i) => `<button type="button" data-balao="${i}">${i + 1} · ${rotuloOpcao(o)}</button>`).join('')}</span>${prazo}`;
    balao.hidden = false;
    falaAte = performance.now() + ms;
    // Os primeiros 400 ms não contam: o clique que escolheu a presa (ou um duplo clique) não pode
    // responder sozinho a pergunta que acabou de abrir embaixo do cursor.
    balaoEscolha = { aoEscolher, aoExpirar, aoCancelar, pertoDe, ate: falaAte, desde: performance.now() };
    som.voz?.();
  }
  function cancelarBalao(porque) {
    if (!balaoEscolha) return;
    const { aoCancelar } = balaoEscolha;
    if (balaoEscolha.noPainel) limparPainel();
    balaoEscolha = null;
    falaAte = performance.now();
    aoCancelar?.(porque);
  }
  function responderBalao(i) {
    if (!balaoEscolha || performance.now() - balaoEscolha.desde < 400) return;
    const { aoEscolher, noPainel } = balaoEscolha;
    if (noPainel) limparPainel();
    balaoEscolha = null;
    falaAte = performance.now();
    som.toque?.();
    aoEscolher?.(i);
  }
  const cliqueResposta = (ev) => {
    const b = ev.target.closest('[data-balao]');
    if (b) { ev.stopPropagation(); responderBalao(Number(b.dataset.balao)); }
  };
  balao.addEventListener('click', cliqueResposta);
  painel?.addEventListener('click', cliqueResposta);

  // --- Câmera livre da vista do alto (Fase 2) -----------------------------------------------------------
  const camLivre = { x: 0, y: 0, vx: 0, vy: 0, centrar: false, suave: false, arrastando: false, setas: new Set(), borda: { x: 0, y: 0 } };
  function atualizarVelCamera() {
    let vx = camLivre.borda.x;
    let vy = camLivre.borda.y;
    if (camLivre.setas.has('arrowleft')) vx += 1;
    if (camLivre.setas.has('arrowright')) vx -= 1;
    if (camLivre.setas.has('arrowup')) vy += 1;
    if (camLivre.setas.has('arrowdown')) vy -= 1;
    camLivre.vx = limitar(vx, -1, 1) * VEL_CAMERA;
    camLivre.vy = limitar(vy, -1, 1) * VEL_CAMERA;
    if (vx || vy) camLivre.suave = false;
  }
  function centrarCamera() { camLivre.centrar = true; }
  // Caso (formato v3): leva a câmera livre até um ponto da pintura (x, y de 0 a 1), com deslize.
  function olharPara(x, y) {
    const z = geo.alto ? nivelZoom() : cam.z;
    const W = mw * z;
    const H = mh * z;
    camLivre.x = limitar(vw * 0.5 - x * W, vw - W, 0);
    camLivre.y = limitar(vh * 0.55 - y * H, vh - H, 0);
    camLivre.suave = true;
    camLivre.centrar = false;
  }
  // Setas das bordas: tocar rola a câmera mais de meia tela para aquele lado.
  const bordaMais = {};
  for (const lado of ['esq', 'dir']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `borda-mais borda-mais-${lado}`;
    b.hidden = true;
    b.setAttribute('aria-label', lado === 'esq' ? 'Ver mais à esquerda' : 'Ver mais à direita');
    b.innerHTML = lado === 'esq' ? '‹' : '›';
    b.addEventListener('click', (ev) => { ev.stopPropagation(); camLivre.x += (lado === 'esq' ? 1 : -1) * vw * 0.6; camLivre.suave = true; });
    cena.appendChild(b);
    bordaMais[lado] = b;
  }
  // Visão geral: a pintura inteira de uma vez, com o personagem, a gente, os pontos à vista e o trecho que
  // está na tela. Tocar num lugar leva a câmera até lá.
  function visaoGeral() {
    if (!geo.alto || cena.querySelector('.visao-geral')) return;
    const W = mw * cam.z; const H = mh * cam.z;
    const marca = (x, y, classe, titulo = '') => `<i class="${classe}" style="left:${pct(x)};top:${pct(y)}"${titulo ? ` title="${esc(titulo)}"` : ''}></i>`;
    const vista = { x: -camLivre.x / W, y: -camLivre.y / H, w: vw / W, h: vh / H };
    const el = document.createElement('div');
    el.className = 'visao-geral';
    el.innerHTML = `<div class="vg-caixa" role="dialog" aria-label="Visão geral">
        <header><b class="placa-bronze">Visão geral</b><button type="button" class="vg-fechar" aria-label="Fechar">✕</button></header>
        <div class="vg-mapa" style="background-image:url('${fundoUrl}');aspect-ratio:${ASPECTO}">
          <span class="vg-vista" style="left:${pct(vista.x)};top:${pct(vista.y)};width:${pct(vista.w)};height:${pct(vista.h)}"></span>
          ${gente.map((p) => marca(p.x, p.y, 'vg-pessoa', p.rotulo)).join('')}
          ${lista.filter((p) => !p.discreto && p.tipo !== 'detalhe').map((p) => marca(p.x, p.y, `vg-ponto vg-${p.tipo}`, p.rotulo)).join('')}
          ${marca(pos.x, pos.y, 'vg-eu', 'Você')}
        </div>
        <p class="vg-legenda"><i class="vg-eu"></i> você <i class="vg-pessoa"></i> gente <i class="vg-ponto"></i> o que fazer · Toque num lugar para ir com a câmera até lá.</p>
      </div>`;
    cena.appendChild(el);
    const fechar = () => el.remove();
    el.querySelector('.vg-fechar').addEventListener('click', (ev) => { ev.stopPropagation(); fechar(); });
    el.addEventListener('click', (ev) => { if (ev.target === el) fechar(); ev.stopPropagation(); });
    el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    el.querySelector('.vg-mapa').addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = ev.currentTarget.getBoundingClientRect();
      const fx = (ev.clientX - r.left) / r.width; const fy = (ev.clientY - r.top) / r.height;
      camLivre.x = limitar(vw / 2 - fx * W, vw - W, 0);
      camLivre.y = limitar(vh / 2 - fy * H, vh - H, 0);
      camLivre.suave = true;
      fechar();
    });
  }
  // Zoom em três degraus (rodada 32): da área toda até perto, sem nunca mostrar a pintura maior que
  // 1,35 vez o tamanho original (o aumento feito no computador não cria detalhe novo).
  camLivre.nivel = 1;
  function niveisZoom() {
    if (aproximar?.niveis) return aproximar.niveis;
    const zMax = Math.max(1, Math.min(1.6, (1.35 * 1344) / Math.max(1, mw)));
    return [1, (1 + zMax) / 2, zMax];
  }
  function nivelZoom() { return niveisZoom()[camLivre.nivel]; }
  function mudarZoom(passo) {
    const novo = limitar(camLivre.nivel + passo, 0, 2);
    if (novo === camLivre.nivel) return;
    // Mantém o ponto do meio da tela no lugar ao aproximar ou afastar.
    const wx = (vw / 2 - cam.x) / cam.z;
    const wy = (vh / 2 - cam.y) / cam.z;
    camLivre.nivel = novo;
    const z = nivelZoom();
    camLivre.x = vw / 2 - wx * z;
    camLivre.y = vh / 2 - wy * z;
    camLivre.suave = true;
  }
  if (geo.alto) {
    cena.classList.add('vista-alto');
    // Borda da tela (só mouse): perto da borda, a câmera rola para aquele lado.
    cena.addEventListener('pointermove', (ev) => {
      if (ev.pointerType !== 'mouse') return;
      const r = cena.getBoundingClientRect();
      const m = 28;
      const bx = ev.clientX - r.left < m ? 1 : r.right - ev.clientX < m ? -1 : 0;
      const by = ev.clientY - r.top < m ? 1 : r.bottom - ev.clientY < m ? -1 : 0;
      if (bx !== camLivre.borda.x || by !== camLivre.borda.y) { camLivre.borda = { x: bx, y: by }; atualizarVelCamera(); }
      cena.classList.toggle('rolando-borda', !!(bx || by));
    });
    cena.addEventListener('pointerleave', () => { camLivre.borda = { x: 0, y: 0 }; atualizarVelCamera(); cena.classList.remove('rolando-borda'); });
    // Arrastar: com o mouse (botão apertado) ou com um dedo (celular, ordem de 17/10), mais de 8 px (10 no
    // toque) rola a área, e o toque ou clique que soltou não anda. No dedo, a câmera segue com inércia.
    // Toque curto anda ou interage (o clique normal); dois dedos dão zoom (abaixo); toque duplo centraliza.
    const dedos = new Map();
    let inercia = 0;
    let ultimoToque = { t: 0, x: 0, y: 0 };
    cena.addEventListener('pointerdown', (ev) => {
      const toque = ev.pointerType === 'touch';
      if (!toque && ev.button !== 0 && ev.button !== 2) return;
      // No dedo, o arrasto pode começar em cima de um ponto ou de uma pessoa (deitado, os rótulos cobrem
      // boa parte da cena); se o dedo não se mexer, vale o toque normal no ponto.
      const noMundo = ev.target.closest('[data-ponto], .pessoa, .recado-marca');
      if (ev.target.closest('button, a, input, textarea, .balao-voz, .painel-pergunta') && !(toque && noMundo)) return;
      if (!toque && noMundo) return;
      cancelAnimationFrame(inercia);
      if (toque) {
        // Toque duplo (dois toques rápidos no mesmo lugar) centraliza no personagem.
        const agora = performance.now();
        if (agora - ultimoToque.t < 320 && Math.hypot(ev.clientX - ultimoToque.x, ev.clientY - ultimoToque.y) < 30) { camLivre.centrar = true; ultimoToque.t = 0; }
        else ultimoToque = { t: agora, x: ev.clientX, y: ev.clientY };
      }
      const limiar = toque ? 10 : 8;
      const x0 = ev.clientX; const y0 = ev.clientY; const c0 = { x: camLivre.x, y: camLivre.y };
      let rastro = [{ x: ev.clientX, y: ev.clientY, t: performance.now() }];
      const mover = (e) => {
        if (e.pointerId !== ev.pointerId || dedos.size >= 2) return;
        if (!camLivre.arrastando && Math.hypot(e.clientX - x0, e.clientY - y0) < limiar) return;
        camLivre.arrastando = true;
        camLivre.suave = false;
        cena.classList.add('arrastando');
        camLivre.x = c0.x + (e.clientX - x0);
        camLivre.y = c0.y + (e.clientY - y0);
        rastro.push({ x: e.clientX, y: e.clientY, t: performance.now() });
        if (rastro.length > 6) rastro.shift();
      };
      const soltar = (e) => {
        if (e && e.pointerId !== ev.pointerId) return;
        cena.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);
        window.removeEventListener('pointercancel', soltar);
        const arrastou = camLivre.arrastando;
        if (e && e.type === 'pointerup' && Math.hypot(e.clientX - x0, e.clientY - y0) >= limiar) mover(e);
        if (arrastou) { ignorarClique = true; setTimeout(() => { ignorarClique = false; }, 0); }
        camLivre.arrastando = false;
        cena.classList.remove('arrastando');
        // Inércia no dedo: a câmera continua um pouco na direção do arrasto e para devagar.
        if (toque && arrastou && !reduzido() && rastro.length > 1) {
          const a = rastro[0]; const z = rastro.at(-1); const dt = Math.max(16, z.t - a.t);
          let vx = ((z.x - a.x) / dt) * 16; let vy = ((z.y - a.y) / dt) * 16;
          const passo = () => {
            vx *= 0.92; vy *= 0.92;
            if (Math.hypot(vx, vy) < 0.4 || camLivre.arrastando) return;
            camLivre.x += vx; camLivre.y += vy;
            inercia = requestAnimationFrame(passo);
          };
          inercia = requestAnimationFrame(passo);
        }
      };
      cena.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
      window.addEventListener('pointercancel', soltar);
    });
    // Roda do mouse: aproxima e afasta em degraus.
    let rodaAte = 0;
    cena.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      if (performance.now() < rodaAte) return;
      rodaAte = performance.now() + 220;
      mudarZoom(ev.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    // Botão direito arrasta (sem abrir o menu do navegador).
    cena.addEventListener('contextmenu', (ev) => ev.preventDefault());
    // Celular: dois dedos dão zoom (pinça) e também rolam a área.
    let doisDedos = null;
    cena.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType !== 'touch') return;
      dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (dedos.size === 2) {
        const [a, b] = [...dedos.values()];
        doisDedos = { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cx: camLivre.x, cy: camLivre.y, d: Math.hypot(a.x - b.x, a.y - b.y) };
        camLivre.arrastando = true;
      }
    });
    cena.addEventListener('pointermove', (ev) => {
      if (ev.pointerType !== 'touch' || !dedos.has(ev.pointerId)) return;
      dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (doisDedos && dedos.size === 2) {
        const [a, b] = [...dedos.values()];
        // Pinça: abrir os dedos aproxima, fechar afasta (em degraus); senão, os dois dedos rolam.
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > doisDedos.d * 1.25 || d < doisDedos.d * 0.8) {
          mudarZoom(d > doisDedos.d ? 1 : -1);
          doisDedos = { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cx: camLivre.x, cy: camLivre.y, d };
          return;
        }
        camLivre.x = doisDedos.cx + ((a.x + b.x) / 2 - doisDedos.mx);
        camLivre.y = doisDedos.cy + ((a.y + b.y) / 2 - doisDedos.my);
      }
    });
    const tirarDedo = (ev) => {
      if (ev.pointerType !== 'touch') return;
      dedos.delete(ev.pointerId);
      if (doisDedos && dedos.size < 2) { doisDedos = null; camLivre.arrastando = false; ignorarClique = true; setTimeout(() => { ignorarClique = false; }, 300); }
    };
    cena.addEventListener('pointerup', tirarDedo);
    cena.addEventListener('pointercancel', tirarDedo);
  }
  // Desvio simples: se a linha reta até o destino sai do chão, passa por um canto do chão (puxado um
  // pouco para dentro) de onde as duas retas ficam no chão.
  const retaNoChao = (a, b) => { for (let i = 1; i < 12; i++) { const t = i / 12; if (!dentro([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], geo.chao)) return false; } return true; };
  const centroChao = geo.chao.reduce((c, q) => [c[0] + q[0] / geo.chao.length, c[1] + q[1] / geo.chao.length], [0, 0]);
  const cantos = [
    ...geo.chao.map(([x, y]) => [x + (centroChao[0] - x) * 0.08, y + (centroChao[1] - y) * 0.08]),
    // Em volta de cada obstáculo, pontos um pouco para fora dos cantos dele.
    ...(geo.obstaculos || []).flatMap((o) => { const c = o.reduce((a, q) => [a[0] + q[0] / o.length, a[1] + q[1] / o.length], [0, 0]); return o.map(([x, y]) => [x + (x - c[0]) * 0.6, y + (y - c[1]) * 0.6]); }),
  ].filter((q) => dentro(q, geo.chao));
  function caminho(de, ate) {
    if (retaNoChao(de, ate)) return [];
    let melhor = null;
    let menor = Infinity;
    for (const q of cantos) {
      if (!retaNoChao(de, q) || !retaNoChao(q, ate)) continue;
      const d = dist(de[0], de[1], q[0], q[1]) + dist(q[0], q[1], ate[0], ate[1]);
      if (d < menor) { menor = d; melhor = q; }
    }
    return melhor ? [melhor] : [];
  }

  // --- Gente da área (Fase 2) ---------------------------------------------------------------------
  // Figuras provisórias paradas ou andando devagar. Clicar leva o personagem até a pessoa e abre a
  // conversa (ou, na caçada, a escolha da presa), pelo aoInteragir com tipo 'pessoa'.
  const gente = (genteDoCaso || geo.gente || []).map((g, i) => {
    const t = TIPOS_GENTE[g.tipo];
    const nomeP = g.nome || t?.nome || g.tipo;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `pessoa pessoa-${g.tipo}`;
    el.setAttribute('aria-label', g.nome ? `${g.nome}${g.sub ? `, ${g.sub}` : ''}` : (t?.rotulo || g.tipo));
    el.title = nomeP;
    const figuras = FIGURAS_GENTE[g.tipo];
    const figura = g.figura || (figuras ? figuras[i % figuras.length] : null);
    // Tab mostra o nome do tipo e o estado em palavras (como as presas).
    const ESTADOS_GENTE = ['distraído', 'com pressa', 'cansado', 'olhando o celular', 'esperando alguém', 'sozinho'];
    const estado = ESTADOS_GENTE[(i * 7 + g.tipo.length) % ESTADOS_GENTE.length];
    // Integração na pintura (ordem do Bruno): sombra de contato, reflexo invertido no chão molhado, e a
    // figura tingida pela cor e pelo brilho da pintura em volta dos pés (amostrados quando a pintura carrega).
    const src = figura ? figuraLeve(`img/gente/${figura}.png`) : '';
    el.innerHTML = `<span class="pessoa-sombra" aria-hidden="true"></span><span class="pessoa-circulo" aria-hidden="true"></span>${figura
      ? `<span class="pessoa-reflexo" aria-hidden="true"><img src="${src}" alt="" draggable="false"></span><span class="pessoa-figura"><img src="${src}" alt="" draggable="false"><span class="pessoa-tinta" style="-webkit-mask-image:url('${src}');mask-image:url('${src}')"></span><span class="pessoa-preto" style="-webkit-mask-image:url('${src}');mask-image:url('${src}')"></span><span class="pessoa-lado" style="-webkit-mask-image:url('${src}');mask-image:url('${src}')"></span><span class="pessoa-grao" style="-webkit-mask-image:url('${src}');mask-image:url('${src}')"></span></span>`
      : figuraGente(g.tipo)}<span class="pessoa-nome">${esc(nomeP)}<small>${esc(g.sub ?? (temPedido?.(g.tipo) ? 'tem um pedido' : estado))}</small></span>`;
    el.style.setProperty('--atraso', `${(-i * 1.37).toFixed(2)}s`);
    if (figura) {
      el.classList.add('pessoa-pintada');
      // Antes de amostrar a pintura: brilho pelas luzes marcadas do lugar.
      const luz = luzEm(g.x, g.y);
      el.style.setProperty('--luz-gente', (0.72 + Math.min(1, luz) * 0.5).toFixed(2));
    }
    mundo.appendChild(el);
    const p = { id: g.id ? `pessoa-${g.id}` : `pessoa-${i}`, tipo: 'pessoa', tipoGente: g.tipo, x: g.x, y: g.y, rotulo: nomeP, acao: `Falar com: ${nomeP}`, anda: figura ? null : g.anda, dir: g.dir || ((i % 2) ? -1 : 1), el, parado: 0, caso: genteDoCaso ? g : null, falas: g.falas || null };
    return p;
  });
  // Rodada 39: rastros de quem passou por aqui nesta noite (só o nome das ruas e o clã aparente) e
  // recados deixados nos pontos. Com Auspícios, os rastros ficam nítidos e dizem há quanto tempo.
  // Rodada 40: o rastro fica num ponto de passagem (porta, calçada, beco, esquina), nunca no meio do largo,
  // e some devagar ao longo da noite: mais nítido se a pessoa passou há pouco (r.minutos).
  const PASSAGEM = /calcada|beco|esquina|porta|escada|ponto|parada|mureta/;
  const pontosDePassagem = Object.entries(geo.ancoras || {}).filter(([nome, a]) => a.porta || PASSAGEM.test(nome)).map(([, a]) => a);
  function ondePassou(r, i) {
    if (!pontosDePassagem.length) return [r.x, r.y];
    const perto = pontosDePassagem.slice().sort((a, b) => dist(a.x, a.y, r.x, r.y) - dist(b.x, b.y, r.x, r.y))[i % Math.min(2, pontosDePassagem.length)];
    let x = perto.x + (i % 2 ? 0.025 : -0.025);
    const y = perto.y;
    if (gente.some((g) => dist(g.x, g.y, x, y) < 0.03)) x += i % 2 ? 0.03 : -0.03;
    return [limitar(x, 0.04, 0.95), y];
  }
  function desenharRastroAmigo(r, i = 0) {
    [r.x, r.y] = ondePassou(r, i);
    const el = document.createElement('span');
    el.className = `rastro-amigo${nitido ? ' nitido' : ''}`;
    el.style.left = pct(r.x);
    el.style.top = pct(r.y);
    el.style.height = `${(altura(r.y) * 100).toFixed(2)}%`;
    el.style.zIndex = String(Math.round(r.y * 1000) - 2);
    if (r.minutos != null) el.style.setProperty('--frescor', limitar(1 - r.minutos / 480, 0.25, 1).toFixed(2));
    el.title = `${r.nome}${r.cla ? `, ${/^[AEIOU]/.test(r.cla) ? 'uma' : 'um'} ${r.cla},` : ''} passou por aqui${nitido && r.ha ? ` há ${r.ha}` : ''}.`;
    el.innerHTML = `${VULTO}<span class="rastro-nome">${esc(r.nome)}${r.cla ? `<small>${esc(r.cla)}</small>` : ''}</span>`;
    mundo.appendChild(el);
  }
  function desenharRecado(r) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'recado-marca';
    el.style.left = pct(r.x);
    el.style.top = pct(r.y);
    el.title = `Recado${r.de ? ` de ${r.de}` : ''}: ${r.texto}`;
    el.setAttribute('aria-label', el.title);
    el.textContent = '✎';
    el.addEventListener('click', (ev) => { ev.stopPropagation(); falar(`RECADO${r.de ? ` DE ${r.de.toUpperCase()}` : ''}`, r.texto, 4200); });
    mundo.appendChild(el);
  }
  if (geo.alto) { rastros.forEach((r, i) => desenharRastroAmigo({ ...r }, i)); recados.forEach(desenharRecado); }

  function posicionarPessoa(p) {
    p.el.style.left = pct(p.x);
    p.el.style.top = pct(p.y);
    p.el.style.height = `${(altura(p.y) * 100).toFixed(2)}%`;
    p.el.style.zIndex = String(Math.round(p.y * 1000));
    p.el.classList.toggle('vira', p.dir < 0);
  }
  gente.forEach(posicionarPessoa);
  // Amostra a pintura em volta dos pés de cada pessoa: a cor vira a tinta da figura e o brilho, o filtro.
  if (gente.some((p) => p.el.classList.contains('pessoa-pintada')) && fundoUrl) {
    const img = new Image();
    img.onload = () => {
      try {
        const W = 336;
        const H = Math.round(W / ASPECTO);
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.drawImage(img, 0, 0, W, H);
        for (const p of gente) {
          if (!p.el.classList.contains('pessoa-pintada')) continue;
          const px = Math.round(p.x * W);
          const py = Math.round(p.y * H);
          // Em volta dos pés: média (tinta e brilho), o mais escuro (o preto da figura não passa dele) e a
          // saturação da pintura ali (a figura fica com a mesma).
          const d = cx.getImageData(Math.max(0, px - 7), Math.max(0, py - 12), 14, 14).data;
          let r = 0; let gg = 0; let b = 0; let sat = 0;
          let escuro = [255, 255, 255]; let lumMin = 9;
          for (let k = 0; k < d.length; k += 4) {
            const R = d[k]; const G = d[k + 1]; const B = d[k + 2];
            r += R; gg += G; b += B;
            const mx = Math.max(R, G, B); const mn = Math.min(R, G, B);
            sat += mx ? (mx - mn) / mx : 0;
            const l = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
            if (l < lumMin) { lumMin = l; escuro = [R, G, B]; }
          }
          const n = d.length / 4;
          r /= n; gg /= n; b /= n; sat /= n;
          const lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
          const topo = Math.max(r, gg, b, 1);
          // Curva forte (rodada 36): 0,3 no escuro, perto de 0,9 só sob o poste. Nunca mais claro que a rua.
          p.el.style.setProperty('--luz-gente', Math.max(0.3, Math.min(0.92, 0.15 + lum * 1.4)).toFixed(2));
          // Tinta forte: a cor média normalizada (a luz do lugar), multiplicada sobre a figura de estúdio.
          p.el.style.setProperty('--tinta-gente', `rgb(${Math.round((r / topo) * 255)}, ${Math.round((gg / topo) * 255)}, ${Math.round((b / topo) * 255)})`);
          p.el.style.setProperty('--preto-gente', `rgb(${escuro.map((v) => Math.round(v * 0.9)).join(', ')})`);
          p.el.style.setProperty('--sat-gente', Math.max(0.35, Math.min(1.1, 0.4 + sat * 1.1)).toFixed(2));
          // Luz mais forte por perto: a sombra vai para o lado oposto; néon perto vira borda colorida.
          let forte = null; let melhor = 0;
          for (const l of geo.luzes) {
            if (l.raio >= 0.5) continue;
            const dd = dist(l.x, l.y, p.x, p.y);
            const peso = (l.forca ?? 1) * Math.max(0, 1 - dd / (l.raio * 2.2));
            if (peso > melhor) { melhor = peso; forte = l; }
          }
          if (forte) {
            const dx = p.x - forte.x;
            p.el.style.setProperty('--sombra-x', `${Math.max(-60, Math.min(60, dx * 900)).toFixed(0)}%`);
            const [lr, lg, lb] = rgb(forte.cor);
            // Só néon de verdade (vermelho, verde, azul, rosa) vira borda; a luz amarela de poste, não.
            const sodio = lr >= lg && lg >= lb && lr - lb > 60 && lg > lr * 0.45;
            const neon = !sodio && Math.max(lr, lg, lb) - Math.min(lr, lg, lb) > 120 && melhor > 0.25;
            if (neon) p.el.style.setProperty('--rim-gente', `rgba(${lr}, ${lg}, ${lb}, ${Math.min(0.6, 0.25 + melhor * 0.5).toFixed(2)})`);
            p.el.style.setProperty('--rim-x', `${forte.x < p.x ? -1 : 1}px`);
            // Luz quente de lado (do lado da luz forte) e o resto em sombra.
            p.el.style.setProperty('--lado-luz', forte.x < p.x ? '90deg' : '270deg');
            p.el.style.setProperty('--cor-luz', `rgba(${lr}, ${lg}, ${lb}, 0.55)`);
            // A borda de luz só existe com luz por perto, e fraca (0,3 a 0,4).
            p.el.style.setProperty('--lado-forca', melhor > 0.15 ? Math.min(0.4, 0.3 + melhor * 0.15).toFixed(2) : '0');
          }
        }
      } catch { /* sem leitura da imagem: fica o brilho das luzes marcadas */ }
    };
    img.src = fundoUrl;
  }
  // Ao conversar, a pessoa vira para o personagem.
  function virarPessoaPara(id) {
    const p = gente.find((g) => g.id === id);
    if (!p) return;
    const olhaEsquerda = pos.x < p.x;
    p.dir = olhaEsquerda ? -1 : 1;
    p.el.classList.toggle('vira', olhaEsquerda);
    p.fixa = performance.now() + 8000;
  }
  let proximaVirada = performance.now() + 4000;
  function virarAlguem(agora) {
    if (agora < proximaVirada || !gente.length || pausado) return;
    proximaVirada = agora + 3000 + Math.random() * 5000;
    const p = gente[Math.floor(Math.random() * gente.length)];
    if (p.anda || p.fugindo || p.escondida || (p.fixa && performance.now() < p.fixa)) return;
    p.el.classList.toggle('vira');
    setTimeout(() => p.el.classList.toggle('vira'), 1400 + Math.random() * 1600);
  }
  // Quem tem um pedido, ao ver o personagem chegar perto, vira para ele e levanta a mão (sem "!").
  let proximoAceno = 0;
  // A cidade nota o vampiro sem clique (rodada 36): ao passar perto, a pessoa vira para ele e às vezes
  // solta uma frase curta (no máximo uma por pessoa por noite); com a Fome em 4 ou mais, recua meio passo
  // e desvia o olhar; quem ele já ajudou acena de longe.
  const chaveNoite = new Date().toDateString();
  const jaFalou = (tipo) => { try { return sessionStorage.getItem(`mascara.passagem.${chaveNoite}.${tipo}`) === '1'; } catch { return false; } };
  const marcarFala = (tipo) => { try { sessionStorage.setItem(`mascara.passagem.${chaveNoite}.${tipo}`, '1'); } catch { /* sem armazenamento */ } };
  let ultimaFalaPassagem = 0;
  function notarVampiro(agora) {
    for (const p of gente) {
      if (p.escondida || p.fugindo) continue;
      const d = dist(p.x, p.y, pos.x, pos.y);
      if (ajudado?.(p.tipoGente) && d < 0.35 && !p.acenouAjuda) {
        p.acenouAjuda = true; virarPessoaPara(p.id);
        p.el.classList.remove('acena'); void p.el.offsetWidth; p.el.classList.add('acena');
      }
      if (d < 0.12 && !p.notou && !conversa) {
        p.notou = true;
        if (fome >= 4) {
          // O corpo sente o predador: meio passo para longe e o olhar para o outro lado.
          const longe = pos.x < p.x ? 1 : -1;
          p.dir = longe; p.el.classList.toggle('vira', longe < 0); p.fixa = agora + 3000;
          p.el.style.setProperty('--recuo', `${longe * 18}%`);
          p.el.classList.add('recua');
          setTimeout(() => p.el.classList.remove('recua'), 3000);
        } else {
          virarPessoaPara(p.id); p.fixa = agora + 1500;
          const t = TIPOS_GENTE[p.tipoGente];
          const curtas = (p.falas || t?.falas || []).filter((f) => f.length <= 48);
          if (curtas.length && !jaFalou(p.tipoGente) && agora - ultimaFalaPassagem > 9000 && Math.random() < 0.45) {
            marcarFala(p.tipoGente); ultimaFalaPassagem = agora;
            falar((p.caso?.nome || t?.nome || p.rotulo).toUpperCase(), curtas[Math.floor(Math.random() * curtas.length)], 2800);
          }
        }
      }
      if (d > 0.25) p.notou = false;
    }
  }
  function acenarSeTemPedido() {
    const agora = performance.now();
    if (agora < proximoAceno) return;
    proximoAceno = agora + 400;
    notarVampiro(agora);
    if (!temPedido) return;
    for (const p of gente) {
      if (!temPedido(p.tipoGente)) continue;
      const perto = dist(p.x, p.y, pos.x, pos.y) < 0.16;
      if (perto && !p.acenou) { p.acenou = true; virarPessoaPara(p.id); p.el.classList.remove('acena'); void p.el.offsetWidth; p.el.classList.add('acena'); }
      if (!perto && dist(p.x, p.y, pos.x, pos.y) > 0.3) p.acenou = false;
    }
  }
  function andarGente(dt) {
    acenarSeTemPedido();
    virarAlguem(performance.now());
    for (const p of gente) {
      if (!p.anda || pausado) continue;
      if (p.parado > 0) { p.parado -= dt; continue; }
      p.x += p.dir * 0.012 * dt;
      if (p.x > p.anda[1] || p.x < p.anda[0]) { p.dir *= -1; p.x = limitar(p.x, p.anda[0], p.anda[1]); p.parado = 1.5 + Math.random() * 2.5; }
      posicionarPessoa(p);
    }
  }
  mundo.addEventListener('click', (ev) => {
    const el = ev.target.closest('.pessoa');
    if (!el) return;
    ev.stopPropagation();
    // Um arrasto que começou numa pessoa não abre a conversa nem faz o personagem andar.
    if (ignorarClique || camLivre.arrastando) return;
    const p = gente.find((g) => g.el === el);
    if (!p || p.escondida || camadaAberta() || semPersonagem) return;
    if (dist(p.x, p.y, pos.x, pos.y) < alcanceEm(pos.y) * 1.4) { interagir(p); return; }
    const k = Math.min(1, 0.05 / Math.max(0.001, dist(p.x, p.y, pos.x, pos.y)));
    const [x, y] = maisPertoDentro([p.x + (pos.x - p.x) * k, p.y + (pos.y - p.y) * k + 0.01], geo.chao, ASPECTO);
    alvo = { x, y, ponto: p, aproximar: true, correr: false };
    mostrarDestino?.(x, y, false);
    virarPara(x < pos.x);
    semProgresso = 0;
  }, true);

  // --- Interação no mundo (rodada 26) ---------------------------------------------------------------
  // Marca no destino: um círculo pequeno pulsa onde ele vai parar e some quando ele chega.
  const marcaDestino = cena.querySelector('.marca-destino');
  function mostrarDestino(x, y, correr) {
    marcaDestino.style.left = pct(x);
    marcaDestino.style.top = pct(y);
    marcaDestino.style.setProperty('--escala', escalaPonto(y));
    marcaDestino.classList.toggle('correndo', !!correr);
    marcaDestino.hidden = false;
    marcaDestino.classList.remove('pulsa');
    void marcaDestino.offsetWidth;
    marcaDestino.classList.add('pulsa');
  }
  // Saída pela borda: uma faixa do lado da saída do lugar. O cursor vira a seta de viagem, o destino
  // aparece, e o clique faz o personagem andar até a saída e sair.
  const bordaSaida = cena.querySelector('.borda-saida');
  function prepararBorda() {
    const s = lista.find((p) => p.tipo === 'saida');
    bordaSaida.hidden = !s || semPersonagem;
    if (!s) return;
    bordaSaida.classList.toggle('borda-esq', s.x < 0.5);
    bordaSaida.classList.toggle('borda-dir', s.x >= 0.5);
    bordaSaida.querySelector('.borda-destino').textContent = `para o ${s.rotulo.replace(/^Voltar ao /, '').replace(/^Mapa do Rio$/, 'mapa do Rio')}`;
    bordaSaida.setAttribute('aria-label', s.acao || s.rotulo);
  }
  bordaSaida.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const s = lista.find((p) => p.tipo === 'saida');
    if (!s || camadaAberta() || caca) return;
    if (s === perto) { interagir(s); return; }
    const [x, y] = s.parada && dentro(s.parada, geo.chao) ? s.parada : maisPertoDentro([s.x, s.y], geo.chao, ASPECTO);
    alvo = { x, y, ponto: s, correr: true };
    mostrarDestino(x, y, true);
    virarPara(x < pos.x);
    semProgresso = 0;
  });
  // Clicar no próprio personagem: uma fala curta do clã (nada da crônica), uma a cada três cliques.
  const FALAS_CLA = {
    nosferatu: ['Ninguém olha para baixo.', 'O esgoto também é endereço.', 'Melhor do escuro.', 'Eles nem me veem passar.'],
    toreador: ['Que noite bonita para estragar.', 'Esta luz merecia um quadro.', 'Tudo aqui é cenário.', 'Ninguém se veste mais para a noite.'],
    brujah: ['Alguém vai pagar por isso.', 'Nada nesta cidade é justo.', 'Paciência é para quem tem tempo.'],
    ventrue: ['Tudo tem um preço.', 'Esta rua ainda não sabe quem manda.', 'Calma. Eu decido o ritmo.'],
    malkaviano: ['A chuva está contando alguma coisa.', 'Os postes estão olhando.', 'Já vivi esta noite. Ou vou viver.'],
    gangrel: ['Cheiro de chuva e de medo.', 'A cidade é só outro mato.', 'Prefiro o telhado.'],
    tremere: ['Tudo tem uma regra. Até isto.', 'O sangue lembra.', 'Paciência e anotações.'],
    lasombra: ['A sombra obedece.', 'A noite é minha casa.', 'Luz demais nesta rua.'],
    caitiff: ['Ninguém me disse como fazer isto.', 'Sem nome, sem dono.', 'Aprendo sozinho.'],
    'sangue-fraco': ['Ainda sinto o gosto do café.', 'Meio morto, meio vivo.', 'O sol ainda me assusta menos.'],
  };
  const falasDoCla = FALAS_CLA[cla] || ['A noite ainda é longa.', 'Fome. Sempre a fome.', 'Melhor não chamar atenção.'];
  let cliquesNoPersonagem = 0;
  function cliqueNoPersonagem(ev) {
    if (semPersonagem || caca || camadaAberta()) return false;
    const r = corpo.getBoundingClientRect();
    if (!(ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom)) return false;
    if (cliquesNoPersonagem++ % 3 === 0) falar((nome || 'VOCÊ').toUpperCase(), falasDoCla[Math.floor(Math.random() * falasDoCla.length)], 3200);
    return true;
  }

  // --- Névoa leve na primeira visita (rodada 29) -------------------------------------------------------
  // Um véu escuro translúcido (50%, um pouco desfocado no CSS) sobre o que ainda não foi visto. Abre num
  // círculo suave em volta do personagem; o canvas é pequeno e só é redesenhado quando ele se mexe.
  // Detalhes e presas só aparecem na parte aberta; ações e saídas ficam sempre à vista.
  const veu = cena.querySelector('.veu-area');
  const VEU_L = 192;
  const VEU_A = Math.round(VEU_L / ASPECTO);
  const veuAtivo = !!nevoa && !semPersonagem;
  let veuCtx = null;
  let veuUltimo = null;
  if (veuAtivo) {
    veu.width = VEU_L;
    veu.height = VEU_A;
    veu.hidden = false;
    veuCtx = veu.getContext('2d', { willReadFrequently: true });
    veuCtx.fillStyle = 'rgba(6, 6, 10, 0.35)';
    veuCtx.fillRect(0, 0, VEU_L, VEU_A);
    // As ações da noite e a saída ficam sempre limpas (sem véu nem desfoque em volta).
    setTimeout(() => { for (const p of lista) if (p.tipo === 'acao' || p.tipo === 'saida' || p.tipo === 'cacar') abrirVeu(p.x, p.y + 0.04, 0.07); }, 0);
  }
  function abrirVeu(x, y, raio = 0.16) {
    if (!veuCtx) return;
    const cx = x * VEU_L;
    const cy = (y - 0.06) * VEU_A;
    const r = raio * VEU_L;
    const g = veuCtx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    veuCtx.globalCompositeOperation = 'destination-out';
    veuCtx.fillStyle = g;
    veuCtx.beginPath();
    veuCtx.ellipse(cx, cy, r, r * 1.25, 0, 0, Math.PI * 2);
    veuCtx.fill();
    veuCtx.globalCompositeOperation = 'source-over';
  }
  // Névoa de BG2 na vista do alto: além do véu do que nunca foi visto, o que está longe do personagem
  // fica levemente acinzentado, e o que está perto fica limpo. Redesenhado só quando ele anda.
  const veuLonge = cena.querySelector('.veu-longe');
  const longeCtx = geo.alto && nevoaLonge && !semPersonagem ? (() => { veuLonge.width = VEU_L; veuLonge.height = VEU_A; veuLonge.hidden = false; return veuLonge.getContext('2d'); })() : null;
  function desenharLonge() {
    if (!longeCtx) return;
    longeCtx.clearRect(0, 0, VEU_L, VEU_A);
    longeCtx.fillStyle = 'rgba(70, 76, 92, 0.2)';
    longeCtx.fillRect(0, 0, VEU_L, VEU_A);
    const cx = pos.x * VEU_L;
    const cy = (pos.y - 0.05) * VEU_A;
    const r = 0.22 * VEU_L;
    const g = longeCtx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    longeCtx.globalCompositeOperation = 'destination-out';
    longeCtx.fillStyle = g;
    longeCtx.beginPath();
    longeCtx.ellipse(cx, cy, r, r * 1.3, 0, 0, Math.PI * 2);
    longeCtx.fill();
    longeCtx.globalCompositeOperation = 'source-over';
  }
  let longeUltimo = null;
  function atualizarVeu() {
    if (longeCtx && (!longeUltimo || dist(longeUltimo.x, longeUltimo.y, pos.x, pos.y) > 0.01)) { longeUltimo = { x: pos.x, y: pos.y }; desenharLonge(); }
    if (!veuCtx) return;
    if (veuUltimo && dist(veuUltimo.x, veuUltimo.y, pos.x, pos.y) < 0.012) return;
    veuUltimo = { x: pos.x, y: pos.y };
    abrirVeu(pos.x, pos.y, geo.alto ? 0.15 : 0.21);
  }
  const sobVeu = (x, y) => {
    if (!veuCtx) return false;
    const px = Math.min(VEU_L - 1, Math.max(0, Math.round(x * VEU_L)));
    const py = Math.min(VEU_A - 1, Math.max(0, Math.round(y * VEU_A)));
    return veuCtx.getImageData(px, py, 1, 1).data[3] > 60;
  };

  // --- Pausa (rodada 27) -------------------------------------------------------------------------------
  // Espaço pausa e solta. Pausado, o jogador pode marcar o destino e escolher um poder: tudo acontece
  // ao soltar. A moldura acende em vermelho e a pedra-chave mostra PAUSA (CSS em .pausado).
  let pausado = false;
  const aoSoltarPausa = [];
  function pausar(motivo = '') {
    // Na perseguição do caso (4 a 16 s) não há pausa: o banco só aceita o "pego" até 60 s do começo.
    if (pausado || semPersonagem || document.body.classList.contains('em-perseguicao')) return;
    pausado = true;
    raiz.closest('.tela-jogo')?.classList.add('pausado');
    document.body.classList.add('cena-pausada');
    som.abafar?.(true);
    aoPausa?.(true, motivo);
  }
  function soltar() {
    if (!pausado) return;
    pausado = false;
    raiz.closest('.tela-jogo')?.classList.remove('pausado');
    document.body.classList.remove('cena-pausada');
    if (!conversa) som.abafar?.(false);
    aoPausa?.(false, '');
    aoSoltarPausa.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  }
  function alternarPausa() { if (pausado) soltar(); else pausar(); }

  // --- A escolha da noite ganha corpo (rodada 24) -----------------------------------------------------
  // Ao confirmar a ação principal: o personagem vira para o objeto, a câmera enquadra os dois, um fio de
  // luz vermelha vai até ele e some, e um letreiro diz a intenção. Dura 1,8 s; um clique pula. A brasa que
  // fica no objeto é do próprio ponto (classe "feito" no CSS). É só intenção: o resultado é do Narrador.
  let focoEscolha = null;
  const fioEscolha = cena.querySelector('.fio-escolha');
  function marcarEscolha(id, frase, { curta = false } = {}) {
    const p = lista.find((x) => x.id === id);
    if (!p) return;
    if (curta) return; // ação curta: só a brasa menor, que o próprio ponto mostra
    const curto = reduzido();
    const ms = curto ? 900 : 1800;
    virarPara(p.x < pos.x);
    focoEscolha = { x: p.x, y: p.y, ate: performance.now() + ms };
    const h = altura(pos.y);
    const linha = fioEscolha.querySelector('line');
    linha.setAttribute('x1', pos.x.toFixed(4));
    linha.setAttribute('y1', (pos.y - h * 0.55).toFixed(4));
    linha.setAttribute('x2', p.x.toFixed(4));
    linha.setAttribute('y2', (p.y - 0.01).toFixed(4));
    fioEscolha.classList.remove('vai');
    void fioEscolha.getBoundingClientRect();
    fioEscolha.classList.add('vai');
    const letreiro = document.createElement('div');
    letreiro.className = 'letreiro-escolha';
    letreiro.setAttribute('role', 'status');
    letreiro.innerHTML = `<small>Esta noite</small><b>${esc(frase)}</b>`;
    cena.appendChild(letreiro);
    som.toque?.();
    let acabou = false;
    const acabar = () => {
      if (acabou) return;
      acabou = true;
      cena.removeEventListener('click', pular, true);
      focoEscolha = null;
      letreiro.classList.add('saindo');
      fioEscolha.classList.remove('vai');
      setTimeout(() => letreiro.remove(), 400);
    };
    const pular = (ev) => { ev.stopPropagation(); ev.preventDefault(); acabar(); };
    setTimeout(() => cena.addEventListener('click', pular, true), 120);
    setTimeout(acabar, ms);
  }

  // --- O lugar lembra (rodada 24) -------------------------------------------------------------------
  // Só no aparelho e só nesta noite (quem chama guarda e apaga). Um vestígio genérico onde a presa
  // estava, um vulto parado olhando o canto onde ele foi visto. Ao passar perto do vestígio, A FOME fala.
  const VESTIGIOS = {
    celular: '<svg viewBox="0 0 40 20"><rect x="12" y="6" width="16" height="9" rx="1.5" transform="rotate(-12 20 10)" class="tela"/></svg>',
    moto: '<svg viewBox="0 0 60 30"><circle cx="12" cy="22" r="6" class="roda"/><circle cx="46" cy="22" r="6" class="roda"/><path d="M12 22 L24 12 L40 12 L46 22" class="quadro"/><circle cx="50" cy="13" r="2.4" class="pisca"/></svg>',
    copo: '<svg viewBox="0 0 40 16"><ellipse cx="22" cy="10" rx="15" ry="4" class="poca"/><path d="M6 6 L10 4 L13 10 L8 12 Z" class="copo"/></svg>',
  };
  let lembrancas = [];
  let vestigioPerto = null;
  function lembrar({ vestigio, vigia } = {}) {
    lembrancas.forEach((el) => el.remove());
    lembrancas = [];
    vestigioPerto = null;
    if (vestigio && VESTIGIOS[vestigio.tipo]) {
      const el = document.createElement('span');
      el.className = `vestigio vestigio-${vestigio.tipo}`;
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = `left:${pct(vestigio.x)};top:${pct(vestigio.y)};--s:${(altura(vestigio.y) / ALTURA_REF).toFixed(3)};z-index:${Math.round(vestigio.y * 1000)}`;
      el.innerHTML = VESTIGIOS[vestigio.tipo];
      mundo.appendChild(el);
      lembrancas.push(el);
      vestigioPerto = { x: vestigio.x, y: vestigio.y, longe: false, dito: !!vestigio.dito, aoDizer: vestigio.aoDizer };
    }
    if (vigia) {
      const el = document.createElement('span');
      el.className = 'vigia vulto';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = `left:${pct(vigia.x)};top:${pct(vigia.y)};--s:${(altura(vigia.y) / ALTURA_REF).toFixed(3)};z-index:${Math.round(vigia.y * 1000)};--lado:${vigia.olha < vigia.x ? -1 : 1}`;
      el.innerHTML = VULTO;
      mundo.appendChild(el);
      lembrancas.push(el);
    }
  }
  function checarVestigio() {
    const v = vestigioPerto;
    if (!v || v.dito || caca || balaoEscolha) return;
    const d = dist(v.x, v.y, pos.x, pos.y);
    if (d > 0.16) v.longe = true;
    else if (v.longe && d < 0.08) { v.dito = true; falar('A FOME', 'Ainda está quente.', 2800); v.aoDizer?.(); }
  }

  // --- Caçada pela sombra / de frente (rodada 18) ---------------------------------------------------
  // A visibilidade se lê no próprio personagem: na sombra, ele vira silhueta escura com um contorno
  // vermelho fino; na luz, volta às cores. Correr desenha um anel de barulho no chão; se o anel chega
  // à presa, a rua repara. A presa olha de relance quando ele entra na borda do campo dela. As palavras
  // ("ninguém reparou / alguém olhou / você foi visto") ficam só como resumo, no alto.
  const atencaoEl = cena.querySelector('.atencao-rua');
  const palavrasEl = atencaoEl.querySelector('.palavras');
  const poderesAtivosEl = atencaoEl.querySelector('.poderes-ativos');
  const poderesAtivos = new Map(); // nome → até quando
  function mostrarPoderAtivo(nome, segundos) { poderesAtivos.set(nome, performance.now() + segundos * 1000); }
  // Ensino da primeira caçada (uma vez por aparelho): uma frase d'A FOME em cada momento, e o elemento
  // de que ela fala pulsa.
  function ensinar(chave, frase, alvoEl) {
    const k = `mascara.ensino.${chave}`;
    try { if (localStorage.getItem(k) === '1') return; localStorage.setItem(k, '1'); } catch { /* sem armazenamento */ }
    falar('A FOME', frase, 3200);
    if (alvoEl) { alvoEl.classList.remove('pulsa-ensino'); void alvoEl.offsetWidth; alvoEl.classList.add('pulsa-ensino'); setTimeout(() => alvoEl.classList.remove('pulsa-ensino'), 2400); }
  }
  const PALAVRAS_ATENCAO = (a) => (a < 0.34 ? 'ninguém reparou' : a < 0.67 ? 'alguém olhou' : 'você foi visto');
  function luzEm(x, y) {
    let s = 0;
    for (const l of geo.luzes) {
      if (l.raio >= 0.5) continue; // lua e céu não contam
      s += (l.forca ?? 1) * Math.max(0, 1 - dist(l.x, l.y, x, y) / (l.raio * 1.3));
    }
    return Math.min(1.5, s);
  }
  // Campo de visão da presa: um leque de uns 70° olhando para o meio da rua. Dentro dele, na luz, a
  // presa repara mais rápido; com Sentidos Aguçados, o leque aparece no chão.
  const RAIO_CAMPO = 0.24;
  // Rodada 39: na vista do alto, a caçada segue a escala das figuras do lugar (leque, anéis, alcance) e a
  // sombra é onde a pintura é escura (as luzes marcadas e o brilho da própria pintura em volta dos pés).
  function escalaCaca(y) { return geo.alto ? limitar((altura(y) / ALTURA_REF) * 2.2, 0.3, 1) : 1; }
  // O brilho da pintura conta em relação à mediana do chão do lugar (cada foto tem a sua noite): cerca de
  // um terço do chão fica escuro, onde a pintura é mais escura.
  let medianaChao = null;
  function luzCaca(x, y) {
    if (!geo.alto || !amostra.dados) return luzEm(x, y);
    if (medianaChao == null) {
      const v = [];
      for (let j = 0; j < amostra.A; j++) for (let i = 0; i < amostra.L; i++) {
        const q = [(i + 0.5) / amostra.L, (j + 0.5) / amostra.A];
        if (dentro(q, geo.chao)) v.push(brilhoDaPintura(q[0], q[1], 0.015));
      }
      v.sort((a, b2) => a - b2);
      medianaChao = v.length ? Math.max(0.05, v[Math.floor(v.length / 2)]) : 0.3;
    }
    const b = brilhoDaPintura(x, y - 0.01, 0.015) ?? 0;
    return Math.max(luzEm(x, y) * 0.45, limitar((b / medianaChao - 0.6) * 1.1, 0, 1.5));
  }
  function dentroDoCampo(c, x, y) {
    const dx = (x - c.alvo.x) * ASPECTO;
    const dy = y - c.alvo.y;
    if (Math.hypot(dx, dy) > RAIO_CAMPO * escalaCaca(c.alvo.y)) return false;
    const ang = Math.atan2(dy, dx);
    let d = ang - c.olhar;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return Math.abs(d) < 0.62;
  }
  const campoEl = cena.querySelector('.campo-presa path');
  let campoUltimo = '';
  function desenharCampo(c) {
    if (!c) { campoEl.setAttribute('d', ''); return; }
    const forte = performance.now() < sentidosAte;
    const chave = `${c.alvo.x.toFixed(3)},${c.alvo.y.toFixed(3)},${c.olhar},${forte}`;
    if (chave === campoUltimo) return;
    campoUltimo = chave;
    campoEl.parentNode.classList.toggle('forte', forte);
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const a = c.olhar - 0.62 + (1.24 * i) / 10;
      const raio = RAIO_CAMPO * escalaCaca(c.alvo.y);
      pts.push(`${(c.alvo.x + (Math.cos(a) * raio) / ASPECTO).toFixed(4)},${(c.alvo.y + Math.sin(a) * raio * 0.45).toFixed(4)}`);
    }
    campoEl.setAttribute('d', `M${c.alvo.x.toFixed(4)},${c.alvo.y.toFixed(4)} L${pts.join(' L')} Z`);
  }
  // Rodada 40: na caçada pela sombra (vista do alto), um escurecimento suave e sem cor que cai devagar a
  // partir de cada luz marcada (claro perto da luz, escuro longe), sempre desfocado. Fora da caçada, nada:
  // a sombra é a da própria pintura. Com Sentidos, um pouco mais forte.
  const sombraCaca = cena.querySelector('.sombra-caca');
  let sombraPronta = false;
  function prepararSombra() {
    if (sombraPronta || !geo.alto || !sombraCaca) return;
    sombraPronta = true;
    const L = 384;
    const A = Math.round(L / ASPECTO);
    sombraCaca.width = L; sombraCaca.height = A;
    const cx = sombraCaca.getContext('2d');
    cx.fillStyle = 'rgb(4, 5, 9)';
    cx.fillRect(0, 0, L, A);
    cx.globalCompositeOperation = 'destination-out';
    for (const l of geo.luzes) {
      if (l.raio >= 0.5) continue;
      const r = l.raio * 1.5 * A;
      const g = cx.createRadialGradient(l.x * L, l.y * A, 0, l.x * L, l.y * A, r);
      const f = limitar(l.forca ?? 1, 0.3, 1);
      g.addColorStop(0, `rgba(0, 0, 0, ${f})`);
      g.addColorStop(0.45, `rgba(0, 0, 0, ${(f * 0.6).toFixed(2)})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      cx.fillStyle = g;
      cx.fillRect(l.x * L - r, l.y * A - r, r * 2, r * 2);
    }
  }
  function iniciarFurtividade({ alvo, modo = 'sombra', limite = 20, zonas = [], aoFim, aoVisto }) {
    if (modo === 'sombra') { prepararSombra(); cena.classList.add('caca-sombra'); }
    caca = { alvo, modo, limite, zonas, aoFim, aoVisto, t0: performance.now(), atencao: 0, anel: 0, olhou: false, olhar: alvo.x > 0.5 ? Math.PI : 0, piscar: caca?.piscar };
    cena.classList.add('em-caca');
    // A presa olha para um lado: o rótulo dela aponta para onde ela olha.
    const elP = camadaPontos.querySelector('.ponto-presa');
    elP?.classList.toggle('olha-esq', caca.olhar > 1);
    elP?.classList.toggle('olha-dir', caca.olhar <= 1);
    atencaoEl.hidden = false;
    palavrasEl.textContent = PALAVRAS_ATENCAO(0);
    atencaoEl.dataset.nivel = '0';
    document.body.classList.add('furtividade');
    poderesAtivos.clear();
    if (modo === 'sombra') setTimeout(() => { if (caca) ensinar('escuro', 'Fique no escuro.', boneco); }, 600);
  }
  function encerrarFurtividade(chegou) {
    const c = caca;
    if (!c) return;
    caca = null;
    cena.classList.remove('em-caca', 'caca-sombra');
    boneco.classList.remove('na-sombra', 'manto');
    atencaoEl.hidden = true;
    document.body.classList.remove('furtividade');
    campoEl.setAttribute('d', '');
    campoUltimo = '';
    c.aoFim?.({ chegou, atencao: c.atencao });
  }
  // Na caçada pela sombra, o clique só anda (correr faz barulho): Shift, clique duplo ou Ligeireza.
  let lembrouCorrer = false;
  function andarSemCorrer(longe) {
    if (!caca || caca.modo !== 'sombra') return false;
    if (longe && !lembrouCorrer) { lembrouCorrer = true; falar('A FOME', 'Devagar. Correr faz barulho: só com Shift ou clique duplo.', 3500); }
    return true;
  }

  function anelDeBarulho(x, y) {
    const el = document.createElement('span');
    el.className = 'anel-barulho';
    el.style.scale = String(escalaCaca(y));
    el.style.left = pct(x);
    el.style.top = pct(y);
    mundo.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
  function atualizarCaca(agora, dt, correndo) {
    const c = caca;
    // Com qualquer caixa ou pergunta aberta, o tempo e a atenção da caçada param.
    if (camadaAberta() || balaoEscolha) { c.t0 += dt * 1000; return; }
    const andando = Math.hypot(vel.x, vel.y) > 0.01;
    const luz = luzCaca(pos.x, pos.y);
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
        if (dist(c.alvo.x, c.alvo.y, pos.x, pos.y) < 0.12 * escalaCaca(pos.y)) taxa += 1.2;
      }
    }
    // A presa olha de relance quando ele entra na borda do campo dela.
    const d = dist(c.alvo.x, c.alvo.y, pos.x, pos.y);
    const noCampo = dentroDoCampo(c, pos.x, pos.y);
    if (noCampo && !naSombra && !sumido) taxa += 0.15;
    desenharCampo(c);
    if (!c.olhou && noCampo && !naSombra && !sumido) {
      c.olhou = true;
      const el = camadaPontos.querySelector('.ponto-presa');
      if (el) { el.classList.add('olhou'); setTimeout(() => el.classList.remove('olhou'), 500); }
      efeitoNoMundo('relance', c.alvo.x, c.alvo.y - altura(c.alvo.y) * 0.9, 700);
      taxa += 0.5;
    }
    c.atencao = limitar(c.atencao + taxa * dt, 0, 1);
    if (!c.vistoAvisado && c.atencao >= 0.67) {
      c.vistoAvisado = true;
      c.lentoAte = agora + 500;
      cena.classList.add('camera-lenta');
      setTimeout(() => cena.classList.remove('camera-lenta'), 600);
      c.aoVisto?.();
    }
    // O tempo se vê: um anel fino sob a presa se esvazia; nos últimos 6 s, ela se afasta devagar.
    const resta = c.limite - (agora - c.t0) / 1000;
    const elPresa = camadaPontos.querySelector('.ponto-presa');
    if (elPresa) elPresa.style.setProperty('--resta', String(limitar(resta / c.limite, 0, 1)));
    let indo = false;
    if (c.modo === 'sombra' && resta < 6) {
      indo = true;
      if (!c.avisouIndo) { c.avisouIndo = true; aoPresaVai?.(); }
      const sentido = c.alvo.x >= pos.x ? 1 : -1;
      const nx = c.alvo.x + sentido * 0.012 * dt;
      if (dentro([nx, c.alvo.y], geo.chao)) {
        c.alvo = { ...c.alvo, x: nx };
        if (elPresa) elPresa.style.left = pct(nx);
      }
    }
    const palavras = indo ? 'ela está indo embora' : PALAVRAS_ATENCAO(c.atencao);
    if (palavrasEl.textContent !== palavras) palavrasEl.textContent = palavras;
    const nivel = c.atencao < 0.34 ? '0' : c.atencao < 0.67 ? '1' : '2';
    if (atencaoEl.dataset.nivel !== nivel) atencaoEl.dataset.nivel = nivel;
    // Poderes ativos com o tempo (só o texto muda).
    for (const [n, ate] of poderesAtivos) if (ate <= agora && !c[`acabou.${n}`]) { c[`acabou.${n}`] = true; aoPoderAcabou?.(n); }
    if (poderesAtivos.size) {
      const txt = [...poderesAtivos].filter(([, ate]) => ate > agora).map(([n, ate]) => `${n} ${Math.ceil((ate - agora) / 1000)} s`).join(' · ');
      if (poderesAtivosEl.textContent !== txt) poderesAtivosEl.textContent = txt;
    }
    // Ensino: a primeira luz, perto do leque, o anel na metade.
    if (c.modo === 'sombra') {
      if (!naSombra) ensinar('luz', 'A luz te mostra.', boneco);
      if (noCampo || d < RAIO_CAMPO * escalaCaca(c.alvo.y) * 1.2) ensinar('leque', 'É para lá que ela olha.', campoEl.parentNode);
      if (resta < c.limite / 2) ensinar('anel', 'Ela não vai esperar.', elPresa);
    }
    if (d <= Math.max(alcanceEm(pos.y) * 1.5, 0.11 * escalaCaca(pos.y)) && agora - c.t0 > 2500) encerrarFurtividade(true);
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
  // O Beijo (fim da caçada que deu certo): a câmera fecha no par, a pintura perde a cor, a cidade
  // abafa e entram dois batimentos da presa, cada vez mais lentos; a figura se inclina, a presa baixa,
  // um clarão dourado e tudo volta. Sem sangue na tela. Clique ou Esc pula.
  function beijo(presa) {
    return new Promise((resolver) => {
      const curto = reduzido();
      const ms = curto ? 1000 : 2500;
      focoBeijo = { x: presa.x, y: presa.y };
      cena.classList.add('beijo');
      // Depois de meio segundo, um lembrete pequeno embaixo: dá para pular.
      const dicaPular = document.createElement('div');
      dicaPular.className = 'dica-pular';
      dicaPular.textContent = 'clique ou Esc para pular';
      setTimeout(() => { if (!feito) cena.appendChild(dicaPular); }, 500);
      boneco.style.setProperty('--inclinacao', `${presa.x < pos.x ? -7 : 7}deg`);
      boneco.classList.add('inclinado', 'boca-vermelha');
      camadaPontos.querySelector('.ponto-presa')?.classList.add('baixando');
      som.abafar?.(true);
      som.batimentoDaPresa?.(curto);
      let feito = false;
      const pular = (ev) => {
        if (ev?.type === 'keydown' && ev.key !== 'Escape') return;
        ev?.stopPropagation();
        ev?.preventDefault();
        acabar();
      };
      function acabar() {
        if (feito) return;
        feito = true;
        cena.removeEventListener('click', pular, true);
        document.removeEventListener('keydown', pular, true);
        dicaPular.remove();
        cena.classList.add('clarao-dourado');
        setTimeout(() => {
          cena.classList.remove('beijo', 'clarao-dourado');
          boneco.classList.remove('inclinado', 'boca-vermelha');
          focoBeijo = null;
          som.abafar?.(false);
          resolver();
        }, 150);
      }
      cena.addEventListener('click', pular, true);
      document.addEventListener('keydown', pular, true);
      setTimeout(acabar, ms - 150);
    });
  }

  // Devolve false quando o poder não serve agora (os da caçada fora da caçada).
  function usarPoder(id, { alvo = null } = {}) {
    const agora = performance.now();
    if (id === 'sentidos-agucados') {
      sentidosAte = agora + 10000;
      ondaDosSentidos(true);
      clearInterval(usarPoder.pulsos);
      usarPoder.pulsos = setInterval(() => { if (performance.now() < sentidosAte) ondaDosSentidos(false); else clearInterval(usarPoder.pulsos); }, 3000);
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
        caca.piscar = true; // daqui até o fim da caçada: clique duplo numa marca de sombra atravessa até ela
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
  // Sentidos em pulso: uma onda atravessa a pintura em 1,2 s e acende o que encontra; depois, um pulso
  // fraco a cada 3 s enquanto durar.
  function ondaDosSentidos(forte) {
    const el = document.createElement('span');
    el.className = `onda-sentidos${forte ? ' forte' : ''}`;
    el.style.left = pct(pos.x);
    el.style.top = pct(pos.y - altura(pos.y) * 0.5);
    mundo.appendChild(el);
    setTimeout(() => el.remove(), 1300);
    for (const p of lista) {
      const elp = camadaPontos.querySelector(`[data-ponto="${CSS.escape(p.id)}"]`);
      if (!elp) continue;
      const atraso = Math.min(1200, dist(p.x, p.y, pos.x, pos.y) * 1400);
      setTimeout(() => { elp.classList.remove('acende'); void elp.offsetWidth; elp.classList.add('acende'); }, atraso);
    }
  }

  // Piscar de sombra em sombra: marcas discretas nas zonas escuras ao alcance.
  let marcasSombra = [];
  function atualizarMarcasSombra() {
    mundo.querySelectorAll('.marca-sombra').forEach((m) => m.remove());
    marcasSombra = [];
    if (!caca?.piscar) return;
    for (let i = 0; i < 24 && marcasSombra.length < 3; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = (0.12 + (i % 3) * 0.05) * escalaCaca(pos.y);
      const q = [pos.x + (Math.cos(a) * r) / ASPECTO, pos.y + Math.sin(a) * r * 0.45];
      if (!dentro(q, geo.chao) || luzCaca(q[0], q[1]) > 0.12) continue;
      if (marcasSombra.some((m) => dist(m[0], m[1], q[0], q[1]) < 0.08 * escalaCaca(pos.y))) continue;
      marcasSombra.push(q);
      const el = document.createElement('span');
      el.className = 'marca-sombra';
      el.style.left = pct(q[0]);
      el.style.top = pct(q[1]);
      mundo.appendChild(el);
    }
  }
  const intervaloMarcas = setInterval(() => {
    if (!raiz.isConnected) { clearInterval(intervaloMarcas); return; }
    if (caca?.piscar || marcasSombra.length) atualizarMarcasSombra();
  }, 600);

  // Pegadas da presa que escapa, por 6 s.
  function pegadas(x0, y0, x1, y1) {
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const el = document.createElement('span');
      el.className = `pegada${i % 2 ? ' dir' : ''}`;
      el.style.left = pct(x0 + (x1 - x0) * t);
      el.style.top = pct(y0 + (y1 - y0) * t + (i % 2 ? 0.006 : -0.006));
      el.style.animationDelay = `${i * 120}ms`;
      mundo.appendChild(el);
      setTimeout(() => el.remove(), 6000);
    }
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

  // Cor média da pintura em volta de um ponto (para tingir o personagem como a gente).
  function corDaPintura(x, y) {
    let r = 0; let g = 0; let b = 0; let n = 0;
    const cx = Math.round(x * (amostra.L - 1));
    const cy = Math.round(y * (amostra.A - 1));
    for (let dy = -3; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const i = (limitar(cy + dy, 0, amostra.A - 1) * amostra.L + limitar(cx + dx, 0, amostra.L - 1)) * 4;
        r += amostra.dados[i]; g += amostra.dados[i + 1]; b += amostra.dados[i + 2]; n++;
      }
    }
    return [r / n, g / n, b / n];
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
    const doAlto = geo.alto && amostra.dados && pes != null;
    if (!doAlto) boneco.style.setProperty('--brilho', limitar(0.7 + L * 0.9 + total * 0.08, 0.74, 1.12).toFixed(3));
    if (doAlto) {
      // Vista do alto (rodada 36): o mesmo tratamento da gente. Brilho pela curva da pintura em volta
      // dos pés (0,3 no escuro, até 0,92 sob o poste) e a cor dali multiplicada sobre a figura.
      boneco.style.setProperty('--brilho', limitar(0.15 + pes * 1.4, 0.3, 0.92).toFixed(3));
      const [pr, pg, pb] = corDaPintura(pos.x, pos.y - 0.01);
      const topo = Math.max(pr, pg, pb, 1);
      tinta.style.backgroundColor = `rgb(${Math.round((pr / topo) * 255)}, ${Math.round((pg / topo) * 255)}, ${Math.round((pb / topo) * 255)})`;
      tinta.style.opacity = '0.8';
    } else if (total > 0.02) {
      tinta.style.backgroundColor = `rgb(${Math.round(r / total)}, ${Math.round(g / total)}, ${Math.round(b / total)})`;
      tinta.style.opacity = Math.min(0.75, 0.15 + total * 1.1).toFixed(3);
    } else {
      tinta.style.opacity = '0';
    }
    // Contorno de luz do lado de onde ela vem; no escuro, um contorno frio de luar mantém a silhueta legível.
    const comLuz = principal && maior > 0.04;
    const lado = comLuz ? Math.sign(principal.x - pos.x) || 1 : -1;
    const [cr, cg, cb] = rgb(comLuz ? principal.cor : '#9ab6dc');
    const alfa = (comLuz ? Math.min(0.5, 0.2 + maior * 0.6) : 0.18) * (geo.alto ? 0.7 : 1); // suave: só do lado da luz; o luar quase some
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

  // Rodada 37: som das coisas vivas da pintura (néon que falha, onda, bonde ou carro que passa), tonal e
  // curto, do lado certo, preso ao momento da animação; só quando acontece perto do personagem. A lanterna,
  // a água, as janelas e a fumaça ficam mudas.
  if (geo.alto) {
    const els = [...mundo.querySelectorAll('.vivos .vivo:not(.vivo-poca)')];
    (geo.vivos || []).forEach((v, i) => {
      const el = els[i];
      const momento = { neon: [7, 0.64, 'zumbido'], onda: [6, 0.22, 'onda'], veiculo: [v.dur || 30, 0.06, v.som || 'bonde'] }[v.tipo];
      if (!el || !momento) return;
      const [dur, fracao, nome] = momento;
      const x = v.tipo === 'veiculo' ? (v.de[0] + v.ate[0]) / 2 : v.x + (v.w || 0) / 2;
      const tocar = () => {
        if (!raiz.isConnected || pausado) return;
        if (Math.abs(x - pos.x) > 0.45) return;
        som.reacao?.(nome, limitar((x - pos.x) * 2.2, -1, 1));
      };
      el.addEventListener('animationiteration', () => setTimeout(tocar, dur * fracao * 1000));
    });
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
    aoFalar?.('ALGUÉM', falaPassagem.textContent);
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
    const foco = focoBeijo || (focoEscolha && performance.now() < focoEscolha.ate ? focoEscolha : null);
    const zAlvo = geo.alto && !foco && !conversa ? nivelZoom() : focoBeijo ? 1.25 : foco ? Math.max(ZOOM, 1.12) : conversa ? ZOOM_CONVERSA : marcado && !estreito ? Math.max(ZOOM, 1.1) : (estreito ? 1 : ZOOM);
    cam.z += (zAlvo - cam.z) * (cameraPronta ? Math.min(1, dt * 4) : 1);
    const W = mw * cam.z;
    const H = mh * cam.z;
    const h = altura(pos.y);
    const fx = (foco ? (pos.x + foco.x) / 2 : marcado ? pos.x * 0.6 + marcado.x * 0.4 : pos.x) * W;
    const fy = (pos.y - h * 0.5) * H;
    let alvoX;
    let alvoY;
    if (geo.alto && !conversa && !foco) {
      // Vista do alto (Fase 2): a câmera é livre. Rola com arrastar, borda da tela e setas; C (ou o botão)
      // volta para o personagem. Ao entrar, começa centrada nele.
      if (camLivre.centrar || !cameraPronta) {
        // Na chegada, enquadra o personagem e a gente da área juntos (ninguém do elenco escondido); o C
        // depois centraliza só no personagem.
        // Na tela estreita (celular), se o elenco não cabe, enquadra o personagem com a pessoa mais perto.
        let fxInicial = fx;
        if (!cameraPronta && gente.length) {
          const xs = [pos.x, ...gente.map((q) => q.x)];
          if ((Math.max(...xs) - Math.min(...xs)) * W <= vw * 0.8) fxInicial = (xs.reduce((sm, x) => sm + x, 0) / xs.length) * W;
          else {
            const perto = gente.reduce((m, q) => (Math.abs(q.x - pos.x) < Math.abs(m.x - pos.x) ? q : m));
            fxInicial = Math.abs(perto.x - pos.x) * W <= vw * 0.8 ? ((pos.x + perto.x) / 2) * W : fx;
          }
        }
        camLivre.x = vw * 0.5 - (camLivre.centrar ? fx : fxInicial);
        camLivre.y = vh * 0.55 - fy;
        if (camLivre.centrar && cameraPronta) camLivre.suave = true;
        camLivre.centrar = false;
      }
      camLivre.x += camLivre.vx * dt;
      camLivre.y += camLivre.vy * dt;
      // Andando para fora do enquadramento, a câmera o acompanha devagar até ele voltar ao meio.
      if (!camLivre.arrastando && !camLivre.vx && !camLivre.vy && (alvo || Math.hypot(vel.x, vel.y) > 0.01)) {
        const sx = camLivre.x + fx;
        const sy = camLivre.y + fy;
        if (sx < vw * 0.18 || sx > vw * 0.82) camLivre.x += (vw * 0.5 - sx) * Math.min(1, dt * 1.5);
        if (sy < vh * 0.2 || sy > vh * 0.8) camLivre.y += (vh * 0.55 - sy) * Math.min(1, dt * 1.5);
      }
      camLivre.x = limitar(camLivre.x, vw - W, 0);
      // No celular em pé, a câmera desce além do pé da pintura a altura dos botões redondos e uma folga,
      // para a faixa de baixo (a saída, o "Mapa do Rio") sair de trás deles.
      const folgaPe = document.body.classList.contains('celular') && !document.body.classList.contains('deitado') ? 72 : 0;
      camLivre.y = limitar(camLivre.y, vh - H - folgaPe, 0);
      // Setas discretas nas bordas quando há mais cena para aquele lado (celular, ordem de 17/10).
      // Onde já há o indicador de pontos fora da tela ("‹ 2", "Caçada +2"), a seta de "mais cena" sobra.
      bordaMais.esq.hidden = camLivre.x > -4 || !setaEsq.hidden;
      bordaMais.dir.hidden = camLivre.x < vw - W + 4 || !setaDir.hidden;
      alvoX = camLivre.x;
      alvoY = camLivre.y;
    } else if (conversa && !estreito && ladoDialogo === 'baixo') {
      // O diálogo sobe do painel de baixo: o personagem vai para o alto, no meio.
      alvoX = vw * 0.5 - fx;
      alvoY = vh * 0.34 - fy;
    } else if (conversa && !estreito) {
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
    const folgaPeCam = geo.alto && document.body.classList.contains('celular') && !document.body.classList.contains('deitado') ? 72 : 0;
    alvoY = conversa && estreito ? Math.min(0, alvoY) : limitar(alvoY, vh - H - folgaPeCam, 0);
    // Movimento reduzido (rodada 42): a câmera vai direto, sem deslizar.
    const k = !cameraPronta || reduzido() || (geo.alto && camLivre.arrastando) ? 1 : Math.min(1, dt * (geo.alto && !camLivre.suave ? 14 : 3));
    if (geo.alto && camLivre.suave && Math.abs(alvoX - cam.x) + Math.abs(alvoY - cam.y) < 2) camLivre.suave = false;
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
    const inicioLaco = medidor ? performance.now() : 0;
    const dtReal = agora - ultimo;
    // Ser visto na caçada: meio segundo mais lento.
    const dt = Math.min(0.12, dtReal / 1000) * (caca?.lentoAte > agora ? 0.35 : 1);
    if (medidor) {
      tempos.push([agora, dtReal]);
      while (tempos.length && agora - tempos[0][0] > 2000) tempos.shift();
      if (agora > proximoMedidor && tempos.length > 1) {
        proximoMedidor = agora + 500;
        const media = tempos.reduce((s, t) => s + t[1], 0) / tempos.length;
        const pior = Math.max(...tempos.map((t) => t[1]));
        const laco = custoLaco.length ? custoLaco.reduce((s, x) => s + x, 0) / custoLaco.length : 0;
        const piorLaco = custoLaco.length ? Math.max(...custoLaco) : 0;
        custoLaco.length = 0;
        if (agora > proximaContagem) {
          proximaContagem = agora + 2000;
          elementos = document.getElementsByTagName('*').length;
          // Nenhuma camada da cena pode rolar: se alguma rolou, o bloco da caçada sai da tela.
          const camadas = [cena, cena.parentElement, ...cena.querySelectorAll('*')];
          rolada = camadas.filter((el) => el && (el.scrollTop || el.scrollLeft)).map((el) => `${el.className || el.tagName} ${el.scrollLeft},${el.scrollTop}`).slice(0, 2).join('; ');
        }
        medidor.textContent = `${Math.round(1000 / media)} qps · pior quadro ${Math.round(pior)} ms · laço ${laco.toFixed(2)} ms (pior ${piorLaco.toFixed(1)}) · ${elementos} elementos${rolada ? ` · ROLOU: ${rolada}` : ''}`;
        medidor.classList.toggle('ruim', media > 25 || pior > 50 || !!rolada);
      }
    }
    ultimo = agora;

    // Pausa (rodada 27): o mundo congela e todos os prazos andam junto com a pausa.
    if (pausado) {
      if (caca) for (const k of Object.keys(caca)) if ((k === 't0' || /Ate$/.test(k)) && typeof caca[k] === 'number') caca[k] += dtReal;
      falaAte += dtReal;
      if (balaoEscolha) balaoEscolha.ate += dtReal;
      for (const [n, ate] of poderesAtivos) poderesAtivos.set(n, ate + dtReal);
      vida.proximoPassante += dtReal; vida.proximaFalha += dtReal; vida.proximoFarol += dtReal; vida.falhaAte += dtReal;
      if (medidor) custoLaco.push(performance.now() - inicioLaco);
      requestAnimationFrame(quadro);
      return;
    }

    let dx = 0;
    let dy = 0;
    if (!camadaAberta() && !semPersonagem) for (const k of teclas) { const v = TECLAS[k]; if (v) { dx += v[0]; dy += v[1]; } }
    if (dx || dy) alvo = null;
    let correndo = teclas.has('shift') || correrSempre;
    if (alvo && !alvo.via) alvo.via = caminho([pos.x, pos.y], [alvo.x, alvo.y]);
    if (alvo?.via?.length && dist(alvo.via[0][0], alvo.via[0][1], pos.x, pos.y) < 0.015) alvo.via.shift();
    if (alvo) {
      correndo ||= !!alvo.correr;
      const [tx, ty] = alvo.via?.length ? alvo.via[0] : [alvo.x, alvo.y];
      const ax = tx - pos.x;
      const ay = ty - pos.y;
      const d = alvo.via?.length ? 1 : dist(alvo.x, alvo.y, pos.x, pos.y);
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
    // A velocidade não cresce com o aumento das figuras do caso (rodada 46), para a perseguição não mudar.
    const fator = limitar(altura(pos.y) / aumento / ALTURA_REF, geo.alto ? 0.6 : 0.45, 1.3) * (correndo ? CORRIDA * (caca?.ligeireza ? 1.55 : 1) : 1) * ritmo;
    const desejadoX = (dx / norma) * VEL_X * fator;
    const desejadoY = (dy / norma) * VEL_Y * fator;
    const k = Math.min(1, dt * ACELERACAO);
    vel.x += (desejadoX - vel.x) * k;
    vel.y += (desejadoY - vel.y) * k;
    if (caca) atualizarCaca(agora, dt, correndo);
    // A pergunta presa a um lugar some se o personagem se afastar dele.
    if (balaoEscolha?.pertoDe && dist(balaoEscolha.pertoDe.x, balaoEscolha.pertoDe.y, pos.x, pos.y) > balaoEscolha.pertoDe.raio) cancelarBalao('longe');
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
        if (sy > sx * (geo.alto ? 1.8 : 1.15)) alvoFolha = (vel.y > 0 ? sprite.frente : sprite.costas) || sprite;
      } else if (agora - paradoDesde > 450 && sprite.respira && !(geo.alto && folha === sprite.costas)) {
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

    if (!alvo && !marcaDestino.hidden) marcaDestino.hidden = true;
    // Pergunta no painel de baixo: o prazo vence como no balão.
    if (balaoEscolha?.noPainel && agora > balaoEscolha.ate + 400) {
      const expirou = balaoEscolha;
      balaoEscolha = null;
      limparPainel();
      expirou.aoExpirar?.();
    }
    // Balão da voz interior acima da cabeça.
    if (!balao.hidden) {
      balao.style.transform = `translate3d(${(pos.x * mw).toFixed(1)}px, ${((pos.y - h) * mh - 10).toFixed(1)}px, 0) translate(-50%, -100%)`;
      balao.classList.toggle('sumindo', agora > falaAte);
      if (agora > falaAte + 400) {
        balao.hidden = true;
        if (!balaoEscolha?.noPainel) {
          const expirou = balaoEscolha;
          balaoEscolha = null;
          expirou?.aoExpirar?.();
        }
      }
    }

    if (proximaLuz === 0 || (agora > proximaLuz && (andando || virando))) { iluminar(); proximaLuz = agora + 100; }
    if (gente.length) andarGente(dt);
    // Oito direções (vista do alto): para cima, a folha de costas; para baixo, a de frente; dos lados e nas
    // diagonais, o perfil, que nas diagonais se inclina para a direção (CSS por data-dir). Parado, fica
    // virado para a última direção.
    if (geo.alto && andando) {
      const ang = Math.atan2(vel.y / VEL_Y, vel.x / VEL_X);
      const dir = ['l', 'se', 's', 'so', 'o', 'no', 'n', 'ne'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
      if (boneco.dataset.dir !== dir) boneco.dataset.dir = dir;
    }
    animarVida(agora, dt);

    // Pontos: discretos aparecem de perto; o mais próximo acende. Checagem a cada 120 ms.
    if (agora > proximaChecagem) {
      proximaChecagem = agora + 120;
      cena.classList.toggle('mostrar-tudo', agora < mostrarTudoAte);
      for (const el of camadaPontos.children) {
        const p = lista.find((x) => x.id === el.dataset.ponto);
        if (p?.discreto) el.classList.toggle('revelado', visivel(p, agora));
        if (veuCtx && p && (p.tipo === 'detalhe' || p.tipo === 'presa')) el.classList.toggle('sob-veu', sobVeu(p.x, p.y));
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
      atualizarVeu();
      checarComentarios();
      checarVestigio();
    }
    if (medidor) custoLaco.push(performance.now() - inicioLaco);
    requestAnimationFrame(quadro);
  }
  const custoLaco = [];
  let proximaContagem = 0;
  let elementos = 0;
  let rolada = '';

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
    if (geo.alto && k.startsWith('arrow')) { camLivre.setas.add(k); atualizarVelCamera(); ev.preventDefault(); return; }
    if (geo.alto && (k === 'c' || k === 'home')) { centrarCamera(); ev.preventDefault(); return; }
    if (geo.alto && k === 'v') { visaoGeral(); ev.preventDefault(); return; }
    if (TECLAS[k]) { teclas.add(k); ev.preventDefault(); return; }
    if (k === 'tab') { ev.preventDefault(); mostrarTudo(); aoMostrarTudo?.(); return; }
    if (k === 'escape' && balaoEscolha) { ev.preventDefault(); cancelarBalao('esc'); return; }
    if (balaoEscolha && /^[1-9]$/.test(k) && caixaDaPergunta().querySelector(`[data-balao="${Number(k) - 1}"]`)) { ev.preventDefault(); responderBalao(Number(k) - 1); return; }
    if (k === ' ') { ev.preventDefault(); alternarPausa(); return; }
    if (k === 'e' || k === 'enter') {
      if (perto) { ev.preventDefault(); interagir(perto); }
      return;
    }
    aoTecla?.(ev);
  };
  const aoSoltar = (ev) => {
    const k = ev.key.toLowerCase();
    teclas.delete(k);
    if (camLivre.setas.delete(k)) atualizarVelCamera();
  };
  const aoPerderFoco = () => { teclas.clear(); camLivre.setas.clear(); atualizarVelCamera(); };

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

  // Rodada 37: no toque, cada pessoa e cada ponto têm uma área invisível de pelo menos 44 × 44 px em
  // volta (o desenho não muda). Um toque que não acertou o desenho vai para o alvo mais perto do dedo.
  const toqueGrosso = window.matchMedia?.('(pointer: coarse)').matches;
  cena.addEventListener('click', (ev) => {
    if (ignorarClique || camadaAberta() || !ev.isTrusted) return;
    if (!(ev.pointerType === 'touch' || (toqueGrosso && ev.pointerType !== 'mouse'))) return;
    if (ev.target.closest('.pessoa, [data-ponto], button, a, .balao-voz, .painel-pergunta, input')) return;
    let melhor = null; let menor = Infinity;
    for (const el of mundo.querySelectorAll('.pessoa, [data-ponto]')) {
      if (el.hidden || el.offsetParent === null) continue;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const meiaL = Math.max(22, r.width / 2);
      const meiaA = Math.max(22, r.height / 2);
      if (Math.abs(ev.clientX - cx) > meiaL || Math.abs(ev.clientY - cy) > meiaA) continue;
      const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
      if (d < menor) { menor = d; melhor = el; }
    }
    if (!melhor) return;
    ev.stopPropagation();
    ev.preventDefault();
    melhor.click();
  }, true);

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
    if (!botao && cliqueNoPersonagem(ev)) return;
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
      alvo = { x, y, ponto: p, correr: longe && !andarSemCorrer(longe) };
      virarPara(x < pos.x);
      esperaAte = performance.now() + (reduzido() ? 0 : 80);
      semProgresso = 0;
      return;
    }
    // Clique no chão: anda até lá (fora do chão, até o ponto de chão mais perto).
    if (semPersonagem) return;
    const [x, y] = maisPertoDentro([px, py], geo.chao, ASPECTO);
    const longeChao = Math.abs(x - pos.x) * mw * cam.z > vw * 0.4;
    alvo = { x, y, correr: longeChao && !andarSemCorrer(longeChao) };
    mostrarDestino(x, y, alvo.correr);
    virarPara(x < pos.x);
    esperaAte = performance.now() + (reduzido() ? 0 : 80);
    semProgresso = 0;
  });
  cena.addEventListener('dblclick', (ev) => {
    // Piscar de sombra em sombra: clique duplo perto de uma marca atravessa até ela.
    if (caca?.piscar && marcasSombra.length) {
      const [px, py] = telaParaPintura(ev.clientX, ev.clientY);
      const m = marcasSombra.find((q) => dist(q[0], q[1], px, py) < 0.06);
      if (m) {
        alvo = null;
        pos.x = m[0];
        pos.y = m[1];
        boneco.classList.add('piscou');
        setTimeout(() => boneco.classList.remove('piscou'), 300);
        atualizarMarcasSombra();
        return;
      }
    }
    if (alvo) { alvo.correr = true; marcaDestino.classList.add('correndo'); }
  });

  document.addEventListener('keydown', aoApertar);
  document.addEventListener('keyup', aoSoltar);
  window.addEventListener('blur', aoPerderFoco);

  // A caixa de conversa abre do lado oposto ao personagem, e a câmera aproxima enquanto ela está aberta.
  const ladoLivre = () => (cam.x + pos.x * mw * cam.z > vw / 2 ? 'esquerda' : 'direita');
  // Com os painéis de pedra à mostra (rodada 25), a conversa abre no painel de baixo.
  const comPaineis = () => !estreito && !!cena.closest('.bg2:not(.paineis-ocultos)');
  const desregistrar = registrarCena({
    lado: () => (comPaineis() ? 'baixo' : ladoLivre()),
    conversa: (aberta) => {
      if (aberta && !conversa) ladoDialogo = comPaineis() ? 'baixo' : ladoLivre();
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
    document.body.classList.remove('cena-pausada');
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
    // Etapa C: a infiltração começa com o personagem num ponto fixo (fora da vista de quem vigia).
    teleportar: (x, y) => { pos.x = x; pos.y = y; vel.x = 0; vel.y = 0; alvo = null; centrarCamera(); },
    deixarRecado: (r) => desenharRecado(r),
    falar,
    perguntarNoBalao,
    apresentar,
    iniciarFurtividade,
    usarPoder,
    beijo,
    pegadas,
    mostrarPoderAtivo,
    ensinar,
    // O momento da caçada, para escolher o poder que mais serve.
    estadoCaca: () => (caca ? { naSombra: luzCaca(pos.x, pos.y) < 0.25, parado: Math.hypot(vel.x, vel.y) < 0.01, dPresa: dist(caca.alvo.x, caca.alvo.y, pos.x, pos.y), noCampo: dentroDoCampo(caca, pos.x, pos.y) } : null),
    // Aviso curto dentro do bloco da caçada (2,5 s).
    avisoCaca: (texto) => {
      const el = document.createElement('span');
      el.className = 'aviso-caca';
      el.textContent = texto;
      atencaoEl.insertBefore(el, atencaoEl.querySelector('.caca-ajuda'));
      setTimeout(() => el.remove(), 2500);
    },
    ajustarCaca: (fn) => { if (caca) fn(caca); },
    textoDoBalao: (html) => { if (balaoEscolha) { const t = caixaDaPergunta().querySelector('.balao-texto'); if (t) t.innerHTML = html; } },
    emFurtividade: () => !!caca,
    // Anda até um ponto (de frente, na caçada: ele vai direto até a presa).
    irAte: (p) => {
      const [x, y] = p.parada && dentro(p.parada, geo.chao) ? p.parada : maisPertoDentro([p.x, p.y], geo.chao, ASPECTO);
      alvo = { x, y, correr: Math.abs(x - pos.x) * mw * cam.z > vw * 0.4 };
      virarPara(x < pos.x);
      semProgresso = 0;
    },
    marcarEscolha,
    lembrar,
    pausar,
    soltar,
    alternarPausa,
    pausado: () => pausado,
    centrarCamera,
    visaoGeral,
    virarPessoaPara,
    vistaDoAlto: !!geo.alto,
    depoisDaPausa: (fn) => { if (pausado) aoSoltarPausa.push(fn); else fn(); },
    cancelarFurtividade: () => { if (caca) { caca.aoFim = null; encerrarFurtividade(false); } },
    // Caso (formato v3): a perseguição move uma pessoa pela pintura e muda o passo do personagem.
    pessoa: (id) => gente.find((g) => g.id === `pessoa-${id}`) || null,
    moverPessoa: (id, x, y, dir) => {
      const p = gente.find((g) => g.id === `pessoa-${id}`);
      if (!p) return;
      p.x = x; p.y = y;
      if (dir) p.dir = dir;
      posicionarPessoa(p);
    },
    esconderPessoa: (id, sim = true) => {
      const p = gente.find((g) => g.id === `pessoa-${id}`);
      if (!p) return;
      p.escondida = sim;
      p.el.style.display = sim ? 'none' : '';
    },
    definirRitmo: (f = 1) => { ritmo = f; },
    correr: (sim = true) => { correrSempre = sim; },
    // A câmera enquadra o personagem e um ponto (quem foge) juntos, com o zoom um pouco mais aberto.
    focar: (x, y, ms = 300) => { focoEscolha = { x, y, ate: performance.now() + ms }; },
    olharPara,
    desmontar,
  };
}
