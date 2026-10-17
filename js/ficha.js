// Ficha do personagem em palavras (e, se pedido, a ficha técnica com pontos).
import * as v5 from './motor/v5.js';
import { esc, pontos } from './ui.js';
import { RETRATO_PADRAO, localDe } from './cidade.js';

// Retrato emoldurado, nome, clã e onde o personagem está.
export function cabecalhoPersonagem(p) {
  const f = p.ficha || {};
  const c = v5.cla(f.cla);
  const retrato = typeof p.retrato === 'string' && /^https:\/\//.test(p.retrato) ? p.retrato : RETRATO_PADRAO;
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

export function resumoFicha(f, { tecnica = false, semCabeca = false } = {}) {
  if (!f?.cla) return '<p class="nota">A ficha ainda está no começo.</p>';
  const calc = v5.calcular(f);
  const c = v5.cla(f.cla);
  const pr = v5.predador(f.predador?.id);

  const atributos = Object.entries(v5.GRUPOS).map(([g, nome]) => `
    <div>
      <span class="grupo-rotulo">${nome}</span>
      <ul class="lista-palavras compacta">
        ${v5.ATRIBUTOS.filter((a) => a.grupo === g).map((a) => `<li><span>${a.nome}</span>${nivelOuPalavra('atributo', calc.atributos[a.id], tecnica)}</li>`).join('')}
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
        <span>${d.nome}</span>${nivelOuPalavra('disciplina', n, tecnica)}
        <small>${poderes.map((pw) => pw.nome).join(' · ') || 'Nenhum poder escolhido'}</small>
      </li>`;
  }).join('');

  const marcas = (lista, catalogo) => lista
    .filter((x) => x.nivel > 0)
    .map((x) => `<li><span>${nomeItem(catalogo, x.id)}${x.nota ? ` <small class="inline">(${esc(x.nota)})</small>` : ''}</span>${pontos(x.nivel, x.nivel)}</li>`)
    .join('');

  const sangueFraco = c?.sangueFraco
    ? `${(f.meritosSangueFraco || []).map((id) => `<li><span>${nomeItem(v5.MERITOS_SANGUE_FRACO, id)}</span><small>mérito</small></li>`).join('')}
       ${(f.defeitosSangueFraco || []).map((id) => `<li><span>${nomeItem(v5.DEFEITOS_SANGUE_FRACO, id)}</span><small>defeito</small></li>`).join('')}`
    : '';

  const conviccoes = (f.conviccoes || []).filter((x) => x?.texto?.trim()).map((x) => `
    <li><span>${esc(x.texto)}</span><small>${esc(x.touchstone?.nome || '')}${x.touchstone?.relacao ? `, ${esc(x.touchstone.relacao)}` : ''}</small></li>`).join('');

  return `
    <div class="ficha">
      <div class="ficha-cabeca" ${semCabeca ? 'hidden' : ''}>
        <div>
          <span class="grupo-rotulo">${esc(c?.nome || '')}${pr ? ` · ${esc(pr.nome)}` : ''}</span>
          <h2>${esc(f.nome || f.origem?.nomeEmVida || 'Sem nome')}</h2>
          <p>${esc(f.origem?.conceito || '')}</p>
          ${f.origem?.bairro ? `<p class="nota">Vivia em ${esc(f.origem.bairro)}${f.origem?.abraco ? `; Abraçado ${esc(f.origem.abraco)}` : ''}.</p>` : ''}
        </div>
      </div>
      <div class="ficha-secao"><h3>Atributos</h3><div class="tres-colunas">${atributos}</div></div>
      <div class="ficha-secao">
        <h3>Habilidades</h3>
        <ul class="lista-palavras compacta duas">
          ${treinadas.map((h) => `<li><span>${h.nome}${espDe(h.id).length ? ` <small class="inline">(${espDe(h.id).join(', ')})</small>` : ''}</span>${nivelOuPalavra('habilidade', calc.habilidades[h.id], tecnica)}</li>`).join('') || '<li class="nota">Nenhuma ainda.</li>'}
        </ul>
      </div>
      <div class="ficha-secao"><h3>Disciplinas</h3><ul class="lista-palavras">${disciplinas || '<li class="nota">Nenhuma ainda.</li>'}</ul></div>
      <div class="ficha-secao duas-colunas">
        <div><h3>Vantagens</h3><ul class="lista-palavras compacta">${marcas(calc.vantagens, v5.VANTAGENS) || '<li class="nota">Nenhuma.</li>'}${sangueFraco}</ul></div>
        <div><h3>Defeitos</h3><ul class="lista-palavras compacta">${marcas(calc.defeitos, v5.DEFEITOS) || '<li class="nota">Nenhum.</li>'}</ul></div>
      </div>
      <div class="ficha-secao">
        <h3>O que te prende à humanidade</h3>
        <ul class="lista-palavras">${conviccoes || '<li class="nota">Nenhuma convicção ainda.</li>'}</ul>
        ${f.ambicao ? `<p><b>Ambição.</b> ${esc(f.ambicao)}</p>` : ''}
        ${f.desejo ? `<p><b>Desejo.</b> ${esc(f.desejo)}</p>` : ''}
        <p><b>Humanidade.</b> ${v5.textoHumanidade(calc.humanidade)}${tecnica ? ` (${calc.humanidade})` : ''}</p>
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
    raiz.innerHTML = `
      <section>
        <div class="linha-titulo">
          <p class="sobretitulo">Ficha</p>
          <label class="interruptor"><input type="checkbox" id="tecnica" ${tecnica ? 'checked' : ''}> Ficha técnica</label>
        </div>
        ${cabecalhoPersonagem(p)}
        ${painelEstado(p.estado, { tecnica })}
        ${resumoFicha(p.ficha, { tecnica, semCabeca: true })}
      </section>`;
    raiz.querySelector('#tecnica').onchange = (e) => { tecnica = e.target.checked; gravarTecnica(tecnica); desenhar(); };
  };
  desenhar();
}
