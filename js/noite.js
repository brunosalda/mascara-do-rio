// Tela de jogo: a cena do lugar em tela cheia. O personagem anda (WASD ou clique), conversa com os
// pontos de interesse e monta o plano da noite. Narração, escolhas e janelas aparecem por cima da cena.
import * as v5 from './motor/v5.js';
import * as banco from './banco.js';
import { esc, escolhas, narracao, narracaoComPaineis, dataLonga, dataCurta, aviso } from './ui.js';
import { telaFicha, telaRegistro } from './ficha.js';
import { telaDiario } from './diario.js';
import { retratoDe, imagemDoLocal, localDe, LOCAIS, LOCAIS_EXTRA, CENARIO_ABERTURA } from './cidade.js';
import { som, efeitos, definirTempo, definirSomDoLugar, definirClima } from './ambiente.js';
import { presasDoLugar, ABORDAGENS, abordagensPara, PERGUNTAS_CONVERSA, FRASES_FRENTE, textoDaCacada } from './jogo/cacada.js';
import { PODERES_DA_CENA, TEMPERAMENTOS, temperamentoDe, AVISO_DESPERTAR } from './jogo/disciplinas.js';
import { TIPOS_GENTE, PISTAS_CONVERSA } from './jogo/gente.js';
import { ir } from './app.js';
import { montarCena } from './jogo/cena.js';
import { montarMapa } from './jogo/mapa.js';
import { abrirDialogo, abrirJanela, fecharTudo, confirmarEscolha, perguntar } from './jogo/camadas.js';
import { geografia, distribuirAncoras } from './jogo/lugares.js';
import { descobertas, todasDescobertas, brasas, fraseDescobertas, escondidosPara, VANTAGENS, VANTAGENS_ESCONDIDOS, DETALHES_SENTIDOS, VANTAGENS_SENTIDOS } from './jogo/detalhes.js';
import { ligarGlossario } from './glossario.js';
import { registroDaNoite, registrar, anotarLinha, tempoRestante, prazoRestante, quandoCurto, quandoONarradorVolta } from './jogo/registro.js';
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

