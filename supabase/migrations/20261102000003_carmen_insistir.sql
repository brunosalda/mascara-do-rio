-- Carmen 2026: insistir no pedido de uma testemunha comum vira uma aposta de tempo (desenho do Replanejamento,
-- 02/11, 18h50, em gerencia/carmen-2026/diagnostico-realismo.md, seção 4; decisão da coordenação, 16h25).
-- NÃO APLICADA: entra no banco só com a permissão do Bruno.
--
-- Acerto: 5 minutos. Falha: 25. Nos dois casos a testemunha fala e entrega as mesmas pistas. Com a ficha em
-- números, a parada é a maior entre Carisma + Persuasão e Manipulação + Persuasão, contra dificuldade 2 (3 com
-- Fome 4 ou mais, como em _cap_situacao). Sem ficha, 1 dado contra dificuldade 1 (metade da chance), sem Fome.
-- Sem Força de Vontade. O favor de vampiro (divida) não muda: 25 minutos e a frase de recusa.

-- 1. A aposta de insistir para esta ficha e esta Fome: o par usado, a parada e a dificuldade.
create or replace function public._cap_insistir(p_num jsonb, p_fome int) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare v_c int; v_m int;
begin
  if p_num is null or not (p_num ? 'atributos') then return jsonb_build_object('pool', null, 'parada', 1, 'dif', 1); end if;
  v_c := public._cap_parada(p_num, '["carisma", "persuasao"]'::jsonb);
  v_m := public._cap_parada(p_num, '["manipulacao", "persuasao"]'::jsonb);
  return jsonb_build_object('pool', case when v_m > v_c then '["manipulacao", "persuasao"]'::jsonb else '["carisma", "persuasao"]'::jsonb end,
    'parada', greatest(v_c, v_m), 'dif', 2 + case when coalesce(p_fome, 0) >= 4 then 1 else 0 end);
end $$;
revoke all on function public._cap_insistir(jsonb, int) from public, anon, authenticated;

