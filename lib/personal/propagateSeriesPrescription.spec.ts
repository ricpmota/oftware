import { describe, expect, it } from 'vitest';
import {
  createUniformTrainingSeries,
  normalizeTrainingExercisePrescription,
} from '@/lib/personal/trainingExerciseSeries';
import { createIntercalatedOccurrence } from '@/lib/personal/trainingIntercalation';
import { clonePrescriptionWithNewIds } from '@/lib/personal/workoutDraft';
import {
  applySeriesPrescriptionPatch,
  applySeriesPrescriptionPatchBySeriesId,
  applySeriesPrescriptionToExercise,
  buildSeriesPrescriptionTarget,
  findMatchingExercise,
  selectUpcomingRecurrenceSessions,
} from '@/lib/personal/propagateSeriesPrescription';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

function makeSeries() {
  return createUniformTrainingSeries({ count: 3, reps: 10, restSec: 60, loadKg: 20 });
}

function makeSession(
  partial: Partial<TrainingSession> & Pick<TrainingSession, 'id' | 'scheduledDate'>
): TrainingSession {
  return {
    patientId: 'p1',
    createdBy: 'patient',
    createdById: 'u1',
    title: 'Costas',
    status: 'scheduled',
    published: true,
    active: true,
    updatedAt: new Date(),
    createdAt: new Date(),
    ...partial,
  };
}

