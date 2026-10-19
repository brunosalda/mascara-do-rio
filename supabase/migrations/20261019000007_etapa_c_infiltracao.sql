-- Etapa C, passo 3: a infiltração conferida pelo banco (a mesma conta de passoDaInfiltracao, em
-- js/caso/simulacao.js; QUALQUER MUDANÇA LÁ TEM DE VIR PARA CÁ).
-- A abordagem com "cena": "infiltracao" se joga em caso_infiltracao: 'inicio' sorteia a semente; no fim, a
-- tela manda o caminho, e o banco refaz a cena e só aceita "conseguiu" se a conta dele também der isso.
-- "Deixar os dados decidirem" é o caso_agir de sempre (o teste da abordagem).

alter table public.progresso add column if not exists cena_atual jsonb;  -- { chave, i, semente, inicio }

-- A direção (das 24) mais perto do vetor (vx, vy).
create or replace function public._sim_dir(vx bigint, vy bigint) returns int
language plpgsql immutable set search_path = '' as $$
declare c int[] := public._sim_cos(); s int[] := public._sim_sen(); melhor int := 0; nota bigint; p bigint;
begin
  for k in 0 .. 23 loop
    p := vx * c[k + 1] + vy * s[k + 1];
    if nota is null or p > nota then nota := p; melhor := k; end if;
  end loop;
  return melhor;
end $$;

-- cfg: { g, inicio: [x, y], alvo: [x, y], raioAlvo, ficar, raioVisao, abertura, semente,
--        vigias: [{ rota: [[x, y], ...], vel, pausa }] } (tudo em inteiros × 10000).
create or replace function public._sim_infiltracao(cfg jsonb, caminho bigint[]) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  c int[] := public._sim_cos(); s int[] := public._sim_sen(); giro int[] := array[0, 3, 0, 21];
  g jsonb := cfg -> 'g'; gk int := (cfg -> 'g' ->> 'K')::int; gh int := (cfg -> 'g' ->> 'H')::int;
  alvox bigint := (cfg -> 'alvo' ->> 0)::bigint; alvoy bigint := (cfg -> 'alvo' ->> 1)::bigint;
  raio_alvo int := (cfg ->> 'raioAlvo')::int; ficar int := (cfg ->> 'ficar')::int;
  raio int := (cfg ->> 'raioVisao')::int; abertura int := (cfg ->> 'abertura')::int;
  semente bigint := greatest(1, (cfg ->> 'semente')::bigint % 2147483647);
  vig jsonb := cfg -> 'vigias'; nv int := jsonb_array_length(cfg -> 'vigias');
  npassos int := coalesce(array_length(caminho, 1), 0) / 2;
  vx bigint[] := '{}'; vy bigint[] := '{}'; valvo int[] := '{}'; vdir int[] := '{}'; vbase int[] := '{}'; vate int[] := '{}'; vdesde int[] := '{}';
  t int := 0; fim text; visto int := 0; no_alvo int := 0; viu boolean; jx bigint; jy bigint; mx int[];
  rota jsonb; nr int; wx bigint; wy bigint; dx bigint; dy bigint; n bigint; passo int; lx bigint; ly bigint; fase int;
