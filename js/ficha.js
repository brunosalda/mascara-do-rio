// Ficha do personagem em palavras (e, se pedido, a ficha técnica com pontos).
import * as v5 from './motor/v5.js';
import { esc, pontos } from './ui.js';
import { retratoDe, retratoProvisorio, localDe } from './cidade.js';
import { termo, termoDe, ligarGlossario, dicaDoGlossario } from './glossario.js';
import { quandoONarradorVolta } from './jogo/registro.js';
import { perguntar } from './jogo/camadas.js';

// Retrato emoldurado, nome, clã e onde o personagem está.
// Até o Narrador pintar o retrato do personagem, mostra o retrato provisório (silhueta do clã).
export function cabecalhoPersonagem(p) {
  const f = p.ficha || {};
  const c = v5.cla(f.cla);
  const retrato = retratoDe(p);
  const local = p.estado?.local;
  return `
    <header class="cabecalho-personagem">
      <img class="retrato" src="${esc(retrato)}" alt="Retrato de ${esc(p.nome)}">
      <div>
        <span class="grupo-rotulo">${esc(c?.nome || '')}${local ? ` · ${esc(localDe(local)?.nome || local)}` : ''}</span>
        <h1 class="nome-personagem">${esc(p.nome || 'Sem nome')}</h1>
        ${f.origem?.conceito ? `<p class="nota">${esc(f.origem.conceito)}</p>` : ''}
      </div>
    </header>`;
}

const CHAVE_TECNICA = 'mascara.fichaTecnica';

function nivelOuPalavra(tipo, n, tecnica, max = 5) {
  return tecnica ? pontos(n, max) : `<b class="nivel-${n}">${v5.palavra(tipo, n)}</b>`;
}

function nomeItem(lista, id) {
  return lista.find((x) => x.id === id)?.nome || id;
}

// Respostas digitadas às vezes terminam com ponto ("Ana."): tira antes de juntar com outro texto.
export const semPontoFinal = (t) => String(t || '').trim().replace(/[\s.,;:!]+$/u, '');

// A pessoa que prende o personagem à humanidade, com a relação ("Ana, amizade de infância").
function pedraDeToque(c) {
  const relacao = c?.touchstone?.relacao === 'amigo de infância' ? 'amizade de infância' : c?.touchstone?.relacao;
  return [semPontoFinal(c?.touchstone?.nome), relacao].filter(Boolean).join(', ');
}
export { pedraDeToque };

// "em vida, Nome Completo", quando o nome nas ruas é outro.
export function linhaEmVida(f) {
  const vida = semPontoFinal(f?.origem?.nomeEmVida);
  return vida && vida !== semPontoFinal(f?.nome) ? `<p class="em-vida">em vida, ${esc(vida)}</p>` : '';
}

// O essencial para a tela final da criação: os 3 pontos mais fortes e os 2 mais fracos, em palavras.
export function fortesEFracos(f) {
  const calc = v5.calcular(f);
  const atr = v5.ATRIBUTOS.map((a) => ({ tipo: 'atributo', id: a.id, nome: a.nome, n: calc.atributos[a.id] }));
  const habs = v5.HABILIDADES.filter((h) => calc.habilidades[h.id] > 0)
    .map((h) => ({ tipo: 'habilidade', id: h.id, nome: h.nome, n: calc.habilidades[h.id], esp: calc.especializacoes.find((e) => e.hab === h.id && e.nome?.trim())?.nome }))
    .sort((a, b) => b.n - a.n);
  const porNivel = [...atr].sort((a, b) => b.n - a.n);
  const fortes = [porNivel[0], ...habs.slice(0, 2)].filter(Boolean);
  const defeito = calc.defeitos.filter((x) => x.nivel > 0).sort((a, b) => b.nivel - a.nivel)[0];
  const fracos = [porNivel.at(-1)];
  if (defeito) fracos.push({ tipo: 'defeito', id: defeito.id, nome: nomeItem(v5.DEFEITOS, defeito.id) });
  else fracos.push(porNivel.at(-2));
  return { fortes, fracos };
}

