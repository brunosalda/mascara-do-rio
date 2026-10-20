// Confronto por turnos (etapa C). A cada turno você escolhe: atacar, intimidar, usar uma disciplina que
// tenha ou fugir. Os dados rolam dos dois lados (paradas da V5, com a Fome), o dano tira Vitalidade, e a
// tela mostra o golpe com tremor, pausa de impacto e som. Acaba quando um dos dois cai, quando ele se rende
// ou quando você foge. "Deixar os dados decidirem" resolve tudo numa rolagem.
//
// As regras de um turno estão em turnoDoConfronto (a demonstração usa direto, com os dados do motor). Na
// temporada, quem rola é o banco (caso_confronto, a mesma conta em PL/pgSQL), e a tela só mostra.
import { som } from '../ambiente.js';
import { esc } from '../ui.js';

const NOMES = {
  forca: 'Força', destreza: 'Destreza', manipulacao: 'Manipulação', briga: 'Briga', atletismo: 'Atletismo', intimidacao: 'Intimidação',
};
export const DISCIPLINAS_DO_CONFRONTO = {
  potencia: { nome: 'Potência', efeito: 'golpe mais forte' },
  rapidez: { nome: 'Rapidez', efeito: 'dois golpes' },
  fortitude: { nome: 'Fortitude', efeito: 'aguenta o golpe dele' },
};
export const parada = (calc, [a, h]) => Math.max(1, (calc.atributos?.[a] || 0) + (calc.habilidades?.[h] || 0));
export const vitalidadeDe = (calc) => (calc.atributos?.vigor || 2) + 3;
// Sem números na tela (como no resto do jogo): o dano e a Vitalidade em palavras. O banco usa as mesmas.
export const danoEmPalavras = (d) => (d >= 3 ? 'golpe forte' : d === 2 ? 'golpe firme' : 'de raspão');
export const estadoEmPalavras = (v, max) => (v <= 0 ? 'caído' : v * 3 <= max ? 'mal se aguenta de pé' : v * 3 <= max * 2 ? 'ferido' : 'inteiro');
// O ataque usa a melhor parada de luta: Força + Briga ou Destreza + Armas brancas (o banco faz igual).
export const POOLS_DE_LUTA = [['forca', 'briga'], ['destreza', 'armas-brancas']];
export function ataqueDe(calc) {
  const [a, b] = POOLS_DE_LUTA;
  return parada(calc, b) > parada(calc, a) ? b : a;
}

// As escolhas que o personagem tem: as disciplinas físicas que conhece e a ordem da Dominação.
export function escolhasDo(calc, temCompelir) {
  const lista = [
    { id: 'atacar', rotulo: 'Atacar', sub: 'no braço ou na lâmina, o que você faz melhor' },
    { id: 'intimidar', rotulo: 'Intimidar', sub: 'no olhar e na voz: ele pode se render' },
  ];
  for (const [id, d] of Object.entries(DISCIPLINAS_DO_CONFRONTO)) {
    if ((calc.disciplinas?.[id] || 0) > 0) lista.push({ id: `disciplina:${id}`, rotulo: d.nome, sub: `${d.efeito} · usa o sangue`, sangue: true });
  }
  if (temCompelir) lista.push({ id: 'disciplina:dominacao', rotulo: '“Pare!” (Dominação)', sub: 'ele obedece · usa o sangue', sangue: true });
  lista.push({ id: 'fugir', rotulo: 'Recuar e deixar ele ir', sub: 'ele escapa' });
  return lista;
}

