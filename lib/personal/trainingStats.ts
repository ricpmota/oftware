/**
 * Domínio de Estatísticas / evolução operacional.
 * Não misturar com o motor PublishedTrainingPlan / trainingSessionExecutions.
 */

import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';
import type {
  TrainingExecutedSeries,
  TrainingExerciseExecution,
} from '@/lib/personal/trainingExecutionSeries';
import { shouldCountSessionInStats } from '@/lib/personal/trainingSessionActive';

export const DEFAULT_STATS_PERIOD_DAYS = 90;
export const STATS_PERIOD_OPTIONS = [30, 90, 180] as const;
export type StatsPeriodDays = (typeof STATS_PERIOD_OPTIONS)[number];

export type SessionCompletionState = 'done' | 'skipped' | 'scheduled';

export type TrainingStatsSeriesCounts = {
  done: number;
  skipped: number;
  pending: number;
  total: number;
};

export type SessionCompletionStats = {
  programmed: number;
  completed: number;
  skipped: number;
  scheduled: number;
  completionRatePercent: number | null;
};

export type WeeklySessionCount = {
  weekIndex: number;
  label: string;
  startDate: string;
  endDate: string;
  completed: number;
};

export type ExerciseExecutionOccurrence = {
  sessionId: string;
  exerciseDocId: string;
  exerciseId: string;
  name: string;
  scheduledDate: string;
  executionStatus: TrainingExerciseExecution['status'];
  maxActualLoadKg: number | null;
  series: TrainingExecutedSeries[];
};

export type ExerciseEvolutionSummary = {
  exerciseId: string;
  name: string;
  occurrences: ExerciseExecutionOccurrence[];
  latestLoadKg: number | null;
  maxLoadKg: number | null;
  firstLoadKg: number | null;
  variationPercent: number | null;
  sessionCountWithLoad: number;
};

export type TrainingStatsSessionRow = {
  sessionId: string;
  scheduledDate: string;
  title: string;
  rawStatus: TrainingSession['status'];
  completion: SessionCompletionState;
  hasSeriesExecutions: boolean;
};

export type TrainingStatsDataset = {
  periodDays: number;
  startDate: string;
  endDate: string;
  sessions: TrainingStatsSessionRow[];
  completion: SessionCompletionStats;
  series: TrainingStatsSeriesCounts;
  weeklyCompleted: WeeklySessionCount[];
  exercises: ExerciseEvolutionSummary[];
  sessionsWithExecutions: number;
};

export type TrainingStatsSessionInput = {
  session: TrainingSession;
  exercises: TrainingSessionExercise[];
  executions: TrainingExerciseExecution[];
};

export function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function statsPeriodRange(
  days: number,
  now: Date = new Date()
): { startDate: string; endDate: string } {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (Math.max(1, days) - 1));
  return {
    startDate: toLocalYYYYMMDD(start),
    endDate: toLocalYYYYMMDD(end),
  };
}

export function resolvePatientIdCandidates(patientId: string): string[] {
  const trimmed = patientId.trim();
  if (!trimmed) return [];
  return [trimmed];
}

/**
 * Sessão concluída: status gravado `done`, ou todos os exercícios terminais
 * com pelo menos um `done` (ETAPA 05 não marca a sessão automaticamente).
 */
export function getSessionCompletionState(
  session: Pick<TrainingSession, 'status'>,
  exercises: Array<Pick<TrainingSessionExercise, 'status'>>
): SessionCompletionState {
  if (session.status === 'skipped') return 'skipped';
  if (session.status === 'done') return 'done';
  if (exercises.length === 0) return 'scheduled';
  const allTerminal = exercises.every(
    (exercise) => exercise.status === 'done' || exercise.status === 'skipped'
  );
  if (!allTerminal) return 'scheduled';
  if (exercises.every((exercise) => exercise.status === 'skipped')) return 'skipped';
  return 'done';
}

