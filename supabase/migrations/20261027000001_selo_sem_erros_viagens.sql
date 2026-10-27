-- Avaliação da vitrine, defeito 2: no formato rota, o selo "sem erros" também exige nenhuma viagem errada.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.caso_cercar(text,uuid)'::regprocedure);
  if position('if v_pr.acusacoes_erradas = 0 then v_selos' in d) = 0 then raise exception 'trecho do selo não encontrado'; end if;
  d := replace(d, 'if v_pr.acusacoes_erradas = 0 then v_selos', 'if v_pr.acusacoes_erradas = 0 and coalesce(v_pr.viagens_erradas, 0) = 0 then v_selos');
  execute d;
end $$;
