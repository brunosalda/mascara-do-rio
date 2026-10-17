# A Máscara do Rio

RPG online de Vampiro: A Máscara (5ª edição) ambientado no Rio de Janeiro atual,
para um grupo fechado de amigos. Projeto de fã, pessoal e não comercial.

## O que é

Um app de página única em HTML/CSS/JS puro (sem framework, sem etapa de build)
onde cada jogador cria seu vampiro e envia as ações de cada noite. Um Narrador
de IA resolve as noites, aplica as regras da V5 e devolve a narração pública e
a privada de cada personagem.

## Estrutura

```
.
├── index.html              ← o app (página única)
├── css/estilo.css
├── js/
│   ├── app.js              ← sessão, personagem atual, navegação
│   ├── banco.js            ← login e leitura/gravação no Supabase
│   ├── cidade.js           ← lugares do Rio e a pintura de fundo de cada um
│   ├── config.js           ← URL e chave pública do Supabase
│   ├── criacao.js          ← assistente de criação de personagem (9 etapas)
│   ├── noite.js            ← painel da noite e envio de ações
│   ├── ficha.js            ← ficha em palavras e ficha técnica
│   ├── diario.js           ← noites já narradas
│   ├── ui.js               ← narração (vozes, falas, escolhas), painéis de HQ, utilitários
│   └── motor/
│       ├── v5.js           ← regras da V5: tabelas, cálculos, validação, textos
│       └── dados.js        ← rolagens (usado só pelos scripts do Narrador)
├── img/                    ← cenário padrão do Rio, retrato padrão, pinturas dos lugares
├── package.json            ← marca os .js como módulos ES (sem dependências)
└── supabase/migrations/    ← tabelas e regras de acesso (RLS)
```

O Narrador (instruções, bíblia da cidade, scripts de rolagem) fica numa pasta
privada fora deste repositório.

## Rodando localmente

Não há build. Basta servir os arquivos estaticamente na porta 3000 (é o
endereço para onde o link de login por e-mail volta):

```
python -m http.server 3000
```

e abrir `http://localhost:3000/` no navegador.

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