export function calculateSessionCompletionStats(
  completions: SessionCompletionState[]
): SessionCompletionStats {
  const programmed = completions.length;
  const completed = completions.filter((item) => item === 'done').length;
  const skipped = completions.filter((item) => item === 'skipped').length;
  const scheduled = completions.filter((item) => item === 'scheduled').length;
  return {
    programmed,
    completed,
    skipped,
    scheduled,
    completionRatePercent:
      programmed > 0 ? (completed / programmed) * 100 : null,
  };
}

export function calculateSeriesStats(
  executions: TrainingExerciseExecution[]
): TrainingStatsSeriesCounts {
  let done = 0;
  let skipped = 0;
  let pending = 0;
  let total = 0;
  for (const execution of executions) {
    for (const series of execution.series) {
      total += 1;
      if (series.status === 'done') done += 1;
      else if (series.status === 'skipped') skipped += 1;
      else pending += 1;
    }
  }
  return { done, skipped, pending, total };
}

/** Maior carga realizada entre séries `done` com actualLoadKg informado. `null` nunca vira 0. */
export function maxActualLoadKgFromSeries(
  series: TrainingExecutedSeries[]
): number | null {
  let max: number | null = null;
  for (const item of series) {
    if (item.status !== 'done') continue;
    if (item.actualLoadKg == null) continue;
    if (max == null || item.actualLoadKg > max) max = item.actualLoadKg;
  }
  return max;
}

export function calculateLoadVariation(
  firstLoadKg: number | null,
  latestLoadKg: number | null
): number | null {
  if (firstLoadKg == null || latestLoadKg == null || firstLoadKg <= 0) return null;
  return ((latestLoadKg - firstLoadKg) / firstLoadKg) * 100;
}

export function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + delta);
  return toLocalYYYYMMDD(date);
}

export function buildWeeklySessionCounts(
  rows: Array<{ scheduledDate: string; completion: SessionCompletionState }>,
  endDate: string,
  weekCount = 4
): WeeklySessionCount[] {
  const weeks: WeeklySessionCount[] = [];
  for (let i = weekCount - 1; i >= 0; i -= 1) {
    const weekEnd = addDaysYmd(endDate, -i * 7);
    const weekStart = addDaysYmd(weekEnd, -6);
    const completed = rows.filter(
      (row) =>
        row.completion === 'done' &&
        row.scheduledDate >= weekStart &&
        row.scheduledDate <= weekEnd
    ).length;
    weeks.push({
      weekIndex: weekCount - i,
      label: `Semana ${weekCount - i}`,
      startDate: weekStart,
      endDate: weekEnd,
      completed,
    });
  }
  return weeks;
}

function compareOccurrence(
  a: ExerciseExecutionOccurrence,
  b: ExerciseExecutionOccurrence
): number {
  const byDate = a.scheduledDate.localeCompare(b.scheduledDate);
  if (byDate !== 0) return byDate;
  return a.exerciseDocId.localeCompare(b.exerciseDocId);
}