// Um turno. e: { vitJ, vitT, turno, hesita, fome, fim }; op: { ataque, defesa, vontade, vitalidade };
// rolar(parada, fome) devolve o resultado do motor (sucessos, critico, dadosFome...); despertar() → true se
// a Fome sobe. Devolve o estado novo e o registro do turno.
export function turnoDoConfronto(e0, escolha, { calc, op, maxTurnos = 8, rolar, despertar }) {
  const e = { ...e0, turno: e0.turno + 1 };
  const log = [];
  if (escolha === 'fugir') { e.fim = 'perdeu'; log.push({ quem: 'voce', texto: 'Você recua. Ele aproveita e some.' }); return { e, log }; }
  let acao = escolha;
  let bonus = 0;
  let ataques = 1;
  let aguenta = 0;
  if (escolha.startsWith('disciplina:')) {
    const d = escolha.slice(11);
    const nivel = calc.disciplinas?.[d] || 1;
    const sobe = despertar();
    if (sobe) e.fome = Math.min(5, e.fome + 1);
    log.push({ quem: 'voce', sangue: d, texto: sobe ? 'O sangue desperta, e a Fome sobe.' : 'O sangue responde sem cobrar nada.' });
    if (d === 'dominacao') { e.fim = 'venceu'; log.push({ quem: 'voce', texto: 'Você olha nos olhos dele e manda parar. Ele para.' }); return { e, log }; }
    acao = 'atacar';
    if (d === 'potencia') bonus = nivel;
    if (d === 'rapidez') ataques = 2;
    if (d === 'fortitude') aguenta = nivel;
  }
  if (acao === 'atacar') {
    for (let k = 0; k < ataques && e.vitT > 0; k++) {
      const rJ = rolar(parada(calc, ataqueDe(calc)) + bonus, e.fome);
      const rT = rolar(op.defesa, 0);
      const margem = rJ.sucessos - rT.sucessos;
      if (margem <= 0 && rJ.dadosFome?.includes(1)) {
        e.fome = Math.min(5, e.fome + 1);
        log.push({ quem: 'voce', res: rJ, contra: rT, besta: true, texto: 'A Besta toma conta: você golpeia o ar, e a Fome sobe.' });
        break;
      }
      const dano = margem > 0 ? margem + (rJ.critico ? 1 : 0) : 0;
      e.vitT = Math.max(0, e.vitT - dano);
      log.push({ quem: 'voce', res: rJ, contra: rT, dano, texto: dano ? `Você acerta: ${danoEmPalavras(dano)}.` : 'Ele se esquiva.' });
    }
  } else if (acao === 'intimidar') {
    const rJ = rolar(parada(calc, ['manipulacao', 'intimidacao']), e.fome);
    const rT = rolar(op.vontade, 0);
    const margem = rJ.sucessos - rT.sucessos;
    if (margem >= 2) { e.fim = 'venceu'; log.push({ quem: 'voce', res: rJ, contra: rT, texto: 'Ele baixa os braços. Desistiu.' }); return { e, log }; }
    if (margem === 1) { e.hesita = true; log.push({ quem: 'voce', res: rJ, contra: rT, texto: 'Ele hesita: não vai atacar agora.' }); } else log.push({ quem: 'voce', res: rJ, contra: rT, texto: 'Ele ri de você.' });
  }
  if (e.vitT <= 0) { e.fim = 'venceu'; log.push({ quem: 'ele', texto: 'Ele cai de joelhos e não tenta mais levantar.' }); return { e, log }; }
  if (e.hesita && acao !== 'intimidar') e.hesita = false;
  else if (!e.hesita) {
    const rT = rolar(op.ataque, 0);
    const rJ = rolar(parada(calc, ['destreza', 'atletismo']), e.fome);
    const margem = rT.sucessos - rJ.sucessos;
    const dano = Math.max(0, (margem > 0 ? margem : 0) - aguenta);
    e.vitJ = Math.max(0, e.vitJ - dano);
    log.push({ quem: 'ele', res: rT, contra: rJ, dano, texto: dano ? `Ele acerta você: ${danoEmPalavras(dano)}.` : margem > 0 ? 'O golpe dele bate, mas você aguenta.' : 'Você se esquiva.' });
  }
  if (e.vitJ <= 0) { e.fim = 'perdeu'; log.push({ quem: 'voce', texto: 'Você cai. Quando levanta, ele já foi.' }); }
  else if (e.turno >= maxTurnos) { e.fim = 'perdeu'; log.push({ quem: 'ele', texto: 'Ele aproveita uma brecha e foge.' }); }
  return { e, log };
}

