-- Carmen 2026: o favor e o pedido das testemunhas, e a pergunta conforme quem ouve.
-- NÃO APLICADA: vai junto da carga única dos textos, com a permissão do Bruno (pedido da coordenação, 02/11).
--
-- 1. caso_lugar devolve o tipo da pessoa (mortal, carnical ou vampiro), para a tela montar a pergunta.
-- 2. _cap_topicos devolve, enquanto o tópico é novo, o que a testemunha pede antes de falar ("pedido", a fala)
--    e se isso deixa dívida ("divida": o favor do vampiro deixa; o pedido de uma testemunha comum, não),
--    com o botão de atender ("botao", o pedeRotulo da testemunha comum).
-- 3. caso_pedido: o jogador atende (o tempo normal; no favor, a dívida) ou recusa e insiste (25 minutos, sem dívida).
-- 4. cap_dividas: as dívidas de cada personagem, para o Narrador cobrar numa noite qualquer.
--
-- Os textos vêm prontos da carga (ferramentas/carmen-para-banco.mjs) em dados.pedido: { divida, fala, quem,
-- botao, aceito, recusa }, com o nome já preenchido.

-- 4. As dívidas. Uma por pessoa e capítulo: aceitar de novo, depois de recomeçar, não duplica.
create table public.cap_dividas (
  personagem_id uuid not null references public.personagens (id) on delete cascade,
  capitulo_id   text not null references public.capitulos (id) on delete cascade,
  pessoa        text not null,
  quem          text not null,
  lugar         text not null,
  hora          int not null,
  pedido        text not null,
  criada_em     timestamptz not null default now(),
  primary key (personagem_id, capitulo_id, pessoa)
);
alter table public.cap_dividas enable row level security;
revoke all on public.cap_dividas from anon, authenticated;
grant select on public.cap_dividas to authenticated;
create policy "ver as próprias dívidas" on public.cap_dividas
  for select to authenticated
  using (exists (select 1 from public.personagens p where p.id = cap_dividas.personagem_id and p.user_id = auth.uid()));

-- 2. Os tópicos à vista, agora com o pedido da testemunha enquanto o tópico é novo.
create or replace function public._cap_topicos(p_pers uuid, p_cap text, p_pessoa text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_pr public.progresso; v_num jsonb; v_pub jsonb; v_ach text[]; v_r record; v_d jsonb; v_estado text; v_saida jsonb := '[]'::jsonb;
begin
  select * into v_pr from public.progresso pr where pr.personagem_id = p_pers and pr.capitulo_id = p_cap;
  select p.numeros into v_num from public.personagens p where p.id = p_pers;
  select c.publico into v_pub from public.capitulos c where c.id = p_cap;
  v_ach := v_pr.pistas || v_pr.marcas;
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
      || case when v_d ? 'pedido' and v_estado = 'novo' then jsonb_build_object('pedido', v_d -> 'pedido' -> 'fala', 'divida', v_d -> 'pedido' -> 'divida', 'botao', v_d -> 'pedido' -> 'botao') else '{}'::jsonb end);
  end loop;
  return v_saida;
end $$;

