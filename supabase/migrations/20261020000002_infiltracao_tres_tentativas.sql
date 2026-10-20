-- Infiltração (avaliação de 20/10): numa cena de reflexo, dá para tentar de novo até 3 vezes; cada falha custa
-- 15 minutos a mais da noite. As falhas ficam em tentados como 'chave#i~1', 'chave#i~2'; na 3ª falha (ou no
-- sucesso), entra 'chave#i', que fecha a abordagem como antes.
do $$
declare v_def text; a1 text; b1 text; a2 text; b2 text;
begin
  select pg_get_functiondef('public.caso_infiltracao(text, uuid, text, integer, text, jsonb)'::regprocedure) into v_def;
  a1 := 'update public.progresso pr set tentados = pr.tentados || (p_chave || ''#'' || p_abordagem), cena_atual = null,';
  b1 := 'update public.progresso pr set tentados = pr.tentados || (case when v_ok or (select count(*) from unnest(pr.tentados) t where t like p_chave || ''#'' || p_abordagem || ''~%'') >= 2'
     || ' then p_chave || ''#'' || p_abordagem'
     || ' else p_chave || ''#'' || p_abordagem || ''~'' || ((select count(*) from unnest(pr.tentados) t where t like p_chave || ''#'' || p_abordagem || ''~%'') + 1) end), cena_atual = null,';
  a2 := 'v_ev := public._cap_tempo(p_personagem, p_capitulo, coalesce((v_d ->> ''min'')::int, 0));';
  b2 := 'v_ev := public._cap_tempo(p_personagem, p_capitulo, coalesce((v_d ->> ''min'')::int, 0) + (case when v_ok then 0 else 15 end));';
  if position(a1 in v_def) = 0 or position(a2 in v_def) = 0 then raise exception 'trechos de caso_infiltracao não encontrados'; end if;
  v_def := replace(replace(v_def, a1, b1), a2, b2);
  execute v_def;
end $$;
