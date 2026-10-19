// Infiltração (etapa C): chegar a um ponto e ficar lá alguns segundos sem cair no leque de quem vigia.
// Quem vigia anda por uma rota fixa, para e olha em volta; o leque fica amarelo pouco antes de girar e
// vermelho quando vê você (ser visto só conta depois de meio segundo: dá tempo de sair).
// A conta é a de simulacao.js (inteiros, 20 passos por segundo); o caminho do jogador fica gravado para
// o banco refazer e conferir. Quem não quer depender de reflexo toca em "Deixar os dados decidirem".
import { camadaAberta } from '../jogo/camadas.js';
import { som } from '../ambiente.js';
import { esc } from '../ui.js';
import * as S from './simulacao.js';

const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

// cfg: { lugar, inicio: [x, y], alvo: [x, y], raioAlvo, ficar, raioVisao, abertura, rotulo,
//        vigias: [{ pessoa, rota: [[x, y], ...] (de 0 a 1), vel, pausa }] }, com geoInteira opcional.
// aoFim(resultado, registro): resultado = 'conseguiu' | 'visto' | 'dados' | 'distraido'.
export function iniciarInfiltracao({ cena, palco, camadas, cfg, semente = 1, aoFim }) {
  const mundo = palco.querySelector('.mundo');
  const I = (v) => Math.round(v * S.ESCALA);
  const sim = S.novaInfiltracao({
    alvo: [I(cfg.alvo[0]), I(cfg.alvo[1])], raioAlvo: cfg.raioAlvo, ficar: cfg.ficar, raioVisao: cfg.raioVisao, abertura: cfg.abertura,
    semente: Math.max(1, semente % 2147483647),
    vigias: cfg.vigias.map((v) => ({ pessoa: v.pessoa, rota: v.rota.map(([x, y]) => [I(x), I(y)]), vel: v.vel, pausa: v.pausa })),
  });
  if (!mundo || cfg.vigias.some((v) => !cena.pessoa(v.pessoa))) { aoFim?.('visto', null); return () => {}; }

  cena.teleportar(cfg.inicio[0], cfg.inicio[1]);
  const caminho = [I(cfg.inicio[0]), I(cfg.inicio[1])];
  let antes = sim.vigias.map((v) => ({ x: v.x, y: v.y }));
  let acabou = false;
  const comeco = performance.now();
  document.body.classList.add('em-perseguicao', 'em-infiltracao');

  // Os leques e o alvo, desenhados sobre a pintura (a mesma técnica do leque da caçada).
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'infiltracao-leques');
  svg.setAttribute('viewBox', '0 0 1 1');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${cfg.vigias.map(() => '<path class="leque-vigia" d=""/>').join('')}<ellipse class="alvo-infiltracao" cx="${cfg.alvo[0]}" cy="${cfg.alvo[1]}" rx="${(cfg.raioAlvo / 7 / S.ESCALA).toFixed(4)}" ry="${(cfg.raioAlvo / 6 / S.ESCALA).toFixed(4)}"/>`;
  mundo.appendChild(svg);
  const leques = [...svg.querySelectorAll('.leque-vigia')];
  const alvoEl = svg.querySelector('.alvo-infiltracao');
  const meia = Math.acos(cfg.abertura / 1000);
  function desenharLeque(el, v, estado) {
    const cx = v.x / S.ESCALA;
    const cy = v.y / S.ESCALA;
    const base = (v.dir / 24) * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const a = base - meia + (2 * meia * i) / 10;
      pts.push(`${(cx + (Math.cos(a) * cfg.raioVisao) / 7 / S.ESCALA).toFixed(4)},${(cy + (Math.sin(a) * cfg.raioVisao) / 6 / S.ESCALA).toFixed(4)}`);
    }
    el.setAttribute('d', `M${cx.toFixed(4)},${cy.toFixed(4)} L${pts.join(' L')} Z`);
    el.setAttribute('class', `leque-vigia ${estado}`);
  }

  const hud = document.createElement('div');
  hud.className = 'perseguicao-hud infiltracao-hud';
  hud.setAttribute('role', 'status');
  hud.innerHTML = `
    <b class="perseguicao-titulo">${esc(cfg.rotulo || 'Chegue sem ser visto')}</b>
    <span class="perseguicao-distancia infiltracao-progresso"><i></i></span>
    <span class="perseguicao-palavra">fique fora dos leques</span>
    <span class="perseguicao-botoes"><button type="button" class="btn-texto" data-infiltracao="dados">Deixar os dados decidirem</button></span>
    <span class="perseguicao-dica"><span class="so-teclado">Ande com <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou clique. </span><span class="so-toque">Toque para onde ir. </span>O leque amarelo vai girar; o vermelho já viu você. Fique no círculo até a barra encher.</span>`;
  camadas.appendChild(hud);
  const barra = hud.querySelector('.infiltracao-progresso i');
  const palavra = hud.querySelector('.perseguicao-palavra');
  hud.addEventListener('click', (ev) => { if (ev.target.closest('[data-infiltracao="dados"]')) { ev.stopPropagation(); terminar('dados'); } });
  const aoDistrair = () => { if (!acabou && (document.hidden || !document.hasFocus())) terminar('distraido'); };
  document.addEventListener('visibilitychange', aoDistrair);
  window.addEventListener('blur', aoDistrair);
  som.reacao?.('susto', 0);

  function terminar(resultado) {
    if (acabou) return;
    acabou = true;
    document.removeEventListener('visibilitychange', aoDistrair);
    window.removeEventListener('blur', aoDistrair);
    document.body.classList.remove('em-perseguicao', 'em-infiltracao');
    hud.remove();
    svg.remove();
    if (resultado === 'visto') som.reacao?.('susto', 0);
    aoFim?.(resultado, { semente, caminho: [...caminho], passos: sim.passo });
  }

  function avancar() {
    let jx = caminho[0];
    let jy = caminho[1];
    if (sim.passo > 0) {
      const p = cena.posicao();
      jx = I(p.x);
      jy = I(p.y);
      caminho.push(jx, jy);
    }
    antes = sim.vigias.map((v) => ({ x: v.x, y: v.y }));
    S.passoDaInfiltracao(sim, jx, jy);
  }

  function quadro(agora) {
    if (acabou) return;
    if (!palco.isConnected) { terminar('visto'); return; }
    if (camadaAberta()) { requestAnimationFrame(quadro); return; }
    const devido = Math.floor((agora - comeco) / S.PASSO_MS);
    while (sim.passo <= devido && !sim.fim) avancar();
    if (sim.fim) { terminar(sim.fim); return; }
    const k = limitar((agora - comeco - (sim.passo - 1) * S.PASSO_MS) / S.PASSO_MS, 0, 1);
    sim.vigias.forEach((v, i) => {
      const x = (antes[i].x + (v.x - antes[i].x) * k) / S.ESCALA;
      const y = (antes[i].y + (v.y - antes[i].y) * k) / S.ESCALA;
      cena.moverPessoa(v.pessoa, x, y, S.COS[v.dir] < 0 ? -1 : 1);
      // Amarelo: parado e prestes a girar o olhar. Vermelho: está vendo você.
      const parado = sim.passo < v.pausaAte;
      const vaiGirar = parado && (sim.passo - v.pausaDesde) % S.V.OLHAR_A_CADA >= S.V.OLHAR_A_CADA - 8;
      const p = cena.posicao();
      const ve = S.noLeque(v, I(p.x), I(p.y), cfg.raioVisao, cfg.abertura);
      desenharLeque(leques[i], { x: x * S.ESCALA, y: y * S.ESCALA, dir: v.dir }, ve ? 've' : vaiGirar ? 'vai-girar' : '');
    });
    // A câmera enquadra você e o alvo juntos (no celular, a tela é estreita: ela segue você).
    if (!document.body.classList.contains('celular')) cena.focar(cfg.alvo[0], cfg.alvo[1], 400);
    const f = sim.noAlvo / cfg.ficar;
    barra.style.transform = `scaleX(${limitar(f, 0, 1).toFixed(3)})`;
    alvoEl.classList.toggle('dentro', sim.noAlvo > 0);
    const txt = sim.visto > 0 ? 'cuidado: ela está vendo você' : sim.noAlvo > 0 ? 'fique aí mais um pouco' : 'fique fora dos leques';
    if (palavra.textContent !== txt) palavra.textContent = txt;
    hud.dataset.nivel = sim.visto > 0 ? 'colado' : sim.noAlvo > 0 ? 'perto' : 'longe';
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  return () => terminar('visto');
}
