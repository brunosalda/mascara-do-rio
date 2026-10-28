-- Carmen, temporada 1 (gerencia/carmen-2026/laco.md, seções 6 a 8):
--   1. pistas de traço indiretas: o valor nunca chega ao navegador antes da leitura da Xerife;
--   2. a leitura da Xerife (20 minutos): o traço de uma pista de traço ou o lugar de uma pista de destino;
--   3. a revanche depois do amanhecer: uma por capítulo, mesma rota e mesmo culpado, sem selo e fora do ranking.

alter table public.cap_pistas add column if not exists indireta boolean not null default false;
alter table public.cap_pistas add column if not exists aponta text; -- pista de destino: o lugar (só a Xerife diz)
alter table public.progresso add column if not exists xerife_lidas text[] not null default '{}';
alter table public.progresso add column if not exists revanche boolean not null default false;
alter table public.progresso add column if not exists primeira jsonb; -- a primeira tentativa, que fica no ranking

-- Os traços que o jogador já sabe com todas as letras: o do começo, os das pistas diretas e os das indiretas
-- que a Xerife leu. É isso que a tela recebe em estado.tracos.
create or replace function public._cap_tracos(p_pers uuid, p_cap text)
returns text[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(distinct t), '{}') from (
    select (c.publico -> 'tracoInicial' ->> 'categoria') || '=' || (c.publico -> 'tracoInicial' ->> 'valor') t
      from public.capitulos c where c.id = p_cap and c.publico ? 'tracoInicial'
    union all
    select cp.sobre from public.cap_pistas cp join public.progresso pr on pr.capitulo_id = cp.capitulo_id and cp.id = any (pr.pistas)
     where pr.personagem_id = p_pers and cp.capitulo_id = p_cap and cp.tipo = 'traco' and cp.sobre is not null
       and (not cp.indireta or cp.id = any (pr.xerife_lidas))
  ) x where t is not null $$;

-- As categorias com alguma pista de traço conquistada, direta ou indireta: a trava da Licença. Só a categoria.
create or replace function public._cap_categorias(p_pers uuid, p_cap text)
returns text[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(distinct t), '{}') from (
    select c.publico -> 'tracoInicial' ->> 'categoria' t from public.capitulos c where c.id = p_cap and c.publico ? 'tracoInicial'
    union all
    select split_part(cp.sobre, '=', 1) from public.cap_pistas cp join public.progresso pr on pr.capitulo_id = cp.capitulo_id and cp.id = any (pr.pistas)
     where pr.personagem_id = p_pers and cp.capitulo_id = p_cap and cp.tipo = 'traco' and cp.sobre is not null
  ) x where t is not null $$;
revoke all on function public._cap_categorias(uuid, text) from public, anon, authenticated;

