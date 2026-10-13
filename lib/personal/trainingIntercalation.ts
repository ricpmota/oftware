/**
 * Exercícios intercalados ENTRE séries do exercício principal.
 * Não entram em series[]. A sequência de execução é derivada.
 */

import {
  createIntercalationId,
  createTrainingSeriesId,
  sanitizeIntercalations,
  sanitizeLoadKg,
  sanitizeReps,
  sanitizeRestSec,
  type TrainingExerciseSeries,
  type TrainingIntercalatedOccurrence,
} from '@/lib/personal/trainingExerciseSeries';
import type { Exercise } from '@/types/exercise';

export type { TrainingIntercalatedOccurrence };

function sanitizeTrainerNote(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  return trimmed || undefined;
}

export type HostRunStep =
  | {
      kind: 'main';
      seriesId: string;
      seriesOrder: number;
    }
  | {
      kind: 'intercalated';
      intercalationId: string;
      afterSeriesId: string;
      seriesId: string;
      exerciseId: string;
      labelOrder: number;
    };

export { createIntercalationId, sanitizeIntercalations };

export function createDefaultIntercalatedSeries(params?: {
  reps?: number;
  loadKg?: number | null;
  restSec?: number;
}): TrainingExerciseSeries {
  return {
    id: createTrainingSeriesId(),
    order: 1,
    reps: sanitizeReps(params?.reps, 10),
    loadKg: sanitizeLoadKg(params?.loadKg ?? null),
    restSec: sanitizeRestSec(params?.restSec, 0),
  };
}

export function intercalationsAfterSeries(
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  afterSeriesId: string
): TrainingIntercalatedOccurrence[] {
  return (intercalations || [])
    .filter((item) => item.afterSeriesId === afterSeriesId)
    .sort((a, b) => a.slotOrder - b.slotOrder || a.id.localeCompare(b.id));
}

export function nextSlotOrder(
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  afterSeriesId: string
): number {
  const list = intercalationsAfterSeries(intercalations, afterSeriesId);
  return list.length;
}

export function createIntercalatedOccurrence(params: {
  afterSeriesId: string;
  slotOrder: number;
  exercise: Pick<Exercise, 'id' | 'name' | 'bodyPart' | 'target' | 'equipment' | 'gifUrl'>;
  series?: Partial<Pick<TrainingExerciseSeries, 'reps' | 'loadKg' | 'restSec'>>;
  trainerNote?: string;
  gifUrl?: string;
}): TrainingIntercalatedOccurrence {
  const trainerNote = sanitizeTrainerNote(params.trainerNote);
  const gifUrl = String(params.gifUrl || params.exercise.gifUrl || '').trim() || undefined;
  return {
    id: createIntercalationId(),
    afterSeriesId: params.afterSeriesId,
    slotOrder: params.slotOrder,
    exerciseId: String(params.exercise.id || '').trim(),
    name: params.exercise.name,
    bodyPart: params.exercise.bodyPart || '',
    target: params.exercise.target || '',
    equipment: params.exercise.equipment || '',
    ...(gifUrl ? { gifUrl } : {}),
    ...(trainerNote ? { trainerNote } : {}),
    series: createDefaultIntercalatedSeries(params.series),
  };
}

export function addIntercalatedOccurrence(
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  occurrence: TrainingIntercalatedOccurrence
): TrainingIntercalatedOccurrence[] {
  return sanitizeIntercalations([...(intercalations || []), occurrence], [
    ...new Set([...(intercalations || []).map((item) => item.afterSeriesId), occurrence.afterSeriesId]).values(),
  ].map((id) => ({ id })));
}

/** Insere já sanitizando contra as séries reais do host. */
export function insertIntercalatedOccurrence(
  series: Array<{ id: string }>,
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  occurrence: TrainingIntercalatedOccurrence
): TrainingIntercalatedOccurrence[] {
  return sanitizeIntercalations([...(intercalations || []), occurrence], series);
}

export function lastIntercalationBeforeSlot(
  series: Array<{ id: string; order?: number }>,
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  afterSeriesId: string
): TrainingIntercalatedOccurrence | null {
  const sameSlot = intercalationsAfterSeries(intercalations, afterSeriesId);
  if (sameSlot.length > 0) return sameSlot[sameSlot.length - 1] ?? null;
  const queue = buildHostRunQueue(series, intercalations);
  const mainIdx = queue.findIndex((step) => step.kind === 'main' && step.seriesId === afterSeriesId);
  for (let i = mainIdx; i >= 0; i -= 1) {
    const step = queue[i];
    if (step?.kind === 'intercalated') {
      return (intercalations || []).find((item) => item.id === step.intercalationId) ?? null;
    }
  }
  return null;
}

export function repeatIntercalatedOccurrence(
  series: Array<{ id: string }>,
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  afterSeriesId: string,
  source: TrainingIntercalatedOccurrence
): TrainingIntercalatedOccurrence[] {
  const copy = createIntercalatedOccurrence({
    afterSeriesId,
    slotOrder: nextSlotOrder(intercalations, afterSeriesId),
    exercise: {
      id: source.exerciseId,
      name: source.name,
      bodyPart: source.bodyPart,
      target: source.target,
      equipment: source.equipment,
      gifUrl: source.gifUrl,
    },
    series: {
      reps: source.series.reps,
      loadKg: source.series.loadKg,
      restSec: source.series.restSec,
    },
    trainerNote: source.trainerNote,
    gifUrl: source.gifUrl,
  });
  return insertIntercalatedOccurrence(series, intercalations, copy);
}

