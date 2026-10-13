export type PatientGrowthPeriodDays = 7 | 30 | 60;

export type PatientGrowthPreset = '7d' | '30d' | '60d' | '90d' | '12m' | 'total';

export type PatientGrowthKind = 'up' | 'down' | 'flat' | 'new' | 'none';

export type PatientGrowthBucket = {
  startMs: number;
  endMs: number;
  label: string;
};

export type PatientGrowthMetrics = {
  novosAtual: number;
  novosAnterior: number;
  percentual: number | null;
  kind: PatientGrowthKind;
  sparkline: number[];
  buckets: PatientGrowthBucket[];
  /** Total histórico não tem janela anterior equivalente. */
  comparaAnterior: boolean;
  hasTemporalData: boolean;
};

export const PERIODOS_PACIENTE: { id: PatientGrowthPreset; label: string }[] = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '60d', label: '60d' },
  { id: '90d', label: '90d' },
  { id: '12m', label: '12m' },
  { id: 'total', label: 'Total' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function toValidCadastroDate(value: unknown): Date | null {
  if (value == null) return null;
  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      date = (value as { toDate: () => Date }).toDate();
    } catch {
      date = null;
    }
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  }
  if (!date || Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  if (year < 2000) return null;
  if (date.getTime() > Date.now() + DAY_MS) return null;
  return date;
}

export function resolvePacienteCadastroDate(paciente: {
  dataCadastro?: unknown;
  dadosIdentificacao?: { dataCadastro?: unknown };
}): Date | null {
  return toValidCadastroDate(paciente.dataCadastro) ?? toValidCadastroDate(paciente.dadosIdentificacao?.dataCadastro);
}

function countInRange(timestamps: number[], startMs: number, endMs: number): number {
  let count = 0;
  for (const t of timestamps) {
    if (t >= startMs && t < endMs) count += 1;
  }
  return count;
}

