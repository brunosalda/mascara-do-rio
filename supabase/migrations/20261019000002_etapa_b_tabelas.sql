-- Formato v3, etapa B, passo 1: as tabelas do motor de capítulos, as permissões e personagens.numeros.
-- Desenho: gerencia/etapa-b-desenho.md (seções 2, 8 e 9). As funções vêm no passo 2.
--
-- Regra de ouro: o segredo do caso (pessoas, conversas, exames, pistas, dicas, resposta, eventos, fecho)
-- fica em tabelas sem NENHUMA permissão para anon e authenticated. O jogador só recebe o que conquistou,
-- pelas funções (security definer). O progresso, o jogador lê, mas não grava.

-- 1. A ficha em números, gravada pelo script do Narrador com o mesmo v5.js (atributos, habilidades,
--    disciplinas, poderes, Força de Vontade). O jogador já não consegue gravar colunas além de nome,
--    status e ficha (grant por coluna na migração inicial), então esta nasce protegida.
alter table public.personagens add column if not exists numeros jsonb default null;
comment on column public.personagens.numeros is 'Ficha em números, gravada pelo Narrador (v5.js). O banco usa só esta coluna para montar a parada.';

-- 2. Temporadas e capítulos (a parte pública).
create table public.temporadas (
  id            text primary key,
  titulo        text not null,
  situacao      text not null default 'teste' check (situacao in ('teste', 'aberta', 'fechada')),
  abre_em       timestamptz,
  fecha_em      timestamptz,
  visivel_para  uuid[] not null default '{}',   -- só na temporada de teste: quem a vê
  criado_em     timestamptz not null default now()
);

create table public.capitulos (
  id                    text primary key,
  temporada_id          text not null references public.temporadas (id) on delete cascade,
  ordem                 int not null check (ordem between 1 and 20),
  titulo                text not null,
  pergunta              text not null,
  relogio_inicio        int not null default 1140,   -- minutos desde a meia-noite (19h)
  relogio_fim           int not null default 1770,   -- 5h30 do dia seguinte
  custos                jsonb not null default '{}'::jsonb,
  publico               jsonb not null default '{}'::jsonb,  -- abertura, ajuda, lugares, lacunas, palavras (sem o "por")
  tempo_referencia_min  int not null default 40,
  pistas_minimas        int not null default 0,
  criado_em             timestamptz not null default now(),
  unique (temporada_id, ordem)
);

-- 3. O segredo do capítulo.
create table public.capitulo_segredo (
  capitulo_id  text primary key references public.capitulos (id) on delete cascade,
  resposta     jsonb not null,
  eventos      jsonb not null default '[]'::jsonb,
  fecho        jsonb not null default '{}'::jsonb
);
create table public.cap_pessoas (
  capitulo_id  text not null references public.capitulos (id) on delete cascade,
  id           text not null,
  lugar        text not null,
  dados        jsonb not null,
  primary key (capitulo_id, id)
);
create table public.cap_conteudos (
  capitulo_id  text not null references public.capitulos (id) on delete cascade,
  chave        text not null,
  tipo         text not null check (tipo in ('topico', 'exame')),
  pessoa       text,
  lugar        text,
  requer       text[] not null default '{}',
  dados        jsonb not null,   -- rótulo, custo, teste, poder, textos e pistas de sucesso e de falha, marcas
  primary key (capitulo_id, chave)
);
create table public.cap_pistas (
  capitulo_id  text not null references public.capitulos (id) on delete cascade,
  id           text not null,
  titulo       text not null,
  texto        text not null,
  fonte        text,
  sobre        text,
  tipo         text,
  primary key (capitulo_id, id)
);
create table public.cap_dicas (
  capitulo_id  text not null references public.capitulos (id) on delete cascade,
  ordem        int not null,
  pista_id     text not null,
  texto        text not null,
  primary key (capitulo_id, ordem)
);

-- 4. O progresso de cada personagem em cada capítulo, e o registro das rolagens (cap_rolagens: o jogo antigo já tem uma tabela rolagens).
create table public.progresso (
  personagem_id      uuid not null references public.personagens (id) on delete cascade,
  capitulo_id        text not null references public.capitulos (id) on delete cascade,
  lugar              text,
  minutos            int not null default 0,
  noites             int not null default 1,
  fome               int not null default 0,
  marcas             text[] not null default '{}',
  pistas             text[] not null default '{}',
  acusacoes_erradas  int not null default 0,
  dicas_pedidas      int not null default 0,
  acao_vencida       boolean not null default false,
  tempo_ativo_seg    int not null default 0,
  ultimo_sinal       timestamptz,
  nota               int,
  selos              text[] not null default '{}',
  criado_em          timestamptz not null default now(),
  resolvido_em       timestamptz,
  primary key (personagem_id, capitulo_id)
);
create index progresso_capitulo_idx on public.progresso (capitulo_id);

create table public.cap_rolagens (
  id             bigint generated always as identity primary key,
  personagem_id  uuid not null references public.personagens (id) on delete cascade,
  capitulo_id    text not null references public.capitulos (id) on delete cascade,
  chave          text not null,
  parada         int not null,
  fome           int not null,
  dados          int[] not null,
  sucessos       int not null,
  resultado      text not null,
  criado_em      timestamptz not null default now()
);
create index cap_rolagens_personagem_idx on public.cap_rolagens (personagem_id);

-- 5. Permissões.
alter table public.temporadas enable row level security;
alter table public.capitulos enable row level security;
alter table public.capitulo_segredo enable row level security;
alter table public.cap_pessoas enable row level security;
alter table public.cap_conteudos enable row level security;
alter table public.cap_pistas enable row level security;
alter table public.cap_dicas enable row level security;
alter table public.progresso enable row level security;
alter table public.cap_rolagens enable row level security;

-- O segredo: nenhuma permissão e nenhuma política (só as funções, como dono, leem).
revoke all on public.capitulo_segredo, public.cap_pessoas, public.cap_conteudos, public.cap_pistas, public.cap_dicas from anon, authenticated;

-- O público e o progresso: só leitura, e só para quem fez login.
revoke all on public.temporadas, public.capitulos, public.progresso, public.cap_rolagens from anon, authenticated;
grant select on public.temporadas, public.capitulos, public.progresso, public.cap_rolagens to authenticated;

create policy "ver temporadas abertas ou de teste para quem pode" on public.temporadas
  for select to authenticated
  using (situacao <> 'teste' or auth.uid() = any (visivel_para));

-- O capítulo 1 aparece para quem vê a temporada; os outros, só depois de resolver o anterior (quando o
-- progresso daquele capítulo é criado pela função que confere a dedução).
create policy "ver capítulos liberados" on public.capitulos
  for select to authenticated
  using (
    exists (select 1 from public.temporadas t where t.id = capitulos.temporada_id)
    and (
      ordem = 1
      or exists (
        select 1 from public.progresso pr join public.personagens p on p.id = pr.personagem_id
        where pr.capitulo_id = capitulos.id and p.user_id = auth.uid()
      )
    )
  );

create policy "ver o próprio progresso" on public.progresso
  for select to authenticated
  using (exists (select 1 from public.personagens p where p.id = progresso.personagem_id and p.user_id = auth.uid()));

create policy "ver as próprias rolagens" on public.cap_rolagens
  for select to authenticated
  using (exists (select 1 from public.personagens p where p.id = cap_rolagens.personagem_id and p.user_id = auth.uid()));