// O dossiê do fim da criação (por conversa ou detalhada): retrato, nome, clã e predador, conceito,
// pontos fortes e fracos, convicção, ambição e desejo.
export function dossieDoFim(ficha, classe = '') {
  const c = v5.cla(ficha.cla);
  const pr = v5.predador(ficha.predador?.id);
  const { fortes, fracos } = fortesEFracos(ficha);
  const conv = (ficha.conviccoes || []).find((x) => x?.texto?.trim());
  const pedra = conv ? pedraDeToque(conv) : '';
  return `
    <div class="fim-dossie ${classe}">
      <img class="fim-retrato" src="${retratoProvisorio(ficha.cla)}" alt="Retrato provisório, até o Narrador pintar o seu">
      <div class="fim-texto">
        <span class="grupo-rotulo">${c ? termoDe('cla', c.id, c.nome) : ''}${pr ? ` · ${termoDe('predador', pr.id, pr.nome)}` : ''}</span>
        <h2 class="fim-nome">${esc(semPontoFinal(ficha.nome || ficha.origem?.nomeEmVida) || 'Sem nome')}</h2>
        ${linhaEmVida(ficha)}
        ${ficha.origem?.conceito ? `<p class="fim-conceito">${esc(ficha.origem.conceito)}</p>` : ''}
        ${dicaDoGlossario()}
        <div class="fim-colunas">
          <div><h3>Seus pontos fortes</h3><ul class="lista-palavras compacta">${fortes.map(itemFortesFracos).join('')}</ul></div>
          <div><h3>Seus pontos fracos</h3><ul class="lista-palavras compacta">${fracos.map(itemFortesFracos).join('')}</ul></div>
        </div>
        <div class="fim-frases">
          ${conv ? `<p><b>${termoDe('geral', 'conviccao', 'Convicção')}.</b> ${esc(semPontoFinal(conv.texto))}${pedra ? `. <span class="nota">Quem ainda te prende à humanidade: ${esc(pedra)}.</span>` : ''}</p>` : ''}
          ${ficha.ambicao ? `<p><b>${termoDe('geral', 'ambicao', 'Ambição')}.</b> ${esc(semPontoFinal(ficha.ambicao))}.</p>` : ''}
          ${ficha.desejo ? `<p><b>${termoDe('geral', 'desejo', 'Desejo')}.</b> ${esc(semPontoFinal(ficha.desejo))}.</p>` : ''}
        </div>
      </div>
    </div>`;
}

export function linhaDepoisDoEnvio() {
  return `<p class="fim-depois">Depois de enviar, o Narrador lê sua ficha, encaixa você na cidade e escreve o seu prelúdio. Ele volta ${quandoONarradorVolta()}. Até ele começar, você ainda pode ajustar.</p>`;
}

// A confirmação do envio, numa caixa do jogo. Resolve true só com "Enviar ao Narrador".
export async function confirmarEnvio(raiz) {
  const r = await perguntar(raiz, {
    rotulo: 'Enviar a ficha',
    texto: `<p>O Narrador vai ler sua ficha e escrever o seu prelúdio. Ele volta ${quandoONarradorVolta()}. Até ele começar, você ainda pode voltar e ajustar.</p>`,
    opcoes: ['Enviar ao Narrador', 'Revisar mais um pouco'],
  });
  return r === 0;
}

export function itemFortesFracos(x) {
  const nivel = x.tipo === 'defeito' ? 'defeito' : v5.palavra(x.tipo, x.n);
  return `<li><span>${termoDe(x.tipo, x.id, x.nome)}${x.esp ? ` <small class="inline">(${esc(x.esp)})</small>` : ''}</span><b class="${x.tipo === 'defeito' ? 'nivel-defeito' : `nivel-${x.n}`}">${nivel}</b></li>`;
}

