/**
 * Execução operacional série a série (paciente).
 * Prescrição permanece em trainingSessions/.../exercises.
 * Realizado NÃO muta prescription.series[].
 * Não misturar com TrainingSessionExecution do motor publicado.
 */

import {
  normalizeTrainingExercisePrescription,
  sanitizeLoadKg,
  sanitizeReps,
  sanitizeRestSec,
  type LegacyTrainingPrescription,
  type TrainingExercisePrescription,
} from '@/lib/personal/trainingExerciseSeries';
import { sanitizeTrainerNote } from '@/lib/personal/workoutDraft';

export type ExecutedSeriesStatus = 'pending' | 'done' | 'skipped';
export type ExerciseExecutionStatus = 'pending' | 'in_progress' | 'done' | 'skipped';

export type TrainingExecutedSeries = {
  seriesId: string;
  order: number;
  prescribedReps: number;
  prescribedLoadKg: number | null;
  prescribedRestSec: number;
  actualReps: number | null;
  actualLoadKg: number | null;
  status: ExecutedSeriesStatus;
  completedAt?: string | null;
};

export type TrainingExerciseExecution = {
  exerciseDocId: string;
  exerciseId: string;
  /** Snapshot da orientação vigente quando a execução começou. */
  prescribedTrainerNote?: string;
  series: TrainingExecutedSeries[];
  status: ExerciseExecutionStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
};

function cloneSeries(series: TrainingExecutedSeries[]): TrainingExecutedSeries[] {
  return series.map((item) => ({ ...item }));
}

function toIso(now?: Date): string {
  return (now ?? new Date()).toISOString();
}

export function getExerciseExecutionStatus(
  series: TrainingExecutedSeries[]
): ExerciseExecutionStatus {
  if (!series.length) return 'pending';
  const allTerminal = series.every((item) => item.status === 'done' || item.status === 'skipped');
  if (!allTerminal) {
    return series.some((item) => item.status !== 'pending') ? 'in_progress' : 'pending';
  }
  if (series.every((item) => item.status === 'skipped')) return 'skipped';
  return 'done';
}

export function isExerciseExecutionDone(execution: TrainingExerciseExecution): boolean {
  return getExerciseExecutionStatus(execution.series) === 'done';
}

/** Status compatível com TrainingSessionExercise.status após a execução série a série. */
export function getMarkExerciseStatusFromExecution(
  execution: TrainingExerciseExecution
): 'done' | 'skipped' | null {
  const status = getExerciseExecutionStatus(execution.series);
  if (status === 'done' || status === 'skipped') return status;
  return null;
}

export function getSeriesProgress(execution: TrainingExerciseExecution): {
  done: number;
  skipped: number;
  pending: number;
  total: number;
} {
  const total = execution.series.length;
  const done = execution.series.filter((item) => item.status === 'done').length;
  const skipped = execution.series.filter((item) => item.status === 'skipped').length;
  return { done, skipped, pending: total - done - skipped, total };
}

export function getNextPendingSeries(
  execution: TrainingExerciseExecution
): TrainingExecutedSeries | null {
  return execution.series.find((item) => item.status === 'pending') ?? null;
}

function withDerivedStatus(
  execution: TrainingExerciseExecution,
  nowIso: string
): TrainingExerciseExecution {
  const status = getExerciseExecutionStatus(execution.series);
  return {
    ...execution,
    status,
    completedAt: status === 'done' || status === 'skipped' ? execution.completedAt || nowIso : null,
    updatedAt: nowIso,
  };
}

export function createExerciseExecutionFromPrescription(params: {
  exerciseDocId: string;
  exerciseId: string;
  prescription?: TrainingExercisePrescription | LegacyTrainingPrescription | null;
  trainerNote?: string | null;
  now?: Date;
}): TrainingExerciseExecution {
  const series = normalizeTrainingExercisePrescription(params.prescription).series;
  const nowIso = params.now ? params.now.toISOString() : null;
  const prescribedTrainerNote = sanitizeTrainerNote(params.trainerNote);
  return {
    exerciseDocId: params.exerciseDocId,
    exerciseId: params.exerciseId,
    ...(prescribedTrainerNote ? { prescribedTrainerNote } : {}),
    status: 'pending',
    startedAt: null,
    completedAt: null,
    updatedAt: nowIso,
    series: series.map((item) => ({
      seriesId: item.id,
      order: item.order,
      prescribedReps: item.reps,
      prescribedLoadKg: item.loadKg,
      prescribedRestSec: item.restSec,
      actualReps: null,
      actualLoadKg: null,
      status: 'pending' as const,
      completedAt: null,
    })),
  };
}

