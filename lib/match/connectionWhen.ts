/** Texto curto a partir de connectedAt. Sem data, devolve só "Conectados". */
export function connectionWhenLabel(connectedAtMs: number | null | undefined, now = Date.now()): string {
  if (!connectedAtMs || connectedAtMs <= 0) return 'Conectados';
  const day = 24 * 60 * 60 * 1000;
  const start = (ms: number) => {
    const date = new Date(ms);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };
  const days = Math.round((start(now) - start(connectedAtMs)) / day);
  if (days <= 0) return 'Conectados hoje';
  if (days === 1) return 'Conectados ontem';
  if (days < 7) return `Conectados há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'Conectados há 1 semana';
  if (weeks < 5) return `Conectados há ${weeks} semanas`;
  const months = Math.max(1, Math.floor(days / 30));
  if (months === 1) return 'Conectados há 1 mês';
  return `Conectados há ${months} meses`;
}

export function matchGivenName(displayName: string): string {
  const name = displayName.trim().split(/\s+/)[0];
  return name || 'Conexão';
}
