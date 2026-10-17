// Camadas por cima da cena: a caixa de diálogo (narração e escolhas) e as janelas (ficha, diário, plano).
// Uma pilha decide quem recebe o teclado: a camada do topo; sem camadas, o teclado move o personagem.
import { revelarAosPoucos } from '../ui.js';
import { som } from '../ambiente.js';

const pilha = [];

// A cena montada se registra aqui: diz de que lado a conversa deve abrir (o oposto ao personagem)
// e é avisada quando uma conversa abre ou fecha (para aproximar a câmera).
let cenaAtual = null;
export function registrarCena(api) {
  cenaAtual = api;
  // Devolve true se esta cena ainda era a registrada (uma cena nova pode já ter tomado o lugar).
  return () => { if (cenaAtual !== api) return false; cenaAtual = null; return true; };
}

const temDialogo = () => pilha.some((c) => c.dialogo);

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
  if (camada.dialogo && !temDialogo()) cenaAtual?.conversa(false);
}

// Escolha com cerimônia: a fala escolhida acende e sobe, toca um som grave, e só então a ação segue.
export function confirmarEscolha(botao, depois) {
  const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  botao?.classList.add('escolhida-agora');
  botao?.closest('.escolhas')?.classList.add('decidido');
  som.escolha?.();
  setTimeout(depois, reduzido ? 160 : 230);
}

// --- Caixa de diálogo ------------------------------------------------------------------------
// html: conteúdo (narração, escolhas). chave: se dada, revela aos poucos e marca como lida.
// As escolhas (.escolhas) ficam presas ao pé da caixa, sempre à vista; o texto rola acima delas.
export function abrirDialogo(raiz, { rotulo = '', html = '', chave = null, rodape = '', fechavel = true, aoTerminar, aoFechar, aoAvancar } = {}) {
  const lado = cenaAtual?.lado?.() || 'centro';
  const el = document.createElement('section');
  el.className = `dialogo-cena dialogo-${lado} surgir`;
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <header class="dialogo-cabeca">
      <span class="grupo-rotulo">${rotulo}</span>
      ${fechavel ? '<button type="button" class="fechar-camada" data-fechar aria-label="Fechar">Esc ✕</button>' : ''}
    </header>
    <div class="dialogo-corpo">${html}</div>
    <div class="dialogo-escolhas"></div>
    <footer class="dialogo-rodape">${rodape}</footer>`;
  const corpo = el.querySelector('.dialogo-corpo');
  const presas = el.querySelector('.dialogo-escolhas');
  // Só a lista de escolhas do fim (não as que estão dentro de um formulário) vai para o pé.
  const lista = [...corpo.querySelectorAll('.escolhas')].filter((ol) => !ol.closest('label')).at(-1);
  if (lista) presas.appendChild(lista);
  raiz.appendChild(el);
  let leitura = null;

  const camada = empilhar({
    el,
    dialogo: true,
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
        const b = el.querySelector(`[data-escolha="${n - 1}"]`);
        if (b && !b.closest('.oculto')) { b.click(); return true; }
        const ordem = [...presas.querySelectorAll('button')][n - 1];
        if (ordem && !ordem.closest('.oculto')) { ordem.click(); return true; }
      }
      if ((k === 'e' || k === 'E') && (!leitura || leitura.terminou())) {
        const principal = el.querySelector('[data-principal]');
        if (principal) { principal.click(); return true; }
      }
      return ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(k);
    },
  });
  cenaAtual?.conversa(true);

  el.querySelector('[data-fechar]')?.addEventListener('click', () => camada.fechar());
  if (chave) {
    leitura = revelarAosPoucos(el, chave, {
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
