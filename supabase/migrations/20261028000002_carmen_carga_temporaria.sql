-- Carga da temporada 1 do Carmen (28/10/2026), sem o conteúdo passar pela conversa: uma função temporária
-- recebeu os comandos gerados por ferramentas/carmen-para-banco.mjs, mandados por ferramentas/carregar-carmen.mjs,
-- com um código de uso local (só o hash ficou aqui). Ela foi apagada logo depois da carga. Para carregar de novo,
-- recrie a função com o hash de um código novo e rode o script.
--
-- create or replace function public.carregar_capitulo_carmen(p_codigo text, p_comandos jsonb)
-- returns jsonb language plpgsql security definer set search_path = '' as $$ ... (confere o sha256 do código,
-- aceita só insert/delete nas tabelas do Carmen e executa cada comando) $$;
drop function if exists public.carregar_capitulo_carmen(text, jsonb);
