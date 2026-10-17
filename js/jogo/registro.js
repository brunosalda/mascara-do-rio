// O que o jogador fez nesta noite fora do plano (bairros visitados, detalhes examinados, comentários
// ouvidos), guardado no aparelho, por noite. Usado pelo quadro da noite, pelo diário e pelo mapa.
// E o prazo da noite em tempo restante ("fecha em 2 dias (seg., 7h)").

const chave = (noiteId) => `mascara.registro.${noiteId || 'sem-noite'}`;

export function registroDaNoite(noiteId) {
  try {
    const r = JSON.parse(localStorage.getItem(chave(noiteId))) || {};
    return { visitados: r.visitados || [], detalhes: r.detalhes || [], comentarios: r.comentarios || [] };
  } catch {
    return { visitados: [], detalhes: [], comentarios: [] };
  }
}

// tipo: 'visitados' (id do bairro), 'detalhes' ({ lugar, id, rotulo, voz, texto }), 'comentarios' ({ lugar, id, voz, texto }).
export function registrar(noiteId, tipo, item) {
  const r = registroDaNoite(noiteId);
  const igual = (a) => (typeof item === 'string' ? a === item : a.lugar === item.lugar && a.id === item.id);
  if (r[tipo].some(igual)) return;
  r[tipo].push(item);
  try { localStorage.setItem(chave(noiteId), JSON.stringify(r)); } catch { /* sem armazenamento */ }
}

const fmtDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

// "seg., 7h" (ou "seg., 7h30")
export function quandoCurto(iso) {
  const d = new Date(iso);
  const [h, m] = fmtHora.format(d).split(':');
  return `${fmtDia.format(d)}, ${Number(h)}h${m && m !== '00' ? m : ''}`;
}

// "fecha em 2 dias (seg., 7h)", "fecha em 5 h (seg., 7h)", "fecha em 40 min"
export function prazoRestante(iso) {
  if (!iso) return '';
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return 'fechando agora';
  const horas = ms / 3.6e6;
  const quando = quandoCurto(iso);
  if (horas >= 48) return `fecha em ${Math.floor(horas / 24)} dias (${quando})`;
  if (horas >= 24) return `fecha em 1 dia (${quando})`;
  if (horas >= 1) return `fecha em ${Math.floor(horas)} h (${quando})`;
  return `fecha em ${Math.max(1, Math.round(ms / 60000))} min`;
}

// Quando o Narrador volta: a tarefa dele roda às 7h07 e a cada 2 horas até 1h07 (horário de Brasília);
// entre 1h07 e 7h07 não roda. Devolve "por volta das 9h", "por volta da 1h" ou, de madrugada,
// "por volta das 7h da manhã". Uma função só para o envio da ficha, a espera e o quadro entre noites.
const RODADAS_NARRADOR = [1, 7, 9, 11, 13, 15, 17, 19, 21, 23].map((h) => h * 60 + 7);
const fmtRelogio = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' });
export function quandoONarradorVolta(agora = new Date()) {
  const [h, m] = fmtRelogio.format(agora).split(':').map(Number);
  const minutos = h * 60 + m;
  const proxima = RODADAS_NARRADOR.find((r) => r > minutos) ?? RODADAS_NARRADOR[0];
  const hora = Math.floor(proxima / 60);
  if (hora === 1) return 'por volta da 1h';
  if (hora === 7) return 'por volta das 7h da manhã';
  return `por volta das ${hora}h`;
}
