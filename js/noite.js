// Tela de jogo: a cena do lugar em tela cheia. O personagem anda (WASD ou clique), conversa com os
// pontos de interesse e monta o plano da noite. Narração, escolhas e janelas aparecem por cima da cena.
import * as v5 from './motor/v5.js';
import * as banco from './banco.js';
import { esc, escolhas, narracao, narracaoComPaineis, dataLonga, dataCurta, aviso } from './ui.js';
import { telaFicha } from './ficha.js';
import { telaDiario } from './diario.js';
import { imagemDoCla, imagemDoLocal, localDe, LOCAIS, CENARIO_ABERTURA } from './cidade.js';
import { som, efeitos, definirTempo, definirSomDoLugar } from './ambiente.js';
import { ir } from './app.js';
import { montarCena } from './jogo/cena.js';
import { montarMapa } from './jogo/mapa.js';
import { abrirDialogo, abrirJanela, fecharTudo, confirmarEscolha } from './jogo/camadas.js';
import { geografia, distribuirAncoras } from './jogo/lugares.js';
import { descobertas, todasDescobertas } from './jogo/detalhes.js';

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
  const [noite, narracoes, resolvidas] = await Promise.all([
    banco.noiteAberta(),
    banco.narracoesDoPersonagem(p.id),
    banco.noitesResolvidas(),
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
  if (lugarId) marcarVisitado(lugarId);
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
  const retrato = typeof p.retrato === 'string' && /^https:\/\//.test(p.retrato) ? p.retrato : imagemDoCla(p.ficha?.cla);
  const fome = p.estado?.fome ?? 0;
  raiz.innerHTML = `
    <div class="tela-jogo">
      <div class="palco"></div>
      <header class="hud-topo">
        <button type="button" class="hud-personagem" data-hud="ficha" title="Ficha (F)">
          <img src="${esc(retrato)}" alt="">
          <span>
            <b>${esc(p.nome)}</b>
            <small>${esc(v5.cla(p.ficha?.cla)?.nome || '')} · ${esc(lugarNome)}</small>
            <span class="gotas" aria-label="Fome">${Array.from({ length: 5 }, (_, i) => `<svg class="gota ${i < fome ? 'cheia' : ''}" viewBox="0 0 12 16"><path d="M6 1C8 5 11 7.5 11 10.5A5 5 0 0 1 1 10.5C1 7.5 4 5 6 1z"/></svg>`).join('')}</span>
          </span>
        </button>
        <div class="hud-noite">
          ${noite ? `<b>Noite ${noite.numero}</b><small>fecha ${esc(dataLonga(noite.fecha_em))}</small>` : '<b>A cidade dorme</b><small>a próxima noite ainda não abriu</small>'}
        </div>
        <nav class="hud-botoes">
          <button type="button" data-hud="mapa" title="Mapa do Rio (M)">Mapa <kbd>M</kbd></button>
          <button type="button" data-hud="ficha" title="Ficha (F)">Ficha <kbd>F</kbd></button>
          <button type="button" data-hud="diario" title="Diário (J)">Diário <kbd>J</kbd></button>
          <button type="button" data-hud="efeitos" class="hud-icone" aria-pressed="${efeitos.ligados()}" title="Chuva e efeitos">☂</button>
          <button type="button" data-hud="som" class="hud-icone" aria-pressed="${som.ligado()}" title="Som ambiente">♪</button>
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
    try { localStorage.setItem(chavePlano(noite, p), JSON.stringify(plano)); } catch { /* sem armazenamento */ }
    desenharPlano();
    cena?.atualizarPontos(montarPontos());
  }

  // Selo compacto do plano, no alto à direita: a ação principal e o estado (a escolher, pronto, enviado).
  // O plano completo abre no clique ou com P; o envio fica no próprio selo quando há algo para enviar.
  function desenharPlano() {
    if (!noite) { caixaPlano.hidden = true; return; }
    const enviado = acao && !alterado;
    const pronto = !!plano.principal?.trim();
    const estado = enviado ? 'enviado' : pronto ? 'pronto' : 'vazio';
    const selo = enviado ? `Enviado ${esc(dataCurta(acao.atualizado_em))}` : pronto ? (acao ? 'Mudanças não enviadas' : 'Não enviado') : 'A escolher';
    caixaPlano.className = `hud-plano plano-${estado}`;
    caixaPlano.innerHTML = `
      <button type="button" class="plano-selo" data-hud="plano" title="Ver o plano completo (P)">
        <span class="plano-marca" aria-hidden="true">${enviado ? '✓' : pronto ? '!' : '…'}</span>
        <span class="plano-texto">
          <small>Plano da noite ${noite.numero} · ${selo}</small>
          <b>${pronto ? esc(curto(plano.principal, 9)) : 'Ande pela cena e escolha o que fazer'}</b>
        </span>
      </button>
      ${pronto && !enviado ? `<button type="button" class="btn plano-enviar" data-hud="enviar">${acao ? 'Reenviar' : 'Enviar'}</button>` : ''}`;
  }

  async function enviar() {
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
        opcoes.forEach((o, i) => pedidos.push({ id: `opcao-${i}`, tipo: 'acao', icone: String(i + 1), rotulo: curto(o), acao: o, texto: o, feito: plano.principal === o }));
      } else {
        const l = visitado;
        [
          { id: 'explorar', rotulo: `Explorar ${l.em.replace(/^(na|no|em) /, '')}`, texto: `Ir ${l.a} e explorar a região, de olho em quem manda ali.` },
          { id: 'procurar', rotulo: 'Procurar alguém aqui', texto: `Ir ${l.a} e procurar alguém.`, livre: true },
        ].forEach((o) => pedidos.push({ ...o, tipo: 'acao', icone: '!', acao: o.rotulo, feito: plano.principal === o.texto }));
      }
      pedidos.push({ id: 'cacar', tipo: 'cacar', icone: '♦', rotulo: emOutroLugar ? `Caçar ${visitado.em}` : 'Caçar', acao: 'Decidir a caçada', feito: !!(plano.cacada || plano.nao_cacar), papel: 'escuro' });
      pedidos.push({ id: 'escrever', tipo: 'escrever', icone: '✎', rotulo: 'Outra ideia', acao: 'Escrever o que fazer', papel: 'livre' });
    }
    const ancoras = distribuirAncoras(geo, pedidos);
    const pts = [
      { id: 'mapa', tipo: 'saida', icone: '➜', rotulo: emOutroLugar ? 'Voltar ao mapa' : 'Mapa do Rio', acao: 'Abrir o mapa do Rio', x: geo.saida[0], y: geo.saida[1] },
      ...pedidos.map((pd) => { const a = ancoras.get(pd.id); return { ...pd, x: a?.x ?? 0.5, y: a?.y ?? 0.82 }; }),
    ];
    pts.forEach((pt, i) => { if (i >= MAX_MARCADORES) pt.discreto = true; });
    achados.detalhes.forEach((d) => pts.push({
      id: `detalhe-${d.id}`, tipo: 'detalhe', icone: visto(d.id) ? '·' : '?', rotulo: d.rotulo, acao: `Examinar: ${d.rotulo}`,
      x: d.x, y: d.y, discreto: true, visto: visto(d.id), detalhe: d,
    }));
    return pts;
  }

  // Detalhe examinado: uma fala curta de voz interior, sem mudar regras. Fica marcado no aparelho.
  function abrirDetalhe(pt) {
    const d = pt.detalhe;
    abrirDialogo(camadas, {
      rotulo: d.rotulo,
      html: `<div class="texto-narracao">${narracao(`[${d.voz}] ${d.texto}`)}</div>`,
      rodape: '<span class="nota"><span class="so-teclado"><kbd>Esc</kbd> fecha · </span>ande pela cena para descobrir mais</span>',
      aoFechar: () => {
        try { localStorage.setItem(chaveVisto(d.id), '1'); } catch { /* sem armazenamento */ }
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
    return true;
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

  function abrirHistoria(revelar) {
    const camada = abrirDialogo(camadas, {
      rotulo: atual === preludio ? 'Prelúdio' : `Noite ${ultimaNoite?.numero}`,
      html: htmlHistoria(),
      chave: revelar ? atual?.id : null,
      aoAvancar: () => som.toque(),
      rodape: noite ? '<span class="nota">Escolha uma fala<span class="so-teclado"> (1 a 4)</span> ou feche e ande pela cena.<span class="so-teclado"> <kbd>Esc</kbd> fecha.</span></span>' : '<span class="nota">A próxima noite ainda não abriu.<span class="so-teclado"> <kbd>Esc</kbd> fecha.</span></span>',
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
    const camada = abrirDialogo(camadas, {
      rotulo: 'A caçada',
      html: `
        <div class="texto-narracao"><p class="voz voz-besta"><span class="voz-nome">A FOME</span> — ${fome >= 3 ? 'Eu não espero mais. Hoje você bebe.' : 'Hoje eu só ronrono. Mas não fui embora.'}</p></div>
        <p class="nota">${pr ? `Você é ${esc(pr.nome)}: ${esc(pr.desc.toLowerCase())}` : ''}</p>
        <label>Onde e como você caça esta noite
          <textarea data-cacada rows="2" maxlength="800" placeholder="Em branco: do seu jeito de sempre, ${esc(lugarCaca)}.">${esc(plano.cacada || '')}</textarea>
        </label>
        <label class="radio"><input type="checkbox" data-nao-cacar ${plano.nao_cacar ? 'checked' : ''}> Não vou caçar esta noite (a Fome sobe)</label>
        <ol class="escolhas"><li><button type="button" data-principal><span class="escolha-num">1.</span> — Confirmar a caçada</button></li></ol>`,
    });
    camada.el.querySelector('[data-principal]').onclick = (ev) => {
      const t = camada.el.querySelector('[data-cacada]').value.trim();
      plano.cacada = t || (emOutroLugar ? `Caçar ${visitado.em}` : '');
      plano.nao_cacar = camada.el.querySelector('[data-nao-cacar]').checked;
      confirmarEscolha(ev.currentTarget, () => { guardarRascunho(); camada.fechar(); });
    };
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

  function abrirPlano() {
    abrirJanela(camadas, {
      titulo: noite ? `Plano da noite ${noite.numero}` : 'Plano da noite',
      montar: (corpo, camada) => {
        corpo.innerHTML = `
          <p class="nota">${noite ? `A noite fecha ${esc(dataLonga(noite.fecha_em))}, ou antes, se todos enviarem.` : 'A próxima noite ainda não abriu.'}</p>
          <label>Ação principal<textarea data-f="principal" rows="4" maxlength="1500">${esc(plano.principal || '')}</textarea></label>
          <label>Caçada<textarea data-f="cacada" rows="2" maxlength="800">${esc(plano.cacada || '')}</textarea></label>
          <label class="radio"><input type="checkbox" data-f="nao_cacar" ${plano.nao_cacar ? 'checked' : ''}> Não vou caçar esta noite</label>
          <label>Ação curta 1<input data-f="curta_1" maxlength="500" value="${esc(plano.curta_1 || '')}"></label>
          <label>Ação curta 2<input data-f="curta_2" maxlength="500" value="${esc(plano.curta_2 || '')}"></label>
          <label class="radio"><input type="checkbox" data-f="esforco" ${plano.esforco ? 'checked' : ''}> Se for preciso, gaste minha Força de Vontade</label>
          <div class="botoes"><span></span><button type="button" class="btn" data-enviar-plano ${noite ? '' : 'disabled'}>Enviar ações</button></div>`;
        corpo.addEventListener('input', (ev) => {
          const f = ev.target.dataset.f;
          if (!f) return;
          plano[f] = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
          guardarRascunho();
        });
        corpo.querySelector('[data-enviar-plano]').onclick = async () => { await enviar(); if (acao && !alterado) camada.fechar(); };
      },
    });
  }

  function abrirFicha() {
    abrirJanela(camadas, { titulo: 'Ficha', classe: 'janela-larga', montar: (corpo) => telaFicha(corpo, p) });
  }

  function abrirDiario() {
    abrirJanela(camadas, { titulo: 'Diário', classe: 'janela-larga', montar: (corpo) => telaDiario(corpo, p) });
  }

  function abrirMenu() {
    abrirJanela(camadas, {
      titulo: 'Opções',
      montar: (corpo, camada) => {
        corpo.innerHTML = `
          <div class="menu-opcoes">
            <button type="button" class="btn-secundario" data-m="novo">Criar outro personagem</button>
            <button type="button" class="btn-secundario" data-m="sair">Sair da conta</button>
            ${recadoDeChegada() ? '' : '<button type="button" class="btn-secundario" data-m="recado">Voltar a mostrar o recado de chegada</button>'}
          </div>
          <p class="nota">Conteúdo de fã não oficial, sem fins comerciais. Vampire: The Masquerade e World of Darkness são marcas registradas da Paradox Interactive AB. Este site não é oficial nem endossado por ela.</p>`;
        corpo.querySelector('[data-m="novo"]').onclick = () => { camada.fechar(); ir('novo'); };
        corpo.querySelector('[data-m="sair"]').onclick = async () => { camada.fechar(); await banco.sair(); };
        const religar = corpo.querySelector('[data-m="recado"]');
        if (religar) religar.onclick = () => { recadoDeChegada(true); religar.remove(); };
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
      case 'menu': abrirMenu(); break;
      case 'efeitos': efeitos.alternar(); raiz.querySelector('[data-hud="efeitos"]').setAttribute('aria-pressed', String(efeitos.ligados())); break;
      case 'som': som.alternar(); raiz.querySelector('[data-hud="som"]').setAttribute('aria-pressed', String(som.ligado())); break;
      default: break;
    }
  }

  raiz.querySelector('.tela-jogo').addEventListener('click', (ev) => {
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

  if (abrir === 'ficha') { abrirFicha(); return; }
  if (abrir === 'diario') { abrirDiario(); return; }

  // Ao entrar: se há narração nova, ela abre sozinha, revelada aos poucos.
  if (!emOutroLugar && atual) {
    let lido = false;
    try { lido = localStorage.getItem(`mascara.lido.${atual.id}`) === '1'; } catch { /* sem armazenamento */ }
    if (!lido) abrirHistoria(true);
  }
  // Recado de chegada só logo depois de viajar pelo mapa (não a cada recarga), e nunca para quem
  // pediu para não ver mais.
  let chegou = false;
  try { chegou = sessionStorage.getItem('mascara.chegou') === lugar; sessionStorage.removeItem('mascara.chegou'); } catch { /* sem armazenamento */ }
  if (emOutroLugar && chegou && recadoDeChegada()) {
    const recado = abrirDialogo(camadas, {
      rotulo: visitado.nome,
      html: `<div class="texto-narracao"><p>Você chega ${esc(visitado.a)}. Ande pela cena para decidir o que fazer aqui esta noite.</p><p class="nota">O que você escolher aqui entra no seu plano da noite.</p></div>`,
      rodape: '<div class="rodape-recado"><span class="nota so-teclado"><kbd>Esc</kbd> fecha</span><button type="button" class="btn-texto" data-nao-mostrar>Não mostrar de novo</button></div>',
    });
    recado.el.querySelector('[data-nao-mostrar]').onclick = () => { recadoDeChegada(false); recado.fechar(); };
  }
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

// Recado "Você chega a…": ligado por padrão; o jogador desliga no próprio recado e religa em Opções.
const CHAVE_RECADO = 'mascara.semRecadoChegada';
function recadoDeChegada(ligar) {
  try {
    if (ligar === true) localStorage.removeItem(CHAVE_RECADO);
    else if (ligar === false) localStorage.setItem(CHAVE_RECADO, '1');
    return localStorage.getItem(CHAVE_RECADO) !== '1';
  } catch { return true; }
}

// Mapa do Rio: viajar entre os bairros. Entrar no lugar onde o personagem está volta para a cena dele.
export async function telaMapa(raiz, p) {
  const noite = await banco.noiteAberta();
  const posicao = lerPosicao(p, noite);
  raiz.innerHTML = `
    <div class="tela-jogo tela-mapa">
      <div class="palco"></div>
      <header class="hud-topo">
        <div class="hud-noite"><b>Mapa do Rio</b><small><span class="so-teclado">Ande com <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou </span>clique num bairro para viajar</small></div>
        <nav class="hud-botoes"><button type="button" data-voltar>Voltar à cena <kbd>M</kbd></button></nav>
      </header>
      <footer class="hud-dicas"><kbd>E</kbd> entrar no bairro · <kbd>M</kbd> ou <kbd>Esc</kbd> volta · visitar outro bairro deixa você planejar o que fazer lá</footer>
    </div>`;
  raiz.querySelector('[data-voltar]').onclick = () => ir('noite');
  // Quanto já foi descoberto em cada bairro (detalhes examinados neste aparelho).
  const contagem = {};
  for (const l of LOCAIS) {
    const todos = todasDescobertas(l.id);
    let vistos = 0;
    try { vistos = todos.filter((d) => localStorage.getItem(`mascara.visto.${l.id}.${d.id}`) === '1').length; } catch { /* sem armazenamento */ }
    contagem[l.id] = { vistos, total: todos.length };
  }
  const retrato = typeof p.retrato === 'string' && /^https:\/\//.test(p.retrato) ? p.retrato : imagemDoCla(p.ficha?.cla);
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

// Tela de espera enquanto o Narrador revisa a ficha.
export async function telaEspera(raiz, p, { aoEditar } = {}) {
  raiz.innerHTML = '<div class="tela-jogo"><div class="palco"></div></div>';
  const camadas = raiz.querySelector('.tela-jogo');
  montarCena(raiz.querySelector('.palco'), { cla: p.ficha?.cla, sprite: p.sprite, imagem: CENARIO_ABERTURA, lugar: 'lapa', pontos: [], inicio: [0.45, 0.8] });
  const camada = abrirDialogo(camadas, {
    rotulo: 'Ficha enviada',
    fechavel: false,
    html: `<div class="texto-narracao"><p>Sua ficha está com o Narrador. Quando ele revisar, vai encaixar você na cidade e escrever o seu prelúdio, e a primeira noite se abre para você.</p><p class="nota">Enquanto isso, ande pela Lapa<span class="so-teclado"> com <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>.</p></div>
      <ol class="escolhas">
        <li><button type="button" data-ver><span class="escolha-num">1.</span> — Ver minha ficha</button></li>
        <li><button type="button" data-editar><span class="escolha-num">2.</span> — Voltar a editar</button></li>
      </ol>`,
  });
  camada.el.querySelector('[data-ver]').onclick = () => abrirJanela(camadas, { titulo: 'Ficha', classe: 'janela-larga', montar: (corpo) => telaFicha(corpo, p) });
  camada.el.querySelector('[data-editar]').onclick = () => aoEditar?.();
}
