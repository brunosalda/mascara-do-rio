// Cenário vivo e som ambiente: chuva sobre a pintura, relâmpagos, vinheta da Fome,
// e um som sintetizado no navegador (chuva, cidade ao longe, batimento, trovão). Sem arquivos de áudio.

const CHAVE_SOM = 'mascara.som';
const calmo = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let clima = { tela: 'login', fome: null };

// --- Chuva -------------------------------------------------------------------------------

function iniciarChuva() {
  const canvas = document.getElementById('chuva');
  if (!canvas || calmo()) return;
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
    const qtd = Math.round(Math.min(160, (largura * altura) / 9000));
    gotas = Array.from({ length: qtd }, () => novaGota(true));
  }

  function novaGota(qualquerAltura) {
    const perto = Math.random();
    return {
      x: Math.random() * (largura + 200) - 100,
      y: qualquerAltura ? Math.random() * altura : -20,
      v: 7 + perto * 9,
      c: 10 + perto * 18,
      a: 0.08 + perto * 0.22,
    };
  }

  function quadro() {
    if (document.hidden) { requestAnimationFrame(quadro); return; }
    ctx.clearRect(0, 0, largura, altura);
    ctx.lineCap = 'round';
    for (const g of gotas) {
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
  if (!flash || calmo()) return;
  const proximo = () => setTimeout(raio, 25000 + Math.random() * 45000);
  function raio() {
    if (!document.hidden && clima.tela !== 'criacao') {
      flash.classList.remove('ativo');
      void flash.offsetWidth; // reinicia a animação
      flash.classList.add('ativo');
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
};

// --- API ------------------------------------------------------------------------------------

export function definirClima(novo) {
  const mudouFome = novo.fome !== clima.fome || novo.tela !== clima.tela;
  clima = { ...clima, ...novo };
  if (mudouFome) reagendarBatimento();
}

export function iniciarAmbiente() {
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
      }
      window.removeEventListener('pointerdown', retomar);
      window.removeEventListener('keydown', retomar);
    };
    window.addEventListener('pointerdown', retomar);
    window.addEventListener('keydown', retomar);
  }
}