-- 2. Os tópicos à vista: no pedido sem dívida, também a aposta de insistir, para a tela mostrar a chance antes.
create or replace function public._cap_topicos(p_pers uuid, p_cap text, p_pessoa text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_pr public.progresso; v_num jsonb; v_pub jsonb; v_ach text[]; v_r record; v_d jsonb; v_estado text; v_saida jsonb := '[]'::jsonb;
  v_ins jsonb;
begin
  select * into v_pr from public.progresso pr where pr.personagem_id = p_pers and pr.capitulo_id = p_cap;
  select p.numeros into v_num from public.personagens p where p.id = p_pers;
  select c.publico into v_pub from public.capitulos c where c.id = p_cap;
  v_ach := v_pr.pistas || v_pr.marcas;
  v_ins := public._cap_insistir(v_num, v_pr.fome);
  if v_pub -> 'perseguicao' ->> 'pessoa' = p_pessoa and 'perseguido' = any (v_ach) then return v_saida; end if;
  for v_r in select * from public.cap_conteudos cc where cc.capitulo_id = p_cap and cc.tipo = 'topico' and cc.pessoa = p_pessoa order by cc.ordem loop
    v_d := v_r.dados;
    v_estado := coalesce(v_pr.feitos ->> v_r.chave, 'novo');
    if not public._cap_todos(to_jsonb(v_r.requer), v_ach) then continue; end if;
    if v_d ? 'requerAlgum' and not public._cap_algum(v_d -> 'requerAlgum', v_ach) then continue; end if;
    if v_d ? 'requerQuantos' and (select count(*) from jsonb_array_elements_text(v_d -> 'requerQuantos' -> 'de') x where x = any (v_ach)) < (v_d -> 'requerQuantos' ->> 'n')::int then continue; end if;
    if v_d ? 'poderTopico' and not public._cap_tem_poder(v_num, v_d ->> 'poderTopico') then continue; end if;
    if public._cap_algum(v_d -> 'escondeSe', v_ach) and v_estado <> 'ok' then continue; end if;
    if v_d ->> 'acao' = 'perseguicao' and (v_pub -> 'perseguicao' ->> 'marca') = any (v_ach) then continue; end if;
    v_saida := v_saida || jsonb_build_array(jsonb_build_object('chave', v_r.chave, 'rotulo', v_d ->> 'rotulo', 'min', v_d -> 'min', 'estado', v_estado)
      || case when v_d ? 'pedido' and v_estado = 'novo' then jsonb_build_object('pedido', v_d -> 'pedido' -> 'fala', 'divida', v_d -> 'pedido' -> 'divida', 'botao', v_d -> 'pedido' -> 'botao')
        || case when coalesce((v_d -> 'pedido' ->> 'divida')::boolean, false) then '{}'::jsonb else jsonb_build_object('insistir', v_ins) end
      else '{}'::jsonb end);
  end loop;
  return v_saida;
end $$;

-- 3. A resposta ao pedido. Atender: o tempo do tópico, as pistas e, se for favor, a dívida. Recusar o favor:
-- 25 minutos. Insistir no pedido comum: a rolagem decide entre 5 e 25 minutos. Nos três casos, as mesmas pistas.
create or replace function public.caso_pedido(p_capitulo text, p_personagem uuid, p_chave text, p_recusar boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_row public.cap_conteudos; v_d jsonb; v_f jsonb; v_ev jsonb; v_novas jsonb; v_texto text; v_lido jsonb; v_min int;
  v_num jsonb; v_ins jsonb; v_res jsonb; v_teste jsonb; v_ok boolean; v_frase text;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select * into v_row from public.cap_conteudos cc where cc.capitulo_id = p_capitulo and cc.chave = p_chave and cc.tipo = 'topico';
  if not found or not (v_row.dados ? 'pedido') then raise exception 'conteudo-inexistente'; end if;
  v_d := v_row.dados;
  v_f := v_d -> 'pedido';
  if not exists (select 1 from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.id = v_row.pessoa and cp.lugar = v_pr.lugar and not (cp.id = any (v_pr.escondidos))) then raise exception 'conteudo-inexistente'; end if; -- o mesmo erro: não diz se o tópico existe noutro lugar
  if not exists (select 1 from jsonb_array_elements(public._cap_topicos(p_personagem, p_capitulo, v_row.pessoa)) t where t ->> 'chave' = p_chave and t ->> 'estado' = 'novo') then raise exception 'conteudo-inexistente'; end if;
  if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;

  if p_recusar and not coalesce((v_f ->> 'divida')::boolean, false) then
    select p.numeros into v_num from public.personagens p where p.id = p_personagem;
    v_ins := public._cap_insistir(v_num, v_pr.fome);
    v_res := case when v_ins -> 'pool' = 'null'::jsonb then public._cap_rolar(1, 0, 1)
      else public._cap_rolar((v_ins ->> 'parada')::int, v_pr.fome, (v_ins ->> 'dif')::int) end;
    perform public._cap_registrar(p_personagem, p_capitulo, p_chave || '#insistir', v_res);
    v_ok := public._cap_ok(v_res);
    v_teste := jsonb_build_object('pool', v_ins -> 'pool', 'dif', v_ins -> 'dif', 'res', v_res);
    v_min := case when v_ok then 5 else 25 end;
    -- Até a próxima carga, os capítulos não têm acerto nem falha: a frase genérica de acerto e a recusa atual.
    v_frase := case when v_ok then coalesce(v_f ->> 'acerto', replace('Você insiste com jeito, e {quem} acaba falando sem cobrar nada.', '{quem}', coalesce(v_f ->> 'quem', 'a testemunha')))
      else coalesce(v_f ->> 'falha', v_f ->> 'recusa') end;
  else
    v_min := case when p_recusar then 25 else (v_d ->> 'min')::int end;
    v_frase := v_f ->> case when p_recusar then 'recusa' else 'aceito' end;
  end if;
  v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
  v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_d -> 'pistas', '[]'::jsonb) || coalesce(v_d -> 'marcas', '[]'::jsonb));
  v_texto := concat_ws(E'\n\n', v_frase, v_d ->> 'texto');
  if not p_recusar and (v_f ->> 'divida')::boolean then
    select * into v_pr from public.progresso pr where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    insert into public.cap_dividas (personagem_id, capitulo_id, pessoa, quem, lugar, hora, pedido)
    values (p_personagem, p_capitulo, v_row.pessoa, v_f ->> 'quem', v_row.lugar, v_pr.hora, v_f ->> 'fala')
    on conflict (personagem_id, capitulo_id, pessoa) do nothing;
  end if;
  v_lido := jsonb_build_object('texto', v_texto);
  update public.progresso pr set feitos = pr.feitos || jsonb_build_object(p_chave, 'ok'), lidos = pr.lidos || jsonb_build_object(p_chave, v_lido)
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  return v_lido || jsonb_build_object('ok', true, 'min', v_min, 'recusou', p_recusar, 'pedido', case when p_recusar then null else v_f -> 'fala' end,
    'divida', not p_recusar and (v_f ->> 'divida')::boolean, 'teste', v_teste, 'acertou', v_ok,
    'novas', v_novas, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;
revoke all on function public.caso_pedido(text, uuid, text, boolean) from public, anon;
grant execute on function public.caso_pedido(text, uuid, text, boolean) to authenticated;
