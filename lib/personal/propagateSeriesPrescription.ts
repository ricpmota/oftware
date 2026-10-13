/**
 * Atualiza a prescrição de UMA série e replica para os demais dias
 * agendados do mesmo treino recorrente. Não mistura com o realizado
 * (actualReps / actualLoadKg da execução).
 */

import type { HostRunStep } from '@/lib/personal/trainingIntercalation';
import { updateIntercalatedSeries } from '@/lib/personal/trainingIntercalation';
import {
  normalizeTrainingExercisePrescription,
  sanitizeLoadKg,
  sanitizeReps,
  sanitizeRestSec,
  serializeTrainingPrescription,
  updateTrainingSeries,
  type TrainingExercisePrescription,
} from '@/lib/personal/trainingExerciseSeries';
import { isTrainingSessionActive } from '@/lib/personal/trainingSessionActive';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

export type SeriesPrescriptionPatch = {
  reps: number;
  loadKg: number | null;
  restSec: number;
};

export type SeriesPrescriptionTarget =
  | {
      kind: 'main';
      exerciseOrder: number;
      exerciseId: string;
      seriesOrder: number;
    }
  | {
      kind: 'intercalated';
      hostExerciseOrder: number;
      hostExerciseId: string;
      afterSeriesOrder: number;
      intercalationExerciseId: string;
      intercalationSlotOrder: number;
    };

const REST_SEC_MAX = 600;

function clampRestSec(value: number): number {
  return Math.min(REST_SEC_MAX, sanitizeRestSec(value, 0));
}

function loadsEqual(a: number | null, b: number | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.05;
}

export function sanitizeSeriesPrescriptionPatch(
  patch: SeriesPrescriptionPatch
): SeriesPrescriptionPatch {
  return {
    reps: sanitizeReps(patch.reps, 1),
    loadKg: sanitizeLoadKg(patch.loadKg),
    restSec: clampRestSec(patch.restSec),
  };
}

function seriesMatchesPatch(
  series: { reps: number; loadKg: number | null; restSec: number },
  patch: SeriesPrescriptionPatch
): boolean {
  const next = sanitizeSeriesPrescriptionPatch(patch);
  return (
    series.reps === next.reps &&
    loadsEqual(series.loadKg, next.loadKg) &&
    series.restSec === next.restSec
  );
}

export function buildSeriesPrescriptionTarget(
  exercise: {
    exerciseId: string;
    order?: number;
    prescription?: TrainingExercisePrescription | null;
  },
  step: HostRunStep
): SeriesPrescriptionTarget | null {
  const exerciseOrder = Number.isFinite(exercise.order) ? Number(exercise.order) : 0;
  const exerciseId = String(exercise.exerciseId || '').trim();
  if (!exerciseId) return null;

  if (step.kind === 'main') {
    return {
      kind: 'main',
      exerciseOrder,
      exerciseId,
      seriesOrder: step.seriesOrder,
    };
  }

  const prescription = normalizeTrainingExercisePrescription(exercise.prescription);
  const occurrence = (prescription.intercalations || []).find(
    (item) => item.id === step.intercalationId
  );
  if (!occurrence) return null;
  const after = prescription.series.find((item) => item.id === occurrence.afterSeriesId);
  if (!after) return null;

  return {
    kind: 'intercalated',
    hostExerciseOrder: exerciseOrder,
    hostExerciseId: exerciseId,
    afterSeriesOrder: after.order,
    intercalationExerciseId: occurrence.exerciseId,
    intercalationSlotOrder: occurrence.slotOrder,
  };
}

export function findMatchingExercise(
  exercises: TrainingSessionExercise[],
  target: SeriesPrescriptionTarget
): TrainingSessionExercise | null {
  const order = target.kind === 'main' ? target.exerciseOrder : target.hostExerciseOrder;
  const exerciseId = target.kind === 'main' ? target.exerciseId : target.hostExerciseId;
  const byOrderAndId = exercises.find(
    (item) => (item.order ?? 0) === order && item.exerciseId === exerciseId
  );
  if (byOrderAndId) return byOrderAndId;
  const byId = exercises.filter((item) => item.exerciseId === exerciseId);
  return byId.length === 1 ? byId[0] : null;
}

