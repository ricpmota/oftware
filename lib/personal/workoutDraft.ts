/**
 * Rascunho operacional da aba + Criar (mobile sheet e desktop builder).
 * draftId é identidade local; exercise.id / exerciseId continuam ExerciseDB.
 */

import type { Exercise } from '@/types/exercise';
import {
  createTrainingSeriesId,
  type TrainingExerciseSeries,
  type TrainingIntercalatedOccurrence,
} from '@/lib/personal/trainingExerciseSeries';
import {
  cloneIntercalationsWithIdMap,
  seriesIdMapFromClone,
} from '@/lib/personal/trainingIntercalation';

export type SelectedExerciseDraft = Exercise & {
  draftId: string;
  prescription: {
    series: TrainingExerciseSeries[];
    intercalations?: TrainingIntercalatedOccurrence[];
  };
  /** Orientação prescrita pelo personal para este exercício (não é nota da sessão). */
  trainerNote?: string;
};

export function sanitizeTrainerNote(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  return trimmed || undefined;
}

export function createExerciseDraftId(): string {
  return `draft_ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneSeriesWithNewIds(
  series: TrainingExerciseSeries[]
): TrainingExerciseSeries[] {
  return series.map((item, index) => ({
    ...item,
    id: createTrainingSeriesId(),
    order: index + 1,
  }));
}

export function clonePrescriptionWithNewIds(prescription: {
  series: TrainingExerciseSeries[];
  intercalations?: TrainingIntercalatedOccurrence[];
}): { series: TrainingExerciseSeries[]; intercalations?: TrainingIntercalatedOccurrence[] } {
  const series = cloneSeriesWithNewIds(prescription.series);
  const seriesIdMap = seriesIdMapFromClone(prescription.series, series);
  const intercalations = cloneIntercalationsWithIdMap(prescription.intercalations, seriesIdMap);
  return {
    series,
    ...(intercalations.length > 0 ? { intercalations } : {}),
  };
}

export function toSelectedExerciseDraft(
  exercise: Exercise & {
    prescription: {
      series: TrainingExerciseSeries[];
      intercalations?: TrainingIntercalatedOccurrence[];
    };
    trainerNote?: string;
  },
  draftId = createExerciseDraftId()
): SelectedExerciseDraft {
  const trainerNote = sanitizeTrainerNote(exercise.trainerNote);
  const series = exercise.prescription.series.map((item, index) => ({
    ...item,
    order: index + 1,
  }));
  const intercalations = exercise.prescription.intercalations;
  return {
    ...exercise,
    draftId,
    prescription: {
      series,
      ...(intercalations && intercalations.length > 0 ? { intercalations } : {}),
    },
    ...(trainerNote ? { trainerNote } : { trainerNote: undefined }),
  };
}

export function duplicateSelectedExerciseDraft(
  item: SelectedExerciseDraft
): SelectedExerciseDraft {
  const trainerNote = sanitizeTrainerNote(item.trainerNote);
  return {
    ...item,
    draftId: createExerciseDraftId(),
    prescription: clonePrescriptionWithNewIds(item.prescription),
    ...(trainerNote ? { trainerNote } : { trainerNote: undefined }),
  };
}

export function insertDuplicatedExercise(
  items: SelectedExerciseDraft[],
  draftId: string
): SelectedExerciseDraft[] {
  const index = items.findIndex((item) => item.draftId === draftId);
  if (index < 0) return items;
  const copy = duplicateSelectedExerciseDraft(items[index]);
  return [...items.slice(0, index + 1), copy, ...items.slice(index + 1)];
}

export function reorderSelectedExercises<T>(
  items: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function getWorkoutDraftSummary(
  exercises: Array<{ prescription?: { series?: unknown[] } }>
): { exerciseCount: number; seriesCount: number } {
  const exerciseCount = exercises.length;
  const seriesCount = exercises.reduce((sum, exercise) => {
    const series = Array.isArray(exercise.prescription?.series)
      ? exercise.prescription.series.length
      : 0;
    const intercalated = Array.isArray(
      (exercise.prescription as { intercalations?: unknown[] } | undefined)?.intercalations
    )
      ? ((exercise.prescription as { intercalations?: unknown[] }).intercalations?.length ?? 0)
      : 0;
    return sum + series + intercalated;
  }, 0);
  return { exerciseCount, seriesCount };
}

export function formatWorkoutDraftSummary(summary: {
  exerciseCount: number;
  seriesCount: number;
}): string {
  const exLabel = summary.exerciseCount === 1 ? 'exercício' : 'exercícios';
  const seriesLabel = summary.seriesCount === 1 ? 'série' : 'séries';
  return `${summary.exerciseCount} ${exLabel} · ${summary.seriesCount} ${seriesLabel}`;
}

export function catalogExerciseIsAdded(
  selected: Array<{ id?: string; exerciseId?: string }>,
  catalogExerciseId: string
): boolean {
  const wanted = String(catalogExerciseId || '').trim();
  if (!wanted) return false;
  return selected.some((item) => item.id === wanted || item.exerciseId === wanted);
}
