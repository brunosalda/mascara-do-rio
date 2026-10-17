-- A Máscara do Rio — schema inicial (etapa 1: protótipo)
--
-- Quem escreve o quê:
--   jogador (role authenticated): cria e edita a própria ficha enquanto ela
--     está em criação/revisão; envia e edita as ações da noite aberta.
--   Narrador (acesso de serviço, ignora RLS): ativa personagens, resolve as
--     noites, escreve narrações, rolagens e o estado dos personagens.

-- ---------------------------------------------------------------------------
-- Convidados: só esses e-mails conseguem criar conta
-- ---------------------------------------------------------------------------
create table public.convidados (
  email     text primary key check (email = lower(email)),
  papel     text not null default 'jogador' check (papel in ('dono', 'jogador')),
  criado_em timestamptz not null default now()
);
alter table public.convidados enable row level security;
revoke all on public.convidados from anon, authenticated;

create or replace function public.verificar_convidado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.convidados where email = lower(new.email)) then
    raise exception 'E-mail não convidado para A Máscara do Rio';
  end if;
  return new;
end;
$$;
revoke execute on function public.verificar_convidado() from public, anon, authenticated;

create trigger verificar_convidado
  before insert on auth.users
  for each row execute function public.verificar_convidado();

-- ---------------------------------------------------------------------------
-- Utilitário: carimbo de atualização
-- ---------------------------------------------------------------------------
create or replace function public.tocar_atualizado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Personagens
--   ficha  = escolhas da criação (o jogador edita até o Narrador ativar)
--   estado = Fome, dano, manchas, XP, local etc. (só o Narrador escreve)
-- ---------------------------------------------------------------------------
create table public.personagens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome          text not null default '' check (char_length(nome) <= 80),
  status        text not null default 'criacao'
                check (status in ('criacao', 'revisao', 'ativo', 'torpor', 'morto')),
  ficha         jsonb not null default '{}'::jsonb,
  estado        jsonb not null default '{}'::jsonb,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index personagens_user_id_idx on public.personagens (user_id);
create trigger personagens_atualizado before update on public.personagens
  for each row execute function public.tocar_atualizado();

alter table public.personagens enable row level security;
create policy "ver os próprios personagens" on public.personagens
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "criar o próprio personagem" on public.personagens
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status in ('criacao', 'revisao'));
create policy "editar enquanto em criação ou revisão" on public.personagens
  for update to authenticated
  using (user_id = (select auth.uid()) and status in ('criacao', 'revisao'))
  with check (user_id = (select auth.uid()) and status in ('criacao', 'revisao'));
create policy "apagar rascunho" on public.personagens
  for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'criacao');

revoke all on public.personagens from anon;
revoke insert, update on public.personagens from authenticated;
grant insert (nome, status, ficha) on public.personagens to authenticated;
grant update (nome, status, ficha) on public.personagens to authenticated;

-- ---------------------------------------------------------------------------
-- Noites
-- ---------------------------------------------------------------------------
create table public.noites (
  id               bigint generated always as identity primary key,
  numero           int not null unique,
  status           text not null default 'aberta' check (status in ('aberta', 'fechada', 'resolvida')),
  abre_em          timestamptz not null default now(),
  fecha_em         timestamptz not null,
  narracao_publica text,
  resolvida_em     timestamptz
);
alter table public.noites enable row level security;
create policy "jogadores veem as noites" on public.noites
  for select to authenticated
  using (true);
revoke all on public.noites from anon;
revoke insert, update, delete on public.noites from authenticated;

-- ---------------------------------------------------------------------------
-- Ações da noite (uma linha por personagem por noite)
-- ---------------------------------------------------------------------------
create table public.acoes (
  id            uuid primary key default gen_random_uuid(),
  noite_id      bigint not null references public.noites (id) on delete cascade,
  personagem_id uuid not null references public.personagens (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  principal     text not null default '' check (char_length(principal) <= 1500),
  cacada        text not null default '' check (char_length(cacada) <= 800),
  nao_cacar     boolean not null default false,
  curta_1       text not null default '' check (char_length(curta_1) <= 500),
  curta_2       text not null default '' check (char_length(curta_2) <= 500),
  esforco       boolean not null default false, -- autoriza gastar Força de Vontade
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (noite_id, personagem_id)
);
create index acoes_personagem_id_idx on public.acoes (personagem_id);
create index acoes_user_id_idx on public.acoes (user_id);
create trigger acoes_atualizado before update on public.acoes
  for each row execute function public.tocar_atualizado();

alter table public.acoes enable row level security;
create policy "ver as próprias ações" on public.acoes
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "enviar ação na noite aberta" on public.acoes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.noites n where n.id = noite_id and n.status = 'aberta')
    and exists (select 1 from public.personagens p
                where p.id = personagem_id and p.user_id = (select auth.uid()) and p.status = 'ativo')
  );
create policy "editar ação na noite aberta" on public.acoes
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.noites n where n.id = noite_id and n.status = 'aberta')
  )
  with check (user_id = (select auth.uid()));

revoke all on public.acoes from anon;
revoke insert, update, delete on public.acoes from authenticated;
grant insert (noite_id, personagem_id, principal, cacada, nao_cacar, curta_1, curta_2, esforco)
  on public.acoes to authenticated;
grant update (principal, cacada, nao_cacar, curta_1, curta_2, esforco)
  on public.acoes to authenticated;

-- ---------------------------------------------------------------------------
-- Narrações privadas (prelúdio e resultado de cada noite, por personagem)
-- ---------------------------------------------------------------------------
create table public.narracoes (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null default 'noite' check (tipo in ('preludio', 'noite')),
  noite_id      bigint references public.noites (id) on delete cascade,
  personagem_id uuid not null references public.personagens (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  texto         text not null,
  opcoes        jsonb not null default '[]'::jsonb, -- ações sugeridas para a próxima noite
  criado_em     timestamptz not null default now()
);
create index narracoes_personagem_id_idx on public.narracoes (personagem_id, criado_em desc);
create index narracoes_user_id_idx on public.narracoes (user_id);
create index narracoes_noite_id_idx on public.narracoes (noite_id);

alter table public.narracoes enable row level security;
create policy "ver as próprias narrações" on public.narracoes
  for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.narracoes from anon;
revoke insert, update, delete on public.narracoes from authenticated;

-- ---------------------------------------------------------------------------
-- Rolagens (registro do motor; nenhum jogador lê)
-- ---------------------------------------------------------------------------
create table public.rolagens (
  id            bigint generated always as identity primary key,
  noite_id      bigint references public.noites (id) on delete cascade,
  personagem_id uuid references public.personagens (id) on delete cascade,
  rotulo        text not null,
  parada        int not null,
  fome          int not null default 0,
  dificuldade   int not null default 0,
  resultado     jsonb not null,
  criado_em     timestamptz not null default now()
);
create index rolagens_noite_id_idx on public.rolagens (noite_id);
create index rolagens_personagem_id_idx on public.rolagens (personagem_id);
alter table public.rolagens enable row level security;
revoke all on public.rolagens from anon, authenticated;
