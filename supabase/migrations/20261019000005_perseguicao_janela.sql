-- Perseguição: proteção barata até a etapa C (sugestão da avaliação, OK da coordenação, 19/10/2026).
-- O site avisa o banco quando a corrida começa (caso_perseguicao com 'inicio'). Depois, o banco só aceita
-- "pego" entre 4 e 60 segundos depois desse começo; fora disso (ou sem o começo), vale "escapou". Assim,
-- pelo console, não dá para ganhar a cena sem correr. "dados" continua rolado aqui e não depende do tempo.
-- A etapa C fecha o resto (a cena inteira conferida pelo banco).

alter table public.progresso add column if not exists perseguicao_inicio timestamptz;

create or replace function public.caso_perseguicao(p_capitulo text, p_personagem uuid, p_resultado text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_num jsonb; v_pub jsonb; v_cust jsonb; v_seg jsonb; v_cfg jsonb; v_res jsonb; v_final text; v_min int; v_r jsonb; v_ev jsonb; v_novas jsonb; v_seg_corridos numeric;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select c.publico, c.custos into v_pub, v_cust from public.capitulos c where c.id = p_capitulo;
  select s.perseguicao into v_seg from public.capitulo_segredo s where s.capitulo_id = p_capitulo;
  v_cfg := v_pub -> 'perseguicao';
  if v_cfg is null or not ((v_cfg ->> 'marca') = any (v_pr.marcas)) or 'perseguido' = any (v_pr.marcas) or v_pr.lugar <> v_cfg ->> 'lugar' then
    raise exception 'acao-indisponivel';
  end if;
  -- O começo da corrida: só marca a hora (pode ser chamado de novo, se a tela recarregar).
  if p_resultado = 'inicio' then
    update public.progresso pr set perseguicao_inicio = now() where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    return jsonb_build_object('inicio', true);
  end if;
  if p_resultado = 'dados' then
    select p.numeros into v_num from public.personagens p where p.id = p_personagem;
    if v_num is null then raise exception 'ficha-sem-numeros'; end if;
    v_res := public._cap_rolar(public._cap_parada(v_num, v_cfg -> 'dados' -> 'pool'), v_pr.fome, (v_cfg -> 'dados' ->> 'dif')::int);
    perform public._cap_registrar(p_personagem, p_capitulo, 'perseguicao#dados', v_res);
    v_final := case when public._cap_ok(v_res) then 'pego' else 'escapou' end;
    v_min := coalesce((v_cust ->> 'dados')::int, 35);
  elsif p_resultado in ('pego', 'escapou') then
    v_final := p_resultado;
    -- "pego" só vale entre 4 e 60 segundos depois do começo da corrida.
    v_seg_corridos := extract(epoch from now() - v_pr.perseguicao_inicio);
    if v_final = 'pego' and (v_seg_corridos is null or v_seg_corridos < 4 or v_seg_corridos > 60) then v_final := 'escapou'; end if;
    v_min := coalesce((v_cust ->> 'perseguicao')::int, 20);
  else raise exception 'acao-indisponivel';
  end if;
  update public.progresso pr set
    acao_vencida = pr.acao_vencida or v_final = 'pego',
    perseguicao_inicio = null,
    escondidos = case when v_final = 'escapou' and not ((v_cfg ->> 'pessoa') = any (pr.escondidos)) then pr.escondidos || (v_cfg ->> 'pessoa') else pr.escondidos end
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
  v_r := v_seg -> v_final;
  v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_r -> 'pistas', '[]'::jsonb) || coalesce(v_r -> 'marcas', '[]'::jsonb));
  return jsonb_build_object('resultado', v_final, 'texto', v_r -> 'texto',
    'teste', case when v_res is null then null else jsonb_build_object('pool', v_cfg -> 'dados' -> 'pool', 'dif', v_cfg -> 'dados' -> 'dif', 'res', v_res) end,
    'novas', v_novas, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;
