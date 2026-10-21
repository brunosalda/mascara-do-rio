-- Formato "rota" (a fuga pela cidade, à moda da Carmen Sandiego): gerencia/proposta-carmen-v3.md, seções 6 e 9b.
-- O motor de capítulos continua o mesmo. Muda pouco:
--   capitulos.formato: 'caso' (o beco) ou 'rota' (a fuga). Na rota, publico.lugares traz todos os lugares do mapa
--     (nunca a rota), publico.tempos a tabela de viagens e publico.arquivo as fichas públicas da Ciranda.
--   capitulo_segredo.rota: { lugares: [a ordem da rota], avistamento, acao: { pool, dif } } e capitulo_segredo.culpado.
--   progresso: rota_passo (até onde o jogador seguiu o rastro), viagens_erradas e licenca (o suspeito da Licença de Caça).
--   caso_lugar: na rota, a viagem custa os minutos da tabela; chegar ao próximo lugar da rota avança o rastro
--     (marca 'rota-<lugar>', que abre as falas de quem viu o ladrão); chegar a outro lugar conta viagem errada.
--   caso_licenca(quem, tracos): só emite a Licença se os traços marcados vierem das pistas conquistadas (pelo menos
--     3, contando o do começo) e deixarem um suspeito só (parecer da avaliação: nada de chute).
--   caso_cercar(): no esconderijo, com a Licença certa, o banco rola a ação e encerra o capítulo como o caso_acusar.
--     Sem Licença, o ladrão foge e custa tempo; com a Licença errada, conta acusação errada (-200 na nota).

alter table public.capitulos add column if not exists formato text not null default 'caso';
alter table public.capitulos drop constraint if exists capitulos_formato_check;
alter table public.capitulos add constraint capitulos_formato_check check (formato in ('caso', 'rota'));
alter table public.capitulo_segredo add column if not exists rota jsonb;
alter table public.capitulo_segredo add column if not exists culpado text;
alter table public.progresso add column if not exists rota_passo integer not null default 0;
alter table public.progresso add column if not exists viagens_erradas integer not null default 0;
alter table public.progresso add column if not exists licenca text;

-- Os traços que o jogador já conquistou: o do começo (público) e os das pistas de traço (cap_pistas.tipo = 'traco',
-- sobre = 'categoria=valor').
create or replace function public._cap_tracos(p_pers uuid, p_cap text)
returns text[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(distinct t), '{}') from (
    select (c.publico -> 'tracoInicial' ->> 'categoria') || '=' || (c.publico -> 'tracoInicial' ->> 'valor') t
      from public.capitulos c where c.id = p_cap and c.publico ? 'tracoInicial'
    union all
    select cp.sobre from public.cap_pistas cp join public.progresso pr on pr.capitulo_id = cp.capitulo_id and cp.id = any (pr.pistas)
     where pr.personagem_id = p_pers and cp.capitulo_id = p_cap and cp.tipo = 'traco' and cp.sobre is not null
  ) x where t is not null $$;

-- Quem este personagem já prendeu nos capítulos anteriores da mesma temporada (sai do Arquivo).
create or replace function public._cap_presos(p_pers uuid, p_cap text)
returns text[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(s.culpado), '{}')
  from public.capitulos c0
  join public.capitulos c on c.temporada_id = c0.temporada_id and c.ordem < c0.ordem
  join public.capitulo_segredo s on s.capitulo_id = c.id and s.culpado is not null
  join public.progresso pr on pr.capitulo_id = c.id and pr.personagem_id = p_pers and pr.resolvido_em is not null
  where c0.id = p_cap $$;

