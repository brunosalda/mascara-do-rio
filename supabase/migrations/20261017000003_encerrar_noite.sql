-- Encerrar a noite (pedido do Bruno, 17/10/2026): cada jogador pode encerrar a própria noite depois
-- de enviar. Quando todos os personagens ativos encerram, o vigia do PC do Bruno fecha a noite e chama
-- o Narrador na hora, sem esperar a tarefa de 2 em 2 horas.

-- 1. A hora em que o jogador encerrou (o servidor define a hora; depois disso, a ação não muda mais).
alter table public.acoes add column if not exists encerrada_em timestamptz;

-- 2. Marca de quando o vigia fechou a noite: a tarefa agendada não mexe numa noite que o vigia está
--    resolvendo (ver narrador/CLAUDE.md, regra D).
alter table public.noites add column if not exists vigia_em timestamptz;

-- 3. Trava: depois de encerrada, a ação não muda (nem volta atrás). O Narrador, com a chave de serviço,
--    continua podendo mexer.
create or replace function public.acoes_trava_encerrada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or current_user in ('postgres', 'service_role') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.encerrada_em is not null then
    raise exception 'Você já encerrou esta noite. Não dá mais para mudar.';
  end if;
  if new.encerrada_em is not null then
    new.encerrada_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists acoes_trava_encerrada on public.acoes;
create trigger acoes_trava_encerrada
  before insert or update on public.acoes
  for each row execute function public.acoes_trava_encerrada();

-- 4. Todos os personagens ativos encerraram a noite? (sem revelar nada das ações de ninguém)
create or replace function public.noite_todos_encerraram(p_noite bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.personagens where status = 'ativo')
     and not exists (
       select 1 from public.personagens p
       where p.status = 'ativo'
         and not exists (
           select 1 from public.acoes a
           where a.noite_id = p_noite and a.personagem_id = p.id and a.encerrada_em is not null
         )
     );
$$;

-- 5. Usada pelo vigia: fecha a noite aberta só se todos encerraram, e devolve qual foi. Chamar antes
--    da hora não faz nada, então ela pode ficar aberta à chave pública do site.
create or replace function public.vigia_fechar_noite()
returns table (id bigint, numero bigint)
language sql
volatile
security definer
set search_path = ''
as $$
  update public.noites n
     set status = 'fechada', vigia_em = now()
   where n.status = 'aberta'
     and public.noite_todos_encerraram(n.id)
  returning n.id::bigint, n.numero::bigint;
$$;

-- 6. Só leitura, para o ensaio do vigia: qual noite aberta já poderia ser fechada (sem fechar).
create or replace function public.vigia_noite_pronta()
returns table (id bigint, numero bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id::bigint, n.numero::bigint
    from public.noites n
   where n.status = 'aberta'
     and public.noite_todos_encerraram(n.id);
$$;

revoke all on function public.vigia_noite_pronta() from public;
grant execute on function public.vigia_noite_pronta() to anon, authenticated, service_role;
revoke all on function public.noite_todos_encerraram(bigint) from public;
revoke all on function public.vigia_fechar_noite() from public;
grant execute on function public.noite_todos_encerraram(bigint) to anon, authenticated, service_role;
grant execute on function public.vigia_fechar_noite() to anon, authenticated, service_role;
