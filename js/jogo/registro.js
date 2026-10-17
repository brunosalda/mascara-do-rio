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
