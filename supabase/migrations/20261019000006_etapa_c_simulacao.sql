-- Etapa C, passo 2: o banco refaz a fuga da perseguição e confere o "pego".
-- É a mesma conta de js/caso/simulacao.js, em números inteiros e com divisão truncada (no Postgres, a
-- divisão de inteiros já trunca para zero, como Math.trunc). QUALQUER MUDANÇA LÁ TEM DE VIR PARA CÁ.
--
-- Como funciona:
-- 1. caso_perseguicao(..., 'inicio') sorteia a semente da fuga, guarda com a hora e devolve a semente.
-- 2. A tela roda a fuga com essa semente e, no fim, manda o caminho do jogador (uma posição por passo de
--    50 ms), as arrancadas e a ordem "Pare!".
-- 3. O banco refaz a fuga com a mesma semente e o mesmo caminho e confere:
--    - o caminho começa perto de quem foge e nunca sai do chão;
--    - o jogador nunca anda mais do que pode (com folga de 30% para a amostragem);
--    - as arrancadas respeitam o poder ou a Força de Vontade (que o banco desconta);
--    - a fuga refeita termina mesmo em "pego";
--    - o tempo de verdade desde o começo cobre o caminho (não dá para mandar 20 s de corrida em 2 s).
--    Se algo falhar, vale "escapou".

alter table public.progresso add column if not exists perseguicao_semente bigint;

-- As 24 direções (cos e sen × 1000), as mesmas de simulacao.js.
create or replace function public._sim_cos() returns int[] language sql immutable set search_path = '' as $$
  select array[1000, 966, 866, 707, 500, 259, 0, -259, -500, -707, -866, -966, -1000, -966, -866, -707, -500, -259, 0, 259, 500, 707, 866, 966] $$;
create or replace function public._sim_sen() returns int[] language sql immutable set search_path = '' as $$
  select array[0, 259, 500, 707, 866, 966, 1000, 966, 866, 707, 500, 259, 0, -259, -500, -707, -866, -966, -1000, -966, -866, -707, -500, -259] $$;

create or replace function public._sim_raiz(n bigint) returns bigint
language plpgsql immutable set search_path = '' as $$
declare x bigint; y bigint;
begin
  if n <= 0 then return 0; end if;
  x := n;
  y := (x + 1) / 2;
  while y < x loop x := y; y := (x + n / x) / 2; end loop;
  return x;
end $$;

create or replace function public._sim_dist(ax bigint, ay bigint, bx bigint, by bigint) returns bigint
language sql immutable set search_path = '' as $$
  select public._sim_raiz(((ax - bx) * 7) * ((ax - bx) * 7) + ((ay - by) * 3) * ((ay - by) * 3)) / 3 $$;

create or replace function public._sim_dentro(x bigint, y bigint, px int[], py int[]) returns boolean
language plpgsql immutable set search_path = '' as $$
declare n int := coalesce(array_length(px, 1), 0); j int; d boolean := false; dy bigint; esq bigint; dir bigint;
begin
  if n = 0 then return false; end if;
  j := n;
  for i in 1 .. n loop
    if (py[i] > y) <> (py[j] > y) then
      dy := py[j] - py[i];
      esq := (x - px[i]) * dy;
      dir := (px[j] - px[i]) * (y - py[i]);
      if (dy > 0 and esq < dir) or (dy < 0 and esq > dir) then d := not d; end if;
    end if;
    j := i;
  end loop;
  return d;
end $$;

-- g: { chao: [[x, y], ...], obst: [[[x, y], ...], ...], H, K } (a geoInteira de simulacao.js).
create or replace function public._sim_livre(g jsonb, x bigint, y bigint) returns boolean
language plpgsql immutable set search_path = '' as $$
declare o jsonb;
begin
  if not public._sim_dentro(x, y,
      array(select (p ->> 0)::int from jsonb_array_elements(g -> 'chao') with ordinality t(p, i) order by i),
      array(select (p ->> 1)::int from jsonb_array_elements(g -> 'chao') with ordinality t(p, i) order by i)) then
    return false;
  end if;
  for o in select jsonb_array_elements(coalesce(g -> 'obst', '[]'::jsonb)) loop
    if public._sim_dentro(x, y,
        array(select (p ->> 0)::int from jsonb_array_elements(o) with ordinality t(p, i) order by i),
        array(select (p ->> 1)::int from jsonb_array_elements(o) with ordinality t(p, i) order by i)) then
      return false;
    end if;
  end loop;
  return true;
