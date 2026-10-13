import {
  HYDRATION_MAX_ADD_ML,
  HYDRATION_MAX_DAILY_ML,
  type HydrationAdherenceStatus,
  type HydrationDayView,
  type HydrationRecord,
  type HydrationWeeklySummary,
} from '@/lib/nutri/hidratacao/hydrationTypes';
import { ymdLocal } from '@/utils/datasAplicacaoSemanaPlano';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isHydrationYmd(value: string): boolean {
  return YMD_RE.test(value);
}

/** Data civil local (evita UTC mudar o dia em pt-BR). */
export function hydrationTodayYmd(now: Date = new Date()): string {
  return ymdLocal(now);
}

export const HYDRATION_TREATMENT_TIMEZONE = 'America/Sao_Paulo';

export function hydrationYmdInTimeZone(
  now: Date = new Date(),
  timeZone: string = HYDRATION_TREATMENT_TIMEZONE
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Portal só grava o dia civil do tratamento (±1 dia para fuso do dispositivo).
 * Não aceita reescrever histórico antigo a partir do cliente.
 */
export function isPortalHydrationDateAllowed(
  date: string,
  now: Date = new Date(),
  timeZone: string = HYDRATION_TREATMENT_TIMEZONE
): boolean {
  if (!isHydrationYmd(date)) return false;
  const today = hydrationYmdInTimeZone(now, timeZone);
  const yesterday = addDaysToHydrationYmd(today, -1);
  const tomorrow = addDaysToHydrationYmd(today, 1);
  return date === today || date === yesterday || date === tomorrow;
}

export function addDaysToHydrationYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + deltaDays);
  return ymdLocal(date);
}

/** Janela de 7 dias: hoje e os 6 anteriores, do mais recente ao mais antigo. */
export function lastNHydrationDates(fromYmd: string, days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i += 1) {
    dates.push(addDaysToHydrationYmd(fromYmd, -i));
  }
  return dates;
}

/** Janela de 7 dias: hoje e os 6 anteriores, do mais recente ao mais antigo. */
export function last7HydrationDates(todayYmd: string): string[] {
  return lastNHydrationDates(todayYmd, 7);
}

export function calcHydrationPercentage(consumedMl: number, goalMl: number): number {
  if (!Number.isFinite(consumedMl) || consumedMl < 0) return 0;
  if (!Number.isFinite(goalMl) || goalMl <= 0) return 0;
  return Math.round((consumedMl / goalMl) * 100);
}

export function isHydrationGoalReached(consumedMl: number, goalMl: number): boolean {
  if (!Number.isFinite(consumedMl) || !Number.isFinite(goalMl)) return false;
  return goalMl > 0 && consumedMl >= goalMl;
}

/**
 * Classifica adesão. Ausência de registro NÃO é baixa hidratação.
 * Sempre prefira recalcular o percentual a partir de consumed/goal.
 */
export function classifyHydrationAdherence(input: {
  hasRecord: boolean;
  consumedMl?: number;
  goalMl?: number;
  percentage?: number;
}): HydrationAdherenceStatus {
  if (!input.hasRecord) return 'nao_informado';

  const pct =
    input.consumedMl != null && input.goalMl != null
      ? calcHydrationPercentage(input.consumedMl, input.goalMl)
      : Number.isFinite(input.percentage)
        ? Math.round(input.percentage as number)
        : 0;

  if (pct >= 100) return 'meta_atingida';
  if (pct >= 80) return 'proximo_da_meta';
  if (pct >= 60) return 'abaixo_da_meta';
  return 'baixa_adesao';
}

export function hydrationAdherenceLabel(status: HydrationAdherenceStatus): string {
  switch (status) {
    case 'meta_atingida':
      return 'Meta atingida';
    case 'proximo_da_meta':
      return 'Próximo da meta';
    case 'abaixo_da_meta':
      return 'Abaixo da meta';
    case 'baixa_adesao':
      return 'Baixa adesão registrada';
    case 'nao_informado':
      return 'Não informado';
  }
}

export function formatHydrationMl(ml: number): string {
  return `${Math.round(ml).toLocaleString('pt-BR')} ml`;
}

export function formatHydrationLitersPerDay(ml: number): string {
  const liters = ml / 1000;
  return `${liters.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} L/dia`;
}

