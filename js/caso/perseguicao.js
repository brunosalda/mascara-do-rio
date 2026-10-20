// Perseguição (formato v3): quem foge corre sempre para longe de você, pelo chão da pintura, quase tão
// rápido quanto você. Ele derruba cadeiras atrás de si (e perde um instante nisso) e acelera quando você
// encosta. O jeito de pegá-lo é encurralar: nos cantos e contra as paredes, ele precisa passar por você.
// Depois de alguns segundos, ele corre para a saída (a rua dos Arcos, na Lapa).
// Você corre sem segurar Shift. Alcançar = pego. Ele chegar à saída ou sumir longe = escapou.
// Ajudas: a Arrancada (Rapidez, usa o sangue) ou Forçar o passo (gasta Força de Vontade), e a
// ordem "Pare!" (Dominação). Quem não quer depender de reflexo toca em "Deixar os dados decidirem".
//
// Etapa C: a fuga é a simulação inteira de simulacao.js, a 20 passos por segundo (a tela desenha entre um
// passo e outro). A cada passo, a posição do jogador entra no caminho que vai ao banco no fim; o banco
// refaz a fuga com a mesma semente e confere o resultado.
import { geografia } from '../jogo/lugares.js';
import { camadaAberta } from '../jogo/camadas.js';
import { som } from '../ambiente.js';
import { esc } from '../ui.js';
import * as S from './simulacao.js';

const TROPECO = 350;      // raio de uma cadeira derrubada (× 10000)
const LONGE_VISTA = S.C.LONGE;
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

