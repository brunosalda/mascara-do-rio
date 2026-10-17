// Cenário vivo e som ambiente: chuva sobre a pintura, relâmpagos, vinheta da Fome,
// e um som sintetizado no navegador, sem ruído: gotas tonais, acorde de cada bairro, batimento, trovão grave. Sem arquivos de áudio.

const CHAVE_SOM = 'mascara.som';
const CHAVE_EFEITOS = 'mascara.efeitos';

// Efeitos visuais ligados por padrão; o jogador desliga no botão do cabeçalho.
export const efeitos = {
  ligados() {
    try { return localStorage.getItem(CHAVE_EFEITOS) !== '0'; } catch { return true; }
  },
  alternar() {
    const ligar = !this.ligados();
    try { localStorage.setItem(CHAVE_EFEITOS, ligar ? '1' : '0'); } catch { /* sem armazenamento */ }
    document.body.classList.toggle('sem-efeitos', !ligar);
  },
};

let clima = { tela: 'login', fome: null };

// Tempo da noite (garoa, tempestade, lua, névoa): muda a chuva, os relâmpagos e, pelo CSS, a pintura.
let tempo = null;
const CHUVA = { garoa: 0.7, tempestade: 1.6, lua: 0, nevoa: 0.12 };
const fatorChuva = () => (tempo == null ? 1 : (CHUVA[tempo] ?? 1));
export function definirTempo(t) {
  tempo = t || null;
  document.body.dataset.tempo = tempo || '';
}

// --- Chuva -------------------------------------------------------------------------------

function iniciarChuva() {
  const canvas = document.getElementById('chuva');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let gotas = [];
  let largura = 0;
  let altura = 0;

  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    largura = window.innerWidth;
    altura = window.innerHeight;
    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const qtd = Math.round(Math.min(240, (largura * altura) / 6000));
    gotas = Array.from({ length: Math.round(qtd * 1.6) }, () => novaGota(true)); // até 1,6x na tempestade
    gotas.base = qtd;
  }

  function novaGota(qualquerAltura) {
    const perto = Math.random();
    return {
      x: Math.random() * (largura + 200) - 100,
      y: qualquerAltura ? Math.random() * altura : -20,
      v: 9 + perto * 12,
      c: 14 + perto * 26,
      a: 0.07 + perto * 0.2,
    };
  }

  function quadro() {
    if (document.hidden || !efeitos.ligados()) { ctx.clearRect(0, 0, largura, altura); requestAnimationFrame(quadro); return; }
    ctx.clearRect(0, 0, largura, altura);
    ctx.lineCap = 'round';
    const visiveis = Math.round((gotas.base || gotas.length) * fatorChuva());
    for (let i = 0; i < visiveis && i < gotas.length; i++) {
      const g = gotas[i];
      ctx.strokeStyle = `rgba(190, 210, 220, ${g.a})`;
      ctx.lineWidth = g.a > 0.2 ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x - g.c * 0.25, g.y + g.c);
      ctx.stroke();
      g.y += g.v;
      g.x -= g.v * 0.25;
      if (g.y > altura + 20) Object.assign(g, novaGota(false));
    }
    requestAnimationFrame(quadro);
  }

  medir();
  window.addEventListener('resize', medir);
  requestAnimationFrame(quadro);
}

// --- Relâmpagos ------------------------------------------------------------------------

function iniciarRelampagos() {
  const flash = document.getElementById('relampago');
  if (!flash) return;
  const proximo = () => setTimeout(raio, tempo === 'tempestade' ? 4000 + Math.random() * 9000 : 9000 + Math.random() * 22000);
  function raio() {
    if (!document.hidden && efeitos.ligados() && tempo !== 'lua' && tempo !== 'nevoa') {
      flash.classList.remove('ativo');
      document.body.classList.remove('clarao');
      void flash.offsetWidth; // reinicia a animação
      flash.classList.add('ativo');
      document.body.classList.add('clarao');
      setTimeout(() => document.body.classList.remove('clarao'), 1200);
      som.trovao(0.9 + Math.random() * 1.6);
    }
    proximo();
  }
  proximo();
}

