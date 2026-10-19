// Formato v3, etapa B, passo 4: o caso jogado pelo banco. Cada função chama uma função do Supabase
// (supabase/migrations/20261019000003_etapa_b_funcoes.sql), que confere o dono do personagem, rola os
// dados e devolve só o que o jogador conquistou. O navegador não decide nada: só mostra.
//
// A demonstração (#/caso) continua rodando no navegador, sem banco. Os capítulos de verdade usam este
// adaptador. Toda resposta traz `estado` (relógio, Fome, pistas conquistadas, palavras liberadas, feitos).
//
// Prova de console (com a conta logada, em qualquer tela do site):
//   const f = await import('./js/caso/fonte-banco.js'); await f.provarSegredo();
// Tem de mostrar "barrado" em todas as tabelas de segredo.
import { sb } from '../banco.js';

// Os erros das funções, em palavras para o jogador.
const ERROS = {
  'personagem-alheio': 'Este personagem não é seu.',
  'personagem-inativo': 'O personagem ainda não foi aprovado pelo Narrador.',
  'capitulo-inexistente': 'Este capítulo não existe ou ainda não abriu para você.',
  'temporada-fechada': 'A temporada está fechada.',
  'sem-progresso': 'Abra o capítulo antes de jogar.',
  amanheceu: 'O sol nasceu. Volte ao refúgio e comece a noite seguinte.',
  'conteudo-inexistente': 'Isso não está ao seu alcance agora.',
  'fora-do-lugar': 'Isso fica em outro lugar.',
  'abordagem-indisponivel': 'Esse caminho não está aberto agora.',
  'ficha-sem-numeros': 'Sua ficha ainda não tem os números do Narrador. Peça a ele para ativá-la de novo.',
  'sem-repeticao': 'Não dá para insistir nisso agora.',
  'palavra-nao-liberada': 'Uma das palavras da acusação ainda não tem pista que a sustente.',
  'acao-indisponivel': 'Agora não.',
  'ainda-noite': 'Ainda é noite.',
  'nao-resolvido': 'O capítulo ainda não foi resolvido.',
  'sem-login': 'Entre na sua conta para jogar o capítulo.',
};

export class ErroDoCaso extends Error {
  constructor(codigo, original) {
    super(ERROS[codigo] || 'Não deu certo. Tente de novo em instantes.');
    this.codigo = ERROS[codigo] ? codigo : 'desconhecido';
    this.original = original;
  }
}

// Teste (só com ?gravado no endereço): window.__casoGravado(funcao, args) devolve respostas do banco
// gravadas antes no SQL, para testar a tela sem entrar na conta. Só muda o que esta tela mostra: o banco
// continua decidindo tudo para quem joga de verdade.
const gravado = () => typeof location !== 'undefined' && /[?&]gravado\b/.test(location.hash);

async function chamar(funcao, args) {
  const teste = gravado() && typeof window !== 'undefined' && window.__casoGravado;
  const { data, error } = teste ? await teste(funcao, args) : await sb.rpc(funcao, args);
  if (error) {
    const codigo = /permission denied/.test(error.message || '') ? 'sem-login' : Object.keys(ERROS).find((c) => error.message?.includes(c));
    throw new ErroDoCaso(codigo, error);
  }
  return data;
}

const base = (capitulo, personagem) => ({ p_capitulo: capitulo, p_personagem: personagem });

// Abre o capítulo (cria o progresso no capítulo 1). Devolve { capitulo, ficha_com_numeros, estado }.
export const abrir = (capitulo, personagem) => chamar('caso_abrir', base(capitulo, personagem));
// Vai a um lugar (ou só olha o atual): { lugar, minutos, pessoas, pontos, eventos, estado }.
export const lugar = (capitulo, personagem, id) => chamar('caso_lugar', { ...base(capitulo, personagem), p_lugar: id });
// Começa a conversa: { pessoa, texto, topicos: [{ chave, rotulo, min, estado }], estado }.
export const conversa = (capitulo, personagem, pessoa) => chamar('caso_conversa', { ...base(capitulo, personagem), p_pessoa: pessoa });
// Age num tópico ('pessoa:topico') ou exame ('x:ponto'). Sem abordagem: { pergunta, abordagens } quando
// há escolha; com ela: { ok, texto, teste, sangue, novas, eventos, pode_repetir, estado }.
export const agir = (capitulo, personagem, chave, abordagem = null) =>
  chamar('caso_agir', { ...base(capitulo, personagem), p_chave: chave, p_abordagem: abordagem, p_usar_vontade: false });
