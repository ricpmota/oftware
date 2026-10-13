/**
 * Navegação do planner da Central.
 *
 * Fonte de verdade: `plannerReferenceDate` (YYYY-MM-DD local).
 *
 * Semanal: semana SEG–DOM que contém a data.
 * Mensal: mês civil da data (não o Monday da semana).
 *
 * Ex.: referência 2026-10-01
 *   → semanal 28 SET – 4 OUT
 *   → mensal Outubro 2026
 *
 * Trocar Semanal | Mensal NÃO altera a data — só o modo.
 * Setas: semana ±7 dias; mês ±1 mês (mesmo dia, limitado ao último dia do mês).
 * Não persiste. Não altera sessões.
 */

import { todayLocalYYYYMMDD, toLocalYYYYMMDD } from '@/lib/personal/trainingRecurrence';
import { currentMonthYYYYMM } from '@/lib/metapersonal/treinosMonth';
import {
  mondayYYYYMMDD,
  weekdayFromDateStr,
  weekRangeFromMonday,
} from '@/lib/metapersonal/treinosWeek';
import type { TreinosWeekday } from '@/components/metapersonal/treinos/treinosCentral.types';

const WEEKDAY_LONG: Record<TreinosWeekday, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const MONTH_LOWER = [
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

export type PlannerViewMode = 'week' | 'month';

export type PlannerNavState = {
  plannerViewMode: PlannerViewMode;
  plannerReferenceDate: string;
};

function atLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parsePlannerDate(yyyyMmDd: string): Date | null {
  const d = new Date(`${String(yyyyMmDd || '').trim()}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return atLocalMidnight(d);
}

export function normalizePlannerDate(yyyyMmDd: string, fallback = todayLocalYYYYMMDD()): string {
  const parsed = parsePlannerDate(yyyyMmDd);
  return parsed ? toLocalYYYYMMDD(parsed) : fallback;
}

export function weekMondayFromDate(yyyyMmDd: string): string {
  const parsed = parsePlannerDate(yyyyMmDd);
  return mondayYYYYMMDD(parsed || new Date());
}

export function monthFromDate(yyyyMmDd: string): string {
  const parsed = parsePlannerDate(yyyyMmDd);
  return currentMonthYYYYMM(parsed || new Date());
}

export function weekRangeFromReferenceDate(yyyyMmDd: string) {
  return weekRangeFromMonday(weekMondayFromDate(yyyyMmDd));
}

export function shiftPlannerDateDays(yyyyMmDd: string, days: number): string {
  const parsed = parsePlannerDate(yyyyMmDd) || parsePlannerDate(todayLocalYYYYMMDD())!;
  parsed.setDate(parsed.getDate() + days);
  return toLocalYYYYMMDD(parsed);
}

export function shiftPlannerDateMonths(yyyyMmDd: string, months: number): string {
  const parsed = parsePlannerDate(yyyyMmDd) || parsePlannerDate(todayLocalYYYYMMDD())!;
  const day = parsed.getDate();
  const next = new Date(parsed.getFullYear(), parsed.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return toLocalYYYYMMDD(next);
}

export function openWeekAtDate(state: PlannerNavState, date: string): PlannerNavState {
  return {
    plannerViewMode: 'week',
    plannerReferenceDate: normalizePlannerDate(date, state.plannerReferenceDate),
  };
}

export function setPlannerViewMode(state: PlannerNavState, mode: PlannerViewMode): PlannerNavState {
  return {
    plannerViewMode: mode,
    plannerReferenceDate: state.plannerReferenceDate,
  };
}

export function shiftPlannerNav(state: PlannerNavState, direction: -1 | 1): PlannerNavState {
  const nextDate =
    state.plannerViewMode === 'month'
      ? shiftPlannerDateMonths(state.plannerReferenceDate, direction)
      : shiftPlannerDateDays(state.plannerReferenceDate, direction * 7);
  return { ...state, plannerReferenceDate: nextDate };
}

export function goToToday(state: PlannerNavState, today = todayLocalYYYYMMDD()): PlannerNavState {
  return { ...state, plannerReferenceDate: today };
}

export function formatPlannerDateLong(yyyyMmDd: string): string {
  const parsed = parsePlannerDate(yyyyMmDd);
  const weekday = weekdayFromDateStr(yyyyMmDd);
  if (!parsed || !weekday) return '';
  return `${WEEKDAY_LONG[weekday]}, ${parsed.getDate()} de ${MONTH_LOWER[parsed.getMonth()]}`;
}

export function formatOpenWeekAriaLabel(yyyyMmDd: string): string {
  const parsed = parsePlannerDate(yyyyMmDd);
  if (!parsed) return 'Abrir semana';
  return `Abrir semana de ${parsed.getDate()} de ${MONTH_LOWER[parsed.getMonth()]} de ${parsed.getFullYear()}`;
}

export function resolvePlannerCardDate(
  card: {
    date?: string;
    weekday: TreinosWeekday;
    patients?: Array<{ scheduledDate?: string }>;
  },
  datesByWeekday?: Record<TreinosWeekday, string>
): string | undefined {
  if (card.date) return card.date;
  const fromPatient = (card.patients || []).find((item) => item.scheduledDate)?.scheduledDate;
  if (fromPatient) return fromPatient;
  return datesByWeekday?.[card.weekday];
}
