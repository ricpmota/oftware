/**
 * Geração pura de datas de sessão (recorrência operacional).
 * Extraído de PersonalPageContent.handleCreateSession / generateSessionDates.
 * Não persiste nada — o contrato de trainingSessions continua o mesmo.
 */

export const TRAINING_RECURRENCE_MIN_WEEKS = 1;
export const TRAINING_RECURRENCE_MAX_WEEKS = 12;
export const TRAINING_RECURRENCE_DEFAULT_WEEKS = 4;

export type TrainingSessionKind = 'single' | 'recurring';
export type TrainingRecurrenceFrequency = 'daily' | 'weekly' | 'custom';

export type GenerateSessionDatesInput = {
  startDate: string;
  sessionType: TrainingSessionKind;
  recurrenceFrequency?: TrainingRecurrenceFrequency;
  weeksCount?: number;
  timesPerWeek?: number;
  selectedDaysOfWeek?: number[];
};

const WEEKLY_OFFSETS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalYYYYMMDD(): string {
  return toLocalYYYYMMDD(new Date());
}

export function clampTrainingWeeksCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return TRAINING_RECURRENCE_DEFAULT_WEEKS;
  return Math.max(
    TRAINING_RECURRENCE_MIN_WEEKS,
    Math.min(TRAINING_RECURRENCE_MAX_WEEKS, Math.round(n))
  );
}

export function createRecurrenceGroupId(prefix = 'rec'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Gera YYYY-MM-DD (local) no mesmo critério da aba Criar.
 * Recorrência custom: só datas >= início (a primeira semana omite dias que já passaram
 * relativamente à data de início, não cria no passado da janela).
 */
export function generateSessionDates(input: GenerateSessionDatesInput): string[] {
  const startDate = String(input.startDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return [];

  if (input.sessionType === 'single') {
    return [startDate];
  }

  const weeksCount = clampTrainingWeeksCount(input.weeksCount);
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + weeksCount * 7 - 1);

  const frequency = input.recurrenceFrequency || 'weekly';

  if (frequency === 'daily') {
    const current = new Date(start);
    while (current <= endDate) {
      dates.push(toLocalYYYYMMDD(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  if (frequency === 'weekly') {
    const timesPerWeek = Math.max(1, Math.min(7, Math.round(input.timesPerWeek || 3)));
    const dayOffsets = WEEKLY_OFFSETS[timesPerWeek] || WEEKLY_OFFSETS[3];
    for (let week = 0; week < weeksCount; week++) {
      dayOffsets.forEach((offset) => {
        const sessionDate = new Date(start);
        sessionDate.setDate(sessionDate.getDate() + offset + week * 7);
        if (sessionDate <= endDate) dates.push(toLocalYYYYMMDD(sessionDate));
      });
    }
    dates.sort();
    return dates;
  }

  const selectedDaysOfWeek = Array.from(
    new Set((input.selectedDaysOfWeek || []).filter((day) => day >= 0 && day <= 6))
  );
  if (selectedDaysOfWeek.length === 0) return [];

  const startDayOfWeek = start.getDay();
  for (let week = 0; week < weeksCount; week++) {
    selectedDaysOfWeek.forEach((targetDay) => {
      const daysToAdd = ((targetDay - startDayOfWeek + 7) % 7) + week * 7;
      const sessionDate = new Date(start);
      sessionDate.setDate(sessionDate.getDate() + daysToAdd);
      if (sessionDate >= start && sessionDate <= endDate) {
        const dateStr = toLocalYYYYMMDD(sessionDate);
        if (!dates.includes(dateStr)) dates.push(dateStr);
      }
    });
  }
  dates.sort();
  return dates;
}
