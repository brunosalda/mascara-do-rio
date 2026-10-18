// Perseguição (formato v3): quem foge corre sempre para longe de você, pelo chão da pintura, quase tão
// rápido quanto você. Ele derruba cadeiras atrás de si (e perde um instante nisso) e acelera quando você
// encosta. O jeito de pegá-lo é encurralar: nos cantos e contra as paredes, ele precisa passar por você.
// Depois de alguns segundos, ele corre para a saída (a rua dos Arcos, na Lapa).
// Você corre sem segurar Shift. Alcançar = pego. Ele chegar à saída ou sumir longe = escapou.
// Ajudas: a Arrancada (Rapidez, usa o sangue) ou Forçar o passo (gasta Força de Vontade), e a
// ordem "Pare!" (Dominação). Quem não quer depender de reflexo toca em "Deixar os dados decidirem".
import { geografia, dentro } from '../jogo/lugares.js';
import { camadaAberta } from '../jogo/camadas.js';
import { som } from '../ambiente.js';
import { esc } from '../ui.js';

// Os mesmos números do motor da cena (cena.js), para a corrida dele valer a do personagem.
const VEL_X = 0.18;
const VEL_Y = 0.15;
const CORRIDA = 1.7;
const ALTURA_REF = 0.3;
const PEGA = 0.07;        // distância para alcançar (em alturas da pintura, como a cena mede)
const LONGE = 0.9;        // a partir daqui ele some de vista
const TEMPO_LONGE = 4;    // segundos longe até perder
const TROPECO = 0.035;    // raio de uma cadeira derrubada
const SUSTO = 400;        // ms em que você fica parado na largada
const PARADA_CADEIRA = 260; // ms que ele perde para derrubar uma cadeira
const DIRECOES = 24;      // direções que ele testa para fugir
const FUGA_ABERTA = 8;    // nos primeiros segundos, ele prefere o lado com mais chão livre (não se encurrala logo)

const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

