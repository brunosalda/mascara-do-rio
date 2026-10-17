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

export async function entrarComLink(email) {
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname },
  });
  if (error) {
    if (/not.*allowed|convidado|Database error/i.test(error.message)) throw new Error('Este e-mail não está na lista de convidados.');
    throw new Error(error.message);
  }
}

export async function sair() {
  await sb.auth.signOut();
}

// --- Personagens -----------------------------------------------------------

export async function meusPersonagens() {
  const { data, error } = await sb
    .from('personagens')
    .select('id, nome, status, ficha, estado, retrato, criado_em, atualizado_em')
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
  const { data, error } = await sb
    .from('narracoes')
    .select('id, tipo, noite_id, texto, opcoes, paineis, criado_em')
    .eq('personagem_id', personagemId)
    .order('criado_em', { ascending: false });
  falha(error, 'Não foi possível carregar suas narrações.');
  return data;
}

export async function minhaAcao(noiteId, personagemId) {
  const { data, error } = await sb
    .from('acoes')
    .select('id, principal, cacada, nao_cacar, curta_1, curta_2, esforco, atualizado_em')
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
    .select('id, principal, cacada, nao_cacar, curta_1, curta_2, esforco, atualizado_em')
    .single();
  // 42501: inserção barrada pelo RLS; PGRST116: atualização que não achou linha liberada (noite fechada).
  if (error?.code === '42501' || error?.code === 'PGRST116' || /row-level security/i.test(error?.message || '')) {
    throw new Error('A noite já fechou. Suas ações não foram enviadas.');
  }
  falha(error, 'Não foi possível enviar suas ações.');
  return data;
}