// fonte: de onde vêm a noite, as narrações e a ação (o banco; nas demonstrações, dados fictícios).
export async function telaNoite(raiz, p, { lugar = null, abrir = null, fonte = banco, vista = null, pintura = null, irPara = ir } = {}) {
  raiz.innerHTML = '<p class="carregando centro">A noite cai sobre o Rio…</p>';
  const [noite, narracoes, resolvidas, ultima] = await Promise.all([
    fonte.noiteAberta(),
    fonte.narracoesDoPersonagem(p.id),
    fonte.noitesResolvidas(),
    fonte.ultimaNoite().catch(() => null),
  ]);
  let acao = noite ? await fonte.minhaAcao(noite.id, p.id) : null;

  const narrNoite = narracoes.find((n) => n.tipo === 'noite');
  const ultimaNoite = narrNoite ? resolvidas.find((n) => n.id === narrNoite.noite_id) : null;
  const preludio = narracoes.find((n) => n.tipo === 'preludio');
  const atual = narrNoite && ultimaNoite ? narrNoite : preludio;
  const opcoes = noite && Array.isArray(narracoes[0]?.opcoes) ? narracoes[0].opcoes.filter((o) => typeof o === 'string') : [];

  const localAtual = localDe(p.estado?.local);
  // Rota #/lugar/<id> muda a posição; #/noite mostra onde o personagem está agora.
  if (lugar) gravarPosicao(p, noite, lugar);
  else lugar = lerPosicao(p, noite);
  const visitado = lugar ? (LOCAIS.find((l) => l.id === lugar) || (location.hash.includes('/demo/') ? LOCAIS_EXTRA.find((l) => l.id === lugar) : null)) : null;
  const emOutroLugar = visitado && visitado.id !== localAtual?.id;
  const lugarNome = emOutroLugar ? visitado.nome : (localAtual?.nome || p.estado?.local || 'Rio de Janeiro');
  // Geografia da pintura (chão, âncoras, objetos, luzes) e o que dá para descobrir no lugar.
  const lugarId = emOutroLugar ? visitado.id : (localAtual?.id || null);
  // Fase 2: com vista 'alto' e uma pintura vista do alto para o lugar, usa a geografia dela; os detalhes
  // do lugar vão para os pontos livres dessa pintura.
  // Vista do alto (aprovada pelo Bruno, 17/10): é o padrão no jogo quando o lugar tem a pintura a partir
  // de foto; nas Opções, "Na altura dos olhos" volta à de antes (salvo no aparelho).
  let vistaSalva = null;
  try { vistaSalva = localStorage.getItem('mascara.vista'); } catch { /* sem armazenamento */ }
  const querAlto = vista ? vista === 'alto' : vistaSalva !== 'olhos';
  const geoAlto = querAlto ? geografia(`${lugarId}-alto`) : null;
  const geo = geoAlto?.alto ? geoAlto : geografia(lugarId);
  const achados = descobertas(lugarId, noite?.numero || 0);
  if (geo.alto && geo.pontosLivres) {
    // Rodada 34: um detalhe nunca fica colado numa pessoa da área (o clique na pessoa tem de valer para
    // ela). Pontos livres a menos de ~0,07 de alguém são empurrados para longe dela.
    const longeDaGente = ([x, y]) => {
      // A figura ocupa a área acima dos pés: um detalhe nessa faixa (ou logo ao lado) vai para o lado.
      for (const g of geo.gente || []) {
        const dx = (x - g.x) * (geo.aspecto || 1.78);
        const dy = y - g.y;
        if (Math.abs(dx) < 0.11 && dy > -0.16 && dy < 0.05) x = g.x + (dx >= 0 ? 1 : -1) * 0.11 / (geo.aspecto || 1.78);
      }
      return [x, y];
    };
    achados.detalhes = achados.detalhes.map((d, i) => { const [x, y] = longeDaGente(geo.pontosLivres[i % geo.pontosLivres.length]); return { ...d, x, y }; });
  }
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
  const imagem = geo.imagens?.[pintura] || geo.imagem || (emOutroLugar ? (visitado.imagem || imagemDoLocal('')) : imagemDoLocal(p.estado?.local));
  if (fundo) { fundo.style.backgroundImage = `url('${imagem}')`; fundo.dataset.url = imagem; }

  // Plano da noite: o que já foi enviado, mais o rascunho guardado no aparelho.
  let plano = { principal: '', cacada: '', nao_cacar: false, curta_1: '', curta_2: '', esforco: false, ...(acao || {}) };
  try { plano = { ...plano, ...(JSON.parse(localStorage.getItem(chavePlano(noite, p))) || {}) }; } catch { /* sem rascunho */ }
  let alterado = false;

  // Poderes que funcionam na cena: só os que a ficha tem (nas demonstrações, p._poderes).
  const meusPoderes = new Set(p._poderes || (() => { try { return v5.calcular(p.ficha || {}).poderes || []; } catch { return []; } })());
  const poderesCena = p.sprite?.url ? PODERES_DA_CENA.filter((x) => meusPoderes.has(x.id)) : [];
  const nomePoder = (id) => { for (const d of Object.values(v5.DISCIPLINAS)) { const pw = d.poderes.find((x) => x.id === id); if (pw) return pw.nome; } return id; };

  // --- Interface sobre a cena ---------------------------------------------------------------
  const retrato = retratoDe(p);
  const fome = p.estado?.fome ?? 0;
  // Painéis à maneira dos RPGs clássicos (rodada 25): moldura de pedra, botões redondos à esquerda,
  // retrato com barras à direita, registro e diálogo embaixo. H esconde tudo (fica salvo no aparelho).
  let paineisOcultos = false;
  try { paineisOcultos = localStorage.getItem('mascara.paineis') === 'ocultos'; } catch { /* sem armazenamento */ }
  const calc = (() => { try { return v5.calcular(p.ficha || {}); } catch { return {}; } })();
  const caixas = (e, max) => { const m = e?.max || max || 0; return { max: m, resta: Math.max(0, m - (e?.superficial || 0) - (e?.agravado || 0)) }; };
  const vit = caixas(p.estado?.vitalidade, calc.vitalidade);
  const von = caixas(p.estado?.vontade, calc.forcaVontade);
  const ferido = vit.max && vit.resta / vit.max <= 0.5;
  const humanidade = p.estado?.humanidade ?? calc.humanidade ?? 0;
  const CANTO = '<svg viewBox="0 0 64 64" aria-hidden="true"><path class="placa" d="M4 36 L28 60 L4 84 L-20 60 Z"/><path class="placa-dentro" d="M4 47 L17 60 L4 73 L-9 60 Z"/><path class="galho" d="M4 60 C10 40 18 26 34 18 S56 8 60 4"/><path class="galho" d="M4 60 C22 54 36 46 46 30"/><path class="galho fino" d="M18 34 C24 30 28 24 26 16"/><path class="galho fino" d="M34 46 C40 44 46 40 50 34"/><path class="espinho" d="M30 21 l-5 -7 l8 4 z"/><path class="espinho" d="M42 34 l7 -2 l-4 6 z"/><circle class="no" cx="4" cy="60" r="3.2"/></svg>';
  const barraPainel = (classe, nome, sigla, resta, max) => `<span class="barra ${classe}" title="${nome}: ${resta} de ${max}" style="--v:${max ? (resta / max).toFixed(3) : 0}"><i></i><em>${resta}/${max}</em><small>${sigla}</small></span>`;
  raiz.innerHTML = `
    <div class="tela-jogo bg2${paineisOcultos ? ' paineis-ocultos' : ''}" style="--retrato:url('${esc(new URL(retrato, location.href).href)}')">
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
          ${poderesCena.length ? '<button type="button" class="hud-com-icone hud-sangue" data-hud="disciplinas" title="Disciplinas (Q)" aria-label="Disciplinas"><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C15 8 18 11 18 15a6 6 0 0 1-12 0c0-4 3-7 6-12z"/></svg><span class="hud-nome">Sangue <kbd>Q</kbd></span></button>' : ''}
          <button type="button" data-hud="efeitos" class="hud-icone" aria-pressed="${efeitos.ligados()}" title="Chuva e efeitos" aria-label="Chuva e efeitos"><span class="icone-texto">☂</span><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6.5a2 2 0 0 1-4 0"/><path d="M12 3v-1"/></svg><span class="hud-nome">Chuva</span></button>
          <button type="button" data-hud="som" class="hud-icone" aria-pressed="${som.ligado()}" title="Som ambiente" aria-label="Som ambiente"><span class="icone-texto">♪</span><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg><span class="hud-nome">Som</span></button>
          <button type="button" data-hud="legenda" class="hud-icone" title="Como funciona a noite" aria-label="Como funciona a noite"><span class="icone-texto">?</span><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17v.5"/></svg><span class="hud-nome">Ajuda</span></button>
          <button type="button" data-hud="menu" class="hud-icone" title="Mais opções" aria-label="Mais opções"><span class="icone-texto">⋯</span><svg class="hud-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg><span class="hud-nome">Mais</span></button>
        </nav>
      </header>
      <div class="moldura" aria-hidden="true">
        <span class="canto canto-se">${CANTO}</span><span class="canto canto-sd">${CANTO}</span><span class="canto canto-ie">${CANTO}</span><span class="canto canto-id">${CANTO}</span>
        <span class="pedra-chave"><i></i></span>
      </div>
      <div class="relogio-noite" role="img"></div>
      <aside class="painel-retrato" style="--anel:${(() => { const fv = vit.max ? vit.resta / vit.max : 0; const fw = von.max ? von.resta / von.max : 0; const ff = fome / 5; const g = (cor, ini, f) => `${cor} ${ini}deg ${(ini + 118 * f).toFixed(1)}deg, #1c150f ${(ini + 118 * f).toFixed(1)}deg ${ini + 120}deg`; return `${g('#5fa86a', 0, fv)}, ${g('#6c8fd0', 120, fw)}, ${g('#c8202f', 240, ff)}`; })()}">
        <button type="button" class="retrato-grande${fome >= 4 ? ' faminto' : ''}${ferido ? ' ferido' : ''}" data-hud="ficha" title="Ficha (F)">
          <img src="${esc(retrato)}" alt=""><span class="estado-cor" aria-hidden="true"></span>
        </button>
        <b class="retrato-nome">${esc(p.nome)}</b>
        <div class="barras">
          ${barraPainel('barra-vit', 'Vitalidade', 'V', vit.resta, vit.max)}
          ${barraPainel('barra-von', 'Força de Vontade', 'FV', von.resta, von.max)}
          ${barraPainel('barra-fome', 'Fome', 'F', fome, 5)}
        </div>
        <div class="selos-estado" aria-label="Estado"></div>
        ${humanidade ? `<div class="humanidade-bolinhas" title="Humanidade: ${humanidade} de 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < humanidade ? 'cheia' : ''}"></i>`).join('')}</div>` : ''}
      </aside>
      <section class="painel-baixo" aria-label="Registro da noite">
        <ol class="registro-noite" aria-live="polite"></ol>
        <div class="painel-pergunta"></div>
      </section>
      <button type="button" class="botao-centrar" data-hud="centrar" hidden title="Centralizar no personagem (C)" aria-label="Centralizar no personagem"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button>
      <button type="button" class="botao-pausa" data-hud="pausa" aria-pressed="false" title="Pausar (espaço)" aria-label="Pausa"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="icone-pausar" d="M8 5v14M16 5v14"/><path class="icone-soltar" d="M8 5l11 7-11 7z"/></svg></button>
      <button type="button" class="mostrar-paineis" data-hud="paineis" title="Mostrar ou esconder os painéis (H)" aria-label="Painéis"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M8 4v16M3 15h18"/></svg></button>
      <aside class="hud-plano" aria-live="polite"></aside>
      <div class="barra-disciplinas" hidden role="toolbar" aria-label="Disciplinas"></div>
      <footer class="hud-dicas"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> andar · <kbd>Shift</kbd> correr · <kbd>E</kbd> interagir · <kbd>Tab</kbd> mostrar tudo · <kbd>M</kbd> mapa · <kbd>P</kbd> plano · <kbd>F</kbd> ficha · <kbd>J</kbd> diário</footer>
    </div>`;
  const palco = raiz.querySelector('.palco');
  const caixaPlano = raiz.querySelector('.hud-plano');
  const camadas = raiz.querySelector('.tela-jogo');

  // --- Vantagens das descobertas -----------------------------------------------------------------
  const semAcentoV = (s) => ` ${String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()} `;
  const chaveVantagens = `mascara.vantagens.${noite?.id || 'sem-noite'}`;
  const lerVantagens = () => { try { return JSON.parse(localStorage.getItem(chaveVantagens)) || []; } catch { return []; } };
  function ganharVantagem(v) {
    const lista = lerVantagens();
    if (lista.some((x) => x.id === v.id)) return;
    lista.push(v);
    try { localStorage.setItem(chaveVantagens, JSON.stringify(lista)); } catch { /* sem armazenamento */ }
    som.reacao?.('vantagem', 0);
    aviso('Você sabe algo que ajuda: a opção ligada ganhou a marca ✦.');
    // Durante a caçada, os pontos da cena são as presas: não troca por cima delas.
    if (!emCaca) cena?.atualizarPontos(montarPontos());
    desenharPlano();
  }
  const vantagemDe = (texto) => (texto ? lerVantagens().find((v) => v.termos?.some((t) => semAcentoV(texto).includes(t))) : null);
  const vantagemDaCacada = (lugar) => lerVantagens().find((v) => v.cacada && v.lugar === lugar) || null;
  const comVantagem = (texto, v) => (v && texto && !texto.includes(`[vantagem: ${v.nota}]`) ? `${texto} [vantagem: ${v.nota}]` : texto);

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
      acao = await fonte.encerrarNoite(acao.id);
      todosEncerrados = await fonte.todosEncerraram(noite.id);
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
    const linhaPrincipal = pt.principal ? `${esc(curto(plano.principal, 7))}${vantagemDe(plano.principal) ? ' <span class="marca-ouro" title="Você sabe algo que ajuda">✦</span>' : ''}${plano.disciplina_principal && plano.disciplina_de === plano.principal ? ` <span class="gota-sangue" title="Com ${esc(plano.disciplina_principal)}"></span>` : ''} <i>✓</i>` : '<em>falta escolher</em>';
    const doMinijogo = plano.cacada_curta && plano.cacada === plano.cacada_de;
    const linhaCacada = plano.nao_cacar ? 'não vou caçar <i>✓</i>'
      : pt.cacada && doMinijogo && plano.cacada_falhou ? `<span class="linha-falhou">${esc(plano.cacada_curta)}</span>`
        : pt.cacada ? `${esc(doMinijogo ? plano.cacada_curta : curto(plano.cacada, 5))} <i>✓</i>`
          : '<em>falta</em> <small>(sem caçar, a Fome não baixa)</small>';
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
      principal: comVantagem(plano.principal.trim(), vantagemDe(plano.principal))
        + (plano.disciplina_principal && plano.disciplina_de === plano.principal ? ` [usou ${plano.disciplina_principal} (Despertar)]` : '')
        + (plano.poderes_cena?.length ? ` [usou ${plano.poderes_cena.join(', ')} (Despertar)]` : ''), cacada: (plano.cacada || '').trim(), nao_cacar: !!plano.nao_cacar,
      curta_1: (plano.curta_1 || '').trim(), curta_2: (plano.curta_2 || '').trim(), esforco: !!plano.esforco,
    };
    try {
      acao = await fonte.salvarAcao(noite.id, p.id, campos, acao?.id);
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
        opcoes.forEach((o, i) => pedidos.push({ id: `opcao-${i}`, tipo: 'acao', icone: String(i + 1), rotulo: curto(o), acao: o, texto: o, feito: plano.principal === o, alternativa: !!plano.principal?.trim() && plano.principal !== o, vantagem: vantagemDe(o)?.nota }));
      } else {
        const l = visitado;
        [
          { id: 'explorar', rotulo: `Explorar ${l.em.replace(/^(na|no|em) /, '')}`, texto: `Ir ${l.a} e explorar a região, de olho em quem manda ali.` },
          { id: 'procurar', rotulo: 'Procurar alguém aqui', texto: `Ir ${l.a} e procurar alguém.`, livre: true },
        ].forEach((o) => pedidos.push({ ...o, tipo: 'acao', icone: '!', acao: o.rotulo, feito: plano.principal === o.texto }));
      }
      const cacaFalhou = plano.cacada_falhou && plano.cacada === plano.cacada_de;
      pedidos.push({ id: 'cacar', tipo: 'cacar', icone: '♦', rotulo: cacaFalhou ? 'Caçar de novo' : emOutroLugar ? `Caçar ${visitado.em}` : 'Caçar', acao: 'Decidir a caçada', feito: !!(plano.cacada || plano.nao_cacar), falta: !(plano.cacada || plano.nao_cacar), papel: 'escuro' });
      pedidos.push({ id: 'escrever', tipo: 'escrever', icone: '✎', rotulo: 'Outra ideia', acao: 'Escrever o que fazer', papel: 'livre' });
    }
    // A brasa da escolha: a ação principal deixa uma brasa vermelha no objeto pelo resto da noite; uma
    // ideia escrita ou as ações curtas deixam a brasa no lápis (menor, se forem só as curtas).
    if (noite) {
      const comPrincipal = pedidos.find((pd) => pd.tipo === 'acao' && pd.feito);
      const temCurtas = [plano.curta_1, plano.curta_2].some((x) => x?.trim());
      if (comPrincipal) comPrincipal.brasa = 'grande';
      const lapis = pedidos.find((pd) => pd.id === 'escrever');
      if (lapis && plano.principal?.trim() && !comPrincipal) lapis.brasa = 'grande';
      else if (lapis && temCurtas) lapis.brasa = 'pequena';
    }
    const ancoras = distribuirAncoras(geo, pedidos);
    const pts = [
      { id: 'mapa', tipo: 'saida', icone: '➜', rotulo: emOutroLugar ? 'Voltar ao mapa' : 'Mapa do Rio', acao: 'Abrir o mapa do Rio', x: geo.saida[0], y: geo.saida[1] },
      ...pedidos.map((pd) => { const a = ancoras.get(pd.id); return { ...pd, x: a?.x ?? 0.5, y: a?.y ?? 0.82, parada: a?.parada, lado: a?.lado, baixo: a?.baixo, contorno: a?.contorno, porta: a?.porta }; }),
    ];
    // A caçada é obrigatória: fica sempre à vista; o limite de 5 vale para os outros.
    let vistos = 0;
    pts.forEach((pt) => { if (pt.id === 'cacar' || vistos < MAX_MARCADORES - (pts.some((x) => x.id === 'cacar') ? 1 : 0)) { if (pt.id !== 'cacar') vistos++; } else pt.discreto = true; });
    achados.detalhes.forEach((d) => pts.push({
      id: `detalhe-${d.id}`, tipo: 'detalhe', icone: visto(d.id) ? '·' : '?', rotulo: d.rotulo, acao: `Examinar: ${d.rotulo}`,
      x: d.x, y: d.y, discreto: true, visto: visto(d.id), detalhe: d, baixo: /po[cç]a|garrafa|ch[aã]o|bueiro|tampa|bituca|papel|moeda|sapato|caco/i.test(d.rotulo),
    }));
    const ds = DETALHES_SENTIDOS[lugarId];
    if (ds && meusPoderes.has('sentidos-agucados')) {
      pts.push({ id: `detalhe-${ds.id}`, tipo: 'detalhe', icone: '?', rotulo: ds.rotulo, acao: `Examinar: ${ds.rotulo}`, x: ds.x, y: ds.y, sentidos: true, visto: visto(ds.id), detalhe: ds });
    }
    return pts;
  }

  // Detalhe examinado: uma fala curta de voz interior, sem mudar regras. Fica marcado no aparelho.
  function abrirDetalhe(pt) {
    const d = pt.detalhe;
    if (cena?.perguntarNoBalao) {
      cena.perguntarNoBalao({
        voz: d.voz, texto: d.rotulo, opcoes: ['Olhar mais de perto', 'Seguir em frente'],
        aoEscolher: (i) => {
          if (i !== 0) return;
          anotar('VOCÊ', `examina: ${d.rotulo}.`);
          try { localStorage.setItem(chaveVisto(d.id), '1'); } catch { /* sem armazenamento */ }
          registrar(noite?.id, 'detalhes', { lugar: lugarId, id: d.id, rotulo: d.rotulo, voz: d.voz, texto: d.texto });
          desenharPlano();
          const hd = raiz.querySelector('.hud-descobertas');
          if (hd) { hd.classList.remove('subiu'); void hd.offsetWidth; hd.classList.add('subiu'); }
          cena.falar(d.voz, d.texto, 7000);
          const v = VANTAGENS[lugarId]?.[d.id] || VANTAGENS_SENTIDOS[d.id];
          if (v) setTimeout(() => ganharVantagem({ ...v, id: `${lugarId}.${d.id}`, lugar: lugarId, x: d.x, y: d.y }), 900);
          cena.atualizarPontos(montarPontos());
        },
      });
      return;
    }
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
    const v = VANTAGENS_ESCONDIDOS[c.id];
    if (v) setTimeout(() => ganharVantagem({ ...v, id: c.id, lugar: lugarId, x: c.x, y: c.y }), 1500);
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
    camada?.fechar();
    if (!cena) { aviso('Ação principal escolhida. Envie quando o plano estiver pronto.'); return; }
    const pts = montarPontos();
    cena.atualizarPontos(pts);
    const alvo = pts.find((pt) => pt.brasa === 'grande');
    const frase = curto(texto, 12).replace(/^./, (c) => c.toLowerCase()).replace(/[.…]*$/, '.');
    setTimeout(() => cena.marcarEscolha(alvo?.id, frase), 260);
    anotar('ESTA NOITE', frase);
    setTimeout(() => aviso('Ação principal escolhida. Envie quando o plano estiver pronto.'), 2100);
  }

  // O lugar lembra: só neste aparelho e só nesta noite (a chave tem o id da noite; na próxima, nada).
  const chaveLembra = () => `mascara.lembra.${noite?.id || 'sem-noite'}.${lugarId}`;
  function lerLembranca() { try { return JSON.parse(localStorage.getItem(chaveLembra()) || '{}'); } catch { return {}; } }
  function guardarLembranca(muda) {
    const atualLembra = { ...lerLembranca(), ...muda };
    try { localStorage.setItem(chaveLembra(), JSON.stringify(atualLembra)); } catch { /* sem armazenamento */ }
    mostrarLembranca(atualLembra);
  }
  function mostrarLembranca(m = lerLembranca()) {
    if (!m.vestigio && !m.vigia) return;
    cena?.lembrar?.({
      vigia: m.vigia,
      vestigio: m.vestigio && { ...m.vestigio, aoDizer: () => guardarLembranca({ vestigio: { ...m.vestigio, dito: true } }) },
    });
  }
  const TIPOS_VESTIGIO = ['celular', 'moto', 'copo'];
  const tipoVestigio = (id) => TIPOS_VESTIGIO[[...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0) % TIPOS_VESTIGIO.length];

  function abrirHistoria(revelar, depois) {
    const camada = abrirDialogo(camadas, {
      // Ao fechar a narração, a cena se apresenta de novo: os nomes de todos os pontos por 3 s.
      aoFechar: () => { depois?.(); setTimeout(() => cena?.apresentar?.(3000), 200); },
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
    const discOpcao = disciplinaDaOpcao(texto);
    const camada = abrirDialogo(camadas, {
      rotulo: emOutroLugar ? visitado.nome : 'Esta noite',
      html: `
        <div class="texto-narracao"><p class="voz voz-alma"><span class="voz-nome">VOCÊ</span> — ${esc(texto)}</p></div>
        ${pt.livre ? `<label>O que exatamente?<textarea data-livre rows="3" maxlength="1200">${esc(texto)} </textarea></label>` : ''}
        <ol class="escolhas">
          <li><button type="button" data-principal><span class="escolha-num">1.</span> — Fazer isto esta noite</button></li>
          ${discOpcao ? `<li><button type="button" data-com-disciplina><span class="escolha-num">2.</span> — <span class="gota-sangue" aria-hidden="true"></span>${esc(discOpcao.frase)} · ${esc(discOpcao.nome)}</button></li>` : ''}
          <li><button type="button" data-fechar-dialogo><span class="escolha-num">${discOpcao ? 3 : 2}.</span> — Pensar melhor</button></li>
        </ol>`,
      rodape: plano.principal && plano.principal !== texto ? `<span class="nota">Isto substitui a ação principal atual: “${esc(curto(plano.principal, 10))}”.</span>` : '',
    });
    camada.el.querySelector('[data-principal]').onclick = (ev) => {
      const livre = camada.el.querySelector('[data-livre]');
      const escolhido = livre ? livre.value.trim() : texto;
      confirmarEscolha(ev.currentTarget, () => escolherPrincipal(escolhido, camada));
    };
    camada.el.querySelector('[data-fechar-dialogo]').onclick = () => camada.fechar();
    camada.el.querySelector('[data-com-disciplina]')?.addEventListener('click', async (ev) => {
      const botao = ev.currentTarget;
      if (!(await avisoDoSangue())) return;
      plano.disciplina_principal = discOpcao.nome;
      plano.disciplina_de = texto;
      confirmarEscolha(botao, () => escolherPrincipal(texto, camada));
    });
    camada.el.querySelector('[data-livre]')?.focus({ preventScroll: true });
  }

  function abrirCacada() {
    const pr = v5.predador(p.ficha?.predador?.id);
    const lugarCaca = emOutroLugar ? visitado.em : (localAtual?.em || `em ${lugarNome}`);
    // Três sugestões do tipo de predador, mais as saídas de sempre: do seu jeito, outra ideia, não caçar.
    const onde = emOutroLugar ? ` (${visitado.em})` : '';
    const sugestoes = sugestoesDeCacada(p.ficha?.predador?.id).map((t) => t.replace(/\.$/, '') + onde + '.');
    const podeAgora = !!cena && !!p.sprite?.url && !!noite && !encerrada();
    const opcoesCaca = [...(podeAgora ? ['Caçar aqui, agora'] : []), ...sugestoes, `Do meu jeito de sempre, ${lugarCaca}.`, 'Escrever outra ideia', 'Não vou caçar esta noite (a Fome não baixa)'];
    const desloc = podeAgora ? 1 : 0;
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
        let i = Number(b.dataset.caca);
        if (podeAgora && i === 0) {
          confirmarEscolha(b, async () => {
            camada.fechar();
            // Com poderes de caçada na ficha, o aviso do sangue vem antes, para não parar a caçada no meio.
            if (poderesCena.some((x) => x.quando === 'caca')) await avisoDoSangueNaEntrada();
            cacarAgora(lugarCaca);
          });
          return;
        }
        i -= desloc;
        if (i < sugestoes.length) guardar(b, sugestoes[i], false);
        else if (i === sugestoes.length) guardar(b, emOutroLugar ? `Caçar do meu jeito de sempre ${visitado.em}` : 'Do meu jeito de sempre', false);
        else if (i === sugestoes.length + 1) { const l = camada.el.querySelector('.caca-livre'); l.hidden = false; l.querySelector('textarea').focus({ preventScroll: true }); }
        else guardar(b, '', true);
        return;
      }
      if (ev.target.closest('[data-confirmar-livre]')) {
        const t = camada.el.querySelector('[data-cacada]').value.trim();
        if (t) guardar(ev.target, t, false);
      }
    });
  }

  // --- Disciplinas nas opções da noite (pelo verbo) ---------------------------------------------------
  const VERBOS = [
    { termos: ['seguir', 'vigiar', 'espiar', 'observar'], discs: ['ofuscacao'] },
    { termos: ['perguntar', 'conversar', 'falar', 'convencer', 'pedir'], discs: ['presenca', 'dominacao'] },
    { termos: ['procurar', 'investigar', 'descobrir', 'pesquisar'], discs: ['auspicios'] },
    { termos: ['entrar', 'forcar', 'fugir', 'arrombar', 'correr', 'ir embora'], discs: ['potencia', 'rapidez'] },
  ];
  const meusNiveisDisc = (() => {
    if (p._poderes) {
      const n = {};
      for (const [id, d] of Object.entries(v5.DISCIPLINAS)) if (d.poderes.some((pw) => meusPoderes.has(pw.id))) n[id] = 1;
      return n;
    }
    try { return v5.calcular(p.ficha || {}).disciplinas || {}; } catch { return {}; }
  })();
  const FRASE_DISC = {
    ofuscacao: 'Seguir sem ser visto', presenca: 'Fazer o lugar inteiro querer falar com você', dominacao: 'Mandar dizer a verdade',
    auspicios: 'Ler as auras e os rastros do lugar', potencia: 'Forçar a passagem', rapidez: 'Sair antes que alguém perceba',
  };
  function disciplinaDaOpcao(texto) {
    const t = semAcentoV(texto);
    for (const v of VERBOS) {
      if (!v.termos.some((x) => t.includes(x))) continue;
      const d = v.discs.find((id) => (meusNiveisDisc[id] | 0) > 0);
      if (d) return { id: d, nome: v5.DISCIPLINAS[d].nome, frase: FRASE_DISC[d] };
    }
    return null;
  }
  // Ao entrar na caçada nada está sendo usado ainda: o aviso só tem "Entendi".
  async function avisoDoSangueNaEntrada() {
    try { if (localStorage.getItem(chaveSangue) === '1') return; } catch { /* sem armazenamento */ }
    await perguntar(camadas, { rotulo: 'O sangue desperta', texto: `<p>${esc(AVISO_DESPERTAR)}</p>`, opcoes: ['Entendi'] });
    try { localStorage.setItem(chaveSangue, '1'); } catch { /* sem armazenamento */ }
  }
  async function avisoDoSangue() {
    let avisado = false;
    try { avisado = localStorage.getItem(chaveSangue) === '1'; } catch { /* sem armazenamento */ }
    if (avisado) return true;
    const r = await perguntar(camadas, { rotulo: 'O sangue desperta', texto: `<p>${esc(AVISO_DESPERTAR)}</p>`, opcoes: ['Usar o sangue', 'Agora não'] });
    if (r !== 0) return false;
    try { localStorage.setItem(chaveSangue, '1'); } catch { /* sem armazenamento */ }
    return true;
  }

  // --- Disciplinas em ação ---------------------------------------------------------------------------
  const barra = raiz.querySelector('.barra-disciplinas');
  const chaveSangue = `mascara.sangue.${noite?.id || 'sem-noite'}`;
  const ativosAte = new Map();
  function desenharBarra() {
    if (!barra) return;
    const agora = Date.now();
    barra.innerHTML = poderesCena.filter((x) => x.quando === 'sempre' || emCaca).map((x) => {
      const resta = Math.ceil(((ativosAte.get(x.id) || 0) - agora) / 1000);
      return `<button type="button" data-poder="${x.id}" title="${esc(nomePoder(x.id))}: ${esc(x.efeito)}"${resta > 0 ? ' class="ativo"' : ''}><span class="gota-sangue" aria-hidden="true"></span>${esc(nomePoder(x.id))}${resta > 0 ? ` <small>${resta} s</small>` : ''}</button>`;
    }).join('') || '<span class="nota">Nenhum poder serve aqui agora.</span>';
  }
  function alternarBarra(abrir = barra.hidden) {
    barra.hidden = !abrir;
    if (abrir) desenharBarra();
  }
  async function usarDisciplina(id) {
    const def = poderesCena.find((x) => x.id === id);
    if (!def || !cena) return;
    // Pausado: o poder fica marcado e dispara ao soltar (rodada 27).
    if (cena.pausado?.()) {
      if (filaPausa.has(id)) return;
      filaPausa.add(id);
      raiz.querySelector(`.barra-disciplinas [data-poder="${id}"]`)?.classList.add('na-fila');
      anotar('VOCÊ', `${nomePoder(id)}: ao soltar a pausa.`);
      cena.depoisDaPausa(() => { filaPausa.delete(id); raiz.querySelector(`.barra-disciplinas [data-poder="${id}"]`)?.classList.remove('na-fila'); usarDisciplina(id); });
      return;
    }
    if (def.quando === 'caca' && !emCaca) { aviso('Esse poder só serve durante a caçada na hora.'); return; }
    let avisado = false;
    try { avisado = localStorage.getItem(chaveSangue) === '1'; } catch { /* sem armazenamento */ }
    if (!avisado) {
      const r = await perguntar(camadas, { rotulo: 'O sangue desperta', texto: `<p>${esc(AVISO_DESPERTAR)}</p>`, opcoes: ['Usar o sangue', 'Agora não'] });
      if (r !== 0) return;
      try { localStorage.setItem(chaveSangue, '1'); } catch { /* sem armazenamento */ }
    }
    const presaAlvo = emCaca?.alvo || null;
    if (!cena.usarPoder(id, { alvo: presaAlvo })) { aviso('Esse poder só serve durante a caçada.'); return; }
    const nome = nomePoder(id);
    // Tempo restante: só o texto do botão muda (recriar a barra a cada segundo engolia cliques).
    if (def.dur) {
      ativosAte.set(id, Date.now() + def.dur * 1000);
      const t = setInterval(() => {
        const b = barra?.querySelector(`[data-poder="${id}"]`);
        const resta = Math.ceil((ativosAte.get(id) - Date.now()) / 1000);
        if (b) {
          b.classList.toggle('ativo', resta > 0);
          let s = b.querySelector('small');
          if (resta > 0) { if (!s) { s = document.createElement('small'); b.appendChild(s); } s.textContent = `${resta} s`; } else s?.remove();
        }
        if (resta <= 0) clearInterval(t);
      }, 1000);
    }
    alternarBarra(false);
    if (def.dur) { poderesComTempo.set(nome, Date.now() + def.dur * 1000); desenharSelos(); }
    if (emCaca && def.dur) cena.mostrarPoderAtivo(nome, def.dur);
    else if (emCaca) cena.mostrarPoderAtivo(nome, 999);
    if (emCaca) {
      emCaca.poderes.add(nome);
      if (id === 'perscrutar-alma') {
        emCaca.perscrutou = true;
        // Com Perscrutar, o Tab mostra também o temperamento de cada presa.
        if (!emCaca.alvo) {
          emCaca.presas = emCaca.presas.map((pr) => ({ ...pr, estado: pr.temperamento ? `${pr.estado} · ${TEMPERAMENTOS[pr.temperamento].nome.toLowerCase()}` : pr.estado }));
          cena.atualizarPontos(emCaca.presas);
        }
      }
      if (id === 'assombro' || id === 'intimidar') emCaca.presenca = id;
      if (id === 'nublar-memoria') emCaca.nublar = true;
    } else {
      plano.poderes_cena = [...new Set([...(plano.poderes_cena || []), nome])];
      guardarRascunho();
    }
    desenharBarra();
  }
  camadas.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-caca-desistir]')) { ev.stopPropagation(); cena.cancelarFurtividade(); terminarSemCacar(); aviso('Você deixou a presa ir. Dá para caçar de novo.'); return; }
    if (ev.target.closest('[data-caca-ajuda]')) {
      ev.stopPropagation();
      abrirDialogo(camadas, {
        rotulo: 'A caçada',
        html: `<div class="texto-narracao legenda-caca">
          <p><span class="leg leg-leque"></span><b>O leque</b> no chão é para onde a presa olha. Dentro dele, na luz, ela repara.</p>
          <p><span class="leg leg-anel"></span><b>O anel</b> sob a presa é o tempo: quando acaba, ela vai embora.</p>
          <p><span class="leg leg-barulho"></span><b>Os círculos</b> no chão são barulho: correr chama a atenção.</p>
          <p><span class="leg leg-olho"></span><b>As palavras</b> no alto dizem quanto a rua reparou: ninguém, alguém olhou, você foi visto.</p></div>`,
      });
    }
  });
  barra?.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-poder]');
    if (b) { ev.stopPropagation(); usarDisciplina(b.dataset.poder); }
  });

  // --- Caçada na hora (minijogo, sem dados) ---------------------------------------------------------
  // A Fome abre os olhos: três presas na cena; a abordagem pelo tipo de predador; o fim escreve o texto
  // da caçada no plano. O Narrador rola no fechamento, a partir desse texto.
  let emCaca = null;
  function fomeDesperta(sim) {
    // Visual próprio da caçada: vermelho mais frio, sem a vinheta e o batimento da Fome real.
    document.body.classList.toggle('fome-desperta', sim);
    setTimeout(desenharBarra, 0);
    const desistir = camadas.querySelector('.caca-desistir');
    if (sim && !desistir) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'caca-desistir';
      b.textContent = 'Desistir da caçada';
      b.onclick = () => { cena.cancelarFurtividade(); terminarSemCacar(); aviso('Você deixou a presa ir. Dá para caçar de novo.'); };
      camadas.appendChild(b);
    } else if (!sim) desistir?.remove();
  }
  function terminarSemCacar() {
    emCaca = null;
    fomeDesperta(false);
    cena.atualizarPontos(montarPontos());
  }
  function cacarAgora(onde) {
    if (avisarEncerrada() || !cena) return;
    // Tab mostra o estado da pessoa em palavras (rodada 26), como a vida em palavras dos RPGs clássicos.
    const ESTADOS = ['distraído', 'com pressa', 'olhando o celular', 'cansado', 'sozinho', 'esperando alguém'];
    const estadoDe = (id) => ESTADOS[[...`${id}.${noite?.numero || 0}`].reduce((a, c) => a + c.charCodeAt(0), 0) % ESTADOS.length];
    // Na vista do alto, a caçada escolhe entre a gente que está ali (rodada 33): até três figuras que podem
    // ser presa, sorteadas pela noite; o segurança, o policial e a garçonete ficam de fora.
    const daArea = geo.alto && geo.gente?.length
      ? geo.gente.map((g, i) => ({ g, i, t: TIPOS_GENTE[g.tipo] })).filter((x) => x.t?.presa)
        .sort((a, b) => Math.sin((noite?.numero || 0) * 31 + a.i * 7.3) - Math.sin((noite?.numero || 0) * 31 + b.i * 7.3)).slice(0, 3)
        .map(({ g, i, t }) => ({ id: `presa-pessoa-${i}`, rotulo: t.rotulo, repara: t.repara, vulneravel: t.vulneravel, x: g.x, y: g.y, pessoa: i }))
      : null;
    const presas = (daArea?.length ? daArea : presasDoLugar(geo, noite?.numero || 0)).map((pr) => ({ ...pr, tipo: 'presa', icone: '♦', acao: `Escolher: ${pr.rotulo}`, estado: estadoDe(pr.id), temperamento: temperamentoDe(`${pr.id}.${noite?.numero || 0}`) }));
    emCaca = { presas, onde, poderes: new Set() };
    fomeDesperta(true);
    som.acorde?.();
    cena.atualizarPontos(presas);
    cena.apresentar(3500);
    cena.falar('A FOME', 'Três. Escolha uma.', 3000);
  }
  // Gente da área (vista do alto): na caçada, quem pode ser presa vira presa; fora dela, uma conversa curta.
  function falarComPessoa(pt) {
    const t = TIPOS_GENTE[pt.tipoGente];
    if (!t) return;
    cena.virarPessoaPara?.(pt.id);
    if (emCaca && !emCaca.alvo) {
      if (!t.presa) { cena.falar('A FOME', t.nome === 'Policial' ? 'Esse não. Farda chama atenção.' : 'Esse está de olho em tudo. Outro.', 2800); return; }
      escolherPresa({ id: `presa-${pt.id}`, rotulo: t.rotulo, repara: t.repara, vulneravel: t.vulneravel, x: pt.x, y: pt.y, tipo: 'presa', icone: '♦', acao: `Escolher: ${t.rotulo}`, temperamento: temperamentoDe(`${pt.id}.${noite?.numero || 0}`) });
      return;
    }
    const fala = t.falas[Math.floor(Math.random() * t.falas.length)];
    // A primeira fala da pessoa já vai para o registro (a pergunta no painel não registra sozinha).
    anotar(t.nome.toUpperCase(), fala);
    cena.perguntarNoBalao({
      voz: t.nome.toUpperCase(), texto: fala, opcoes: ['Puxar conversa', 'Deixar para lá'], perto: { x: pt.x, y: pt.y, raio: 0.3 },
      aoEscolher: (i) => {
        if (i !== 0) return;
        anotar('VOCÊ', `conversa com ${t.rotulo}.`);
        // Pista ✦: a primeira pessoa do tipo certo, neste lugar, conta algo que ajuda (uma vez por noite).
        const pista = PISTAS_CONVERSA[lugarId]?.[pt.tipoGente];
        const idPista = `${lugarId}.conversa.${pt.tipoGente}`;
        if (pista && !lerVantagens().some((v) => v.id === idPista)) {
          cena.falar(t.nome.toUpperCase(), `${pista.fala} ✦`, 5200);
          setTimeout(() => ganharVantagem({ id: idPista, lugar: lugarId, x: pt.x, y: pt.y, nota: pista.nota, termos: pista.termos, cacada: pista.cacada }), 1800);
          return;
        }
        cena.falar(t.nome.toUpperCase(), t.falas.find((f) => f !== fala) || fala, 3200);
        setTimeout(() => cena.falar('PRONTIDÃO', `${t.repara.charAt(0).toUpperCase()}${t.repara.slice(1)}.`, 3600), 1400);
      },
    });
  }
  function escolherPresa(pr) {
    if (!emCaca) return;
    if (pr.vulneravel) cena.falar('HUMANIDADE', pr.vulneravel, 2600);
    const ordem = abordagensPara(p.ficha?.predador?.id);
    setTimeout(() => cena.perguntarNoBalao({
      voz: 'A FOME', texto: 'Como?', ms: 1e9, perto: { x: pr.x, y: pr.y, raio: 0.4 },
      aoCancelar: () => cena.falar('A FOME', 'Escolha outra, ou volte a ela.', 3000),
      // A primeira opção é sempre o jeito do predador, dita como gesto: "Do seu jeito: pela sombra · Ir".
      opcoes: ordem.map((k, i) => (i === 0 ? `Do seu jeito: ${ABORDAGENS[k].nome.toLowerCase()} · Ir` : ABORDAGENS[k].nome)),
      aoEscolher: (i) => iniciarAbordagem(pr, ordem[i]),
    }), pr.vulneravel ? 1700 : 150);
    // Conhecer a presa: parado perto dela por 2 s antes de responder, você repara em algo a mais.
    const pos0 = cena.posicao();
    setTimeout(() => {
      if (!emCaca || emCaca.alvo || !pr.repara) return;
      const p1 = cena.posicao();
      if (Math.hypot(p1.x - pos0.x, p1.y - pos0.y) > 0.01) return;
      const temp = emCaca.perscrutou && pr.temperamento ? ` (ressonância ${TEMPERAMENTOS[pr.temperamento].nome})` : '';
      emCaca.observou = `${pr.repara}${temp}`;
      cena.textoDoBalao(`Como? <small class="repara">Você repara: ${esc(pr.repara)}${esc(temp)}.</small>`);
    }, (pr.vulneravel ? 1700 : 150) + 2000);
  }
  function iniciarAbordagem(pr, modo) {
    emCaca.alvo = pr;
    if (modo === 'conversa') setTimeout(() => cena.ensinar('conversa', 'Escolha rápido. Quem hesita, assusta.'), 4400);
    if (modo === 'frente') setTimeout(() => cena.ensinar('frente', 'Chegue perto e fale antes que ela grite.'), 4400);
    cena.falar('A FOME', ABORDAGENS[modo].explica, 4200);
    const zonas = lerVantagens().filter((v) => v.cacada && v.lugar === lugarId).map((v) => ({ x: v.x, y: v.y, raio: 0.12 }));
    if (modo === 'conversa') {
      let boas = 0;
      let hesitou = false;
      const perguntar = (n) => {
        if (n >= PERGUNTAS_CONVERSA.length) { terminarCaca(pr, modo, (2 - boas) * 0.3 + (hesitou ? 0.25 : 0), boas >= 1); return; }
        const q = PERGUNTAS_CONVERSA[n];
        const extra = n === 0 && emCaca.presenca ? [`${nomePoder(emCaca.presenca)}: ${emCaca.presenca === 'assombro' ? 'um sorriso, e ela já confia' : 'um olhar, e ela não ousa recusar'}`]
          : n === 0 && emCaca.observou ? ['Puxar assunto com o que você reparou'] : [];
        cena.perguntarNoBalao({
          voz: 'A FOME', texto: q.texto, opcoes: [...q.opcoes, ...extra],
          aoEscolher: (i) => { if (i === 0 || i === 2) boas += i === 2 ? 2 : 1; setTimeout(() => perguntar(n + 1), 500); },
          aoExpirar: () => { hesitou = true; setTimeout(() => perguntar(n + 1), 300); },
        });
      };
      setTimeout(() => perguntar(0), 1800);
      return;
    }
    cena.atualizarPontos([{ ...pr, discreto: false, alvo: true }]);
    if (modo === 'frente') setTimeout(() => cena.irAte(pr), 300);
    cena.iniciarFurtividade({
      alvo: pr, modo, zonas, limite: 20,
      aoVisto: () => saidasDeQuemFoiVisto(),
      aoFim: ({ chegou, atencao }) => {
        if (!chegou && modo === 'sombra' && !emCaca.segunda) { segundaChance(pr, modo, atencao, zonas); return; }
        if (!chegou) { terminarCaca(pr, modo, atencao, false); return; }
        if (modo !== 'frente') { terminarCaca(pr, modo, atencao, true); return; }
        const t0 = performance.now();
        const extraFrente = emCaca.presenca ? [`${nomePoder(emCaca.presenca)}: só o olhar, sem palavra`] : [];
        cena.perguntarNoBalao({
          voz: 'A FOME', texto: FRASES_FRENTE.texto, opcoes: [...FRASES_FRENTE.opcoes, ...extraFrente],
          aoEscolher: (i) => terminarCaca(pr, modo, Math.min(1, atencao + (i === 1 ? 0.4 : 0) + (i === 2 ? 0 : (performance.now() - t0) / 20000)), i !== 1),
          aoExpirar: () => terminarCaca(pr, modo, Math.min(1, atencao + 0.45), false),
        });
      },
    });
  }
  // Ser visto abre um segundo momento: meio segundo lento (na cena) e um balão com saídas.
  function saidasDeQuemFoiVisto() {
    if (!emCaca || emCaca.visto) return;
    emCaca.visto = true;
    if (pausaAuto().visto) cena.pausar('viram você');
    // No máximo 3 escolhas: disfarçar, o poder que mais serve agora e seguir assim.
    const est = cena.estadoCaca() || {};
    const tem = (id) => meusPoderes.has(id);
    const melhor = tem('manto-sombras') && (est.naSombra || est.parado) ? 'manto-sombras'
      : tem('nublar-memoria') && est.dPresa < 0.25 ? 'nublar-memoria'
        : tem('assombro') && est.noCampo ? 'assombro'
          : ['manto-sombras', 'nublar-memoria', 'assombro'].find(tem);
    const poderes = melhor ? [melhor] : [];
    const opcoes = ['Disfarçar: atender o celular', ...poderes.map((id) => `Usar ${nomePoder(id)}`), 'Seguir assim'];
    cena.perguntarNoBalao({
      voz: 'A FOME', texto: 'Viram você.', opcoes, ms: 6000,
      aoEscolher: (i) => {
        if (i === 0) {
          cena.ajustarCaca((c) => { c.atencao = 0.5; c.limite = Math.max(4, c.limite - 4); });
          emCaca.disfarcou = true;
          cena.avisoCaca('disfarçou · a rua só olhou · menos 4 s');
        } else if (i <= poderes.length) {
          const id = poderes[i - 1];
          cena.ajustarCaca((c) => { c.atencao = id === 'nublar-memoria' ? 0.45 : 0.5; if (id === 'manto-sombras') c.manto = true; });
          emCaca.poderes.add(nomePoder(id));
          som.reacao?.('disciplina', 0);
          cena.avisoCaca(`${nomePoder(id)} · a rua desvia o olhar`);
        } else {
          emCaca.riscoMascara = true;
          cena.avisoCaca('seguiu assim · risco à Máscara');
        }
      },
      aoExpirar: () => { emCaca && (emCaca.riscoMascara = true); },
    });
  }
  // A presa que escapa deixa pegadas por 6 s: "Seguir até a esquina" dá uma segunda chance de 10 s.
  function segundaChance(pr, modo, atencao, zonas) {
    emCaca.segunda = true;
    const lado = pr.x >= 0.5 ? 1 : -1;
    const destino = { ...pr, x: Math.max(0.05, Math.min(0.95, pr.x + lado * 0.14)), parada: undefined };
    cena.pegadas(pr.x, pr.y, destino.x, destino.y);
    cena.perguntarNoBalao({
      voz: 'A FOME', texto: 'Ela foi para a esquina.', opcoes: ['Seguir até a esquina', 'Deixar ir'], ms: 6000,
      aoEscolher: (i) => {
        if (i !== 0) { terminarCaca(pr, modo, atencao, false); return; }
        emCaca.alvo = destino;
        cena.atualizarPontos([{ ...destino, discreto: false, alvo: true }]);
        cena.iniciarFurtividade({
          alvo: destino, modo, zonas, limite: 10,
          aoVisto: () => saidasDeQuemFoiVisto(),
          aoFim: (r) => { emCaca.seguiu = true; terminarCaca(destino, modo, Math.max(atencao, r.atencao), r.chegou); },
        });
      },
      aoExpirar: () => terminarCaca(pr, modo, atencao, false),
    });
  }

  function terminarCaca(pr, modo, atencao, deuCerto, jaPerguntou = false) {
    if (!emCaca) return;
    // Nublar a Memória: quem viu esquece ("foi visto" vira "alguém olhou").
    if (emCaca.nublar && atencao >= 0.67 && !jaPerguntou) {
      cena.perguntarNoBalao({
        voz: 'DOMINAÇÃO', texto: 'Alguém viu você.', opcoes: ['Fazer esquecer (Nublar a Memória)', 'Deixar assim'],
        aoEscolher: (i) => { if (i === 0) { emCaca.esqueceu = true; terminarCaca(pr, modo, 0.5, deuCerto, true); } else terminarCaca(pr, modo, atencao, deuCerto, true); },
        aoExpirar: () => terminarCaca(pr, modo, atencao, deuCerto, true),
      });
      return;
    }
    const extras = [];
    if (emCaca.perscrutou && pr.temperamento) extras.push(`ressonância ${TEMPERAMENTOS[pr.temperamento].nome}`);
    if (emCaca.esqueceu) extras.push('fez a testemunha esquecer');
    if (emCaca.observou) extras.push(`observou a presa antes: ${emCaca.observou}`);
    if (emCaca.disfarcou) extras.push('disfarçou quando viram');
    if (emCaca.riscoMascara) extras.push('foi visto, risco à Máscara');
    if (emCaca.seguiu) extras.push('seguiu a presa até a esquina');
    if (emCaca.poderes.size) extras.push(`usou ${[...emCaca.poderes].join(', ')} (Despertar)`);
    if (deuCerto && !emCaca.beijou) {
      emCaca.beijou = true;
      cena.beijo(pr).then(() => terminarCaca(pr, modo, atencao, deuCerto, true));
      return;
    }
    const v = vantagemDaCacada(lugarId);
    const { texto, curto: linha, falhou } = textoDaCacada({ presa: pr, abordagem: modo, atencao, deuCerto, onde: emCaca.onde, vantagem: v?.nota, extras });
    plano.cacada = texto;
    plano.cacada_curta = linha;
    plano.cacada_falhou = falhou;
    anotar('CAÇADA', `${linha}${falhou ? '' : ' ✓'}`);
    plano.cacada_de = texto;
    plano.nao_cacar = false;
    // O fim: a tela pulsa vermelho, o batimento desacelera e a voz d'A FOME fala.
    camadas.classList.remove('pulso-fome');
    void camadas.offsetWidth;
    camadas.classList.add('pulso-fome');
    setTimeout(() => camadas.classList.remove('pulso-fome'), 1100);
    const viu = emCaca.visto && !emCaca.esqueceu;
    if (viu) { try { localStorage.setItem(chaveRisco, '1'); } catch { /* sem armazenamento */ } desenharSelos(); }
    emCaca = null;
    fomeDesperta(false);
    cena.atualizarPontos(montarPontos());
    const ondeEstava = cena.posicao();
    const lembra = {};
    if (deuCerto) lembra.vestigio = { x: pr.x, y: pr.y, tipo: tipoVestigio(pr.id) };
    if (viu) {
      const lado = pr.x < 0.5 ? 1 : -1;
      lembra.vigia = { x: Math.min(0.94, Math.max(0.06, pr.x + lado * 0.09)), y: pr.y - 0.015, olha: ondeEstava.x };
    }
    if (lembra.vestigio || lembra.vigia) setTimeout(() => guardarLembranca(lembra), 900);
    cena.falar('A FOME', deuCerto ? 'Agora sim. Por enquanto.' : 'Escapou. Eu continuo aqui.', 3600);
    guardarRascunho();
    if (!deuCerto) aviso(`${modo === 'sombra' ? 'Ela foi embora.' : 'A presa escapou.'} A tentativa fica no plano; dá para caçar de novo até enviar.`);
    else aviso('Caçada guardada no plano. A Fome baixa quando a noite fechar. Dá para caçar de novo até enviar.');
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
    camada.el.querySelector('[data-livre]').focus({ preventScroll: true });
    camada.el.querySelector('[data-principal]').onclick = (ev) => {
      plano.principal = camada.el.querySelector('[data-livre]').value.trim();
      plano.curta_1 = camada.el.querySelector('[data-c1]').value.trim();
      plano.curta_2 = camada.el.querySelector('[data-c2]').value.trim();
      plano.esforco = camada.el.querySelector('[data-esforco]').checked;
      confirmarEscolha(ev.currentTarget, () => {
        guardarRascunho();
        camada.fechar();
        const pts = montarPontos();
        cena?.atualizarPontos(pts);
        if (plano.principal) setTimeout(() => cena?.marcarEscolha('escrever', curto(plano.principal, 12).replace(/^./, (c) => c.toLowerCase()).replace(/[.…]*$/, '.')), 260);
      });
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
    abrirJanela(camadas, { titulo: 'Registro do personagem', classe: 'janela-larga janela-registro', montar: (corpo) => telaRegistro(corpo, p) });
  }

  function abrirDiario() {
    abrirJanela(camadas, { titulo: `Diário de ${p.nome}`, classe: 'janela-larga janela-registro janela-diario', montar: (corpo) => telaDiario(corpo, p, { noite, plano }) });
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
          <div class="opcoes-leitura">
            <span class="grupo-rotulo">Pausa automática</span>
            ${[['visto', 'Quando viram você'], ['presa', 'Quando a presa começa a ir embora'], ['poder', 'Quando um poder acaba']].map(([k, nome]) => `<div class="leitura-grupo" role="group" aria-label="${nome}"><span>${nome}</span><div><button type="button" class="chip-leitura" data-pausa="${k}" data-valor="1" aria-pressed="${!!pausaAuto()[k]}">Pausar</button><button type="button" class="chip-leitura" data-pausa="${k}" data-valor="0" aria-pressed="${!pausaAuto()[k]}">Não</button></div></div>`).join('')}
            <div class="leitura-grupo" role="group" aria-label="Névoa nas áreas"><span>Névoa nas áreas (primeira visita da noite)</span><div><button type="button" class="chip-leitura" data-nevoa="1" aria-pressed="${nevoaLigada()}">Ligada</button><button type="button" class="chip-leitura" data-nevoa="0" aria-pressed="${!nevoaLigada()}">Desligada</button></div></div>
            <div class="leitura-grupo" role="group" aria-label="Vista da cena"><span>Vista da cena (vale ao entrar de novo)</span><div><button type="button" class="chip-leitura" data-vista="alto" aria-pressed="${vistaSalva !== 'olhos'}">Do alto</button><button type="button" class="chip-leitura" data-vista="olhos" aria-pressed="${vistaSalva === 'olhos'}">Na altura dos olhos</button></div></div>
            <div class="leitura-grupo" role="group" aria-label="Dicas"><span>Dicas ao chegar num bairro</span><div><button type="button" class="chip-leitura" data-m="dicas">Mostrar de novo todas as dicas</button></div></div>
            <p class="nota">Espaço pausa e solta a cena a qualquer momento. Pausado, dá para marcar o destino e escolher um poder: tudo acontece ao soltar.</p>
          </div>
          <p class="nota">Conteúdo de fã não oficial, sem fins comerciais. Vampire: The Masquerade e World of Darkness são marcas registradas da Paradox Interactive AB. Este site não é oficial nem endossado por ela.</p>`;
        corpo.querySelector('[data-m="novo"]').onclick = () => { camada.fechar(); irPara('novo'); };
        corpo.querySelector('[data-m="sair"]').onclick = async () => { camada.fechar(); if (irPara !== ir) { irPara('sair'); return; } await banco.sair(); };
        corpo.querySelectorAll('[data-leitura]').forEach((b) => {
          b.onclick = () => {
            const campo = b.dataset.leitura;
            gravarLeitura({ [campo]: campo === 'ritmo' ? Number(b.dataset.valor) : b.dataset.valor });
            corpo.querySelectorAll(`[data-leitura="${campo}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          };
        });
        corpo.querySelectorAll('[data-vista]').forEach((b) => {
          b.onclick = () => {
            try { localStorage.setItem('mascara.vista', b.dataset.vista); } catch { /* sem armazenamento */ }
            corpo.querySelectorAll('[data-vista]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
            aviso('A vista muda ao entrar de novo num lugar.');
          };
        });
        corpo.querySelector('[data-m="dicas"]').onclick = () => {
          try { Object.keys(localStorage).filter((k) => k.startsWith('mascara.semDica.') || k === 'mascara.dicasVistas').forEach((k) => localStorage.removeItem(k)); } catch { /* sem armazenamento */ }
          aviso('As dicas voltam a aparecer ao chegar em cada bairro.');
        };
        corpo.querySelectorAll('[data-nevoa]').forEach((b) => {
          b.onclick = () => {
            try { localStorage.setItem('mascara.nevoaAreas', b.dataset.nevoa); } catch { /* sem armazenamento */ }
            corpo.querySelectorAll('[data-nevoa]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          };
        });
        corpo.querySelectorAll('[data-pausa]').forEach((b) => {
          b.onclick = () => {
            const k = b.dataset.pausa;
            const atualP = pausaAuto();
            atualP[k] = b.dataset.valor === '1';
            try { localStorage.setItem('mascara.pausaAuto', JSON.stringify(atualP)); } catch { /* sem armazenamento */ }
            corpo.querySelectorAll(`[data-pausa="${k}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
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
      case 'mapa': fecharTudo(); irPara('mapa'); break;
      case 'ficha': abrirFicha(); break;
      case 'diario': abrirDiario(); break;
      case 'plano': abrirPlano(); break;
      case 'enviar': enviar(); break;
      case 'encerrar': encerrar(); break;
      case 'disciplinas': alternarBarra(); break;
      case 'menu': abrirMenu(); break;
      case 'paineis': alternarPaineis(); break;
      case 'pausa': cena?.alternarPausa?.(); break;
      case 'centrar': cena?.centrarCamera?.(); break;
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

  // --- Painéis de pedra (rodada 25) ------------------------------------------------------------
  const listaRegistro = raiz.querySelector('.registro-noite');
  const semAcentoR = (t) => String(t || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const classeVoz = (voz) => {
    const v = semAcentoR(voz);
    if (v.includes('fome')) return 'fome';
    if (v.includes('humanidade')) return 'humanidade';
    if (v === 'voce' || v === 'esta noite') return 'voce';
    if (v.includes('cacada')) return 'cacada';
    if (/^[A-ZÀ-Ý[\] ]+$/.test(String(voz))) return 'habilidade';
    return 'outra';
  };
  function linhaHtml({ voz, texto }) {
    return `<li class="reg-${classeVoz(voz)}"><b>${esc(voz)}</b> ${esc(texto)}</li>`;
  }
  listaRegistro.innerHTML = registroDaNoite(noite?.id).linhas.slice(-80).map(linhaHtml).join('');
  listaRegistro.scrollTop = listaRegistro.scrollHeight;
  function anotar(voz, texto) {
    const l = anotarLinha(noite?.id, voz, texto);
    if (!l) return;
    listaRegistro.insertAdjacentHTML('beforeend', linhaHtml(l));
    while (listaRegistro.children.length > 120) listaRegistro.firstElementChild.remove();
    listaRegistro.scrollTop = listaRegistro.scrollHeight;
  }
  // Relógio da noite: um disco da lua ao sol; o sol é o fim do prazo (quando a noite fecha).
  const relogio = raiz.querySelector('.relogio-noite');
  function desenharRelogio() {
    if (!noite?.fecha_em) { relogio.hidden = true; return; }
    const fim = new Date(noite.fecha_em).getTime();
    const ini = noite.abre_em ? new Date(noite.abre_em).getTime() : fim - 3 * 86400000;
    const resta = Math.max(0, fim - Date.now());
    const f = Math.min(1, Math.max(0, 1 - resta / Math.max(1, fim - ini)));
    const curtoT = tempoRestante(resta);
    const texto = resta <= 0 ? 'o sol chegou' : `faltam ${curtoT} até o sol · a noite fecha ${quandoCurto(noite.fecha_em)}`;
    relogio.title = texto;
    relogio.setAttribute('aria-label', `Relógio da noite: ${texto}`);
    relogio.classList.toggle('amanhecendo', f > 0.85);
    relogio.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">
        <circle class="aro" cx="32" cy="32" r="30"/>
        <g class="disco" style="transform:rotate(${(-180 * f).toFixed(1)}deg)">
          <path class="metade-noite" d="M4 32a28 28 0 0 1 56 0z"/><path class="metade-dia" d="M4 32a28 28 0 0 0 56 0z"/>
          <circle class="lua" cx="32" cy="16" r="7"/><circle class="lua-sombra" cx="35" cy="14" r="6"/>
          <g class="sol"><circle cx="32" cy="48" r="6"/><path d="M32 38v-2M32 60v-2M22 48h-2M44 48h-2M25 41l-1.5-1.5M40.5 56.5 39 55M25 55l-1.5 1.5M40.5 39.5 39 41"/></g>
        </g>
        <path class="horizonte" d="M2 32h60"/><circle class="ponteiro" cx="32" cy="5" r="2.4"/>
      </svg><small>${resta <= 0 ? 'amanheceu' : curtoT}</small>`;
  }
  desenharRelogio();
  const relogioTimer = setInterval(() => { if (!relogio.isConnected) { clearInterval(relogioTimer); return; } desenharRelogio(); }, 60000);
  function alternarPaineis() {
    paineisOcultos = !paineisOcultos;
    camadas.classList.toggle('paineis-ocultos', paineisOcultos);
    try { localStorage.setItem('mascara.paineis', paineisOcultos ? 'ocultos' : 'visiveis'); } catch { /* sem armazenamento */ }
    // A cena mede a área livre de novo (a moldura muda o tamanho do palco).
    window.dispatchEvent(new Event('resize'));
  }
  // Selos de estado embaixo das barras: Faminto, Ferido, Máscara em risco e os poderes ativos com o tempo.
  const selosEl = raiz.querySelector('.selos-estado');
  const poderesComTempo = new Map(); // nome → até quando (ms)
  const chaveRisco = `mascara.mascaraRisco.${noite?.id || 'sem-noite'}`;
  let selosTimer = null;
  function desenharSelos() {
    if (!selosEl) return;
    let risco = false;
    try { risco = localStorage.getItem(chaveRisco) === '1'; } catch { /* sem armazenamento */ }
    const agora = Date.now();
    for (const [n, ate] of poderesComTempo) if (ate <= agora) poderesComTempo.delete(n);
    const selos = [];
    if (fome >= 4) selos.push(['faminto', 'Faminto: a Fome está alta', '♦', '']);
    if (ferido) selos.push(['ferido', 'Ferido: metade da Vitalidade ou menos', '✚', '']);
    if (risco) selos.push(['risco', 'Máscara em risco: alguém viu você esta noite', '◉', '']);
    for (const [n, ate] of poderesComTempo) selos.push(['poder', `${n}: ativo`, '❖', `${Math.ceil((ate - agora) / 1000)}s`]);
    selosEl.innerHTML = selos.map(([c, t, g, tempo]) => `<span class="selo selo-${c}" title="${esc(t)}"><b aria-hidden="true">${g}</b>${tempo ? `<small>${tempo}</small>` : ''}<span class="sr">${esc(t)}</span></span>`).join('');
    clearTimeout(selosTimer);
    if (poderesComTempo.size && selosEl.isConnected) selosTimer = setTimeout(desenharSelos, 1000);
  }
  // Pausa e pausa automática (rodada 27). As opções ficam no aparelho; "viram você" vem ligada.
  const filaPausa = new Set();
  const pausaAuto = () => { try { return { visto: true, presa: false, poder: false, ...(JSON.parse(localStorage.getItem('mascara.pausaAuto')) || {}) }; } catch { return { visto: true, presa: false, poder: false }; } };
  function aoPausa(pausadoAgora, motivo) {
    const b = raiz.querySelector('.botao-pausa');
    if (b) { b.setAttribute('aria-pressed', String(pausadoAgora)); b.title = pausadoAgora ? 'Soltar (espaço)' : 'Pausar (espaço)'; }
    // Só as pausas automáticas vão para o registro, com o motivo; a manual diz "espaço solta" na pedra-chave.
    if (pausadoAgora && motivo) anotar('PAUSA', `${motivo}.`);
  }
  // Tela de passagem (rodada 27): ao trocar de lugar, um cartão com a pintura do destino escurecida, o
  // nome gravado e uma dica. No mínimo 0,8 s (ou o tempo de carregar a pintura); um clique pula.
  const DICAS_PASSAGEM = [
    'Na caçada, o espaço pausa tudo.',
    'Tab mostra o que dá para examinar.',
    'O sol não perdoa: veja o relógio da noite.',
    'H esconde os painéis e deixa só a cena.',
    'Clique no chão para andar; clique duas vezes para correr.',
    'Na sombra, a presa não vê você. Na luz, vê.',
    'O registro embaixo guarda tudo o que você viu esta noite.',
    'Pausado, escolha um poder: ele dispara ao soltar.',
  ];
  function mostrarPassagem() {
    let anterior = null;
    try { anterior = sessionStorage.getItem('mascara.ultimoLugar'); } catch { /* sem armazenamento */ }
    // Grava o lugar só depois de um tempo na cena: a tela pode ser montada duas vezes ao abrir, e a
    // segunda montagem apagava o cartão da primeira (a dica "sumia rápido demais").
    setTimeout(() => { if (camadas.isConnected) { try { sessionStorage.setItem('mascara.ultimoLugar', lugarId || ''); } catch { /* sem armazenamento */ } } }, 1500);
    if (!anterior || anterior === (lugarId || '')) return;
    // Pedido do Bruno: a dica fica até o clique e pode ser desligada para este bairro.
    try { if (localStorage.getItem(`mascara.semDica.${lugarId}`) === '1') return; } catch { /* sem armazenamento */ }
    let usadas = [];
    try { usadas = JSON.parse(localStorage.getItem('mascara.dicasVistas')) || []; } catch { /* sem armazenamento */ }
    let livres = DICAS_PASSAGEM.map((_, i) => i).filter((i) => !usadas.includes(i));
    if (!livres.length) { usadas = []; livres = DICAS_PASSAGEM.map((_, i) => i); }
    const i = livres[Math.floor(Math.random() * livres.length)];
    try { localStorage.setItem('mascara.dicasVistas', JSON.stringify([...usadas, i])); } catch { /* sem armazenamento */ }
    const cartao = document.createElement('div');
    cartao.className = 'cartao-passagem';
    cartao.setAttribute('role', 'status');
    // O cartão usa a pintura na altura dos olhos (a de antes), que continua no jogo.
    const imagemCartao = emOutroLugar ? (visitado.imagem || imagem) : (localAtual?.imagem || imagem);
    cartao.style.setProperty('--fundo', `url('${new URL(imagemCartao, location.href).href}')`);
    cartao.innerHTML = `<div class="cartao-moldura"><small>Você chega</small><h2>${esc(lugarNome)}</h2><p class="cartao-dica"><b>Dica</b> ${esc(DICAS_PASSAGEM[i])}</p><div class="cartao-botoes"><button type="button" class="btn" data-cartao="seguir">Seguir</button><button type="button" class="btn-texto" data-cartao="nunca">Não mostrar mais neste bairro</button></div><span class="cartao-pular">clique, toque ou Enter para seguir</span></div>`;
    camadas.appendChild(cartao);
    const t0 = performance.now();
    const tirar = () => {
      if (!cartao.isConnected) return;
      document.removeEventListener('keydown', teclaCartao, true);
      cartao.classList.add('saindo');
      setTimeout(() => cartao.remove(), 350);
    };
    // O clique que trouxe o jogador até aqui não fecha o cartão: só vale depois de 400 ms.
    const pronto = () => performance.now() - t0 > 400;
    function teclaCartao(ev) {
      if (!cartao.isConnected) { document.removeEventListener('keydown', teclaCartao, true); return; }
      if (['Enter', ' ', 'Escape'].includes(ev.key)) { ev.preventDefault(); ev.stopPropagation(); if (pronto()) tirar(); }
    }
    document.addEventListener('keydown', teclaCartao, true);
    cartao.addEventListener('click', (ev) => {
      if (!pronto()) return;
      if (ev.target.closest('[data-cartao="nunca"]')) {
        try { localStorage.setItem(`mascara.semDica.${lugarId}`, '1'); } catch { /* sem armazenamento */ }
        aviso(`A dica não aparece mais ao chegar ${localAtual?.em || 'aqui'}. Em Opções dá para mostrar de novo.`);
      }
      tirar();
    });
  }
  // Névoa leve (rodada 29): só na primeira visita ao lugar em cada noite, e se a opção estiver ligada.
  const nevoaLigada = () => { try { return localStorage.getItem('mascara.nevoaAreas') !== '0'; } catch { return true; } };
  const chaveNevoa = `mascara.nevoa.${noite?.id || 'sem-noite'}.${lugarId}`;
  let nevoaNaEntrada = false;
  try { nevoaNaEntrada = !!noite && nevoaLigada() && localStorage.getItem(chaveNevoa) !== '1'; } catch { /* sem armazenamento */ }
  // Marca a visita depois de uns segundos na cena (a tela pode ser montada duas vezes ao abrir).
  if (nevoaNaEntrada) setTimeout(() => { if (camadas.isConnected) { try { localStorage.setItem(chaveNevoa, '1'); } catch { /* sem armazenamento */ } } }, 4000);
  let numerosAte = 0;
  function mostrarNumeros() {
    camadas.classList.add('mostrar-numeros');
    numerosAte = Date.now() + 2600;
    setTimeout(() => { if (Date.now() >= numerosAte) camadas.classList.remove('mostrar-numeros'); }, 2700);
  }

  // --- Cena -----------------------------------------------------------------------------------
  const cena = montarCena(palco, {
    nome: p.nome,
    nevoa: nevoaNaEntrada,
    nevoaLonge: nevoaLigada(),
    painel: raiz.querySelector('.painel-pergunta'),
    aoFalar: (voz, texto) => anotar(voz, texto),
    aoMostrarTudo: () => mostrarNumeros(),
    aoPausa,
    aoPresaVai: () => { if (pausaAuto().presa) cena.pausar('a presa começa a ir embora'); },
    aoPoderAcabou: (n) => { if (pausaAuto().poder) cena.pausar(`${n} acabou`); },
    cla: p.ficha?.cla,
    sprite: p.sprite,
    imagem,
    lugar: geo.alto ? `${lugarId}-alto` : lugarId,
    pontos: montarPontos(),
    // Comentários do lugar, mais os detalhes escondidos que a ficha deixa perceber (sem dados).
    comentarios: [...achados.comentarios, ...escondidosPara(lugarId, (() => { try { return v5.calcular(p.ficha || {}).habilidades; } catch { return {}; } })())],
    comentar: podeComentar,
    tempo,
    aoInteragir: (pt) => {
      if (pt.tipo === 'historia') abrirHistoria(false);
      else if ((pt.tipo === 'acao' || pt.tipo === 'cacar' || pt.tipo === 'escrever') && avisarEncerrada()) return;
      else if (pt.tipo === 'acao') abrirOpcao(pt);
      else if (pt.tipo === 'cacar') abrirCacada();
      else if (pt.tipo === 'escrever') abrirEscrita();
      else if (pt.tipo === 'detalhe') abrirDetalhe(pt);
      else if (pt.tipo === 'presa' && !pt.alvo) escolherPresa(pt);
      else if (pt.tipo === 'pessoa') falarComPessoa(pt);
      else if (pt.tipo === 'saida') acao_('mapa');
    },
    aoTecla: (ev) => {
      const k = ev.key.toLowerCase();
      if (k === 'q' && poderesCena.length) { ev.preventDefault(); alternarBarra(); return; }
      if (k === 'h') { ev.preventDefault(); alternarPaineis(); return; }
      const mapa = { m: 'mapa', f: 'ficha', j: 'diario', p: 'plano' };
      if (mapa[k]) { ev.preventDefault(); acao_(mapa[k]); }
    },
  });
  desenharPlano();
  if (cena.vistaDoAlto) raiz.querySelector('.botao-centrar').hidden = false;
  mostrarLembranca();
  desenharSelos();
  mostrarPassagem();
  // Só no modo de depuração: a cena fica acessível no console, para os testes.
  if (location.hash.includes('depurar')) window.__cena = cena;
  if (noite && acao?.encerrada_em) fonte.todosEncerraram(noite.id).then((t) => { todosEncerrados = t; desenharPlano(); });

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
    clima: { garoa: 'noite de garoa', lua: 'noite de lua', tempestade: 'tempestade', nevoa: 'noite de névoa' }[tempoDaNoite(noite?.numero || 0)] || '',
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
