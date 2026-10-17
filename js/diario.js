// Diário: todas as noites já narradas (parte pública e a sua parte), do fim para o começo.
import * as banco from './banco.js';
import { esc, narracaoComPaineis, dataCurta } from './ui.js';
import { imagemDoLocal } from './cidade.js';

export async function telaDiario(raiz, p) {
  raiz.innerHTML = '<p class="carregando">Abrindo o diário…</p>';
  const [narracoes, resolvidas] = await Promise.all([banco.narracoesDoPersonagem(p.id), banco.noitesResolvidas()]);
  const minhas = new Map(narracoes.filter((n) => n.tipo === 'noite').map((n) => [n.noite_id, n]));
  const preludio = narracoes.find((n) => n.tipo === 'preludio');
  const cenario = imagemDoLocal(p.estado?.local);

  const noites = resolvidas.map((n) => {
    const minha = minhas.get(n.id);
    return `
      <article class="narracao entrada-diario">
        <p class="sobretitulo">Noite ${n.numero}${n.resolvida_em ? ` · ${dataCurta(n.resolvida_em)}` : ''}</p>
        ${n.narracao_publica || n.paineis?.length ? `<h3>Nas ruas do Rio</h3>${narracaoComPaineis(n.narracao_publica, n.paineis, { cenario })}` : ''}
        ${minha ? `<h3>Só você sabe</h3>${narracaoComPaineis(minha.texto, minha.paineis, { cenario, classe: 'privada' })}` : ''}
      </article>`;
  }).join('');

  raiz.innerHTML = `
    <section>
      <p class="sobretitulo">Diário de ${esc(p.nome)}</p>
      ${noites || '<div class="cartao discreto"><p>Nenhuma noite narrada ainda.</p></div>'}
      ${preludio ? `<article class="narracao entrada-diario"><p class="sobretitulo">Prelúdio</p>${narracaoComPaineis(preludio.texto, preludio.paineis, { cenario, classe: 'privada' })}</article>` : ''}
    </section>`;
}
