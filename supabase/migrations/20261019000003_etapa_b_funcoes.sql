-- Formato v3, etapa B, passo 2: as funções do motor de capítulos, os dados no banco e o ranking.
-- Desenho: gerencia/etapa-b-desenho.md (seções 3 e 9). Regras portadas de js/caso/tela-caso.js e
-- js/motor/dados.js, para o banco decidir tudo: o navegador só mostra.
--
-- Regras de ouro:
-- - O segredo (pessoas, conversas, exames, pistas, resposta, fecho) só sai pelo que o jogador conquistou.
-- - Quem rola os dados é o banco (gen_random_bytes, com rejeição para não viciar o d10).
-- - O progresso só muda por estas funções. O jogador lê a própria linha, mas não grava.
-- - Toda função pública confere o dono do personagem (auth.uid()) e a temporada visível.
--
-- Funções públicas (authenticated): caso_abrir, caso_lugar, caso_conversa, caso_agir, caso_cacar,
-- caso_perseguicao, caso_acusar, caso_final, caso_dica, caso_pulso, caso_noite, caso_ranking,
-- caso_ranking_capitulo. As auxiliares (_cap_*) ninguém chama de fora.
--
-- Erros (texto da exceção, para o site traduzir): personagem-alheio, capitulo-inexistente,
-- temporada-fechada, sem-progresso, amanheceu, conteudo-inexistente, fora-do-lugar, abordagem-indisponivel,
-- ficha-sem-numeros, sem-repeticao, palavra-nao-liberada, acao-indisponivel, ainda-noite, nao-resolvido.

-- 1. O que faltava nas tabelas do passo 1.
alter table public.progresso
  add column if not exists hora int,                                  -- o relógio da noite, em minutos desde a meia-noite da véspera
  add column if not exists vontade int not null default 3,            -- Força de Vontade que ainda resta
  add column if not exists feitos jsonb not null default '{}'::jsonb, -- chave → 'ok' ou 'tentado'
  add column if not exists lidos jsonb not null default '{}'::jsonb,  -- chave → o resultado já conquistado, para reler
  add column if not exists tentados text[] not null default '{}',     -- 'chave#abordagem' já tentadas
  add column if not exists eventos text[] not null default '{}',      -- eventos do relógio que já aconteceram
  add column if not exists escondidos text[] not null default '{}',   -- pessoas que saíram de cena
  add column if not exists dicas_dadas int[] not null default '{}',
  add column if not exists ultima_rolagem jsonb,                      -- para a Força de Vontade rerrolar a última falha
  add column if not exists final text;                                -- a escolha do fecho
comment on column public.progresso.minutos is 'Minutos da noite gastos no capítulo, somando todas as noites.';

alter table public.capitulo_segredo
  add column if not exists palavras_por jsonb not null default '{}'::jsonb,  -- lacuna → palavra → pistas que a liberam
  add column if not exists perseguicao jsonb not null default '{}'::jsonb;   -- os resultados da cena de ação (pego, escapou, depois)

alter table public.cap_conteudos add column if not exists ordem int not null default 0;

-- 2. Dados (motor/dados.js em PL/pgSQL).
create or replace function public._cap_d10() returns int
language plpgsql volatile set search_path = '' as $$
declare v_b int;
begin
  loop
    v_b := get_byte(extensions.gen_random_bytes(1), 0);
    if v_b < 250 then return (v_b % 10) + 1; end if;  -- rejeição: 250..255 viciariam o 1 a 6
  end loop;
end $$;

create or replace function public._cap_avaliar(p_normais int[], p_fome int[], p_dif int) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_todos int[] := coalesce(p_normais, '{}') || coalesce(p_fome, '{}');
  v_dez int; v_suc int; v_pares int; v_crit boolean; v_sang boolean; v_res text;
begin
  select count(*) filter (where x = 10), count(*) filter (where x >= 6) into v_dez, v_suc from unnest(v_todos) x;
  v_pares := v_dez / 2;
  v_suc := v_suc + v_pares * 2;           -- cada par de 10 vale 4 sucessos
  v_crit := v_pares > 0;
  v_sang := v_crit and 10 = any (coalesce(p_fome, '{}'));
  if p_dif <= 0 then v_res := 'contagem';
  elsif v_suc >= p_dif then v_res := case when v_sang then 'critico-sangrento' when v_crit then 'critico' else 'sucesso' end;
  elsif 1 = any (coalesce(p_fome, '{}')) then v_res := 'falha-bestial';
  elsif v_suc = 0 then v_res := 'falha-total';
  else v_res := 'falha';
  end if;
  return jsonb_build_object('normais', to_jsonb(coalesce(p_normais, '{}')), 'dadosFome', to_jsonb(coalesce(p_fome, '{}')),
    'dificuldade', p_dif, 'sucessos', v_suc, 'margem', v_suc - p_dif, 'critico', v_crit, 'sangrento', v_sang, 'resultado', v_res);
end $$;

create or replace function public._cap_rolar(p_parada int, p_fome int, p_dif int) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_total int := greatest(1, coalesce(p_parada, 1));
  v_nf int := greatest(0, least(coalesce(p_fome, 0), v_total));
  v_n int[] := '{}'; v_f int[] := '{}';
begin
  for i in 1 .. v_total - v_nf loop v_n := v_n || public._cap_d10(); end loop;
  for i in 1 .. v_nf loop v_f := v_f || public._cap_d10(); end loop;
  return jsonb_build_object('parada', v_total, 'fome', v_nf) || public._cap_avaliar(v_n, v_f, p_dif);
end $$;

-- Força de Vontade: rerrola até 3 dados normais que falharam (nunca os de Fome).
create or replace function public._cap_rerrolar(p_res jsonb) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_n int[] := array(select x::int from jsonb_array_elements_text(p_res -> 'normais') with ordinality t(x, o) order by o);
  v_f int[] := array(select x::int from jsonb_array_elements_text(p_res -> 'dadosFome') with ordinality t(x, o) order by o);
  v_idx int[];
  v_k int;
begin
  v_idx := array(select i from generate_subscripts(v_n, 1) i where v_n[i] < 6 order by v_n[i], i limit 3);
  foreach v_k in array v_idx loop v_n[v_k] := public._cap_d10(); end loop;
  return jsonb_build_object('parada', p_res -> 'parada', 'fome', p_res -> 'fome', 'vontadeGasta', true, 'rerrolados', coalesce(array_length(v_idx, 1), 0))
    || public._cap_avaliar(v_n, v_f, (p_res ->> 'dificuldade')::int);
end $$;

create or replace function public._cap_ok(p_res jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_res ->> 'resultado' in ('sucesso', 'critico', 'critico-sangrento'), false) $$;

-- A ficha em números (personagens.numeros, gravada pelo Narrador com o v5.js).
create or replace function public._cap_parada(p_num jsonb, p_pool jsonb) returns int
language sql immutable set search_path = '' as $$
  select greatest(1, coalesce((p_num -> 'atributos' ->> (p_pool ->> 0))::int, 0) + coalesce((p_num -> 'habilidades' ->> (p_pool ->> 1))::int, 0)) $$;

