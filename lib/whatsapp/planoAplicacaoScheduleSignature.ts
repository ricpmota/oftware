/**
 * Assinatura estável das datas de aplicação do plano terapêutico.
 * Usada para detectar mudanças reais e evitar rebuilds desnecessários da fila WhatsApp.
 */

export type PlanoScheduleSignatureSource = {
  startDate?: unknown;
  injectionDayOfWeek?: unknown;
  numeroSemanasTratamento?: unknown;
  semanasCanceladas?: unknown;
  datasAplicacaoIndividuais?: unknown;
  /** Protocolos injetáveis (datas + realizado) — entram na fila WhatsApp. */
  injetaveisAplicacoes?: unknown;
};

function ymdFromUnknown(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${mo}-${day}`;
    }
    return value.trim();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const mo = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      try {
        return ymdFromUnknown(maybe.toDate());
      } catch {
        return '';
      }
    }
  }
  return '';
}

function normalizeCanceladas(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .join(',');
}

function normalizeDatasIndividuais(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const entries: Array<[string, string]> = [];
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const ymd = typeof raw === 'string' ? raw.trim() : ymdFromUnknown(raw);
    if (!ymd) continue;
    entries.push([String(key), ymd]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0], 'en'));
  return entries.map(([k, v]) => `${k}=${v}`).join('|');
}

function normalizeBoolMap(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const entries: Array<[string, string]> = [];
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw === true || raw === 'true' || raw === 1) {
      entries.push([String(key), '1']);
    }
  }
  entries.sort((a, b) => a[0].localeCompare(b[0], 'en'));
  return entries.map(([k, v]) => `${k}=${v}`).join('|');
}

function normalizeInjetaveisAplicacoes(value: unknown): string {
  if (!Array.isArray(value)) return '';
  const rows: string[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const app = raw as Record<string, unknown>;
    const id = String(app.id ?? '').trim();
    if (!id) continue;
    const start = ymdFromUnknown(app.startDate);
    const semanas = Number(app.numeroSemanasTratamento ?? app.numeroSemanas);
    const n = Number.isFinite(semanas) && semanas > 0 ? String(Math.trunc(semanas)) : '';
    const map = normalizeDatasIndividuais(app.datasAplicacaoIndividuais);
    const realizado = normalizeBoolMap(app.realizadoPorSemana);
    rows.push(`${id}:${start}:${n}:${map}:${realizado}`);
  }
  rows.sort((a, b) => a.localeCompare(b, 'en'));
  return rows.join('||');
}

/** String determinística das datas/calendário do plano. */
export function planoAplicacaoScheduleSignature(
  plano: PlanoScheduleSignatureSource | null | undefined,
): string {
  if (!plano || typeof plano !== 'object') return '';

  const start = ymdFromUnknown(plano.startDate);
  const dow = typeof plano.injectionDayOfWeek === 'string' ? plano.injectionDayOfWeek.trim() : '';
  const semanas = Number(plano.numeroSemanasTratamento);
  const n = Number.isFinite(semanas) && semanas > 0 ? String(Math.trunc(semanas)) : '';
  const canceladas = normalizeCanceladas(plano.semanasCanceladas);
  const individuais = normalizeDatasIndividuais(plano.datasAplicacaoIndividuais);
  const injetaveis = normalizeInjetaveisAplicacoes(plano.injetaveisAplicacoes);

  return [
    `start=${start}`,
    `dow=${dow}`,
    `n=${n}`,
    `cancel=${canceladas}`,
    `map=${individuais}`,
    `inj=${injetaveis}`,
  ].join(';');
}

export function planosAplicacaoScheduleSignatureChanged(
  before: PlanoScheduleSignatureSource | null | undefined,
  after: PlanoScheduleSignatureSource | null | undefined,
): boolean {
  return planoAplicacaoScheduleSignature(before) !== planoAplicacaoScheduleSignature(after);
}
