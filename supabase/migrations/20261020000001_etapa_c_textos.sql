-- Etapa C, revisão de 20/10/2026 (roteirista, coordenação e avaliação), nas funções do banco:
-- 1. caso_confronto: nada de números no registro (o dano em palavras: de raspão, golpe firme, golpe forte),
--    os textos novos do sangue e da queda, e os desfechos próprios do confronto (segredo.perseguicao.confronto:
--    a vitória segue com a confissão da perseguição, sem a primeira frase dela).
-- 2. caso_infiltracao: a falha usa o texto de quem viu (abordagem.falhaPor, pela vigia que a tela informa;
--    só muda o texto, não o resultado).
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.caso_confronto(text, uuid, text)'::regprocedure) into v_def;
  if position('''Você acerta: '' || dano || '' de dano.''' in v_def) = 0 or position('''Ele acerta você: '' || dano || '' de dano.''' in v_def) = 0
     or position('v_r := v_seg -> v_final;' in v_def) = 0 then raise exception 'trechos de caso_confronto não encontrados'; end if;
  v_def := replace(v_def, '''Você acerta: '' || dano || '' de dano.''',
    '''Você acerta: '' || (case when dano >= 3 then ''golpe forte'' when dano = 2 then ''golpe firme'' else ''de raspão'' end) || ''.''');
  v_def := replace(v_def, '''Ele acerta você: '' || dano || '' de dano.''',
    '''Ele acerta você: '' || (case when dano >= 3 then ''golpe forte'' when dano = 2 then ''golpe firme'' else ''de raspão'' end) || ''.''');
  v_def := replace(v_def, '''Usar o sangue me acordou. Mais fome.''', '''O sangue desperta, e a Fome sobe.''');
  v_def := replace(v_def, '''O sangue responde.''', '''O sangue responde sem cobrar nada.''');
  v_def := replace(v_def, '''Ele cai de joelhos e não levanta mais.''', '''Ele cai de joelhos e não tenta mais levantar.''');
  v_def := replace(v_def, 'v_r := v_seg -> v_final;',
    'v_r := v_seg -> v_final;' ||
    ' if v_seg ? ''confronto'' then' ||
    '   v_r := v_r || jsonb_build_object(''texto'', (case when v_final = ''pego''' ||
    '     then (v_seg -> ''confronto'' ->> ''venceu'') || E''\n\n'' || regexp_replace(v_seg -> ''pego'' ->> ''texto'', ''^.*?\n\n'', '''')' ||
    '     else v_seg -> ''confronto'' ->> ''perdeu'' end));' ||
    ' end if;');
  execute v_def;

  select pg_get_functiondef('public.caso_infiltracao(text, uuid, text, integer, text, jsonb)'::regprocedure) into v_def;
  if position('v_r := v_resultados -> (case when v_ok then v_a ->> ''sucesso'' else v_a ->> ''falha'' end);' in v_def) = 0 then raise exception 'trecho de caso_infiltracao não encontrado'; end if;
  v_def := replace(v_def, 'v_r := v_resultados -> (case when v_ok then v_a ->> ''sucesso'' else v_a ->> ''falha'' end);',
    'v_r := v_resultados -> (case when v_ok then v_a ->> ''sucesso'' else coalesce(v_a -> ''falhaPor'' ->> (p_registro ->> ''vigia''), v_a ->> ''falha'') end);');
  execute v_def;
end $$;
