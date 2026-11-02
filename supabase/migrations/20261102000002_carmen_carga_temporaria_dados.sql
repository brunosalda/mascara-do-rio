-- Carga única do Carmen 2026 (02/11/2026), sem o conteúdo passar pela conversa e sem apagar o progresso de ninguém.
-- Uma função temporária recebe cada capítulo como dados (o JSON de ferramentas/carmen-para-banco.mjs --carga,
-- mandado por ferramentas/carregar-carmen.mjs) e confere o sha256 de um código local. Não executa texto: só
-- atualiza a linha do capítulo, que já precisa existir, e troca pessoas, conteúdos, pistas e segredo. O progresso,
-- as dívidas e o próprio capítulo nunca são apagados. Ela é apagada logo depois da carga (fim deste arquivo).
create or replace function public.carregar_capitulo_carmen(p_codigo text, p_cap jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_c jsonb := p_cap -> 'capitulo'; v_s jsonb := p_cap -> 'segredo'; v_id text := p_cap -> 'capitulo' ->> 'id';
  v_pe int; v_co int; v_pi int;
begin
  if encode(sha256(convert_to(coalesce(p_codigo, ''), 'UTF8')), 'hex') <> '082613109e9582be90e287a9c0ccf8a2cd1c179608adafec028e539eb6ff3b97' then
    raise exception 'codigo-invalido';
  end if;
  if not exists (select 1 from public.capitulos c where c.id = v_id and c.formato = 'rota') then raise exception 'capitulo-inexistente'; end if;

  update public.capitulos c set titulo = v_c ->> 'titulo', pergunta = v_c ->> 'pergunta',
    relogio_inicio = (v_c -> 'relogio' ->> 'inicio')::int, relogio_fim = (v_c -> 'relogio' ->> 'fim')::int,
    custos = v_c -> 'custos', publico = v_c -> 'publico', tempo_referencia_min = (v_c ->> 'tempo_referencia_min')::int,
    pistas_minimas = (v_c ->> 'pistas_minimas')::int
  where c.id = v_id;

  delete from public.cap_conteudos where capitulo_id = v_id;
  delete from public.cap_pessoas where capitulo_id = v_id;
  delete from public.cap_pistas where capitulo_id = v_id;
  delete from public.capitulo_segredo where capitulo_id = v_id;

  insert into public.capitulo_segredo (capitulo_id, resposta, eventos, fecho, palavras_por, rota, culpado)
  values (v_id, '{}'::jsonb, coalesce(v_s -> 'eventos', '[]'::jsonb), v_s -> 'fecho', '{}'::jsonb, v_s -> 'rota', v_s ->> 'culpado');
  insert into public.cap_pessoas (capitulo_id, id, lugar, dados)
  select v_id, e ->> 'id', e ->> 'lugar', e -> 'dados' from jsonb_array_elements(p_cap -> 'pessoas') e;
  get diagnostics v_pe = row_count;
  insert into public.cap_conteudos (capitulo_id, chave, tipo, pessoa, lugar, requer, dados, ordem)
  select v_id, e ->> 'chave', e ->> 'tipo', e ->> 'pessoa', e ->> 'lugar', array(select jsonb_array_elements_text(coalesce(e -> 'requer', '[]'::jsonb))), e -> 'dados', (e ->> 'ordem')::int
  from jsonb_array_elements(p_cap -> 'conteudos') e;
  get diagnostics v_co = row_count;
  insert into public.cap_pistas (capitulo_id, id, titulo, texto, fonte, sobre, tipo, indireta, aponta)
  select v_id, e ->> 'id', e ->> 'titulo', e ->> 'texto', e ->> 'fonte', e ->> 'sobre', e ->> 'tipo', coalesce((e ->> 'indireta')::boolean, false), e ->> 'aponta'
  from jsonb_array_elements(p_cap -> 'pistas') e;
  get diagnostics v_pi = row_count;
  return jsonb_build_object('pessoas', v_pe, 'conteudos', v_co, 'pistas', v_pi);
end $$;
revoke all on function public.carregar_capitulo_carmen(text, jsonb) from public;
grant execute on function public.carregar_capitulo_carmen(text, jsonb) to anon, authenticated;

-- Apagada logo depois da carga (02/11, 7 capítulos: carmen-1 a 6 e teste-carmen-1):
drop function if exists public.carregar_capitulo_carmen(text, jsonb);