function labelDia(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function labelMes(ms: number): string {
  const date = new Date(ms);
  const mes = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${mes}/${String(date.getFullYear()).slice(2)}`;
}

function startOfLocalDay(ms: number): Date {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function classificar(
  novosAtual: number,
  novosAnterior: number,
  comparaAnterior: boolean
): Pick<PatientGrowthMetrics, 'kind' | 'percentual' | 'comparaAnterior'> {
  if (!comparaAnterior) {
    return { kind: novosAtual > 0 ? 'new' : 'none', percentual: null, comparaAnterior: false };
  }
  if (novosAnterior === 0 && novosAtual === 0) {
    return { kind: 'none', percentual: null, comparaAnterior: true };
  }
  if (novosAnterior === 0 && novosAtual > 0) {
    return { kind: 'new', percentual: null, comparaAnterior: true };
  }
  const percentual = ((novosAtual - novosAnterior) / novosAnterior) * 100;
  if (percentual > 0) return { kind: 'up', percentual, comparaAnterior: true };
  if (percentual < 0) return { kind: 'down', percentual, comparaAnterior: true };
  return { kind: 'flat', percentual, comparaAnterior: true };
}

function contarBuckets(timestamps: number[], buckets: PatientGrowthBucket[]): number[] {
  const counts = buckets.map(() => 0);
  for (const t of timestamps) {
    for (let index = 0; index < buckets.length; index += 1) {
      const bucket = buckets[index];
      if (t >= bucket.startMs && t < bucket.endMs) {
        counts[index] += 1;
        break;
      }
    }
  }
  return counts;
}

function montar(
  timestamps: number[],
  atual: { startMs: number; endMs: number },
  anterior: { startMs: number; endMs: number } | null,
  buckets: PatientGrowthBucket[]
): PatientGrowthMetrics {
  const sparkline = contarBuckets(timestamps, buckets);
  const novosAtual = countInRange(timestamps, atual.startMs, atual.endMs);
  const novosAnterior = anterior ? countInRange(timestamps, anterior.startMs, anterior.endMs) : 0;
  return {
    novosAtual,
    novosAnterior,
    ...classificar(novosAtual, novosAnterior, anterior != null),
    sparkline,
    buckets,
    hasTemporalData: timestamps.length > 0,
  };
}

/** Janela contínua em milissegundos. 7d e 30d seguem por dia; 60d e 90d, por semana. */
function rollingBuckets(nowMs: number, days: number, bucketMs: number): PatientGrowthBucket[] {
  const periodStart = nowMs - days * DAY_MS;
  const periodEnd = nowMs + 1;
  const bucketCount = Math.max(1, Math.ceil((periodEnd - periodStart) / bucketMs));
  return Array.from({ length: bucketCount }, (_, index) => {
    const startMs = periodStart + index * bucketMs;
    const nominalEnd = periodStart + (index + 1) * bucketMs;
    return {
      startMs,
      endMs: index === bucketCount - 1 ? periodEnd : nominalEnd,
      label: labelDia(startMs),
    };
  });
}

function monthBuckets(startMs: number, endMs: number): PatientGrowthBucket[] {
  const start = new Date(startMs);
  let year = start.getFullYear();
  let month = start.getMonth();
  const buckets: PatientGrowthBucket[] = [];
  while (buckets.length < 240) {
    const monthStart = new Date(year, month, 1).getTime();
    const nextMonth = new Date(year, month + 1, 1).getTime();
    const bucketStart = Math.max(monthStart, startMs);
    const bucketEnd = Math.min(nextMonth, endMs);
    if (bucketStart < bucketEnd) {
      buckets.push({ startMs: bucketStart, endMs: bucketEnd, label: labelMes(monthStart) });
    }
    if (nextMonth >= endMs) break;
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  if (buckets.length === 0) {
    buckets.push({ startMs, endMs: Math.max(endMs, startMs + 1), label: labelMes(startMs) });
  }
  return buckets;
}

function dayBuckets(startMs: number, endMs: number): PatientGrowthBucket[] {
  const buckets: PatientGrowthBucket[] = [];
  let cursor = startOfLocalDay(startMs);
  while (cursor.getTime() < endMs && buckets.length < 4000) {
    const next = addLocalDays(cursor, 1);
    buckets.push({
      startMs: Math.max(cursor.getTime(), startMs),
      endMs: Math.min(next.getTime(), endMs),
      label: labelDia(cursor.getTime()),
    });
    cursor = next;
  }
  return buckets.length > 0 ? buckets : [{ startMs, endMs: startMs + 1, label: labelDia(startMs) }];
}

function weekBuckets(startMs: number, endMs: number): PatientGrowthBucket[] {
  const buckets: PatientGrowthBucket[] = [];
  let cursor = startMs;
  while (cursor < endMs && buckets.length < 600) {
    let sliceEnd = cursor;
    for (let step = 0; step < 7 && sliceEnd < endMs; step += 1) {
      sliceEnd = addLocalDays(new Date(sliceEnd), 1).getTime();
    }
    sliceEnd = Math.min(sliceEnd, endMs);
    buckets.push({ startMs: cursor, endMs: sliceEnd, label: labelDia(cursor) });
    cursor = sliceEnd;
  }
  return buckets.length > 0 ? buckets : [{ startMs, endMs: startMs + 1, label: labelDia(startMs) }];
}

function granularidade(periodo: PatientGrowthPreset | 'custom', startMs: number, endMs: number): 'dia' | 'semana' | 'mes' {
  if (periodo === '12m' || periodo === 'total') return 'mes';
  if (periodo === '90d' || periodo === '60d') return 'semana';
  if (periodo === 'custom') {
    const dias = Math.max(1, Math.round((endMs - startMs) / DAY_MS));
    if (dias > 120) return 'mes';
    if (dias > 60) return 'semana';
  }
  return 'dia';
}

function bucketsDaJanela(
  periodo: PatientGrowthPreset | 'custom',
  startMs: number,
  endMs: number,
  nowMs: number,
  rollingDays?: number
): PatientGrowthBucket[] {
  if (rollingDays) {
    const bucketMs = rollingDays === 60 || rollingDays === 90 ? 7 * DAY_MS : DAY_MS;
    return rollingBuckets(nowMs, rollingDays, bucketMs);
  }
  const modo = granularidade(periodo, startMs, endMs);
  if (modo === 'mes') return monthBuckets(startMs, endMs);
  if (modo === 'semana') return weekBuckets(startMs, endMs);
  return dayBuckets(startMs, endMs);
}

function buildRolling(timestamps: number[], days: number, nowMs: number): PatientGrowthMetrics {
  const periodMs = days * DAY_MS;
  const currentStart = nowMs - periodMs;
  const previousStart = currentStart - periodMs;
  const endMs = nowMs + 1;
  return montar(
    timestamps,
    { startMs: currentStart, endMs },
    { startMs: previousStart, endMs: currentStart },
    bucketsDaJanela(days === 90 ? '90d' : '30d', currentStart, endMs, nowMs, days)
  );
}

export function buildPatientGrowthMetrics(
  timestamps: number[],
  periodDays: PatientGrowthPeriodDays,
  nowMs: number = Date.now()
): PatientGrowthMetrics {
  return buildRolling(timestamps, periodDays, nowMs);
}

export function buildPatientGrowthPreset(
  timestamps: number[],
  preset: PatientGrowthPreset,
  nowMs: number = Date.now()
): PatientGrowthMetrics {
  if (preset === '7d' || preset === '30d' || preset === '60d' || preset === '90d') {
    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : preset === '60d' ? 60 : 90;
    return buildRolling(timestamps, days, nowMs);
  }
  if (preset === '12m') {
    const hoje = startOfLocalDay(nowMs);
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
    const fim = addLocalDays(hoje, 1);
    const anteriorInicio = new Date(inicio.getFullYear(), inicio.getMonth() - 12, 1);
    return montar(
      timestamps,
      { startMs: inicio.getTime(), endMs: fim.getTime() },
      { startMs: anteriorInicio.getTime(), endMs: inicio.getTime() },
      monthBuckets(inicio.getTime(), fim.getTime())
    );
  }
  let min = Number.POSITIVE_INFINITY;
  for (const t of timestamps) if (t < min) min = t;
  const hoje = startOfLocalDay(nowMs);
  const fim = Math.max(addLocalDays(hoje, 1).getTime(), nowMs + 1);
  const inicio = Number.isFinite(min) ? startOfLocalDay(min).getTime() : hoje.getTime();
  return montar(
    timestamps,
    { startMs: inicio, endMs: fim },
    null,
    monthBuckets(inicio, fim)
  );
}

export function buildPatientGrowthCustom(
  timestamps: number[],
  inicio: Date,
  fim: Date
): PatientGrowthMetrics {
  const start = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const endDay = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  const end = addLocalDays(endDay, 1);
  const dias = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));
  const anteriorFim = start;
  const anteriorInicio = addLocalDays(start, -dias);
  return montar(
    timestamps,
    { startMs: start.getTime(), endMs: end.getTime() },
    { startMs: anteriorInicio.getTime(), endMs: anteriorFim.getTime() },
    bucketsDaJanela('custom', start.getTime(), end.getTime(), end.getTime())
  );
}