begin
  if npassos < 1 then return jsonb_build_object('invalido', 'sem caminho'); end if;
  if abs(caminho[1] - (cfg -> 'inicio' ->> 0)::bigint) > 60 or abs(caminho[2] - (cfg -> 'inicio' ->> 1)::bigint) > 60 then
    return jsonb_build_object('invalido', 'largada');
  end if;
  for i in 1 .. nv loop
    rota := vig -> (i - 1) -> 'rota';
    nr := jsonb_array_length(rota);
    vx[i] := (rota -> 0 ->> 0)::bigint;
    vy[i] := (rota -> 0 ->> 1)::bigint;
    valvo[i] := 1 % nr;
    vdir[i] := public._sim_dir(((rota -> (1 % nr) ->> 0)::bigint - vx[i]) * 7, ((rota -> (1 % nr) ->> 1)::bigint - vy[i]) * 6);
    vbase[i] := vdir[i];
    vate[i] := 0;
    vdesde[i] := 0;
  end loop;

  while fim is null and t < npassos loop
    jx := caminho[2 * t + 1];
    jy := caminho[2 * t + 2];
    if not (public._sim_livre(g, jx, jy) or public._sim_livre(g, jx + 80, jy) or public._sim_livre(g, jx - 80, jy)
            or public._sim_livre(g, jx, jy + 80) or public._sim_livre(g, jx, jy - 80)) then
      return jsonb_build_object('invalido', 'fora do chão', 'passo', t);
    end if;
    if t > 0 then
      mx := public._sim_passo(gk, gh, caminho[2 * t], 1000, 1000);
      mx := array[(mx[1] * 13) / 10 + 30, (mx[2] * 13) / 10 + 30];
      if abs(jx - caminho[2 * t - 1]) > mx[1] or abs(jy - caminho[2 * t]) > mx[2] then
        return jsonb_build_object('invalido', 'rápido demais', 'passo', t);
      end if;
    end if;

    viu := false;
    for i in 1 .. nv loop
      rota := vig -> (i - 1) -> 'rota';
      nr := jsonb_array_length(rota);
      if t < vate[i] then
        fase := ((t - vdesde[i]) / 20) % 4;
        vdir[i] := (vbase[i] + giro[fase + 1]) % 24;
      else
        wx := (rota -> valvo[i] ->> 0)::bigint;
        wy := (rota -> valvo[i] ->> 1)::bigint;
        dx := wx - vx[i];
        dy := wy - vy[i];
        n := public._sim_raiz(dx * dx + dy * dy);
        passo := (vig -> (i - 1) ->> 'vel')::int / 20;
        if n <= passo then
          vx[i] := wx; vy[i] := wy;
          valvo[i] := (valvo[i] + 1) % nr;
          semente := (semente * 48271) % 2147483647;
          vdesde[i] := t;
          vate[i] := t + (vig -> (i - 1) ->> 'pausa')::int + (semente % 20)::int;
          vbase[i] := vdir[i];
        else
          vx[i] := vx[i] + (passo * dx) / n;
          vy[i] := vy[i] + (passo * dy) / n;
          vdir[i] := public._sim_dir(dx * 7, dy * 6);
        end if;
      end if;
      -- No leque? (a visão pesa y em dobro: v = (dx × 7, dy × 6))
      lx := (jx - vx[i]) * 7;
      ly := (jy - vy[i]) * 6;
      n := public._sim_raiz(lx * lx + ly * ly);
      if n < raio and (n = 0 or lx * c[vdir[i] + 1] + ly * s[vdir[i] + 1] >= abertura::bigint * n) then viu := true; end if;
    end loop;
    visto := (case when viu then visto + 1 else 0 end);
    if visto > 12 then fim := 'visto'; end if;
    lx := (jx - alvox) * 7;
    ly := (jy - alvoy) * 6;
    no_alvo := (case when public._sim_raiz(lx * lx + ly * ly) < raio_alvo then no_alvo + 1 else 0 end);
    if fim is null and no_alvo >= ficar then fim := 'conseguiu'; end if;
    t := t + 1;
    if fim is null and t >= 1200 then fim := 'visto'; end if;
  end loop;
  return jsonb_build_object('fim', coalesce(fim, 'continua'), 'passo', t);
end $$;

