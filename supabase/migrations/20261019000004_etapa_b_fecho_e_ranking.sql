-- Etapa B, ajustes para a tela do caso no banco e da conferência da avaliação (19/10/2026).
--
-- 1. caso_fecho: depois de acertar, a tela pode recarregar e precisa mostrar o fecho de novo (a variante
--    pela cena de ação). Só devolve com o capítulo resolvido.
-- 2. Ranking: o grupo de cima não exige mais metade de TODOS os capítulos (no meio da temporada isso volta
--    a premiar quem joga mais por dia). A régua é o líder do momento: resolvidos * 2 >= o maior número de
--    capítulos resolvidos por alguém.

create or replace function public.caso_fecho(p_capitulo text, p_personagem uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_seg public.capitulo_segredo; v_texto text; v_var jsonb;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem, false);
  if v_pr.resolvido_em is null then raise exception 'nao-resolvido'; end if;
  select * into v_seg from public.capitulo_segredo s where s.capitulo_id = p_capitulo;
  v_texto := v_seg.fecho -> 'texto' ->> coalesce(v_seg.fecho ->> 'padrao', '');
  for v_var in select jsonb_array_elements(coalesce(v_seg.fecho -> 'variantes', '[]'::jsonb)) loop
    if (v_var ->> 'marca') = any (v_pr.marcas) then v_texto := v_seg.fecho -> 'texto' ->> (v_var ->> 'texto'); exit; end if;
  end loop;
  return jsonb_build_object('paineis', v_seg.fecho -> 'paineis', 'texto', v_texto,
    'escolhas', (select coalesce(jsonb_agg(jsonb_build_object('id', e -> 'id', 'rotulo', e -> 'rotulo')), '[]'::jsonb) from jsonb_array_elements(coalesce(v_seg.fecho -> 'escolhas', '[]'::jsonb)) e),
    'nota', v_pr.nota, 'selos', to_jsonb(v_pr.selos), 'final', v_pr.final);
end $$;
revoke all on function public.caso_fecho(text, uuid) from public, anon, authenticated;
grant execute on function public.caso_fecho(text, uuid) to authenticated;

do $$
declare v_def text;
begin
  select pg_get_functiondef('public.caso_ranking(text)'::regprocedure) into v_def;
  if position('b.resolvidos * 2 >= v_n' in v_def) = 0 then raise exception 'trecho do ranking não encontrado'; end if;
  v_def := replace(v_def, 'b.resolvidos * 2 >= v_n', 'b.resolvidos * 2 >= (select max(b2.resolvidos) from base b2)');
  execute v_def;
end $$;
