-- Carmen 2026, Rodada 47, itens 3 e 4: "Ler a pessoa" e "Apurar os ouvidos" (desenho do Replanejamento em
-- gerencia/carmen-2026/ler-e-escutar.md, seção 3). Aplicada em 06/11/2026, com a liberação do Bruno na aba do desenvolvimento.
-- No banco, esta migração está registrada com a versão 20261106040615, e não com a data do nome deste arquivo.
--
-- Dados (a carga, VERSAO_GERADOR 7, ferramentas/carmen-para-banco.mjs):
--   cap_conteudos tipo 'ler':    uma linha por testemunha; dados = { certo, detalhes: [{ em, ve, indica }] }.
--   cap_conteudos tipo 'escuta': uma linha por lugar e situação (visita certa, com requer; lugar errado, com
--                                escondeSe); dados = { vozes: [{ id, quem, texto, pistas }] }.
-- O segredo fica aqui: o jeito certo, o que cada detalhe indica e qual voz tem pista nunca vão ao navegador antes da hora.
--
-- Regras (as do motor local, js/carmen/caso.js; números de R.LER e R.ESCUTA):
--   observar: 2 minutos, sem dados; observar de novo não custa. O detalhe que indica marca "notou".
--   jeito: o certo abre a pessoa (os tópicos seguem como hoje); o errado gasta o tempo do tópico 'viu', não dá
--          pista e fecha a pessoa até o fim do capítulo. A Dominação (tópico com poderTopico) ainda abre.
--   escutar: 5 minutos; as 3 vozes chegam sem dizer qual serve. Guardar a útil dá a pista e encerra a escuta;
--            guardar uma inútil custa 3 minutos, e a escuta continua. Ouvir de novo não custa.

-- 1. O que o progresso guarda.
alter table public.progresso
  add column if not exists observados jsonb not null default '{}'::jsonb, -- pessoa → [índices dos detalhes vistos]
  add column if not exists jeitos jsonb not null default '{}'::jsonb,     -- pessoa → 'aberta' ou 'fechada'
  add column if not exists escutas jsonb not null default '{}'::jsonb;    -- lugar → { estado: 'aberta' | 'feita', inuteis: [ids] }

alter table public.cap_conteudos drop constraint if exists cap_conteudos_tipo_check;
alter table public.cap_conteudos add constraint cap_conteudos_tipo_check check (tipo in ('topico', 'exame', 'ler', 'escuta'));

-- 2. A linha de leitura de uma pessoa do lugar atual (ou nada).
create or replace function public._cap_ler(p_cap text, p_pessoa text) returns jsonb
language sql stable set search_path = '' as $$
  select cc.dados from public.cap_conteudos cc where cc.capitulo_id = p_cap and cc.tipo = 'ler' and cc.pessoa = p_pessoa limit 1
$$;
revoke all on function public._cap_ler(text, text) from public, anon, authenticated;