// --- Som sintetizado ---------------------------------------------------------------------

let audio = null;

// Som sem chiado (rodada 15, pedido do Bruno: "o som está péssimo, parece um ruído"). Nada de ruído
// contínuo: a chuva são gotas tonais curtas, cada bairro tem um acorde baixo de senoides com ataque
// lento e um ou dois eventos tonais raros. Tudo passa por um eco leve e um compressor no fim.

// Tons do acorde de abertura (lá menor): os acordes dos bairros e os eventos ficam nesta escala.
const LA = 110;
const ESCALA = { la: LA, do: 130.81, re: 146.83, mi: 164.81, sol: 196 };

// Resposta de impulso do eco: um decaimento curto (só serve de "sala"; ninguém ouve isto sozinho).
function respostaDeEco(ctx, segundos = 2.2) {
  const n = Math.floor(ctx.sampleRate * segundos);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const d = buf.getChannelData(canal);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3.2;
  }
  return buf;
}

function montarAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -26;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.01;
  compressor.release.value = 0.4;
  const mestre = ctx.createGain();
  mestre.gain.value = 0;
  mestre.connect(compressor).connect(ctx.destination);
  // Eco: um envio paralelo, baixo.
  const eco = ctx.createConvolver();
  eco.buffer = respostaDeEco(ctx);
  const envio = ctx.createGain();
  envio.gain.value = 0.22;
  envio.connect(eco).connect(mestre);
  // Tudo o que toca entra por "seco"; parte vai para o eco.
  const seco = ctx.createGain();
  seco.connect(mestre);
  seco.connect(envio);
  return { ctx, mestre, seco, batimento: null, gotas: null };
}

const VOLUME_GERAL = 0.55;

// Nota com envelope: ataque e queda, opcionalmente deslizando até outra frequência, com posição no
// estéreo (pan de -1 a 1). dest: onde toca (padrão: a saída com eco).
function tom(a, quando, freq, { tipo = 'sine', dur = 0.4, volume = 0.05, ate = null, ataque = 0.012, pan = 0, dest = null } = {}) {
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, quando);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, quando + dur * 0.8);
  g.gain.setValueAtTime(0.0001, quando);
  g.gain.exponentialRampToValueAtTime(volume, quando + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  let saida = g;
  if (pan && a.ctx.createStereoPanner) {
    const p = a.ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    saida = p;
  }
  o.connect(g);
  saida.connect(dest || a.seco);
  o.start(quando);
  o.stop(quando + dur + 0.05);
}

// Pulso grave curto (batimento, passo, baque).
function pulso(a, quando, freq, volume, dest = null) {
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, quando);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, quando + 0.12);
  g.gain.setValueAtTime(0.0001, quando);
  g.gain.exponentialRampToValueAtTime(volume, quando + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + 0.16);
  o.connect(g).connect(dest || a.seco);
  o.start(quando);
  o.stop(quando + 0.2);
}

// Chuva: gotas tonais curtas e irregulares (1,5 a 3 kHz, 20 a 40 ms), mais densas na tempestade e
// nenhuma na noite de lua.
const GOTAS_POR_SEGUNDO = { garoa: 2.2, tempestade: 6, lua: 0, nevoa: 0.4 };
function agendarGotas() {
  if (!audio) return;
  clearTimeout(audio.gotas);
  const taxa = tempo == null ? 1.5 : (GOTAS_POR_SEGUNDO[tempo] ?? 1.5);
  if (!som.ligado() || taxa <= 0 || clima.tela === 'login') { audio.gotas = setTimeout(agendarGotas, 2000); return; }
  const t = audio.ctx.currentTime + 0.02;
  const f = 1500 + Math.random() * 1500;
  tom(audio, t, f, { dur: 0.02 + Math.random() * 0.02, volume: 0.004 + Math.random() * 0.008, ate: f * 0.82, ataque: 0.003, pan: Math.random() * 1.6 - 0.8 });
  // Intervalo irregular (exponencial): às vezes duas gotas juntas, às vezes uma pausa.
  const espera = (-Math.log(1 - Math.random()) / taxa) * 1000;
  audio.gotas = setTimeout(agendarGotas, Math.max(40, espera));
}