export function completeExecutedSeries(
  execution: TrainingExerciseExecution,
  seriesId: string,
  input: { actualReps: number; actualLoadKg: number | null; now?: Date }
): { ok: true; execution: TrainingExerciseExecution } | { ok: false; message: string } {
  const reps = Number(input.actualReps);
  if (!Number.isFinite(reps) || reps < 0) {
    return { ok: false, message: 'Informe um número válido de reps.' };
  }
  const loadKg = sanitizeLoadKg(input.actualLoadKg);
  const nowIso = toIso(input.now);
  const series = cloneSeries(execution.series);
  const index = series.findIndex((item) => item.seriesId === seriesId);
  if (index < 0) return { ok: false, message: 'Série não encontrada.' };
  if (series[index].status !== 'pending') {
    return { ok: false, message: 'Esta série já foi registrada.' };
  }
  series[index] = {
    ...series[index],
    actualReps: Math.round(reps),
    actualLoadKg: loadKg,
    status: 'done',
    completedAt: nowIso,
  };
  const next = withDerivedStatus(
    {
      ...execution,
      series,
      startedAt: execution.startedAt || nowIso,
    },
    nowIso
  );
  return { ok: true, execution: next };
}

export function updatePendingExecutedSeriesPrescription(
  execution: TrainingExerciseExecution,
  seriesId: string,
  input: { prescribedReps: number; prescribedLoadKg: number | null; prescribedRestSec: number }
): TrainingExerciseExecution | null {
  const index = execution.series.findIndex(
    (item) => item.seriesId === seriesId && item.status === 'pending'
  );
  if (index < 0) return null;
  const reps = sanitizeReps(input.prescribedReps, execution.series[index].prescribedReps);
  const loadKg = sanitizeLoadKg(input.prescribedLoadKg);
  const restSec = sanitizeRestSec(
    input.prescribedRestSec,
    execution.series[index].prescribedRestSec
  );
  const current = execution.series[index];
  const loadUnchanged =
    (current.prescribedLoadKg == null && loadKg == null) ||
    (current.prescribedLoadKg != null &&
      loadKg != null &&
      Math.abs(current.prescribedLoadKg - loadKg) < 0.05);
  if (
    current.prescribedReps === reps &&
    loadUnchanged &&
    current.prescribedRestSec === restSec
  ) {
    return null;
  }
  const series = cloneSeries(execution.series);
  series[index] = {
    ...series[index],
    prescribedReps: reps,
    prescribedLoadKg: loadKg,
    prescribedRestSec: restSec,
  };
  return {
    ...execution,
    series,
    updatedAt: toIso(),
  };
}

export function updatePendingExecutedSeriesPrescriptionByOrder(
  execution: TrainingExerciseExecution,
  seriesOrder: number,
  input: { prescribedReps: number; prescribedLoadKg: number | null; prescribedRestSec: number }
): TrainingExerciseExecution | null {
  const item = execution.series.find((row) => row.order === seriesOrder && row.status === 'pending');
  if (!item) return null;
  return updatePendingExecutedSeriesPrescription(execution, item.seriesId, input);
}

export function skipExecutedSeries(
  execution: TrainingExerciseExecution,
  seriesId: string,
  now?: Date
): TrainingExerciseExecution {
  const nowIso = toIso(now);
  const series = cloneSeries(execution.series).map((item) =>
    item.seriesId === seriesId && item.status === 'pending'
      ? {
          ...item,
          status: 'skipped' as const,
          actualReps: null,
          actualLoadKg: null,
          completedAt: nowIso,
        }
      : item
  );
  return withDerivedStatus(
    {
      ...execution,
      series,
      startedAt: execution.startedAt || nowIso,
    },
    nowIso
  );
}

export function skipRemainingExerciseSeries(
  execution: TrainingExerciseExecution,
  now?: Date
): TrainingExerciseExecution {
  const nowIso = toIso(now);
  const series = cloneSeries(execution.series).map((item) =>
    item.status === 'pending'
      ? {
          ...item,
          status: 'skipped' as const,
          actualReps: null,
          actualLoadKg: null,
          completedAt: nowIso,
        }
      : item
  );
  return withDerivedStatus(
    {
      ...execution,
      series,
      startedAt: execution.startedAt || nowIso,
    },
    nowIso
  );
}

/** Volta todas as séries para pending, preservando o snapshot prescrito. */
export function resetExerciseExecution(
  execution: TrainingExerciseExecution,
  now?: Date
): TrainingExerciseExecution {
  const nowIso = toIso(now);
  return {
    ...execution,
    status: 'pending',
    startedAt: null,
    completedAt: null,
    updatedAt: nowIso,
    series: cloneSeries(execution.series).map((item) => ({
      ...item,
      actualReps: null,
      actualLoadKg: null,
      status: 'pending' as const,
      completedAt: null,
    })),
  };
}
