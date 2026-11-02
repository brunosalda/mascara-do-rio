// Carrega capítulos da temporada 1 do Carmen no banco sem que o conteúdo passe pela conversa: gera o capítulo
// em JSON (carmen-para-banco.mjs --carga) e manda à função temporária carregar_capitulo_carmen, com o código de
// ferramentas/carga-carmen.local.json (fora do git). Mostra só contagens, nunca o conteúdo.
// A função é temporária: recriar antes e apagar depois (ver supabase/migrations/20261102000002_*).
//
//   node ferramentas/carregar-carmen.mjs 1 2 3 4 5 6
//   node ferramentas/carregar-carmen.mjs t1          (o capítulo de teste 1)
//
// A função (02/11) recebe o capítulo como dados, não como comandos: atualiza a linha do capítulo, que já
// precisa existir, e troca pessoas, conteúdos, pistas e segredo. Nunca toca no progresso.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../js/config.js';

const { codigo } = JSON.parse(readFileSync(new URL('./carga-carmen.local.json', import.meta.url), 'utf8'));
const caps = process.argv.slice(2).filter((a) => /^t?[1-6]$/.test(a));
if (!caps.length) { console.error('Diga os capítulos: node ferramentas/carregar-carmen.mjs 1 2 3'); process.exit(1); }

for (const n of caps) {
  const cap = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('./carmen-para-banco.mjs', import.meta.url)), n.replace('t', ''), '--carga', ...(n.startsWith('t') ? ['--teste'] : [])],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }));
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/carregar_capitulo_carmen`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_codigo: codigo, p_cap: cap }),
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) { console.error(`${n}: falhou (${r.status} ${corpo.code || ''} ${corpo.message || ''})`); process.exit(1); }
  console.log(`${cap.capitulo.id}: ok, ${corpo.pessoas} pessoas, ${corpo.conteudos} conteúdos, ${corpo.pistas} pistas (enviados ${cap.pessoas.length}, ${cap.conteudos.length}, ${cap.pistas.length})`);
}
