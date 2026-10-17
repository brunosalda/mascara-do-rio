// Rotas de demonstração, só com ?depurar: montam telas que dependem de etapas lentas do jogo (a
// espera da ficha, o primeiro prelúdio, as mensagens da entrada) com dados fictícios. Não leem nem
// gravam no banco e não mexem na sessão. Sem ?depurar, app.js nem carrega este arquivo.
import { CENAS, clasSugeridos, montarFicha } from './motor/roteiro.js';
import { narracaoComPaineis, escolhas, aviso } from './ui.js';
import { CENARIO_ABERTURA, LOCAIS, LOCAIS_EXTRA } from './cidade.js';
import { montarCena } from './jogo/cena.js';
import { abrirDialogo, confirmarEscolha } from './jogo/camadas.js';
import { telaEspera, cartaoDeAbertura, telaNoite } from './noite.js';
import { telaLogin } from './app.js';
import { abrirSenhaDireto } from './senha.js';
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

// Rodada 40: o prelúdio abre como a noite de verdade (vista do alto da Lapa, moldura de pedra e bronze,
// narração no painel de baixo, a gente da área); o cartão de abertura usa a pintura antiga.
async function demoPreludio(raiz) {
  const base = personagemFicticio();
  const p = { ...base, id: 'demo-preludio', status: 'ativo', sprite: CAMINHADA_DO_BRUNO, estado: { fome: 1, humanidade: 7, local: 'Lapa', vitalidade: { max: 7 }, vontade: { max: 5 } } };
  // A revelação aos poucos guarda no aparelho o que já foi lido: a demonstração começa sempre do zero.
  try { localStorage.removeItem('mascara.lido.demo-preludio'); localStorage.removeItem('mascara.registro.990001'); } catch { /* sem armazenamento */ }
  const irPara = (rota) => {
    if (rota === 'mapa') { location.hash = `#/demo/mapa?${paramsDemo({ lugar: 'lapa' })}`; return; }
    aviso('Na demonstração, isso fica fora: nada sai do prelúdio fictício.');
  };
  await telaNoite(raiz, p, { lugar: 'lapa', vista: 'alto', fonte: fonteFicticia({ preludio: true }), irPara });
  raiz.querySelector('.tela-jogo')?.insertAdjacentHTML('beforeend', faixaDemo('prelúdio fictício; as escolhas não são gravadas'));
}

// Rodada 41: as telas de entrada e de senha, sem banco (&tela=entrada | primeira | esqueci | criar).
function demoSenha(raiz) {
  const tela = new URLSearchParams(location.hash.split('?')[1] || '').get('tela') || 'criar';
  const api = telaLogin(raiz, { demo: true });
  const entrada = raiz.querySelector('.tela-entrada');
  entrada?.insertAdjacentHTML('beforeend', faixaDemo('telas de entrada e de senha; nada é enviado'));
  const link = (t, nome) => `<a href="#/demo/senha?depurar&tela=${t}"${t === tela ? ' aria-current="page"' : ''}>${nome}</a>`;
  entrada?.insertAdjacentHTML('beforeend', `<nav class="demo-telas" aria-label="Telas da demonstração">Ver: ${link('entrada', 'Entrada')} ${link('primeira', 'Primeira vez')} ${link('esqueci', 'Esqueci a senha')} ${link('criar', 'Criar a senha')}</nav>`);
  if (tela === 'primeira' || tela === 'esqueci') api?.abrirPedido(tela);
  else if (tela === 'criar') abrirSenhaDireto({ demo: true });
}

function demoEntrada(raiz) {
  telaLogin(raiz, { demo: true });
  raiz.querySelector('.tela-entrada')?.insertAdjacentHTML('beforeend', faixaDemo('cada clique em “Entrar” ou no link mostra uma das mensagens; nada é enviado'));
}