-- A viagem e a cena do lugar. No formato 'caso', igual a antes.
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
  select coalesce(jsonb_agg(jsonb_build_object('id', cp.id, 'nome', cp.dados -> 'nome', 'sub', cp.dados -> 'sub', 'tipo', cp.dados -> 'tipo', 'figura', cp.dados -> 'figura',
      'x', cp.dados -> 'x', 'y', cp.dados -> 'y', 'falas', cp.dados -> 'falas',
      'conhecida', ('conheceu-' || cp.id) = any (v_pr.marcas),
      'assunto_novo', exists (select 1 from jsonb_array_elements(public._cap_topicos(p_personagem, p_capitulo, cp.id)) t where t ->> 'estado' = 'novo')) order by cp.id), '[]'::jsonb)
    into v_pessoas from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.lugar = p_lugar and not (cp.id = any (v_pr.escondidos));
  select coalesce(jsonb_agg(jsonb_build_object('id', substr(cc.chave, 3), 'chave', cc.chave, 'rotulo', cc.dados -> 'ponto' -> 'rotulo', 'x', cc.dados -> 'ponto' -> 'x', 'y', cc.dados -> 'ponto' -> 'y',
      'estado', coalesce(v_pr.feitos ->> cc.chave, 'novo')) order by cc.ordem), '[]'::jsonb)
    into v_pontos from public.cap_conteudos cc where cc.capitulo_id = p_capitulo and cc.tipo = 'exame' and cc.lugar = p_lugar and public._cap_ponto_visivel(v_pr, cc.chave, cc.dados);
  return jsonb_build_object('lugar', p_lugar, 'minutos', v_min, 'viagem', v_viagem, 'pessoas', v_pessoas, 'pontos', v_pontos, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- A Licença de Caça. p_tracos: { categoria: valor } marcados no Arquivo.
create or replace function public.caso_licenca(p_capitulo text, p_personagem uuid, p_quem text, p_tracos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_c public.capitulos; v_tem text[]; v_marc text[]; v_presos text[]; v_rest text[];
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select * into v_c from public.capitulos c where c.id = p_capitulo;
  if v_c.formato <> 'rota' then raise exception 'formato-errado'; end if;
  if v_pr.resolvido_em is not null then raise exception 'ja-resolvido'; end if;
  if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
  v_tem := public._cap_tracos(p_personagem, p_capitulo);
  select coalesce(array_agg(k || '=' || v), '{}') into v_marc from jsonb_each_text(coalesce(p_tracos, '{}'::jsonb)) e(k, v) where v <> '';
  if coalesce(array_length(v_tem, 1), 0) < 3 then
    return jsonb_build_object('licenca', null, 'motivo', 'poucos-tracos', 'conquistados', coalesce(array_length(v_tem, 1), 0), 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;
  if coalesce(array_length(v_marc, 1), 0) = 0 or not (v_marc <@ v_tem) then
    return jsonb_build_object('licenca', null, 'motivo', 'traco-sem-pista', 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;
  v_presos := public._cap_presos(p_personagem, p_capitulo);
  select coalesce(array_agg(s ->> 'id'), '{}') into v_rest
    from jsonb_array_elements(coalesce(v_c.publico -> 'arquivo' -> 'suspeitos', '[]'::jsonb)) s
    where not ((s ->> 'id') = any (v_presos))
      and not exists (select 1 from jsonb_each_text(p_tracos) e(k, v) where v <> '' and coalesce(s -> 'tracos' ->> k, '') <> v);
  if coalesce(array_length(v_rest, 1), 0) <> 1 or v_rest[1] <> p_quem then
    return jsonb_build_object('licenca', null, 'motivo', 'nao-sobra-um', 'restantes', coalesce(array_length(v_rest, 1), 0), 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;
  update public.progresso pr set licenca = p_quem where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  return jsonb_build_object('licenca', p_quem, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- O cerco no esconderijo.
create or replace function public.caso_cercar(p_capitulo text, p_personagem uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_c public.capitulos; v_seg public.capitulo_segredo; v_n int; v_ev jsonb; v_min int;
  v_num jsonb; v_parada int; v_rol jsonb; v_ok boolean; v_np int; v_todas int; v_nota int; v_selos text[] := '{}'; v_prox public.capitulos; v_texto text;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select * into v_c from public.capitulos c where c.id = p_capitulo;
  if v_c.formato <> 'rota' then raise exception 'formato-errado'; end if;
  if v_pr.resolvido_em is not null then return jsonb_build_object('preso', true, 'ja_resolvido', true, 'estado', public._cap_estado(p_personagem, p_capitulo)); end if;
  if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
  select * into v_seg from public.capitulo_segredo s where s.capitulo_id = p_capitulo;
  v_n := jsonb_array_length(v_seg.rota -> 'lugares');
  if v_pr.rota_passo <> v_n - 1 or v_pr.lugar <> (v_seg.rota -> 'lugares' ->> (v_n - 1)) then raise exception 'fora-do-esconderijo'; end if;

  if v_pr.licenca is null then
    v_min := coalesce((v_c.custos ->> 'semLicenca')::int, 30);
    v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
    return jsonb_build_object('preso', false, 'motivo', 'sem-licenca', 'minutos', v_min, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;
  if v_pr.licenca <> v_seg.culpado then
    v_min := coalesce((v_c.custos ->> 'acusacaoErrada')::int, 60);
    update public.progresso pr set acusacoes_erradas = pr.acusacoes_erradas + 1, licenca = null where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
    return jsonb_build_object('preso', false, 'motivo', 'licenca-errada', 'erros', v_pr.acusacoes_erradas + 1, 'minutos', v_min, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;

  -- A ação: o banco rola. Perder também prende, só sem o bônus da ação.
  select p.numeros into v_num from public.personagens p where p.id = p_personagem;
  v_parada := greatest(1, coalesce(public._cap_parada(v_num, coalesce(v_seg.rota -> 'acao' -> 'pool', '["destreza","atletismo"]'::jsonb)), 4));
  v_rol := public._cap_rolar(v_parada, v_pr.fome, coalesce((v_seg.rota -> 'acao' ->> 'dif')::int, 3));
  v_ok := coalesce(public._cap_ok(v_rol), false);
  perform public._cap_registrar(p_personagem, p_capitulo, 'cerco', v_rol);
  update public.progresso pr set acao_vencida = v_ok where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;

  select * into v_pr from public.progresso pr where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  v_np := coalesce(array_length(v_pr.pistas, 1), 0);
  select count(*) into v_todas from public.cap_pistas cp where cp.capitulo_id = p_capitulo;
  -- Nota da rota (parecer da avaliação, aceito pela coordenação): cada viagem errada vale -15, até -100, no lugar
  -- do desconto por tempo real. O que não é erro soma no máximo 180 (100 + 60 de pistas + 20 da ação), abaixo dos
  -- 200 de uma Licença errada: quem acerta nunca fica atrás de quem chuta.
  v_nota := greatest(0, public._cap_nota(v_pr.acusacoes_erradas, v_pr.dicas_pedidas, 0, v_c.tempo_referencia_min, v_np, v_c.pistas_minimas, v_pr.acao_vencida)
    - least(100, 15 * v_pr.viagens_erradas));
  if v_pr.acusacoes_erradas = 0 then v_selos := v_selos || 'sem-erros'::text; end if;
  if v_pr.dicas_pedidas = 0 then v_selos := v_selos || 'sem-dicas'::text; end if;
  if v_todas > 0 and v_np >= v_todas then v_selos := v_selos || 'detetive'::text; end if;
  if not exists (select 1 from public.progresso o where o.capitulo_id = p_capitulo and o.resolvido_em is not null) then v_selos := v_selos || 'primeiro'::text; end if;
  update public.progresso pr set resolvido_em = now(), nota = v_nota, selos = v_selos where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  update public.progresso pr set selos = array_remove(pr.selos, 'mais-rapido') where pr.capitulo_id = p_capitulo and 'mais-rapido' = any (pr.selos);
  update public.progresso pr set selos = pr.selos || 'mais-rapido'::text
  where (pr.personagem_id, pr.capitulo_id) = (select o.personagem_id, o.capitulo_id from public.progresso o where o.capitulo_id = p_capitulo and o.resolvido_em is not null order by o.tempo_ativo_seg, o.resolvido_em limit 1);
  select * into v_prox from public.capitulos c where c.temporada_id = v_c.temporada_id and c.ordem = v_c.ordem + 1;
  if v_prox.id is not null then
    insert into public.progresso (personagem_id, capitulo_id, lugar, hora, fome, vontade)
    values (p_personagem, v_prox.id, v_prox.publico ->> 'lugarInicial', v_prox.relogio_inicio, v_pr.fome, coalesce((v_num ->> 'forcaVontade')::int, 3))
    on conflict do nothing;
  end if;
  v_texto := v_seg.fecho -> 'texto' ->> coalesce(v_seg.fecho ->> 'padrao', '');
  return jsonb_build_object('preso', true, 'acao', jsonb_build_object('ok', v_ok, 'rolagem', v_rol), 'nota', v_nota,
    'selos', (select to_jsonb(pr.selos) from public.progresso pr where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo),
    'fecho', jsonb_build_object('paineis', v_seg.fecho -> 'paineis', 'texto', v_texto,
      'escolhas', (select coalesce(jsonb_agg(jsonb_build_object('id', e -> 'id', 'rotulo', e -> 'rotulo')), '[]'::jsonb) from jsonb_array_elements(coalesce(v_seg.fecho -> 'escolhas', '[]'::jsonb)) e)),
    'proximo', case when v_prox.id is null then null else jsonb_build_object('id', v_prox.id, 'titulo', v_prox.titulo) end,
    'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- O estado ganha o que a tela da rota precisa: a Licença, o percurso já seguido, as viagens erradas, os traços conquistados.
do $$
declare v_def text; a1 text; b1 text;
begin
  select pg_get_functiondef('public._cap_estado(uuid, text)'::regprocedure) into v_def;
  a1 := '''tempo_ativo_seg'', v_pr.tempo_ativo_seg, ''acao_vencida'', v_pr.acao_vencida,';
  b1 := a1 || ' ''licenca'', v_pr.licenca, ''viagens_erradas'', v_pr.viagens_erradas, ''rota_passo'', v_pr.rota_passo,'
     || ' ''percurso'', (select coalesce(jsonb_agg(o.l order by o.i), ''[]''::jsonb) from public.capitulo_segredo s, jsonb_array_elements_text(coalesce(s.rota -> ''lugares'', ''[]''::jsonb)) with ordinality o(l, i) where s.capitulo_id = p_cap and o.i <= v_pr.rota_passo + 1),'
     || ' ''tracos'', to_jsonb(public._cap_tracos(p_pers, p_cap)),'
     || ' ''presos'', to_jsonb(public._cap_presos(p_pers, p_cap)),';
  if position(a1 in v_def) = 0 then raise exception 'trecho de _cap_estado não encontrado'; end if;
  execute replace(v_def, a1, b1);
end $$;

-- O ranking do capítulo: na rota, as notícias dos rivais mostram só o progresso (em que lugar da rota cada um está,
-- pelo número, e se já tem a Licença), nunca o lugar.
create or replace function public.caso_ranking_capitulo(p_capitulo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_t public.temporadas; v_rota boolean; v_lista jsonb;
begin
  select t.* into v_t from public.capitulos c join public.temporadas t on t.id = c.temporada_id where c.id = p_capitulo;
  select c.formato = 'rota' into v_rota from public.capitulos c where c.id = p_capitulo;
  if v_t.id is null or not (v_t.situacao <> 'teste' or auth.uid() = any (v_t.visivel_para)) then raise exception 'capitulo-inexistente'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('nome', p.nome, 'cla', coalesce(p.estado ->> 'cla_aparente', p.ficha ->> 'cla'),
      'resolvido_em', pr.resolvido_em, 'nota', pr.nota, 'erros', pr.acusacoes_erradas, 'selos', to_jsonb(pr.selos), 'voce', p.user_id = auth.uid(),
      'passo', case when v_rota then pr.rota_passo + 1 end, 'licenca', case when v_rota then pr.licenca is not null end,
      'viagens_erradas', case when v_rota then pr.viagens_erradas end)
    order by pr.resolvido_em is null, pr.nota desc nulls last, pr.acusacoes_erradas, pr.resolvido_em), '[]'::jsonb)
  into v_lista from public.progresso pr join public.personagens p on p.id = pr.personagem_id where pr.capitulo_id = p_capitulo;
  return v_lista;
end $$;

-- No formato rota não há as três lacunas: a resposta fica vazia, e uma acusação "certa" seria de graça.
-- O capítulo de rota só se resolve pelo caso_cercar.
do $$
declare v_def text; a1 text; b1 text;
begin
  select pg_get_functiondef('public.caso_acusar(text, uuid, text, text, text)'::regprocedure) into v_def;
  a1 := 'select * into v_c from public.capitulos c where c.id = p_capitulo;';
  b1 := a1 || ' if v_c.formato = ''rota'' then raise exception ''formato-errado''; end if;';
  if position(a1 in v_def) = 0 then raise exception 'trecho de caso_acusar não encontrado'; end if;
  execute replace(v_def, a1, b1);
end $$;

revoke all on function public._cap_tracos(uuid, text), public._cap_presos(uuid, text) from public, anon, authenticated;
revoke all on function public.caso_licenca(text, uuid, text, jsonb), public.caso_cercar(text, uuid) from public, anon;
grant execute on function public.caso_licenca(text, uuid, text, jsonb), public.caso_cercar(text, uuid) to authenticated;
