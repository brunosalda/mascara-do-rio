-- Fase 3 (P5/P6): os ganhos da noite, gravados pelo Narrador no fechamento e só lidos pelo site.
-- NÃO APLICADA: espera o OK do Bruno no chat do desenvolvimento.
-- Formato (parecer do Narrador, gerencia/pareceres/fase3-narrador.md):
-- { "xp": 2, "itens": [{ "nome", "tipo", "raridade", "traco", "vantagem" }],
--   "status": [{ "faccao", "de", "para" }], "refugio": [{ "aspecto", "de", "para", "motivo" }],
--   "feitos": ["..."], "perdas": [{ "item", "motivo" }] }
-- A leitura já é coberta pela política "ver as próprias narrações"; o jogador não grava narrações.
alter table public.narracoes add column if not exists ganhos jsonb default null;
comment on column public.narracoes.ganhos is 'Ganhos da noite (experiência, itens, status, refúgio, feitos, perdas), gravados pelo Narrador no fechamento.';
