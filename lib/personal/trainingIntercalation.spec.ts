import { describe, expect, it } from 'vitest';
import { createUniformTrainingSeries } from '@/lib/personal/trainingExerciseSeries';
import {
  buildHostRunQueue,
  cloneIntercalationsWithIdMap,
  createIntercalatedOccurrence,
  insertIntercalatedOccurrence,
  lastIntercalationBeforeSlot,
  removeIntercalatedOccurrence,
  removeSeriesAndLinkedIntercalations,
  repeatIntercalatedOccurrence,
  seriesIdMapFromClone,
  shouldStartRestTimer,
  validateIntercalations,
} from '@/lib/personal/trainingIntercalation';
import {
  createIntercalationExecution,
  getHostQueuePendingStep,
} from '@/lib/personal/trainingHostRun';
import { completeExecutedSeries } from '@/lib/personal/trainingExecutionSeries';
import {
  clonePrescriptionWithNewIds,
  duplicateSelectedExerciseDraft,
  toSelectedExerciseDraft,
} from '@/lib/personal/workoutDraft';
import type { Exercise } from '@/types/exercise';

const lateral: Exercise = {
  id: 'lat-raise',
  name: 'dumbbell lateral raise',
  bodyPart: 'shoulders',
  target: 'delts',
  equipment: 'dumbbell',
  secondaryMuscles: [],
  instructions: [],
};

const press: Exercise = {
  id: 'ohp',
  name: 'dumbbell shoulder press',
  bodyPart: 'shoulders',
  target: 'delts',
  equipment: 'dumbbell',
  secondaryMuscles: [],
  instructions: [],
};

function benchSeries() {
  return createUniformTrainingSeries({ count: 3, reps: 10, restSec: 60, loadKg: 20 });
}

