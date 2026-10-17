// Ficha do personagem em palavras (e, se pedido, a ficha técnica com pontos).
import * as v5 from './motor/v5.js';
import { esc, pontos } from './ui.js';
import { retratoDe, retratoProvisorio, localDe } from './cidade.js';
import { termo, termoDe, ligarGlossario, dicaDoGlossario } from './glossario.js';

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