/** Leitura humana em litros (1 L, 1,5 L, 2,5 L). Persistência continua em ml. */
export function formatHydrationLiters(ml: number): string {
  const liters = ml / 1000;
  const whole = Math.abs(liters - Math.round(liters)) < 0.05;
  return `${liters.toLocaleString('pt-BR', {
    minimumFractionDigits: whole ? 0 : 1,
    maximumFractionDigits: 1,
  })} L`;
}

/**
 * Campo "Outro" do check-in público.
 * Decimais e inteiros < 100 = litros. Inteiro >= 100 = ml (ex.: 2300).
 */
export function parseHydrationLitersInput(
  raw: string
): { ok: true; ml: number } | { ok: false; error: HydrationAmountError } {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed) return { ok: false, error: 'empty' };
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return { ok: false, error: 'not_number' };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return { ok: false, error: 'not_positive' };
  const asLiters = trimmed.includes('.') || value < 100;
  const ml = Math.round(asLiters ? value * 1000 : value);
  if (ml > HYDRATION_MAX_DAILY_ML) return { ok: false, error: 'too_large_day' };
  return { ok: true, ml };
}

export function remainingMlToGoal(consumedMl: number, goalMl: number): number {
  if (!Number.isFinite(consumedMl) || !Number.isFinite(goalMl) || goalMl <= 0) return 0;
  return Math.max(0, Math.round(goalMl - consumedMl));
}

export type HydrationAmountError =
  | 'empty'
  | 'not_number'
  | 'not_positive'
  | 'too_large_add'
  | 'too_large_day';

export function parseHydrationMlInput(raw: string): { ok: true; ml: number } | { ok: false; error: HydrationAmountError } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'empty' };
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: 'not_number' };
  const ml = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(ml) || ml <= 0) return { ok: false, error: 'not_positive' };
  if (ml > HYDRATION_MAX_ADD_ML) return { ok: false, error: 'too_large_add' };
  return { ok: true, ml };
}

/** Total consolidado do dia — permite 0 (correção) e valores acima da meta. */
export function parseHydrationDailyTotalInput(
  raw: string
): { ok: true; ml: number } | { ok: false; error: HydrationAmountError } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'empty' };
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: 'not_number' };
  const ml = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(ml) || ml < 0) return { ok: false, error: 'not_positive' };
  if (ml > HYDRATION_MAX_DAILY_ML) return { ok: false, error: 'too_large_day' };
  return { ok: true, ml };
}

export function hydrationAmountErrorMessage(error: HydrationAmountError): string {
  switch (error) {
    case 'empty':
      return 'Informe a quantidade de água.';
    case 'not_number':
      return 'Use apenas números, sem letras ou símbolos.';
    case 'not_positive':
      return 'A quantidade precisa ser maior que zero.';
    case 'too_large_add':
      return `Essa quantidade parece um engano. O máximo por lançamento é ${HYDRATION_MAX_ADD_ML.toLocaleString('pt-BR')} ml.`;
    case 'too_large_day':
      return `O total do dia não pode passar de ${HYDRATION_MAX_DAILY_ML.toLocaleString('pt-BR')} ml.`;
  }
}

export function assertDailyTotalAllowed(consumedMl: number): HydrationAmountError | null {
  if (!Number.isFinite(consumedMl) || consumedMl < 0) return 'not_positive';
  if (consumedMl > HYDRATION_MAX_DAILY_ML) return 'too_large_day';
  return null;
}

export type HydrationWriteIntent =
  | { kind: 'add'; addMl: number; currentGoalMl: number }
  | { kind: 'set'; consumedMl: number; currentGoalMl: number };

/**
 * Aplica um lançamento ao registro do dia.
 * `goalMl` existente NÃO é sobrescrito — a meta do dia fica congelada no primeiro registro.
 */
export function applyHydrationWrite(
  existing: HydrationRecord | null,
  intent: HydrationWriteIntent
): {
  consumedMl: number;
  goalMl: number;
  percentage: number;
  goalReached: boolean;
  justReachedGoal: boolean;
} {
  const goalMl =
    existing && existing.goalMl > 0
      ? existing.goalMl
      : Math.max(0, Math.round(intent.currentGoalMl));

  const nextConsumed =
    intent.kind === 'add'
      ? (existing?.consumedMl ?? 0) + intent.addMl
      : intent.consumedMl;

  const consumedMl = Math.max(0, Math.round(nextConsumed));
  const percentage = calcHydrationPercentage(consumedMl, goalMl);
  const goalReached = isHydrationGoalReached(consumedMl, goalMl);
  const wasReached = existing ? isHydrationGoalReached(existing.consumedMl, existing.goalMl) : false;

  return {
    consumedMl,
    goalMl,
    percentage,
    goalReached,
    justReachedGoal: goalReached && !wasReached,
  };
}

