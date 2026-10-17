// Glossário ao toque: os termos da V5 na ficha ficam sublinhados de leve; um toque, o foco ou o
// passar do mouse abre uma frase simples. As frases vêm das descrições do motor (v5.js), com
// versões mais simples aqui para os termos que pediam explicação.
import * as v5 from './motor/v5.js';
import { esc } from './ui.js';

const DISCIPLINAS = {
  animalismo: 'Você manda nos bichos e acalma ou atiça o lado animal de vampiros e pessoas.',
  auspicios: 'Seus sentidos vão além do humano: você vê o que está escondido e pressente o que vem.',
  feiticaria: 'Magia feita com o próprio sangue. O clã Tremere guarda esse saber a sete chaves.',
  rapidez: 'Você se move e reage mais rápido do que qualquer olho consegue acompanhar.',
  dominacao: 'Com o olhar e a voz, você dá ordens à mente dos outros, e eles obedecem.',
  fortitude: 'Seu corpo aguenta o que mataria qualquer um: tiro, faca, fogo, pancada.',
  ofuscacao: 'Você passa sem ser notado, some da vista de todos ou usa o rosto de outra pessoa.',
  potencia: 'Força muito acima da humana: você arromba, ergue e derruba o que ninguém conseguiria.',
  presenca: 'Você mexe com o que os outros sentem: fascínio, devoção ou medo, só de estar ali.',
  metamorfose: 'Você muda o próprio corpo: garras, olhos de bicho e, com prática, outras formas.',
  oblivio: 'Você controla as sombras e mexe com a morte e com os fantasmas.',
  alquimia: 'Fórmulas feitas com o seu sangue que imitam, por pouco tempo, os poderes dos vampiros.',
};

const VANTAGENS = {
  lacaios: 'Servos leais que trabalham para você. Alguns bebem do seu sangue e por isso obedecem.',
  status: 'Prestígio entre os vampiros da cidade: quando você fala, eles escutam.',
  rebanho: 'Um grupo de pessoas de quem você bebe sem precisar caçar na rua.',
};

const DEFEITOS = {
  suspeito: 'Os vampiros que mandam na cidade desconfiam de você e observam o que você faz.',
  'presa-exclusiva': 'Há um tipo de pessoa de quem você se recusa a beber, por princípio.',
  vicio: 'Você só se sente bem bebendo sangue de quem usou uma certa droga.',
  'marcado-camarilla': 'Os vampiros que mandam na cidade sabem quem você é e vigiam seus passos.',
  'temperamento-bestial': 'Você perde o controle por raiva ou fome, como um vampiro comum.',
};

const GERAL = {
  humanidade: 'O quanto ainda resta de gente em você. Quando cai demais, só sobra o monstro.',
  conviccao: 'Uma regra que você não quebra. Enquanto ela vale, você ainda é gente.',
  ambicao: 'O que você persegue a longo prazo, noite após noite.',
  desejo: 'O que você quer agora, nesta fase da história.',
  pedra: 'Uma pessoa viva que liga você à sua humanidade. Se ela sofrer, você sofre junto.',
  predador: 'O jeito como você caça: onde, de quem e como você bebe sangue.',
};

const primeiraFrase = (t) => String(t || '').split(/(?<=\.)\s/)[0];

// Frase do glossário para um item do motor. tipo: disciplina, poder, vantagem, defeito, atributo,
// habilidade, cla, predador, sangue-fraco ou geral.
export function definicao(tipo, id) {
  switch (tipo) {
    case 'disciplina': return DISCIPLINAS[id] || v5.DISCIPLINAS[id]?.desc || '';
    case 'poder': {
      for (const d of Object.values(v5.DISCIPLINAS)) {
        const pw = d.poderes.find((x) => x.id === id);
        if (pw) return pw.desc;
      }
      return '';
    }
    case 'vantagem': return VANTAGENS[id] || v5.VANTAGENS.find((x) => x.id === id)?.desc || '';
    case 'defeito': return DEFEITOS[id] || v5.DEFEITOS.find((x) => x.id === id)?.desc || '';
    case 'sangue-fraco': return DEFEITOS[id] || [...v5.MERITOS_SANGUE_FRACO, ...v5.DEFEITOS_SANGUE_FRACO].find((x) => x.id === id)?.desc || '';
    case 'atributo': return v5.ATRIBUTOS.find((x) => x.id === id)?.desc || '';
    case 'habilidade': return v5.HABILIDADES.find((x) => x.id === id)?.desc || '';
    case 'cla': return primeiraFrase(v5.cla(id)?.desc);
    case 'predador': return v5.predador(id)?.desc || '';
    default: return GERAL[id] || '';
  }
}