export function removeIntercalatedOccurrence(
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  intercalationId: string
): TrainingIntercalatedOccurrence[] {
  return (intercalations || []).filter((item) => item.id !== intercalationId);
}

export function updateIntercalatedSeries(
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  intercalationId: string,
  patch: Partial<Pick<TrainingExerciseSeries, 'reps' | 'loadKg' | 'restSec'>>
): TrainingIntercalatedOccurrence[] {
  return (intercalations || []).map((item) => {
    if (item.id !== intercalationId) return item;
    return {
      ...item,
      series: {
        ...item.series,
        reps: patch.reps !== undefined ? sanitizeReps(patch.reps, item.series.reps) : item.series.reps,
        loadKg: patch.loadKg !== undefined ? sanitizeLoadKg(patch.loadKg) : item.series.loadKg,
        restSec:
          patch.restSec !== undefined ? sanitizeRestSec(patch.restSec, item.series.restSec) : item.series.restSec,
      },
    };
  });
}

export function intercalationLabelOrder(
  series: Array<{ id: string; order?: number }>,
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  intercalationId: string
): number {
  const step = buildHostRunQueue(series, intercalations).find(
    (item) => item.kind === 'intercalated' && item.intercalationId === intercalationId
  );
  return step?.kind === 'intercalated' ? step.labelOrder : 1;
}

export function hasIntercalationsAfterSeries(
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  seriesId: string
): boolean {
  return intercalationsAfterSeries(intercalations, seriesId).length > 0;
}

export function shouldStartRestTimer(restSec: number, hasNextStep: boolean): boolean {
  return hasNextStep && Number.isFinite(restSec) && restSec > 0;
}

export function buildHostRunQueue(
  series: Array<{ id: string; order?: number }>,
  intercalations?: TrainingIntercalatedOccurrence[]
): HostRunStep[] {
  const steps: HostRunStep[] = [];
  const labelByExerciseId = new Map<string, number>();
  for (const item of series) {
    steps.push({
      kind: 'main',
      seriesId: item.id,
      seriesOrder: item.order ?? steps.filter((step) => step.kind === 'main').length + 1,
    });
    for (const occ of intercalationsAfterSeries(intercalations, item.id)) {
      const nextLabel = (labelByExerciseId.get(occ.exerciseId) ?? 0) + 1;
      labelByExerciseId.set(occ.exerciseId, nextLabel);
      steps.push({
        kind: 'intercalated',
        intercalationId: occ.id,
        afterSeriesId: occ.afterSeriesId,
        seriesId: occ.series.id,
        exerciseId: occ.exerciseId,
        labelOrder: nextLabel,
      });
    }
  }
  return steps;
}

export function cloneIntercalationsWithIdMap(
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  seriesIdMap: Map<string, string>
): TrainingIntercalatedOccurrence[] {
  return (intercalations || [])
    .map((item) => {
      const afterSeriesId = seriesIdMap.get(item.afterSeriesId);
      if (!afterSeriesId) return null;
      const trainerNote = sanitizeTrainerNote(item.trainerNote);
      return {
        ...item,
        id: createIntercalationId(),
        afterSeriesId,
        trainerNote,
        series: {
          ...item.series,
          id: createTrainingSeriesId(),
          order: 1,
        },
      } satisfies TrainingIntercalatedOccurrence;
    })
    .filter((item): item is TrainingIntercalatedOccurrence => Boolean(item));
}

export function seriesIdMapFromClone(
  original: TrainingExerciseSeries[],
  cloned: TrainingExerciseSeries[]
): Map<string, string> {
  const map = new Map<string, string>();
  original.forEach((item, index) => {
    const next = cloned[index];
    if (item?.id && next?.id) map.set(item.id, next.id);
  });
  return map;
}

export function removeSeriesAndLinkedIntercalations(
  series: TrainingExerciseSeries[],
  intercalations: TrainingIntercalatedOccurrence[] | undefined,
  seriesId: string
): { series: TrainingExerciseSeries[]; intercalations: TrainingIntercalatedOccurrence[] } {
  return {
    series: series.filter((item) => item.id !== seriesId),
    intercalations: (intercalations || []).filter((item) => item.afterSeriesId !== seriesId),
  };
}

export function validateIntercalations(
  series: Array<{ id: string }>,
  intercalations: TrainingIntercalatedOccurrence[] | undefined
): { ok: true } | { ok: false; message: string } {
  const valid = new Set(series.map((item) => item.id));
  for (const item of intercalations || []) {
    if (!item.exerciseId || !item.name) {
      return { ok: false, message: 'Exercício intercalado inválido.' };
    }
    if (!valid.has(item.afterSeriesId)) {
      return { ok: false, message: 'Exercício intercalado sem série correspondente.' };
    }
    if (!item.series?.id || !(item.series.reps > 0)) {
      return { ok: false, message: 'Série intercalada inválida.' };
    }
  }
  return { ok: true };
}

export function intercalationNamesByDocId(
  exercises: Array<{
    id?: string;
    name?: string;
    prescription?: { intercalations?: TrainingIntercalatedOccurrence[] };
  }>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const exercise of exercises) {
    if (exercise.id && exercise.name) out[exercise.id] = exercise.name;
    for (const item of exercise.prescription?.intercalations || []) {
      out[item.id] = item.name;
    }
  }
  return out;
}
