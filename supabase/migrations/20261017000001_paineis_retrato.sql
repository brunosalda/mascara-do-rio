-- Painéis de HQ nas narrações e nas noites, e retrato dos personagens.
-- Formato de cada painel: {"imagem": "url ou null", "legenda": "texto", "baloes": [{"quem": "NOME", "texto": "fala"}]}
-- Só o Narrador escreve essas colunas (os jogadores não têm permissão de gravar nelas).

alter table public.narracoes add column paineis jsonb not null default '[]'::jsonb;
alter table public.noites add column paineis jsonb not null default '[]'::jsonb;
alter table public.personagens add column retrato text;
