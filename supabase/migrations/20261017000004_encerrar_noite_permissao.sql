-- O jogador grava só as colunas liberadas (migração inicial). Libera também encerrada_em, para o botão
-- "Encerrar minha noite". A trava acoes_trava_encerrada define a hora e impede voltar atrás.
grant update (encerrada_em) on public.acoes to authenticated;