export function iniciarPerseguicao({ cena, palco, camadas, cfg, nome, poderes = {}, aoUsarSangue, aoGastarVontade, aoFim }) {
  const geo = geografia(`${cfg.lugar}-alto`);
  const aspecto = geo.aspecto || 1344 / 576;
  const dist = (ax, ay, bx, by) => Math.hypot((ax - bx) * aspecto, ay - by);
  const altura = (y) => Math.max(0.05, geo.k * (y - geo.horizonte));
  const mundo = palco.querySelector('.mundo');
  const pessoa = cena.pessoa(cfg.pessoa);
  if (!pessoa || !mundo) { aoFim?.('escapou'); return () => {}; }

  let x = pessoa.x;
  let y = pessoa.y;
  const livre = ([qx, qy]) => dentro([qx, qy], geo.chao) && !(geo.obstaculos || []).some((o) => dentro([qx, qy], o));
  // Começa virado para longe de você.
  let ang = Math.atan2(0, x - cena.posicao().x >= 0 ? 1 : -1);
  {
    // O empurrão: ele se solta de você antes de correr (um passo na direção oposta à sua, se houver chão).
    const voce = cena.posicao();
    const dx = (x - voce.x) * aspecto;
    const dy = y - voce.y;
    const n = Math.hypot(dx, dy) || 1;
    const passo = [x + (dx / n) * 0.05 / aspecto, y + (dy / n) * 0.02];
    if (dentro(passo, geo.chao)) { [x, y] = passo; cena.moverPessoa(cfg.pessoa, x, y, dx < 0 ? -1 : 1); }
  }
  let proximaDecisao = 0;
  let proximaCadeira = 0;
  let avisouSaida = false;
  let mensagemAte = 0;
  let dribleAte = 0;
  let proximoDrible = 0;
  let marcaSaida = null;
  let longe = 0;
  let impulsoAte = 0;
  let proximoImpulso = 0;
  let tropecoAte = 0;
  let arrancadaAte = 0;
  let paradoAte = 0;
  let usouSangue = false;
  let acabou = false;
  let ultimo = performance.now();
  const inicio = performance.now() + SUSTO;
  const cadeiras = [];

  pessoa.fugindo = true;
  pessoa.el.classList.add('foge');
  cena.correr(true);
  document.body.classList.add('em-perseguicao');

  const hud = document.createElement('div');
  hud.className = 'perseguicao-hud';
  hud.setAttribute('role', 'status');
  hud.innerHTML = `
    <b class="perseguicao-titulo">${esc(nome)} foge!</b>
    <span class="perseguicao-distancia"><i></i></span>
    <span class="perseguicao-palavra">ele larga na frente</span>
    <span class="perseguicao-botoes">
      ${poderes.rapidez
        ? '<button type="button" class="btn-secundario" data-fuga="arrancada">Arrancada <small>Rapidez</small><kbd>R</kbd></button>'
        : '<button type="button" class="btn-secundario" data-fuga="forcar">Forçar o passo <small>Força de Vontade</small><kbd>R</kbd></button>'}
      ${poderes.compelir ? '<button type="button" class="btn-secundario" data-fuga="ordem" disabled>“Pare!” <small>Dominação</small><kbd>G</kbd></button>' : ''}
      <button type="button" class="btn-texto" data-fuga="dados">Deixar os dados decidirem</button>
    </span>
    <span class="perseguicao-dica"><span class="so-teclado">Você corre sozinho: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou clique. </span><span class="so-toque">Toque para onde correr. </span>Ele é quase tão rápido quanto você: corte caminho nas curvas.</span>`;
  camadas.appendChild(hud);
  const barra = hud.querySelector('.perseguicao-distancia i');
  const palavra = hud.querySelector('.perseguicao-palavra');
  const botaoOrdem = hud.querySelector('[data-fuga="ordem"]');
  const botaoPasso = hud.querySelector('[data-fuga="arrancada"], [data-fuga="forcar"]');

  // Seta na borda da tela quando ele sai do enquadramento.
  const seta = document.createElement('span');
  seta.className = 'perseguicao-seta';
  seta.hidden = true;
  seta.textContent = nome;
  camadas.appendChild(seta);

  const letreiro = document.createElement('div');
  letreiro.className = 'perseguicao-letreiro';
  letreiro.textContent = `${nome} corre!`;
  camadas.appendChild(letreiro);
  setTimeout(() => letreiro.remove(), 1300);
  som.reacao?.('susto', 0);

  function derrubarCadeira() {
    const el = document.createElement('span');
    el.className = 'cadeira-caida';
    el.style.left = `${(x * 100).toFixed(2)}%`;
    el.style.top = `${(y * 100).toFixed(2)}%`;
    el.style.height = `${(altura(y) * 55).toFixed(2)}%`;
    el.style.zIndex = String(Math.round(y * 1000) - 1);
    mundo.appendChild(el);
    cadeiras.push({ x, y, el, ativa: true });
    som.reacao?.('queda', (x - 0.5) * 1.6);
    paradoAte = performance.now() + PARADA_CADEIRA;
  }

  function passo() {
    arrancadaAte = performance.now() + (poderes.rapidez ? 3000 : 2200);
    botaoPasso?.setAttribute('disabled', '');
    setTimeout(() => { if (!acabou) botaoPasso?.removeAttribute('disabled'); }, 6000);
  }
  function acao(tipo) {
    if (acabou || performance.now() < inicio) return;
    if (tipo === 'dados') { terminar('dados'); return; }
    if (performance.now() < arrancadaAte && (tipo === 'arrancada' || tipo === 'forcar')) return;
    if (tipo === 'arrancada' && poderes.rapidez) {
      if (!usouSangue) { usouSangue = true; aoUsarSangue?.('Rapidez'); }
      passo();
    }
    if (tipo === 'forcar' && !poderes.rapidez) {
      if (!aoGastarVontade?.()) { palavra.textContent = 'sem Força de Vontade'; return; }
      passo();
    }
    if (tipo === 'ordem' && poderes.compelir) {
      const p = cena.posicao();
      if (dist(p.x, p.y, x, y) > 0.3) return;
      if (!usouSangue) { usouSangue = true; aoUsarSangue?.('Dominação'); }
      terminar('pego');
    }
  }
  hud.addEventListener('click', (ev) => { const b = ev.target.closest('[data-fuga]'); if (b) { ev.stopPropagation(); acao(b.dataset.fuga); } });
  const aoApertar = (ev) => {
    if (camadaAberta()) return;
    const k = ev.key.toLowerCase();
    if (k === 'r') acao(poderes.rapidez ? 'arrancada' : 'forcar');
    if (k === 'g') acao('ordem');
  };
  document.addEventListener('keydown', aoApertar);

  function terminar(resultado) {
    if (acabou) return;
    acabou = true;
    document.removeEventListener('keydown', aoApertar);
    document.body.classList.remove('em-perseguicao');
    hud.remove();
    seta.remove();
    letreiro.remove();
    cadeiras.forEach((c) => c.el.classList.add('some'));
    setTimeout(() => cadeiras.forEach((c) => c.el.remove()), 1500);
    marcaSaida?.remove();
    pessoa.el.classList.remove('foge');
    cena.correr(false);
    if (resultado !== 'pego') {
      pessoa.fugindo = false;
      cena.definirRitmo(1);
      aoFim?.(resultado, { x, y });
      return;
    }
    // O agarrão: meio segundo de câmera lenta, a câmera fecha nos dois e um baque.
    som.reacao?.('impacto', 0);
    cena.definirRitmo(0);
    const elCena = palco.querySelector('.cena');
    elCena?.classList.add('camera-lenta', 'agarrao');
    const fechar = setInterval(() => cena.focar(x, y, 300), 60);
    setTimeout(() => {
      clearInterval(fechar);
      elCena?.classList.remove('camera-lenta', 'agarrao');
      pessoa.fugindo = false;
      cena.definirRitmo(1);
      aoFim?.(resultado, { x, y });
    }, 700);
  }

  function quadro(agora) {
    if (acabou) return;
    if (!palco.isConnected) { terminar('escapou'); return; }
    const dt = Math.min(0.06, (agora - ultimo) / 1000);
    ultimo = agora;
    if (cena.pausado() || camadaAberta()) { requestAnimationFrame(quadro); return; }
    // O seu passo: parado no susto da largada, rápido na arrancada, lento no tropeço.
    cena.definirRitmo(agora < inicio ? 0 : agora < arrancadaAte ? (poderes.rapidez ? 1.6 : 1.4) : agora < tropecoAte ? 0.4 : 1);

    // Ele foge: a cada instante testa as direções e escolhe a que mais o afasta de você, sem sair do chão.
    // Depois de cfg.tempoSaida segundos, prefere a saída. Acelera quando você encosta.
    const p = cena.posicao();
    const d = dist(p.x, p.y, x, y);
    const t = (agora - inicio) / 1000;
    const paraSaida = t > cfg.tempoSaida;
    if (paraSaida && !avisouSaida) {
      avisouSaida = true;
      palavra.textContent = cfg.avisoSaida || 'ele corre para a saída';
      mensagemAte = agora + 1800;
      marcaSaida = document.createElement('span');
      marcaSaida.className = 'saida-fuga';
      marcaSaida.style.left = `${(cfg.saida[0] * 100).toFixed(2)}%`;
      marcaSaida.style.top = `${(cfg.saida[1] * 100).toFixed(2)}%`;
      marcaSaida.style.zIndex = String(Math.round(cfg.saida[1] * 1000) - 1);
      mundo.appendChild(marcaSaida);
    }
    if (d < 0.18 && agora > proximoImpulso) { impulsoAte = agora + 900; proximoImpulso = agora + 3000; }
    const fator = limitar(altura(y) / ALTURA_REF, 0.6, 1.3) * CORRIDA * cfg.velocidade * (agora < dribleAte ? 1.4 : agora < impulsoAte ? 1.1 : 1);
    if (agora > proximaDecisao && agora > dribleAte) {
      proximaDecisao = agora + 110;
      let melhor = null;
      for (let k = 0; k < DIRECOES; k++) {
        const th = (k / DIRECOES) * Math.PI * 2;
        const ux = Math.cos(th);
        const uy = Math.sin(th);
        const q = [x + ux * VEL_X * fator * 0.45, y + uy * VEL_Y * fator * 0.45];
        if (!livre(q)) continue;
        const q2 = [x + ux * VEL_X * fator * 0.9, y + uy * VEL_Y * fator * 0.9];
        // Quanto chão livre há nessa direção, até 1,2 s à frente.
        let espaco = 0;
        for (const s of [0.3, 0.6, 0.9, 1.2, 1.5]) { if (!livre([x + ux * VEL_X * fator * s, y + uy * VEL_Y * fator * s])) break; espaco = s; }
        let nota = dist(q[0], q[1], p.x, p.y) + 0.1 * Math.cos(th - ang) - (livre(q2) ? 0 : 0.25) + (t < FUGA_ABERTA ? 0.45 : 0.1) * espaco - (espaco < 0.6 ? 0.2 : 0);
        if (paraSaida) nota = 0.6 * dist(q[0], q[1], p.x, p.y) - 1.4 * dist(q[0], q[1], cfg.saida[0], cfg.saida[1]) + 0.05 * Math.cos(th - ang);
        if (!melhor || nota > melhor.nota) melhor = { nota, th, espaco };
      }
      if (melhor) ang = melhor.th;
      // Com você quase encostando, ele tenta escapar pelo lado num arranque curto (no máximo a cada 3,2 s).
      if (melhor && !paraSaida && d < 0.17 && agora > proximoDrible && agora > inicio + 600) {
        const deVoce = Math.atan2(y - p.y, (x - p.x) * aspecto);
        const opcoes = [deVoce + 1.75, deVoce - 1.75].map((th) => {
          let esp = 0;
          for (const s2 of [0.2, 0.4, 0.6]) { if (!livre([x + Math.cos(th) * VEL_X * fator * 1.35 * s2, y + Math.sin(th) * VEL_Y * fator * 1.35 * s2])) break; esp = s2; }
          return { th, esp };
        }).sort((a, b) => b.esp - a.esp);
        if (opcoes[0].esp > 0) {
          ang = opcoes[0].th;
          dribleAte = agora + 620;
          proximoDrible = agora + 3200;
          palavra.textContent = 'ele dribla você';
          mensagemAte = agora + 1200;
        }
      }
    }
    if (agora >= paradoAte) {
      const nx = x + Math.cos(ang) * VEL_X * fator * dt;
      const ny = y + Math.sin(ang) * VEL_Y * fator * dt;
      if (livre([nx, ny])) { x = nx; y = ny; } else proximaDecisao = 0;
      cena.moverPessoa(cfg.pessoa, x, y, Math.cos(ang) < 0 ? -1 : 1);
      // Com você perto e atrás dele, de tempos em tempos ele derruba uma cadeira.
      if (agora > inicio && d < 0.35 && agora > proximaCadeira && cadeiras.length < (cfg.cadeiras ?? 4)) { proximaCadeira = agora + 2600 + Math.random() * 1200; derrubarCadeira(); }
      if (paraSaida && dist(x, y, cfg.saida[0], cfg.saida[1]) < 0.05) { terminar('escapou'); return; }
    }
    cena.focar(x, y, 400);

    // Cadeira no caminho: você tropeça e perde o passo por um instante.
    for (const c of cadeiras) {
      if (c.ativa && dist(c.x, c.y, p.x, p.y) < TROPECO) {
        c.ativa = false;
        c.el.classList.add('chutada');
        if (agora > arrancadaAte) tropecoAte = agora + 700;
        palavra.textContent = 'você tropeça na cadeira';
        mensagemAte = agora + 1600;
        som.reacao?.('queda', 0);
      }
    }

    // Na largada ele empurra você e sai: só dá para pegá-lo depois do primeiro segundo.
    if (agora > inicio + 600 && d < PEGA) { terminar('pego'); return; }
    longe = d > LONGE ? longe + dt : 0;
    if (longe > TEMPO_LONGE) { terminar('escapou'); return; }

    // O quanto falta: uma barra que enche quando você chega perto, e uma palavra.
    const perto = limitar(1 - (d - PEGA) / (LONGE - PEGA), 0, 1);
    barra.style.transform = `scaleX(${perto.toFixed(3)})`;
    hud.dataset.nivel = d < 0.14 ? 'colado' : d < 0.35 ? 'perto' : d < 0.65 ? 'longe' : 'sumindo';
    if (agora > mensagemAte) {
      const txt = agora < inicio ? 'ele larga na frente' : d < 0.14 ? 'colado nele' : d < 0.35 ? 'perto' : d < 0.65 ? 'ele ganha distância' : longe > 0 ? 'sumindo de vista' : 'longe';
      if (palavra.textContent !== txt) palavra.textContent = txt;
    }
    if (botaoOrdem) botaoOrdem.disabled = d > 0.3;

    // Seta na borda quando ele está fora da tela.
    const r = pessoa.el.getBoundingClientRect();
    const rc = camadas.getBoundingClientRect();
    const fora = r.right < rc.left || r.left > rc.right || r.bottom < rc.top || r.top > rc.bottom;
    seta.hidden = !fora;
    if (fora) {
      const cx = limitar(r.left + r.width / 2 - rc.left, 40, rc.width - 40);
      const cy = limitar(r.top + r.height / 2 - rc.top, 60, rc.height - 60);
      seta.style.left = `${cx}px`;
      seta.style.top = `${cy}px`;
      seta.dataset.lado = r.right < rc.left ? 'esq' : r.left > rc.right ? 'dir' : r.bottom < rc.top ? 'cima' : 'baixo';
    }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  return () => terminar('escapou');
}