-- Trocas por texto nas funções que já existem (pg_get_functiondef mantém SECURITY DEFINER e o search_path).
do $$
declare d text;
begin
  -- _cap_estado: a pista indireta vai sem o valor (só a categoria) até a Xerife ler; o estado ganha as categorias,
  -- as leituras da Xerife e a marca da revanche.
  d := pg_get_functiondef('public._cap_estado(uuid,text)'::regprocedure);
  if position('''sobre'', p.sobre, ''tipo'', p.tipo)' in d) = 0 then raise exception 'trecho não encontrado em %', '_cap_estado (pistas)'; end if;
  d := replace(d, '''sobre'', p.sobre, ''tipo'', p.tipo)',
    '''sobre'', case when p.indireta and not (p.id = any (v_pr.xerife_lidas)) then null else p.sobre end, ''tipo'', p.tipo, '
    || '''indireta'', p.indireta, ''categoria'', case when p.tipo = ''traco'' then split_part(p.sobre, ''='', 1) end, ''lida'', p.id = any (v_pr.xerife_lidas))');
  if position('''tracos'', to_jsonb(public._cap_tracos(p_pers, p_cap)),' in d) = 0 then raise exception 'trecho não encontrado em %', '_cap_estado (tracos)'; end if;
  d := replace(d, '''tracos'', to_jsonb(public._cap_tracos(p_pers, p_cap)),',
    '''tracos'', to_jsonb(public._cap_tracos(p_pers, p_cap)), ''categorias'', to_jsonb(public._cap_categorias(p_pers, p_cap)), '
    || '''xerife_lidas'', to_jsonb(v_pr.xerife_lidas), ''revanche'', v_pr.revanche, ''revanche_possivel'', not v_pr.revanche and v_pr.resolvido_em is null and v_pr.hora >= v_c.relogio_fim and v_c.formato = ''rota'',');
  execute d;

  -- caso_licenca: a trava conta categorias (direta ou indireta); o valor nunca é conferido aqui.
  d := pg_get_functiondef('public.caso_licenca(text,uuid,text,jsonb)'::regprocedure);
  if position('v_tem := public._cap_tracos(p_personagem, p_capitulo);' in d) = 0 then raise exception 'trecho não encontrado em %', 'caso_licenca'; end if;
  d := replace(d, 'v_tem := public._cap_tracos(p_personagem, p_capitulo);', 'v_tem := public._cap_categorias(p_personagem, p_capitulo);');
  execute d;

  -- caso_cercar: na revanche, nenhum selo, e ela não conta para "primeiro" nem "mais rápido".
  d := pg_get_functiondef('public.caso_cercar(text,uuid)'::regprocedure);
  if position('where o.capitulo_id = p_capitulo and o.resolvido_em is not null' in d) = 0 then raise exception 'trecho não encontrado em %', 'caso_cercar (ranking)'; end if;
  d := replace(d, 'where o.capitulo_id = p_capitulo and o.resolvido_em is not null', 'where o.capitulo_id = p_capitulo and o.resolvido_em is not null and not o.revanche');
  if position('  update public.progresso pr set resolvido_em = now(), nota = v_nota, selos = v_selos' in d) = 0 then raise exception 'trecho não encontrado em %', 'caso_cercar (selos)'; end if;
  d := replace(d, '  update public.progresso pr set resolvido_em = now(), nota = v_nota, selos = v_selos',
    '  if v_pr.revanche then v_selos := ''{}''; end if;' || chr(10) || '  update public.progresso pr set resolvido_em = now(), nota = v_nota, selos = v_selos');
  execute d;

  -- caso_ranking (temporada): a revanche não soma capítulo resolvido nem nota; os erros são os da primeira tentativa.
  d := pg_get_functiondef('public.caso_ranking(text)'::regprocedure);
  if position('filter (where pr.resolvido_em is not null)' in d) = 0 or position('sum(pr.acusacoes_erradas) as erros' in d) = 0
     or position('max(pr.resolvido_em) as ultimo_acerto' in d) = 0 then raise exception 'trecho não encontrado em %', 'caso_ranking'; end if;
  d := replace(d, 'filter (where pr.resolvido_em is not null)', 'filter (where pr.resolvido_em is not null and not pr.revanche)');
  d := replace(d, 'sum(pr.acusacoes_erradas) as erros', 'sum(case when pr.revanche then coalesce((pr.primeira ->> ''erros'')::int, 0) else pr.acusacoes_erradas end) as erros');
  d := replace(d, 'max(pr.resolvido_em) as ultimo_acerto', 'max(pr.resolvido_em) filter (where not pr.revanche) as ultimo_acerto');
  execute d;
end $$;

-- O ranking do capítulo: quem jogou a revanche aparece como na primeira tentativa (sem resolver).
create or replace function public.caso_ranking_capitulo(p_capitulo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_t public.temporadas; v_rota boolean; v_lista jsonb;
begin
  select t.* into v_t from public.capitulos c join public.temporadas t on t.id = c.temporada_id where c.id = p_capitulo;
  select c.formato = 'rota' into v_rota from public.capitulos c where c.id = p_capitulo;
  if v_t.id is null or not (v_t.situacao <> 'teste' or auth.uid() = any (v_t.visivel_para)) then raise exception 'capitulo-inexistente'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('nome', p.nome, 'cla', coalesce(p.estado ->> 'cla_aparente', p.ficha ->> 'cla'),
      'resolvido_em', e.resolvido_em, 'nota', e.nota, 'erros', e.erros, 'selos', e.selos, 'voce', p.user_id = auth.uid(),
      'passo', case when v_rota then e.passo end, 'licenca', case when v_rota then e.licenca end,
      'viagens_erradas', case when v_rota then e.viagens end, 'revanche', pr.revanche)
    order by e.resolvido_em is null, e.nota desc nulls last, e.erros, e.resolvido_em), '[]'::jsonb)
  into v_lista
  from public.progresso pr join public.personagens p on p.id = pr.personagem_id
  cross join lateral (select
      case when pr.revanche then null else pr.resolvido_em end as resolvido_em,
      case when pr.revanche then null else pr.nota end as nota,
      case when pr.revanche then coalesce((pr.primeira ->> 'erros')::int, 0) else pr.acusacoes_erradas end as erros,
      case when pr.revanche then '[]'::jsonb else to_jsonb(pr.selos) end as selos,
      case when pr.revanche then coalesce((pr.primeira ->> 'passo')::int, 1) else pr.rota_passo + 1 end as passo,
      case when pr.revanche then coalesce((pr.primeira ->> 'licenca')::boolean, false) else pr.licenca is not null end as licenca,
      case when pr.revanche then coalesce((pr.primeira ->> 'viagens_erradas')::int, 0) else pr.viagens_erradas end as viagens) e
  where pr.capitulo_id = p_capitulo;
  return v_lista;
