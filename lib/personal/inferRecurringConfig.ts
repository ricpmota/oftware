/**
 * Inferência de recorrência a partir de trainingSessions concretas.
 * Extraído de PersonalPageContent.inferRecurringConfigFromSessions — mesma heurística.
 * Não persiste weeksCount nem frequência; só descreve o que já está materializado.
 */

import type { TrainingSession } from '@/types/trainingSession';
import type { TrainingRecurrenceFrequency, TrainingSessionKind } from '@/lib/personal/trainingRecurrence';

export type InferredRecurringConfig = {
  sessionType: TrainingSessionKind;
  recurrenceFrequency: TrainingRecurrenceFrequency;
  weeksCount: number;
  timesPerWeek: number;
  selectedDaysOfWeek: number[];
};

export function uniqueSessionWeekdays(sessions: TrainingSession[]): number[] {
  return Array.from(
    new Set(
      sessions
        .map((session) => {
          const d = new Date(`${session.scheduledDate}T00:00:00`);
          return Number.isNaN(d.getTime()) ? null : d.getDay();
        })
        .filter((day): day is number => day != null)
    )
  ).sort((a, b) => a - b);
}

export function inferRecurringConfigFromSessions(sessions: TrainingSession[]): InferredRecurringConfig {
  const sortedDates = sessions
    .map((session) => new Date(`${session.scheduledDate}T00:00:00`))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (sortedDates.length <= 1) {
    return {
      sessionType: 'single',
      recurrenceFrequency: 'weekly',
      weeksCount: 4,
      timesPerWeek: 1,
      selectedDaysOfWeek: [] as number[],
    };
  }

  const dayDiffs = sortedDates.slice(1).map((date, index) => {
    const prev = sortedDates[index];
    return Math.round((date.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
  });

  const minDate = sortedDates[0];
  const maxDate = sortedDates[sortedDates.length - 1];
  const spanDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const inferredWeeks = Math.max(1, Math.ceil(spanDays / 7));
  const uniqueDays = uniqueSessionWeekdays(sessions);
  const allDaily = dayDiffs.every((diff) => diff === 1);
  const allWeekly = dayDiffs.every((diff) => diff === 7) && uniqueDays.length === 1;

  if (allDaily) {
    return {
      sessionType: 'recurring',
      recurrenceFrequency: 'daily',
      weeksCount: inferredWeeks,
      timesPerWeek: 7,
      selectedDaysOfWeek: [] as number[],
    };
  }

  if (allWeekly) {
    return {
      sessionType: 'recurring',
      recurrenceFrequency: 'weekly',
      weeksCount: inferredWeeks,
      timesPerWeek: 1,
      selectedDaysOfWeek: [] as number[],
    };
  }

  const averagePerWeek = Math.max(1, Math.min(7, Math.round(sortedDates.length / inferredWeeks)));
  return {
    sessionType: 'recurring',
    recurrenceFrequency: 'custom',
    weeksCount: inferredWeeks,
    timesPerWeek: averagePerWeek,
    selectedDaysOfWeek: uniqueDays,
  };
}