export function applySeriesPrescriptionPatchBySeriesId(
  prescription: TrainingExercisePrescription | null | undefined,
  seriesId: string,
  patch: SeriesPrescriptionPatch
): { changed: boolean; prescription: TrainingExercisePrescription } | null {
  const id = String(seriesId || '').trim();
  if (!id) return null;
  const normalized = normalizeTrainingExercisePrescription(prescription);
  const nextPatch = sanitizeSeriesPrescriptionPatch(patch);
  const main = normalized.series.find((row) => row.id === id);
  if (main) {
    return applySeriesPrescriptionPatch(
      normalized,
      {
        kind: 'main',
        exerciseOrder: 0,
        exerciseId: 'local',
        seriesOrder: main.order,
      },
      nextPatch
    );
  }
  const occurrence = (normalized.intercalations || []).find((item) => item.series.id === id);
  if (!occurrence) return null;
  const after = normalized.series.find((row) => row.id === occurrence.afterSeriesId);
  if (!after) return null;
  return applySeriesPrescriptionPatch(
    normalized,
    {
      kind: 'intercalated',
      hostExerciseOrder: 0,
      hostExerciseId: 'local',
      afterSeriesOrder: after.order,
      intercalationExerciseId: occurrence.exerciseId,
      intercalationSlotOrder: occurrence.slotOrder,
    },
    nextPatch
  );
}

export function applySeriesPrescriptionPatch(
  prescription: TrainingExercisePrescription | null | undefined,
  target: SeriesPrescriptionTarget,
  patch: SeriesPrescriptionPatch
): { changed: boolean; prescription: TrainingExercisePrescription } | null {
  const normalized = normalizeTrainingExercisePrescription(prescription);
  const nextPatch = sanitizeSeriesPrescriptionPatch(patch);

  if (target.kind === 'main') {
    const item = normalized.series.find((row) => row.order === target.seriesOrder);
    if (!item) return null;
    if (seriesMatchesPatch(item, nextPatch)) {
      return { changed: false, prescription: normalized };
    }
    const series = updateTrainingSeries(normalized.series, item.id, nextPatch);
    return {
      changed: true,
      prescription: {
        series,
        ...(normalized.intercalations && normalized.intercalations.length > 0
          ? { intercalations: normalized.intercalations }
          : {}),
      },
    };
  }

  const after = normalized.series.find((row) => row.order === target.afterSeriesOrder);
  if (!after) return null;
  const occurrence = (normalized.intercalations || []).find(
    (item) =>
      item.afterSeriesId === after.id &&
      item.exerciseId === target.intercalationExerciseId &&
      item.slotOrder === target.intercalationSlotOrder
  );
  if (!occurrence) return null;
  if (seriesMatchesPatch(occurrence.series, nextPatch)) {
    return { changed: false, prescription: normalized };
  }
  const intercalations = updateIntercalatedSeries(
    normalized.intercalations,
    occurrence.id,
    nextPatch
  );
  return {
    changed: true,
    prescription: {
      series: normalized.series,
      intercalations,
    },
  };
}

export function applySeriesPrescriptionToExercise(
  exercise: TrainingSessionExercise,
  target: SeriesPrescriptionTarget,
  patch: SeriesPrescriptionPatch
): { changed: boolean; exercise: TrainingSessionExercise } | null {
  const applied = applySeriesPrescriptionPatch(exercise.prescription, target, patch);
  if (!applied) return null;
  if (!applied.changed) {
    return { changed: false, exercise };
  }
  return {
    changed: true,
    exercise: {
      ...exercise,
      prescription: serializeTrainingPrescription(applied.prescription),
    },
  };
}

export function selectUpcomingRecurrenceSessions(
  sessions: TrainingSession[],
  params: {
    currentSessionId: string;
    currentScheduledDate: string;
    recurrenceGroupId?: string | null;
  }
): TrainingSession[] {
  const currentId = String(params.currentSessionId || '').trim();
  const currentDate = String(params.currentScheduledDate || '').trim();
  const groupId = String(params.recurrenceGroupId || '').trim();
  if (!currentId || !currentDate) return [];

  const current = sessions.find((item) => item.id === currentId);
  if (!current) return [];

  if (!groupId) return [current];

  return sessions
    .filter((item) => {
      if (!item.id) return false;
      if (!isTrainingSessionActive(item)) return false;
      if (String(item.recurrenceGroupId || '').trim() !== groupId) return false;
      if (item.scheduledDate < currentDate) return false;
      if (item.id === currentId) return true;
      return item.status === 'scheduled';
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}
