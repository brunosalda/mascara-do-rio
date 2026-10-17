// Camadas por cima da cena: a caixa de diálogo (narração e escolhas) e as janelas (ficha, diário, plano).
// Uma pilha decide quem recebe o teclado: a camada do topo; sem camadas, o teclado move o personagem.
import { revelarAosPoucos } from '../ui.js';

const pilha = [];

export function camadaAberta() {
  return pilha.length > 0;
}

// Encaminha a tecla para a camada do topo. Devolve true se ela tratou.
export function teclaNaCamada(ev) {
  const topo = pilha.at(-1);
  return topo ? topo.tecla(ev) : false;
}

// A tela pode ter sido trocada antes (a camada já saiu da página): tira da pilha de qualquer jeito,
// senão o laço nunca termina e a página congela.
export function fecharTudo() {
  while (pilha.length) {
    const topo = pilha.at(-1);
    topo.fechar();
    if (pilha.at(-1) === topo) pilha.pop();
  }
}

function empilhar(camada) {
  pilha.push(camada);
  return camada;
}

function desempilhar(camada) {
  const i = pilha.indexOf(camada);
  if (i >= 0) pilha.splice(i, 1);
}

// --- Caixa de diálogo ------------------------------------------------------------------------
// html: conteúdo (narração, escolhas). chave: se dada, revela aos poucos e marca como lida.
export function abrirDialogo(raiz, { rotulo = '', html = '', chave = null, rodape = '', fechavel = true, aoTerminar, aoFechar, aoAvancar } = {}) {
  const el = document.createElement('section');
  el.className = 'dialogo-cena surgir';
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <header class="dialogo-cabeca">
      <span class="grupo-rotulo">${rotulo}</span>
      ${fechavel ? '<button type="button" class="fechar-camada" data-fechar aria-label="Fechar">Esc ✕</button>' : ''}
    </header>
    <div class="dialogo-corpo">${html}</div>
    <footer class="dialogo-rodape">${rodape}</footer>`;
  raiz.appendChild(el);
  const corpo = el.querySelector('.dialogo-corpo');
  let leitura = null;

  const camada = empilhar({
    el,
    fechar() {
      desempilhar(camada);
      if (!el.isConnected) return;
      el.remove();
      aoFechar?.();
    },
    tecla(ev) {
      const k = ev.key;
      if (k === 'Escape' && fechavel) { camada.fechar(); return true; }
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return false;
      if ((k === ' ' || k === 'Enter' || k === 'e' || k === 'E') && leitura && !leitura.terminou()) {
        if (document.activeElement?.tagName === 'BUTTON' && k !== 'e' && k !== 'E') return false;
        leitura.avancar();
        return true;
      }
      const n = Number(k);
      if (n >= 1 && n <= 9) {
        const b = el.querySelector(`[data-escolha="${n - 1}"]:not(.oculto *)`);
        if (b && !b.closest('.oculto')) { b.click(); return true; }
      }
      if ((k === 'e' || k === 'E') && (!leitura || leitura.terminou())) {
        const principal = el.querySelector('[data-principal]');
        if (principal) { principal.click(); return true; }
      }
      return ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k);
    },
  });

  el.querySelector('[data-fechar]')?.addEventListener('click', () => camada.fechar());
  if (chave) {
    leitura = revelarAosPoucos(corpo, chave, {
      aoAvancar: () => { aoAvancar?.(); corpo.scrollTo({ top: corpo.scrollHeight, behavior: 'smooth' }); },
      aoTerminar: () => { el.classList.add('lido'); aoTerminar?.(camada); },
    });
  } else {
    aoTerminar?.(camada);
  }
  camada.corpo = corpo;
  return camada;
}

// --- Janelas (ficha, diário, plano da noite) ----------------------------------------------------
export function abrirJanela(raiz, { titulo = '', classe = '', montar } = {}) {
  const fundo = document.createElement('div');
  fundo.className = `janela-fundo ${classe}`;
  fundo.innerHTML = `
    <section class="janela surgir" role="dialog" aria-label="${titulo}">
      <header class="janela-cabeca">
        <h2>${titulo}</h2>
        <button type="button" class="fechar-camada" data-fechar aria-label="Fechar">Esc ✕</button>
      </header>
      <div class="janela-corpo"><p class="carregando">Abrindo…</p></div>
    </section>`;
  raiz.appendChild(fundo);
  const corpo = fundo.querySelector('.janela-corpo');
  const camada = empilhar({
    el: fundo,
    corpo,
    fechar() {
      desempilhar(camada);
      if (!fundo.isConnected) return;
      fundo.remove();
    },
    tecla(ev) {
      if (ev.key === 'Escape') { camada.fechar(); return true; }
      return !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)
        && ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'e', 'E'].includes(ev.key);
    },
  });
  fundo.querySelector('[data-fechar]').addEventListener('click', () => camada.fechar());
  fundo.addEventListener('click', (ev) => { if (ev.target === fundo) camada.fechar(); });
  Promise.resolve(montar?.(corpo, camada)).catch((err) => {
    corpo.innerHTML = `<p class="nota">${err.message || 'Não foi possível abrir.'}</p>`;
  });
  return camada;
}