// A tela do confronto. jogarTurno(escolha) → Promise<{ e, log }> (na demonstração, a função acima; na
// temporada, o banco). aoFim('venceu' | 'perdeu' | 'dados'). estado: o começo (vitJ, vitT...).
// retratos: { voce, ele } (imagens dos rostos, opcionais).
export function abrirConfronto({ tela, palco, nome, estado, escolhas, jogarTurno, aoFim, retratos = {} }) {
  let e = estado;
  let ocupado = false;
  document.body.classList.add('em-perseguicao', 'em-confronto');
  const el = document.createElement('section');
  el.className = 'confronto';
  el.setAttribute('aria-label', `Confronto com ${nome}`);
  el.innerHTML = `
    <header class="confronto-cabeca"><b>${esc(nome)} parte para cima de você!</b><small>Escolha o que fazer a cada turno.</small></header>
    <div class="confronto-barras">
      <div class="confronto-lado voce">${retratos.voce ? `<img class="confronto-rosto" src="${esc(retratos.voce)}" alt="">` : ''}<span>Você</span><span class="vit"><i></i></span><small></small></div>
      <div class="confronto-lado ele">${retratos.ele ? `<img class="confronto-rosto" src="${esc(retratos.ele)}" alt="">` : ''}<span>${esc(nome)}</span><span class="vit"><i></i></span><small></small></div>
    </div>
    <ol class="confronto-log" aria-live="polite"></ol>
    <div class="confronto-escolhas">${escolhas.map((x) => `<button type="button" class="btn-secundario${x.sangue ? ' de-sangue' : ''}" data-escolha="${esc(x.id)}">${esc(x.rotulo)}<small>${esc(x.sub)}</small></button>`).join('')}
      <button type="button" class="btn-texto" data-escolha="dados">Deixar os dados decidirem</button></div>`;
  tela.appendChild(el);
  const logEl = el.querySelector('.confronto-log');
  const elCena = palco.querySelector('.cena');

  function barras() {
    const [vj, vt] = el.querySelectorAll('.vit i');
    vj.style.transform = `scaleX(${(e.vitJ / e.vitJMax).toFixed(3)})`;
    vt.style.transform = `scaleX(${(e.vitT / e.vitTMax).toFixed(3)})`;
    const [sj, st] = el.querySelectorAll('.confronto-lado small');
    sj.textContent = estadoEmPalavras(e.vitJ, e.vitJMax);
    st.textContent = estadoEmPalavras(e.vitT, e.vitTMax);
  }
  barras();
  // Os dados à vista como desenho (as faces), sem a conta de sucessos.
  const dados = (r) => (r ? `<span class="confronto-dados">${[...(r.normais || []), ...(r.dadosFome || []).map((d) => `<em>${d}</em>`)].join(' ')}</span>` : '');
  // A cerimônia de um golpe: tremor, uma pausa de impacto e o número do dano subindo.
  function golpe(lado, dano) {
    som.reacao?.('impacto', lado === 'ele' ? 0.5 : -0.5);
    elCena?.classList.remove('tremor');
    void elCena?.offsetWidth;
    elCena?.classList.add('tremor');
    const n = document.createElement('span');
    n.className = `confronto-dano ${lado}`;
    n.textContent = danoEmPalavras(dano);
    el.querySelector(`.confronto-lado.${lado} .vit`).appendChild(n);
    // Quem apanha pisca em vermelho (o rosto e o lado da barra).
    const ladoEl = el.querySelector(`.confronto-lado.${lado}`);
    ladoEl.classList.remove('apanhou');
    void ladoEl.offsetWidth;
    ladoEl.classList.add('apanhou');
    setTimeout(() => n.remove(), 900);
  }
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  async function escolher(escolha) {
    if (ocupado || e.fim) return;
    if (escolha === 'dados') { fechar(); aoFim('dados'); return; }
    ocupado = true;
    el.classList.add('rolando');
    let r;
    try { r = await jogarTurno(escolha); } catch { r = null; }
    el.classList.remove('rolando');
    if (!r) { ocupado = false; return; }
    // Uma linha por troca: o que você fez e o que ele fez, com os dados de cada um.
    const li = document.createElement('li');
    li.className = r.log.some((x) => x.besta) ? 'besta' : '';
    logEl.appendChild(li);
    for (const linha of r.log) {
      li.insertAdjacentHTML('beforeend', `<span class="de-${linha.quem}">${esc(linha.texto)} ${linha.res ? dados(linha.res) : ''}</span> `);
      logEl.scrollTop = logEl.scrollHeight;
      if (linha.dano) {
        await espera(120);
        golpe(linha.quem === 'voce' ? 'ele' : 'voce', linha.dano);
      }
      await espera(420);
    }
    e = r.e;
    barras();
    ocupado = false;
    if (e.fim) { await espera(700); fechar(); aoFim(e.fim); }
  }
  el.addEventListener('click', (ev) => { const b = ev.target.closest('[data-escolha]'); if (b) escolher(b.dataset.escolha); });
  function fechar() {
    el.remove();
    elCena?.classList.remove('tremor');
    document.body.classList.remove('em-perseguicao', 'em-confronto');
  }
  return fechar;
}
