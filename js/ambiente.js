// Cenário vivo e som ambiente: chuva sobre a pintura, relâmpagos, vinheta da Fome,
// e um som sintetizado no navegador (chuva, cidade ao longe, batimento, trovão). Sem arquivos de áudio.

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

function ruido(ctx, segundos, tipo) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * segundos, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < d.length; i++) {
    const branco = Math.random() * 2 - 1;
    if (tipo === 'marrom') { ultimo = (ultimo + 0.02 * branco) / 1.02; d[i] = ultimo * 3.5; } else d[i] = branco;
  }
  return buf;
}

function montarAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const mestre = ctx.createGain();
  mestre.gain.value = 0;
  mestre.connect(ctx.destination);

  // Chuva: ruído branco filtrado
  const chuva = ctx.createBufferSource();
  chuva.buffer = ruido(ctx, 3, 'branco');
  chuva.loop = true;
  const passaBanda = ctx.createBiquadFilter();
  passaBanda.type = 'bandpass';
  passaBanda.frequency.value = 1400;
  passaBanda.Q.value = 0.6;
  const volChuva = ctx.createGain();
  volChuva.gain.value = 0.09;
  chuva.connect(passaBanda).connect(volChuva).connect(mestre);
  chuva.start();

  // Cidade ao longe: ruído marrom grave
  const cidade = ctx.createBufferSource();
  cidade.buffer = ruido(ctx, 4, 'marrom');
  cidade.loop = true;
  const passaBaixa = ctx.createBiquadFilter();
  passaBaixa.type = 'lowpass';
  passaBaixa.frequency.value = 260;
  const volCidade = ctx.createGain();
  volCidade.gain.value = 0.22;
  cidade.connect(passaBaixa).connect(volCidade).connect(mestre);
  cidade.start();

  return { ctx, mestre, batimento: null };
}

function pulso(a, quando, freq, volume) {
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, quando);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, quando + 0.12);
  g.gain.setValueAtTime(0.0001, quando);
  g.gain.exponentialRampToValueAtTime(volume, quando + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + 0.16);
  o.connect(g).connect(a.mestre);
  o.start(quando);
  o.stop(quando + 0.2);
}

// Nota curta: oscilador com ataque rápido e queda suave; ate = frequência final (deslize).
function tom(a, quando, freq, { tipo = 'sine', dur = 0.4, volume = 0.05, ate = null } = {}) {
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, quando);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, quando + dur * 0.8);
  g.gain.setValueAtTime(0.0001, quando);
  g.gain.exponentialRampToValueAtTime(volume, quando + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  o.connect(g).connect(a.mestre);
  o.start(quando);
  o.stop(quando + dur + 0.05);
}

// Sopro: ruído filtrado curto (voz interior, respingo).
function sopro(a, quando, { freq = 1800, q = 1.2, dur = 0.35, volume = 0.04 } = {}) {
  const fonte = a.ctx.createBufferSource();
  fonte.buffer = ruido(a.ctx, dur + 0.1, 'branco');
  const filtro = a.ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = freq;
  filtro.Q.value = q;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, quando);
  g.gain.exponentialRampToValueAtTime(volume, quando + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  fonte.connect(filtro).connect(g).connect(a.mestre);
  fonte.start(quando);
  fonte.stop(quando + dur + 0.1);
}

// Batimento: só no jogo, acelera e fica mais forte com a Fome.
function reagendarBatimento() {
  if (!audio) return;
  clearTimeout(audio.batimento);
  const fome = clima.tela === 'jogo' ? clima.fome : null;
  if (fome == null || fome < 1 || !som.ligado()) return;
  const bpm = 50 + fome * 13;
  const volume = 0.12 + fome * 0.07;
  const bater = () => {
    const t = audio.ctx.currentTime + 0.02;
    pulso(audio, t, 62, volume);
    pulso(audio, t + 0.22, 52, volume * 0.7);
    audio.batimento = setTimeout(bater, 60000 / bpm);
  };
  bater();
}