// Batimento: só no jogo, acelera e fica mais forte com a Fome.
function reagendarBatimento() {
  if (!audio) return;
  clearTimeout(audio.batimento);
  const fome = clima.tela === 'jogo' ? clima.fome : null;
  if (fome == null || fome < 1 || !som.ligado()) return;
  const bpm = 50 + fome * 13;
  const volume = 0.1 + fome * 0.05;
  const bater = () => {
    const t = audio.ctx.currentTime + 0.02;
    pulso(audio, t, 62, volume, audio.mestre);
    pulso(audio, t + 0.22, 52, volume * 0.7, audio.mestre);
    audio.batimento = setTimeout(bater, 60000 / bpm);
  };
  bater();
}

function ligarAudio() {
  audio ||= montarAudio();
  if (!audio) return false;
  audio.ctx.resume();
  audio.mestre.gain.setTargetAtTime(VOLUME_GERAL, audio.ctx.currentTime, 0.6);
  reagendarBatimento();
  montarCamadaDoLugar();
  agendarGotas();
  return true;
}

export const som = {
  ligado() {
    try { return localStorage.getItem(CHAVE_SOM) === '1'; } catch { return false; }
  },
  alternar() {
    const ligar = !this.ligado();
    try { localStorage.setItem(CHAVE_SOM, ligar ? '1' : '0'); } catch { /* sem armazenamento */ }
    if (ligar) { ligarAudio(); return; }
    if (audio) audio.mestre.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.3);
    reagendarBatimento();
    montarCamadaDoLugar();
  },
  // Abertura da noite: um acorde grave que fica no ar.
  acorde() {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.02;
    for (const [f, v] of [[55, 0.08], [82.41, 0.045], [110, 0.035], [130.81, 0.022]]) tom(audio, t, f, { tipo: 'triangle', dur: 2.8, volume: v, ataque: 0.08 });
  },
  // Durante a conversa, o som do lugar fica mais baixo.
  abafar(sim) {
    abafado = !!sim;
    if (camada && audio) camada.g.gain.setTargetAtTime(abafado ? 0.3 : 1, audio.ctx.currentTime, 0.35);
  },
  // Trovão: um grave tonal longo que chega depois do clarão (sem ruído).
  trovao(intensidade = 1) {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.3 + Math.random() * 0.8;
    const v = Math.min(0.12, 0.05 * intensidade);
    tom(audio, t, 49, { dur: 3.6, volume: v, ate: 38, ataque: 0.25 });
    tom(audio, t + 0.08, 73.4, { dur: 2.8, volume: v * 0.45, ate: 61, ataque: 0.3, tipo: 'triangle' });
    tom(audio, t + 0.4, 36.7, { dur: 3.2, volume: v * 0.6, ataque: 0.5 });
  },
  toque() {
    if (!audio || !this.ligado()) return;
    tom(audio, audio.ctx.currentTime + 0.01, 660, { dur: 0.18, volume: 0.025 });
  },
  passo() {
    if (!audio || !this.ligado()) return;
    pulso(audio, audio.ctx.currentTime + 0.01, 95 + Math.random() * 25, 0.05);
  },
  // Interagir com um ponto: um toque de sino curto, como um copo tocado.
  anel() {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.01;
    tom(audio, t, 880, { dur: 0.6, volume: 0.035 });
    tom(audio, t, 1318.5, { dur: 0.4, volume: 0.014 });
  },
  // Escolher uma fala: um baque grave e uma nota que fica no ar.
  escolha() {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.01;
    pulso(audio, t, 90, 0.1);
    tom(audio, t + 0.02, 220, { tipo: 'triangle', dur: 0.9, volume: 0.035 });
    tom(audio, t + 0.02, 329.6, { dur: 0.7, volume: 0.018 });
  },
  // Resultado de teste: sucesso sobe, falha desce, o resto fica neutro.
  teste(sucesso = false, falha = false) {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.01;
    if (sucesso) {
      tom(audio, t, 523.25, { dur: 0.3, volume: 0.035 });
      tom(audio, t + 0.12, 783.99, { dur: 0.7, volume: 0.04 });
    } else if (falha) {
      tom(audio, t, 311.1, { tipo: 'triangle', dur: 0.35, volume: 0.04 });
      tom(audio, t + 0.14, 233.1, { tipo: 'triangle', dur: 0.7, volume: 0.045, ate: 196 });
    } else {
      tom(audio, t, 440, { dur: 0.45, volume: 0.03 });
    }
  },
  // Voz interior que comenta: duas notas altas e suaves, como um pensamento.
  voz() {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.01;
    tom(audio, t, 1318.5, { dur: 0.5, volume: 0.009, ataque: 0.06 });
    tom(audio, t + 0.09, 1760, { dur: 0.45, volume: 0.006, ataque: 0.06 });
  },
  // Enviar o plano: a gota que cai (nota que desce), o baque no selo e o eco grave.
  selo() {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.01;
    tom(audio, t, 1400, { dur: 0.45, volume: 0.028, ate: 500 });
    pulso(audio, t + 0.48, 70, 0.18);
    tom(audio, t + 0.5, 110, { tipo: 'triangle', dur: 2.2, volume: 0.045 });
    tom(audio, t + 0.5, 164.8, { dur: 1.8, volume: 0.022 });
  },
};

