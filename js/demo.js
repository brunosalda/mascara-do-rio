// Rotas de demonstração, só com ?depurar: montam telas que dependem de etapas lentas do jogo (a
// espera da ficha, o primeiro prelúdio, as mensagens da entrada) com dados fictícios. Não leem nem
// gravam no banco e não mexem na sessão. Sem ?depurar, app.js nem carrega este arquivo.
import { CENAS, clasSugeridos, montarFicha } from './motor/roteiro.js';
import { narracaoComPaineis, escolhas, aviso } from './ui.js';
import { CENARIO_ABERTURA, LOCAIS } from './cidade.js';
import { montarCena } from './jogo/cena.js';
import { abrirDialogo, confirmarEscolha } from './jogo/camadas.js';
import { telaEspera, cartaoDeAbertura, telaNoite } from './noite.js';
import { telaLogin } from './app.js';
import { som } from './ambiente.js';

// Um personagem fictício, montado pelo mesmo roteiro da criação por conversa.
function personagemFicticio() {
  const e = { passo: 0, respostas: {}, campos: { nomeEmVida: 'Marina Costa', apelido: 'Nina', touchstone: 'Pedro', aparencia: 'Cabelo raspado, jaqueta de couro.' }, cla: null, log: [] };
  for (const c of CENAS) {
    if (c.tipo === 'opcoes') e.respostas[c.id] = 1 % c.opcoes.length;
    if (c.tipo === 'cla') e.cla = clasSugeridos(e)[0];
  }
  const ficha = montarFicha(e);
  return { id: 'demo', nome: ficha.nome, status: 'revisao', ficha, estado: null, retrato: null, sprite: null };
}

const faixaDemo = (texto) => `<div class="faixa-demo" role="note">Demonstração · ${texto}</div>`;

function demoEspera(raiz) {
  const p = personagemFicticio();
  telaEspera(raiz, p, { aoEditar: () => aviso('Demonstração: na tela real, este botão devolve a ficha para você editar.') });
  raiz.querySelector('.tela-jogo')?.insertAdjacentHTML('beforeend', faixaDemo('ficha fictícia em revisão; nada vai ao banco'));
}

const PRELUDIO = `Três semanas depois da noite em que você morreu, a Lapa continua igual. O bar da esquina ainda toca o mesmo samba, e ninguém olha duas vezes para você.

**Seu Antônio** — Tu sumiu, hein, Nina? Achei que tinha ido embora do Rio.

[MANHA] Ele não sabe de nada. Sorria, pague a cerveja que você não vai beber e saia logo.

[INTUIÇÃO — Difícil: Sucesso] O homem de terno parado debaixo dos Arcos está olhando para você há dez minutos. Ele não pisca.

[A BESTA] Ele tem cheiro de cemitério. É um dos nossos.

O homem levanta a mão, devagar, e aponta para a escadaria. Depois some na multidão.`;

const OPCOES_PRELUDIO = [
  'Seguir o homem de terno até a escadaria.',
  'Ficar no bar e perguntar ao Seu Antônio quem ele é.',
  'Ir embora da Lapa antes que ele volte.',
];

function demoPreludio(raiz) {
  raiz.innerHTML = '<div class="tela-jogo"><div class="palco"></div></div>';
  const camadas = raiz.querySelector('.tela-jogo');
  const p = personagemFicticio();
  montarCena(raiz.querySelector('.palco'), { cla: p.ficha.cla, sprite: null, imagem: CENARIO_ABERTURA, lugar: 'lapa', pontos: [], inicio: [0.45, 0.8] });
  camadas.insertAdjacentHTML('beforeend', faixaDemo('prelúdio fictício; as escolhas não são gravadas'));
  // A revelação aos poucos guarda no aparelho o que já foi lido: a demonstração começa sempre do zero.
  const chave = 'demo-preludio';
  try { localStorage.removeItem(`mascara.lido.${chave}`); } catch { /* sem armazenamento */ }
  cartaoDeAbertura(camadas, 'Prelúdio', 'Lapa · garoa', () => {
    const camada = abrirDialogo(camadas, {
      rotulo: 'Prelúdio',
      html: `${narracaoComPaineis(PRELUDIO, [], { cenario: CENARIO_ABERTURA, classe: 'privada' })}${escolhas(OPCOES_PRELUDIO)}`,
      chave,
      aoAvancar: () => som.toque(),
      rodape: `<span class="nota">Escolha uma fala<span class="so-teclado"> (1 a ${OPCOES_PRELUDIO.length})</span> ou feche e ande pela cena.<span class="so-teclado"> <kbd>Esc</kbd> fecha.</span></span>`,
    });
    camada.el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-escolha]');
      if (b && !b.closest('.decidido')) {
        confirmarEscolha(b, () => {
          aviso('Demonstração: na tela real, esta fala vira a ação principal da noite.');
          camada.fechar();
        });
      }
    });
  });
}