create or replace function public._cap_tem_poder(p_num jsonb, p_poder text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_num -> 'poderes' ? p_poder, false) $$;

create or replace function public._cap_tem_disc(p_num jsonb, p_disc jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce((p_num -> 'disciplinas' ->> (p_disc ->> 0))::int, 0) >= coalesce((p_disc ->> 1)::int, 1) $$;

-- Listas de ids (jsonb) contra o que o jogador já achou.
create or replace function public._cap_todos(p_lista jsonb, p_ach text[]) returns boolean
language sql immutable set search_path = '' as $$
  select not exists (select 1 from jsonb_array_elements_text(coalesce(p_lista, '[]'::jsonb)) x where not (x = any (p_ach))) $$;

create or replace function public._cap_algum(p_lista jsonb, p_ach text[]) returns boolean
language sql immutable set search_path = '' as $$
  select exists (select 1 from jsonb_array_elements_text(coalesce(p_lista, '[]'::jsonb)) x where x = any (p_ach)) $$;

-- 3. Nota de proficiência (seção 9.3, com o parecer da avaliação): nenhum bônus vale um erro.
create or replace function public._cap_nota(p_erros int, p_dicas int, p_tempo_seg int, p_ref_min int, p_pistas int, p_minimas int, p_acao boolean) returns int
language sql immutable set search_path = '' as $$
  select greatest(0, least(1000,
    920
    - 200 * coalesce(p_erros, 0)
    - 60 * coalesce(p_dicas, 0)
    - least(100, greatest(0, coalesce(p_tempo_seg, 0) / 60 - coalesce(p_ref_min, 40)) / 3)
    + least(60, 10 * greatest(0, coalesce(p_pistas, 0) - coalesce(p_minimas, 0)))
    + case when p_acao then 20 else 0 end)) $$;

-- 4. Contexto: confere o dono, a temporada e o progresso, e trava a linha.
create or replace function public._cap_progresso(p_cap text, p_pers uuid, p_agir boolean default true) returns public.progresso
language plpgsql set search_path = '' as $$
declare v_t public.temporadas; v_pr public.progresso;
begin
  if not exists (select 1 from public.personagens p where p.id = p_pers and p.user_id = auth.uid()) then
    raise exception 'personagem-alheio' using errcode = '42501';
  end if;
  select t.* into v_t from public.capitulos c join public.temporadas t on t.id = c.temporada_id where c.id = p_cap;
  if not found or not (v_t.situacao <> 'teste' or auth.uid() = any (v_t.visivel_para)) then
    raise exception 'capitulo-inexistente';
  end if;
  if p_agir and (v_t.situacao = 'fechada' or (v_t.fecha_em is not null and now() > v_t.fecha_em) or (v_t.abre_em is not null and now() < v_t.abre_em)) then
    raise exception 'temporada-fechada';
  end if;
  select * into v_pr from public.progresso pr where pr.personagem_id = p_pers and pr.capitulo_id = p_cap for update;
  if not found then raise exception 'sem-progresso'; end if;
  return v_pr;
end $$;

-- Tempo ativo: soma o intervalo desde o último sinal, no máximo 3 minutos (seção 9.2).
create or replace function public._cap_sinal(p_pers uuid, p_cap text) returns void
language sql set search_path = '' as $$
  update public.progresso pr set
    tempo_ativo_seg = pr.tempo_ativo_seg + case when pr.ultimo_sinal is null or pr.resolvido_em is not null then 0
      else least(180, greatest(0, extract(epoch from now() - pr.ultimo_sinal)::int)) end,
    ultimo_sinal = now()
  where pr.personagem_id = p_pers and pr.capitulo_id = p_cap $$;

create or replace function public._cap_amanheceu(p_pers uuid, p_cap text) returns boolean
language sql stable set search_path = '' as $$
  select pr.resolvido_em is null and pr.hora >= c.relogio_fim
  from public.progresso pr join public.capitulos c on c.id = pr.capitulo_id
  where pr.personagem_id = p_pers and pr.capitulo_id = p_cap $$;

-- Pistas e marcas novas. Devolve só as pistas novas, com o texto (as marcas não aparecem no quadro).
create or replace function public._cap_aplicar(p_pers uuid, p_cap text, p_ids jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_pr public.progresso; v_id text; v_novas jsonb := '[]'::jsonb; v_p public.cap_pistas;
begin
  select * into v_pr from public.progresso pr where pr.personagem_id = p_pers and pr.capitulo_id = p_cap;
  for v_id in select jsonb_array_elements_text(coalesce(p_ids, '[]'::jsonb)) loop
    if v_id = any (v_pr.pistas) or v_id = any (v_pr.marcas) then continue; end if;
    select * into v_p from public.cap_pistas cp where cp.capitulo_id = p_cap and cp.id = v_id;
    if found then
      v_pr.pistas := v_pr.pistas || v_id;
      v_novas := v_novas || jsonb_build_array(jsonb_build_object('id', v_p.id, 'titulo', v_p.titulo, 'texto', v_p.texto, 'fonte', v_p.fonte, 'sobre', v_p.sobre, 'tipo', v_p.tipo));
    else
      v_pr.marcas := v_pr.marcas || v_id;
    end if;
  end loop;
  update public.progresso pr set pistas = v_pr.pistas, marcas = v_pr.marcas where pr.personagem_id = p_pers and pr.capitulo_id = p_cap;
  return v_novas;
end $$;

-- O tempo anda: os eventos do relógio acontecem (às 4h o suspeito some, se ninguém o confrontou).
create or replace function public._cap_tempo(p_pers uuid, p_cap text, p_min int) returns jsonb
language plpgsql set search_path = '' as $$
declare v_pr public.progresso; v_eventos jsonb; v_ev jsonb; v_m text; v_saida jsonb := '[]'::jsonb;
begin
  if coalesce(p_min, 0) <= 0 then return v_saida; end if;
  select * into v_pr from public.progresso pr where pr.personagem_id = p_pers and pr.capitulo_id = p_cap;
  if v_pr.resolvido_em is not null then return v_saida; end if;
  v_pr.hora := v_pr.hora + p_min;
  v_pr.minutos := v_pr.minutos + p_min;
  select s.eventos into v_eventos from public.capitulo_segredo s where s.capitulo_id = p_cap;
  for v_ev in select jsonb_array_elements(coalesce(v_eventos, '[]'::jsonb)) loop
    if (v_ev ->> 'id') = any (v_pr.eventos) or v_pr.hora < (v_ev ->> 'hora')::int
       or public._cap_algum(v_ev -> 'seNao', v_pr.pistas || v_pr.marcas) then continue; end if;
    v_pr.eventos := v_pr.eventos || (v_ev ->> 'id');
    if v_ev ? 'esconder' and not ((v_ev ->> 'esconder') = any (v_pr.escondidos)) then v_pr.escondidos := v_pr.escondidos || (v_ev ->> 'esconder'); end if;
    for v_m in select jsonb_array_elements_text(coalesce(v_ev -> 'marcas', '[]'::jsonb)) loop
      if not (v_m = any (v_pr.marcas)) then v_pr.marcas := v_pr.marcas || v_m; end if;
    end loop;
    v_saida := v_saida || jsonb_build_array(jsonb_build_object('voz', v_ev -> 'voz', 'texto', v_ev -> 'texto', 'esconder', v_ev -> 'esconder'));
  end loop;
  update public.progresso pr set hora = v_pr.hora, minutos = v_pr.minutos, eventos = v_pr.eventos, escondidos = v_pr.escondidos, marcas = v_pr.marcas
  where pr.personagem_id = p_pers and pr.capitulo_id = p_cap;
  return v_saida;
end $$;

create or replace function public._cap_registrar(p_pers uuid, p_cap text, p_chave text, p_res jsonb) returns void
language sql set search_path = '' as $$
  insert into public.cap_rolagens (personagem_id, capitulo_id, chave, parada, fome, dados, sucessos, resultado)
  values (p_pers, p_cap, p_chave, (p_res ->> 'parada')::int, (p_res ->> 'fome')::int,
    array(select x::int from jsonb_array_elements_text((p_res -> 'normais') || (p_res -> 'dadosFome')) x),
    (p_res ->> 'sucessos')::int, p_res ->> 'resultado') $$;

-- Despertar: usar o sangue pode subir a Fome (6 ou mais não sobe; o máximo é 5).
create or replace function public._cap_despertar(p_pers uuid, p_cap text) returns boolean
language plpgsql set search_path = '' as $$
declare v_sobe boolean := public._cap_d10() < 6;
begin
  if v_sobe then update public.progresso pr set fome = least(5, pr.fome + 1) where pr.personagem_id = p_pers and pr.capitulo_id = p_cap; end if;
  return v_sobe;
end $$;

-- 5. O que o jogador vê: o estado, os tópicos à vista e a situação de cada abordagem.
create or replace function public._cap_estado(p_pers uuid, p_cap text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_pr public.progresso; v_c public.capitulos; v_por jsonb; v_ach text[]; v_pal jsonb; v_pistas jsonb; v_dicas jsonb;
begin
  select * into v_pr from public.progresso pr where pr.personagem_id = p_pers and pr.capitulo_id = p_cap;
  select * into v_c from public.capitulos c where c.id = p_cap;
  select s.palavras_por into v_por from public.capitulo_segredo s where s.capitulo_id = p_cap;
  v_ach := v_pr.pistas || v_pr.marcas;
  -- Só os ids das palavras já liberadas; quais pistas liberam cada uma nunca sai daqui.
  select coalesce(jsonb_object_agg(l.key, (select coalesce(jsonb_agg(w.key order by w.key), '[]'::jsonb) from jsonb_each(l.value) w where public._cap_algum(w.value, v_ach))), '{}'::jsonb)
    into v_pal from jsonb_each(coalesce(v_por, '{}'::jsonb)) l;
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'titulo', p.titulo, 'texto', p.texto, 'fonte', p.fonte, 'sobre', p.sobre, 'tipo', p.tipo) order by array_position(v_pr.pistas, p.id)), '[]'::jsonb)
    into v_pistas from public.cap_pistas p where p.capitulo_id = p_cap and p.id = any (v_pr.pistas);
  select coalesce(jsonb_agg(d.texto order by d.ordem), '[]'::jsonb) into v_dicas from public.cap_dicas d where d.capitulo_id = p_cap and d.ordem = any (v_pr.dicas_dadas);
  return jsonb_build_object(
    'lugar', v_pr.lugar, 'hora', v_pr.hora, 'noites', v_pr.noites, 'fome', v_pr.fome, 'vontade', v_pr.vontade,
    'pistas', v_pistas, 'marcas', to_jsonb(v_pr.marcas), 'palavras', v_pal,
    'acusacoes_erradas', v_pr.acusacoes_erradas, 'dicas_pedidas', v_pr.dicas_pedidas, 'dicas', v_dicas,
    'feitos', v_pr.feitos, 'lidos', v_pr.lidos, 'escondidos', to_jsonb(v_pr.escondidos), 'eventos', to_jsonb(v_pr.eventos),
    'resolvido_em', v_pr.resolvido_em, 'nota', v_pr.nota, 'selos', to_jsonb(v_pr.selos), 'final', v_pr.final,
    'tempo_ativo_seg', v_pr.tempo_ativo_seg, 'acao_vencida', v_pr.acao_vencida,
    'amanheceu', v_pr.resolvido_em is null and v_pr.hora >= v_c.relogio_fim);
