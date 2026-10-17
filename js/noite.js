// Tela de jogo: a cena do lugar em tela cheia. O personagem anda (WASD ou clique), conversa com os
// pontos de interesse e monta o plano da noite. Narração, escolhas e janelas aparecem por cima da cena.
import * as v5 from './motor/v5.js';
import * as banco from './banco.js';
import { esc, escolhas, narracao, narracaoComPaineis, dataLonga, dataCurta, aviso } from './ui.js';
import { telaFicha } from './ficha.js';
import { telaDiario } from './diario.js';
import { retratoDe, imagemDoLocal, localDe, LOCAIS, CENARIO_ABERTURA } from './cidade.js';
import { som, efeitos, definirTempo, definirSomDoLugar } from './ambiente.js';
import { ir } from './app.js';
import { montarCena } from './jogo/cena.js';
import { montarMapa } from './jogo/mapa.js';
import { abrirDialogo, abrirJanela, fecharTudo, confirmarEscolha, perguntar } from './jogo/camadas.js';
import { geografia, distribuirAncoras } from './jogo/lugares.js';
import { descobertas, todasDescobertas, brasas, fraseDescobertas } from './jogo/detalhes.js';
import { ligarGlossario } from './glossario.js';
import { registroDaNoite, registrar, prazoRestante, quandoCurto, quandoONarradorVolta } from './jogo/registro.js';
import { sugestoesDeCacada } from './jogo/cacadas.js';
import { lerLeitura, gravarLeitura, cerimoniasCurtas, RITMOS } from './leitura.js';

const MAX_MARCADORES = 5; // à vista ao entrar; o resto aparece de perto ou com Tab
const comentadosNaSessao = new Set(); // reserva, se o aparelho não guardar nada

const curto = (t, n = 5) => {
  const palavras = String(t).replace(/[.!?]$/, '').split(/\s+/);
  return palavras.length > n ? `${palavras.slice(0, n).join(' ')}…` : palavras.join(' ');
};

function chavePlano(noite, p) {
  return `mascara.plano.${noite?.id}.${p.id}`;
}

// Onde o personagem está nesta noite: começa no local do estado (definido pelo Narrador) e muda
// quando o jogador viaja pelo mapa. Guardado no aparelho, por noite: noite nova volta ao local do estado.
function chavePosicao(p, noite) {
  return `mascara.posicao.${p.id}.${noite?.id || 'sem-noite'}`;
}

export function lerPosicao(p, noite) {
  let id = null;
  try { id = localStorage.getItem(chavePosicao(p, noite)); } catch { /* sem armazenamento */ }
  return LOCAIS.some((l) => l.id === id) ? id : (localDe(p.estado?.local)?.id || null);
}

export function gravarPosicao(p, noite, id) {
  try {
    if (id && id !== localDe(p.estado?.local)?.id) localStorage.setItem(chavePosicao(p, noite), id);
    else localStorage.removeItem(chavePosicao(p, noite));
  } catch { /* sem armazenamento */ }
}

