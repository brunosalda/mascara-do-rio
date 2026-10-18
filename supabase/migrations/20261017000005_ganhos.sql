-- Fase 3 (P5/P6): os ganhos da noite, gravados pelo Narrador no fechamento e só lidos pelo site.
-- Aplicada em 18/10/2026, com o "tudo aprovado" do Bruno no chat do desenvolvimento.
-- Formato (parecer do Narrador, gerencia/pareceres/fase3-narrador.md):
-- { "xp": 2, "itens": [{ "nome", "tipo", "raridade", "traco", "vantagem" }],
--   "status": [{ "faccao", "de", "para" }], "refugio": [{ "aspecto", "de", "para", "motivo" }],
--   "feitos": ["..."], "perdas": [{ "item", "motivo" }] }
-- A leitura já é coberta pela política "ver as próprias narrações"; o jogador não grava narrações.
alter table public.narracoes add column if not exists ganhos jsonb default null;
comment on column public.narracoes.ganhos is 'Ganhos da noite (experiência, itens, status, refúgio, feitos, perdas), gravados pelo Narrador no fechamento.';

-- Cidade do personagem ("rio" ou "sp"), ao lado de estado.local. Quem já existe fica no Rio.
-- É um campo dentro de personagens.estado (jsonb), sem coluna nova.
update public.personagens set estado = coalesce(estado, '{}'::jsonb) || '{"cidade": "rio"}'::jsonb
  where not (coalesce(estado, '{}'::jsonb) ? 'cidade');
