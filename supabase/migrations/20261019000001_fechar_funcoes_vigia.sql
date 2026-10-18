-- Fecha as 3 funções SECURITY DEFINER que o verificador de segurança do Supabase acusa como abertas a
-- quem não fez login. NÃO APLICADA: vai com o OK do Bruno, junto com a etapa B (segunda, 19/10/2026).
--
-- Quem chama cada uma hoje:
--   noite_todos_encerraram  → o site, logado (banco.js, todosEncerraram) e as outras duas funções;
--   vigia_noite_pronta      → o vigia do Narrador (narrador/scripts/vigiar-noite.mjs), com a chave PÚBLICA;
--   vigia_fechar_noite      → o mesmo vigia, com a chave pública.
--
-- ATENÇÃO, antes de aplicar: o vigia usa a chave pública (anon). Tirar o acesso de anon das funções do
-- vigia faz ele parar de fechar a noite. Por isso o vigia precisa, ANTES, passar a usar a chave de serviço
-- (service_role), lida de um arquivo local, por exemplo narrador/segredos.local.md (a pasta narrador fica
-- fora do repositório, e *.local.* também está no .gitignore). Quem cola a chave nesse arquivo é
-- o Bruno (painel do Supabase > Project Settings > API > service_role). A mudança no script é do Narrador.
--
-- Risco real hoje, para pesar a pressa: vigia_fechar_noite só fecha a noite quando todos já encerraram (o
-- mesmo que o vigia faria minutos depois), e as outras duas só devolvem sim ou não. Abertas, elas não
-- deixam ninguém ler nem mudar o plano de outro jogador. Fechar é a regra certa, mas não é emergência.

-- 1. Ninguém sem login chama nenhuma das três.
revoke execute on function public.noite_todos_encerraram(bigint) from anon;
revoke execute on function public.vigia_noite_pronta() from anon;
revoke execute on function public.vigia_fechar_noite() from anon;

-- 2. As do vigia ficam só para a chave de serviço (o vigia, depois de trocar de chave).
revoke execute on function public.vigia_noite_pronta() from authenticated;
revoke execute on function public.vigia_fechar_noite() from authenticated;
grant execute on function public.vigia_noite_pronta() to service_role;
grant execute on function public.vigia_fechar_noite() to service_role;

-- 3. noite_todos_encerraram continua para quem fez login: o site usa (tela de envio do plano).
grant execute on function public.noite_todos_encerraram(bigint) to authenticated, service_role;

-- Regra para as funções novas (etapa B): nascer com
--   revoke all on function ... from public, anon;
--   grant execute on function ... to authenticated;
-- e conferir o dono do personagem (auth.uid()) dentro de cada uma.
