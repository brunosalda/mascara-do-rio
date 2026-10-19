-- Etapa C, passo 4: o confronto por turnos, todo decidido pelo banco (as mesmas regras de
-- turnoDoConfronto, em js/caso/confronto.js). O estado da luta fica em progresso.cena_atual, e cada turno é
-- uma chamada: o jogador só escolhe; os dados dos dois lados são rolados aqui.
-- Ganhar ou perder leva aos mesmos desfechos da perseguição (segredo.perseguicao: pego ou escapou).

-- 1. O tópico que leva ao confronto marca o começo, como o da perseguição.
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.caso_agir(text, uuid, text, integer, boolean)'::regprocedure) into v_def;
  if position('if v_d ->> ''acao'' = ''perseguicao'' then' in v_def) = 0 or position('''acao'', ''perseguicao'',' in v_def) = 0 then
    raise exception 'trechos de caso_agir não encontrados';
  end if;
  v_def := replace(v_def, 'if v_d ->> ''acao'' = ''perseguicao'' then', 'if v_d ->> ''acao'' in (''perseguicao'', ''confronto'') then');
  v_def := replace(v_def, '''acao'', ''perseguicao'',', '''acao'', v_d ->> ''acao'',');
  execute v_def;
end $$;

-- 2. Um turno (ou o começo, ou os dados).
create or replace function public.caso_confronto(p_capitulo text, p_personagem uuid, p_escolha text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_pr public.progresso; v_num jsonb; v_pub jsonb; v_cust jsonb; v_seg jsonb; v_cfg jsonb; v_op jsonb; e jsonb; v_log jsonb := '[]'::jsonb;
  v_res jsonb; rj jsonb; rt jsonb; v_final text; v_min int; v_r jsonb; v_ev jsonb; v_novas jsonb;
  vit_j int; vit_t int; turno int; hesita boolean; v_fome int; fim text; acao text := p_escolha; bonus int := 0; ataques int := 1; aguenta int := 0;
  margem int; dano int; d text; nivel int; sobe boolean; vit int;
  parada_atq int; parada_def int; parada_int int;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select c.publico, c.custos into v_pub, v_cust from public.capitulos c where c.id = p_capitulo;
  select s.perseguicao into v_seg from public.capitulo_segredo s where s.capitulo_id = p_capitulo;
  v_cfg := v_pub -> 'confronto';
  if v_cfg is null or not (coalesce(v_pub -> 'perseguicao' ->> 'marca', 'chapeu-mostrado') = any (v_pr.marcas)) or 'perseguido' = any (v_pr.marcas) or v_pr.lugar <> v_cfg ->> 'lugar' then
    raise exception 'acao-indisponivel';
  end if;
  select p.numeros into v_num from public.personagens p where p.id = p_personagem;
  if v_num is null then raise exception 'ficha-sem-numeros'; end if;
  v_op := v_cfg -> 'oponente';
  parada_atq := public._cap_parada(v_num, '["forca", "briga"]');
  parada_def := public._cap_parada(v_num, '["destreza", "atletismo"]');
  parada_int := public._cap_parada(v_num, '["manipulacao", "intimidacao"]');

  if p_escolha = 'inicio' then
    vit := coalesce((v_num -> 'atributos' ->> 'vigor')::int, 2) + 3;
    e := jsonb_build_object('tipo', 'confronto', 'vitJ', vit, 'vitJMax', vit, 'vitT', (v_op ->> 'vitalidade')::int, 'vitTMax', (v_op ->> 'vitalidade')::int,
      'turno', 0, 'hesita', false, 'fome', v_pr.fome, 'fim', null);
    update public.progresso pr set cena_atual = e where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    return jsonb_build_object('e', e);
  end if;

  if p_escolha = 'dados' then
    v_res := public._cap_rolar(public._cap_parada(v_num, v_cfg -> 'dados' -> 'pool'), v_pr.fome, (v_cfg -> 'dados' ->> 'dif')::int);
    perform public._cap_registrar(p_personagem, p_capitulo, 'confronto#dados', v_res);
    v_final := (case when public._cap_ok(v_res) then 'pego' else 'escapou' end);
    v_min := coalesce((v_cust ->> 'dados')::int, 35);
  else
    e := v_pr.cena_atual;
    if e is null or e ->> 'tipo' <> 'confronto' or (e ->> 'fim') is not null then raise exception 'acao-indisponivel'; end if;
    vit_j := (e ->> 'vitJ')::int; vit_t := (e ->> 'vitT')::int; turno := (e ->> 'turno')::int + 1; hesita := (e ->> 'hesita')::boolean; v_fome := v_pr.fome;

    if p_escolha = 'fugir' then
      fim := 'perdeu';
      v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'voce', 'texto', 'Você recua. Ele aproveita e some.'));
    else
      if p_escolha like 'disciplina:%' then
        d := substr(p_escolha, 12);
        if d = 'dominacao' then
          if not public._cap_tem_poder(v_num, 'compelir') then raise exception 'abordagem-indisponivel'; end if;
        elsif d not in ('potencia', 'rapidez', 'fortitude') or coalesce((v_num -> 'disciplinas' ->> d)::int, 0) < 1 then
          raise exception 'abordagem-indisponivel';
        end if;
        nivel := coalesce((v_num -> 'disciplinas' ->> d)::int, 1);
        sobe := public._cap_despertar(p_personagem, p_capitulo);
        if sobe then v_fome := least(5, v_fome + 1); end if;
        v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'voce', 'sangue', d, 'texto', (case when sobe then 'Usar o sangue me acordou. Mais fome.' else 'O sangue responde.' end)));
        if d = 'dominacao' then
          fim := 'venceu';
          v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'voce', 'texto', 'Você olha nos olhos dele e manda parar. Ele para.'));
        end if;
        acao := 'atacar';
        if d = 'potencia' then bonus := nivel; end if;
        if d = 'rapidez' then ataques := 2; end if;
        if d = 'fortitude' then aguenta := nivel; end if;
      elsif p_escolha not in ('atacar', 'intimidar') then
        raise exception 'abordagem-indisponivel';
      end if;

      if fim is null and acao = 'atacar' then
        for k in 1 .. ataques loop
          exit when vit_t <= 0;
          rj := public._cap_rolar(parada_atq + bonus, v_fome, 0);
          rt := public._cap_rolar((v_op ->> 'defesa')::int, 0, 0);
          margem := (rj ->> 'sucessos')::int - (rt ->> 'sucessos')::int;
          if margem <= 0 and rj -> 'dadosFome' @> '[1]'::jsonb then
            v_fome := least(5, v_fome + 1);
            v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'voce', 'res', rj, 'contra', rt, 'besta', true, 'texto', 'A Besta toma conta: você golpeia o ar, e a Fome sobe.'));
            exit;
          end if;
          dano := (case when margem > 0 then margem + (case when (rj ->> 'critico')::boolean then 1 else 0 end) else 0 end);
          vit_t := greatest(0, vit_t - dano);
          v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'voce', 'res', rj, 'contra', rt, 'dano', dano,
            'texto', (case when dano > 0 then 'Você acerta: ' || dano || ' de dano.' else 'Ele se esquiva.' end)));
        end loop;
      elsif fim is null and acao = 'intimidar' then
        rj := public._cap_rolar(parada_int, v_fome, 0);
        rt := public._cap_rolar((v_op ->> 'vontade')::int, 0, 0);
        margem := (rj ->> 'sucessos')::int - (rt ->> 'sucessos')::int;
        if margem >= 2 then
          fim := 'venceu';
          v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'voce', 'res', rj, 'contra', rt, 'texto', 'Ele baixa os braços. Desistiu.'));
        elsif margem = 1 then
          hesita := true;
          v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'voce', 'res', rj, 'contra', rt, 'texto', 'Ele hesita: não vai atacar agora.'));
        else
          v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'voce', 'res', rj, 'contra', rt, 'texto', 'Ele ri de você.'));
        end if;
      end if;

      if fim is null and vit_t <= 0 then
        fim := 'venceu';
        v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'ele', 'texto', 'Ele cai de joelhos e não levanta mais.'));
      end if;
      if fim is null then
        if hesita and acao <> 'intimidar' then
          hesita := false;
        elsif not hesita then
          rt := public._cap_rolar((v_op ->> 'ataque')::int, 0, 0);
          rj := public._cap_rolar(parada_def, v_fome, 0);
          margem := (rt ->> 'sucessos')::int - (rj ->> 'sucessos')::int;
          dano := greatest(0, greatest(margem, 0) - aguenta);
          vit_j := greatest(0, vit_j - dano);
          v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'ele', 'res', rt, 'contra', rj, 'dano', dano,
            'texto', (case when dano > 0 then 'Ele acerta você: ' || dano || ' de dano.' when margem > 0 then 'O golpe dele bate, mas você aguenta.' else 'Você se esquiva.' end)));
        end if;
        if vit_j <= 0 then
          fim := 'perdeu';
          v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'voce', 'texto', 'Você cai. Quando levanta, ele já foi.'));
        elsif turno >= coalesce((v_cfg ->> 'maxTurnos')::int, 8) then
          fim := 'perdeu';
          v_log := v_log || jsonb_build_array(jsonb_build_object('quem', 'ele', 'texto', 'Ele aproveita uma brecha e foge.'));
        end if;
      end if;
    end if;

    e := e || jsonb_build_object('vitJ', vit_j, 'vitT', vit_t, 'turno', turno, 'hesita', hesita, 'fome', v_fome, 'fim', fim);
    update public.progresso pr set cena_atual = (case when fim is null then e else null end), fome = v_fome
    where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    if fim is null then
      return jsonb_build_object('e', e, 'log', v_log, 'estado', public._cap_estado(p_personagem, p_capitulo));
    end if;
    v_final := (case when fim = 'venceu' then 'pego' else 'escapou' end);
    v_min := coalesce((v_cust ->> 'perseguicao')::int, 20);
  end if;

  -- O fim (pelos turnos ou pelos dados): os mesmos desfechos da perseguição.
  update public.progresso pr set
    acao_vencida = pr.acao_vencida or v_final = 'pego', cena_atual = null,
    escondidos = (case when v_final = 'escapou' and not ((v_cfg ->> 'pessoa') = any (pr.escondidos)) then pr.escondidos || (v_cfg ->> 'pessoa') else pr.escondidos end)
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
  v_r := v_seg -> v_final;
  v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_r -> 'pistas', '[]'::jsonb) || coalesce(v_r -> 'marcas', '[]'::jsonb));
  return jsonb_build_object('e', e, 'log', v_log, 'resultado', v_final, 'texto', v_r -> 'texto',
    'teste', (case when v_res is null then null else jsonb_build_object('pool', v_cfg -> 'dados' -> 'pool', 'dif', v_cfg -> 'dados' -> 'dif', 'res', v_res) end),
    'novas', v_novas, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;
revoke all on function public.caso_confronto(text, uuid, text) from public, anon, authenticated;
grant execute on function public.caso_confronto(text, uuid, text) to authenticated;

-- 3. (aplicado à parte, como etapa_c_confronto_melhor_parada) O ataque e "Deixar os dados decidirem" usam a
--    melhor parada de luta: Força + Briga ou Destreza + Armas brancas (a mesma regra de ataqueDe, no JS).
do $$
declare v_def text; a1 text; b1 text; a2 text; b2 text; a3 text; b3 text;
begin
  select pg_get_functiondef('public.caso_confronto(text, uuid, text)'::regprocedure) into v_def;
  a1 := 'parada_atq := public._cap_parada(v_num, ''["forca", "briga"]'');';
  b1 := 'parada_atq := greatest(public._cap_parada(v_num, ''["forca", "briga"]''), public._cap_parada(v_num, ''["destreza", "armas-brancas"]''));'
     || ' v_pool := (case when public._cap_parada(v_num, ''["destreza", "armas-brancas"]'') > public._cap_parada(v_num, ''["forca", "briga"]'') then ''["destreza", "armas-brancas"]''::jsonb else ''["forca", "briga"]''::jsonb end);';
  a2 := 'v_res := public._cap_rolar(public._cap_parada(v_num, v_cfg -> ''dados'' -> ''pool''), v_pr.fome, (v_cfg -> ''dados'' ->> ''dif'')::int);';
  b2 := 'v_res := public._cap_rolar(parada_atq, v_pr.fome, (v_cfg -> ''dados'' ->> ''dif'')::int);';
  a3 := 'jsonb_build_object(''pool'', v_cfg -> ''dados'' -> ''pool'', ''dif''';
  b3 := 'jsonb_build_object(''pool'', v_pool, ''dif''';
  if position(a1 in v_def) = 0 or position(a2 in v_def) = 0 or position(a3 in v_def) = 0 then raise exception 'trechos não encontrados'; end if;
  v_def := replace(replace(replace(v_def, a1, b1), a2, b2), a3, b3);
  v_def := replace(v_def, 'parada_atq int; parada_def int; parada_int int;', 'parada_atq int; parada_def int; parada_int int; v_pool jsonb;');
  execute v_def;
end $$;