export function resumoFicha(f, { tecnica = false, semCabeca = false } = {}) {
  if (!f?.cla) return '<p class="nota">A ficha ainda está no começo.</p>';
  const calc = v5.calcular(f);
  const c = v5.cla(f.cla);
  const pr = v5.predador(f.predador?.id);

  const atributos = Object.entries(v5.GRUPOS).map(([g, nome]) => `
    <div>
      <span class="grupo-rotulo">${nome}</span>
      <ul class="lista-palavras compacta">
        ${v5.ATRIBUTOS.filter((a) => a.grupo === g).map((a) => `<li><span>${termo(a.nome, a.desc)}</span>${nivelOuPalavra('atributo', calc.atributos[a.id], tecnica)}</li>`).join('')}
      </ul>
    </div>`).join('');

  const treinadas = v5.HABILIDADES
    .filter((h) => calc.habilidades[h.id] > 0)
    .sort((a, b) => calc.habilidades[b.id] - calc.habilidades[a.id] || a.nome.localeCompare(b.nome));
  const espDe = (hab) => calc.especializacoes.filter((e) => e.hab === hab && e.nome?.trim()).map((e) => esc(e.nome));

  const disciplinas = Object.entries(calc.disciplinas).map(([id, n]) => {
    const d = v5.DISCIPLINAS[id];
    const poderes = d.poderes.filter((pw) => calc.poderes.includes(pw.id));
    return `
      <li>
        <span>${termoDe('disciplina', id, d.nome)}</span>${nivelOuPalavra('disciplina', n, tecnica)}
        <small>${poderes.map((pw) => termo(pw.nome, pw.desc)).join(' · ') || 'Nenhum poder escolhido'}</small>
      </li>`;
  }).join('');

  const marcas = (lista, catalogo, tipo) => lista
    .filter((x) => x.nivel > 0)
    .map((x) => `<li><span>${termoDe(tipo, x.id, nomeItem(catalogo, x.id))}${x.nota ? ` <small class="inline">(${esc(x.nota)})</small>` : ''}</span>${pontos(x.nivel, x.nivel)}</li>`)
    .join('');

  const sangueFraco = c?.sangueFraco
    ? `${(f.meritosSangueFraco || []).map((id) => `<li><span>${termoDe('sangue-fraco', id, nomeItem(v5.MERITOS_SANGUE_FRACO, id))}</span><small>mérito</small></li>`).join('')}
       ${(f.defeitosSangueFraco || []).map((id) => `<li><span>${termoDe('sangue-fraco', id, nomeItem(v5.DEFEITOS_SANGUE_FRACO, id))}</span><small>defeito</small></li>`).join('')}`
    : '';

  const conviccoes = (f.conviccoes || []).filter((x) => x?.texto?.trim()).map((x) => `
    <li><span>${esc(x.texto)}</span><small>${esc(pedraDeToque(x))}</small></li>`).join('');
  ligarGlossario();

  return `
    <div class="ficha">
      <div class="ficha-cabeca" ${semCabeca ? 'hidden' : ''}>
        <img class="retrato" src="${retratoProvisorio(f.cla)}" alt="">
        <div>
          <span class="grupo-rotulo">${c ? termoDe('cla', c.id, c.nome) : ''}${pr ? ` · ${termoDe('predador', pr.id, pr.nome)}` : ''}</span>
          <h2>${esc(f.nome || f.origem?.nomeEmVida || 'Sem nome')}</h2>
          ${linhaEmVida(f)}
          <p>${esc(f.origem?.conceito || '')}</p>
          ${f.origem?.bairro ? `<p class="nota">Bairro: ${esc(f.origem.bairro)}${f.origem?.abraco ? ` · Abraçado ${esc(f.origem.abraco)}` : ''}.</p>` : ''}
        </div>
      </div>
      <div class="ficha-secao"><h3>Atributos</h3><div class="tres-colunas">${atributos}</div></div>
      <div class="ficha-secao">
        <h3>Habilidades</h3>
        <ul class="lista-palavras compacta duas">
          ${treinadas.map((h) => `<li><span>${termo(h.nome, h.desc)}${espDe(h.id).length ? ` <small class="inline">(${espDe(h.id).join(', ')})</small>` : ''}</span>${nivelOuPalavra('habilidade', calc.habilidades[h.id], tecnica)}</li>`).join('') || '<li class="nota">Nenhuma ainda.</li>'}
        </ul>
      </div>
      <div class="ficha-secao"><h3>Disciplinas</h3><ul class="lista-palavras">${disciplinas || '<li class="nota">Nenhuma ainda.</li>'}</ul></div>
      <div class="ficha-secao duas-colunas">
        <div><h3>Vantagens</h3><ul class="lista-palavras compacta">${marcas(calc.vantagens, v5.VANTAGENS, 'vantagem') || '<li class="nota">Nenhuma.</li>'}${sangueFraco}</ul></div>
        <div><h3>Defeitos</h3><ul class="lista-palavras compacta">${marcas(calc.defeitos, v5.DEFEITOS, 'defeito') || '<li class="nota">Nenhum.</li>'}</ul></div>
      </div>
      <div class="ficha-secao">
        <h3>O que te prende à humanidade</h3>
        <ul class="lista-palavras">${conviccoes || '<li class="nota">Nenhuma convicção ainda.</li>'}</ul>
        ${f.ambicao ? `<p><b>${termoDe('geral', 'ambicao', 'Ambição')}.</b> ${esc(f.ambicao)}</p>` : ''}
        ${f.desejo ? `<p><b>${termoDe('geral', 'desejo', 'Desejo')}.</b> ${esc(f.desejo)}</p>` : ''}
        <p><b>${termoDe('geral', 'humanidade', 'Humanidade')}.</b> ${v5.textoHumanidade(calc.humanidade)}${tecnica ? ` (${calc.humanidade})` : ''}</p>
      </div>
      ${f.aparencia ? `<div class="ficha-secao"><h3>Aparência</h3><p>${esc(f.aparencia)}</p></div>` : ''}
    </div>`;
}