end $$;

-- O passo (por 50 ms) de quem corre, em x e em y: [px, py].
create or replace function public._sim_passo(k int, h int, y bigint, vel int, ritmo int) returns int[]
language plpgsql immutable set search_path = '' as $$
declare alt bigint; fat bigint; v bigint;
begin
  alt := greatest(500, (k::bigint * (y - h)) / 10000);
  fat := least(1300, greatest(600, (alt * 1000) / 3000));
  v := (fat * 1700) / 1000;
  v := (v * vel) / 1000;
  v := (v * ritmo) / 1000;
  return array[((1800 * v) / 1000) / 20, ((1500 * v) / 1000) / 20];
end $$;

-- A direção (das 24, de 0 a 23) que mais se afasta de (ax, ay) partindo de (bx, by).
create or replace function public._sim_contra(ax bigint, ay bigint, bx bigint, by bigint) returns int
language plpgsql immutable set search_path = '' as $$
declare c int[] := public._sim_cos(); s int[] := public._sim_sen(); vx bigint := (bx - ax) * 7; vy bigint := (by - ay) * 3; melhor int := 0; nota bigint; p bigint;
begin
  for k in 0 .. 23 loop
    p := vx * c[k + 1] + vy * s[k + 1];
    if nota is null or p > nota then nota := p; melhor := k; end if;
  end loop;
  return melhor;
end $$;

-- A fuga inteira, passo a passo, com o caminho do jogador (x0, y0, x1, y1, ...). Devolve { fim, passo,
-- x, y } e, se o caminho for impossível, { invalido: motivo }.
-- cfg: { g, x, y, saida: [x, y], tempoSaida, velocidade, cadeiras, semente, ordem (passo ou null),
--        temOrdem, impulsos: [passos], rapidez }.
create or replace function public._sim_fuga(cfg jsonb, caminho bigint[]) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  c int[] := public._sim_cos(); s int[] := public._sim_sen();
  g jsonb := cfg -> 'g'; gk int := (cfg -> 'g' ->> 'K')::int; gh int := (cfg -> 'g' ->> 'H')::int;
  vel int := (cfg ->> 'velocidade')::int; maxcad int := coalesce((cfg ->> 'cadeiras')::int, 4);
  saidax bigint := (cfg -> 'saida' ->> 0)::bigint; saiday bigint := (cfg -> 'saida' ->> 1)::bigint;
  tsaida int := (cfg ->> 'tempoSaida')::int * 20;
  ordem int := (cfg ->> 'ordem')::int; tem_ordem boolean := coalesce((cfg ->> 'temOrdem')::boolean, false);
  rapidez boolean := coalesce((cfg ->> 'rapidez')::boolean, false);
  impulsos int[] := array(select (v)::int from jsonb_array_elements_text(coalesce(cfg -> 'impulsos', '[]'::jsonb)) v);
  npassos int := coalesce(array_length(caminho, 1), 0) / 2;
  x bigint := (cfg ->> 'x')::bigint; y bigint := (cfg ->> 'y')::bigint;
  semente bigint := greatest(1, (cfg ->> 'semente')::bigint % 2147483647);
  dir int; t int := 0; fim text; jx bigint; jy bigint; d bigint; d2 bigint;
  prox_decisao int := 0; prox_cadeira int := 0; parado_ate int := 0; drible_ate int := 0; prox_drible int := 0;
  impulso_ate int := 0; prox_impulso int := 0; longe int := 0; ncad int := 0;
  para_saida boolean; modv int; p int[]; pd int[]; melhor int; melhor_nota bigint; nota bigint;
  qx bigint; qy bigint; q2x bigint; q2y bigint; sx bigint; sy bigint; espaco int; cosd bigint;
  contra int; k1 int; k2 int; e1 int; e2 int; nx bigint; ny bigint;
  px bigint; py bigint; ritmo int; mx int[]; b int; dura int;