export const som = {
  ligado() {
    try { return localStorage.getItem(CHAVE_SOM) === '1'; } catch { return false; }
  },
  alternar() {
    const ligar = !this.ligado();
    try { localStorage.setItem(CHAVE_SOM, ligar ? '1' : '0'); } catch { /* sem armazenamento */ }
    if (ligar) {
      audio ||= montarAudio();
      if (!audio) return;
      audio.ctx.resume();
      audio.mestre.gain.setTargetAtTime(0.9, audio.ctx.currentTime, 0.6);
    } else if (audio) {
      audio.mestre.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.3);
    }
    reagendarBatimento();
    montarCamadaDoLugar();
  },
  // Durante a conversa, o som do lugar fica mais baixo.
  abafar(sim) {
    abafado = !!sim;
    if (camada && audio) camada.g.gain.setTargetAtTime(abafado ? 0.25 : 1, audio.ctx.currentTime, 0.35);
  },
  trovao(intensidade = 1) {
    if (!audio || !this.ligado()) return;
    const ctx = audio.ctx;
    const fonte = ctx.createBufferSource();
    fonte.buffer = ruido(ctx, 4, 'marrom');
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 140;
    const g = ctx.createGain();
    const t = ctx.currentTime + 0.3 + Math.random() * 0.8; // o som chega depois do clarão
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6 * intensidade, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    fonte.connect(filtro).connect(g).connect(audio.mestre);
    fonte.start(t);
    fonte.stop(t + 3.5);
  },
  toque() {
    if (!audio || !this.ligado()) return;
    pulso(audio, audio.ctx.currentTime + 0.01, 420, 0.05);
  },
  passo() {
    if (!audio || !this.ligado()) return;
    pulso(audio, audio.ctx.currentTime + 0.01, 95 + Math.random() * 25, 0.06);
  },
  // Interagir com um ponto: um toque de sino curto, como um copo tocado.
  anel() {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.01;
    tom(audio, t, 740, { dur: 0.5, volume: 0.045 });
    tom(audio, t, 1110, { dur: 0.35, volume: 0.02 });
  },
  // Escolher uma fala: um baque grave e uma nota que fica no ar.
  escolha() {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.01;
    pulso(audio, t, 90, 0.12);
    tom(audio, t + 0.02, 220, { tipo: 'triangle', dur: 0.9, volume: 0.04 });
    tom(audio, t + 0.02, 330, { tipo: 'sine', dur: 0.7, volume: 0.02 });
  },
  // Resultado de teste: sucesso sobe, falha desce, o resto fica neutro.
  teste(sucesso = false, falha = false) {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.01;
    if (sucesso) {
      tom(audio, t, 523, { dur: 0.3, volume: 0.04 });
      tom(audio, t + 0.12, 784, { dur: 0.6, volume: 0.045 });
    } else if (falha) {
      tom(audio, t, 311, { tipo: 'triangle', dur: 0.35, volume: 0.045 });
      tom(audio, t + 0.14, 233, { tipo: 'triangle', dur: 0.7, volume: 0.05, ate: 196 });
    } else {
      tom(audio, t, 440, { dur: 0.4, volume: 0.035 });
    }
  },
  // Voz interior que comenta: um sussurro curto.
  voz() {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.01;
    sopro(audio, t, { freq: 2400, q: 2.5, dur: 0.45, volume: 0.03 });
    tom(audio, t + 0.05, 1320, { dur: 0.25, volume: 0.008 });
  },
  // Enviar o plano: a gota que cai (nota que desce), o baque no selo e o eco grave.
  selo() {
    if (!audio || !this.ligado()) return;
    const t = audio.ctx.currentTime + 0.01;
    tom(audio, t, 1400, { dur: 0.45, volume: 0.03, ate: 500 });
    pulso(audio, t + 0.48, 70, 0.22);
    sopro(audio, t + 0.48, { freq: 900, q: 0.8, dur: 0.3, volume: 0.05 });
    tom(audio, t + 0.5, 110, { tipo: 'triangle', dur: 2.2, volume: 0.05 });
    tom(audio, t + 0.5, 165, { tipo: 'sine', dur: 1.8, volume: 0.025 });
  },
};

// --- Som de cada lugar -------------------------------------------------------------------------
// Uma "cama" sonora sintetizada por bairro, por cima da chuva e da cidade ao longe.

const SOM_DO_LUGAR = {
  lapa: ['burburinho', 'musica'],
  baixada: ['burburinho', 'musica', 'cachorro'],
  'zona-norte': ['burburinho', 'bateria'],
  morro: ['cachorro', 'baixo'],
  cemiterio: ['grilos', 'vento'],
  porto: ['ondas', 'sino'],
  'zona-sul': ['ondas'],
  barra: ['ondas', 'vento'],
  niteroi: ['ondas', 'sino'],
  centro: ['vento', 'bonde'],
  'santa-teresa': ['grilos', 'bonde'],
};
let lugarDoSom = null;
let camada = null;
let abafado = false;
let trocaDeLugar = null;

function laco(ctx, tipo, segundos = 4) {
  const f = ctx.createBufferSource();
  f.buffer = ruido(ctx, segundos, tipo);
  f.loop = true;
  return f;
}

