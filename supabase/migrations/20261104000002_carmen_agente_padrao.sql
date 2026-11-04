-- Carmen 2026: um jogo só, com o agente padrão (decisão da coordenação em 04/11, pelo pedido do Bruno de "somente
-- um jogo"; proposta do Replanejamento). NÃO APLICADA: espera a liberação do Bruno na aba do desenvolvimento.
--
-- Todo jogador é o mesmo agente da Xerife: os 3 poderes e os mesmos números (R.AGENTE, js/carmen/regras.js).
-- A entrada pede só o nome e, se quiser, o clã, que muda só a aparência na lista dos rivais. Não há entrevista,
-- criação de ficha nem espera pelo Narrador. Nada se apaga:
--   1. quem já tem o agente do Carmen continua com ele;
--   2. quem já jogou o Carmen com um personagem antigo (ativo, com progresso) segue com ele, e o progresso fica;
--   3. os outros ganham uma linha nova em personagens, ativa, com ficha.agente_carmen = true. Os personagens antigos
--      ficam no banco como estão.

create or replace function public.caso_agente(p_nome text default null, p_cla text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_nome text;
  v_cla text := nullif(lower(btrim(coalesce(p_cla, ''))), '');
begin
  if v_uid is null then raise exception 'sem-login'; end if;
  select p.id, p.nome into v_id, v_nome from public.personagens p
    where p.user_id = v_uid and p.ficha ->> 'agente_carmen' = 'true' order by p.criado_em limit 1;
  if v_id is not null then return jsonb_build_object('personagem', v_id, 'nome', v_nome, 'novo', false); end if;
  select p.id, p.nome into v_id, v_nome from public.personagens p
    where p.user_id = v_uid and p.status = 'ativo' and exists (select 1 from public.progresso pr where pr.personagem_id = p.id)
    order by p.atualizado_em desc limit 1;
  if v_id is not null then return jsonb_build_object('personagem', v_id, 'nome', v_nome, 'novo', false, 'antigo', true); end if;
  if p_nome is null or btrim(p_nome) = '' then return jsonb_build_object('precisa_nome', true); end if;
  if char_length(btrim(p_nome)) > 40 then raise exception 'nome-longo'; end if;
  if v_cla is not null and v_cla not in ('brujah', 'gangrel', 'malkavian', 'nosferatu', 'toreador', 'tremere', 'ventrue', 'caitiff') then raise exception 'cla-invalido'; end if;
  v_nome := btrim(p_nome);
  insert into public.personagens (user_id, nome, status, ficha, estado, numeros) values (
    v_uid, v_nome, 'ativo',
    jsonb_build_object('agente_carmen', true, 'nome', v_nome, 'cla', v_cla),
    jsonb_build_object('cla_aparente', v_cla),
    -- O agente padrão (Replanejamento, 04/11): atributos na distribuição da V5 (um 4, três 3, quatro 2, um 1).
    jsonb_build_object(
      'atributos', jsonb_build_object('forca', 1, 'destreza', 3, 'vigor', 2, 'carisma', 3, 'manipulacao', 2, 'autocontrole', 3,
        'inteligencia', 2, 'raciocinio', 4, 'determinacao', 2),
      'habilidades', jsonb_build_object('persuasao', 3, 'furtividade', 3, 'intimidacao', 2, 'atletismo', 2),
      'forcaVontade', 5,
      'poderes', jsonb_build_array('compelir', 'sentidos-agucados', 'reflexos-rapidos'),
      'disciplinas', jsonb_build_object('auspicios', 1, 'dominacao', 1, 'rapidez', 1))
  ) returning id into v_id;
  return jsonb_build_object('personagem', v_id, 'nome', v_nome, 'novo', true);
end $$;
revoke all on function public.caso_agente(text, text) from public, anon;
grant execute on function public.caso_agente(text, text) to authenticated;
