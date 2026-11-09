// Subsolo: a luta na tela. As regras ficam em luta.js; aqui só se pergunta a ordem e se mostra o que aconteceu.
import { agir, comecarLuta, encerrarLuta, inimigosAgem, opcoes, ordemRepetida, podeRecuar, recuar, RODADAS, vezAtual } from './luta.js';

const FALA_RESULTADO = {
  critico: 'Crítico.',
  'critico-sangrento': 'Crítico sujo: a Besta aparece.',
  'falha-bestial': 'Falha bestial.',
  'falha-total': 'Erra feio.',
  falha: 'Erra.',
  sucesso: '',
};

const ENTRADA = {
  costas: 'Você pega o vigia pelas costas: 4 de dano antes de tudo. Dois saem da sombra.',
  frente: 'Você topa com o vigia. Dois saem da sombra.',
  alcancado: 'O vigia pega o grupo desprevenido: 1 dado a menos nesta rodada. Dois saem da sombra.',
};

export function pintarGrupo(raiz, grupo, amea = {}, vezId = null) {
  const caixa = raiz.querySelector('.ss-grupo');
  grupo.forEach((v, i) => {
    const c = caixa.querySelector(`[data-id="${v.id}"]`);
    caixa.appendChild(c);
    c.classList.toggle('torpor', v.torpor);
    c.classList.toggle('na-vez', v.id === vezId);
    c.querySelector('small').textContent = v.torpor ? 'Em torpor' : i < 2 ? 'Frente' : 'Atrás';
    c.querySelector('.b-vit').style.width = `${Math.max(0, 100 * (1 - (v.sup + v.agr) / v.vit))}%`;
    c.querySelector('.b-fv').style.width = `${100 * (v.fv / v.fvMax)}%`;
    c.querySelector('.b-fome').style.width = `${100 * (v.fome / 5)}%`;
    const a = c.querySelector('.ss-ameaca');
    a.hidden = !amea[i];
    a.textContent = amea[i] ? `−${amea[i]}` : '';
  });
}