// O termo, sublinhado de leve e com a frase ao toque (se houver frase).
export function termo(nome, def) {
  if (!def) return esc(nome);
  return `<button type="button" class="termo" data-def="${esc(def)}">${esc(nome)}</button>`;
}

export const termoDe = (tipo, id, nome) => termo(nome, definicao(tipo, id));

// Na primeira vez que uma ficha aparece, uma linha discreta ensina que os termos abrem uma explicação.
// A tela pode ser desenhada mais de uma vez na mesma visita: a decisão vale para a visita inteira.
const CHAVE_DICA = 'mascara.dicaGlossario';
let dicaNestaVisita = null;
export function dicaDoGlossario() {
  if (dicaNestaVisita === null) {
    try {
      dicaNestaVisita = localStorage.getItem(CHAVE_DICA) !== '1';
      localStorage.setItem(CHAVE_DICA, '1');
    } catch { dicaNestaVisita = true; /* sem armazenamento: mostra sempre */ }
  }
  if (!dicaNestaVisita) return '';
  const gesto = window.matchMedia?.('(hover: hover)').matches ? 'Passe o mouse ou clique' : 'Toque';
  return `<p class="dica-glossario">${gesto} nos termos sublinhados para entender o que significam.</p>`;
}

// Um balão só para a página inteira, ligado uma vez.
let balao = null;
let dono = null;

function mostrar(el) {
  if (!balao) {
    balao = document.createElement('div');
    balao.className = 'glossario-balao';
    balao.setAttribute('role', 'tooltip');
    balao.id = 'glossario-balao';
    document.body.appendChild(balao);
  }
  dono?.removeAttribute('aria-describedby');
  dono = el;
  el.setAttribute('aria-describedby', balao.id);
  balao.innerHTML = `<b>${esc(el.textContent.trim())}</b> ${esc(el.dataset.def)}`;
  balao.hidden = false;
  const r = el.getBoundingClientRect();
  const largura = Math.min(300, window.innerWidth - 16);
  balao.style.maxWidth = `${largura}px`;
  const b = balao.getBoundingClientRect();
  const x = Math.max(8, Math.min(r.left + r.width / 2 - b.width / 2, window.innerWidth - b.width - 8));
  const embaixo = r.bottom + 8 + b.height < window.innerHeight;
  const y = embaixo ? r.bottom + 8 : Math.max(8, r.top - b.height - 8);
  balao.style.left = `${x}px`;
  balao.style.top = `${y}px`;
}

function esconder() {
  if (balao) balao.hidden = true;
  dono?.removeAttribute('aria-describedby');
  dono = null;
}

export function ligarGlossario() {
  if (ligarGlossario.feito) return;
  ligarGlossario.feito = true;
  document.addEventListener('pointerover', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const t = ev.target.closest?.('.termo');
    if (t) mostrar(t);
  });
  document.addEventListener('pointerout', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const t = ev.target.closest?.('.termo');
    if (t && t === dono && !t.contains(ev.relatedTarget) && document.activeElement !== t) esconder();
  });
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest?.('.termo');
    if (!t) { esconder(); return; }
    ev.preventDefault();
    if (dono === t && ev.detail > 0 && !balao.hidden && ev.pointerType !== 'mouse') esconder();
    else mostrar(t);
  });
  document.addEventListener('focusin', (ev) => { if (ev.target.classList?.contains('termo')) mostrar(ev.target); });
  document.addEventListener('focusout', (ev) => { if (ev.target === dono) esconder(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && dono) esconder(); }, true);
  window.addEventListener('scroll', esconder, true);
  window.addEventListener('resize', esconder);
}
