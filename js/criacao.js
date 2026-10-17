// Assistente de criação de personagem, em etapas. Salva a ficha a cada avanço.
import * as v5 from './motor/v5.js';
import * as banco from './banco.js';
import { esc, aviso, on, pontos } from './ui.js';
import { recarregarPersonagens, ir } from './app.js';
import { resumoFicha } from './ficha.js';

const ROTULOS = {
  origem: 'Quem você era',
  cla: 'Clã',
  atributos: 'Atributos',
  habilidades: 'Habilidades',
  predador: 'Como você caça',
  disciplinas: 'Disciplinas',
  vantagens: 'Vantagens e defeitos',
  conviccoes: 'Convicções',
  final: 'Nome e revisão',
};

const QUANDO_ABRACO = ['há poucas semanas', 'há alguns meses', 'há um ou dois anos', 'há alguns anos'];

// --- Caminhos tipo "origem.nome" ou "conviccoes.0.texto" -----------------------

function ler(obj, caminho) {
  return caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function gravar(obj, caminho, valor) {
  const partes = caminho.split('.');
  let o = obj;
  partes.slice(0, -1).forEach((k, i) => {
    if (o[k] == null) o[k] = /^\d+$/.test(partes[i + 1]) ? [] : {};
    o = o[k];
  });
  o[partes.at(-1)] = valor;
}

function campo(ficha, caminho, rotulo, { tipo = 'input', placeholder = '', max = 200, dica = '' } = {}) {
  const valor = esc(ler(ficha, caminho) ?? '');
  const ctl = tipo === 'textarea'
    ? `<textarea data-campo="${caminho}" maxlength="${max}" rows="3" placeholder="${esc(placeholder)}">${valor}</textarea>`
    : `<input data-campo="${caminho}" maxlength="${max}" value="${valor}" placeholder="${esc(placeholder)}">`;
  return `<label>${rotulo}${dica ? `<span class="dica">${dica}</span>` : ''}${ctl}</label>`;
}

// --- Etapas ----------------------------------------------------------------------

function etapaOrigem(f) {
  const abraco = f.origem?.abraco || QUANDO_ABRACO[0];
  return `
    <p class="lead">Antes da morte, você era uma pessoa comum no Rio. Comece por ela: é dessa vida que vêm seus medos, laços e talentos.</p>
    ${campo(f, 'origem.nomeEmVida', 'Nome em vida', { max: 80 })}
    ${campo(f, 'origem.conceito', 'Quem você era, em uma frase', { tipo: 'textarea', max: 300, placeholder: 'Ex.: segurança de boate na Lapa que sonhava ser cantor de samba' })}
    <div class="duas-colunas">
      ${campo(f, 'origem.ocupacao', 'Ocupação', { max: 80 })}
      ${campo(f, 'origem.bairro', 'Bairro onde vivia', { max: 80, placeholder: 'Ex.: Madureira, Tijuca, Copacabana' })}
      ${campo(f, 'origem.idade', 'Idade aparente', { max: 10 })}
      <label>Quando foi Abraçado
        <select data-campo="origem.abraco">
          ${QUANDO_ABRACO.map((q) => `<option ${q === abraco ? 'selected' : ''}>${q}</option>`).join('')}
        </select>
      </label>
    </div>`;
}

function etapaCla(f) {
  return `
    <p class="lead">O clã é a linhagem do sangue de quem te Abraçou. Define seus dons (disciplinas), sua maldição (perdição) e o impulso que a Besta desperta (compulsão).</p>
    <div class="grade-opcoes">
      ${v5.CLAS.map((c) => {
        const discs = c.livre ? 'Qualquer disciplina' : c.disciplinas.map((d) => v5.DISCIPLINAS[d].nome).join(' · ');
        return `
          <button type="button" class="opcao ${f.cla === c.id ? 'escolhida' : ''}" data-cla="${c.id}" aria-pressed="${f.cla === c.id}">
            <span class="opcao-nome">${c.nome}</span>
            <span class="opcao-desc">${c.desc}</span>
            <span class="opcao-meta">${discs}</span>
            <span class="opcao-detalhe"><b>Perdição.</b> ${c.perdicao}</span>
            <span class="opcao-detalhe"><b>Compulsão.</b> ${c.compulsao}</span>
          </button>`;
      }).join('')}
    </div>`;
}

function chipsAtributos(f, papel) {
  const a = f.atributos || {};
  const fortes = a.fortes || [];
  return Object.entries(v5.GRUPOS).map(([g, nomeGrupo]) => `
    <div class="grupo-chips">
      <span class="grupo-rotulo">${nomeGrupo}</span>
      ${v5.ATRIBUTOS.filter((x) => x.grupo === g).map((x) => {
        let ativo = false;
        let bloqueado = false;
        if (papel === 'melhor') ativo = a.melhor === x.id;
        if (papel === 'forte') { ativo = fortes.includes(x.id); bloqueado = a.melhor === x.id; }
        if (papel === 'fraco') { ativo = a.fraco === x.id; bloqueado = a.melhor === x.id || fortes.includes(x.id); }
        return `<button type="button" class="chip ${ativo ? 'ativo' : ''}" data-atributo="${x.id}" data-papel="${papel}" ${bloqueado ? 'disabled' : ''} title="${esc(x.desc)}">${x.nome}</button>`;
      }).join('')}
    </div>`).join('');
}

function etapaAtributos(f) {
  const niveis = v5.niveisAtributos(f.atributos);
  return `
    <p class="lead">Seus atributos são o que você é por natureza: corpo, presença e mente.</p>
    <h3>Seu maior talento</h3>
    ${chipsAtributos(f, 'melhor')}
    <h3>Três pontos fortes</h3>
    ${chipsAtributos(f, 'forte')}
    <h3>Sua fraqueza</h3>
    ${chipsAtributos(f, 'fraco')}
    <h3>Como você fica</h3>
    <ul class="lista-palavras">
      ${v5.ATRIBUTOS.map((x) => `<li><span>${x.nome}</span><b class="nivel-${niveis[x.id]}">${v5.palavra('atributo', niveis[x.id])}</b><small>${x.desc}</small></li>`).join('')}
    </ul>`;
}

function etapaHabilidades(f) {
  const h = f.habilidades || {};
  const perfil = v5.PERFIS_HABILIDADE[h.perfil];
  const niveis = h.niveis || {};
  const usados = (nivel) => Object.values(niveis).filter((x) => x === nivel).length;
  let html = `
    <p class="lead">Habilidades são o que você aprendeu em vida (e depois dela). Primeiro, escolha seu perfil.</p>
    <div class="grade-opcoes tres">
      ${Object.entries(v5.PERFIS_HABILIDADE).map(([id, pf]) => `
        <button type="button" class="opcao ${h.perfil === id ? 'escolhida' : ''}" data-perfil="${id}" aria-pressed="${h.perfil === id}">
          <span class="opcao-nome">${pf.nome}</span>
          <span class="opcao-desc">${pf.desc}</span>
          <span class="opcao-meta">${pf.faixas.map((x) => `${x.qtd} ${v5.palavra('habilidade', x.nivel).toLowerCase()}`).join(' · ')}</span>
        </button>`).join('')}
    </div>`;
  if (!perfil) return html;
  html += `
    <div class="contadores">
      ${perfil.faixas.map((x) => `<span class="contador ${usados(x.nivel) === x.qtd ? 'cheio' : ''}">${v5.palavra('habilidade', x.nivel)}: ${usados(x.nivel)} de ${x.qtd}</span>`).join('')}
    </div>`;
  for (const [g, nomeGrupo] of Object.entries(v5.GRUPOS)) {
    html += `<h3>${nomeGrupo}</h3><ul class="lista-habilidades">`;
    for (const hab of v5.HABILIDADES.filter((x) => x.grupo === g)) {
      const atual = niveis[hab.id] | 0;
      html += `
        <li>
          <div><span>${hab.nome}</span><small>${hab.desc}</small></div>
          <select data-habilidade="${hab.id}" aria-label="${hab.nome}">
            <option value="0">Sem treino</option>
            ${perfil.faixas.map((x) => {
              const cheio = usados(x.nivel) >= x.qtd && atual !== x.nivel;
              return `<option value="${x.nivel}" ${atual === x.nivel ? 'selected' : ''} ${cheio ? 'disabled' : ''}>${v5.palavra('habilidade', x.nivel)}</option>`;
            }).join('')}
          </select>
        </li>`;
    }
    html += '</ul>';
  }
  const treinadas = v5.HABILIDADES.filter((x) => (niveis[x.id] | 0) > 0);
  const esp = h.especializacoes || [];
  const livre = esp.find((e) => e.origem === 'livre') || {};
  html += `
    <h3>Especializações</h3>
    <p class="nota">Uma especialização é um recorte em que você é ainda melhor: Manha na Lapa, Briga em roda de capoeira.</p>
    <div class="duas-colunas">
      <label>Especialização livre: em qual habilidade?
        <select data-esp-livre-hab>
          <option value="">Escolha…</option>
          ${treinadas.map((x) => `<option value="${x.id}" ${livre.hab === x.id ? 'selected' : ''}>${x.nome}</option>`).join('')}
        </select>
      </label>
      <label>Qual especialização?
        <input data-esp-livre-nome maxlength="60" value="${esc(livre.nome || '')}" placeholder="Ex.: Lapa">
      </label>
    </div>
    ${treinadas.filter((x) => x.exigeEsp).map((x) => {
      const e = esp.find((y) => y.origem === 'obrigatoria' && y.hab === x.id) || {};
      return `<label>${x.nome}: qual área?<input data-esp-obrigatoria="${x.id}" maxlength="60" value="${esc(e.nome || '')}" placeholder="Obrigatório para ${x.nome}"></label>`;
    }).join('')}`;
  return html;
}

function oQueVemJunto(p) {
  const itens = [];
  for (const v of p.vantagens) itens.push(`${nomeVantagem(v.id)} ${pontos(v.nivel, v.nivel)}${v.nota ? ` (${esc(v.nota)})` : ''}`);
  for (const d of p.defeitos) itens.push(`Defeito: ${nomeDefeito(d.id)} ${pontos(d.nivel, d.nivel)}${d.nota ? ` (${esc(d.nota)})` : ''}`);
  if (p.humanidade > 0) itens.push('Começa mais humano');
  if (p.humanidade < 0) itens.push('Começa menos humano');
  if (p.potencia) itens.push('Sangue mais potente');
  return itens.length ? `<ul class="lista-simples">${itens.map((i) => `<li>${i}</li>`).join('')}</ul>` : '';
}

function nomeVantagem(id) { return v5.VANTAGENS.find((x) => x.id === id)?.nome || id; }
function nomeDefeito(id) { return v5.DEFEITOS.find((x) => x.id === id)?.nome || id; }
function nomeHab(id) { return v5.HABILIDADES.find((x) => x.id === id)?.nome || id; }

function etapaPredador(f) {
  const c = v5.cla(f.cla);
  return `
    <p class="lead">Todo vampiro precisa de sangue. Como você costuma consegui-lo diz muito sobre quem você é, e sobre os riscos que corre.</p>
    <div class="grade-opcoes">
      ${v5.PREDADORES.map((p) => {
        const escolhido = f.predador?.id === p.id;
        const discs = v5.disciplinasDoPredador(p.id, f.cla);
        return `
          <div class="opcao ${escolhido ? 'escolhida' : ''}">
            <button type="button" class="opcao-cabeca" data-predador="${p.id}" aria-pressed="${escolhido}">
              <span class="opcao-nome">${p.nome}</span>
              <span class="opcao-desc">${p.desc}</span>
            </button>
            ${escolhido ? `
              <div class="opcao-escolhas">
                <fieldset>
                  <legend>Especialização</legend>
                  ${p.especializacoes.map((e, i) => `
                    <label class="radio"><input type="radio" name="esp-predador" data-esp-predador="${i}" ${f.predador.especializacao === i ? 'checked' : ''}> ${nomeHab(e.hab)}: ${e.nome}</label>`).join('')}
                </fieldset>
                ${c?.sangueFraco ? '<p class="nota">Sangue-fraco não ganha disciplina pelo jeito de caçar.</p>' : discs.length ? `
                  <fieldset>
                    <legend>Disciplina extra</legend>
                    ${discs.map((d) => `
                      <label class="radio"><input type="radio" name="disc-predador" data-disc-predador="${d}" ${f.predador.disciplina === d ? 'checked' : ''}> ${v5.DISCIPLINAS[d].nome}</label>`).join('')}
                  </fieldset>` : ''}
                ${oQueVemJunto(p) ? `<div class="vem-junto"><span class="grupo-rotulo">Vem junto</span>${oQueVemJunto(p)}</div>` : ''}
              </div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

function cartoesPoderes(disc, nivel, escolhidos) {
  const d = v5.DISCIPLINAS[disc];
  const qtd = d.poderes.filter((pw) => escolhidos.includes(pw.id)).length;
  return `
    <div class="bloco-disciplina">
      <h3>${d.nome} <span class="nivel-tag">${v5.palavra('disciplina', nivel)}</span></h3>
      <p class="nota">${d.desc} Escolha ${nivel} poder${nivel > 1 ? 'es' : ''} (${qtd} de ${nivel}).</p>
      <div class="grade-poderes">
        ${d.poderes.filter((pw) => pw.nivel <= nivel).map((pw) => {
          const ativo = escolhidos.includes(pw.id);
          const cheio = !ativo && qtd >= nivel;
          return `
            <button type="button" class="poder ${ativo ? 'ativo' : ''}" data-poder="${pw.id}" data-disc="${disc}" ${cheio ? 'disabled' : ''} aria-pressed="${ativo}">
              <span class="poder-nome">${pw.nome}</span>
              <span class="poder-desc">${pw.desc}</span>
            </button>`;
        }).join('')}
      </div>
    </div>`;
}

function etapaDisciplinas(f) {
  const c = v5.cla(f.cla);
  if (!c) return '<p class="nota">Escolha um clã primeiro.</p>';
  const niveis = v5.niveisDisciplinas(f);
  if (c.sangueFraco) {
    const ms = f.meritosSangueFraco || [];
    const ds = f.defeitosSangueFraco || [];
    const afinidade = ms.includes('afinidade-disciplina');
    return `
      <p class="lead">Sangue-fraco não tem disciplinas de verdade. Em troca, faz alquimia com o próprio sangue e tem dons e falhas que nenhum outro vampiro tem.</p>
      ${cartoesPoderes('alquimia', niveis.alquimia, f.alquimia?.formulas || [])}
      <h3>Méritos e defeitos de sangue-fraco</h3>
      <p class="nota">Opcional. Para cada mérito, escolha um defeito (até três de cada).</p>
      <div class="duas-colunas">
        <div>
          <span class="grupo-rotulo">Méritos</span>
          ${v5.MERITOS_SANGUE_FRACO.map((m) => `<button type="button" class="poder ${ms.includes(m.id) ? 'ativo' : ''}" data-merito-sf="${m.id}" aria-pressed="${ms.includes(m.id)}"><span class="poder-nome">${m.nome}</span><span class="poder-desc">${m.desc}</span></button>`).join('')}
        </div>
        <div>
          <span class="grupo-rotulo">Defeitos</span>
          ${v5.DEFEITOS_SANGUE_FRACO.map((m) => `<button type="button" class="poder ${ds.includes(m.id) ? 'ativo' : ''}" data-defeito-sf="${m.id}" aria-pressed="${ds.includes(m.id)}"><span class="poder-nome">${m.nome}</span><span class="poder-desc">${m.desc}</span></button>`).join('')}
        </div>
      </div>
      ${afinidade ? `
        <label>Disciplina da Afinidade
          <select data-afinidade>
            <option value="">Escolha…</option>
            ${Object.entries(v5.DISCIPLINAS).filter(([id]) => id !== 'alquimia' && id !== 'feiticaria').map(([id, d]) => `<option value="${id}" ${f.afinidadeDisciplina === id ? 'selected' : ''}>${d.nome}</option>`).join('')}
          </select>
        </label>` : ''}
      ${f.afinidadeDisciplina && afinidade ? cartoesPoderes(f.afinidadeDisciplina, 1, f.disciplinas?.poderes || []) : ''}`;
  }
  const opcoes = c.livre ? Object.keys(v5.DISCIPLINAS).filter((d) => d !== 'alquimia') : c.disciplinas;
  const d = f.disciplinas || {};
  const escolhidos = d.poderes || [];
  return `
    <p class="lead">Disciplinas são os dons do sangue. Você começa com uma mais desenvolvida e outra apenas despertando${f.predador?.disciplina ? ', mais a que veio do seu jeito de caçar' : ''}.</p>
    <h3>Disciplina principal</h3>
    <div class="grupo-chips">
      ${opcoes.map((x) => `<button type="button" class="chip ${d.principal === x ? 'ativo' : ''}" data-disc-principal="${x}">${v5.DISCIPLINAS[x].nome}</button>`).join('')}
    </div>
    <h3>Disciplina secundária</h3>
    <div class="grupo-chips">
      ${opcoes.map((x) => `<button type="button" class="chip ${d.secundaria === x ? 'ativo' : ''}" data-disc-secundaria="${x}" ${d.principal === x ? 'disabled' : ''}>${v5.DISCIPLINAS[x].nome}</button>`).join('')}
    </div>
    ${Object.entries(niveis).map(([disc, nivel]) => cartoesPoderes(disc, nivel, escolhidos)).join('')}`;
}

function linhasMarcas(lista, escolhidos, tipo) {
  return lista.map((item) => {
    const atual = escolhidos.find((x) => x.id === item.id);
    const nivel = atual?.nivel || 0;
    const niveis = item.fixo ? [item.fixo] : Array.from({ length: item.max }, (_, i) => i + 1);
    return `
      <li class="linha-marca ${nivel ? 'ativa' : ''}">
        <div class="linha-marca-texto"><span>${item.nome}</span><small>${item.desc}</small></div>
        <div class="marcas" role="group" aria-label="${item.nome}">
          ${niveis.map((n) => `<button type="button" class="ponto-marca ${n <= nivel ? 'cheia' : ''}" data-marca="${tipo}" data-id="${item.id}" data-nivel="${n}" aria-label="${item.nome}: ${n}">${item.fixo ? '●'.repeat(n) : '●'}</button>`).join('')}
        </div>
        ${nivel ? `<input class="nota-marca" data-nota="${tipo}" data-id="${item.id}" maxlength="80" value="${esc(atual.nota || '')}" placeholder="Detalhe (opcional): quem, onde, o quê">` : ''}
      </li>`;
  }).join('');
}

function etapaVantagens(f) {
  const p = v5.predador(f.predador?.id);
  const v = (f.vantagens || []).reduce((s, x) => s + x.nivel, 0);
  const d = (f.defeitos || []).reduce((s, x) => s + x.nivel, 0);
  return `
    <p class="lead">O que você tem a seu favor na cidade, e o que pesa contra.</p>
    ${p && oQueVemJunto(p) ? `<div class="cartao discreto"><span class="grupo-rotulo">Já vem com seu jeito de caçar</span>${oQueVemJunto(p)}</div>` : ''}
    <h3>Vantagens <span class="contador ${v === v5.PONTOS_VANTAGEM ? 'cheio' : ''}">${v} de ${v5.PONTOS_VANTAGEM} marcas</span></h3>
    <ul class="lista-marcas">${linhasMarcas(v5.VANTAGENS, f.vantagens || [], 'vantagens')}</ul>
    <h3>Defeitos <span class="contador ${d === v5.PONTOS_DEFEITO ? 'cheio' : ''}">${d} de ${v5.PONTOS_DEFEITO} marcas</span></h3>
    <ul class="lista-marcas">${linhasMarcas(v5.DEFEITOS, f.defeitos || [], 'defeitos')}</ul>`;
}

function etapaConviccoes(f) {
  const linhas = [0, 1, 2].map((i) => `
    <div class="cartao discreto">
      <span class="grupo-rotulo">Convicção ${i + 1}${i ? ' (opcional)' : ''}</span>
      ${campo(f, `conviccoes.${i}.texto`, 'O que você jamais faria (ou sempre faria)', { max: 200, placeholder: 'Ex.: Nunca machucar uma criança' })}
      <div class="duas-colunas">
        ${campo(f, `conviccoes.${i}.touchstone.nome`, 'Pessoa que representa isso', { max: 80, placeholder: 'Ex.: Júlia' })}
        ${campo(f, `conviccoes.${i}.touchstone.relacao`, 'Quem ela é para você', { max: 80, placeholder: 'Ex.: sobrinha, vive em Madureira' })}
      </div>
    </div>`).join('');
  return `
    <p class="lead">O que ainda te prende à humanidade. Cada convicção se apoia em um mortal vivo (touchstone): se ele sofrer, você sofre junto.</p>
    ${linhas}
    ${campo(f, 'ambicao', 'Ambição: o que você quer conquistar a longo prazo', { tipo: 'textarea', max: 300, placeholder: 'Ex.: Tornar-me o dono da noite na Lapa' })}
    ${campo(f, 'desejo', 'Desejo: o que você quer agora, nas próximas noites', { tipo: 'textarea', max: 300, placeholder: 'Ex.: Descobrir quem me Abraçou e por quê' })}`;
}

function etapaFinal(f) {
  const modo = f.senhor?.modo || 'narrador';
  return `
    ${campo(f, 'nome', 'Como você é conhecido hoje', { max: 80, dica: 'Pode ser o nome em vida, um apelido ou um nome novo.' })}
    ${campo(f, 'aparencia', 'Aparência', { tipo: 'textarea', max: 400, placeholder: 'Como os outros te veem: rosto, roupa, jeito' })}
    <fieldset>
      <legend>Quem te Abraçou</legend>
      <label class="radio"><input type="radio" name="senhor" data-senhor="narrador" ${modo === 'narrador' ? 'checked' : ''}> Deixar o Narrador decidir (pode ser um mistério)</label>
      <label class="radio"><input type="radio" name="senhor" data-senhor="descrito" ${modo === 'descrito' ? 'checked' : ''}> Eu descrevo</label>
    </fieldset>
    ${modo === 'descrito' ? campo(f, 'senhor.texto', 'Quem foi e como aconteceu', { tipo: 'textarea', max: 500 }) : ''}
    <h3>Sua ficha</h3>
    ${resumoFicha(f)}`;
}

const DESENHO = {
  origem: etapaOrigem,
  cla: etapaCla,
  atributos: etapaAtributos,
  habilidades: etapaHabilidades,
  predador: etapaPredador,
  disciplinas: etapaDisciplinas,
  vantagens: etapaVantagens,
  conviccoes: etapaConviccoes,
  final: etapaFinal,
};

// --- Tela de revisão (ficha enviada) --------------------------------------------

function telaRevisao(raiz, p) {
  raiz.innerHTML = `
    <section>
      <p class="sobretitulo">Ficha enviada</p>
      <h1>${esc(p.nome)}</h1>
      <div class="cartao destaque">
        <p>Sua ficha está com o Narrador. Quando ele revisar, vai encaixar você na cidade e escrever seu prelúdio, e a primeira noite se abre para você.</p>
        <button class="btn-secundario" id="voltar-editar">Voltar a editar</button>
      </div>
      ${resumoFicha(p.ficha)}
    </section>`;
  raiz.querySelector('#voltar-editar').onclick = async () => {
    try {
      await banco.salvarFicha(p.id, p.ficha, 'criacao');
      await recarregarPersonagens(p.id);
      ir('noite');
    } catch (err) { aviso(err.message, 'erro'); }
  };
}

// --- Assistente -------------------------------------------------------------------

export async function telaCriacao(raiz, personagem) {
  if (personagem?.status === 'revisao') return telaRevisao(raiz, personagem);

  let p = personagem;
  const ficha = structuredClone(p?.ficha || {});
  (ficha.origem ||= {}).abraco ||= QUANDO_ABRACO[0];
  let etapa = Math.min(Math.max(ficha._etapa | 0, 0), v5.ETAPAS.length - 1);
  let ocupado = false;

  const nomeEtapa = () => v5.ETAPAS[etapa];

  function desenhar(rolarTopo = false) {
    const nome = nomeEtapa();
    raiz.innerHTML = `
      <section class="assistente">
        <p class="sobretitulo">Criação de personagem · ${etapa + 1} de ${v5.ETAPAS.length}</p>
        <h1>${ROTULOS[nome]}</h1>
        <ol class="trilha" aria-label="Etapas">
          ${v5.ETAPAS.map((e, i) => `<li><button type="button" data-etapa="${i}" class="${i === etapa ? 'atual' : ''} ${v5.pendencias(e, ficha).length ? '' : 'ok'}" aria-current="${i === etapa ? 'step' : 'false'}" title="${ROTULOS[e]}"><span>${ROTULOS[e]}</span></button></li>`).join('')}
        </ol>
        <div class="etapa">${DESENHO[nome](ficha)}</div>
        <div class="rodape-assistente">
          <ul class="pendencias" aria-live="polite"></ul>
          <div class="botoes">
            ${etapa > 0 ? '<button type="button" class="btn-secundario" data-voltar>Voltar</button>' : '<span></span>'}
            ${nome === 'final'
              ? '<button type="button" class="btn" data-enviar>Enviar para o Narrador</button>'
              : '<button type="button" class="btn" data-avancar>Salvar e continuar</button>'}
          </div>
        </div>
      </section>`;
    atualizarRodape();
    if (rolarTopo) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function atualizarRodape() {
    const nome = nomeEtapa();
    const pend = nome === 'final'
      ? v5.ETAPAS.flatMap((e) => v5.pendencias(e, ficha).map((x) => (e === 'final' ? x : `${ROTULOS[e]}: ${x}`)))
      : v5.pendencias(nome, ficha);
    raiz.querySelector('.pendencias').innerHTML = pend.map((x) => `<li>${esc(x)}</li>`).join('');
    const btn = raiz.querySelector('[data-avancar], [data-enviar]');
    if (btn) btn.disabled = pend.length > 0 || ocupado;
  }

  async function salvar(status) {
    ficha._etapa = etapa;
    if (!p) {
      p = await banco.criarPersonagem(ficha);
      await recarregarPersonagens(p.id);
      // Sai de #/novo sem redesenhar: recarregar a página continua este rascunho.
      history.replaceState(null, '', '#/noite');
    } else {
      p = await banco.salvarFicha(p.id, ficha, status);
    }
  }

  async function mudarEtapa(nova) {
    if (ocupado) return;
    ocupado = true;
    try {
      etapa = nova;
      await salvar();
    } catch (err) {
      aviso(err.message, 'erro');
    } finally {
      ocupado = false;
      desenhar(true);
    }
  }

  // Campos de texto: atualizam a ficha sem redesenhar (para não perder o foco).
  on(raiz, 'input', '[data-campo]', (_e, el) => { gravar(ficha, el.dataset.campo, el.value); atualizarRodape(); });
  on(raiz, 'change', 'select[data-campo]', (_e, el) => { gravar(ficha, el.dataset.campo, el.value); atualizarRodape(); });

  on(raiz, 'click', '[data-etapa]', (_e, el) => mudarEtapa(Number(el.dataset.etapa)));
  on(raiz, 'click', '[data-voltar]', () => mudarEtapa(etapa - 1));
  on(raiz, 'click', '[data-avancar]', () => mudarEtapa(etapa + 1));
  on(raiz, 'click', '[data-enviar]', async (_e, el) => {
    if (!v5.fichaCompleta(ficha) || ocupado) return;
    ocupado = true;
    el.disabled = true;
    try {
      await salvar('revisao');
      await recarregarPersonagens(p.id);
      aviso('Ficha enviada para o Narrador.');
      ir('noite');
    } catch (err) {
      aviso(err.message, 'erro');
      ocupado = false;
      el.disabled = false;
    }
  });

  // Clã: trocar de clã zera as disciplinas escolhidas.
  on(raiz, 'click', '[data-cla]', (_e, el) => {
    if (ficha.cla !== el.dataset.cla) {
      ficha.cla = el.dataset.cla;
      ficha.disciplinas = {};
      ficha.alquimia = {};
      if (ficha.predador?.disciplina && !v5.disciplinasDoPredador(ficha.predador.id, ficha.cla).includes(ficha.predador.disciplina)) {
        ficha.predador.disciplina = null;
      }
    }
    desenhar();
  });

  // Atributos
  on(raiz, 'click', '[data-atributo]', (_e, el) => {
    const a = (ficha.atributos ||= {});
    const id = el.dataset.atributo;
    const papel = el.dataset.papel;
    a.fortes ||= [];
    if (papel === 'melhor') {
      a.melhor = id;
      a.fortes = a.fortes.filter((x) => x !== id);
      if (a.fraco === id) a.fraco = null;
    } else if (papel === 'forte') {
      if (a.fortes.includes(id)) a.fortes = a.fortes.filter((x) => x !== id);
      else if (a.fortes.length < 3) a.fortes.push(id);
      else aviso('Já são três pontos fortes. Desmarque um antes.');
      if (a.fraco && a.fortes.includes(a.fraco)) a.fraco = null;
    } else {
      a.fraco = a.fraco === id ? null : id;
    }
    desenhar();
  });

  // Habilidades
  on(raiz, 'click', '[data-perfil]', (_e, el) => {
    const h = (ficha.habilidades ||= {});
    if (h.perfil !== el.dataset.perfil) { h.perfil = el.dataset.perfil; h.niveis = {}; }
    desenhar();
  });
  on(raiz, 'change', '[data-habilidade]', (_e, el) => {
    const h = (ficha.habilidades ||= {});
    h.niveis ||= {};
    const n = Number(el.value);
    if (n) h.niveis[el.dataset.habilidade] = n;
    else delete h.niveis[el.dataset.habilidade];
    // Especializações em habilidades que ficaram sem treino deixam de valer.
    h.especializacoes = (h.especializacoes || []).filter((e) => (h.niveis[e.hab] | 0) > 0 || !e.hab);
    desenhar();
  });
  const espLivre = () => {
    const h = (ficha.habilidades ||= {});
    h.especializacoes ||= [];
    let e = h.especializacoes.find((x) => x.origem === 'livre');
    if (!e) { e = { origem: 'livre', hab: '', nome: '' }; h.especializacoes.push(e); }
    return e;
  };
  on(raiz, 'change', '[data-esp-livre-hab]', (_e, el) => { espLivre().hab = el.value; atualizarRodape(); });
  on(raiz, 'input', '[data-esp-livre-nome]', (_e, el) => { espLivre().nome = el.value; atualizarRodape(); });
  on(raiz, 'input', '[data-esp-obrigatoria]', (_e, el) => {
    const h = (ficha.habilidades ||= {});
    h.especializacoes ||= [];
    const hab = el.dataset.espObrigatoria;
    let e = h.especializacoes.find((x) => x.origem === 'obrigatoria' && x.hab === hab);
    if (!e) { e = { origem: 'obrigatoria', hab, nome: '' }; h.especializacoes.push(e); }
    e.nome = el.value;
    atualizarRodape();
  });

  // Predador
  on(raiz, 'click', '[data-predador]', (_e, el) => {
    if (ficha.predador?.id !== el.dataset.predador) ficha.predador = { id: el.dataset.predador, especializacao: null, disciplina: null };
    desenhar();
  });
  on(raiz, 'change', '[data-esp-predador]', (_e, el) => { ficha.predador.especializacao = Number(el.dataset.espPredador); atualizarRodape(); });
  on(raiz, 'change', '[data-disc-predador]', (_e, el) => {
    ficha.predador.disciplina = el.dataset.discPredador;
    limparPoderes();
    atualizarRodape();
  });

  // Disciplinas
  function limparPoderes() {
    const d = (ficha.disciplinas ||= {});
    const niveis = v5.niveisDisciplinas(ficha);
    d.poderes = (d.poderes || []).filter((id) => Object.entries(niveis).some(([disc, n]) => v5.DISCIPLINAS[disc]?.poderes.some((pw) => pw.id === id && pw.nivel <= n)));
  }
  on(raiz, 'click', '[data-disc-principal]', (_e, el) => {
    const d = (ficha.disciplinas ||= {});
    d.principal = el.dataset.discPrincipal;
    if (d.secundaria === d.principal) d.secundaria = null;
    limparPoderes();
    desenhar();
  });
  on(raiz, 'click', '[data-disc-secundaria]', (_e, el) => {
    const d = (ficha.disciplinas ||= {});
    d.secundaria = el.dataset.discSecundaria;
    limparPoderes();
    desenhar();
  });
  on(raiz, 'click', '[data-poder]', (_e, el) => {
    const c = v5.cla(ficha.cla);
    const id = el.dataset.poder;
    const alvo = c?.sangueFraco && el.dataset.disc === 'alquimia'
      ? ((ficha.alquimia ||= {}).formulas ||= [])
      : ((ficha.disciplinas ||= {}).poderes ||= []);
    const i = alvo.indexOf(id);
    if (i >= 0) alvo.splice(i, 1);
    else alvo.push(id);
    desenhar();
  });
  const alternar = (chave, id) => {
    const lista = (ficha[chave] ||= []);
    const i = lista.indexOf(id);
    if (i >= 0) lista.splice(i, 1);
    else if (lista.length < 3) lista.push(id);
    else aviso('No máximo três.');
  };
  on(raiz, 'click', '[data-merito-sf]', (_e, el) => {
    alternar('meritosSangueFraco', el.dataset.meritoSf);
    if (!ficha.meritosSangueFraco.includes('afinidade-disciplina')) {
      ficha.afinidadeDisciplina = null;
      if (ficha.disciplinas) ficha.disciplinas.poderes = [];
    }
    if (!ficha.meritosSangueFraco.includes('alquimista') && ficha.alquimia?.formulas?.length > 1) ficha.alquimia.formulas.length = 1;
    desenhar();
  });
  on(raiz, 'click', '[data-defeito-sf]', (_e, el) => { alternar('defeitosSangueFraco', el.dataset.defeitoSf); desenhar(); });
  on(raiz, 'change', '[data-afinidade]', (_e, el) => {
    ficha.afinidadeDisciplina = el.value || null;
    (ficha.disciplinas ||= {}).poderes = [];
    desenhar();
  });

  // Vantagens e defeitos
  on(raiz, 'click', '[data-marca]', (_e, el) => {
    const tipo = el.dataset.marca;
    const lista = (ficha[tipo] ||= []);
    const id = el.dataset.id;
    const n = Number(el.dataset.nivel);
    const atual = lista.find((x) => x.id === id);
    const novo = atual?.nivel === n ? n - (v5[tipo === 'vantagens' ? 'VANTAGENS' : 'DEFEITOS'].find((x) => x.id === id)?.fixo ? n : 1) : n;
    if (!novo) ficha[tipo] = lista.filter((x) => x.id !== id);
    else if (atual) atual.nivel = novo;
    else lista.push({ id, nivel: novo, nota: '' });
    desenhar();
  });
  on(raiz, 'input', '[data-nota]', (_e, el) => {
    const item = (ficha[el.dataset.nota] || []).find((x) => x.id === el.dataset.id);
    if (item) item.nota = el.value;
  });

  // Senhor
  on(raiz, 'change', '[data-senhor]', (_e, el) => { (ficha.senhor ||= {}).modo = el.dataset.senhor; desenhar(); });

  desenhar();
}