-- 3. O que a tela pode ver da leitura: as partes do corpo, a frase só do que já foi observado, e "notou".
create or replace function public.caso_ler(p_capitulo text, p_personagem uuid, p_pessoa text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_ler jsonb; v_vistos jsonb; v_det jsonb := '[]'::jsonb; v_d jsonb; v_i int := 0; v_notou boolean := false;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  v_ler := public._cap_ler(p_capitulo, p_pessoa);
  if v_ler is null then return jsonb_build_object('ok', true, 'ler', null); end if;
  v_vistos := coalesce(v_pr.observados -> p_pessoa, '[]'::jsonb);
  for v_d in select * from jsonb_array_elements(v_ler -> 'detalhes') loop
    if v_vistos @> to_jsonb(v_i) then
      v_det := v_det || jsonb_build_array(jsonb_build_object('em', v_d ->> 'em', 've', v_d ->> 've'));
      if coalesce((v_d ->> 'indica')::boolean, false) then v_notou := true; end if;
    else
      v_det := v_det || jsonb_build_array(jsonb_build_object('em', v_d ->> 'em'));
    end if;
    v_i := v_i + 1;
  end loop;
  return jsonb_build_object('ok', true, 'ler', jsonb_build_object('detalhes', v_det,
    'notou', case when v_notou then v_ler ->> 'certo' end, -- o jeito só aparece depois de um detalhe que indica
    'estado', coalesce(v_pr.jeitos ->> p_pessoa, 'nova')));
end $$;
revoke all on function public.caso_ler(text, uuid, text) from public, anon;
grant execute on function public.caso_ler(text, uuid, text) to authenticated;

-- 4. Observar um detalhe: 2 minutos na primeira vez.
create or replace function public.caso_observar(p_capitulo text, p_personagem uuid, p_pessoa text, p_n int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_ler jsonb; v_vistos jsonb; v_ev jsonb := '[]'::jsonb; v_min int := 0;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  if not exists (select 1 from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.id = p_pessoa and cp.lugar = v_pr.lugar and not (cp.id = any (v_pr.escondidos))) then raise exception 'conteudo-inexistente'; end if;
  v_ler := public._cap_ler(p_capitulo, p_pessoa);
  if v_ler is null or p_n < 0 or p_n >= jsonb_array_length(v_ler -> 'detalhes') then raise exception 'conteudo-inexistente'; end if;
  v_vistos := coalesce(v_pr.observados -> p_pessoa, '[]'::jsonb);
  if not (v_vistos @> to_jsonb(p_n)) then
    if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
    v_min := 2;
    v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
    update public.progresso pr set observados = pr.observados || jsonb_build_object(p_pessoa, v_vistos || to_jsonb(p_n))
    where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  end if;
  return public.caso_ler(p_capitulo, p_personagem, p_pessoa) || jsonb_build_object('min', v_min, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;
revoke all on function public.caso_observar(text, uuid, text, int) from public, anon;
grant execute on function public.caso_observar(text, uuid, text, int) to authenticated;

-- 5. O jeito de perguntar, no primeiro contato.
create or replace function public.caso_jeito(p_capitulo text, p_personagem uuid, p_pessoa text, p_jeito text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_ler jsonb; v_min int; v_ev jsonb; v_texto text;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  if p_jeito not in ('calma', 'direto', 'firme') then raise exception 'jeito-invalido'; end if;
  if not exists (select 1 from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.id = p_pessoa and cp.lugar = v_pr.lugar and not (cp.id = any (v_pr.escondidos))) then raise exception 'conteudo-inexistente'; end if;
  v_ler := public._cap_ler(p_capitulo, p_pessoa);
  if v_ler is null then raise exception 'conteudo-inexistente'; end if;
  if v_pr.jeitos ? p_pessoa then return jsonb_build_object('ok', true, 'estado', v_pr.jeitos ->> p_pessoa, 'min', 0, 'repetido', true); end if;
  if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
  if p_jeito = v_ler ->> 'certo' then
    update public.progresso pr set jeitos = pr.jeitos || jsonb_build_object(p_pessoa, 'aberta')
    where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    return jsonb_build_object('ok', true, 'estado', 'aberta', 'fechou', false, 'min', 0);
  end if;
  -- O jeito errado: o tempo do tópico de perguntar, sem pista, e a pessoa se fecha até o fim do capítulo.
  select coalesce(max((cc.dados ->> 'min')::int), 10) into v_min from public.cap_conteudos cc
    where cc.capitulo_id = p_capitulo and cc.tipo = 'topico' and cc.pessoa = p_pessoa and cc.dados ->> 'id' in ('viu', 'nada');
  v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
  update public.progresso pr set jeitos = pr.jeitos || jsonb_build_object(p_pessoa, 'fechada')
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  return jsonb_build_object('ok', true, 'estado', 'fechada', 'fechou', true, 'min', v_min, 'eventos', v_ev, 'estado_caso', public._cap_estado(p_personagem, p_capitulo));
end $$;
revoke all on function public.caso_jeito(text, uuid, text, text) from public, anon;
grant execute on function public.caso_jeito(text, uuid, text, text) to authenticated;

-- 6. Os tópicos de quem tem leitura só andam com a pessoa aberta. Fechada (ou ainda sem jeito), só a Dominação.
create or replace function public._cap_jeito_ok(p_pr public.progresso, p_cap text, p_chave text) returns boolean
language plpgsql stable set search_path = '' as $$
declare v_row public.cap_conteudos;
begin
  select * into v_row from public.cap_conteudos cc where cc.capitulo_id = p_cap and cc.chave = p_chave and cc.tipo = 'topico';
  if not found or v_row.pessoa is null or public._cap_ler(p_cap, v_row.pessoa) is null then return true; end if;
  if v_row.dados ? 'poderTopico' then return true; end if;
  return coalesce(p_pr.jeitos ->> v_row.pessoa, '') = 'aberta';
end $$;
revoke all on function public._cap_jeito_ok(public.progresso, text, text) from public, anon, authenticated;

-- A Dominação abre quem foi fechado: o tópico com poderTopico que deu certo marca a pessoa como aberta.
create or replace function public.caso_agir(p_capitulo text, p_personagem uuid, p_chave text, p_abordagem int default null, p_usar_vontade boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_pessoa text; v_res jsonb; v_poder boolean;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  select cc.pessoa, cc.dados ? 'poderTopico' into v_pessoa, v_poder from public.cap_conteudos cc
    where cc.capitulo_id = p_capitulo and cc.chave = p_chave and cc.tipo = 'topico';
  if not public._cap_jeito_ok(v_pr, p_capitulo, p_chave) then raise exception 'escolha-o-jeito'; end if;
  if v_pessoa is not null
     and exists (select 1 from public.cap_conteudos cc where cc.capitulo_id = p_capitulo and cc.chave = p_chave and cc.tipo = 'topico' and cc.dados ? 'pedido')
     and exists (select 1 from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.id = v_pessoa and cp.lugar = v_pr.lugar and not (cp.id = any (v_pr.escondidos)))
     and exists (select 1 from jsonb_array_elements(public._cap_topicos(p_personagem, p_capitulo, v_pessoa)) t where t ->> 'chave' = p_chave and t ? 'pedido') then
    raise exception 'use-caso-pedido';
  end if;
  v_res := public._caso_agir_base(p_capitulo, p_personagem, p_chave, p_abordagem, p_usar_vontade);
  if coalesce(v_poder, false) and coalesce((v_res ->> 'ok')::boolean, false) and coalesce((v_res ->> 'acertou')::boolean, (v_res ->> 'sucesso')::boolean, true)
     and public._cap_ler(p_capitulo, v_pessoa) is not null then
    update public.progresso pr set jeitos = pr.jeitos || jsonb_build_object(v_pessoa, 'aberta')
    where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  end if;
  return v_res;
end $$;
revoke all on function public.caso_agir(text, uuid, text, integer, boolean) from public, anon;
grant execute on function public.caso_agir(text, uuid, text, integer, boolean) to authenticated;

-- Os tópicos à vista (a mesma função de 20261102000003, com o filtro do jeito): caso_pedido e _caso_agir_base
-- só aceitam o que ela mostra, então a regra vale para todas as portas.
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
    -- Rodada 47: quem tem leitura só mostra os tópicos depois do jeito certo (fechada ou nova: só a Dominação).
    if public._cap_ler(p_cap, p_pessoa) is not null and not (v_d ? 'poderTopico') and coalesce(v_pr.jeitos ->> p_pessoa, '') <> 'aberta' then continue; end if;
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

-- 7. A escuta do lugar atual: a linha que vale agora (visita certa com o rastro já ali, ou lugar errado).
create or replace function public._cap_escuta(p_pr public.progresso, p_cap text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_r record; v_ach text[] := p_pr.pistas || p_pr.marcas;
begin
  for v_r in select * from public.cap_conteudos cc where cc.capitulo_id = p_cap and cc.tipo = 'escuta' and cc.lugar = p_pr.lugar order by cc.chave loop
    if not public._cap_todos(to_jsonb(v_r.requer), v_ach) then continue; end if;
    if public._cap_algum(v_r.dados -> 'escondeSe', v_ach) then continue; end if;
    return v_r.dados || jsonb_build_object('chave', v_r.chave);
  end loop;
  return null;
end $$;
revoke all on function public._cap_escuta(public.progresso, text) from public, anon, authenticated;

-- Escutar: 5 minutos na primeira vez; ouvir de novo, com a escuta aberta, não custa. As vozes vão sem as pistas.
create or replace function public.caso_escutar(p_capitulo text, p_personagem uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_esc jsonb; v_est jsonb; v_ev jsonb := '[]'::jsonb; v_min int := 0; v_ausp boolean;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  v_esc := public._cap_escuta(v_pr, p_capitulo);
  if v_esc is null then raise exception 'conteudo-inexistente'; end if;
  -- Auspícios (Sentidos Aguçados, de graça na V5): o ouvido maior e mais rápido (R.ESCUTA.auspicio).
  select public._cap_tem_disc(p.numeros, '["auspicios", 1]'::jsonb) or public._cap_tem_poder(p.numeros, 'sentidos-agucados') into v_ausp
    from public.personagens p where p.id = p_personagem;
  v_est := v_pr.escutas -> (v_esc ->> 'chave');
  if v_est ->> 'estado' = 'feita' then return jsonb_build_object('ok', true, 'estado', 'feita', 'min', 0); end if;
  if v_est is null then
    if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
    v_min := 5;
    v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
    v_est := jsonb_build_object('estado', 'aberta', 'inuteis', '[]'::jsonb);
    update public.progresso pr set escutas = pr.escutas || jsonb_build_object(v_esc ->> 'chave', v_est)
    where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  end if;
  return jsonb_build_object('ok', true, 'estado', 'aberta', 'min', v_min, 'eventos', v_ev, 'guardadas', v_est -> 'inuteis',
    'auspicio', coalesce(v_ausp, false), 'trava', case when v_ausp then 0.6 else 1.1 end, 'raio', case when v_ausp then 1.6 else 1 end,
    'vozes', (select jsonb_agg(jsonb_build_object('id', v ->> 'id', 'quem', v ->> 'quem', 'texto', v ->> 'texto')) from jsonb_array_elements(v_esc -> 'vozes') v),
    'estado_caso', public._cap_estado(p_personagem, p_capitulo));
end $$;
revoke all on function public.caso_escutar(text, uuid) from public, anon;
grant execute on function public.caso_escutar(text, uuid) to authenticated;

-- Guardar uma frase: a útil dá a pista e encerra; a inútil custa 3 minutos (guardar de novo a mesma não custa).
create or replace function public.caso_guardar_voz(p_capitulo text, p_personagem uuid, p_voz text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_esc jsonb; v_est jsonb; v_voz jsonb; v_ev jsonb := '[]'::jsonb; v_novas jsonb := '[]'::jsonb; v_min int := 0; v_util boolean;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  v_esc := public._cap_escuta(v_pr, p_capitulo);
  if v_esc is null then raise exception 'conteudo-inexistente'; end if;
  v_est := v_pr.escutas -> (v_esc ->> 'chave');
  if v_est is null then raise exception 'escute-antes'; end if;
  if v_est ->> 'estado' = 'feita' then return jsonb_build_object('ok', true, 'estado', 'feita', 'min', 0); end if;
  select v into v_voz from jsonb_array_elements(v_esc -> 'vozes') v where v ->> 'id' = p_voz;
  if v_voz is null then raise exception 'conteudo-inexistente'; end if;
  v_util := jsonb_array_length(coalesce(v_voz -> 'pistas', '[]'::jsonb)) > 0;
  if v_util then
    v_novas := public._cap_aplicar(p_personagem, p_capitulo, v_voz -> 'pistas');
    v_est := jsonb_set(v_est, '{estado}', '"feita"');
  elsif not (v_est -> 'inuteis' @> to_jsonb(p_voz)) then
    if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
    v_min := 3;
    v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
    v_est := jsonb_set(v_est, '{inuteis}', (v_est -> 'inuteis') || to_jsonb(p_voz));
  end if;
  update public.progresso pr set escutas = pr.escutas || jsonb_build_object(v_esc ->> 'chave', v_est)
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  return jsonb_build_object('ok', true, 'util', v_util, 'estado', v_est ->> 'estado', 'min', v_min, 'novas', v_novas, 'eventos', v_ev,
    'estado_caso', public._cap_estado(p_personagem, p_capitulo));
end $$;
revoke all on function public.caso_guardar_voz(text, uuid, text) from public, anon;
grant execute on function public.caso_guardar_voz(text, uuid, text) to authenticated;

-- 8. O botão da escuta no lugar atual, sem gastar nada: { tem, estado: 'nova' | 'aberta' | 'feita', custo }.
create or replace function public.caso_ouvidos(p_capitulo text, p_personagem uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_esc jsonb; v_est text;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  v_esc := public._cap_escuta(v_pr, p_capitulo);
  if v_esc is null then return jsonb_build_object('tem', false); end if;
  v_est := coalesce(v_pr.escutas -> (v_esc ->> 'chave') ->> 'estado', 'nova');
  return jsonb_build_object('tem', true, 'estado', v_est, 'custo', case when v_est = 'nova' then 5 else 0 end);
end $$;
revoke all on function public.caso_ouvidos(text, uuid) from public, anon;
grant execute on function public.caso_ouvidos(text, uuid) to authenticated;