-- A cena de infiltração de uma abordagem: 'inicio' ou o fim ('conseguiu', 'visto', 'distraido').
create or replace function public.caso_infiltracao(p_capitulo text, p_personagem uuid, p_chave text, p_abordagem int, p_resultado text, p_registro jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_pr public.progresso; v_num jsonb; v_pub jsonb; v_cfg jsonb; v_row public.cap_conteudos; v_d jsonb; v_a jsonb; v_sit jsonb; v_resultados jsonb;
  v_semente bigint; v_ok boolean := false; v_conferido jsonb; v_caminho bigint[]; v_seg numeric; v_r jsonb; v_ev jsonb; v_novas jsonb; v_lido jsonb;
  I constant int := 10000;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
  select c.publico into v_pub from public.capitulos c where c.id = p_capitulo;
  v_cfg := v_pub -> 'infiltracao';
  select * into v_row from public.cap_conteudos cc where cc.capitulo_id = p_capitulo and cc.chave = p_chave and cc.tipo = 'exame';
  if not found or v_cfg is null or v_row.lugar <> v_pr.lugar or v_pr.lugar <> v_cfg ->> 'lugar' or not public._cap_ponto_visivel(v_pr, p_chave, v_row.dados) then
    raise exception 'acao-indisponivel';
  end if;
  v_d := v_row.dados;
  v_a := v_d -> 'abordagens' -> p_abordagem;
  select p.numeros into v_num from public.personagens p where p.id = p_personagem;
  if v_a is null or v_a ->> 'cena' is distinct from 'infiltracao' then raise exception 'acao-indisponivel'; end if;

  if p_resultado = 'inicio' then
    v_sit := public._cap_situacao(v_a, p_chave || '#' || p_abordagem, v_pr, v_num);
    if not (v_sit ->> 'pode')::boolean then raise exception 'abordagem-indisponivel'; end if;
    v_semente := 1 + (('x' || lpad(encode(extensions.gen_random_bytes(4), 'hex'), 16, '0'))::bit(64)::bigint % 2147483646);
    update public.progresso pr set cena_atual = jsonb_build_object('chave', p_chave, 'i', p_abordagem, 'semente', v_semente, 'inicio', now())
    where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    return jsonb_build_object('inicio', true, 'semente', v_semente);
  end if;

  if v_pr.cena_atual is null or v_pr.cena_atual ->> 'chave' <> p_chave or (v_pr.cena_atual ->> 'i')::int <> p_abordagem then raise exception 'acao-indisponivel'; end if;
  if p_resultado = 'conseguiu' then
    v_caminho := array(select (v)::bigint from jsonb_array_elements_text(coalesce(p_registro -> 'caminho', '[]'::jsonb)) v);
    v_seg := extract(epoch from now() - (v_pr.cena_atual ->> 'inicio')::timestamptz);
    if (p_registro ->> 'semente')::bigint is distinct from (v_pr.cena_atual ->> 'semente')::bigint then
      v_conferido := jsonb_build_object('motivo', 'semente');
    elsif v_seg * 1000 < (coalesce(array_length(v_caminho, 1), 0) / 2) * 50 - 3000 or v_seg > 90 then
      v_conferido := jsonb_build_object('motivo', 'tempo');
    else
      v_conferido := public._sim_infiltracao(jsonb_build_object(
        'g', v_cfg -> 'geoInteira',
        'inicio', jsonb_build_array(round((v_cfg -> 'inicio' ->> 0)::numeric * I), round((v_cfg -> 'inicio' ->> 1)::numeric * I)),
        'alvo', jsonb_build_array(round((v_cfg -> 'alvo' ->> 0)::numeric * I), round((v_cfg -> 'alvo' ->> 1)::numeric * I)),
        'raioAlvo', v_cfg -> 'raioAlvo', 'ficar', v_cfg -> 'ficar', 'raioVisao', v_cfg -> 'raioVisao', 'abertura', v_cfg -> 'abertura',
        'semente', v_pr.cena_atual -> 'semente',
        'vigias', (select jsonb_agg(jsonb_build_object('vel', vg -> 'vel', 'pausa', vg -> 'pausa',
            'rota', (select jsonb_agg(jsonb_build_array(round((pt ->> 0)::numeric * I), round((pt ->> 1)::numeric * I)) order by o) from jsonb_array_elements(vg -> 'rota') with ordinality r(pt, o)))
          order by ov) from jsonb_array_elements(v_cfg -> 'vigias') with ordinality q(vg, ov))), v_caminho);
      v_ok := coalesce(v_conferido ->> 'fim' = 'conseguiu', false);  -- caminho inválido = não conseguiu
    end if;
  elsif p_resultado not in ('visto', 'distraido') then
    raise exception 'acao-indisponivel';
  end if;

  -- O resultado, como uma abordagem de caso_agir (sem dados): tempo, pistas, feitos e o texto.
  v_resultados := v_d -> 'resultados';
  v_r := v_resultados -> (case when v_ok then v_a ->> 'sucesso' else v_a ->> 'falha' end);
  update public.progresso pr set tentados = pr.tentados || (p_chave || '#' || p_abordagem), cena_atual = null,
    acao_vencida = pr.acao_vencida or v_ok
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  v_ev := public._cap_tempo(p_personagem, p_capitulo, coalesce((v_d ->> 'min')::int, 0));
  v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_r -> 'pistas', '[]'::jsonb) || coalesce(v_r -> 'marcas', '[]'::jsonb));
  v_lido := jsonb_build_object('abordagem', v_a -> 'rotulo', 'texto', v_r -> 'texto', 'cena', 'infiltracao', 'conseguiu', v_ok);
  update public.progresso pr set
    feitos = pr.feitos || jsonb_build_object(p_chave, (case when v_ok then 'ok' when pr.feitos ->> p_chave = 'ok' then 'ok' else 'tentado' end)),
    lidos = (case when v_ok then pr.lidos || jsonb_build_object(p_chave, v_lido) else pr.lidos end)
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  return v_lido || jsonb_build_object('ok', v_ok, 'conferido', v_conferido, 'novas', v_novas, 'eventos', v_ev, 'pode_repetir', false,
    'outras', not v_ok, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- A lista de abordagens passa a dizer qual é uma cena jogada.
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.caso_agir(text, uuid, text, integer, boolean)'::regprocedure) into v_def;
  if position('jsonb_build_object(''i'', o - 1, ''rotulo'', a -> ''rotulo'')' in v_def) = 0 then raise exception 'trecho de caso_agir não encontrado'; end if;
  v_def := replace(v_def, 'jsonb_build_object(''i'', o - 1, ''rotulo'', a -> ''rotulo'')', 'jsonb_build_object(''i'', o - 1, ''rotulo'', a -> ''rotulo'', ''cena'', a -> ''cena'')');
  execute v_def;
end $$;

do $$
declare v_f record;
begin
  for v_f in select p.oid::regprocedure as assinatura, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and (p.proname in ('_sim_dir', '_sim_infiltracao', 'caso_infiltracao')) loop
    execute format('revoke all on function %s from public, anon, authenticated', v_f.assinatura);
    if v_f.proname = 'caso_infiltracao' then execute format('grant execute on function %s to authenticated', v_f.assinatura); end if;
  end loop;
end $$;
