// Quadro de pistas (formato v3): uma cortiça com as pistas presas em colunas (o crime e cada
// suspeito) e, no alto, a dedução: três lacunas que se completam com as palavras que as pistas
// liberaram. Acusar com as três escolhidas. Na demonstração, a resposta é conferida no navegador;
// no jogo de verdade, quem confere é o banco.
import { abrirJanela } from '../jogo/camadas.js';
import { FIGURAS_GENTE } from '../jogo/gente.js';
import { figuraLeve } from '../jogo/imagens.js';
import { esc } from '../ui.js';
import { som } from '../ambiente.js';

const ICONE_TIPO = {
  testemunho: ['❝', 'Testemunho'],
  fisica: ['✋', 'Prova física'],
  documento: ['▤', 'Documento'],
  comportamento: ['◐', 'Comportamento'],
  ausencia: ['○', 'Ausência'],
  sobrenatural: ['✶', 'Sobrenatural'],
  rumor: ['≈', 'Rumor'],
};

export function palavrasLiberadas(caso, achados) {
  const r = {};
  for (const l of caso.lacunas) r[l.id] = caso.palavras[l.id].filter((w) => w.por.some((id) => achados.has(id)));
  return r;
}

export function abrirQuadro(raiz, { caso, achados, novas = new Set(), escolhas = {}, erros = 0, custoErro = 60, aoMudar, aoAcusar }) {
  return abrirJanela(raiz, {
    titulo: 'Quadro de pistas',
    classe: 'janela-quadro',
    montar: (corpo, camada) => {
      const pistas = [...achados].filter((id) => caso.pistas[id] && !caso.pistas[id].marca);
      const liberadas = palavrasLiberadas(caso, achados);
      const sel = { ...escolhas };

      const figuraDe = (pessoaId) => {
        const pes = caso.pessoas[pessoaId];
        if (!pes) return '';
        const nomeFig = pes.figura || FIGURAS_GENTE[pes.tipo]?.[0];
        return nomeFig ? `<img src="${esc(figuraLeve(`img/gente/${nomeFig}.png`))}" alt="">` : '';
      };
      const cartao = (id) => {
        const p = caso.pistas[id];
        const [icone, tipo] = ICONE_TIPO[p.tipo] || ['•', 'Pista'];
        return `<li class="cartao-pista${novas.has(id) ? ' nova' : ''}" style="--giro:${(((id.length * 7) % 5) - 2) * 0.6}deg">
          <span class="tacha" aria-hidden="true"></span>
          <b><span class="pista-tipo" title="${esc(tipo)}" aria-label="${esc(tipo)}">${icone}</span> ${esc(p.titulo)}${novas.has(id) ? ' <small class="selo-nova">nova</small>' : ''}</b>
          <p>${esc(p.texto)}</p>
          <small class="pista-fonte">${esc(p.fonte)}</small>
        </li>`;
      };

      function desenhar(mensagem = '') {
        const completas = caso.lacunas.every((l) => sel[l.id]);
        corpo.innerHTML = `
          <section class="deducao" aria-label="Dedução">
            <p class="deducao-pergunta">${esc(caso.pergunta)}</p>
            <ol class="lacunas">
              ${caso.lacunas.map((l) => {
                const w = caso.palavras[l.id].find((x) => x.id === sel[l.id]);
                const n = liberadas[l.id].length;
                return `<li>
                  <span class="lacuna-rotulo">${esc(l.rotulo)}</span>
                  <button type="button" class="lacuna${w ? ' cheia' : ''}" data-lacuna="${l.id}" aria-expanded="false">${w ? esc(w.texto) : n ? 'escolher…' : '<em>nenhuma pista ainda</em>'}</button>
                  <div class="lacuna-opcoes" data-opcoes="${l.id}" hidden>
                    ${liberadas[l.id].map((x) => `<button type="button" data-palavra="${x.id}" data-de="${l.id}" class="${x.id === sel[l.id] ? 'escolhida' : ''}">${esc(x.texto)}</button>`).join('')}
                    <small class="nota">${n} de ${caso.palavras[l.id].length} opções descobertas. As outras aparecem com novas pistas.</small>
                  </div>
                </li>`;
              }).join('')}
            </ol>
            <div class="deducao-pe">
              <button type="button" class="btn${completas ? ' destaque' : ''}" data-acusar ${completas ? '' : 'disabled'}>Acusar diante da Xerife</button>
              <small class="nota">${erros ? `Acusações erradas: ${erros}. ` : ''}Errar custa ${custoErro / 60 === 1 ? '1 hora' : `${custoErro} minutos`} da noite.</small>
            </div>
            ${mensagem ? `<p class="deducao-msg" role="alert">${mensagem}</p>` : ''}
          </section>
          <section class="cortica" aria-label="Pistas encontradas">
            <p class="cortica-total">${pistas.length ? `${pistas.length} ${pistas.length === 1 ? 'pista' : 'pistas'}` : 'Nenhuma pista ainda. Converse, examine e volte aqui.'}</p>
            <div class="colunas-pistas">
              ${caso.colunas.map((c) => {
                const daqui = pistas.filter((id) => (caso.pistas[id].sobre || 'cena') === c.id);
                return `<div class="coluna-pistas">
                  <header>${c.pessoa ? `<span class="foto-suspeito">${figuraDe(c.pessoa)}</span>` : '<span class="foto-suspeito foto-crime" aria-hidden="true">✕</span>'}<b>${esc(c.nome)}</b><small>${daqui.length || ''}</small></header>
                  <ul>${daqui.length ? daqui.map(cartao).join('') : '<li class="vazio">Nada ainda.</li>'}</ul>
                </div>`;
              }).join('')}
            </div>
          </section>`;
      }
      desenhar();

      corpo.addEventListener('click', async (ev) => {
        const lac = ev.target.closest('[data-lacuna]');
        if (lac) {
          const caixa = corpo.querySelector(`[data-opcoes="${lac.dataset.lacuna}"]`);
          const abrir = caixa.hidden;
          corpo.querySelectorAll('.lacuna-opcoes').forEach((x) => { x.hidden = true; });
          corpo.querySelectorAll('[data-lacuna]').forEach((x) => x.setAttribute('aria-expanded', 'false'));
          if (abrir && caixa.querySelector('[data-palavra]')) { caixa.hidden = false; lac.setAttribute('aria-expanded', 'true'); caixa.querySelector('[data-palavra]').focus(); }
          return;
        }
        const pal = ev.target.closest('[data-palavra]');
        if (pal) {
          sel[pal.dataset.de] = pal.dataset.palavra;
          aoMudar?.({ ...sel });
          som.escolha?.();
          desenhar();
          return;
        }
        if (ev.target.closest('[data-acusar]')) {
          const r = await aoAcusar?.({ ...sel });
          if (!r) return;
          if (r.certo) { camada.fechar(); return; }
          erros = r.erros;
          desenhar(r.mensagem);
        }
      });
    },
  });
}