// Estado atual (Fome, ferimentos, vontade, humanidade), em palavras.
export function painelEstado(estado, { tecnica = false } = {}) {
  if (!estado || estado.fome == null) return '';
  const fome = v5.textoFome(estado.fome);
  const vit = estado.vitalidade || {};
  const von = estado.vontade || {};
  const gotas = Array.from({ length: 5 }, (_, i) => `<svg class="gota ${i < estado.fome ? 'cheia' : ''}" viewBox="0 0 12 16"><path d="M6 1C8 5 11 7.5 11 10.5A5 5 0 0 1 1 10.5C1 7.5 4 5 6 1z"/></svg>`).join('');
  return `
    <div class="estado">
      <div class="estado-fome" data-fome="${estado.fome}">
        <span class="grupo-rotulo">Fome</span>
        <div class="gotas" aria-hidden="true">${gotas}</div>
        <b>${fome.nome}</b>
        <small>${fome.texto}</small>
      </div>
      <div class="estado-item"><span class="grupo-rotulo">Corpo</span><b>${v5.textoVitalidade(vit.max, vit.superficial, vit.agravado)}</b>${tecnica ? `<small>${vit.max - (vit.superficial || 0) - (vit.agravado || 0)} de ${vit.max}</small>` : ''}</div>
      <div class="estado-item"><span class="grupo-rotulo">Vontade</span><b>${v5.textoVontade(von.max, von.superficial, von.agravado)}</b>${tecnica ? `<small>${von.max - (von.superficial || 0) - (von.agravado || 0)} de ${von.max}</small>` : ''}</div>
      <div class="estado-item"><span class="grupo-rotulo">Alma</span><b>${v5.textoHumanidade(estado.humanidade)}</b>${tecnica ? `<small>Humanidade ${estado.humanidade}${estado.manchas ? `, ${estado.manchas} mancha(s)` : ''}</small>` : ''}</div>
    </div>`;
}

export function lerTecnica() {
  try { return localStorage.getItem(CHAVE_TECNICA) === '1'; } catch { return false; }
}

export function gravarTecnica(v) {
  try { localStorage.setItem(CHAVE_TECNICA, v ? '1' : '0'); } catch { /* sem armazenamento */ }
}

