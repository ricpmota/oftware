/**
 * Semana de referência do planner (SEG–DOM local).
 * Só visualização — não altera scheduledDate nem publicação.
 */

import { toLocalYYYYMMDD } from '@/lib/personal/trainingRecurrence';
import type { TreinosWeekday } from '@/components/metapersonal/treinos/treinosCentral.types';

const JS_DAY_TO_WEEKDAY: TreinosWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const MONTH_SHORT = [
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

function atLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const next = atLocalMidnight(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function startOfWeekMonday(from = new Date()): Date {
  const d = atLocalMidnight(from);
  const jsDay = d.getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  return addDays(d, diff);
}

export function mondayYYYYMMDD(from = new Date()): string {
  return toLocalYYYYMMDD(startOfWeekMonday(from));
}

export function shiftWeekMonday(mondayYYYY: string, weeks: number): string {
  const start = new Date(`${mondayYYYY}T00:00:00`);
  if (Number.isNaN(start.getTime())) return mondayYYYYMMDD();
  return toLocalYYYYMMDD(addDays(start, weeks * 7));
}

export function weekRangeFromMonday(mondayYYYY: string): {
  startDate: string;
  endDate: string;
  datesByWeekday: Record<TreinosWeekday, string>;
} {
  const start = new Date(`${mondayYYYY}T00:00:00`);
  const monday = Number.isNaN(start.getTime()) ? startOfWeekMonday() : atLocalMidnight(start);
  const startDate = toLocalYYYYMMDD(monday);
  const endDate = toLocalYYYYMMDD(addDays(monday, 6));
  return {
    startDate,
    endDate,
    datesByWeekday: {
      monday: toLocalYYYYMMDD(monday),
      tuesday: toLocalYYYYMMDD(addDays(monday, 1)),
      wednesday: toLocalYYYYMMDD(addDays(monday, 2)),
      thursday: toLocalYYYYMMDD(addDays(monday, 3)),
      friday: toLocalYYYYMMDD(addDays(monday, 4)),
      saturday: toLocalYYYYMMDD(addDays(monday, 5)),
      sunday: toLocalYYYYMMDD(addDays(monday, 6)),
    },
  };
}

export function weekdayFromDateStr(yyyyMmDd: string): TreinosWeekday | null {
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return JS_DAY_TO_WEEKDAY[d.getDay()] || null;
}

export function formatWeekRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const startMonth = MONTH_SHORT[start.getMonth()];
  const endMonth = MONTH_SHORT[end.getMonth()];
  if (startMonth === endMonth) {
    return `${start.getDate()}–${end.getDate()} ${startMonth}`;
  }
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
}