export function buildHydrationWeeklySummary(days: HydrationDayView[]): HydrationWeeklySummary {
  const daysInPeriod = days.length;
  const registered = days.filter((d) => d.record != null).map((d) => d.record as HydrationRecord);
  const daysRegistered = registered.length;
  const daysWithoutRecord = daysInPeriod - daysRegistered;
  const daysGoalReached = registered.filter((r) =>
    isHydrationGoalReached(r.consumedMl, r.goalMl)
  ).length;

  if (daysRegistered === 0) {
    return {
      daysInPeriod,
      daysRegistered: 0,
      daysWithoutRecord,
      daysGoalReached: 0,
      averageConsumedMl: null,
      averageAdherencePct: null,
    };
  }

  const sumConsumed = registered.reduce((acc, r) => acc + r.consumedMl, 0);
  const sumPct = registered.reduce((acc, r) => acc + calcHydrationPercentage(r.consumedMl, r.goalMl), 0);

  return {
    daysInPeriod,
    daysRegistered,
    daysWithoutRecord,
    daysGoalReached,
    averageConsumedMl: Math.round(sumConsumed / daysRegistered),
    averageAdherencePct: Math.round(sumPct / daysRegistered),
  };
}

const MONTH_SHORT_PT = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
];

export function formatHydrationWeekday(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const label = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long' });
  return label.replace(/^\w/, (ch) => ch.toUpperCase());
}

export function formatHydrationHistoryDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const month = MONTH_SHORT_PT[m - 1] ?? '';
  return `${String(d).padStart(2, '0')} ${month}`;
}

const MONTH_LONG_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export const HYDRATION_CALENDAR_MONTHS_BACK = 11;

export function hydrationMonthKeyFromYmd(ymd: string): string {
  return ymd.slice(0, 7);
}

export function shiftHydrationMonth(monthKey: string, deltaMonths: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1 + deltaMonths, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function datesInHydrationMonth(monthKey: string): string[] {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return [];
  const last = new Date(y, m, 0).getDate();
  const dates: string[] = [];
  for (let day = 1; day <= last; day += 1) {
    dates.push(`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return dates;
}

/** Grade segunda→domingo; células fora do mês vêm `null`. */
export function hydrationCalendarCells(monthKey: string): Array<string | null> {
  const dates = datesInHydrationMonth(monthKey);
  if (dates.length === 0) return [];
  const first = dates[0]!;
  const [y, m, d] = first.split('-').map(Number);
  const weekday = new Date(y, (m ?? 1) - 1, d ?? 1).getDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  const cells: Array<string | null> = Array.from({ length: mondayOffset }, () => null);
  cells.push(...dates);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function hydrationMonthTitle(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const name = MONTH_LONG_PT[(m ?? 1) - 1] ?? monthKey;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

export function formatHydrationLongDate(ymd: string, todayYmd?: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const month = MONTH_LONG_PT[m - 1] ?? '';
  const dayMonth = `${d} de ${month}`;
  if (todayYmd && hydrationMonthKeyFromYmd(todayYmd).slice(0, 4) === String(y)) {
    return dayMonth;
  }
  return `${dayMonth} de ${y}`;
}

/** Ex.: "Domingo, 30 de agosto" — calendário do check-in público. */
export function formatHydrationCheckInDateTitle(ymd: string): string {
  return `${formatHydrationWeekday(ymd)}, ${formatHydrationLongDate(ymd, ymd)}`;
}

export function canGoToHydrationMonth(
  monthKey: string,
  todayYmd: string,
  monthsBack = HYDRATION_CALENDAR_MONTHS_BACK
): { prev: boolean; next: boolean } {
  const min = shiftHydrationMonth(hydrationMonthKeyFromYmd(todayYmd), -monthsBack);
  const max = hydrationMonthKeyFromYmd(todayYmd);
  return {
    prev: monthKey > min,
    next: monthKey < max,
  };
}