describe('propagateSeriesPrescription', () => {
  it('atualiza só a série alvo e replica pelo order mesmo com ids clonados', () => {
    const original = makeSeries();
    const patch = { reps: 8, loadKg: 25, restSec: 90 };
    const applied = applySeriesPrescriptionPatch(
      { series: original },
      { kind: 'main', exerciseOrder: 0, exerciseId: '0025', seriesOrder: 2 },
      patch
    );
    expect(applied?.changed).toBe(true);
    expect(applied?.prescription.series[0]).toMatchObject({ reps: 10, loadKg: 20, restSec: 60 });
    expect(applied?.prescription.series[1]).toMatchObject({ reps: 8, loadKg: 25, restSec: 90 });
    expect(applied?.prescription.series[2]).toMatchObject({ reps: 10, loadKg: 20, restSec: 60 });

    const cloned = clonePrescriptionWithNewIds({ series: original });
    expect(cloned.series[1].id).not.toBe(original[1].id);
    const replicated = applySeriesPrescriptionPatch(
      cloned,
      { kind: 'main', exerciseOrder: 0, exerciseId: '0025', seriesOrder: 2 },
      patch
    );
    expect(replicated?.changed).toBe(true);
    expect(replicated?.prescription.series[1]).toMatchObject({ reps: 8, loadKg: 25, restSec: 90 });
    expect(replicated?.prescription.series[1].id).toBe(cloned.series[1].id);
  });

  it('não marca changed quando os valores já são os mesmos', () => {
    const series = makeSeries();
    const applied = applySeriesPrescriptionPatch(
      { series },
      { kind: 'main', exerciseOrder: 0, exerciseId: '0025', seriesOrder: 1 },
      { reps: 10, loadKg: 20, restSec: 60 }
    );
    expect(applied?.changed).toBe(false);
  });

  it('grava a série atual pelo id, inclusive intercalada', () => {
    const series = makeSeries();
    const byId = applySeriesPrescriptionPatchBySeriesId(
      { series },
      series[2].id,
      { reps: 6, loadKg: 40, restSec: 120 }
    );
    expect(byId?.changed).toBe(true);
    expect(byId?.prescription.series[2]).toMatchObject({ reps: 6, loadKg: 40, restSec: 120 });
    expect(byId?.prescription.series[0].reps).toBe(10);

    const occurrence = createIntercalatedOccurrence({
      afterSeriesId: series[0].id,
      slotOrder: 0,
      exercise: {
        id: 'lat-raise',
        name: 'Elevação lateral',
        bodyPart: 'shoulders',
        target: 'delts',
        equipment: 'dumbbell',
      },
      series: { reps: 12, loadKg: 8, restSec: 0 },
    });
    const intercalated = applySeriesPrescriptionPatchBySeriesId(
      { series, intercalations: [occurrence] },
      occurrence.series.id,
      { reps: 15, loadKg: 10, restSec: 30 }
    );
    expect(intercalated?.prescription.intercalations?.[0].series).toMatchObject({
      reps: 15,
      loadKg: 10,
      restSec: 30,
    });
  });

  it('atualiza série intercalada pelo slot e pela série anterior', () => {
    const series = makeSeries();
    const occurrence = createIntercalatedOccurrence({
      afterSeriesId: series[0].id,
      slotOrder: 0,
      exercise: {
        id: 'lat-raise',
        name: 'Elevação lateral',
        bodyPart: 'shoulders',
        target: 'delts',
        equipment: 'dumbbell',
      },
      series: { reps: 12, loadKg: 8, restSec: 0 },
    });
    const prescription = { series, intercalations: [occurrence] };
    const cloned = clonePrescriptionWithNewIds(prescription);
    const applied = applySeriesPrescriptionPatch(
      cloned,
      {
        kind: 'intercalated',
        hostExerciseOrder: 1,
        hostExerciseId: 'pulldown',
        afterSeriesOrder: 1,
        intercalationExerciseId: 'lat-raise',
        intercalationSlotOrder: 0,
      },
      { reps: 15, loadKg: 10, restSec: 30 }
    );
    expect(applied?.changed).toBe(true);
    expect(applied?.prescription.intercalations?.[0].series).toMatchObject({
      reps: 15,
      loadKg: 10,
      restSec: 30,
    });
    expect(applied?.prescription.series[0].reps).toBe(10);
  });

  it('monta o target da série principal e da intercalada', () => {
    const series = makeSeries();
    const occurrence = createIntercalatedOccurrence({
      afterSeriesId: series[0].id,
      slotOrder: 0,
      exercise: {
        id: 'lat-raise',
        name: 'Elevação lateral',
        bodyPart: 'shoulders',
        target: 'delts',
        equipment: 'dumbbell',
      },
    });
    const exercise = {
      exerciseId: 'pulldown',
      order: 2,
      prescription: { series, intercalations: [occurrence] },
    };
    expect(
      buildSeriesPrescriptionTarget(exercise, {
        kind: 'main',
        seriesId: series[1].id,
        seriesOrder: 2,
      })
    ).toEqual({
      kind: 'main',
      exerciseOrder: 2,
      exerciseId: 'pulldown',
      seriesOrder: 2,
    });
    expect(
      buildSeriesPrescriptionTarget(exercise, {
        kind: 'intercalated',
        intercalationId: occurrence.id,
        afterSeriesId: series[0].id,
        seriesId: occurrence.series.id,
        exerciseId: 'lat-raise',
        labelOrder: 1,
      })
    ).toEqual({
      kind: 'intercalated',
      hostExerciseOrder: 2,
      hostExerciseId: 'pulldown',
      afterSeriesOrder: 1,
      intercalationExerciseId: 'lat-raise',
      intercalationSlotOrder: 0,
    });
  });

  it('casa o exercício pelo order + exerciseId entre semanas clonadas', () => {
    const series = makeSeries();
    const current: TrainingSessionExercise = {
      id: 'ex_now',
      source: 'exercisedb',
      exerciseId: '0025',
      name: 'Pull-up',
      bodyPart: 'back',
      target: 'lats',
      equipment: 'body weight',
      prescription: { series },
      order: 1,
    };
    const future: TrainingSessionExercise = {
      ...current,
      id: 'ex_week2',
      prescription: clonePrescriptionWithNewIds({ series }),
    };
    const target = {
      kind: 'main' as const,
      exerciseOrder: 1,
      exerciseId: '0025',
      seriesOrder: 3,
    };
    expect(findMatchingExercise([future], target)?.id).toBe('ex_week2');
    const patched = applySeriesPrescriptionToExercise(future, target, {
      reps: 6,
      loadKg: 0,
      restSec: 120,
    });
    expect(patched?.changed).toBe(true);
    const next = normalizeTrainingExercisePrescription(patched?.exercise.prescription);
    expect(next.series[2]).toMatchObject({ reps: 6, loadKg: 0, restSec: 120 });
    expect(next.series[0].id).toBe(future.prescription.series[0].id);
  });

  it('seleciona a sessão atual e as futuras scheduled do mesmo grupo', () => {
    const sessions = [
      makeSession({
        id: 's0',
        scheduledDate: '2026-01-01',
        recurrenceGroupId: 'g1',
        status: 'done',
      }),
      makeSession({
        id: 's1',
        scheduledDate: '2026-01-08',
        recurrenceGroupId: 'g1',
        status: 'scheduled',
      }),
      makeSession({
        id: 's2',
        scheduledDate: '2026-01-15',
        recurrenceGroupId: 'g1',
        status: 'scheduled',
      }),
      makeSession({
        id: 's3',
        scheduledDate: '2026-01-22',
        recurrenceGroupId: 'g1',
        status: 'done',
      }),
      makeSession({
        id: 'other',
        scheduledDate: '2026-01-15',
        recurrenceGroupId: 'g2',
        status: 'scheduled',
      }),
    ];
    const selected = selectUpcomingRecurrenceSessions(sessions, {
      currentSessionId: 's1',
      currentScheduledDate: '2026-01-08',
      recurrenceGroupId: 'g1',
    });
    expect(selected.map((item) => item.id)).toEqual(['s1', 's2']);
  });

  it('sem grupo de recorrência atualiza só a sessão atual', () => {
    const sessions = [
      makeSession({ id: 's1', scheduledDate: '2026-01-08', title: 'Costas' }),
      makeSession({ id: 's2', scheduledDate: '2026-01-15', title: 'Costas' }),
    ];
    expect(
      selectUpcomingRecurrenceSessions(sessions, {
        currentSessionId: 's1',
        currentScheduledDate: '2026-01-08',
      }).map((item) => item.id)
    ).toEqual(['s1']);
  });
});