export async function telaFicha(raiz, p) {
  let tecnica = lerTecnica();
  const desenhar = () => {
    // Dossiê: o retrato grande e o estado em frases à esquerda; o que o personagem sabe fazer,
    // em palavras, à direita. Sem cartões.
    const f = p.ficha || {};
    const retrato = retratoDe(p);
    const local = p.estado?.local;
    raiz.innerHTML = `
      <section class="dossie">
        <aside class="dossie-lado">
          <img class="dossie-retrato" src="${esc(retrato)}" alt="Retrato de ${esc(p.nome)}">
          <span class="grupo-rotulo">${esc(v5.cla(f.cla)?.nome || '')}${local ? ` · ${esc(localDe(local)?.nome || local)}` : ''}</span>
          <h1 class="nome-personagem">${esc(p.nome || 'Sem nome')}</h1>
          ${linhaEmVida({ ...f, nome: p.nome })}
          ${dicaDoGlossario()}
          ${f.origem?.conceito ? `<p class="dossie-conceito">${esc(f.origem.conceito)}</p>` : ''}
          ${painelEstado(p.estado, { tecnica })}
          <label class="interruptor"><input type="checkbox" id="tecnica" ${tecnica ? 'checked' : ''}> Ficha técnica (com pontos)</label>
        </aside>
        <div class="dossie-texto">${resumoFicha(p.ficha, { tecnica, semCabeca: true })}</div>
      </section>`;
    raiz.querySelector('#tecnica').onchange = (e) => { tecnica = e.target.checked; gravarTecnica(tecnica); desenhar(); };
  };
  desenhar();
}