function demoEntrada(raiz) {
  telaLogin(raiz, { demo: true });
  raiz.querySelector('.tela-entrada')?.insertAdjacentHTML('beforeend', faixaDemo('cada clique em “Entrar” ou no link mostra uma das mensagens; nada é enviado'));
}

// Cena completa de uma noite fictícia: quadro, opções, caçada, curtas, detalhes e o personagem com a
// caminhada em vídeo do Bruno. A ação "enviada" fica só na memória da página. &lugar=<id> escolhe o bairro.
const CAMINHADA_DO_BRUNO = {
  url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-perfil.png', quadros: 10, largura: 154, altura: 300, parado: 5,
  frente: { url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-frente.png', quadros: 10, largura: 112, altura: 300, parado: 4 },
  costas: { url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-costas.png', quadros: 10, largura: 110, altura: 300, parado: 1 },
  respira: { url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-respira.png', quadros: 8, largura: 78, altura: 300 },
};

function fonteFicticia() {
  const noite = { id: 990003, numero: 3, status: 'aberta', fecha_em: new Date(Date.now() + 2 * 86400000).toISOString() };
  const narracao = {
    id: 'demo-noite-2', tipo: 'noite', noite_id: 990002, paineis: [],
    texto: PRELUDIO,
    opcoes: [...OPCOES_PRELUDIO, 'Procurar o dono do bar e perguntar pelo homem de terno.'],
  };
  const resolvida = { id: 990002, numero: 2, status: 'resolvida', narracao_publica: 'A chuva não parou a noite inteira. Na Lapa, falaram de um homem de terno que não pisca.', paineis: [] };
  let acao = null;
  return {
    noiteAberta: async () => noite,
    narracoesDoPersonagem: async () => [narracao],
    noitesResolvidas: async () => [resolvida],
    ultimaNoite: async () => noite,
    minhaAcao: async () => acao,
    salvarAcao: async (_n, _p, campos) => { acao = { id: 'demo-acao', ...campos, atualizado_em: new Date().toISOString(), encerrada_em: null }; return acao; },
    encerrarNoite: async () => { acao = { ...acao, encerrada_em: new Date().toISOString() }; return acao; },
    todosEncerraram: async () => true,
  };
}

async function demoCena(raiz) {
  const base = personagemFicticio();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  // &lugar=lapa-alto: a pintura de teste da Lapa vista do alto (Fase 2), com a câmera que rola.
  const pedido = params.get('lugar') || '';
  const vista = pedido.endsWith('-alto') ? 'alto' : null;
  const lugar = LOCAIS.some((l) => l.id === pedido.replace(/-alto$/, '')) ? pedido.replace(/-alto$/, '') : 'lapa';
  // &ficha=atenta: a ficha fictícia com as habilidades dos escondidos em nível alto (e os poderes da cena).
  // &ficha=poderes: só os poderes (Auspícios 3, Ofuscação 2, Rapidez 3, Presença 1, Dominação 1).
  const PODERES_DEMO = ['sentidos-agucados', 'perscrutar-alma', 'manto-sombras', 'silencio-morte', 'passagem-invisivel', 'ligeireza', 'piscar', 'assombro', 'nublar-memoria'];
  const poderesDemo = ['atenta', 'poderes'].includes(params.get('ficha')) ? PODERES_DEMO : null;
  if (params.get('ficha') === 'atenta') {
    base.ficha = structuredClone(base.ficha);
    const niveis = ((base.ficha.habilidades ||= {}).niveis ||= {});
    for (const h of ['prontidao', 'investigacao', 'intuicao', 'ocultismo', 'manha']) niveis[h] = 4;
  }
  const p = { ...base, _poderes: poderesDemo || undefined, id: 'demo-cena', status: 'ativo', sprite: CAMINHADA_DO_BRUNO, estado: { fome: 2, humanidade: 7, local: 'Lapa', vitalidade: { max: 7 }, vontade: { max: 5 } } };
  try { localStorage.setItem('mascara.lido.demo-noite-2', '1'); } catch { /* sem armazenamento */ }
  await telaNoite(raiz, p, { lugar, vista, fonte: fonteFicticia() });
  raiz.querySelector('.tela-jogo')?.insertAdjacentHTML('beforeend', faixaDemo('noite fictícia; nada vai ao banco'));
}

const DEMOS = { espera: demoEspera, preludio: demoPreludio, entrada: demoEntrada, cena: demoCena };

export function telaDemo(raiz, nome) {
  document.body.dataset.tela = 'cena';
  const demo = DEMOS[nome];
  if (!demo) {
    raiz.innerHTML = `<div class="tela-jogo"><section class="dialogo-cena"><div class="dialogo-corpo"><p>Demonstrações: ${Object.keys(DEMOS).map((n) => `<a href="#/demo/${n}?depurar">${n}</a>`).join(' · ')}</p></div></section></div>`;
    return;
  }
  demo(raiz);
}