export function buildExerciseEvolutionSummaries(
  inputs: TrainingStatsSessionInput[]
): ExerciseEvolutionSummary[] {
  const byId = new Map<string, ExerciseExecutionOccurrence[]>();

  for (const input of inputs) {
    const sessionId = input.session.id;
    if (!sessionId) continue;
    const nameByDocId = new Map<string, string>();
    for (const exercise of input.exercises) {
      if (exercise.id) nameByDocId.set(String(exercise.id), exercise.name);
      for (const item of exercise.prescription?.intercalations || []) {
        nameByDocId.set(item.id, item.name);
      }
    }
    for (const execution of input.executions) {
      const exerciseId = String(execution.exerciseId || '').trim();
      if (!exerciseId) continue;
      const occurrence: ExerciseExecutionOccurrence = {
        sessionId,
        exerciseDocId: execution.exerciseDocId,
        exerciseId,
        name: nameByDocId.get(execution.exerciseDocId) || execution.exerciseId,
        scheduledDate: input.session.scheduledDate,
        executionStatus: execution.status,
        maxActualLoadKg: maxActualLoadKgFromSeries(execution.series),
        series: execution.series,
      };
      const list = byId.get(exerciseId) ?? [];
      list.push(occurrence);
      byId.set(exerciseId, list);
    }
  }

  const summaries: ExerciseEvolutionSummary[] = [];
  for (const [exerciseId, occurrences] of byId) {
    const sorted = [...occurrences].sort(compareOccurrence);
    const loads = sorted
      .map((item) => item.maxActualLoadKg)
      .filter((value): value is number => value != null);
    if (loads.length === 0) continue;
    const firstLoadKg = loads[0] ?? null;
    const latestLoadKg = loads[loads.length - 1] ?? null;
    const maxLoadKg = Math.max(...loads);
    const sessionsWithLoad = new Set(
      sorted.filter((item) => item.maxActualLoadKg != null).map((item) => item.sessionId)
    );
    summaries.push({
      exerciseId,
      name: sorted[sorted.length - 1]?.name || exerciseId,
      occurrences: sorted,
      latestLoadKg,
      maxLoadKg,
      firstLoadKg,
      variationPercent: calculateLoadVariation(firstLoadKg, latestLoadKg),
      sessionCountWithLoad: sessionsWithLoad.size,
    });
  }

  summaries.sort((a, b) => {
    const aDate = a.occurrences[a.occurrences.length - 1]?.scheduledDate || '';
    const bDate = b.occurrences[b.occurrences.length - 1]?.scheduledDate || '';
    return bDate.localeCompare(aDate);
  });
  return summaries;
}

export function buildTrainingStatsDataset(
  inputs: TrainingStatsSessionInput[],
  period: { days: number; startDate: string; endDate: string }
): TrainingStatsDataset {
  const countedInputs = inputs.filter((input) => {
    const completion = getSessionCompletionState(input.session, input.exercises);
    return shouldCountSessionInStats(input.session, completion);
  });
  const sessions: TrainingStatsSessionRow[] = countedInputs.map((input) => {
    const completion = getSessionCompletionState(input.session, input.exercises);
    return {
      sessionId: input.session.id || '',
      scheduledDate: input.session.scheduledDate,
      title: input.session.title,
      rawStatus: input.session.status,
      completion,
      hasSeriesExecutions: input.executions.some((item) => item.series.length > 0),
    };
  });
  const allExecutions = countedInputs.flatMap((input) => input.executions);
  return {
    periodDays: period.days,
    startDate: period.startDate,
    endDate: period.endDate,
    sessions,
    completion: calculateSessionCompletionStats(sessions.map((item) => item.completion)),
    series: calculateSeriesStats(allExecutions),
    weeklyCompleted: buildWeeklySessionCounts(
      sessions.map((item) => ({
        scheduledDate: item.scheduledDate,
        completion: item.completion,
      })),
      period.endDate,
      4
    ),
    exercises: buildExerciseEvolutionSummaries(countedInputs),
    sessionsWithExecutions: sessions.filter((item) => item.hasSeriesExecutions).length,
  };
}

export function formatKg(value: number | null): string {
  if (value == null) return '—';
  const text = Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
  return `${text} kg`;
}

export function formatLoadVariationPercent(value: number | null): string {
  if (value == null) return '—';
  const rounded = Math.round(value * 100) / 100;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(2).replace('.', ',')}%`;
}

export function emptyTrainingStatsDataset(
  period: { days: number; startDate: string; endDate: string }
): TrainingStatsDataset {
  return {
    periodDays: period.days,
    startDate: period.startDate,
    endDate: period.endDate,
    sessions: [],
    completion: {
      programmed: 0,
      completed: 0,
      skipped: 0,
      scheduled: 0,
      completionRatePercent: null,
    },
    series: { done: 0, skipped: 0, pending: 0, total: 0 },
    weeklyCompleted: buildWeeklySessionCounts([], period.endDate, 4),
    exercises: [],
    sessionsWithExecutions: 0,
  };
}