export async function telaNoite(raiz, p, { lugar = null, abrir = null } = {}) {
  raiz.innerHTML = '<p class="carregando centro">A noite cai sobre o Rio…</p>';
  const [noite, narracoes, resolvidas, ultima] = await Promise.all([
    banco.noiteAberta(),
    banco.narracoesDoPersonagem(p.id),
    banco.noitesResolvidas(),
    banco.ultimaNoite().catch(() => null),
  ]);
  let acao = noite ? await banco.minhaAcao(noite.id, p.id) : null;

  const narrNoite = narracoes.find((n) => n.tipo === 'noite');
  const ultimaNoite = narrNoite ? resolvidas.find((n) => n.id === narrNoite.noite_id) : null;
  const preludio = narracoes.find((n) => n.tipo === 'preludio');
  const atual = narrNoite && ultimaNoite ? narrNoite : preludio;
  const opcoes = noite && Array.isArray(narracoes[0]?.opcoes) ? narracoes[0].opcoes.filter((o) => typeof o === 'string') : [];

  const localAtual = localDe(p.estado?.local);
  // Rota #/lugar/<id> muda a posição; #/noite mostra onde o personagem está agora.
  if (lugar) gravarPosicao(p, noite, lugar);
  else lugar = lerPosicao(p, noite);
  const visitado = lugar ? LOCAIS.find((l) => l.id === lugar) : null;
  const emOutroLugar = visitado && visitado.id !== localAtual?.id;
  const lugarNome = emOutroLugar ? visitado.nome : (localAtual?.nome || p.estado?.local || 'Rio de Janeiro');
  // Geografia da pintura (chão, âncoras, objetos, luzes) e o que dá para descobrir no lugar.
  const lugarId = emOutroLugar ? visitado.id : (localAtual?.id || null);
  const geo = geografia(lugarId);
  const achados = descobertas(lugarId, noite?.numero || 0);
  // Cada noite tem um tempo (garoa, tempestade, lua, névoa), sorteado pelo número dela: o mesmo para
  // todos os jogadores, diferente de uma noite para outra.
  const tempo = tempoDaNoite(noite?.numero || 0);
  definirTempo(tempo);
  definirSomDoLugar(lugarId);
  const primeiraVisita = !!lugarId && !visitados().has(lugarId);
  if (lugarId) { marcarVisitado(lugarId); registrar(noite?.id, 'visitados', lugarId); }
  // Descobertas deste lugar nesta noite (os detalhes sorteados), para o HUD.
  const descobertasDoLugar = () => ({ vistos: achados.detalhes.filter((d) => visto(d.id)).length, total: achados.detalhes.length });
  const chaveVisto = (id) => `mascara.visto.${lugarId}.${id}`;
  const visto = (id) => { try { return localStorage.getItem(chaveVisto(id)) === '1'; } catch { return false; } };

  // Fundo da cena: o lugar visitado ou onde o personagem está.
  const fundo = document.getElementById('cenario');
  const imagem = emOutroLugar ? (visitado.imagem || imagemDoLocal('')) : imagemDoLocal(p.estado?.local);
  if (fundo) { fundo.style.backgroundImage = `url('${imagem}')`; fundo.dataset.url = imagem; }

  // Plano da noite: o que já foi enviado, mais o rascunho guardado no aparelho.
  let plano = { principal: '', cacada: '', nao_cacar: false, curta_1: '', curta_2: '', esforco: false, ...(acao || {}) };
  try { plano = { ...plano, ...(JSON.parse(localStorage.getItem(chavePlano(noite, p))) || {}) }; } catch { /* sem rascunho */ }
  let alterado = false;

  // --- Interface sobre a cena ---------------------------------------------------------------
  const retrato = retratoDe(p);
  const fome = p.estado?.fome ?? 0;
  raiz.innerHTML = `
    <div class="tela-jogo">
      <div class="palco"></div>
      <header class="hud-topo">
        <button type="button" class="hud-personagem" data-hud="ficha" title="Ficha (F)">
          <img src="${esc(retrato)}" alt="">
          <span>
            <b>${esc(p.nome)}</b>
            <small>${esc(v5.cla(p.ficha?.cla)?.nome || '')} · ${esc(lugarNome)}<span class="hud-descobertas" title="Detalhes para examinar neste lugar, nesta noite"></span></small>
            <span class="gotas" aria-label="Fome">${Array.from({ length: 5 }, (_, i) => `<svg class="gota ${i < fome ? 'cheia' : ''}" viewBox="0 0 12 16"><path d="M6 1C8 5 11 7.5 11 10.5A5 5 0 0 1 1 10.5C1 7.5 4 5 6 1z"/></svg>`).join('')}</span>
          </span>
        </button>
        <div class="hud-noite">
          ${noite ? `<b>Noite ${noite.numero}</b><small>fecha ${esc(dataLonga(noite.fecha_em))}</small>` : '<b>A cidade dorme</b><small>a próxima noite ainda não abriu</small>'}
        </div>
        <nav class="hud-botoes">
          <button type="button" class="hud-com-icone" data-hud="mapa" title="Mapa do Rio (M)" aria-label="Mapa do Rio"><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg><span class="hud-nome">Mapa <kbd>M</kbd></span></button>
          <button type="button" class="hud-com-icone" data-hud="ficha" title="Ficha (F)" aria-label="Ficha"><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/><path d="M9 2.5v6a1.6 1.6 0 0 0 3.2 0V4"/><path d="M8 13h8M8 16.5h6"/></svg><span class="hud-nome">Ficha <kbd>F</kbd></span></button>
          <button type="button" class="hud-com-icone" data-hud="diario" title="Diário (J)" aria-label="Diário"><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 3v18"/><path d="M12 8h4M12 11.5h4"/></svg><span class="hud-nome">Diário <kbd>J</kbd></span></button>
          <button type="button" data-hud="efeitos" class="hud-icone" aria-pressed="${efeitos.ligados()}" title="Chuva e efeitos">☂</button>
          <button type="button" data-hud="som" class="hud-icone" aria-pressed="${som.ligado()}" title="Som ambiente">♪</button>
          <button type="button" data-hud="legenda" class="hud-icone" title="Como funciona a noite">?</button>
          <button type="button" data-hud="menu" class="hud-icone" title="Mais opções">⋯</button>
        </nav>
      </header>
      <aside class="hud-plano" aria-live="polite"></aside>
      <footer class="hud-dicas"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> andar · <kbd>Shift</kbd> correr · <kbd>E</kbd> interagir · <kbd>Tab</kbd> mostrar tudo · <kbd>M</kbd> mapa · <kbd>P</kbd> plano · <kbd>F</kbd> ficha · <kbd>J</kbd> diário</footer>
    </div>`;
  const palco = raiz.querySelector('.palco');
  const caixaPlano = raiz.querySelector('.hud-plano');
  const camadas = raiz.querySelector('.tela-jogo');

  function guardarRascunho() {
    alterado = true;
    // Quadro recolhido (celular): abre sozinho por 2 s para mostrar o que mudou.
    if (quadroRecolhido) { abertoAte = Date.now() + 2000; setTimeout(() => desenharPlano(), 2100); }
    try { localStorage.setItem(chavePlano(noite, p), JSON.stringify(plano)); } catch { /* sem armazenamento */ }
    desenharPlano();
    cena?.atualizarPontos(montarPontos());
  }

  // Selo compacto do plano, no alto à direita: a ação principal e o estado (a escolher, pronto, enviado).
  // O plano completo abre no clique ou com P; o envio fica no próprio selo quando há algo para enviar.
  // Quadro da noite: as três partes da noite (ação principal, caçada, ações curtas), o que já foi
  // escolhido em cada uma, o que falta e quanto tempo resta. Cada linha abre o lugar certo.
  const partes = () => {
    const curtas = [plano.curta_1, plano.curta_2].filter((x) => x?.trim()).length;
    const principal = !!plano.principal?.trim();
    const cacada = !!(plano.cacada?.trim() || plano.nao_cacar);
    return { principal, cacada, curtas, prontas: (principal ? 1 : 0) + (cacada ? 1 : 0) };
  };
  const celular = window.matchMedia?.('(max-width: 700px)').matches;
  let quadroRecolhido = (() => {
    try { const v = localStorage.getItem('mascara.quadroRecolhido'); return v == null ? !!celular : v === '1'; } catch { return !!celular; }
  })();
  let abertoAte = 0;
  // Entre noites, o quadro mostra em que ponto o ciclo está e o que dá para fazer enquanto isso.
  function desenharCiclo() {
    const lida = (() => { if (!narrNoite) return true; try { return localStorage.getItem(`mascara.lido.${narrNoite.id}`) === '1'; } catch { return true; } })();
    const { estado, html } = htmlCiclo(ultima, lida);
    caixaPlano.hidden = false;
    caixaPlano.className = `hud-plano quadro-noite quadro-ciclo ciclo-${estado}`;
    caixaPlano.innerHTML = html;
  }

  // Encerrar a noite: só aparece depois do envio e quando o banco já tem a coluna (encerrada_em).
  let todosEncerrados = false;
  const encerrada = () => !!acao?.encerrada_em;
  const podeEncerrar = () => !!acao && !alterado && !encerrada() && Object.prototype.hasOwnProperty.call(acao, 'encerrada_em');
  const avisarEncerrada = () => { if (encerrada()) { aviso('Você já encerrou esta noite. Não dá mais para mudar.'); return true; } return false; };

  async function encerrar() {
    if (!podeEncerrar()) return;
    const r = await perguntar(camadas, {
      rotulo: 'Encerrar a noite',
      texto: '<p>Você termina a noite com o plano que enviou. Quando todos encerrarem, o Narrador começa a resolver. Depois disso, não dá mais para mudar.</p>',
      opcoes: ['Encerrar minha noite', 'Ainda não'],
    });
    if (r !== 0) return;
    try {
      acao = await banco.encerrarNoite(acao.id);
      todosEncerrados = await banco.todosEncerraram(noite.id);
      desenharPlano();
      som.selo?.();
    } catch (err) {
      aviso(err.message, 'erro');
    }
  }

  function desenharPlano() {
    if (!noite) { desenharCiclo(); return; }
    const enviado = acao && !alterado;
    const pt = partes();
    const estado = enviado ? 'enviado' : pt.principal && pt.cacada ? 'pronto' : pt.principal ? 'quase' : 'vazio';
    const linhaPrincipal = pt.principal ? `${esc(curto(plano.principal, 7))} <i>✓</i>` : '<em>falta escolher</em>';
    const linhaCacada = plano.nao_cacar ? 'não vou caçar <i>✓</i>' : pt.cacada ? `${esc(curto(plano.cacada, 5))} <i>✓</i>` : '<em>falta</em> <small>(sem caçar, a Fome não baixa)</small>';
    const pe = encerrada()
      ? `<span class="quadro-encerrada">${todosEncerrados ? '<b>Todos encerraram</b> · o Narrador já começou' : '<b>Noite encerrada</b> · esperando os outros encerrarem'}</span>`
      : enviado
        ? `<span class="quadro-enviado">Enviado ${esc(dataCurta(acao.atualizado_em))} · pode mudar até ${esc(quandoCurto(noite.fecha_em))}</span>${podeEncerrar() ? '<button type="button" class="btn-secundario plano-encerrar" data-hud="encerrar">Encerrar minha noite</button>' : ''}`
        : `<span>${acao ? 'Mudanças não enviadas' : 'Não enviado'} · ${esc(prazoRestante(noite.fecha_em))}</span>`;
    const recolhidoAgora = quadroRecolhido && Date.now() > abertoAte;
    caixaPlano.className = `hud-plano quadro-noite plano-${estado}${recolhidoAgora ? ' recolhido' : ''}`;
    caixaPlano.innerHTML = `
      <button type="button" class="quadro-cabeca" data-hud="recolher" aria-expanded="${!quadroRecolhido}">
        <span class="plano-marca" aria-hidden="true">${enviado ? '✓' : pt.prontas}</span>
        <span><b>Noite ${noite.numero}</b> · ${enviado ? 'plano enviado' : `${pt.prontas} de 2 <span class="desc-longa">obrigatórias </span>prontas`}<span class="quadro-prazo-curto"> · ${esc(prazoRestante(noite.fecha_em).replace(/ \(.*\)$/, ''))}</span></span>
        <span class="quadro-seta" aria-hidden="true">${quadroRecolhido ? '▸' : '▾'}</span>
      </button>
      <ol class="quadro-linhas">
        <li class="${pt.principal ? 'ok' : 'falta'}"><button type="button" data-hud="linha-principal"><span class="quadro-nome">Ação principal <small>obrigatória</small></span><span class="quadro-valor">${linhaPrincipal}</span></button></li>
        <li class="${pt.cacada ? 'ok' : 'falta'}"><button type="button" data-hud="linha-cacada"><span class="quadro-nome">Caçada <small>obrigatória</small></span><span class="quadro-valor">${linhaCacada}</span></button></li>
        <li class="${pt.curtas ? 'ok' : 'opcional'}"><button type="button" data-hud="linha-curtas"><span class="quadro-nome">Ações curtas <small>opcional</small></span><span class="quadro-valor">${pt.curtas} de 2</span></button></li>
      </ol>
      <div class="quadro-pe">${pe}${pt.principal && !enviado ? `<button type="button" class="btn plano-enviar${pt.cacada ? ' destaque' : ''}" data-hud="enviar">${acao ? 'Reenviar' : 'Enviar'}</button>` : ''}</div>`;
    const hd = raiz.querySelector('.hud-descobertas');
    if (hd) {
      const d = descobertasDoLugar();
      hd.innerHTML = d.total ? ` ${brasas(d.vistos, d.total)}` : '';
    }
  }

  async function enviar() {
    if (avisarEncerrada()) return;
    if (!plano.principal?.trim()) { aviso('Escolha ou escreva a ação principal primeiro.'); return; }
    const campos = {
      principal: plano.principal.trim(), cacada: (plano.cacada || '').trim(), nao_cacar: !!plano.nao_cacar,
      curta_1: (plano.curta_1 || '').trim(), curta_2: (plano.curta_2 || '').trim(), esforco: !!plano.esforco,
    };
    try {
      acao = await banco.salvarAcao(noite.id, p.id, campos, acao?.id);
      alterado = false;
      try { localStorage.removeItem(chavePlano(noite, p)); } catch { /* sem armazenamento */ }
      desenharPlano();
      cerimoniaDoEnvio();
    } catch (err) {
      aviso(err.message, 'erro');
    }
  }

  // Enviar o plano é o momento mais importante da noite: uma gota de sangue cai sobre o selo,
  // um som marca o envio e uma frase curta confirma. Outros módulos podem ouvir 'mascara:plano-enviado'.
  function cerimoniaDoEnvio() {
    document.dispatchEvent(new CustomEvent('mascara:plano-enviado', { detail: { noite: noite?.id } }));
    som.selo?.();
    const base = camadas.getBoundingClientRect();
    const marca = (caixaPlano.querySelector('.plano-marca') || caixaPlano).getBoundingClientRect();
    const gota = document.createElement('span');
    gota.className = 'gota-envio';
    gota.style.left = `${marca.left - base.left + marca.width / 2}px`;
    gota.style.top = `${marca.top - base.top + marca.height / 2}px`;
    camadas.appendChild(gota);
    setTimeout(() => gota.remove(), 1400);
    setTimeout(() => {
      caixaPlano.classList.add('selo-mudou');
      setTimeout(() => caixaPlano.classList.remove('selo-mudou'), 900);
    }, 420);
    const letreiro = document.createElement('div');
    letreiro.className = 'letreiro-envio';
    letreiro.setAttribute('role', 'status');
    letreiro.innerHTML = '<b>O Rio vai saber o que você fez esta noite.</b><small>O Narrador resolve quando a noite fechar.</small>';
    camadas.appendChild(letreiro);
    setTimeout(() => letreiro.remove(), 4200);
  }

  // --- Pontos de interesse ------------------------------------------------------------------
  // Cada ponto fica numa âncora da pintura: o que aconteceu num lugar de memória, a caçada num canto
  // escuro, as opções da noite no lugar de que falam ("bar" na porta do bar). No máximo 5 à vista ao
  // entrar; os outros e os detalhes para examinar aparecem quando o personagem chega perto (ou com Tab).
  function montarPontos() {
    const pedidos = [];
    if (!emOutroLugar && atual) pedidos.push({ id: 'historia', tipo: 'historia', icone: '❦', rotulo: 'O que aconteceu', acao: 'Relembrar o que aconteceu', papel: 'memoria' });
    if (noite && atual) {
      if (!emOutroLugar) {
        opcoes.forEach((o, i) => pedidos.push({ id: `opcao-${i}`, tipo: 'acao', icone: String(i + 1), rotulo: curto(o), acao: o, texto: o, feito: plano.principal === o, alternativa: !!plano.principal?.trim() && plano.principal !== o }));
      } else {
        const l = visitado;
        [
          { id: 'explorar', rotulo: `Explorar ${l.em.replace(/^(na|no|em) /, '')}`, texto: `Ir ${l.a} e explorar a região, de olho em quem manda ali.` },
          { id: 'procurar', rotulo: 'Procurar alguém aqui', texto: `Ir ${l.a} e procurar alguém.`, livre: true },
        ].forEach((o) => pedidos.push({ ...o, tipo: 'acao', icone: '!', acao: o.rotulo, feito: plano.principal === o.texto }));
      }
      pedidos.push({ id: 'cacar', tipo: 'cacar', icone: '♦', rotulo: emOutroLugar ? `Caçar ${visitado.em}` : 'Caçar', acao: 'Decidir a caçada', feito: !!(plano.cacada || plano.nao_cacar), falta: !(plano.cacada || plano.nao_cacar), papel: 'escuro' });
      pedidos.push({ id: 'escrever', tipo: 'escrever', icone: '✎', rotulo: 'Outra ideia', acao: 'Escrever o que fazer', papel: 'livre' });
    }
    const ancoras = distribuirAncoras(geo, pedidos);
    const pts = [
      { id: 'mapa', tipo: 'saida', icone: '➜', rotulo: emOutroLugar ? 'Voltar ao mapa' : 'Mapa do Rio', acao: 'Abrir o mapa do Rio', x: geo.saida[0], y: geo.saida[1] },
      ...pedidos.map((pd) => { const a = ancoras.get(pd.id); return { ...pd, x: a?.x ?? 0.5, y: a?.y ?? 0.82 }; }),
    ];
    // A caçada é obrigatória: fica sempre à vista; o limite de 5 vale para os outros.
    let vistos = 0;
    pts.forEach((pt) => { if (pt.id === 'cacar' || vistos < MAX_MARCADORES - (pts.some((x) => x.id === 'cacar') ? 1 : 0)) { if (pt.id !== 'cacar') vistos++; } else pt.discreto = true; });
    achados.detalhes.forEach((d) => pts.push({
      id: `detalhe-${d.id}`, tipo: 'detalhe', icone: visto(d.id) ? '·' : '?', rotulo: d.rotulo, acao: `Examinar: ${d.rotulo}`,
      x: d.x, y: d.y, discreto: true, visto: visto(d.id), detalhe: d,
    }));
    return pts;
  }

  // Detalhe examinado: uma fala curta de voz interior, sem mudar regras. Fica marcado no aparelho.
  function abrirDetalhe(pt) {
    const d = pt.detalhe;
    // Conta na hora em que o detalhe abre (o contador do HUD pulsa).
    try { localStorage.setItem(chaveVisto(d.id), '1'); } catch { /* sem armazenamento */ }
    registrar(noite?.id, 'detalhes', { lugar: lugarId, id: d.id, rotulo: d.rotulo, voz: d.voz, texto: d.texto });
    desenharPlano();
    const hdAgora = raiz.querySelector('.hud-descobertas');
    if (hdAgora) { hdAgora.classList.remove('subiu'); void hdAgora.offsetWidth; hdAgora.classList.add('subiu'); }
    abrirDialogo(camadas, {
      rotulo: d.rotulo,
      html: `<div class="texto-narracao">${narracao(`[${d.voz}] ${d.texto}`)}</div>`,
      rodape: '<span class="nota"><span class="so-teclado"><kbd>Esc</kbd> fecha · </span>ande pela cena para descobrir mais</span>',
      aoFechar: () => {
        cena?.atualizarPontos(montarPontos());
      },
    });
  }

  // Voz interior que comenta ao passar perto: cada comentário uma vez por noite.
  function podeComentar(c) {
    const k = `mascara.comentou.${noite?.id || 'sem-noite'}.${lugarId}.${c.id}`;
    if (comentadosNaSessao.has(k)) return false;
    comentadosNaSessao.add(k);
    try {
      if (localStorage.getItem(k)) return false;
      localStorage.setItem(k, '1');
    } catch { /* sem armazenamento: vale a memória da sessão */ }
    registrar(noite?.id, 'comentarios', { lugar: lugarId, id: c.id, voz: c.voz, texto: c.texto });
    return true;
  }

  // Legenda da noite: na primeira entrada de cada noite (e no botão "?"), o que se faz numa noite.
  function abrirLegenda() {
    const prazo = noite ? `Envie até ${esc(quandoCurto(noite.fecha_em))} (${esc(prazoRestante(noite.fecha_em))}).` : '';
    const camada = abrirDialogo(camadas, {
      rotulo: noite ? `Como funciona a noite ${noite.numero}` : 'Como funciona a noite',
      html: `
        <div class="legenda-noite">
          <div class="legenda-cartao"><span class="legenda-icone">1</span><b>Ação principal</b><p>Obrigatória. Os pontos numerados são as opções desta noite; o lápis (✎) deixa você escrever outra ideia.</p></div>
          <div class="legenda-cartao"><span class="legenda-icone ic-caca">♦</span><b>Caçada</b><p>Obrigatória. Diga onde e como seu vampiro se alimenta. Sem caçar, a Fome não baixa.</p></div>
          <div class="legenda-cartao"><span class="legenda-icone ic-curta">✎</span><b>Ações curtas</b><p>Opcionais, até 2: uma ligação, passar num lugar, observar alguém.</p></div>
        </div>
        <p class="nota">Os pontos com <b>?</b> são detalhes para examinar. O quadro no canto mostra o que já está pronto e o que falta. ${prazo}</p>
        <ol class="escolhas"><li><button type="button" data-principal><span class="escolha-num">1.</span> — Entendi</button></li></ol>`,
    });
    camada.el.querySelector('[data-principal]').onclick = () => camada.fechar();
  }

  // --- Diálogos ------------------------------------------------------------------------------
  function htmlHistoria() {
    if (!atual) return '<p>O Narrador ainda está escrevendo o seu prelúdio.</p>';
    if (atual === preludio) {
      return `${narracaoComPaineis(preludio.texto, preludio.paineis, { cenario: imagem, classe: 'privada' })}${escolhas(opcoes)}`;
    }
    return `${ultimaNoite.narracao_publica || ultimaNoite.paineis?.length ? `<h3>Nas ruas do Rio</h3>${narracaoComPaineis(ultimaNoite.narracao_publica, ultimaNoite.paineis, { cenario: imagem })}` : ''}
      <h3>Só você sabe</h3>${narracaoComPaineis(narrNoite.texto, narrNoite.paineis, { cenario: imagem, classe: 'privada' })}
      ${escolhas(opcoes)}`;
  }

  function escolherPrincipal(texto, camada) {
    plano.principal = texto;
    guardarRascunho();
    aviso('Ação principal escolhida. Envie quando o plano estiver pronto.');
    camada?.fechar();
  }

  function abrirHistoria(revelar, depois) {
    const camada = abrirDialogo(camadas, {
      aoFechar: depois,
      rotulo: atual === preludio ? 'Prelúdio' : `Noite ${ultimaNoite?.numero}`,
      html: htmlHistoria(),
      chave: revelar ? atual?.id : null,
      aoAvancar: () => som.toque(),
      rodape: noite ? `<span class="nota">Escolha uma fala<span class="so-teclado"> (1 a ${opcoes.length || 1})</span> ou feche e ande pela cena.<span class="so-teclado"> <kbd>Esc</kbd> fecha.</span></span>` : '<span class="nota">A próxima noite ainda não abriu.<span class="so-teclado"> <kbd>Esc</kbd> fecha.</span></span>',
    });
    camada.el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-escolha]');
      if (b && noite && !b.closest('.decidido')) confirmarEscolha(b, () => escolherPrincipal(opcoes[Number(b.dataset.escolha)], camada));
    });
  }

  function abrirOpcao(pt) {
    const texto = pt.texto;
    const camada = abrirDialogo(camadas, {
      rotulo: emOutroLugar ? visitado.nome : 'Esta noite',
      html: `
        <div class="texto-narracao"><p class="voz voz-alma"><span class="voz-nome">VOCÊ</span> — ${esc(texto)}</p></div>
        ${pt.livre ? `<label>O que exatamente?<textarea data-livre rows="3" maxlength="1200">${esc(texto)} </textarea></label>` : ''}
        <ol class="escolhas">
          <li><button type="button" data-principal><span class="escolha-num">1.</span> — Fazer isto esta noite</button></li>
          <li><button type="button" data-fechar-dialogo><span class="escolha-num">2.</span> — Pensar melhor</button></li>
        </ol>`,
      rodape: plano.principal && plano.principal !== texto ? `<span class="nota">Isto substitui a ação principal atual: “${esc(curto(plano.principal, 10))}”.</span>` : '',
    });
    camada.el.querySelector('[data-principal]').onclick = (ev) => {
      const livre = camada.el.querySelector('[data-livre]');
      const escolhido = livre ? livre.value.trim() : texto;
      confirmarEscolha(ev.currentTarget, () => escolherPrincipal(escolhido, camada));
    };
    camada.el.querySelector('[data-fechar-dialogo]').onclick = () => camada.fechar();
    camada.el.querySelector('[data-livre]')?.focus();
  }

  function abrirCacada() {
    const pr = v5.predador(p.ficha?.predador?.id);
    const lugarCaca = emOutroLugar ? visitado.em : (localAtual?.em || `em ${lugarNome}`);
    // Três sugestões do tipo de predador, mais as saídas de sempre: do seu jeito, outra ideia, não caçar.
    const onde = emOutroLugar ? ` (${visitado.em})` : '';
    const sugestoes = sugestoesDeCacada(p.ficha?.predador?.id).map((t) => t.replace(/\.$/, '') + onde + '.');
    const opcoesCaca = [...sugestoes, `Do meu jeito de sempre, ${lugarCaca}.`, 'Escrever outra ideia', 'Não vou caçar esta noite (a Fome não baixa)'];
    const camada = abrirDialogo(camadas, {
      rotulo: 'A caçada',
      html: `
        <div class="texto-narracao"><p class="voz voz-besta"><span class="voz-nome">A FOME</span> — ${fome >= 3 ? 'Eu não espero mais. Hoje você bebe.' : 'Hoje eu só ronrono. Mas não fui embora.'}</p></div>
        <p class="nota">${pr ? `Você é ${esc(pr.nome)}: ${esc(pr.desc.toLowerCase())}` : ''}</p>
        <label class="caca-livre" hidden>Onde e como você caça esta noite
          <textarea data-cacada rows="2" maxlength="800">${esc(plano.cacada && !plano.nao_cacar ? plano.cacada : '')}</textarea>
          <button type="button" class="btn" data-confirmar-livre>Guardar a caçada</button>
        </label>
        <ol class="escolhas">${opcoesCaca.map((o, i) => `<li><button type="button" data-caca="${i}"><span class="escolha-num">${i + 1}.</span> — ${esc(o)}</button></li>`).join('')}</ol>`,
    });
    const guardar = (botao, texto, naoCacar) => {
      plano.cacada = naoCacar ? '' : texto;
      plano.nao_cacar = naoCacar;
      confirmarEscolha(botao, () => { guardarRascunho(); camada.fechar(); });
    };
    camada.el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-caca]');
      if (b) {
        const i = Number(b.dataset.caca);
        if (i < sugestoes.length) guardar(b, sugestoes[i], false);
        else if (i === sugestoes.length) guardar(b, emOutroLugar ? `Caçar do meu jeito de sempre ${visitado.em}` : 'Do meu jeito de sempre', false);
        else if (i === sugestoes.length + 1) { const l = camada.el.querySelector('.caca-livre'); l.hidden = false; l.querySelector('textarea').focus(); }
        else guardar(b, '', true);
        return;
      }
      if (ev.target.closest('[data-confirmar-livre]')) {
        const t = camada.el.querySelector('[data-cacada]').value.trim();
        if (t) guardar(ev.target, t, false);
      }
    });
  }

  function abrirEscrita() {
    const camada = abrirDialogo(camadas, {
      rotulo: 'Outra ideia',
      html: `
        <label>Ação principal: o que seu personagem faz de mais importante esta noite
          <textarea data-livre rows="3" maxlength="1500" placeholder="Ex.: Vou ao Theatro Municipal tentar descobrir quem é o Xerife.">${esc(plano.principal || '')}</textarea>
        </label>
        <label>Ação curta 1 (opcional)<input data-c1 maxlength="500" value="${esc(plano.curta_1 || '')}" placeholder="Uma ligação, passar num lugar, observar alguém"></label>
        <label>Ação curta 2 (opcional)<input data-c2 maxlength="500" value="${esc(plano.curta_2 || '')}"></label>
        <label class="radio"><input type="checkbox" data-esforco ${plano.esforco ? 'checked' : ''}> Se for preciso, gaste minha Força de Vontade para tentar de novo</label>
        <ol class="escolhas"><li><button type="button" data-principal><span class="escolha-num">1.</span> — Guardar no plano</button></li></ol>`,
    });
    camada.el.querySelector('[data-livre]').focus();
    camada.el.querySelector('[data-principal]').onclick = (ev) => {
      plano.principal = camada.el.querySelector('[data-livre]').value.trim();
      plano.curta_1 = camada.el.querySelector('[data-c1]').value.trim();
      plano.curta_2 = camada.el.querySelector('[data-c2]').value.trim();
      plano.esforco = camada.el.querySelector('[data-esforco]').checked;
      confirmarEscolha(ev.currentTarget, () => { guardarRascunho(); camada.fechar(); });
    };
  }

  // Janela do plano (P): as três partes da noite como lista, com o estado de cada uma e onde mudar.
  function abrirPlano() {
    abrirJanela(camadas, {
      titulo: noite ? `Plano da noite ${noite.numero}` : 'Plano da noite',
      montar: (corpo, camada) => {
        const desenhar = () => {
          const pt = partes();
          const enviado = acao && !alterado;
          const item = (ok, nome, tipo, valor, botoes) => `
            <li class="plano-item ${ok ? 'ok' : tipo === 'opcional' ? 'opcional' : 'falta'}">
              <div class="plano-item-cabeca"><span class="plano-item-marca">${ok ? '✓' : tipo === 'opcional' ? '·' : '!'}</span><b>${nome}</b><small>${tipo}</small></div>
              <p>${valor}</p>
              <div class="plano-item-botoes">${botoes}</div>
            </li>`;
          corpo.innerHTML = `
            <p class="nota">${noite ? `${esc(prazoRestante(noite.fecha_em))}, ou antes, se todos enviarem.` : 'A próxima noite ainda não abriu.'}</p>
            <ol class="plano-lista">
              ${item(pt.principal, 'Ação principal', 'obrigatória', pt.principal ? esc(plano.principal) : '<em>Falta escolher. Ande até um ponto numerado ou escreva a sua ideia.</em>',
                `${opcoes.length && !emOutroLugar ? '<button type="button" class="btn-secundario" data-ir="opcoes">Escolher entre as opções</button>' : '<button type="button" class="btn-secundario" data-ir="cena">Escolher na cena</button>'}<button type="button" class="btn-texto" data-ir="escrever">Escrever do meu jeito</button>`)}
              ${item(pt.cacada, 'Caçada', 'obrigatória', plano.nao_cacar ? 'Não vou caçar esta noite (a Fome não baixa).' : pt.cacada ? esc(plano.cacada) : '<em>Falta decidir. Em branco, você caça do seu jeito de sempre; sem caçar, a Fome não baixa.</em>',
                '<button type="button" class="btn-secundario" data-ir="cacada">Decidir a caçada</button>')}
              ${item(pt.curtas > 0, 'Ações curtas', 'opcional', pt.curtas ? [plano.curta_1, plano.curta_2].filter((x) => x?.trim()).map((x) => `• ${esc(x)}`).join('<br>') : 'Nenhuma. Até 2, se quiser: uma ligação, passar num lugar, observar alguém.',
                '<button type="button" class="btn-texto" data-ir="escrever">Escrever ações curtas</button>')}
            </ol>
            ${plano.esforco ? '<p class="nota">Se for preciso, sua Força de Vontade será gasta para tentar de novo.</p>' : ''}
            <div class="botoes"><span class="nota">${enviado ? `Enviado ${esc(dataCurta(acao.atualizado_em))} · pode mudar até ${esc(quandoCurto(noite.fecha_em))}` : acao ? 'Mudanças não enviadas.' : 'Ainda não enviado.'}</span>
              <button type="button" class="btn" data-enviar-plano ${noite && pt.principal && !enviado ? '' : 'disabled'}>${acao ? 'Reenviar' : 'Enviar'}</button></div>`;
        };
        desenhar();
        corpo.addEventListener('click', async (ev) => {
          const ir = ev.target.closest('[data-ir]')?.dataset.ir;
          if (ir) {
            camada.fechar();
            if (ir === 'opcoes') abrirHistoria(false);
            else if (ir === 'cacada') abrirCacada();
            else if (ir === 'escrever') abrirEscrita();
            return;
          }
          if (ev.target.closest('[data-enviar-plano]')) { await enviar(); if (acao && !alterado) camada.fechar(); else desenhar(); }
        });
      },
    });
  }

  function abrirFicha() {
    abrirJanela(camadas, { titulo: 'Ficha', classe: 'janela-larga', montar: (corpo) => telaFicha(corpo, p) });
  }

  function abrirDiario() {
    abrirJanela(camadas, { titulo: 'Diário', classe: 'janela-larga', montar: (corpo) => telaDiario(corpo, p, { noite, plano }) });
  }

  function abrirMenu() {
    abrirJanela(camadas, {
      titulo: 'Opções',
      montar: (corpo, camada) => {
        corpo.innerHTML = `
          <div class="menu-opcoes">
            <button type="button" class="btn-secundario" data-m="novo">Criar outro personagem</button>
            <button type="button" class="btn-secundario so-celular" data-m="legenda">Como funciona a noite</button>
            <button type="button" class="btn-secundario so-celular" data-m="efeitos">${efeitos.ligados() ? 'Desligar' : 'Ligar'} chuva e efeitos</button>
            <button type="button" class="btn-secundario so-celular" data-m="som">${som.ligado() ? 'Desligar' : 'Ligar'} o som</button>
            <button type="button" class="btn-secundario" data-m="sair">Sair da conta</button>
          </div>
          <div class="opcoes-leitura">
            <span class="grupo-rotulo">Leitura</span>
            ${grupoLeitura('tamanho', 'Tamanho do texto', [['normal', 'Normal'], ['grande', 'Grande'], ['muito-grande', 'Muito grande']])}
            ${grupoLeitura('ritmo', 'Velocidade das palavras', Object.entries({ lenta: 'Lenta', normal: 'Normal', rapida: 'Rápida', instantanea: 'Instantânea' }).map(([k, v]) => [String(RITMOS[k]), v]))}
            ${grupoLeitura('cerimonias', 'Cerimônias', [['completas', 'Completas'], ['curtas', 'Curtas']])}
          </div>
          <p class="nota">Conteúdo de fã não oficial, sem fins comerciais. Vampire: The Masquerade e World of Darkness são marcas registradas da Paradox Interactive AB. Este site não é oficial nem endossado por ela.</p>`;
        corpo.querySelector('[data-m="novo"]').onclick = () => { camada.fechar(); ir('novo'); };
        corpo.querySelector('[data-m="sair"]').onclick = async () => { camada.fechar(); await banco.sair(); };
        corpo.querySelectorAll('[data-leitura]').forEach((b) => {
          b.onclick = () => {
            const campo = b.dataset.leitura;
            gravarLeitura({ [campo]: campo === 'ritmo' ? Number(b.dataset.valor) : b.dataset.valor });
            corpo.querySelectorAll(`[data-leitura="${campo}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          };
        });
        corpo.querySelector('[data-m="legenda"]').onclick = () => { camada.fechar(); abrirLegenda(); };
        corpo.querySelector('[data-m="efeitos"]').onclick = () => { camada.fechar(); acao_('efeitos'); };
        corpo.querySelector('[data-m="som"]').onclick = () => { camada.fechar(); acao_('som'); };
      },
    });
  }

  function acao_(nome) {
    switch (nome) {
      case 'mapa': fecharTudo(); ir('mapa'); break;
      case 'ficha': abrirFicha(); break;
      case 'diario': abrirDiario(); break;
      case 'plano': abrirPlano(); break;
      case 'enviar': enviar(); break;
      case 'encerrar': encerrar(); break;
      case 'menu': abrirMenu(); break;
      case 'legenda': abrirLegenda(); break;
      case 'recolher':
        quadroRecolhido = !quadroRecolhido;
        try { localStorage.setItem('mascara.quadroRecolhido', quadroRecolhido ? '1' : '0'); } catch { /* sem armazenamento */ }
        desenharPlano();
        break;
      case 'linha-principal': if (avisarEncerrada()) break; if (opcoes.length && !emOutroLugar) abrirHistoria(false); else abrirEscrita(); break;
      case 'linha-cacada': if (!avisarEncerrada()) abrirCacada(); break;
      case 'linha-curtas': if (!avisarEncerrada()) abrirEscrita(); break;
      case 'ler-noite': abrirHistoria(false, () => desenharPlano()); break;
      case 'efeitos': efeitos.alternar(); raiz.querySelector('[data-hud="efeitos"]').setAttribute('aria-pressed', String(efeitos.ligados())); break;
      case 'som': som.alternar(); raiz.querySelector('[data-hud="som"]').setAttribute('aria-pressed', String(som.ligado())); break;
      default: break;
    }
  }

  ligarGlossario();
  raiz.querySelector('.tela-jogo').addEventListener('click', (ev) => {
    // As brasas das descobertas mostram a frase (balão) sem abrir a ficha.
    if (ev.target.closest('.brasas')) { ev.stopPropagation(); return; }
    const b = ev.target.closest('[data-hud]');
    if (b) { ev.stopPropagation(); acao_(b.dataset.hud); }
  });

  // --- Cena -----------------------------------------------------------------------------------
  const cena = montarCena(palco, {
    cla: p.ficha?.cla,
    sprite: p.sprite,
    imagem,
    lugar: lugarId,
    pontos: montarPontos(),
    comentarios: achados.comentarios,
    comentar: podeComentar,
    tempo,
    aoInteragir: (pt) => {
      if (pt.tipo === 'historia') abrirHistoria(false);
      else if ((pt.tipo === 'acao' || pt.tipo === 'cacar' || pt.tipo === 'escrever') && avisarEncerrada()) return;
      else if (pt.tipo === 'acao') abrirOpcao(pt);
      else if (pt.tipo === 'cacar') abrirCacada();
      else if (pt.tipo === 'escrever') abrirEscrita();
      else if (pt.tipo === 'detalhe') abrirDetalhe(pt);
      else if (pt.tipo === 'saida') acao_('mapa');
    },
    aoTecla: (ev) => {
      const k = ev.key.toLowerCase();
      const mapa = { m: 'mapa', f: 'ficha', j: 'diario', p: 'plano' };
      if (mapa[k]) { ev.preventDefault(); acao_(mapa[k]); }
    },
  });
  desenharPlano();
  if (noite && acao?.encerrada_em) banco.todosEncerraram(noite.id).then((t) => { todosEncerrados = t; desenharPlano(); });

  if (abrir === 'ficha') { abrirFicha(); return; }
  if (abrir === 'diario') { abrirDiario(); return; }

  // Primeira entrada de cada noite: a legenda de como a noite funciona (depois, só pelo botão "?").
  let legendaVista = true;
  try { legendaVista = localStorage.getItem(`mascara.legenda.${noite?.id}`) === '1'; } catch { /* sem armazenamento */ }
  // Primeiro a história, depois o "como jogar". Só no prelúdio (primeira noite do jogador) a legenda vem antes.
  const marcarLegenda = () => { try { localStorage.setItem(`mascara.legenda.${noite.id}`, '1'); } catch { /* sem armazenamento */ } };
  let lido = true;
  if (!emOutroLugar && atual) { try { lido = localStorage.getItem(`mascara.lido.${atual.id}`) === '1'; } catch { lido = false; } }
  if (noite && !legendaVista && (lido || atual === preludio)) {
    marcarLegenda();
    abrirLegenda();
    return;
  }

  // Ao entrar: se há narração nova, ela abre sozinha, revelada aos poucos (e a legenda vem depois).
  if (!emOutroLugar && atual && !lido) {
    // Cartão de abertura: "NOITE N", o lugar e o tempo, por um instante, antes da narração nova.
    const depoisDaHistoria = () => { desenharPlano(); if (noite && !legendaVista) { marcarLegenda(); setTimeout(abrirLegenda, 250); } };
    const tituloCartao = atual === preludio ? 'Prelúdio' : `Noite ${ultimaNoite?.numero}`;
    const tempoCartao = { garoa: 'garoa', lua: 'noite de lua', tempestade: 'tempestade', nevoa: 'névoa' }[tempoDaNoite(atual === preludio ? noite?.numero || 0 : ultimaNoite?.numero || 0)];
    cartaoDeAbertura(camadas, tituloCartao, `${lugarNome} · ${tempoCartao}`, () => abrirHistoria(true, depoisDaHistoria));
  }
  // Recado de chegada só logo depois de viajar pelo mapa (não a cada recarga), e nunca para quem
  // pediu para não ver mais.
  let chegou = false;
  try { chegou = sessionStorage.getItem('mascara.chegou') === lugar; sessionStorage.removeItem('mascara.chegou'); } catch { /* sem armazenamento */ }
  // Chegada pelo mapa: a cena clareia e uma faixa de título passa no alto (sem botão, some sozinha).
  if (chegou) {
    camadas.classList.add('clareando');
    const d = descobertasDoLugar();
    const nomeTempo = { garoa: 'garoa', lua: 'noite de lua', tempestade: 'tempestade', nevoa: 'névoa' }[tempo];
    const faixa = document.createElement('div');
    faixa.className = 'faixa-chegada';
    faixa.setAttribute('role', 'status');
    faixa.innerHTML = `<b>${esc(lugarNome)}</b><small>${esc(nomeTempo)} · ${primeiraVisita ? 'primeira visita' : esc(fraseDescobertas(d.vistos, d.total))}</small>`;
    camadas.appendChild(faixa);
    setTimeout(() => faixa.remove(), 2600);
  }
}

// Quadro entre noites: em que ponto o ciclo está (fechou, resolvida, nenhuma) e o que fazer enquanto isso.
export function htmlCiclo(ult, lida = true) {
  let estado;
  let linha;
  if (ult?.status === 'fechada') {
    estado = 'fechada';
    linha = `<b>Noite ${ult.numero} fechou</b> · o Narrador está escrevendo o que aconteceu`;
  } else if (ult?.status === 'resolvida') {
    estado = 'resolvida';
    linha = `<b>Noite ${ult.numero} resolvida</b> · <button type="button" class="btn-texto ciclo-ler" data-hud="ler-noite">leia o que aconteceu</button>${lida ? '' : ' <span class="selo-novo">novo</span>'}`;
  } else {
    estado = 'espera';
    linha = '<b>A cidade dorme</b> · nenhuma noite aberta';
  }
  return {
    estado,
    html: `
      <div class="ciclo-linha">${linha}</div>
      <div class="ciclo-linha"><span class="quadro-nome">Próxima noite</span> abre quando o Narrador terminar, ${quandoONarradorVolta()}</div>
      <div class="ciclo-linha ciclo-enquanto"><span class="quadro-nome">Enquanto isso</span> explore, examine os detalhes, releia o diário</div>`,
  };
}

// Cartão de abertura da noite: o título grande, o lugar e o tempo, com um acorde grave. Some sozinho
// (1,5 s) ou com um clique; com menos movimento ou sem efeitos, aparece mais curto e sem animação.
export function cartaoDeAbertura(raiz, titulo, sub, depois) {
  const curto = document.body.classList.contains('sem-efeitos') || cerimoniasCurtas();
  const el = document.createElement('div');
  el.className = `cartao-abertura${curto ? ' sem-animacao' : ''}`;
  el.innerHTML = `<b>${esc(titulo)}</b><small>${esc(sub)}</small>`;
  raiz.appendChild(el);
  som.acorde?.();
  let feito = false;
  const fechar = () => { if (feito) return; feito = true; el.classList.add('saindo'); setTimeout(() => { el.remove(); depois(); }, 250); };
  el.addEventListener('click', fechar);
  setTimeout(fechar, curto ? 900 : 1500);
}

// Um grupo de botões de opção para as opções de leitura (o atual fica marcado).
function grupoLeitura(campo, titulo, opcoes) {
  const atual = String(lerLeitura()[campo]);
  return `
    <div class="leitura-grupo" role="group" aria-label="${titulo}">
      <span>${titulo}</span>
      <div>${opcoes.map(([valor, nome]) => `<button type="button" class="chip-leitura" data-leitura="${campo}" data-valor="${valor}" aria-pressed="${String(valor) === atual}">${nome}</button>`).join('')}</div>
    </div>`;
}

const TEMPOS = ['garoa', 'lua', 'tempestade', 'nevoa'];
export function tempoDaNoite(n) {
  return TEMPOS[(Math.imul(n + 7, 2654435761) >>> 0) % TEMPOS.length];
}

// Bairros já visitados neste aparelho (o mapa mostra névoa nos outros).
export function visitados() {
  try { return new Set(JSON.parse(localStorage.getItem('mascara.visitados')) || []); } catch { return new Set(); }
}
function marcarVisitado(id) {
  const v = visitados();
  if (v.has(id)) return;
  v.add(id);
  try { localStorage.setItem('mascara.visitados', JSON.stringify([...v])); } catch { /* sem armazenamento */ }
}

// Mapa do Rio: viajar entre os bairros. Entrar no lugar onde o personagem está volta para a cena dele.
export async function telaMapa(raiz, p) {
  const noite = await banco.noiteAberta();
  const posicao = lerPosicao(p, noite);
  raiz.innerHTML = `
    <div class="tela-jogo tela-mapa">
      <div class="palco"></div>
      <span class="mapa-titulo">Mapa do Rio</span>
      <nav class="mapa-voltar"><button type="button" data-voltar>Voltar à cena</button></nav>
      <p class="mapa-instrucao"><span class="so-mouse">Clique</span><span class="so-toque">Toque</span> num bairro para ir até lá</p>
    </div>`;
  raiz.querySelector('[data-voltar]').onclick = () => ir('noite');
  // Quanto já foi descoberto em cada bairro (detalhes examinados neste aparelho).
  const contagem = {};
  for (const l of LOCAIS) {
    const todos = descobertas(l.id, noite?.numero || 0).detalhes; // os da noite: o mesmo número da cena
    let vistos = 0;
    try { vistos = todos.filter((d) => localStorage.getItem(`mascara.visto.${l.id}.${d.id}`) === '1').length; } catch { /* sem armazenamento */ }
    contagem[l.id] = { vistos, total: todos.length };
  }
  const retrato = retratoDe(p);
  montarMapa(raiz.querySelector('.palco'), {
    cla: p.ficha?.cla,
    atualId: posicao,
    visitados: visitados(),
    descobertas: contagem,
    retrato,
    aoEntrar: (id) => {
      gravarPosicao(p, noite, id);
      try { sessionStorage.setItem('mascara.chegou', id); } catch { /* sem armazenamento */ }
      ir('noite');
    },
    aoTecla: (ev) => { if (ev.key === 'Escape' || ev.key.toLowerCase() === 'm') { ev.preventDefault(); ir('noite'); } },
  });
}

// Tela de espera enquanto o Narrador revisa a ficha. A Lapa fica aberta para explorar: os detalhes
// e os comentários dela (os da primeira noite), com o contador. O que for examinado aqui fica marcado
// no aparelho pelo lugar e pelo detalhe, e continua valendo nas noites seguintes.
export async function telaEspera(raiz, p, { aoEditar } = {}) {
  raiz.innerHTML = `
    <div class="tela-jogo">
      <div class="palco"></div>
      <aside class="hud-plano quadro-noite quadro-ciclo quadro-espera" aria-live="polite"></aside>
    </div>`;
  const camadas = raiz.querySelector('.tela-jogo');
  const quadro = raiz.querySelector('.quadro-espera');
  const lugarId = 'lapa';
  const achados = descobertas(lugarId, 0);
  const chaveVisto = (id) => `mascara.visto.${lugarId}.${id}`;
  const visto = (id) => { try { return localStorage.getItem(chaveVisto(id)) === '1'; } catch { return false; } };
  const contagem = () => ({ vistos: achados.detalhes.filter((d) => visto(d.id)).length, total: achados.detalhes.length });

  const verFicha = () => abrirJanela(camadas, { titulo: 'Ficha', classe: 'janela-larga', montar: (corpo) => telaFicha(corpo, p) });
  ligarGlossario();
  function desenharQuadro(subiu = false) {
    const d = contagem();
    quadro.innerHTML = `
      <div class="ciclo-linha"><b>Ficha com o Narrador</b> · ele volta ${quandoONarradorVolta()}</div>
      <div class="ciclo-linha"><span class="quadro-nome">Enquanto isso</span> examine os detalhes da Lapa <span class="espera-contador${subiu ? ' subiu' : ''}">${brasas(d.vistos, d.total)}</span></div>
      <div class="ciclo-linha quadro-espera-botoes"><button type="button" class="btn-texto" data-espera="ficha">Ver minha ficha</button><button type="button" class="btn-texto" data-espera="editar">Voltar a editar</button></div>`;
  }
  quadro.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-espera]');
    if (!b) return;
    if (b.dataset.espera === 'ficha') verFicha();
    else aoEditar?.();
  });

  const pontos = () => achados.detalhes.map((d) => ({
    id: `detalhe-${d.id}`, tipo: 'detalhe', icone: visto(d.id) ? '·' : '?', rotulo: d.rotulo, acao: `Examinar: ${d.rotulo}`,
    x: d.x, y: d.y, discreto: true, visto: visto(d.id), detalhe: d,
  }));
  const comentados = new Set();
  const cena = montarCena(raiz.querySelector('.palco'), {
    cla: p.ficha?.cla, sprite: p.sprite, imagem: CENARIO_ABERTURA, lugar: lugarId, inicio: [0.45, 0.8],
    pontos: pontos(),
    comentarios: achados.comentarios,
    comentar: (c) => { if (comentados.has(c.id)) return false; comentados.add(c.id); return true; },
    aoInteragir: (pt) => {
      if (pt.tipo !== 'detalhe') return;
      const d = pt.detalhe;
      try { localStorage.setItem(chaveVisto(d.id), '1'); } catch { /* sem armazenamento */ }
      desenharQuadro(true);
      abrirDialogo(camadas, {
        rotulo: d.rotulo,
        html: `<div class="texto-narracao">${narracao(`[${d.voz}] ${d.texto}`)}</div>`,
        rodape: '<span class="nota"><span class="so-teclado"><kbd>Esc</kbd> fecha · </span>ande pela cena para descobrir mais</span>',
        aoFechar: () => cena?.atualizarPontos(pontos()),
      });
    },
  });
  desenharQuadro();

  const camada = abrirDialogo(camadas, {
    rotulo: 'Ficha enviada',
    html: `<div class="texto-narracao"><p>Sua ficha está com o Narrador. Quando ele revisar, vai encaixar você na cidade e escrever o seu prelúdio, e a primeira noite se abre para você.</p><p>O Narrador volta ${quandoONarradorVolta()}. Você vai ver o seu prelúdio aqui assim que ele chegar.</p><p class="nota">Enquanto isso, ande pela Lapa<span class="so-teclado"> com <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span> e examine os detalhes marcados com <b>?</b>. O que você descobrir aqui continua valendo depois.</p></div>
      <ol class="escolhas">
        <li><button type="button" data-explorar><span class="escolha-num">1.</span> — Explorar a Lapa enquanto isso</button></li>
        <li><button type="button" data-ver><span class="escolha-num">2.</span> — Ver minha ficha</button></li>
        <li><button type="button" data-editar><span class="escolha-num">3.</span> — Voltar a editar</button></li>
      </ol>`,
  });
  camada.el.querySelector('[data-explorar]').onclick = () => camada.fechar();
  camada.el.querySelector('[data-ver]').onclick = verFicha;
  camada.el.querySelector('[data-editar]').onclick = () => aoEditar?.();
}
