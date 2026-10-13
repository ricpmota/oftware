/**
 * Normalização de dias da semana para o contrato TrainingWeekday.
 */

import type { TrainingWeekday } from '@/types/workoutPlanDraft';

const CANONICAL: TrainingWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** Aliases legados → canônico. */
const LEGACY_ALIASES: Record<string, TrainingWeekday> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
  segunda: 'monday',
  terca: 'tuesday',
  terça: 'tuesday',
  quarta: 'wednesday',
  quinta: 'thursday',
  sexta: 'friday',
  sabado: 'saturday',
  sábado: 'saturday',
  domingo: 'sunday',
};

export function normalizeTrainingWeekday(value: string | null | undefined): TrainingWeekday | null {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  return LEGACY_ALIASES[key] ?? null;
}

export function normalizeTrainingWeekdays(values: string[] | null | undefined): TrainingWeekday[] {
  if (!Array.isArray(values)) return [];
  const out: TrainingWeekday[] = [];
  for (const v of values) {
    const n = normalizeTrainingWeekday(v);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

export function isTrainingWeekday(value: string): value is TrainingWeekday {
  return (CANONICAL as string[]).includes(value);
}

export const TRAINING_WEEKDAY_ORDER: TrainingWeekday[] = [...CANONICAL];
