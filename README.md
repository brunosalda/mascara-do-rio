# A Máscara do Rio

RPG online de Vampiro: A Máscara (5ª edição) ambientado no Rio de Janeiro atual,
para um grupo fechado de amigos. Projeto de fã, pessoal e não comercial.

## O que é

Um app de página única em HTML/CSS/JS puro (sem framework, sem etapa de build)
onde cada jogador cria seu vampiro e envia as ações de cada noite. Um Narrador
de IA resolve as noites, aplica as regras da V5 e devolve a narração pública e
a privada de cada personagem.

## Estrutura

Em construção (etapa 1 do plano).

## Rodando localmente

Não há build. Basta servir os arquivos estaticamente, por exemplo:

```
python -m http.server 8000
```

e abrir `http://localhost:8000/` no navegador.

## Deploy

GitHub Pages: qualquer push para `main` publica o site.

## Backend

Supabase (Postgres + Auth + RLS + Realtime), acesso restrito a uma lista de
e-mails convidados. A chave pública (anon) pode ficar no site; a chave de
serviço nunca entra neste repositório.

## Aviso legal

Este é um conteúdo de fã não oficial, sem fins comerciais. Vampire: The
Masquerade e World of Darkness são marcas registradas da Paradox Interactive
AB. O aviso completo do Dark Pack Agreement e o logo do programa serão
incluídos no site antes da abertura para os jogadores.
