// Formato v3, etapa B: a temporada de quem fez login. Lista as temporadas que o jogador vê, os capítulos
// liberados (a regra é do banco: o 1º para todos, os outros depois de resolver o anterior) e o ranking de
// proficiência. Cada capítulo abre em #/temporada/<capítulo>, jogado pelo banco (fonte-banco.js).
import { sb } from '../banco.js';
import { ranking } from './fonte-banco.js';
import { esc } from '../ui.js';

const SELOS = { 'sem-erros': 'sem erros', 'sem-dicas': 'sem dicas', detetive: 'detetive', primeiro: 'primeiro a resolver', 'mais-rapido': 'mais rápido' };

export async function telaTemporada(raiz, estadoApp) {
  document.body.dataset.tela = 'pagina';
  raiz.innerHTML = '<div class="cartao"><p>Carregando a temporada…</p></div>';
  const p = estadoApp?.atual;
  const [{ data: temporadas, error: e1 }, { data: capitulos, error: e2 }, { data: progresso }] = await Promise.all([
    sb.from('temporadas').select('id, titulo, situacao, abre_em, fecha_em').order('criado_em'),
    sb.from('capitulos').select('id, temporada_id, ordem, titulo, pergunta').order('ordem'),
    p ? sb.from('progresso').select('capitulo_id, resolvido_em, nota, selos, acusacoes_erradas').eq('personagem_id', p.id) : Promise.resolve({ data: [] }),
  ]);
  if (e1 || e2) {
    raiz.innerHTML = `<div class="cartao erro"><p>Não deu para abrir a temporada agora.</p><button class="btn" onclick="location.reload()">Tentar de novo</button></div>`;
    return;
  }
  if (!temporadas?.length) {
    raiz.innerHTML = '<div class="cartao"><h2>Temporada</h2><p>Nenhuma temporada aberta ainda. Quando abrir, os capítulos aparecem aqui.</p><a class="btn" href="#/">Voltar</a></div>';
    return;
  }
  const meu = Object.fromEntries((progresso || []).map((x) => [x.capitulo_id, x]));
  const blocos = await Promise.all(temporadas.map(async (t) => {
    const caps = (capitulos || []).filter((c) => c.temporada_id === t.id);
    const rk = await ranking(t.id).catch(() => null);
    const linhasCap = caps.map((c) => {
      const pr = meu[c.id];
      const situacao = pr?.resolvido_em ? `resolvido · ${pr.nota} pontos${pr.selos?.length ? ` · ${pr.selos.map((s) => SELOS[s] || s).join(', ')}` : ''}` : pr ? 'em andamento' : 'novo';
      return `<li><a class="btn${pr?.resolvido_em ? '' : ' destaque'}" href="#/temporada/${encodeURIComponent(c.id)}">Capítulo ${c.ordem}: ${esc(c.titulo)}</a><small>${esc(situacao)}</small><p class="nota">${esc(c.pergunta)}</p></li>`;
    }).join('');
    const linhasRk = (rk?.ranking || []).map((x, i) => `<li class="${x.voce ? 'voce' : ''}"><span class="placar-pos">${i + 1}º</span><b>${esc(x.nome)}</b><small>${x.media != null ? `média ${x.media}` : 'sem capítulo resolvido'} · ${x.resolvidos} ${x.resolvidos === 1 ? 'capítulo' : 'capítulos'}${x.erros ? ` · ${x.erros} ${x.erros > 1 ? 'erros' : 'erro'}` : ''}</small></li>`).join('');
    return `<section class="cartao temporada">
      <h2>${esc(t.titulo)}</h2>
      ${p?.status === 'ativo' ? '' : '<p class="nota">Para jogar, seu personagem precisa estar aprovado pelo Narrador.</p>'}
      <ol class="lista-capitulos">${linhasCap || '<li>Nenhum capítulo liberado ainda.</li>'}</ol>
      <section class="placar" aria-label="Ranking da temporada"><h3>Ranking ${rk?.temporada?.fechada ? 'final (soma das notas)' : 'da temporada (média das notas)'}</h3>
        <ol>${linhasRk || '<li>Ninguém jogou ainda.</li>'}</ol></section>
    </section>`;
  }));
  raiz.innerHTML = `<div class="pagina-temporada">${blocos.join('')}</div>`;
}