// Força de Vontade: rerrola a última falha da mesma abordagem.
export const insistir = (capitulo, personagem, chave, abordagem) =>
  chamar('caso_agir', { ...base(capitulo, personagem), p_chave: chave, p_abordagem: abordagem, p_usar_vontade: true });
export const cacar = (capitulo, personagem, abordagem) => chamar('caso_cacar', { ...base(capitulo, personagem), p_abordagem: abordagem });
// O começo da corrida: o banco só aceita "pego" entre 4 e 60 s depois dele (antes ou depois, vale "escapou").
export const comecoDaPerseguicao = (capitulo, personagem) => chamar('caso_perseguicao', { ...base(capitulo, personagem), p_resultado: 'inicio' });
// ETAPA C: hoje o banco confia no navegador para 'pego' ou 'escapou' (com a janela de tempo acima);
// 'dados' é rolado no banco.
export const fimDaPerseguicao = (capitulo, personagem, resultado) => chamar('caso_perseguicao', { ...base(capitulo, personagem), p_resultado: resultado });
// Acusa: { certo, quase, erros, minutos } ou { certo, nota, selos, fecho, proximo }.
export const acusar = (capitulo, personagem, { quem, como, porque }) =>
  chamar('caso_acusar', { ...base(capitulo, personagem), p_quem: quem, p_como: como, p_porque: porque });
// O fecho do capítulo resolvido (para reabrir depois de recarregar): { paineis, texto, escolhas, nota, selos, final }.
export const fecho = (capitulo, personagem) => chamar('caso_fecho', base(capitulo, personagem));
export const escolherFinal = (capitulo, personagem, escolha) => chamar('caso_final', { ...base(capitulo, personagem), p_escolha: escolha });
// Dica: custa 60 pontos na nota. Pergunte antes ("Quer uma dica?"), nunca entregue sozinho.
export const dica = (capitulo, personagem) => chamar('caso_dica', base(capitulo, personagem));
export const novaNoite = (capitulo, personagem) => chamar('caso_noite', base(capitulo, personagem));
export const ranking = (temporada) => chamar('caso_ranking', { p_temporada: temporada });
export const rankingDoCapitulo = (capitulo) => chamar('caso_ranking_capitulo', { p_capitulo: capitulo });

// Pulso do tempo ativo: a cada 60 s, só com a aba visível. Devolve a função que para o pulso.
export function iniciarPulso(capitulo, personagem) {
  const bater = () => { if (document.visibilityState === 'visible') chamar('caso_pulso', base(capitulo, personagem)).catch(() => {}); };
  const id = setInterval(bater, 60_000);
  return () => clearInterval(id);
}

// Prova do "Pronto quando": com a conta logada, nenhuma tabela de segredo se lê pelo console, e o
// progresso não se grava direto.
export async function provarSegredo() {
  const resultado = {};
  for (const tabela of ['cap_pistas', 'capitulo_segredo', 'cap_conteudos', 'cap_pessoas', 'cap_dicas']) {
    const { data, error } = await sb.from(tabela).select('*').limit(5);
    resultado[tabela] = error ? `barrado (${error.message})` : data?.length ? `VAZOU: ${data.length} linhas` : 'vazio';
  }
  const { error: erroGravar } = await sb.from('progresso').update({ nota: 1000 }).neq('nota', -1);
  resultado['gravar progresso'] = erroGravar ? `barrado (${erroGravar.message})` : 'VAZOU: o update passou';
  const { error: erroDados } = await sb.rpc('_cap_rolar', { p_parada: 9, p_fome: 0, p_dif: 1 });
  resultado['rolar dados direto'] = erroDados ? `barrado (${erroDados.message})` : 'VAZOU: rolou';
  console.table(resultado);
  return resultado;
}
