// Carrega capítulos da temporada 1 do Carmen no banco sem que o conteúdo passe pela conversa: gera o SQL de
// cada capítulo (carmen-para-banco.mjs) e manda os comandos à função temporária carregar_capitulo_carmen, com
// o código de ferramentas/carga-carmen.local.json (fora do git). Mostra só contagens, nunca o conteúdo.
// A função é temporária: recriar antes e apagar depois (ver supabase/migrations/20261028000002_*).
//
//   node ferramentas/carregar-carmen.mjs 1 2 3 4 5 6
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../js/config.js';

const { codigo } = JSON.parse(readFileSync(new URL('./carga-carmen.local.json', import.meta.url), 'utf8'));
const caps = process.argv.slice(2).filter((a) => /^[1-6]$/.test(a));
if (!caps.length) { console.error('Diga os capítulos: node ferramentas/carregar-carmen.mjs 1 2 3'); process.exit(1); }

for (const n of caps) {
  const sql = execFileSync(process.execPath, [fileURLToPath(new URL('./carmen-para-banco.mjs', import.meta.url)), n],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  const comandos = sql.split('\n').map((l) => l.trim()).filter((l) => l && l !== 'begin;' && l !== 'commit;');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/carregar_capitulo_carmen`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_codigo: codigo, p_comandos: comandos }),
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) { console.error(`carmen-${n}: falhou (${r.status} ${corpo.code || ''})`); process.exit(1); }
  console.log(`carmen-${n}: ok, ${corpo.comandos} comandos de ${comandos.length}`);
}