describe('trainingIntercalation', () => {
  it('insere intercalado after S1 com uma série e IDs próprios', () => {
    const series = benchSeries();
    const occurrence = createIntercalatedOccurrence({
      afterSeriesId: series[0].id,
      slotOrder: 0,
      exercise: lateral,
    });
    expect(occurrence.id.startsWith('int_')).toBe(true);
    expect(occurrence.series.order).toBe(1);
    expect(occurrence.series.reps).toBe(10);
    expect(occurrence.series.loadKg).toBeNull();
    expect(occurrence.series.restSec).toBe(0);
    const intercalations = insertIntercalatedOccurrence(series, [], occurrence);
    expect(intercalations).toHaveLength(1);
    expect(intercalations[0].afterSeriesId).toBe(series[0].id);
    expect(intercalations[0].series.id).not.toBe(series[0].id);
  });

  it('repete o exercício anterior com nova ocorrência independente', () => {
    const series = benchSeries();
    const first = createIntercalatedOccurrence({
      afterSeriesId: series[0].id,
      slotOrder: 0,
      exercise: lateral,
      series: { reps: 12, loadKg: 8, restSec: 60 },
    });
    first.trainerNote = 'Cotovelo alto';
    let intercalations = insertIntercalatedOccurrence(series, [], first);
    intercalations = repeatIntercalatedOccurrence(series, intercalations, series[1].id, first);
    expect(intercalations).toHaveLength(2);
    expect(intercalations[1].id).not.toBe(first.id);
    expect(intercalations[1].series.id).not.toBe(first.series.id);
    expect(intercalations[1].exerciseId).toBe('lat-raise');
    expect(intercalations[1].afterSeriesId).toBe(series[1].id);
    expect(intercalations[1].series).toMatchObject({ reps: 12, loadKg: 8, restSec: 60 });
    expect(intercalations[1].trainerNote).toBe('Cotovelo alto');
    intercalations[1].series.reps = 99;
    expect(first.series.reps).toBe(12);
  });

  it('permite selecionar outro exercício no mesmo fluxo', () => {
    const series = benchSeries();
    const a = createIntercalatedOccurrence({
      afterSeriesId: series[0].id,
      slotOrder: 0,
      exercise: lateral,
    });
    const b = createIntercalatedOccurrence({
      afterSeriesId: series[1].id,
      slotOrder: 0,
      exercise: press,
    });
    const intercalations = insertIntercalatedOccurrence(
      series,
      insertIntercalatedOccurrence(series, [], a),
      b
    );
    expect(intercalations.map((item) => item.exerciseId)).toEqual(['lat-raise', 'ohp']);
    const last = lastIntercalationBeforeSlot(series, intercalations, series[1].id);
    expect(last?.exerciseId).toBe('ohp');
    const previousSlot = lastIntercalationBeforeSlot(series, intercalations, series[2].id);
    expect(previousSlot?.exerciseId).toBe('ohp');
  });

  it('remove apenas a ocorrência intercalada', () => {
    const series = benchSeries();
    const a = createIntercalatedOccurrence({
      afterSeriesId: series[0].id,
      slotOrder: 0,
      exercise: lateral,
    });
    const b = createIntercalatedOccurrence({
      afterSeriesId: series[1].id,
      slotOrder: 0,
      exercise: lateral,
    });
    const intercalations = insertIntercalatedOccurrence(
      series,
      insertIntercalatedOccurrence(series, [], a),
      b
    );
    const next = removeIntercalatedOccurrence(intercalations, a.id);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(b.id);
    expect(series).toHaveLength(3);
  });

  it('deriva A1 B1 A2 B2 A3 B3', () => {
    const series = benchSeries();
    const intercalations = series.map((item, index) =>
      createIntercalatedOccurrence({
        afterSeriesId: item.id,
        slotOrder: 0,
        exercise: lateral,
        series: { reps: 12, loadKg: 8, restSec: index === 2 ? 0 : 60 },
      })
    );
    const queue = buildHostRunQueue(series, intercalations);
    expect(queue.map((step) => (step.kind === 'main' ? `A${step.seriesOrder}` : `B${step.labelOrder}`))).toEqual([
      'A1',
      'B1',
      'A2',
      'B2',
      'A3',
      'B3',
    ]);
  });

  it('deriva sequência livre A1 B1 A2 C1 A3 B2', () => {
    const series = benchSeries();
    const intercalations = [
      createIntercalatedOccurrence({ afterSeriesId: series[0].id, slotOrder: 0, exercise: lateral }),
      createIntercalatedOccurrence({ afterSeriesId: series[1].id, slotOrder: 0, exercise: press }),
      createIntercalatedOccurrence({ afterSeriesId: series[2].id, slotOrder: 0, exercise: lateral }),
    ];
    const queue = buildHostRunQueue(series, intercalations);
    expect(
      queue.map((step) =>
        step.kind === 'main' ? `A${step.seriesOrder}` : `${step.exerciseId === 'lat-raise' ? 'B' : 'C'}${step.labelOrder}`
      )
    ).toEqual(['A1', 'B1', 'A2', 'C1', 'A3', 'B2']);
  });

  it('clone remapeia afterSeriesId e gera novos IDs', () => {
    const original = benchSeries();
    const intercalations = [
      createIntercalatedOccurrence({
        afterSeriesId: original[0].id,
        slotOrder: 0,
        exercise: lateral,
        series: { reps: 12, loadKg: 8, restSec: 0 },
      }),
    ];
    const cloned = clonePrescriptionWithNewIds({ series: original, intercalations });
    expect(cloned.series.map((item) => item.id)).not.toEqual(original.map((item) => item.id));
    expect(cloned.intercalations?.[0].id).not.toBe(intercalations[0].id);
    expect(cloned.intercalations?.[0].series.id).not.toBe(intercalations[0].series.id);
    expect(cloned.intercalations?.[0].afterSeriesId).toBe(cloned.series[0].id);
    expect(cloned.intercalations?.[0].afterSeriesId).not.toBe(original[0].id);
    expect(cloned.intercalations?.[0].series).toMatchObject({ reps: 12, loadKg: 8, restSec: 0 });
  });

  it('duplicar exercício principal copia intercalações com mapa novo', () => {
    const series = benchSeries();
    const intercalations = [
      createIntercalatedOccurrence({
        afterSeriesId: series[0].id,
        slotOrder: 0,
        exercise: lateral,
      }),
    ];
    const original = toSelectedExerciseDraft({
      id: '0025',
      name: 'bench',
      bodyPart: 'chest',
      target: 'pectorals',
      equipment: 'barbell',
      secondaryMuscles: [],
      instructions: [],
      prescription: { series, intercalations },
    });
    const copy = duplicateSelectedExerciseDraft(original);
    expect(copy.draftId).not.toBe(original.draftId);
    expect(copy.prescription.intercalations).toHaveLength(1);
    expect(copy.prescription.intercalations?.[0].id).not.toBe(intercalations[0].id);
    expect(copy.prescription.intercalations?.[0].afterSeriesId).toBe(copy.prescription.series[0].id);
    expect(copy.prescription.intercalations?.[0].exerciseId).toBe('lat-raise');
  });

  it('remove série principal e intercalações vinculadas', () => {
    const series = benchSeries();
    const intercalations = [
      createIntercalatedOccurrence({ afterSeriesId: series[1].id, slotOrder: 0, exercise: lateral }),
    ];
    const next = removeSeriesAndLinkedIntercalations(series, intercalations, series[1].id);
    expect(next.series).toHaveLength(2);
    expect(next.intercalations).toHaveLength(0);
  });

  it('legado sem intercalação permanece fila tradicional', () => {
    const series = benchSeries();
    const queue = buildHostRunQueue(series, undefined);
    expect(queue).toHaveLength(3);
    expect(queue.every((step) => step.kind === 'main')).toBe(true);
    expect(validateIntercalations(series, undefined).ok).toBe(true);
  });

  it('carga null no intercalado é válida', () => {
    const series = benchSeries();
    const occurrence = createIntercalatedOccurrence({
      afterSeriesId: series[0].id,
      slotOrder: 0,
      exercise: lateral,
      series: { reps: 12, loadKg: null, restSec: 0 },
    });
    expect(occurrence.series.loadKg).toBeNull();
    expect(validateIntercalations(series, [occurrence]).ok).toBe(true);
  });

  it('seriesIdMapFromClone alinha índices', () => {
    const original = benchSeries();
    const cloned = clonePrescriptionWithNewIds({ series: original }).series;
    const map = seriesIdMapFromClone(original, cloned);
    expect(map.get(original[2].id)).toBe(cloned[2].id);
    const remapped = cloneIntercalationsWithIdMap(
      [
        createIntercalatedOccurrence({
          afterSeriesId: original[2].id,
          slotOrder: 0,
          exercise: lateral,
        }),
      ],
      map
    );
    expect(remapped[0].afterSeriesId).toBe(cloned[2].id);
  });
});

