-- Animação de caminhada de cada personagem (folha de quadros em img/sprites/<id>.png).
-- Formato: {"url": "img/sprites/<id>.png", "quadros": 6, "largura": 233, "altura": 420, "parado": 3}
-- Só o Narrador escreve (jogadores não têm permissão de gravar nesta coluna).
alter table public.personagens add column sprite jsonb;