export async function conduzirLuta({ raiz, partida, contato, api, som }) {
  const ordens = raiz.querySelector('.ss-ordens');
  const intencoes = raiz.querySelector('.ss-intencoes');
  const dados = raiz.querySelector('.ss-dados');
  const fala = raiz.querySelector('.ss-fala');
  const titulo = () => `Rodada ${l.rodada} de ${RODADAS}`;

  // Tocar na vista pula a animação em curso.
  let pular = null;
  const aoTocar = () => { pular?.(); };
  raiz.querySelector('.ss-vista').addEventListener('pointerdown', aoTocar);
  const esperar = (ms) => new Promise((r) => {
    const t = setTimeout(() => { pular = null; r(); }, ms);
    pular = () => { clearTimeout(t); pular = null; r(); };
  });

  const inicio = performance.now();
  const l = comecarLuta(partida, contato);
  window.__subsolo.luta = l;
  raiz.classList.add('em-luta');
  ordens.hidden = false;
  intencoes.hidden = false;
  api.girar(partida.dir);
  fala.textContent = ENTRADA[contato.como];
  fala.hidden = false;

  function pintar() {
    const amea = {};
    for (const e of l.inimigos) if (e.intencao.casa !== undefined) amea[e.intencao.casa] = (amea[e.intencao.casa] ?? 0) + e.intencao.dano;
    pintarGrupo(raiz, partida.grupo, amea, vezAtual(l)?.id ?? null);
    const nomeDe = (i) => partida.grupo[i.casa]?.nome;
    const texto = (e) => {
      const i = e.intencao;
      if (i.tipo === 'ataca') return `ataca ${nomeDe(i)}: ${i.dano}`;
      if (i.tipo === 'atira') return `atira em ${nomeDe(i)}: ${i.dano}`;
      return i.tipo === 'anda' ? 'avança' : 'espera a vez';
    };
    intencoes.innerHTML = `<li class="ss-rodada">${titulo()}</li>${l.inimigos.map((e) => `<li><b>${e.nome}</b> <span class="vida">${e.vit}/${e.max}</span><br>${texto(e)}</li>`).join('')}`;
    api.redesenhar();
  }

  function pedirOrdem(v) {
    return new Promise((resolver) => {
      const lista = opcoes(l, v);
      lista.push({ acao: 'recuar', rotulo: 'Recuar', ok: podeRecuar(l), detalhe: 'gasta a rodada do grupo' });
      lista.push({ acao: 'repetir', rotulo: 'Repetir', ok: l.rodada > 1, detalhe: 'as ordens da rodada anterior' });
      ordens.innerHTML = `<h3>${v.nome} age</h3>${lista.map((o, i) => `<button type="button" data-o="${o.acao}" ${o.ok ? '' : 'disabled'}><b>${o.rotulo}</b><small>${o.detalhe}</small><kbd>${i + 1}</kbd></button>`).join('')}`;
      const fechar = (acao) => {
        window.removeEventListener('keydown', aoTeclar);
        ordens.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        resolver(acao);
      };
      const aoTeclar = (e) => {
        const o = lista[Number(e.key) - 1];
        if (o?.ok) fechar(o.acao);
      };
      window.addEventListener('keydown', aoTeclar);
      ordens.querySelectorAll('button:not([disabled])').forEach((b) => {
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); fechar(b.dataset.o); });
      });
    });
  }

  async function mostrarDados(r, rapido) {
    const giro = rapido ? 120 : 320;
    const fim = performance.now() + giro;
    const total = r.normais.length + r.dadosFome.length;
    dados.hidden = false;
    const desenho = (valores) => {
      dados.innerHTML = valores.map((n, i) => `<span class="${i >= r.normais.length ? 'fome' : ''} ${n >= 6 ? 'ok' : ''}">${n}</span>`).join('');
    };
    while (performance.now() < fim) {
      desenho(Array.from({ length: total }, () => 1 + Math.floor(Math.random() * 10)));
      await esperar(50);
      if (!pular && performance.now() >= fim) break;
    }
    desenho([...r.normais, ...r.dadosFome]);
    await esperar(rapido ? 110 : 240);
    dados.hidden = true;
  }

  async function executar(acao, rapido) {
    const antes = [...partida.inimigos];
    const ev = agir(l, acao);
    const depois = partida.inimigos;
    partida.inimigos = antes; // quem cai só some depois dos dados
    if (ev.rolagem) {
      await mostrarDados(ev.rolagem, rapido);
      if (ev.acertos.length) {
        await esperar(70); // o quadro para um instante no golpe
        api.golpe();
        som.golpe();
      }
    }
    partida.inimigos = depois;
    const partes = [];
    if (acao === 'defender') partes.push('Fica em guarda.');
    if (acao === 'trocar') partes.push('Troca de lugar.');
    if (acao === 'poder' && !ev.rolagem) partes.push('Lê os golpes: todos com +2 dados.');
    if (ev.rolagem) {
      if (ev.acertos.length) partes.push(ev.acertos.map((a) => `${a.nome} leva ${a.dano}${a.morreu ? ' e cai' : ''}.`).join(' '));
      partes.push(FALA_RESULTADO[ev.rolagem.resultado] ?? '');
    }
    if (ev.fomeSubiu) partes.push('A Fome sobe.');
    if (ev.besta) partes.push(ev.besta);
    fala.textContent = `${ev.nome}: ${partes.filter(Boolean).join(' ')}`;
    pintar();
    await esperar(rapido ? 160 : 420);
  }

  async function mostrarInimigos(eventos) {
    for (const ev of eventos) {
      if (ev.tipo === 'anda') {
        if (ev.movimentos.length) { api.animarInimigos(ev.movimentos); await esperar(230); }
      } else {
        fala.textContent = ev.acertou
          ? `${ev.inimigo} ${ev.atira ? 'atira em' : 'acerta'} ${ev.alvo}: ${ev.dano} de dano.${ev.torpor ? ` ${ev.alvo} cai em torpor.` : ''}`
          : `${ev.inimigo} erra ${ev.alvo}.`;
        if (ev.acertou) som.ferido();
        const c = raiz.querySelector(`.ss-vampiro[data-nome="${ev.alvo}"]`);
        c?.classList.add('atingido');
        pintarGrupo(raiz, partida.grupo);
        await esperar(420);
        c?.classList.remove('atingido');
      }
    }
  }

  await esperar(800);
  while (!l.fim) {
    pintar();
    const v = vezAtual(l);
    if (!v) {
      ordens.innerHTML = '<h3>A vez deles</h3>';
      await mostrarInimigos(inimigosAgem(l));
      continue;
    }
    const escolha = await pedirOrdem(v);
    if (escolha === 'recuar') {
      const ev = recuar(l);
      api.recuar(ev.flatMap((x) => x.movimentos ?? []));
      fala.textContent = 'O grupo recua uma casa.';
      await esperar(260);
      await mostrarInimigos(ev.filter((x) => x.tipo !== 'anda'));
    } else if (escolha === 'repetir') {
      while (!l.fim && vezAtual(l)) await executar(ordemRepetida(l, vezAtual(l)), true);
    } else {
      await executar(escolha, false);
    }
  }

  encerrarLuta(l);
  window.__subsolo.medidas.lutas.push({ fim: l.fim, rodadas: l.rodada, segundos: Math.round((performance.now() - inicio) / 1000) });
  raiz.classList.remove('em-luta');
  raiz.querySelector('.ss-vista').removeEventListener('pointerdown', aoTocar);
  ordens.hidden = true;
  intencoes.hidden = true;
  dados.hidden = true;
  fala.hidden = true;
  pintarGrupo(raiz, partida.grupo);
  api.forcar();
  return {
    vitoria: 'O grupo venceu. Quem está de pé segue em frente.',
    fugiram: 'O sol aperta e os que restaram fogem pelas galerias. O grupo segue, sem vencer.',
    derrota: 'Os 4 caíram. Os homens da Xerife tiram o grupo de lá: você volta ao começo e perde 1 hora da noite.',
  }[l.fim];
}