end $$;

-- Os tópicos de uma pessoa que o jogador já pode ver (as mesmas regras de topicosDe, no tela-caso.js).
-- Os bloqueados não aparecem, nem pelo nome.
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
    v_saida := v_saida || jsonb_build_array(jsonb_build_object('chave', v_r.chave, 'rotulo', v_d ->> 'rotulo', 'min', v_d -> 'min', 'estado', v_estado));
  end loop;
  return v_saida;
end $$;

-- Os pontos de exame à vista no lugar (requer / escondeSe do ponto).
create or replace function public._cap_ponto_visivel(p_pr public.progresso, p_chave text, p_dados jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select public._cap_todos(p_dados -> 'ponto' -> 'requer', p_pr.pistas || p_pr.marcas)
     and not (public._cap_algum(p_dados -> 'ponto' -> 'escondeSe', p_pr.pistas || p_pr.marcas) and coalesce(p_pr.feitos ->> p_chave, '') <> 'ok') $$;

-- A situação de uma abordagem (situacao(), no tela-caso.js). O site traduz o motivo em palavras e calcula a
-- chance pela parada e pela dificuldade.
create or replace function public._cap_situacao(p_a jsonb, p_chave_i text, p_pr public.progresso, p_num jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare v_ach text[] := p_pr.pistas || p_pr.marcas; v_dif int;
begin
  if p_chave_i = any (p_pr.tentados) then return jsonb_build_object('pode', false, 'motivo', 'tentado'); end if;
  if public._cap_algum(p_a -> 'bloqueadaSe', v_ach) then return jsonb_build_object('pode', false, 'motivo', 'bloqueada'); end if;
  if p_a ? 'requer' and not public._cap_todos(p_a -> 'requer', v_ach) then return jsonb_build_object('pode', false, 'motivo', 'falta'); end if;
  if p_a ? 'poder' then
    if not public._cap_tem_poder(p_num, p_a ->> 'poder') then return jsonb_build_object('pode', false, 'motivo', 'sem-poder', 'poder', p_a -> 'poder'); end if;
    if p_pr.fome >= 5 then return jsonb_build_object('pode', false, 'motivo', 'fome-maxima', 'poder', p_a -> 'poder'); end if;
    return jsonb_build_object('pode', true, 'poder', p_a -> 'poder');
  end if;
  if p_a ? 'disciplina' then
    if not public._cap_tem_disc(p_num, p_a -> 'disciplina') then return jsonb_build_object('pode', false, 'motivo', 'sem-poder', 'disciplina', p_a -> 'disciplina'); end if;
    if p_pr.fome >= 5 then return jsonb_build_object('pode', false, 'motivo', 'fome-maxima', 'disciplina', p_a -> 'disciplina'); end if;
    return jsonb_build_object('pode', true, 'disciplina', p_a -> 'disciplina');
  end if;
  if p_a ? 'fomeMin' then
    return jsonb_build_object('pode', p_pr.fome >= (p_a ->> 'fomeMin')::int, 'motivo', case when p_pr.fome >= (p_a ->> 'fomeMin')::int then null else 'fome-baixa' end, 'fomeMin', p_a -> 'fomeMin', 'besta', true);
  end if;
  if p_a ? 'teste' then
    v_dif := (p_a -> 'teste' ->> 'dif')::int + case when (p_a ->> 'social')::boolean and p_pr.fome >= 4 then 1 else 0 end;
    return jsonb_build_object('pode', true, 'teste', jsonb_build_object('pool', p_a -> 'teste' -> 'pool', 'dif', v_dif,
      'parada', case when p_num is null then null else public._cap_parada(p_num, p_a -> 'teste' -> 'pool') end,
      'fomeAssusta', coalesce((p_a ->> 'social')::boolean, false) and p_pr.fome >= 4));
  end if;
  return jsonb_build_object('pode', true);
end $$;

-- 6. As funções do jogo.

-- Abre o capítulo: cria o progresso (só no capítulo 1; os outros nascem quando o anterior é resolvido).
create or replace function public.caso_abrir(p_capitulo text, p_personagem uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_p public.personagens; v_c public.capitulos; v_t public.temporadas;
begin
  select * into v_p from public.personagens p where p.id = p_personagem and p.user_id = auth.uid();
  if not found then raise exception 'personagem-alheio' using errcode = '42501'; end if;
  select * into v_c from public.capitulos c where c.id = p_capitulo;
  select * into v_t from public.temporadas t where t.id = v_c.temporada_id;
  if v_c.id is null or not (v_t.situacao <> 'teste' or auth.uid() = any (v_t.visivel_para)) then raise exception 'capitulo-inexistente'; end if;
  if not exists (select 1 from public.progresso pr where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo) then
    if v_c.ordem <> 1 then raise exception 'capitulo-inexistente'; end if;
    if v_p.status <> 'ativo' then raise exception 'personagem-inativo'; end if;
    if v_t.situacao = 'fechada' or (v_t.fecha_em is not null and now() > v_t.fecha_em) or (v_t.abre_em is not null and now() < v_t.abre_em) then raise exception 'temporada-fechada'; end if;
    insert into public.progresso (personagem_id, capitulo_id, lugar, hora, fome, vontade, ultimo_sinal)
    values (p_personagem, p_capitulo, v_c.publico ->> 'lugarInicial', v_c.relogio_inicio,
      greatest(1, least(4, case when jsonb_typeof(v_p.estado -> 'fome') = 'number' then (v_p.estado ->> 'fome')::int else 2 end)),
      coalesce((v_p.numeros ->> 'forcaVontade')::int, 3), now());
  else
    perform public._cap_sinal(p_personagem, p_capitulo);
  end if;
  return jsonb_build_object(
    'capitulo', jsonb_build_object('id', v_c.id, 'temporada', v_c.temporada_id, 'ordem', v_c.ordem, 'titulo', v_c.titulo, 'pergunta', v_c.pergunta,
      'relogio', jsonb_build_object('inicio', v_c.relogio_inicio, 'fim', v_c.relogio_fim), 'custos', v_c.custos, 'publico', v_c.publico,
      'tempo_referencia_min', v_c.tempo_referencia_min),
    'ficha_com_numeros', v_p.numeros is not null,
    'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- Vai a um lugar (ou só olha o lugar onde já está): cobra a viagem e mostra quem está lá e os pontos à vista.
create or replace function public.caso_lugar(p_capitulo text, p_personagem uuid, p_lugar text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_pub jsonb; v_cust jsonb; v_de jsonb; v_para jsonb; v_min int := 0; v_ev jsonb := '[]'::jsonb; v_pessoas jsonb; v_pontos jsonb;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select c.publico, c.custos into v_pub, v_cust from public.capitulos c where c.id = p_capitulo;
  v_para := v_pub -> 'lugares' -> p_lugar;
  if v_para is null then raise exception 'conteudo-inexistente'; end if;
  if p_lugar <> v_pr.lugar then
    if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
    v_de := v_pub -> 'lugares' -> v_pr.lugar;
    -- Ir de um lugar a uma parte dele (o largo e o beco) leva 2 minutos; o resto, a viagem.
    v_min := case when v_de ->> 'dentro' = p_lugar or v_para ->> 'dentro' = v_pr.lugar or (v_de ->> 'dentro' is not null and v_de ->> 'dentro' = v_para ->> 'dentro') then 2
      else coalesce((v_cust ->> 'viagem')::int, 30) end;
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
  return jsonb_build_object('lugar', p_lugar, 'minutos', v_min, 'pessoas', v_pessoas, 'pontos', v_pontos, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- Começa a conversa com uma pessoa do lugar: a saudação (ou a fala de depois da cena de ação) e os tópicos.
create or replace function public.caso_conversa(p_capitulo text, p_personagem uuid, p_pessoa text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_pe public.cap_pessoas; v_pub jsonb; v_depois jsonb; v_primeira boolean; v_texto text;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select * into v_pe from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.id = p_pessoa;
  if not found or v_pe.lugar <> v_pr.lugar or p_pessoa = any (v_pr.escondidos) then raise exception 'fora-do-lugar'; end if;
  select c.publico into v_pub from public.capitulos c where c.id = p_capitulo;
  select s.perseguicao -> 'depois' into v_depois from public.capitulo_segredo s where s.capitulo_id = p_capitulo;
  v_primeira := not (('conheceu-' || p_pessoa) = any (v_pr.marcas || v_pr.pistas));
  if v_primeira then perform public._cap_aplicar(p_personagem, p_capitulo, jsonb_build_array('conheceu-' || p_pessoa)); end if;
  if v_pub -> 'perseguicao' ->> 'pessoa' = p_pessoa and 'perseguido' = any (v_pr.marcas || v_pr.pistas) then
    v_texto := coalesce(v_depois ->> 'pego', '');
  elsif v_primeira then v_texto := v_pe.dados ->> 'saudacao';
  else v_texto := '**' || (v_pe.dados ->> 'nome') || '** — Mais alguma coisa?';
  end if;
  return jsonb_build_object('pessoa', jsonb_build_object('id', v_pe.id, 'nome', v_pe.dados -> 'nome', 'sub', v_pe.dados -> 'sub'),
    'texto', v_texto, 'topicos', public._cap_topicos(p_personagem, p_capitulo, p_pessoa), 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- Age: um tópico de conversa ('pessoa:topico') ou um exame ('x:ponto'). Sem abordagem, devolve as abordagens
-- (quando o conteúdo tem); com a abordagem, resolve. usar_vontade rerrola a última falha da mesma abordagem.
create or replace function public.caso_agir(p_capitulo text, p_personagem uuid, p_chave text, p_abordagem int default null, p_usar_vontade boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_pr public.progresso; v_num jsonb; v_row public.cap_conteudos; v_d jsonb; v_exame boolean; v_resultados jsonb;
  v_a jsonb; v_sit jsonb; v_res jsonb; v_ok boolean := true; v_extra int := 0; v_r jsonb; v_ev jsonb := '[]'::jsonb; v_novas jsonb := '[]'::jsonb;
  v_sangue jsonb; v_texto text; v_lido jsonb; v_pode_repetir boolean; v_lista jsonb; v_ur jsonb; v_hab int; v_pub jsonb;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select p.numeros into v_num from public.personagens p where p.id = p_personagem;
  select * into v_row from public.cap_conteudos cc where cc.capitulo_id = p_capitulo and cc.chave = p_chave;
  if not found then raise exception 'conteudo-inexistente'; end if;
  v_d := v_row.dados;
  v_exame := v_row.tipo = 'exame';

  -- Só o que está à vista: a pessoa no mesmo lugar (e o tópico liberado) ou o ponto à vista no lugar.
  if v_exame then
    if v_row.lugar <> v_pr.lugar or not public._cap_ponto_visivel(v_pr, p_chave, v_d) then raise exception 'fora-do-lugar'; end if;
    v_resultados := v_d -> 'resultados';
  else
    if not exists (select 1 from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.id = v_row.pessoa and cp.lugar = v_pr.lugar and not (cp.id = any (v_pr.escondidos))) then raise exception 'fora-do-lugar'; end if;
    if not exists (select 1 from jsonb_array_elements(public._cap_topicos(p_personagem, p_capitulo, v_row.pessoa)) t where t ->> 'chave' = p_chave) then raise exception 'conteudo-inexistente'; end if;
    select cp.dados -> 'resultados' into v_resultados from public.cap_pessoas cp where cp.capitulo_id = p_capitulo and cp.id = v_row.pessoa;
  end if;

  -- Força de Vontade: rerrola a última falha desta mesma abordagem (sem gastar tempo, como na demonstração).
  if p_usar_vontade then
    v_ur := v_pr.ultima_rolagem;
    if v_ur is null or v_ur ->> 'chave' <> p_chave or (v_ur ->> 'i')::int is distinct from p_abordagem or not coalesce((v_ur ->> 'pode_repetir')::boolean, false) or v_pr.vontade <= 0 then
      raise exception 'sem-repeticao';
    end if;
    v_a := v_d -> 'abordagens' -> p_abordagem;
    v_res := public._cap_rerrolar(v_ur -> 'res');
    v_ok := public._cap_ok(v_res);
    perform public._cap_registrar(p_personagem, p_capitulo, p_chave || '#' || p_abordagem || '+vontade', v_res);
    v_r := case when v_ok then v_resultados -> (v_a ->> 'sucesso') end;
    if v_ok then v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_r -> 'pistas', '[]'::jsonb) || coalesce(v_r -> 'marcas', '[]'::jsonb)); end if;
    v_lido := jsonb_build_object('abordagem', v_a -> 'rotulo', 'teste', jsonb_build_object('pool', v_ur -> 'pool', 'dif', v_ur -> 'dif', 'res', v_res), 'vontade', true, 'texto', v_r -> 'texto');
    update public.progresso pr set vontade = pr.vontade - 1, ultima_rolagem = null,
      feitos = case when v_ok then pr.feitos || jsonb_build_object(p_chave, 'ok') else pr.feitos end,
      lidos = case when v_ok then pr.lidos || jsonb_build_object(p_chave, v_lido) else pr.lidos end
    where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    return v_lido || jsonb_build_object('ok', v_ok, 'novas', v_novas, 'eventos', '[]'::jsonb, 'pode_repetir', false, 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;

  -- Já feito: só relê (sem custo).
  if v_pr.feitos ->> p_chave = 'ok' and v_pr.lidos ? p_chave then
    return (v_pr.lidos -> p_chave) || jsonb_build_object('ok', true, 'repetido', true, 'novas', '[]'::jsonb, 'eventos', '[]'::jsonb, 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;
  if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;

  -- O tópico que leva à cena de ação (a perseguição): marca o começo e devolve o texto.
  if v_d ->> 'acao' = 'perseguicao' then
    select c.publico into v_pub from public.capitulos c where c.id = p_capitulo;
    v_ev := public._cap_tempo(p_personagem, p_capitulo, (v_d ->> 'min')::int);
    v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_d -> 'pistas', '[]'::jsonb) || jsonb_build_array(v_pub -> 'perseguicao' ->> 'marca'));
    update public.progresso pr set feitos = pr.feitos || jsonb_build_object(p_chave, 'ok') where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    return jsonb_build_object('ok', true, 'acao', 'perseguicao', 'texto', v_d -> 'texto', 'novas', v_novas, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;

  -- Sem abordagens: o texto direto, as pistas e, no exame, o que a Prontidão nota sozinha (passivo).
  if not (v_d ? 'abordagens') then
    v_ev := public._cap_tempo(p_personagem, p_capitulo, (v_d ->> 'min')::int);
    v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_d -> 'pistas', '[]'::jsonb) || coalesce(v_d -> 'marcas', '[]'::jsonb));
    v_texto := v_d ->> 'texto';
    if v_d ? 'passivo' then
      v_hab := coalesce((v_num -> 'habilidades' ->> (v_d -> 'passivo' ->> 'hab'))::int, 0);
      if v_hab >= (v_d -> 'passivo' ->> 'min')::int then
        v_novas := v_novas || public._cap_aplicar(p_personagem, p_capitulo, v_d -> 'passivo' -> 'pistas');
        v_texto := v_texto || E'\n\n' || (v_d -> 'passivo' ->> 'texto');
      end if;
    end if;
    v_lido := jsonb_build_object('texto', v_texto);
    update public.progresso pr set feitos = pr.feitos || jsonb_build_object(p_chave, 'ok'), lidos = pr.lidos || jsonb_build_object(p_chave, v_lido)
    where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    return v_lido || jsonb_build_object('ok', true, 'novas', v_novas, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;

  -- Com abordagens e nenhuma escolhida: a pergunta e as abordagens com a situação de cada uma.
  if p_abordagem is null then
    if v_exame and v_d ? 'marcas' then perform public._cap_aplicar(p_personagem, p_capitulo, v_d -> 'marcas'); end if;
    select * into v_pr from public.progresso pr where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    select coalesce(jsonb_agg(jsonb_build_object('i', o - 1, 'rotulo', a -> 'rotulo') || public._cap_situacao(a, p_chave || '#' || (o - 1), v_pr, v_num) order by o), '[]'::jsonb)
      into v_lista from jsonb_array_elements(v_d -> 'abordagens') with ordinality t(a, o);
    return jsonb_build_object('pergunta', case when v_exame then concat_ws(E'\n\n', v_d ->> 'texto', v_d ->> 'pergunta') else v_d ->> 'pergunta' end,
      'min', v_d -> 'min', 'abordagens', v_lista, 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;

  -- A abordagem escolhida.
  v_a := v_d -> 'abordagens' -> p_abordagem;
  if v_a is null then raise exception 'abordagem-indisponivel'; end if;
  v_sit := public._cap_situacao(v_a, p_chave || '#' || p_abordagem, v_pr, v_num);
  if not (v_sit ->> 'pode')::boolean then raise exception 'abordagem-indisponivel'; end if;
  update public.progresso pr set tentados = pr.tentados || (p_chave || '#' || p_abordagem) where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  if v_a ? 'teste' then
    if v_num is null then raise exception 'ficha-sem-numeros'; end if;
    v_res := public._cap_rolar((v_sit -> 'teste' ->> 'parada')::int, v_pr.fome, (v_sit -> 'teste' ->> 'dif')::int);
    v_ok := public._cap_ok(v_res);
    if v_res ->> 'resultado' = 'falha-bestial' then v_extra := 15; end if;
    perform public._cap_registrar(p_personagem, p_capitulo, p_chave || '#' || p_abordagem, v_res);
  elsif v_a ? 'poder' or v_a ? 'disciplina' then
    v_sangue := jsonb_build_object('poder', v_a -> 'poder', 'disciplina', v_a -> 'disciplina', 'fomeSobe', public._cap_despertar(p_personagem, p_capitulo));
  end if;
  v_r := v_resultados -> (case when v_ok then v_a ->> 'sucesso' else v_a ->> 'falha' end);
  v_ev := public._cap_tempo(p_personagem, p_capitulo, coalesce((v_d ->> 'min')::int, 0) + v_extra);
  v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_r -> 'pistas', '[]'::jsonb) || coalesce(v_r -> 'marcas', '[]'::jsonb));
  v_lido := jsonb_build_object('abordagem', v_a -> 'rotulo', 'texto', v_r -> 'texto', 'sangue', v_sangue, 'besta', v_a ? 'fomeMin',
    'teste', case when v_res is null then null else jsonb_build_object('pool', v_sit -> 'teste' -> 'pool', 'dif', v_sit -> 'teste' -> 'dif', 'res', v_res) end);
  select * into v_pr from public.progresso pr where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  v_pode_repetir := not v_ok and v_res is not null and v_pr.vontade > 0;
  update public.progresso pr set
    feitos = pr.feitos || jsonb_build_object(p_chave, case when v_ok then 'ok' when pr.feitos ->> p_chave = 'ok' then 'ok' else 'tentado' end),
    lidos = case when v_ok then pr.lidos || jsonb_build_object(p_chave, v_lido) else pr.lidos end,
    ultima_rolagem = case when v_res is null then null else jsonb_build_object('chave', p_chave, 'i', p_abordagem, 'res', v_res,
      'pool', v_sit -> 'teste' -> 'pool', 'dif', v_sit -> 'teste' -> 'dif', 'pode_repetir', v_pode_repetir) end
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  return v_lido || jsonb_build_object('ok', v_ok, 'novas', v_novas, 'eventos', v_ev, 'pode_repetir', v_pode_repetir,
    'outras', v_exame and not v_ok, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- Caçar: baixa a Fome e gasta tempo. Sem Fome (1), não precisa.
create or replace function public.caso_cacar(p_capitulo text, p_personagem uuid, p_abordagem int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_num jsonb; v_pub jsonb; v_cust jsonb; v_a jsonb; v_dif int; v_res jsonb; v_extra int := 0; v_fome int; v_ev jsonb; v_texto text;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  if public._cap_amanheceu(p_personagem, p_capitulo) then raise exception 'amanheceu'; end if;
  if v_pr.fome <= 1 then return jsonb_build_object('recusado', true, 'estado', public._cap_estado(p_personagem, p_capitulo)); end if;
  select p.numeros into v_num from public.personagens p where p.id = p_personagem;
  if v_num is null then raise exception 'ficha-sem-numeros'; end if;
  select c.publico, c.custos into v_pub, v_cust from public.capitulos c where c.id = p_capitulo;
  v_a := v_pub -> 'cacada' -> 'abordagens' -> p_abordagem;
  if v_a is null then raise exception 'abordagem-indisponivel'; end if;
  v_dif := (v_a -> 'teste' ->> 'dif')::int;
  v_res := public._cap_rolar(public._cap_parada(v_num, v_a -> 'teste' -> 'pool'), v_pr.fome, v_dif);
  perform public._cap_registrar(p_personagem, p_capitulo, 'cacar#' || p_abordagem, v_res);
  if public._cap_ok(v_res) then
    v_fome := greatest(1, v_pr.fome - case when (v_res ->> 'critico')::boolean then 3 else 2 end); v_texto := v_pub -> 'cacada' ->> 'sucesso';
  elsif v_res ->> 'resultado' = 'falha-bestial' then
    v_fome := greatest(1, v_pr.fome - 1); v_extra := 30; v_texto := v_pub -> 'cacada' ->> 'bestial';
  else
    v_fome := v_pr.fome; v_texto := v_pub -> 'cacada' ->> 'falha';
  end if;
  update public.progresso pr set fome = v_fome where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  v_ev := public._cap_tempo(p_personagem, p_capitulo, coalesce((v_cust ->> 'cacar')::int, 45) + v_extra);
  return jsonb_build_object('abordagem', v_a -> 'rotulo', 'teste', jsonb_build_object('pool', v_a -> 'teste' -> 'pool', 'dif', v_dif, 'res', v_res),
    'ok', public._cap_ok(v_res), 'texto', v_texto, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- O fim da cena de ação (a perseguição). ETAPA C: hoje o banco confia no navegador para 'pego' ou
-- 'escapou' (decisão da coordenação, 18/10); só 'dados' é rolado aqui. A etapa C fecha isso, com a cena
-- conferida pelo banco. As duas saídas dão uma pista, então trapacear só escolhe qual pista ganha.
create or replace function public.caso_perseguicao(p_capitulo text, p_personagem uuid, p_resultado text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_num jsonb; v_pub jsonb; v_cust jsonb; v_seg jsonb; v_cfg jsonb; v_res jsonb; v_final text; v_min int; v_r jsonb; v_ev jsonb; v_novas jsonb;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select c.publico, c.custos into v_pub, v_cust from public.capitulos c where c.id = p_capitulo;
  select s.perseguicao into v_seg from public.capitulo_segredo s where s.capitulo_id = p_capitulo;
  v_cfg := v_pub -> 'perseguicao';
  if v_cfg is null or not ((v_cfg ->> 'marca') = any (v_pr.marcas)) or 'perseguido' = any (v_pr.marcas) or v_pr.lugar <> v_cfg ->> 'lugar' then
    raise exception 'acao-indisponivel';
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
    v_min := coalesce((v_cust ->> 'perseguicao')::int, 20);
  else raise exception 'acao-indisponivel';
  end if;
  update public.progresso pr set
    acao_vencida = pr.acao_vencida or v_final = 'pego',   -- vencer pelos dados também conta (parecer da avaliação)
    escondidos = case when v_final = 'escapou' and not ((v_cfg ->> 'pessoa') = any (pr.escondidos)) then pr.escondidos || (v_cfg ->> 'pessoa') else pr.escondidos end
  where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  v_ev := public._cap_tempo(p_personagem, p_capitulo, v_min);
  v_r := v_seg -> v_final;
  v_novas := public._cap_aplicar(p_personagem, p_capitulo, coalesce(v_r -> 'pistas', '[]'::jsonb) || coalesce(v_r -> 'marcas', '[]'::jsonb));
  return jsonb_build_object('resultado', v_final, 'texto', v_r -> 'texto',
    'teste', case when v_res is null then null else jsonb_build_object('pool', v_cfg -> 'dados' -> 'pool', 'dif', v_cfg -> 'dados' -> 'dif', 'res', v_res) end,
    'novas', v_novas, 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- Acusa diante da Xerife. A resposta nunca sai daqui: só "certo" ou "errado" (e "quase").
create or replace function public.caso_acusar(p_capitulo text, p_personagem uuid, p_quem text, p_como text, p_porque text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_pr public.progresso; v_c public.capitulos; v_seg public.capitulo_segredo; v_est jsonb; v_escolha jsonb; v_lac text; v_total int; v_certas int;
  v_np int; v_todas int; v_nota int; v_selos text[] := '{}'; v_prox public.capitulos; v_num jsonb; v_ev jsonb; v_texto text; v_var jsonb;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  if v_pr.resolvido_em is not null then return jsonb_build_object('certo', true, 'ja_resolvido', true, 'estado', public._cap_estado(p_personagem, p_capitulo)); end if;
  select * into v_c from public.capitulos c where c.id = p_capitulo;
  select * into v_seg from public.capitulo_segredo s where s.capitulo_id = p_capitulo;
  v_escolha := jsonb_build_object('quem', p_quem, 'como', p_como, 'porque', p_porque);
  -- Só dá para acusar com palavras já liberadas pelas pistas.
  v_est := public._cap_estado(p_personagem, p_capitulo);
  for v_lac in select jsonb_object_keys(v_seg.resposta) loop
    if not coalesce(v_est -> 'palavras' -> v_lac ? (v_escolha ->> v_lac), false) then raise exception 'palavra-nao-liberada'; end if;
  end loop;
  select count(*), count(*) filter (where v_seg.resposta ->> k = v_escolha ->> k) into v_total, v_certas from jsonb_object_keys(v_seg.resposta) k;

  if v_certas < v_total then
    update public.progresso pr set acusacoes_erradas = pr.acusacoes_erradas + 1 where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
    v_ev := public._cap_tempo(p_personagem, p_capitulo, coalesce((v_c.custos ->> 'acusacaoErrada')::int, 60));
    return jsonb_build_object('certo', false, 'quase', v_certas = v_total - 1, 'erros', v_pr.acusacoes_erradas + 1,
      'minutos', coalesce((v_c.custos ->> 'acusacaoErrada')::int, 60), 'eventos', v_ev, 'estado', public._cap_estado(p_personagem, p_capitulo));
  end if;

  -- Acertou: a nota, os selos e o próximo capítulo, na mesma hora.
  select * into v_pr from public.progresso pr where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  v_np := coalesce(array_length(v_pr.pistas, 1), 0);
  select count(*) into v_todas from public.cap_pistas cp where cp.capitulo_id = p_capitulo;
  v_nota := public._cap_nota(v_pr.acusacoes_erradas, v_pr.dicas_pedidas, v_pr.tempo_ativo_seg, v_c.tempo_referencia_min, v_np, v_c.pistas_minimas, v_pr.acao_vencida);
  if v_pr.acusacoes_erradas = 0 then v_selos := v_selos || 'sem-erros'::text; end if;
  if v_pr.dicas_pedidas = 0 then v_selos := v_selos || 'sem-dicas'::text; end if;
  if v_todas > 0 and v_np >= v_todas then v_selos := v_selos || 'detetive'::text; end if;
  if not exists (select 1 from public.progresso o where o.capitulo_id = p_capitulo and o.resolvido_em is not null) then v_selos := v_selos || 'primeiro'::text; end if;
  update public.progresso pr set resolvido_em = now(), nota = v_nota, selos = v_selos where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  -- "Mais rápido do capítulo": o menor tempo ativo entre os que acertaram (o banco passa o selo adiante).
  update public.progresso pr set selos = array_remove(pr.selos, 'mais-rapido') where pr.capitulo_id = p_capitulo and 'mais-rapido' = any (pr.selos);
  update public.progresso pr set selos = pr.selos || 'mais-rapido'::text
  where (pr.personagem_id, pr.capitulo_id) = (select o.personagem_id, o.capitulo_id from public.progresso o where o.capitulo_id = p_capitulo and o.resolvido_em is not null order by o.tempo_ativo_seg, o.resolvido_em limit 1);
  -- O próximo capítulo abre na hora.
  select * into v_prox from public.capitulos c where c.temporada_id = v_c.temporada_id and c.ordem = v_c.ordem + 1;
  if v_prox.id is not null then
    select p.numeros into v_num from public.personagens p where p.id = p_personagem;
    insert into public.progresso (personagem_id, capitulo_id, lugar, hora, fome, vontade)
    values (p_personagem, v_prox.id, v_prox.publico ->> 'lugarInicial', v_prox.relogio_inicio, v_pr.fome, coalesce((v_num ->> 'forcaVontade')::int, 3))
    on conflict do nothing;
  end if;
  -- O fecho: a variante pelo que aconteceu na cena de ação (a primeira marca que o jogador tem).
  v_texto := v_seg.fecho -> 'texto' ->> coalesce(v_seg.fecho ->> 'padrao', '');
  for v_var in select jsonb_array_elements(coalesce(v_seg.fecho -> 'variantes', '[]'::jsonb)) loop
    if (v_var ->> 'marca') = any (v_pr.marcas) then v_texto := v_seg.fecho -> 'texto' ->> (v_var ->> 'texto'); exit; end if;
  end loop;
  return jsonb_build_object('certo', true, 'nota', v_nota, 'selos', to_jsonb(v_selos),
    'fecho', jsonb_build_object('paineis', v_seg.fecho -> 'paineis', 'texto', v_texto,
      'escolhas', (select coalesce(jsonb_agg(jsonb_build_object('id', e -> 'id', 'rotulo', e -> 'rotulo')), '[]'::jsonb) from jsonb_array_elements(coalesce(v_seg.fecho -> 'escolhas', '[]'::jsonb)) e)),
    'proximo', case when v_prox.id is null then null else jsonb_build_object('id', v_prox.id, 'titulo', v_prox.titulo) end,
    'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- A escolha do fecho, depois de acertar.
create or replace function public.caso_final(p_capitulo text, p_personagem uuid, p_escolha text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_e jsonb;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem, false);
  if v_pr.resolvido_em is null then raise exception 'nao-resolvido'; end if;
  select e into v_e from public.capitulo_segredo s, jsonb_array_elements(s.fecho -> 'escolhas') e where s.capitulo_id = p_capitulo and e ->> 'id' = p_escolha;
  if v_e is null then raise exception 'conteudo-inexistente'; end if;
  update public.progresso pr set final = coalesce(pr.final, p_escolha) where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  return jsonb_build_object('id', v_e -> 'id', 'texto', v_e -> 'texto', 'efeito', v_e -> 'efeito');
end $$;

-- Dica: a próxima ainda não dada cuja pista o jogador não achou. Custa 60 pontos na nota (dicas_pedidas).
create or replace function public.caso_dica(p_capitulo text, p_personagem uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_d public.cap_dicas;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  if v_pr.resolvido_em is not null then raise exception 'acao-indisponivel'; end if;
  select * into v_d from public.cap_dicas d where d.capitulo_id = p_capitulo and not (d.ordem = any (v_pr.dicas_dadas)) and not (d.pista_id = any (v_pr.pistas)) order by d.ordem limit 1;
  if not found then return jsonb_build_object('texto', null, 'estado', public._cap_estado(p_personagem, p_capitulo)); end if;
  update public.progresso pr set dicas_pedidas = pr.dicas_pedidas + 1, dicas_dadas = pr.dicas_dadas || v_d.ordem where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  return jsonb_build_object('texto', v_d.texto, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- Pulso: o site chama a cada 60 s com o caso aberto e a aba visível. Só soma o tempo ativo.
create or replace function public.caso_pulso(p_capitulo text, p_personagem uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._cap_progresso(p_capitulo, p_personagem, false);
  perform public._cap_sinal(p_personagem, p_capitulo);
end $$;

-- Nova noite: depois do amanhecer, o relógio volta ao começo e acordar pode dar fome.
create or replace function public.caso_noite(p_capitulo text, p_personagem uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pr public.progresso; v_c public.capitulos; v_sobe boolean;
begin
  v_pr := public._cap_progresso(p_capitulo, p_personagem);
  perform public._cap_sinal(p_personagem, p_capitulo);
  select * into v_c from public.capitulos c where c.id = p_capitulo;
  if v_pr.resolvido_em is not null or v_pr.hora < v_c.relogio_fim then raise exception 'ainda-noite'; end if;
  update public.progresso pr set noites = pr.noites + 1, hora = v_c.relogio_inicio where pr.personagem_id = p_personagem and pr.capitulo_id = p_capitulo;
  v_sobe := public._cap_despertar(p_personagem, p_capitulo);
  return jsonb_build_object('fomeSobe', v_sobe, 'estado', public._cap_estado(p_personagem, p_capitulo));
end $$;

-- 7. Ranking de proficiência (seção 9.4). Nunca devolve pistas, respostas nem o caminho de ninguém.
-- Durante a temporada: média das notas; quem resolveu menos da metade dos capítulos fica abaixo. No
-- fechamento: a soma. Empate: menos erros, mais capítulos, quem resolveu antes.
create or replace function public.caso_ranking(p_temporada text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_t public.temporadas; v_n int; v_fechada boolean; v_lista jsonb;
begin
  select * into v_t from public.temporadas t where t.id = p_temporada;
  if not found or not (v_t.situacao <> 'teste' or auth.uid() = any (v_t.visivel_para)) then raise exception 'capitulo-inexistente'; end if;
  select count(*) into v_n from public.capitulos c where c.temporada_id = p_temporada;
  v_fechada := v_t.situacao = 'fechada' or (v_t.fecha_em is not null and now() > v_t.fecha_em);
  with base as (
    select p.id, p.nome, p.user_id, coalesce(p.estado ->> 'cla_aparente', p.ficha ->> 'cla') as cla,
      count(*) filter (where pr.resolvido_em is not null) as resolvidos,
      coalesce(sum(pr.nota) filter (where pr.resolvido_em is not null), 0) as soma,
      round(avg(pr.nota) filter (where pr.resolvido_em is not null)) as media,
      sum(pr.acusacoes_erradas) as erros,
      max(c.ordem) as capitulo_atual,
      max(pr.resolvido_em) as ultimo_acerto,
      (select coalesce(jsonb_agg(distinct s), '[]'::jsonb) from public.progresso p2 join public.capitulos c2 on c2.id = p2.capitulo_id, unnest(p2.selos) s
        where p2.personagem_id = p.id and c2.temporada_id = p_temporada) as selos
    from public.progresso pr join public.capitulos c on c.id = pr.capitulo_id join public.personagens p on p.id = pr.personagem_id
    where c.temporada_id = p_temporada
    group by p.id, p.nome, p.user_id, p.estado, p.ficha
  )
  select coalesce(jsonb_agg(jsonb_build_object('nome', b.nome, 'cla', b.cla, 'capitulo_atual', b.capitulo_atual, 'resolvidos', b.resolvidos,
      'media', b.media, 'soma', b.soma, 'erros', b.erros, 'selos', b.selos, 'ultimo_acerto', b.ultimo_acerto, 'voce', b.user_id = auth.uid())
    order by
      case when v_fechada then 0 else case when b.resolvidos * 2 >= v_n then 0 else 1 end end,
      case when v_fechada then b.soma else coalesce(b.media, -1) end desc,
      b.erros, b.resolvidos desc, b.ultimo_acerto nulls last), '[]'::jsonb)
  into v_lista from base b;
  return jsonb_build_object('temporada', jsonb_build_object('id', v_t.id, 'titulo', v_t.titulo, 'capitulos', v_n, 'fechada', v_fechada), 'ranking', v_lista);
end $$;

create or replace function public.caso_ranking_capitulo(p_capitulo text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_t public.temporadas; v_lista jsonb;
begin
  select t.* into v_t from public.capitulos c join public.temporadas t on t.id = c.temporada_id where c.id = p_capitulo;
  if not found or not (v_t.situacao <> 'teste' or auth.uid() = any (v_t.visivel_para)) then raise exception 'capitulo-inexistente'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('nome', p.nome, 'cla', coalesce(p.estado ->> 'cla_aparente', p.ficha ->> 'cla'),
      'resolvido_em', pr.resolvido_em, 'nota', pr.nota, 'erros', pr.acusacoes_erradas, 'selos', to_jsonb(pr.selos), 'voce', p.user_id = auth.uid())
    order by pr.resolvido_em is null, pr.nota desc nulls last, pr.acusacoes_erradas, pr.resolvido_em), '[]'::jsonb)
  into v_lista from public.progresso pr join public.personagens p on p.id = pr.personagem_id where pr.capitulo_id = p_capitulo;
  return v_lista;
end $$;

-- 8. Permissões: as auxiliares ninguém chama de fora; as do jogo, só quem fez login.
do $$
declare v_f record;
begin
  for v_f in select p.oid::regprocedure as assinatura, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and (p.proname like '\_cap\_%' or p.proname like 'caso\_%') loop
    execute format('revoke all on function %s from public, anon, authenticated', v_f.assinatura);
    if v_f.proname like 'caso\_%' then execute format('grant execute on function %s to authenticated', v_f.assinatura); end if;
  end loop;
end $$;
