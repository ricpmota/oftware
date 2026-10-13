/**
 * Grade mensal do planner (SEG–DOM). Só o range visível — inclui padding
 * de agosto/outubro quando o mês não começa na segunda / não termina no domingo.
 */

import { toLocalYYYYMMDD } from '@/lib/personal/trainingRecurrence';
import { startOfWeekMonday, weekdayFromDateStr } from '@/lib/metapersonal/treinosWeek';
import { TREINOS_WEEKDAYS, type TreinosWeekday } from '@/components/metapersonal/treinos/treinosCentral.types';

const MONTH_LONG = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export type MonthGridDay = {
  date: string;
  inMonth: boolean;
  weekday: TreinosWeekday;
  dayNumber: number;
};

export type MonthVisibleRange = {
  year: number;
  monthIndex: number;
  label: string;
  startDate: string;
  endDate: string;
  days: MonthGridDay[];
};

function atLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const next = atLocalMidnight(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function currentMonthYYYYMM(from = new Date()): string {
  const y = from.getFullYear();
  const m = String(from.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function parseYearMonth(yyyyMm: string): { year: number; monthIndex: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(String(yyyyMm || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

export function shiftMonth(yyyyMm: string, delta: number): string {
  const parsed = parseYearMonth(yyyyMm) || parseYearMonth(currentMonthYYYYMM());
  if (!parsed) return currentMonthYYYYMM();
  const d = new Date(parsed.year, parsed.monthIndex + delta, 1);
  return currentMonthYYYYMM(d);
}

export function formatMonthLabel(yyyyMm: string): string {
  const parsed = parseYearMonth(yyyyMm);
  if (!parsed) return '';
  return `${MONTH_LONG[parsed.monthIndex]} ${parsed.year}`;
}

export function monthVisibleRange(yyyyMm: string): MonthVisibleRange {
  const parsed = parseYearMonth(yyyyMm) || parseYearMonth(currentMonthYYYYMM())!;
  const first = new Date(parsed.year, parsed.monthIndex, 1);
  const last = new Date(parsed.year, parsed.monthIndex + 1, 0);
  const gridStart = startOfWeekMonday(first);
  const lastWeekMonday = startOfWeekMonday(last);
  const gridEnd = addDays(lastWeekMonday, 6);
  const days: MonthGridDay[] = [];
  const cursor = new Date(gridStart);
  while (cursor.getTime() <= gridEnd.getTime()) {
    const date = toLocalYYYYMMDD(cursor);
    const weekday = weekdayFromDateStr(date) || TREINOS_WEEKDAYS[0];
    days.push({
      date,
      inMonth: cursor.getMonth() === parsed.monthIndex,
      weekday,
      dayNumber: cursor.getDate(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return {
    year: parsed.year,
    monthIndex: parsed.monthIndex,
    label: formatMonthLabel(`${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, '0')}`),
    startDate: toLocalYYYYMMDD(gridStart),
    endDate: toLocalYYYYMMDD(gridEnd),
    days,
  };
}