// Cena completa de uma noite fictícia: quadro, opções, caçada, curtas, detalhes e o personagem com a
// caminhada em vídeo do Bruno. A ação "enviada" fica só na memória da página. &lugar=<id> escolhe o bairro.
// Fase 3.3 (parte da tela), só na demonstração: experiência, status, refúgio, itens e feitos fictícios.
const ESTADO_FASE3 = {
  // Rodada 39: rastros fictícios de amigos e um recado, só na Lapa da demonstração.
  _rastros_demo: { lapa: [{ nome: 'Corvo', cla: 'Toreador', x: 0.6, y: 0.7, ha: '2 horas', minutos: 120 }, { nome: 'Dandara', cla: 'Brujah', x: 0.7, y: 0.82, ha: '40 minutos', minutos: 40 }] },
  _recados_demo: { lapa: [{ texto: 'O segurança do bar vê tudo. Cuidado com ele.', x: 0.74, y: 0.73, de: 'Corvo' }] },
  experiencia: 8,
  experiencia_total: 12,
  noites_jogadas: 3,
  descansado: true,
  bairros: { lapa: 2, centro: 1 },
  pedidos_resolvidos: ['dona-do-bar'],
  status: { camarilla: 'tolerado', anarquistas: 'desconhecido', independentes: 'respeitado', policia: 'desconhecido' },
  refugio: { bairro: 'Lapa', local: 'Um quarto alugado em cima de um bar, com a janela pintada de preto.', seguranca: 'fraca', rebanho: 'nenhum', nota: 'uma tranca nova e um colchão no chão' },
  itens: [
    { espaco: 'roupa', nome: 'Jaqueta de couro gasta', raridade: 'bom', traco: 'impõe respeito numa briga de rua', termos: ['briga', 'intimidar', 'ameacar'], equipado: true },
    { espaco: 'eletronico', nome: 'Celular sem chip', raridade: 'bom', traco: 'só funciona no wi-fi; ninguém rastreia', termos: ['internet', 'pesquisar', 'rastrear'], equipado: true },
    { espaco: 'ferramenta', nome: 'Pé de cabra', raridade: 'comum', traco: 'abre portas, mas faz barulho', equipado: true },
    { espaco: 'consumivel', nome: 'Bolsa de sangue', raridade: 'comum', traco: 'acalma a Fome uma vez, mas só sacia quem tem o sangue ainda ralo (Potência baixa)' },
    { espaco: 'consumivel', nome: 'Perfume forte', raridade: 'comum', traco: '✦ em Lábia para disfarçar o cheiro de sangue na roupa, por uma noite' },
    { espaco: 'arma', nome: 'Canivete de bolso', raridade: 'comum', traco: 'corta, mas não assusta ninguém', equipado: true },
  ],
  feitos: [
    { titulo: 'Primeiro gole', quando: 'Noite 1' },
    { titulo: 'Becos da Lapa', quando: 'Noite 2' },
  ],
};

