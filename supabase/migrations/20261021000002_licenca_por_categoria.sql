-- Licença de Caça (correção da avaliação, 21/10): a trava passa a ser por categoria, não por valor.
-- Cada traço marcado precisa ser de uma categoria da qual o jogador já conquistou alguma pista; o valor fica
-- à escolha dele. Assim a Licença errada volta a ser possível (quem lê mal uma pista paga os -200), e o
-- Arquivo deixa de ser só uma conferência. Continua exigindo pelo menos 3 traços conquistados.
do $$
declare v_def text; a1 text; b1 text;
begin
  select pg_get_functiondef('public.caso_licenca(text, uuid, text, jsonb)'::regprocedure) into v_def;
  a1 := 'not (v_marc <@ v_tem)';
  b1 := 'exists (select 1 from unnest(v_marc) m where split_part(m, ''='', 1) <> all (select split_part(t, ''='', 1) from unnest(v_tem) t))';
  if position(a1 in v_def) = 0 then raise exception 'trecho de caso_licenca não encontrado'; end if;
  execute replace(v_def, a1, b1);
end $$;
