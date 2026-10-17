// Acesso ao Supabase: login, personagens, noites, ações e narrações.
// Tudo passa pelas regras de acesso do banco: cada jogador só lê o que é dele.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

function falha(error, contexto) {
  if (!error) return;
  console.error(contexto, error);
  throw new Error(error.message || contexto);
}

// --- Login -----------------------------------------------------------------

export async function sessaoAtual() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

export function aoMudarSessao(fn) {
  sb.auth.onAuthStateChange((_evento, sessao) => fn(sessao));
}

export async function entrarComSenha(email, senha) {
  const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
}

// criarSenha: o link volta com ?criar-senha=1 e a tela de criar a senha abre sozinha depois de entrar.
export async function entrarComLink(email, { criarSenha = false } = {}) {
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname + (criarSenha ? '?criar-senha=1' : '') },
  });
  if (error) {
    if (/not.*allowed|convidado|Database error/i.test(error.message)) throw new Error('Este e-mail não está na lista de convidados.');
    throw new Error(error.message);
  }
}

// Criar ou trocar a senha de quem já entrou (pelo link ou pela senha antiga). A senha vai só para a
// autenticação do Supabase; o site não guarda nem registra nada dela.
export async function trocarSenha(senha) {
  const { error } = await sb.auth.updateUser({ password: senha });
  if (!error) return;
  if (/same|different/i.test(error.message)) throw new Error('Essa já é a sua senha. Escolha outra, ou feche se não quer trocar.');
  if (/weak|short|characters|at least/i.test(error.message)) throw new Error('Senha fraca demais. Use pelo menos 8 caracteres, misturando letras e números.');
  if (/session|auth/i.test(error.message)) throw new Error('A sessão expirou. Entre de novo pelo link e crie a senha logo em seguida.');
  throw new Error('Não deu para salvar a senha agora. Tente de novo em instantes.');
}

// Entrou pelo link do e-mail nesta sessão? (o token diz o método: otp ou magiclink)
export async function entrouPorLink() {
  try {
    const { data } = await sb.auth.getSession();
    const carga = JSON.parse(atob(data.session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (carga.amr || []).some((m) => /otp|magiclink|email/i.test(m.method || ''));
  } catch { return false; }
}

export async function sair() {
  await sb.auth.signOut();
}

// --- Personagens -----------------------------------------------------------

export async function meusPersonagens() {
  const { data, error } = await sb
    .from('personagens')
    .select('id, nome, status, ficha, estado, retrato, sprite, criado_em, atualizado_em')
    .order('criado_em', { ascending: true });
  falha(error, 'Não foi possível carregar seus personagens.');
  return data;
}

export async function criarPersonagem(ficha) {
  const { data, error } = await sb
    .from('personagens')
    .insert({ nome: ficha.nome || ficha.origem?.nomeEmVida || '', ficha, status: 'criacao' })
    .select('id, nome, status, ficha, estado, criado_em, atualizado_em')
    .single();
  falha(error, 'Não foi possível criar o personagem.');
  return data;
}

export async function salvarFicha(id, ficha, status) {
  const campos = { ficha, nome: ficha.nome || ficha.origem?.nomeEmVida || '' };
  if (status) campos.status = status;
  const { data, error } = await sb
    .from('personagens')
    .update(campos)
    .eq('id', id)
    .select('id, nome, status, ficha, estado, criado_em, atualizado_em')
    .single();
  falha(error, 'Não foi possível salvar a ficha.');
  return data;
}

export async function apagarRascunho(id) {
  const { error } = await sb.from('personagens').delete().eq('id', id);
  falha(error, 'Não foi possível apagar o rascunho.');
}

// --- Noites, ações e narrações ---------------------------------------------

export async function noiteAberta() {
  const { data, error } = await sb
    .from('noites')
    .select('id, numero, status, abre_em, fecha_em')
    .eq('status', 'aberta')
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();
  falha(error, 'Não foi possível carregar a noite.');
  return data;
}

// A noite mais recente, em qualquer estado (aberta, fechada ou resolvida): para o quadro entre noites.
export async function ultimaNoite() {
  const { data, error } = await sb
    .from('noites')
    .select('id, numero, status, fecha_em, resolvida_em')
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();
  falha(error, 'Não foi possível carregar a noite.');
  return data;
}

export async function noitesResolvidas() {
  const { data, error } = await sb
    .from('noites')
    .select('id, numero, fecha_em, resolvida_em, narracao_publica, paineis')
    .eq('status', 'resolvida')
    .order('numero', { ascending: false });
  falha(error, 'Não foi possível carregar a crônica.');
  return data;
}

export async function narracoesDoPersonagem(personagemId) {
  // Os ganhos da noite (fase 3) vêm junto quando a coluna existir; antes da migração, a leitura sem ela.
  let { data, error } = await sb
    .from('narracoes')
    .select('id, tipo, noite_id, texto, opcoes, paineis, criado_em, ganhos')
    .eq('personagem_id', personagemId)
    .order('criado_em', { ascending: false });
  if (error && /ganhos/.test(error.message || '')) {
    ({ data, error } = await sb
      .from('narracoes')
      .select('id, tipo, noite_id, texto, opcoes, paineis, criado_em')
      .eq('personagem_id', personagemId)
      .order('criado_em', { ascending: false }));
  }
  falha(error, 'Não foi possível carregar suas narrações.');
  return data;
}

// '*' traz também encerrada_em quando a coluna existe (e não quebra enquanto ela não existe).
export async function minhaAcao(noiteId, personagemId) {
  const { data, error } = await sb
    .from('acoes')
    .select('*')
    .eq('noite_id', noiteId)
    .eq('personagem_id', personagemId)
    .maybeSingle();
  falha(error, 'Não foi possível carregar suas ações.');
  return data;
}

export async function salvarAcao(noiteId, personagemId, campos, existenteId) {
  const consulta = existenteId
    ? sb.from('acoes').update(campos).eq('id', existenteId)
    : sb.from('acoes').insert({ noite_id: noiteId, personagem_id: personagemId, ...campos });
  const { data, error } = await consulta
    .select('*')
    .single();
  // 42501: inserção barrada pelo RLS; PGRST116: atualização que não achou linha liberada (noite fechada).
  if (error?.code === '42501' || error?.code === 'PGRST116' || /row-level security/i.test(error?.message || '')) {
    throw new Error('A noite já fechou. Suas ações não foram enviadas.');
  }
  falha(error, 'Não foi possível enviar suas ações.');
  return data;
}

// Encerrar a noite: depois disso, a ação não muda mais (o banco trava). Quando todos os personagens
// ativos encerram, o vigia do PC do Bruno chama o Narrador.
export async function encerrarNoite(acaoId) {
  const { data, error } = await sb
    .from('acoes')
    .update({ encerrada_em: new Date().toISOString() })
    .eq('id', acaoId)
    .select('*')
    .single();
  if (error?.code === 'PGRST116' || /row-level security/i.test(error?.message || '')) {
    throw new Error('A noite já fechou.');
  }
  falha(error, 'Não foi possível encerrar a noite.');
  return data;
}

export async function todosEncerraram(noiteId) {
  const { data, error } = await sb.rpc('noite_todos_encerraram', { p_noite: noiteId });
  if (error) return false;
  return !!data;
}