begin
  if npassos < 1 then return jsonb_build_object('invalido', 'sem caminho'); end if;
  -- O empurrão da largada.
  dir := public._sim_contra(caminho[1], caminho[2], x, y);
  nx := x + (c[dir + 1] * 214) / 1000;
  ny := y + (s[dir + 1] * 200) / 1000;
  if public._sim_livre(g, nx, ny) then x := nx; y := ny; end if;

  while fim is null and t < npassos loop
    jx := caminho[2 * t + 1];
    jy := caminho[2 * t + 2];
    -- O jogador: dentro do chão (com 80 de folga) e sem correr mais do que pode.
    if not (public._sim_livre(g, jx, jy) or public._sim_livre(g, jx + 80, jy) or public._sim_livre(g, jx - 80, jy)
            or public._sim_livre(g, jx, jy + 80) or public._sim_livre(g, jx, jy - 80)) then
      return jsonb_build_object('invalido', 'fora do chão', 'passo', t);
    end if;
    if t > 0 then
      ritmo := case when t < 8 then 0 else 1000 end;
      foreach b in array impulsos loop
        -- (o "then" de um case dentro do if confunde o PL/pgSQL: o limite vem antes)
        dura := b + (case when rapidez then 60 else 44 end);
        if t >= b and t <= dura then ritmo := (case when rapidez then 1600 else 1400 end); end if;
      end loop;
      mx := public._sim_passo(gk, gh, caminho[2 * t], 1000, ritmo);
      mx := array[(mx[1] * 13) / 10 + 30, (mx[2] * 13) / 10 + 30];
      if abs(jx - caminho[2 * t - 1]) > mx[1] or abs(jy - caminho[2 * t]) > mx[2] then
        return jsonb_build_object('invalido', 'rápido demais', 'passo', t);
      end if;
    end if;

    -- A fuga (passoDaFuga).
    d := public._sim_dist(jx, jy, x, y);
    para_saida := t > tsaida;
    if d < 1800 and t >= prox_impulso then impulso_ate := t + 18; prox_impulso := t + 60; end if;
    modv := case when t < drible_ate then 1400 when t < impulso_ate then 1100 else 1000 end;
    p := public._sim_passo(gk, gh, y, vel, modv);

    if t >= prox_decisao and t >= drible_ate then
      prox_decisao := t + 2;
      melhor := -1;
      melhor_nota := 0;
      for k in 0 .. 23 loop
        qx := x + (p[1] * c[k + 1] * 9) / 1000;
        qy := y + (p[2] * s[k + 1] * 9) / 1000;
        continue when not public._sim_livre(g, qx, qy);
        q2x := x + (p[1] * c[k + 1] * 18) / 1000;
        q2y := y + (p[2] * s[k + 1] * 18) / 1000;
        espaco := 0;
        foreach b in array array[6, 12, 18, 24, 30] loop
          sx := x + (p[1] * c[k + 1] * b) / 1000;
          sy := y + (p[2] * s[k + 1] * b) / 1000;
          exit when not public._sim_livre(g, sx, sy);
          espaco := b;
        end loop;
        cosd := (c[k + 1] * c[dir + 1] + s[k + 1] * s[dir + 1]) / 1000;
        if para_saida then
          nota := (6 * public._sim_dist(qx, qy, jx, jy)) / 10 - (14 * public._sim_dist(qx, qy, saidax, saiday)) / 10 + cosd / 2;
        else
          nota := public._sim_dist(qx, qy, jx, jy) + cosd - case when public._sim_livre(g, q2x, q2y) then 0 else 2500 end
            + case when t < 160 then 225 else 50 end * espaco - case when espaco < 12 then 2000 else 0 end;
        end if;
        if melhor < 0 or nota > melhor_nota then melhor := k; melhor_nota := nota; end if;
      end loop;
      if melhor >= 0 then dir := melhor; end if;
      if melhor >= 0 and not para_saida and d < 1700 and t >= prox_drible and t > 20 then
        contra := public._sim_contra(jx, jy, x, y);
        pd := public._sim_passo(gk, gh, y, vel, 1400);
        k1 := (contra + 7) % 24;
        k2 := (contra + 24 - 7) % 24;
        e1 := 0;
        foreach b in array array[4, 8, 12] loop
          exit when not public._sim_livre(g, x + (pd[1] * c[k1 + 1] * b) / 1000, y + (pd[2] * s[k1 + 1] * b) / 1000);
          e1 := b;
        end loop;
        e2 := 0;
        foreach b in array array[4, 8, 12] loop
          exit when not public._sim_livre(g, x + (pd[1] * c[k2 + 1] * b) / 1000, y + (pd[2] * s[k2 + 1] * b) / 1000);
          e2 := b;
        end loop;
        if e2 > e1 then k1 := k2; e1 := e2; end if;
        if e1 > 0 then dir := k1; drible_ate := t + 12; prox_drible := t + 64; end if;
      end if;
    end if;

    if t >= parado_ate then
      nx := x + (p[1] * c[dir + 1]) / 1000;
      ny := y + (p[2] * s[dir + 1]) / 1000;
      if public._sim_livre(g, nx, ny) then x := nx; y := ny; else prox_decisao := 0; end if;
      if t >= 8 and d < 3500 and t >= prox_cadeira and ncad < maxcad then
        semente := (semente * 48271) % 2147483647;
        prox_cadeira := t + 52 + (semente % 24)::int;
        parado_ate := t + 5;
        ncad := ncad + 1;
      end if;
      if para_saida and public._sim_dist(x, y, saidax, saiday) < 500 then fim := 'escapou'; end if;
    end if;

    d2 := public._sim_dist(jx, jy, x, y);
    if fim is null and ordem is not null and ordem = t and tem_ordem and t > 8 and d2 <= 3000 then fim := 'pego'; end if;
    if fim is null and t > 20 and d2 < 850 then fim := 'pego'; end if;
    longe := case when d2 > 9000 then longe + 1 else 0 end;
    if fim is null and longe > 80 then fim := 'escapou'; end if;
    t := t + 1;
    if fim is null and t >= 1200 then fim := 'escapou'; end if;
  end loop;
  return jsonb_build_object('fim', coalesce(fim, 'continua'), 'passo', t, 'x', x, 'y', y, 'distancia', d2);