end $$;

-- A leitura da Xerife: 20 minutos. Numa pista de traço, diz o traço (e a indireta passa a contar como traço
-- sabido); numa pista de destino, diz o lugar. Ler de novo a mesma pista não gasta tempo.
create or replace function public.caso_xerife(p_capitulo text, p_personagem uuid, p_pista text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_c public.capitulos; v_p public.cap_pistas; v_min int := 0; v_ev jsonb := '[]'::jsonb; v_texto text; v_cat text; v_val text; v_nome text; v_a text;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select * into v_c from public.capitulos c where c.id = p_capitulo;
  if v_c.formato <> 'rota' then raise exception 'formato-errado'; end if;
  if v_pr.resolvido_em is not null then raise exception 'ja-resolvido'; end if;
  if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
  select * into v_p from public.cap_pistas cp where cp.capitulo_id = p_capitulo and cp.id = p_pista;
  if v_p.id is null or not (p_pista = any (v_pr.pistas)) then raise exception 'sem-pista'; end if;
  if v_p.tipo not in ('traco', 'destino') then
    return jsonb_build_object('texto', '**Xerife Iolanda** — Isso não ajuda a achar quem roubou, mas guarde. Pode ser importante mais tarde.',
      'minutos', 0, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;
  if not (p_pista = any (v_pr.xerife_lidas)) then
    v_min := 20;
    update public.progresso pr set xerife_lidas = pr.xerife_lidas || p_pista where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
  end if;
  if v_p.tipo = 'traco' then
    v_cat := split_part(v_p.sobre, '=', 1);
    v_val := split_part(v_p.sobre, '=', 2);
    v_nome := coalesce(v_c.publico -> 'arquivo' -> 'nomes' -> v_cat ->> v_val, v_val);
    v_texto := case when v_p.indireta
      then format('**Xerife Iolanda** — A testemunha não disse com todas as letras, mas eu conheço a Ciranda. Isso quer dizer: %s. Marque no Arquivo.', v_nome)
      else format('**Xerife Iolanda** — Isso é um traço de quem roubou: %s. Marque no Arquivo.', v_nome) end;
    return jsonb_build_object('texto', v_texto, 'traco', jsonb_build_object('categoria', v_cat, 'valor', v_val, 'nome', v_nome),
      'minutos', v_min, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;
  v_a := coalesce(v_c.publico -> 'lugares' -> v_p.aponta ->> 'a', v_p.aponta);
  v_texto := case when v_p.aponta is null then '**Xerife Iolanda** — Li duas vezes e não tiro nada daqui. Ouça mais gente.'
    else format('**Xerife Iolanda** — Li duas vezes. Isso leva %s.', v_a) end;
  return jsonb_build_object('texto', v_texto, 'aponta', v_p.aponta, 'minutos', v_min, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;
revoke all on function public.caso_xerife(text, uuid, text) from public, anon;
grant execute on function public.caso_xerife(text, uuid, text) to authenticated;

-- A revanche: depois do amanhecer, uma vez por capítulo. Guarda a primeira tentativa (o que o ranking mostra)
-- e recomeça a noite com a mesma rota e o mesmo culpado.
create or replace function public.caso_recomecar(p_capitulo text, p_personagem uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_c public.capitulos; v_num jsonb;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  select * into v_c from public.capitulos c where c.id = p_capitulo;
  if v_c.formato <> 'rota' then raise exception 'formato-errado'; end if;
  if v_pr.resolvido_em is not null then raise exception 'ja-resolvido'; end if;
  if v_pr.revanche then raise exception 'revanche-usada'; end if;
  if not public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'ainda-e-noite'; end if;
  select p.numeros into v_num from public.personagens p where p.id = p_personagem;
  update public.progresso pr set
    primeira = jsonb_build_object('erros', pr.acusacoes_erradas, 'viagens_erradas', pr.viagens_erradas, 'passo', pr.rota_passo + 1,
      'licenca', pr.licenca is not null, 'pistas', coalesce(array_length(pr.pistas, 1), 0), 'hora', pr.hora, 'quando', now()),
    revanche = true,
    lugar = v_c.publico ->> 'lugarInicial', hora = v_c.relogio_inicio, minutos = 0, noites = 1,
    vontade = coalesce((v_num ->> 'forcaVontade')::int, 3),
    marcas = '{}', pistas = '{}', acusacoes_erradas = 0, dicas_pedidas = 0, acao_vencida = false, tempo_ativo_seg = 0,
    nota = null, selos = '{}', feitos = '{}'::jsonb, lidos = '{}'::jsonb, tentados = '{}', eventos = '{}', escondidos = '{}',
    dicas_dadas = '{}', ultima_rolagem = null, final = null, cena_atual = null, perseguicao_inicio = null, perseguicao_semente = null,
    rota_passo = 0, viagens_erradas = 0, licenca = null, xerife_lidas = '{}', ultimo_sinal = now()
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  return jsonb_build_object('revanche', true, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;
revoke all on function public.caso_recomecar(text, uuid) from public, anon;
grant execute on function public.caso_recomecar(text, uuid) to authenticated;

-- As pistas novas (_cap_aplicar) também vão sem o valor da indireta.
do $$
declare d text;
begin
  d := pg_get_functiondef('public._cap_aplicar(uuid,text,jsonb)'::regprocedure);
  if position('''sobre'', v_p.sobre, ''tipo'', v_p.tipo)' in d) = 0 then raise exception 'trecho não encontrado em %', '_cap_aplicar'; end if;
  d := replace(d, '''sobre'', v_p.sobre, ''tipo'', v_p.tipo)',
    '''sobre'', case when v_p.indireta then null else v_p.sobre end, ''tipo'', v_p.tipo, ''indireta'', v_p.indireta, ''categoria'', case when v_p.tipo = ''traco'' then split_part(v_p.sobre, ''='', 1) end)');
  execute d;
end $$;

-- No formato rota, o amanhecer encerra a noite (laco.md, seção 6): nada de noite seguinte. O capítulo seguinte
-- abre mesmo assim, para ninguém ficar preso; a revanche é a única segunda chance.
create or replace function public._cap_liberar_proximo(p_pers uuid, p_cap text)
returns jsonb language plpgsql set search_path = '' as $$
declare v_c public.capitulos; v_prox public.capitulos; v_pr public.progresso; v_num jsonb;
begin
  select * into v_c from public.capitulos c where c.id = p_cap;
  select * into v_prox from public.capitulos c where c.temporada_id = v_c.temporada_id and c.ordem = v_c.ordem + 1;
  if v_prox.id is null then return null; end if;
  select * into v_pr from public.progresso pr where pr.personagem_id = p_pers and pr.capitulo_id = p_cap;
  select p.numeros into v_num from public.personagens p where p.id = p_pers;
  insert into public.progresso (personagem_id, capitulo_id, lugar, hora, fome, vontade)
  values (p_pers, v_prox.id, v_prox.publico ->> 'lugarInicial', v_prox.relogio_inicio, v_pr.fome, coalesce((v_num ->> 'forcaVontade')::int, 3))
  on conflict do nothing;
  return jsonb_build_object('id', v_prox.id, 'titulo', v_prox.titulo);
end $$;
revoke all on function public._cap_liberar_proximo(uuid, text) from public, anon, authenticated;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.caso_noite(text,uuid)'::regprocedure);
  if position('  select * into v_c from public.capitulos c where c.id = p_capitulo;' in d) = 0 then raise exception 'trecho não encontrado em %', 'caso_noite'; end if;
  d := replace(d, '  select * into v_c from public.capitulos c where c.id = p_capitulo;',
    '  select * into v_c from public.capitulos c where c.id = p_capitulo;' || chr(10)
    || '  if v_c.formato = ''rota'' then' || chr(10)
    || '    if v_pr.resolvido_em is not null or v_pr.hora < v_c.relogio_fim then raise exception ''ainda-noite''; end if;' || chr(10)
    || '    return jsonb_build_object(''fim'', true, ''proximo'', public._cap_liberar_proximo(p_personagem, p_capitulo), ''estado'', public._cap_estado(p_personagem, p_capitulo));' || chr(10)
    || '  end if;');
  execute d;
  d := pg_get_functiondef('public.caso_recomecar(text,uuid)'::regprocedure);
  if position('  select p.numeros into v_num from public.personagens p where p.id = p_personagem;' in d) = 0 then raise exception 'trecho não encontrado em %', 'caso_recomecar'; end if;
  d := replace(d, '  select p.numeros into v_num from public.personagens p where p.id = p_personagem;',
    '  perform public._cap_liberar_proximo(p_personagem, p_capitulo);' || chr(10) || '  select p.numeros into v_num from public.personagens p where p.id = p_personagem;');
  execute d;
end $$;