// semente: o sorteio da fuga (na temporada, vem do banco). aoFim(resultado, pos, registro): registro traz o
// caminho do jogador, as arrancadas e a ordem, para o banco conferir.
export function iniciarPerseguicao({ cena, palco, camadas, cfg, nome, poderes = {}, semente = 1, aoUsarSangue, aoGastarVontade, aoFim }) {
  const geo = geografia(`${cfg.lugar}-alto`);
  const g = cfg.geoInteira || S.geoInteira(geo);
  const mundo = palco.querySelector('.mundo');
  const pessoa = cena.pessoa(cfg.pessoa);
  if (!pessoa || !mundo) { aoFim?.('escapou'); return () => {}; }

  const I = (v) => Math.round(v * S.ESCALA);
  const voce0 = cena.posicao();
  const caminho = [I(voce0.x), I(voce0.y)];
  const impulsos = [];
  let ordemNoPasso = null;
  let ordemPendente = false;
  const fuga = S.novaFuga({
    g, x: I(pessoa.x), y: I(pessoa.y), saida: [I(cfg.saida[0]), I(cfg.saida[1])], tempoSaida: cfg.tempoSaida,
    velocidade: Math.round((cfg.velocidade ?? 1) * 1000), cadeiras: cfg.cadeiras ?? 4, semente: Math.max(1, semente % 2147483647),
  }, { x: caminho[0], y: caminho[1] });
  let antes = { x: fuga.x, y: fuga.y };
  cena.moverPessoa(cfg.pessoa, fuga.x / S.ESCALA, fuga.y / S.ESCALA, fuga.x < caminho[0] ? -1 : 1);

  let mensagemAte = 0;
  let marcaSaida = null;
  let tropecoAte = 0;
  let arrancadaAte = 0;
  let usouSangue = false;
  let acabou = false;
  const comeco = performance.now();
  const inicio = comeco + S.C.SUSTO * S.PASSO_MS;
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
  // A dica de controles some depois de 3 s (a avaliação: o painel cobria a cena).
  setTimeout(() => hud.classList.add('dica-sumiu'), 3000);
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

  const altura = (y) => Math.max(0.05, geo.k * (y - geo.horizonte));
  function derrubarCadeira([cx, cy]) {
    const x = cx / S.ESCALA;
    const y = cy / S.ESCALA;
    const el = document.createElement('span');
    el.className = 'cadeira-caida';
    el.style.left = `${(x * 100).toFixed(2)}%`;
    el.style.top = `${(y * 100).toFixed(2)}%`;
    el.style.height = `${(altura(y) * 55).toFixed(2)}%`;
    el.style.zIndex = String(Math.round(y * 1000) - 1);
    mundo.appendChild(el);
    cadeiras.push({ x: cx, y: cy, el, ativa: true });
    som.reacao?.('queda', (x - 0.5) * 1.6);
  }

  function passo() {
    arrancadaAte = performance.now() + (poderes.rapidez ? 3000 : 2200);
    impulsos.push(fuga.passo);
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
      if (fuga.distancia > S.C.ORDEM_ALCANCE) return;
      if (!usouSangue) { usouSangue = true; aoUsarSangue?.('Dominação'); }
      ordemPendente = true; // vale no próximo passo da simulação
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
  // Sem pausa na corrida: se a aba some ou a janela perde o foco no meio, ele escapa ('distraido').
  const aoDistrair = () => { if (!acabou && (document.hidden || !document.hasFocus())) terminar('distraido'); };
  document.addEventListener('visibilitychange', aoDistrair);
  window.addEventListener('blur', aoDistrair);

  const registro = () => ({ semente, caminho: [...caminho], impulsos: [...impulsos], ordem: ordemNoPasso, passos: fuga.passo });

  function terminar(resultado) {
    if (acabou) return;
    acabou = true;
    document.removeEventListener('keydown', aoApertar);
    document.removeEventListener('visibilitychange', aoDistrair);
    window.removeEventListener('blur', aoDistrair);
    document.body.classList.remove('em-perseguicao');
    hud.remove();
    seta.remove();
    letreiro.remove();
    cadeiras.forEach((c) => c.el.classList.add('some'));
    setTimeout(() => cadeiras.forEach((c) => c.el.remove()), 1500);
    marcaSaida?.remove();
    pessoa.el.classList.remove('foge');
    cena.correr(false);
    const pos = { x: fuga.x / S.ESCALA, y: fuga.y / S.ESCALA };
    if (resultado !== 'pego') {
      pessoa.fugindo = false;
      cena.definirRitmo(1);
      aoFim?.(resultado, pos, registro());
      return;
    }
    // O agarrão: meio segundo de câmera lenta, a câmera fecha nos dois e um baque.
    som.reacao?.('impacto', 0);
    cena.definirRitmo(0);
    const elCena = palco.querySelector('.cena');
    elCena?.classList.add('camera-lenta', 'agarrao');
    const fechar = setInterval(() => cena.focar(pos.x, pos.y, 300), 60);
    setTimeout(() => {
      clearInterval(fechar);
      elCena?.classList.remove('camera-lenta', 'agarrao');
      pessoa.fugindo = false;
      cena.definirRitmo(1);
      aoFim?.(resultado, pos, registro());
    }, 700);
  }

  // Um passo da simulação: a posição do jogador entra no caminho, e a fuga anda.
  function avancar() {
    // O caminho tem uma posição por passo: no passo 0, a da largada (a mesma que o banco vai usar).
    let jx = caminho[0];
    let jy = caminho[1];
    if (fuga.passo > 0) {
      const p = cena.posicao();
      jx = I(p.x);
      jy = I(p.y);
      caminho.push(jx, jy);
    }
    const ordem = ordemPendente;
    ordemPendente = false;
    antes = { x: fuga.x, y: fuga.y };
    S.passoDaFuga(fuga, jx, jy, { ordem, temOrdem: !!poderes.compelir });
    if (ordem && fuga.fim === 'pego') ordemNoPasso = fuga.passo - 1;
    for (const e of fuga.eventos) {
      if (e === 'cadeira') derrubarCadeira(fuga.cadeiras.at(-1));
      if (e === 'drible') { palavra.textContent = 'ele dribla você'; mensagemAte = performance.now() + 1200; }
      if (e === 'saida') {
        palavra.textContent = cfg.avisoSaida || 'ele corre para a saída';
        mensagemAte = performance.now() + 1800;
        marcaSaida = document.createElement('span');
        marcaSaida.className = 'saida-fuga';
        marcaSaida.style.left = `${(cfg.saida[0] * 100).toFixed(2)}%`;
        marcaSaida.style.top = `${(cfg.saida[1] * 100).toFixed(2)}%`;
        marcaSaida.style.zIndex = String(Math.round(cfg.saida[1] * 1000) - 1);
        mundo.appendChild(marcaSaida);
      }
    }
  }

  function quadro(agora) {
    if (acabou) return;
    if (!palco.isConnected) { terminar('escapou'); return; }
    if (camadaAberta()) { requestAnimationFrame(quadro); return; }
    // O seu passo: parado no susto da largada, rápido na arrancada, lento no tropeço.
    cena.definirRitmo(agora < inicio ? 0 : agora < arrancadaAte ? (poderes.rapidez ? 1.6 : 1.4) : agora < tropecoAte ? 0.4 : 1);

    // Os passos da simulação que já deviam ter acontecido (a 20 por segundo, qualquer que seja a tela).
    const devido = Math.floor((agora - comeco) / S.PASSO_MS);
    while (fuga.passo <= devido && !fuga.fim) avancar();
    if (fuga.fim) { terminar(fuga.fim); return; }
    // Entre um passo e outro, ele desliza.
    const k = limitar((agora - comeco - (fuga.passo - 1) * S.PASSO_MS) / S.PASSO_MS, 0, 1);
    const x = (antes.x + (fuga.x - antes.x) * k) / S.ESCALA;
    const y = (antes.y + (fuga.y - antes.y) * k) / S.ESCALA;
    cena.moverPessoa(cfg.pessoa, x, y, S.COS[fuga.dir] < 0 ? -1 : 1);
    cena.focar(x, y, 400);

    // Cadeira no caminho: você tropeça e perde o passo por um instante (só na tela).
    const p = cena.posicao();
    for (const c of cadeiras) {
      if (c.ativa && S.distancia(I(p.x), I(p.y), c.x, c.y) < TROPECO) {
        c.ativa = false;
        c.el.classList.add('chutada');
        if (agora > arrancadaAte) tropecoAte = agora + 700;
        palavra.textContent = 'você tropeça na cadeira';
        mensagemAte = agora + 1600;
        som.reacao?.('queda', 0);
      }
    }

    // O quanto falta: uma barra que enche quando você chega perto, e uma palavra.
    const d = fuga.distancia ?? S.C.LONGE;
    const perto = limitar(1 - (d - S.C.PEGA) / (LONGE_VISTA - S.C.PEGA), 0, 1);
    barra.style.transform = `scaleX(${perto.toFixed(3)})`;
    hud.dataset.nivel = d < 1400 ? 'colado' : d < 3500 ? 'perto' : d < 6500 ? 'longe' : 'sumindo';
    if (agora > mensagemAte) {
      const txt = agora < inicio ? 'ele larga na frente' : d < 1400 ? 'colado nele' : d < 3500 ? 'perto' : d < 6500 ? 'ele ganha distância' : fuga.longe > 0 ? 'sumindo de vista' : 'longe';
      if (palavra.textContent !== txt) palavra.textContent = txt;
    }
    if (botaoOrdem) botaoOrdem.disabled = d > S.C.ORDEM_ALCANCE;

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