// Batida curta num destino qualquer (grave, surdo, baixo).
function batida(dest, quando, freq, volume, dur = 0.25) {
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.frequency.setValueAtTime(freq, quando);
  o.frequency.exponentialRampToValueAtTime(freq * 0.55, quando + dur * 0.8);
  g.gain.setValueAtTime(0.0001, quando);
  g.gain.exponentialRampToValueAtTime(volume, quando + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  o.connect(g).connect(dest);
  o.start(quando);
  o.stop(quando + dur + 0.05);
}

function rajada(dest, quando, freq, q, volume, dur) {
  const f = audio.ctx.createBufferSource();
  f.buffer = ruido(audio.ctx, dur + 0.05, 'branco');
  const filtro = audio.ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = freq;
  filtro.Q.value = q;
  const g = audio.ctx.createGain();
  g.gain.setValueAtTime(0.0001, quando);
  g.gain.exponentialRampToValueAtTime(volume, quando + dur * 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  f.connect(filtro).connect(g).connect(dest);
  f.start(quando);
  f.stop(quando + dur + 0.05);
}

function fundoContinuo(c, { tipo, filtroTipo, freq, q = 0.7, volume, lfo = 0, lfoForca = 0 }) {
  const ctx = audio.ctx;
  const fonte = laco(ctx, tipo, 4);
  const filtro = ctx.createBiquadFilter();
  filtro.type = filtroTipo;
  filtro.frequency.value = freq;
  filtro.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = volume;
  fonte.connect(filtro).connect(g).connect(c.g);
  if (lfo) {
    const o = ctx.createOscillator();
    o.frequency.value = lfo;
    const og = ctx.createGain();
    og.gain.value = lfoForca;
    o.connect(og).connect(g.gain);
    o.start();
    c.fontes.push(o);
  }
  fonte.start();
  c.fontes.push(fonte);
}

function repetir(c, minimo, maximo, fn) {
  const agenda = () => {
    c.timers.push(setTimeout(() => { if (camada === c) { fn(audio.ctx.currentTime + 0.02); agenda(); } }, minimo + Math.random() * (maximo - minimo)));
  };
  agenda();
}

const CAMADAS = {
  ondas: (c) => fundoContinuo(c, { tipo: 'marrom', filtroTipo: 'lowpass', freq: 650, volume: 0.22, lfo: 0.09, lfoForca: 0.16 }),
  vento: (c) => fundoContinuo(c, { tipo: 'marrom', filtroTipo: 'bandpass', freq: 320, q: 0.5, volume: 0.12, lfo: 0.05, lfoForca: 0.08 }),
  burburinho: (c) => fundoContinuo(c, { tipo: 'branco', filtroTipo: 'bandpass', freq: 480, q: 0.9, volume: 0.035, lfo: 0.3, lfoForca: 0.012 }),
  musica: (c) => repetir(c, 520, 560, (t) => batida(c.g, t, 58, 0.05, 0.3)),
  baixo: (c) => repetir(c, 440, 500, (t) => batida(c.g, t, 46, 0.045, 0.35)),
  bateria: (c) => {
    repetir(c, 980, 1020, (t) => batida(c.g, t, 62, 0.07, 0.45));
    repetir(c, 240, 260, (t) => rajada(c.g, t, 3200, 1.5, 0.01, 0.05));
  },
  cachorro: (c) => repetir(c, 8000, 20000, (t) => { rajada(c.g, t, 650, 3, 0.05, 0.13); rajada(c.g, t + 0.28, 600, 3, 0.04, 0.12); }),
  grilos: (c) => repetir(c, 900, 1600, (t) => { for (let i = 0; i < 3; i++) batida(c.g, t + i * 0.05, 4600, 0.008, 0.03); }),
  sino: (c) => repetir(c, 20000, 40000, (t) => {
    for (const [f, v] of [[520, 0.05], [1040, 0.02], [1560, 0.008]]) {
      const o = audio.ctx.createOscillator();
      const g = audio.ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      o.connect(g).connect(c.g);
      o.start(t);
      o.stop(t + 3.3);
    }
  }),
  bonde: (c) => repetir(c, 25000, 50000, (t) => {
    const o = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    o.frequency.setValueAtTime(2300, t);
    o.frequency.exponentialRampToValueAtTime(1700, t + 1.2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.012, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(g).connect(c.g);
    o.start(t);
    o.stop(t + 1.4);
    rajada(c.g, t, 120, 0.5, 0.08, 2.2);
  }),
};

function desmontarCamada() {
  if (!camada) return;
  const velha = camada;
  camada = null;
  velha.timers.forEach(clearTimeout);
  if (audio) velha.g.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.3);
  setTimeout(() => { velha.fontes.forEach((f) => { try { f.stop(); } catch { /* já parou */ } }); velha.g.disconnect(); }, 1200);
}

function montarCamadaDoLugar() {
  desmontarCamada();
  if (!audio || !som.ligado() || !SOM_DO_LUGAR[lugarDoSom]) return;
  const g = audio.ctx.createGain();
  g.gain.value = 0;
  g.connect(audio.mestre);
  g.gain.setTargetAtTime(abafado ? 0.25 : 1, audio.ctx.currentTime, 0.5);
  camada = { g, fontes: [], timers: [], lugar: lugarDoSom };
  for (const t of SOM_DO_LUGAR[lugarDoSom]) CAMADAS[t]?.(camada);
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
      audio ||= montarAudio();
      if (audio) {
        audio.ctx.resume();
        audio.mestre.gain.setTargetAtTime(0.9, audio.ctx.currentTime, 0.6);
        reagendarBatimento();
        montarCamadaDoLugar();
      }
      window.removeEventListener('pointerdown', retomar);
      window.removeEventListener('keydown', retomar);
    };
    window.addEventListener('pointerdown', retomar);
    window.addEventListener('keydown', retomar);
  }
}