// --- Som de cada lugar -------------------------------------------------------------------------
// Um acorde de fundo baixo (2 ou 3 senoides, ataque lento, no tom do acorde de abertura) e um ou dois
// eventos tonais raros por bairro.

const SOM_DO_LUGAR = {
  lapa: { acorde: ['la', 'mi'], eventos: ['surdo'] },
  'zona-norte': { acorde: ['la', 'do', 'mi'], eventos: ['surdo'] },
  baixada: { acorde: ['re', 'la'], eventos: ['surdo'] },
  morro: { acorde: ['re', 'sol'], eventos: ['surdo'] },
  cemiterio: { acorde: ['la', 'do'], eventos: ['grilos'] },
  'santa-teresa': { acorde: ['do', 'sol'], eventos: ['grilos', 'bonde'] },
  centro: { acorde: ['la', 're'], eventos: ['bonde'] },
  porto: { acorde: ['mi', 'la'], eventos: ['sino'] },
  niteroi: { acorde: ['la', 'mi', 'sol'], eventos: ['sino', 'gaivota'] },
  'zona-sul': { acorde: ['do', 'mi', 'la'], eventos: ['gaivota'] },
  barra: { acorde: ['sol', 're'], eventos: ['gaivota'] },
};
let lugarDoSom = null;
let camada = null;
let abafado = false;
let trocaDeLugar = null;

// Acorde de fundo: cada nota uma oitava abaixo do tom da escala, com um leve "respirar" de volume e
// um desafino lento, para não soar como um tom de teste.
function acordeDeFundo(c, notas) {
  const ctx = audio.ctx;
  notas.forEach((nome, i) => {
    const f = ESCALA[nome] / 2;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.018 / (1 + i * 0.35), ctx.currentTime, 1.6); // ataque lento
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05 + i * 0.023;
    const lfoGanho = ctx.createGain();
    lfoGanho.gain.value = 0.006;
    lfo.connect(lfoGanho).connect(g.gain);
    const desafino = ctx.createOscillator();
    desafino.frequency.value = 0.07 + i * 0.03;
    const desafinoGanho = ctx.createGain();
    desafinoGanho.gain.value = 0.35;
    desafino.connect(desafinoGanho).connect(o.frequency);
    o.connect(g).connect(c.g);
    [o, lfo, desafino].forEach((x) => { x.start(); c.fontes.push(x); });
  });
}

function repetir(c, minimo, maximo, fn) {
  const agenda = () => {
    c.timers.push(setTimeout(() => { if (camada === c) { fn(audio.ctx.currentTime + 0.02); agenda(); } }, minimo + Math.random() * (maximo - minimo)));
  };
  agenda();
}

