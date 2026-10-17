// Diário: todas as noites já narradas (parte pública e a sua parte), do fim para o começo.
import * as banco from './banco.js';
import { esc, narracao, narracaoComPaineis, dataCurta } from './ui.js';
import { imagemDoLocal, LOCAIS } from './cidade.js';
import { registroDaNoite } from './jogo/registro.js';
import { descobertas } from './jogo/detalhes.js';

// "Esta noite": o que o jogador fez na noite aberta (bairros, detalhes, vozes ouvidas, plano até agora).
function htmlEstaNoite(noite, plano) {
  if (!noite) return '';
  const r = registroDaNoite(noite.id);
  const nome = (id) => LOCAIS.find((l) => l.id === id)?.nome || id;
  const vistosEm = (id) => {
    const todos = descobertas(id, noite.numero).detalhes;
    let n = 0;
    try { n = todos.filter((d) => localStorage.getItem(`mascara.visto.${id}.${d.id}`) === '1').length; } catch { /* sem armazenamento */ }
    return `${n} de ${todos.length}`;
  };
  const curtas = [plano?.curta_1, plano?.curta_2].filter((x) => x?.trim());
  return `
    <article class="narracao entrada-diario esta-noite">
      <p class="sobretitulo">Esta noite · Noite ${noite.numero}</p>
      <h3>Seu plano até agora</h3>
      <ul class="lista-palavras">
        <li><span>Ação principal</span><b>${plano?.principal?.trim() ? esc(plano.principal) : 'falta escolher'}</b></li>
        <li><span>Caçada</span><b>${plano?.nao_cacar ? 'não vai caçar' : plano?.cacada?.trim() ? esc(plano.cacada) : 'falta decidir'}</b></li>
        <li><span>Ações curtas</span><b>${curtas.length ? curtas.map(esc).join(' · ') : 'nenhuma'}</b></li>
      </ul>
      <h3>Por onde você andou</h3>
      ${r.visitados.length ? `<ul class="lista-palavras">${r.visitados.map((id) => `<li><span>${esc(nome(id))}</span><b>descobertas: ${vistosEm(id)} esta noite</b></li>`).join('')}</ul>` : '<p class="nota">Nenhum bairro ainda.</p>'}
      <h3>O que você examinou</h3>
      ${r.detalhes.length ? r.detalhes.map((d) => `<p class="nota">${esc(nome(d.lugar))} · ${esc(d.rotulo)}</p><div class="texto-narracao">${narracao(`[${d.voz}] ${d.texto}`)}</div>`).join('') : '<p class="nota">Nada ainda. Os pontos com ? na cena são detalhes para examinar.</p>'}
      <h3>O que as vozes disseram</h3>
      ${r.comentarios.length ? `<div class="texto-narracao">${narracao(r.comentarios.map((c) => `[${c.voz}] ${c.texto}`).join('\n\n'))}</div>` : '<p class="nota">Nenhuma voz falou ainda. Ande pela cena.</p>'}
    </article>`;
}

export async function telaDiario(raiz, p, { noite = null, plano = null } = {}) {
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
      ${htmlEstaNoite(noite, plano)}
      ${noites || '<div class="cartao discreto"><p>Nenhuma noite narrada ainda.</p></div>'}
      ${preludio ? `<article class="narracao entrada-diario"><p class="sobretitulo">Prelúdio</p>${narracaoComPaineis(preludio.texto, preludio.paineis, { cenario, classe: 'privada' })}</article>` : ''}
    </section>`;
}