end $$;

-- A perseguição com a conferência. p_registro: { semente, caminho, impulsos, ordem, passos }.
drop function if exists public.caso_perseguicao(text, uuid, text);
create or replace function public.caso_perseguicao(p_capitulo text, p_personagem uuid, p_resultado text, p_registro jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_pr public.progresso; v_num jsonb; v_pub jsonb; v_cust jsonb; v_seg jsonb; v_cfg jsonb; v_res jsonb; v_final text; v_min int; v_r jsonb; v_ev jsonb; v_novas jsonb;
  v_pe jsonb; v_caminho bigint[]; v_sim jsonb; v_conferido jsonb; v_impulsos int; v_rapidez boolean; v_ordem boolean; v_seg_corridos numeric; v_semente bigint;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select c.publico, c.custos into v_pub, v_cust from public.capitulos c where c.id = p_capitulo;
  select s.perseguicao into v_seg from public.capitulo_segredo s where s.capitulo_id = p_capitulo;
  v_cfg := v_pub -> 'perseguicao';
  if v_cfg is null or not ((v_cfg ->> 'marca') = any (v_pr.marcas)) or 'perseguido' = any (v_pr.marcas) or v_pr.lugar <> v_cfg ->> 'lugar' then
    raise exception 'acao-indisponivel';
  end if;
  select p.numeros into v_num from public.personagens p where p.id = p_personagem;
  -- O começo: sorteia a semente da fuga e marca a hora.
  if p_resultado = 'inicio' then
    v_semente := 1 + (('x' || lpad(encode(extensions.gen_random_bytes(4), 'hex'), 16, '0'))::bit(64)::bigint % 2147483646);
    update public.progresso pr set perseguicao_inicio = now(), perseguicao_semente = v_semente
    where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    return jsonb_build_object('inicio', true, 'semente', v_semente);
  end if;
  if p_resultado = 'dados' then
    if v_num is null then raise exception 'ficha-sem-numeros'; end if;
    v_res := public._cap_rolar(public._cap_parada(v_num, v_cfg -> 'dados' -> 'pool'), v_pr.fome, (v_cfg -> 'dados' ->> 'dif')::int);
    perform public._cap_registrar(p_personagem, p_capitulo, 'perseguicao#dados', v_res);
    v_final := case when public._cap_ok(v_res) then 'pego' else 'escapou' end;
    v_min := coalesce((v_cust ->> 'dados')::int, 35);
  elsif p_resultado in ('pego', 'escapou') then
    v_final := 'escapou';
    v_min := coalesce((v_cust ->> 'perseguicao')::int, 20);
    if p_resultado = 'pego' then
      -- A conferência: o banco refaz a fuga com a semente que sorteou e o caminho que a tela mandou.
      v_seg_corridos := extract(epoch from now() - v_pr.perseguicao_inicio);
      v_caminho := array(select (v)::bigint from jsonb_array_elements_text(coalesce(p_registro -> 'caminho', '[]'::jsonb)) v);
      v_impulsos := jsonb_array_length(coalesce(p_registro -> 'impulsos', '[]'::jsonb));
      v_rapidez := public._cap_tem_poder(v_num, 'ligeireza') or public._cap_tem_disc(v_num, '["rapidez", 1]'::jsonb);
      v_ordem := public._cap_tem_poder(v_num, 'compelir');
      select cp.dados into v_pe from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.id = v_cfg ->> 'pessoa';
      if v_pr.perseguicao_semente is null or (p_registro ->> 'semente')::bigint is distinct from v_pr.perseguicao_semente then
        v_conferido := jsonb_build_object('motivo', 'semente');
      elsif v_seg_corridos is null or v_seg_corridos * 1000 < (coalesce(array_length(v_caminho, 1), 0) / 2) * 50 - 3000 or v_seg_corridos > 90 then
        v_conferido := jsonb_build_object('motivo', 'tempo');
      elsif v_impulsos > 0 and not v_rapidez and v_impulsos > v_pr.vontade then
        v_conferido := jsonb_build_object('motivo', 'vontade');
      elsif public._sim_dist(v_caminho[1], v_caminho[2], round((v_pe ->> 'x')::numeric * 10000)::bigint, round((v_pe ->> 'y')::numeric * 10000)::bigint) > 4000 then
        v_conferido := jsonb_build_object('motivo', 'largada');
      else
        v_sim := public._sim_fuga(jsonb_build_object(
          'g', v_cfg -> 'geoInteira', 'x', round((v_pe ->> 'x')::numeric * 10000), 'y', round((v_pe ->> 'y')::numeric * 10000),
          'saida', jsonb_build_array(round((v_cfg -> 'saida' ->> 0)::numeric * 10000), round((v_cfg -> 'saida' ->> 1)::numeric * 10000)),
          'tempoSaida', v_cfg -> 'tempoSaida', 'velocidade', round(coalesce((v_cfg ->> 'velocidade')::numeric, 1) * 1000),
          'cadeiras', coalesce(v_cfg -> 'cadeiras', '4'::jsonb), 'semente', v_pr.perseguicao_semente,
          'ordem', p_registro -> 'ordem', 'temOrdem', v_ordem, 'impulsos', coalesce(p_registro -> 'impulsos', '[]'::jsonb), 'rapidez', v_rapidez), v_caminho);
        v_conferido := v_sim;
        if v_sim ->> 'fim' = 'pego' then v_final := 'pego'; end if;
      end if;
      -- Forçar o passo gasta Força de Vontade (no banco); a Rapidez usa o sangue.
      if v_impulsos > 0 and not v_rapidez then
        update public.progresso pr set vontade = greatest(0, pr.vontade - v_impulsos) where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
      elsif v_impulsos > 0 then
        perform public._cap_despertar(p_personagem, p_capitulo);
      end if;
    end if;
  else raise exception 'acao-indisponivel';
  end if;
  update public.progresso pr set
    acao_vencida = pr.acao_vencida or v_final = 'pego',
    perseguicao_inicio = null, perseguicao_semente = null,
    escondidos = case when v_final = 'escapou' and not ((v_cfg ->> 'pessoa') = any (pr.escondidos)) then pr.escondidos || (v_cfg ->> 'pessoa') else pr.escondidos end
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
  v_r := v_seg -> v_final;
  v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_r -> 'pistas', '[]'::jsonb) || coalesce(v_r -> 'marcas', '[]'::jsonb));
  return jsonb_build_object('resultado', v_final, 'texto', v_r -> 'texto', 'conferido', v_conferido,
    'teste', case when v_res is null then null else jsonb_build_object('pool', v_cfg -> 'dados' -> 'pool', 'dif', v_cfg -> 'dados' -> 'dif', 'res', v_res) end,
    'novas', v_novas, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

do $$
declare v_f record;
begin
  for v_f in select p.oid::regprocedure as assinatura, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and (p.proname like '\_sim\_%' or p.proname = 'caso_perseguicao') loop
    execute format('revoke all on function %s from public, anon, authenticated', v_f.assinatura);
    if v_f.proname = 'caso_perseguicao' then execute format('grant execute on function %s to authenticated', v_f.assinatura); end if;
  end loop;
end $$;