-- 1. O lugar: igual ao de 20261021000001_formato_rota.sql, com o tipo da pessoa ('pessoa') na lista.
create or replace function public.caso_lugar(p_capitulo text, p_personagem uuid, p_lugar text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_pub jsonb; v_cust jsonb; v_fmt text; v_de jsonb; v_para jsonb; v_min int := 0; v_ev jsonb := '[]'::jsonb;
  v_pessoas jsonb; v_pontos jsonb; v_rota jsonb; v_n int; v_idx int; v_tipo text; v_viagem jsonb := null; v_voo boolean;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select c.publico, c.custos, c.formato into v_pub, v_cust, v_fmt from public.capitulos c where c.id = p_capitulo;
  v_para := v_pub -> 'lugares' -> p_lugar;
  if v_para is null then raise exception 'conteudo-inexistente'; end if;
  if p_lugar <> v_pr.lugar then
    if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
    if v_fmt = 'rota' then
      if v_pr.resolvido_em is not null then raise exception 'ja-resolvido'; end if;
      select (t ->> 'minutos')::int, coalesce((t ->> 'voo')::boolean, false) into v_min, v_voo
        from jsonb_array_elements(coalesce(v_pub -> 'tempos', '[]'::jsonb)) t
        where t ->> 'de' = v_pr.lugar and t ->> 'para' = p_lugar limit 1;
      if v_min is null then raise exception 'sem-viagem-direta'; end if;
      select s.rota into v_rota from public.capitulo_segredo s where s.capitulo_id = p_capitulo;
      v_n := jsonb_array_length(v_rota -> 'lugares');
      select (o.i - 1)::int into v_idx from jsonb_array_elements_text(v_rota -> 'lugares') with ordinality o(l, i) where o.l = p_lugar;
      if v_idx = v_pr.rota_passo + 1 then
        v_tipo := 'certa';
        update public.progresso pr set rota_passo = v_idx, marcas = pr.marcas || ('rota-' || p_lugar) where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
      elsif v_idx is not null and v_idx <= v_pr.rota_passo then
        v_tipo := 'volta';
      else
        v_tipo := 'errada';
        update public.progresso pr set viagens_erradas = pr.viagens_erradas + 1 where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
      end if;
      v_viagem := jsonb_build_object('tipo', v_tipo, 'minutos', v_min, 'voo', v_voo,
        'esconderijo', v_tipo in ('certa', 'volta') and v_idx = v_n - 1,
        'avistamento', case when v_tipo in ('certa', 'volta') and v_idx = v_n - 1 then v_rota ->> 'avistamento' end);
    else
      v_de := v_pub -> 'lugares' -> v_pr.lugar;
      v_min := case when v_de ->> 'dentro' = p_lugar or v_para ->> 'dentro' = v_pr.lugar or (v_de ->> 'dentro' is not null and v_de ->> 'dentro' = v_para ->> 'dentro') then 2
        else coalesce((v_cust ->> 'viagem')::int, 30) end;
    end if;
    update public.progresso pr set lugar = p_lugar where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
    select * into v_pr from public.progresso pr where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', cp.id, 'nome', cp.dados -> 'nome', 'sub', cp.dados -> 'sub', 'tipo', cp.dados -> 'tipo', 'pessoa', cp.dados -> 'pessoa',
      'figura', cp.dados -> 'figura', 'x', cp.dados -> 'x', 'y', cp.dados -> 'y', 'falas', cp.dados -> 'falas',
      'conhecida', ('conheceu-' || cp.id) = any (v_pr.marcas),
      'assunto_novo', exists (select 1 from jsonb_array_elements(public._cap_topicos(p_personagem, p_capitulo, cp.id)) t where t ->> 'estado' = 'novo')) order by cp.id), '[]'::jsonb)
    into v_pessoas from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.lugar = p_lugar and not (cp.id = any (v_pr.escondidos));
  select coalesce(jsonb_agg(jsonb_build_object('id', substr(cc.chave, 3), 'chave', cc.chave, 'rotulo', cc.dados -> 'ponto' -> 'rotulo', 'x', cc.dados -> 'ponto' -> 'x', 'y', cc.dados -> 'ponto' -> 'y',
      'estado', coalesce(v_pr.feitos ->> cc.chave, 'novo')) order by cc.ordem), '[]'::jsonb)
    into v_pontos from public.cap_conteudos cc where cc.capitulo_id = p_capitulo and cc.tipo = 'exame' and cc.lugar = p_lugar and public._cap_ponto_visivel(v_pr, cc.chave, cc.dados);
  return jsonb_build_object('lugar', p_lugar, 'minutos', v_min, 'viagem', v_viagem, 'pessoas', v_pessoas, 'pontos', v_pontos, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- 3. A resposta ao pedido. Atender: o tempo do tópico, as pistas e, se for favor, a dívida. Recusar e insistir:
-- 25 minutos, as mesmas pistas e nenhuma dívida. Só vale para um tópico com pedido, à vista e ainda novo.
create or replace function public.caso_pedido(p_capitulo text, p_personagem uuid, p_chave text, p_recusar boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_row public.cap_conteudos; v_d jsonb; v_f jsonb; v_ev jsonb; v_novas jsonb; v_texto text; v_lido jsonb; v_min int;
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

  v_min := case when p_recusar then 25 else (v_d ->> 'min')::int end;
  v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
  v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_d -> 'pistas', '[]'::jsonb) || coalesce(v_d -> 'marcas', '[]'::jsonb));
  v_texto := concat_ws(E'\n\n', v_f ->> case when p_recusar then 'recusa' else 'aceito' end, v_d ->> 'texto');
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
    'divida', not p_recusar and (v_f ->> 'divida')::boolean,
    'novas', v_novas, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;
revoke all on function public.caso_pedido(text, uuid, text, boolean) from public, anon;
grant execute on function public.caso_pedido(text, uuid, text, boolean) to authenticated;

-- 5. caso_agir não deixa pular o pedido: um tópico com pedido, ainda novo, só se responde por caso_pedido
-- (pedido da avaliação, 02/11, 16h00). A função atual (já alterada no banco pelas etapas C) passa a se chamar
-- _caso_agir_base, sem acesso direto, e o caso_agir novo confere o pedido antes de chamá-la. A conferência vem
-- depois do acesso (_cap_progresso: a personagem é de quem chama) e só vale para o pedido à vista (a pessoa no
-- lugar e o tópico novo em _cap_topicos); o resto, inclusive os erros, fica com a função de sempre.
alter function public.caso_agir(text, uuid, text, integer, boolean) rename to _caso_agir_base;
revoke all on function public._caso_agir_base(text, uuid, text, integer, boolean) from public, anon, authenticated;

create or replace function public.caso_agir(p_capitulo text, p_personagem uuid, p_chave text, p_abordagem int default null, p_usar_vontade boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_pessoa text;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  select cc.pessoa into v_pessoa from public.cap_conteudos cc
    where cc.capitulo_id = p_capitulo and cc.chave = p_chave and cc.tipo = 'topico' and cc.dados ? 'pedido';
  if v_pessoa is not null
     and exists (select 1 from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.id = v_pessoa and cp.lugar = v_pr.lugar and not (cp.id = any (v_pr.escondidos)))
     and exists (select 1 from jsonb_array_elements(public._cap_topicos(p_personagem, p_capitulo, v_pessoa)) t where t ->> 'chave' = p_chave and t ? 'pedido') then
    raise exception 'use-caso-pedido';
  end if;
  return public._caso_agir_base(p_capitulo, p_personagem, p_chave, p_abordagem, p_usar_vontade);
end $$;
revoke all on function public.caso_agir(text, uuid, text, integer, boolean) from public, anon;
grant execute on function public.caso_agir(text, uuid, text, integer, boolean) to authenticated;