// --- Registro do personagem (rodada 29) ------------------------------------------------------------
// Dentro do jogo, F abre a ficha como registro de personagem dos RPGs clássicos: retrato grande à
// esquerda com nome, clã, predador e geração; à direita, as abas Ficha, Disciplinas e Biografia;
// embaixo, as trilhas de Vitalidade, Força de Vontade, Humanidade e Fome. Letra grande.
const bolinhas = (n, max = 5) => `<span class="rp-bolinhas" aria-label="${n} de ${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'cheia' : ''}"></i>`).join('')}</span>`;

function trilha(nome, resta, max, classe, palavra) {
  return `<div class="rp-trilha ${classe}" title="${esc(nome)}: ${resta} de ${max}">
    <span class="rp-trilha-nome">${esc(nome)}</span>
    <span class="rp-trilha-caixas">${Array.from({ length: max }, (_, i) => `<i class="${i < resta ? 'cheia' : ''}"></i>`).join('')}</span>
    <small>${esc(palavra)}</small>
  </div>`;
}

function abaFichaRP(f, calc) {
  const colunas = Object.entries(v5.GRUPOS).map(([g, nome]) => `
    <div class="rp-coluna">
      <h4>${esc(nome)}</h4>
      <ul>${v5.ATRIBUTOS.filter((a) => a.grupo === g).map((a) => `<li title="${esc(v5.palavra('atributo', calc.atributos[a.id]))}"><span>${termo(a.nome, a.desc)}</span>${bolinhas(calc.atributos[a.id])}</li>`).join('')}</ul>
    </div>`).join('');
  const treinadas = v5.HABILIDADES.filter((h) => calc.habilidades[h.id] > 0)
    .sort((a, b) => calc.habilidades[b.id] - calc.habilidades[a.id] || a.nome.localeCompare(b.nome));
  const espDe = (hab) => calc.especializacoes.filter((e) => e.hab === hab && e.nome?.trim()).map((e) => esc(e.nome));
  const marcas = (lista, catalogo, tipo) => lista.filter((x) => x.nivel > 0)
    .map((x) => `<li><span>${termoDe(tipo, x.id, nomeItem(catalogo, x.id))}${x.nota ? ` <small class="inline">(${esc(x.nota)})</small>` : ''}</span>${bolinhas(x.nivel, x.nivel)}</li>`).join('');
  return `
    <div class="rp-colunas">${colunas}</div>
    <h4 class="rp-titulo">Habilidades</h4>
    <ul class="rp-lista duas">${treinadas.map((h) => `<li><span>${termo(h.nome, h.desc)}${espDe(h.id).length ? ` <small class="inline">(${espDe(h.id).join(', ')})</small>` : ''}</span>${bolinhas(calc.habilidades[h.id])}</li>`).join('') || '<li class="nota">Nenhuma ainda.</li>'}</ul>
    <div class="rp-duas">
      <div><h4 class="rp-titulo">Vantagens</h4><ul class="rp-lista">${marcas(calc.vantagens, v5.VANTAGENS, 'vantagem') || '<li class="nota">Nenhuma.</li>'}</ul></div>
      <div><h4 class="rp-titulo">Defeitos</h4><ul class="rp-lista">${marcas(calc.defeitos, v5.DEFEITOS, 'defeito') || '<li class="nota">Nenhum.</li>'}</ul></div>
    </div>`;
}

// --- Fase 3.3, parte da tela (dados de demonstração até o banco ser liberado) --------------------
// Árvore do sangue: as disciplinas do clã e a do predador como galhos; cada nível é um nó com os poderes
// dele. O custo é o da V5 (no clã, nível novo x 5; fora, x 7; Caitiff, x 6), dito em palavras diante da
// experiência guardada. Poderes que cobram em Humanidade, Fome ou Besta levam moldura vermelha.
function abaSangueRP(f, calc, est) {
  const c = v5.cla(f.cla);
  const doCla = c?.disciplinas || [];
  const doPredador = f.predador?.disciplina && !doCla.includes(f.predador.disciplina) ? [f.predador.disciplina] : [];
  const galhos = [...new Set([...doCla, ...doPredador, ...Object.keys(calc.disciplinas)])].slice(0, 4);
  const xp = est.experiencia ?? 0;
  const fator = (id) => (c?.livre ? 6 : doCla.includes(id) ? 5 : 7);
  const palavraCusto = (custo) => (custo <= xp ? 'ao seu alcance' : custo <= xp + 6 ? 'falta pouco' : 'ainda longe');
  const caro = (pw) => /humanidade|fome|besta/i.test(pw.desc || '');
  if (!galhos.length) return '<p class="nota">O sangue ainda não despertou nenhuma disciplina.</p>';
  return `
    <p class="rp-intro">Experiência guardada: <b>${xp >= 15 ? 'bastante' : xp >= 6 ? 'alguma' : xp > 0 ? 'pouca' : 'nenhuma'}</b>. O Narrador dá experiência no fechamento da noite.</p>
    <div class="arvore-sangue">${galhos.map((id) => {
      const d = v5.DISCIPLINAS[id];
      const n = calc.disciplinas[id] || 0;
      return `<section class="galho-sangue">
        <h4>${termoDe('disciplina', id, d.nome)}<small>${doCla.includes(id) ? 'do clã' : 'do predador'}</small></h4>
        <ol>${[1, 2, 3, 4, 5].map((nivel) => {
          const estado = nivel <= n ? 'tem' : nivel === n + 1 ? 'proximo' : 'longe';
          const poderes = d.poderes.filter((pw) => pw.nivel === nivel);
          return `<li class="no-sangue no-${estado}${poderes.some(caro) ? ' no-caro' : ''}">
            <span class="no-bolinha" aria-hidden="true"></span>
            <span class="no-texto"><b>${nivel}º</b> ${poderes.map((pw) => `<span title="${esc(pw.desc || '')}">${esc(pw.nome)}</span>`).join(' · ') || '<i>sem poder neste nível</i>'}
            ${estado === 'proximo' ? `<em class="no-custo">${palavraCusto(nivel * fator(id))}</em>` : ''}</span>
          </li>`;
        }).join('')}</ol>
      </section>`;
    }).join('')}</div>
    <p class="nota">Comprar um nível acontece pelo Narrador, no fechamento; os poderes com moldura vermelha cobram um preço na Humanidade, na Fome ou na Besta.</p>`;
}

// Itens: uma lista de cinco espaços, sem grade e sem cor de raridade; cada item tem um traço.
const ESPACOS_ITEM = [['roupa', 'Roupa'], ['arma', 'Arma escondida'], ['ferramenta', 'Ferramenta'], ['eletronico', 'Celular ou eletrônico'], ['veiculo', 'Veículo']];
function abaItensRP(est) {
  const itens = est.itens || [];
  return `<ul class="lista-itens">${ESPACOS_ITEM.map(([id, nome]) => {
    const it = itens.find((x) => x.espaco === id);
    return `<li class="${it ? '' : 'vazio'}"><span class="item-espaco">${nome}</span>${it ? `<b>${esc(it.nome)}</b><small>${esc(it.traco || '')}</small>` : '<i>nada</i>'}</li>`;
  }).join('')}</ul>
  <p class="nota">Os itens chegam pelas tarefas, pela caçada, comprando com os Recursos ou pelo Narrador.</p>`;
}

// Status em palavras, com cada facção e a atenção da polícia.
const FACCOES = [['camarilla', 'Camarilla'], ['anarquistas', 'Anarquistas'], ['independentes', 'Independentes'], ['policia', 'Atenção da polícia']];
function blocoStatusRP(est) {
  const st = est.status || {};
  return `<dl class="rp-status">${FACCOES.map(([id, nome]) => `<dt>${nome}</dt><dd>${esc(st[id] || 'desconhecido')}</dd>`).join('')}</dl>`;
}

function abaDisciplinasRP(calc) {
  const itens = Object.entries(calc.disciplinas).map(([id, n]) => {
    const d = v5.DISCIPLINAS[id];
    const poderes = d.poderes.filter((pw) => calc.poderes.includes(pw.id));
    return `
      <article class="rp-disciplina">
        <header><b>${termoDe('disciplina', id, d.nome)}</b>${bolinhas(n)}</header>
        ${poderes.length ? `<ul>${poderes.map((pw) => `<li><b>${esc(pw.nome)}</b> — ${esc(pw.desc || '')}</li>`).join('')}</ul>` : '<p class="nota">Nenhum poder escolhido.</p>'}
      </article>`;
  }).join('');
  return `${itens || '<p class="nota">Nenhuma disciplina ainda.</p>'}
    <p class="rp-despertar"><b>O risco do Despertar.</b> Usar o sangue pede um teste de Despertar quando a noite fechar: a Fome pode subir.</p>`;
}

function abaBiografiaRP(f, p) {
  const o = f.origem || {};
  const conv = (f.conviccoes || []).filter((x) => x?.texto?.trim());
  const linhas = [
    o.nomeEmVida ? ['Em vida', esc(semPontoFinal(o.nomeEmVida))] : null,
    o.ocupacao ? ['O que fazia', esc(semPontoFinal(o.ocupacao))] : null,
    o.bairro ? ['De onde vem', esc(semPontoFinal(o.bairro))] : null,
    o.abraco ? ['O Abraço', esc(semPontoFinal(o.abraco))] : null,
    ...conv.map((c) => ['Convicção', `${esc(semPontoFinal(c.texto))}${pedraDeToque(c) ? ` <small>(quem te prende: ${esc(pedraDeToque(c))})</small>` : ''}`]),
    f.ambicao ? ['Ambição', esc(semPontoFinal(f.ambicao))] : null,
    f.desejo ? ['Desejo', esc(semPontoFinal(f.desejo))] : null,
    f.aparencia ? ['Aparência', esc(f.aparencia)] : null,
  ].filter(Boolean);
  return `
    <p class="rp-intro">A última noite como uma pessoa comum, e o que ficou dela.</p>
    <dl class="rp-bio">${linhas.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') || '<p class="nota">A biografia aparece quando a ficha estiver completa.</p>'}</dl>`;
}