const EVENTOS = {
  // Sino de navio ao longe (porto, Niterói).
  sino: (c) => repetir(c, 22000, 45000, (t) => {
    for (const [f, v, d] of [[440, 0.03, 3.4], [880, 0.012, 2.6], [1318.5, 0.005, 1.8]]) tom(audio, t, f, { dur: d, volume: v, pan: -0.4, dest: c.g });
  }),
  // Surdo abafado de uma roda de samba distante: uma frase curta de vez em quando (Lapa, Zona Norte).
  surdo: (c) => repetir(c, 14000, 30000, (t) => {
    [0, 0.5, 1.0, 1.25, 1.5].forEach((dt, i) => pulso(audio, t + dt, i % 2 ? 49 : 55, 0.05, c.g));
  }),
  // Grilos tonais: três pios curtos e altos (cemitério, Santa Teresa).
  grilos: (c) => repetir(c, 2500, 6000, (t) => {
    const f = 3520 + Math.random() * 200;
    for (let i = 0; i < 3; i++) tom(audio, t + i * 0.07, f, { dur: 0.035, volume: 0.004, ataque: 0.004, pan: 0.5, dest: c.g });
  }),
  // Gaivota: um deslize agudo que sobe e desce (Zona Sul, Barra, Niterói).
  gaivota: (c) => repetir(c, 25000, 55000, (t) => {
    tom(audio, t, 1480, { dur: 0.5, volume: 0.008, ate: 1100, ataque: 0.05, pan: 0.6, dest: c.g });
    tom(audio, t + 0.55, 1320, { dur: 0.6, volume: 0.007, ate: 990, ataque: 0.05, pan: 0.6, dest: c.g });
  }),
  // Sinal do bonde: um apito que desce (Centro, Santa Teresa).
  bonde: (c) => repetir(c, 30000, 60000, (t) => {
    tom(audio, t, 1760, { dur: 1.2, volume: 0.007, ate: 1318.5, ataque: 0.15, pan: -0.5, dest: c.g });
  }),
};

function desmontarCamada() {
  if (!camada) return;
  const velha = camada;
  camada = null;
  velha.timers.forEach(clearTimeout);
  if (audio) velha.g.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.4);
  setTimeout(() => { velha.fontes.forEach((f) => { try { f.stop(); } catch { /* já parou */ } }); velha.g.disconnect(); }, 2000);
}

function montarCamadaDoLugar() {
  desmontarCamada();
  const def = SOM_DO_LUGAR[lugarDoSom];
  if (!audio || !som.ligado() || !def) return;
  const g = audio.ctx.createGain();
  g.gain.value = 0;
  g.connect(audio.seco);
  g.gain.setTargetAtTime(abafado ? 0.3 : 1, audio.ctx.currentTime, 0.8);
  camada = { g, fontes: [], timers: [], lugar: lugarDoSom };
  acordeDeFundo(camada, def.acorde);
  for (const e of def.eventos) EVENTOS[e]?.(camada);
}

// Troca o som do lugar (null: nenhum). Espera um instante, para uma tela que se redesenha no mesmo
// lugar não reiniciar o som.
export function definirSomDoLugar(id) {
  lugarDoSom = id || null;
  clearTimeout(trocaDeLugar);
  trocaDeLugar = setTimeout(() => { if (camada?.lugar !== lugarDoSom) montarCamadaDoLugar(); }, 120);
}

// --- API ------------------------------------------------------------------------------------

export function definirClima(novo) {
  const mudouFome = novo.fome !== clima.fome || novo.tela !== clima.tela;
  clima = { ...clima, ...novo };
  if (mudouFome) reagendarBatimento();
}

export function iniciarAmbiente() {
  document.body.classList.toggle('sem-efeitos', !efeitos.ligados());
  iniciarChuva();
  iniciarRelampagos();
  // Navegadores só tocam som depois de um gesto: se o som estava ligado, retoma no primeiro toque.
  if (som.ligado()) {
    const retomar = () => {
      ligarAudio();
      window.removeEventListener('pointerdown', retomar);
      window.removeEventListener('keydown', retomar);
    };
    window.addEventListener('pointerdown', retomar);
    window.addEventListener('keydown', retomar);
  }
}
