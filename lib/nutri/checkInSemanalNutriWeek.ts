import { ymdLocal } from '@/utils/datasAplicacaoSemanaPlano';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type NutritionWeek = {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  year: number;
  isoWeek: number;
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0);
}

/**
 * Interpreta YYYY-MM-DD como calendário local (evita UTC −1 dia em pt-BR).
 * Datas `Date` usam o dia civil local.
 */
export function parseNutritionYmdLocal(value: string | Date): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('Data inválida');
    }
    return startOfLocalDay(value);
  }

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (!m) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Data inválida: ${value}`);
    }
    return startOfLocalDay(d);
  }

  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
}

/** Segunda-feira (início da semana Nutri: segunda → domingo). */
export function getNutritionWeekStart(date: string | Date): Date {
  const local = parseNutritionYmdLocal(date);
  const weekday = local.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addLocalDays(local, -daysFromMonday);
}

export function getNutritionWeekEnd(date: string | Date): Date {
  return addLocalDays(getNutritionWeekStart(date), 6);
}

export function getNutritionWeekKey(date: string | Date): string {
  return ymdLocal(getNutritionWeekStart(date));
}

/**
 * Número da semana ISO-8601 (segunda a domingo) e o ano ISO (o da quinta-feira da semana).
 */
export function getIsoWeekParts(monday: Date): { year: number; isoWeek: number } {
  const thursday = addLocalDays(monday, 3);
  const isoYear = thursday.getFullYear();
  const jan4 = new Date(isoYear, 0, 4, 0, 0, 0, 0);
  const jan4Monday = getNutritionWeekStart(jan4);
  const diffDays = Math.round((monday.getTime() - jan4Monday.getTime()) / MS_PER_DAY);
  const isoWeek = Math.floor(diffDays / 7) + 1;
  return { year: isoYear, isoWeek };
}

export function getPreviousNutritionWeek(week: Pick<NutritionWeek, 'weekStart'>): NutritionWeek {
  const start = parseNutritionYmdLocal(week.weekStart);
  return getNutritionWeek(new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7));
}

export function getNutritionWeek(date: string | Date = new Date()): NutritionWeek {
  const weekStartDate = getNutritionWeekStart(date);
  const weekEndDate = addLocalDays(weekStartDate, 6);
  const { year, isoWeek } = getIsoWeekParts(weekStartDate);
  const weekStart = ymdLocal(weekStartDate);
  return {
    weekKey: weekStart,
    weekStart,
    weekEnd: ymdLocal(weekEndDate),
    year,
    isoWeek,
  };
}

/**
 * Semana que o check-in descreve: a última semana nutricional já encerrada.
 * Segunda a sábado → semana anterior (a corrente ainda está em andamento).
 * Domingo → a própria semana corrente (dia padrão de fechamento do cronograma).
 */
export function getNutritionCheckInReferenceWeek(today: Date | string = new Date()): NutritionWeek {
  const current = getNutritionWeek(today);
  if (parseNutritionYmdLocal(today).getDay() === 0) return current;
  return getPreviousNutritionWeek(current);
}

/** Paciente só preenche a semana de referência (e a corrente no domingo). */
export function isNutritionCheckInFillableWeek(weekKey: string, today: Date | string = new Date()): boolean {
  const key = String(weekKey || '').trim();
  if (!key) return false;
  const current = getNutritionWeek(today);
  const reference = getNutritionCheckInReferenceWeek(today);
  return (
    key === reference.weekKey ||
    (key === current.weekKey && parseNutritionYmdLocal(today).getDay() === 0)
  );
}

/** Semana nutricional cujo Monday (`weekKey`) ainda não começou. */
export function isNutritionCheckInFutureWeek(weekKey: string, today: Date | string = new Date()): boolean {
  const key = String(weekKey || '').trim();
  if (!key) return true;
  return key > getNutritionWeek(today).weekKey;
}

/**
 * Data operacional do check-in (quando o paciente é convidado / quando registrou).
 * O calendário de Evolução pinta a semana descrita (ex.: 10–16), não este dia.
 */
export function getNutritionCheckInCalendarDate(
  record: Pick<NutritionWeek, 'weekStart' | 'weekEnd'> & { scheduledDate?: string | null },
  fallback?: string | null
): string {
  const stored = String(record.scheduledDate || '').trim();
  if (stored && stored >= record.weekEnd) return stored;
  const next = String(fallback || '').trim();
  if (next && next >= record.weekEnd) return next;
  const end = parseNutritionYmdLocal(record.weekEnd);
  return ymdLocal(addLocalDays(end, 1));
}

const MESES_PT = [
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
] as const;

export function formatNutritionWeekLabel(week: Pick<NutritionWeek, 'weekStart' | 'weekEnd'>): string {
  const start = parseNutritionYmdLocal(week.weekStart);
  const end = parseNutritionYmdLocal(week.weekEnd);
  const startLabel = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const endLabel = end.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}

/** Ex.: "17–23 ago" */
export function formatNutritionWeekShortLabel(week: Pick<NutritionWeek, 'weekStart' | 'weekEnd'>): string {
  const start = parseNutritionYmdLocal(week.weekStart);
  const end = parseNutritionYmdLocal(week.weekEnd);
  const mes = end.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${start.getDate()}–${end.getDate()} ${mes}`;
}

/** Ex.: "Semana de 17 a 23 de agosto" */
export function formatNutritionWeekLongLabel(week: Pick<NutritionWeek, 'weekStart' | 'weekEnd'>): string {
  const start = parseNutritionYmdLocal(week.weekStart);
  const end = parseNutritionYmdLocal(week.weekEnd);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `Semana de ${start.getDate()} a ${end.getDate()} de ${MESES_PT[end.getMonth()]}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `Semana de ${start.getDate()} de ${MESES_PT[start.getMonth()]} a ${end.getDate()} de ${MESES_PT[end.getMonth()]}`;
  }
  return `Semana de ${start.getDate()} de ${MESES_PT[start.getMonth()]} de ${start.getFullYear()} a ${end.getDate()} de ${MESES_PT[end.getMonth()]} de ${end.getFullYear()}`;
}

/** Grade mensal com segunda na primeira coluna (semana nutricional Mon→Dom). */
export function buildNutritionMonthDaysMondayFirst(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0).getDate();
  const mondayIndex = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = [];
  for (let i = 0; i < mondayIndex; i++) days.push(null);
  for (let day = 1; day <= lastDay; day++) days.push(new Date(year, m, day));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export const NUTRITION_WEEKDAY_HEADERS_MONDAY_FIRST = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

export const NUTRITION_WEEKDAY_LONG_MONDAY_FIRST = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const;

export const NUTRITION_WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type NutritionWeekdayKey = (typeof NUTRITION_WEEKDAY_KEYS)[number];

/** 0 = segunda … 6 = domingo, alinhado à grade Monday-first. */
export function nutritionWeekdayMondayFirst(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function listNutritionWeekDays(week: Pick<NutritionWeek, 'weekStart'>): Array<{
  key: NutritionWeekdayKey;
  date: string;
  weekdayShort: string;
  weekdayLong: string;
  dayOfMonth: number;
}> {
  const monday = parseNutritionYmdLocal(week.weekStart);
  return NUTRITION_WEEKDAY_KEYS.map((key, index) => {
    const date = addLocalDays(monday, index);
    return {
      key,
      date: ymdLocal(date),
      weekdayShort: NUTRITION_WEEKDAY_HEADERS_MONDAY_FIRST[index],
      weekdayLong: NUTRITION_WEEKDAY_LONG_MONDAY_FIRST[index],
      dayOfMonth: date.getDate(),
    };
  });
}