export function telaRegistro(raiz, p) {
  const f = p.ficha || {};
  if (!f.cla) { raiz.innerHTML = '<p class="nota">A ficha ainda está no começo.</p>'; return; }
  const calc = v5.calcular(f);
  const c = v5.cla(f.cla);
  const pr = v5.predador(f.predador?.id);
  const est = p.estado || {};
  const caixa = (e, max) => { const m = e?.max || max || 0; return [Math.max(0, m - (e?.superficial || 0) - (e?.agravado || 0)), m]; };
  const [vitR, vitM] = caixa(est.vitalidade, calc.vitalidade);
  const [vonR, vonM] = caixa(est.vontade, calc.forcaVontade);
  const hum = est.humanidade ?? calc.humanidade ?? 0;
  const fome = est.fome ?? 0;
  const abas = [['ficha', 'Ficha', () => abaFichaRP(f, calc)], ['sangue', 'Sangue', () => abaSangueRP(f, calc, est)], ['disciplinas', 'Disciplinas', () => abaDisciplinasRP(calc)], ['itens', 'Itens', () => abaItensRP(est)], ['biografia', 'Biografia', () => abaBiografiaRP(f, p)]];
  raiz.innerHTML = `
    <section class="registro-pj">
      <aside class="rp-lado">
        <div class="rp-retrato"><img src="${esc(retratoDe(p))}" alt="Retrato de ${esc(p.nome)}"></div>
        <h2 class="rp-nome">${esc(p.nome || 'Sem nome')}</h2>
        ${linhaEmVida({ ...f, nome: p.nome })}
        <dl class="rp-dados">
          <dt>Clã</dt><dd>${c ? termoDe('cla', c.id, c.nome) : '—'}</dd>
          <dt>Predador</dt><dd>${pr ? termoDe('predador', pr.id, pr.nome) : '—'}</dd>
          <dt>Geração</dt><dd>${calc.geracao ? `${calc.geracao}ª` : '—'}</dd>
        </dl>
        ${f.origem?.conceito ? `<p class="rp-conceito">${esc(f.origem.conceito)}</p>` : ''}
        <h4 class="rp-titulo">Status</h4>
        ${blocoStatusRP(est)}
        <button type="button" class="btn-secundario rp-refugio" data-refugio>Refúgio</button>
      </aside>
      <div class="rp-corpo">
        <div class="rp-abas" role="tablist">${abas.map(([id, nome], i) => `<button type="button" role="tab" data-rp="${id}" aria-selected="${i === 0}">${nome}</button>`).join('')}</div>
        <div class="rp-pagina" role="tabpanel"></div>
      </div>
      <footer class="rp-trilhas">
        ${trilha('Vitalidade', vitR, vitM, 'tr-vit', v5.textoVitalidade(est.vitalidade?.max || vitM, est.vitalidade?.superficial, est.vitalidade?.agravado))}
        ${trilha('Força de Vontade', vonR, vonM, 'tr-von', v5.textoVontade(est.vontade?.max || vonM, est.vontade?.superficial, est.vontade?.agravado))}
        ${trilha('Humanidade', hum, 10, 'tr-hum', v5.textoHumanidade(hum))}
        ${trilha('Fome', fome, 5, 'tr-fome', v5.textoFome(fome).nome)}
      </footer>
    </section>`;
  const pagina = raiz.querySelector('.rp-pagina');
  const mostrar = (id) => {
    raiz.querySelectorAll('[data-rp]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.rp === id)));
    pagina.innerHTML = abas.find(([a]) => a === id)[2]();
  };
  raiz.querySelectorAll('[data-rp]').forEach((b) => { b.onclick = () => mostrar(b.dataset.rp); });
  mostrar('ficha');
  // Refúgio como cena: a pintura do bairro onde ele dorme, com o que se sabe do lugar.
  raiz.querySelector('[data-refugio]').onclick = () => {
    const r = est.refugio || {};
    const fundo = localDe(r.bairro || est.local)?.imagem || retratoDe(p);
    pagina.innerHTML = `
      <div class="refugio-cena" style="--fundo:url('${esc(new URL(fundo, location.href).href)}')">
        <div class="refugio-texto">
          <h4>Refúgio</h4>
          <p>${esc(r.local || 'Ainda sem refúgio fixo: dorme onde dá.')}</p>
          <dl class="rp-status"><dt>Segurança</dt><dd>${esc(r.seguranca || 'nenhuma')}</dd><dt>Rebanho</dt><dd>${esc(r.rebanho || 'nenhum')}</dd>${r.nota ? `<dt>O que tem</dt><dd>${esc(r.nota)}</dd>` : ''}</dl>
          <p class="nota">O refúgio melhora com o tempo, pelo Narrador.</p>
        </div>
      </div>`;
    raiz.querySelectorAll('[data-rp]').forEach((b) => b.setAttribute('aria-selected', 'false'));
  };
  ligarGlossario();
}