describe('execução intercalada', () => {
  it('retoma em A2 depois de concluir A1 e B1', () => {
    const series = benchSeries();
    const intercalations = [
      createIntercalatedOccurrence({ afterSeriesId: series[0].id, slotOrder: 0, exercise: lateral }),
    ];
    const queue = buildHostRunQueue(series, intercalations);
    const host = {
      exerciseDocId: 'host',
      exerciseId: '0025',
      status: 'in_progress' as const,
      series: series.map((item, index) => ({
        seriesId: item.id,
        order: item.order,
        prescribedReps: item.reps,
        prescribedLoadKg: item.loadKg,
        prescribedRestSec: item.restSec,
        actualReps: index === 0 ? 15 : null,
        actualLoadKg: index === 0 ? 20 : null,
        status: index === 0 ? ('done' as const) : ('pending' as const),
        completedAt: index === 0 ? new Date().toISOString() : null,
      })),
    };
    const intercalationExec = createIntercalationExecution(intercalations[0]);
    const afterB1 = completeExecutedSeries(intercalationExec, intercalations[0].series.id, {
      actualReps: 12,
      actualLoadKg: 8,
    });
    expect(afterB1.ok).toBe(true);
    if (!afterB1.ok) return;
    const next = getHostQueuePendingStep(queue, host, {
      [intercalations[0].id]: afterB1.execution,
    });
    expect(next?.kind).toBe('main');
    expect(next && next.kind === 'main' ? next.seriesId : null).toBe(series[1].id);
  });

  it('timer só inicia quando restSec > 0 e há próximo passo', () => {
    expect(shouldStartRestTimer(0, true)).toBe(false);
    expect(shouldStartRestTimer(60, true)).toBe(true);
    expect(shouldStartRestTimer(60, false)).toBe(false);
  });
});