const CAMINHADA_DO_BRUNO = {
  url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-perfil.png', quadros: 10, largura: 154, altura: 300, parado: 5,
  frente: { url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-frente.png', quadros: 10, largura: 112, altura: 300, parado: 4 },
  costas: { url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-costas.png', quadros: 10, largura: 110, altura: 300, parado: 1 },
  respira: { url: 'img/sprites/618b13d8-810e-4540-8a12-3769f07c2eb3-respira.png', quadros: 8, largura: 78, altura: 300 },
};

function fonteFicticia({ preludio = false } = {}) {
  const noite = preludio
    ? { id: 990001, numero: 1, status: 'aberta', fecha_em: new Date(Date.now() + 2 * 86400000).toISOString() }
    : { id: 990003, numero: 3, status: 'aberta', fecha_em: new Date(Date.now() + 2 * 86400000).toISOString() };
  const narracao = preludio
    ? { id: 'demo-preludio', tipo: 'preludio', paineis: [], texto: PRELUDIO, opcoes: OPCOES_PRELUDIO }
    : {
      id: 'demo-noite-2', tipo: 'noite', noite_id: 990002, paineis: [],
      texto: PRELUDIO,
      opcoes: [...OPCOES_PRELUDIO, 'Procurar o dono do bar e perguntar pelo homem de terno.'],
    };
  const resolvida = { id: 990002, numero: 2, status: 'resolvida', narracao_publica: 'A chuva não parou a noite inteira. Na Lapa, falaram de um homem de terno que não pisca.', paineis: [] };
  let acao = null;
  return {
    noiteAberta: async () => noite,
    narracoesDoPersonagem: async () => [narracao],
    noitesResolvidas: async () => (preludio ? [] : [resolvida]),
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
  // &lugar=lapa-alto-realista: a mesma vista com a pintura realista aumentada (teste de resolução).
  const pintura = pedido.endsWith('-realista') ? 'realista' : null;
  const semPintura = pedido.replace(/-realista$/, '');
  // A vista do alto é o padrão; &vista=olhos mostra a pintura na altura dos olhos.
  const vista = semPintura.endsWith('-alto') ? 'alto' : params.get('vista') === 'olhos' ? 'olhos' : null;
  const lugar = [...LOCAIS, ...(vista === 'alto' ? LOCAIS_EXTRA : [])].some((l) => l.id === semPintura.replace(/-alto$/, '')) ? semPintura.replace(/-alto$/, '') : 'lapa';
  // &ficha=atenta: a ficha fictícia com as habilidades dos escondidos em nível alto (e os poderes da cena).
  // &ficha=poderes: só os poderes (Auspícios 3, Ofuscação 2, Rapidez 3, Presença 1, Dominação 1).
  const PODERES_DEMO = ['sentidos-agucados', 'perscrutar-alma', 'manto-sombras', 'silencio-morte', 'passagem-invisivel', 'ligeireza', 'piscar', 'assombro', 'nublar-memoria'];
  const poderesDemo = ['atenta', 'poderes'].includes(params.get('ficha')) ? PODERES_DEMO : null;
  if (params.get('ficha') === 'atenta') {
    base.ficha = structuredClone(base.ficha);
    const niveis = ((base.ficha.habilidades ||= {}).niveis ||= {});
    for (const h of ['prontidao', 'investigacao', 'intuicao', 'ocultismo', 'manha']) niveis[h] = 4;
  }
  const p = { ...base, _poderes: poderesDemo || undefined, id: 'demo-cena', status: 'ativo', sprite: CAMINHADA_DO_BRUNO, estado: { fome: 2, humanidade: 7, local: 'Lapa', vitalidade: { max: 7 }, vontade: { max: 5 }, ...ESTADO_FASE3 } };
  try { localStorage.setItem('mascara.lido.demo-noite-2', '1'); } catch { /* sem armazenamento */ }
  // Nada da demonstração sai dela: o mapa vai para o mapa fictício; as outras rotas reais ficam fora.
  const irPara = (rota) => {
    if (rota === 'mapa') { location.hash = `#/demo/mapa?${paramsDemo({ lugar: pedido || lugar })}`; return; }
    aviso('Na demonstração, isso fica fora: nada sai da noite fictícia.');
  };
  // O registro da noite fictícia começa limpo a cada carregamento.
  try { localStorage.removeItem('mascara.registro.990003'); } catch { /* sem armazenamento */ }
  if (params.get('caixa')) {
    // Para a folha de capturas: a legenda da primeira noite, a faixa dos feitos e as dicas já vistas.
    try {
      localStorage.setItem('mascara.legenda.990003', '1');
      localStorage.setItem('mascara.feitos-vistos.demo-cena', JSON.stringify(['Primeiro gole', 'Becos da Lapa']));
      localStorage.setItem('mascara.ensinouAlto', '1');
    } catch { /* sem armazenamento */ }
  }
  await telaNoite(raiz, p, { lugar, vista, pintura, fonte: fonteFicticia(), irPara });
  raiz.querySelector('.tela-jogo')?.insertAdjacentHTML('beforeend', faixaDemo('noite fictícia; nada vai ao banco'));
  // Rodada 42: &caixa=historia | outra | legenda | opcoes | glossario | plano | enviado abre a caixa sozinha
  // (para a folha de capturas das caixas).
  const caixa = params.get('caixa');
  if (caixa) setTimeout(() => abrirCaixaDemo(raiz, caixa), 1200);
}

function abrirCaixaDemo(raiz, caixa) {
  raiz.querySelectorAll('.cartao-passagem').forEach((el) => el.remove());
  const porTexto = (t) => [...raiz.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim().startsWith(t));
  const porTitulo = (t) => raiz.querySelector(`[title="${t}"]`);
  const tecla = (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  if (caixa === 'historia') window.__noiteDemo?.historia();
  else if (caixa === 'outra') window.__noiteDemo?.outra();
  else if (caixa === 'legenda') porTitulo('Como funciona a noite')?.click();
  else if (caixa === 'opcoes') porTitulo('Mais opções')?.click();
  else if (caixa === 'glossario') { porTitulo('Ficha (F)')?.click(); setTimeout(() => raiz.querySelector('.janela .termo')?.click(), 1500); }
  else if (caixa === 'plano') tecla('p');
  else if (caixa === 'enviado') window.__noiteDemo?.enviado();
}

// Parâmetros da demonstração (depurar, raf, ficha) mantidos ao trocar de tela; troca só o que vier.
function paramsDemo(muda = {}) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  // PROVISÓRIO (vitrine): quem entrou pelo botão da entrada continua sem o medidor do ?depurar.
  const marca = params.has('vitrine') ? 'vitrine' : 'depurar';
  params.set(marca, '');
  for (const [k, v] of Object.entries(muda)) params.set(k, v);
  return params.toString().replace(`${marca}=`, marca);
}

// Mapa do Rio fictício (rodada 30): o pergaminho com dados de demonstração. Entrar num bairro volta à
// cena da demonstração naquele lugar (na vista do alto, se a cena vinha dela); Esc ou M voltam.
async function demoMapa(raiz) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const veio = params.get('lugar') || 'lapa';
  const alto = /-alto/.test(veio);
  const atual = veio.replace(/-alto.*$/, '');
  const { montarMapa } = await import('./jogo/mapa.js');
  raiz.innerHTML = `
    <div class="tela-jogo tela-mapa">
      <div class="palco"></div>
      <span class="mapa-titulo">Mapa do Rio</span>
      <nav class="mapa-voltar"><button type="button" data-voltar>Voltar à cena</button></nav>
      <p class="mapa-instrucao"><span class="so-mouse">Clique</span><span class="so-toque">Toque</span> num bairro para ir até lá</p>
    </div>`;
  const voltar = (id = veio) => { location.hash = `#/demo/cena?${paramsDemo({ lugar: id })}`; };
  raiz.querySelector('[data-voltar]').onclick = () => voltar();
  montarMapa(raiz.querySelector('.palco'), {
    cla: personagemFicticio().ficha?.cla,
    atualId: atual,
    visitados: new Set([atual, 'centro', 'santa-teresa']),
    descobertas: { [atual]: { vistos: 1, total: 3 }, centro: { vistos: 0, total: 3 }, 'santa-teresa': { vistos: 2, total: 3 } },
    bairros: { lapa: 2, centro: 1 },
  pedidos_resolvidos: ['dona-do-bar'],
    clima: 'noite de garoa',
    aoEntrar: (id) => voltar(alto ? `${id}-alto` : id),
    aoTecla: (ev) => { if (ev.key === 'Escape' || ev.key.toLowerCase() === 'm') { ev.preventDefault(); voltar(); } },
  });
  raiz.querySelector('.tela-jogo')?.insertAdjacentHTML('beforeend', faixaDemo('mapa fictício; nada vai ao banco'));
}

const DEMOS = { espera: demoEspera, preludio: demoPreludio, entrada: demoEntrada, senha: demoSenha, cena: demoCena, mapa: demoMapa };

export function telaDemo(raiz, nome) {
  document.body.dataset.tela = 'cena';
  const demo = DEMOS[nome];
  if (!demo) {
    raiz.innerHTML = `<div class="tela-jogo"><section class="dialogo-cena"><div class="dialogo-corpo"><p>Demonstrações: ${Object.keys(DEMOS).map((n) => `<a href="#/demo/${n}?depurar">${n}</a>`).join(' · ')}</p></div></section></div>`;
    return;
  }
  demo(raiz);
}

