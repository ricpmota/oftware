import { describe, expect, it } from 'vitest';
import { createDefaultTrainingSeries } from '@/lib/personal/trainingExerciseSeries';
import {
  catalogExerciseIsAdded,
  duplicateSelectedExerciseDraft,
  formatWorkoutDraftSummary,
  getWorkoutDraftSummary,
  insertDuplicatedExercise,
  reorderSelectedExercises,
  toSelectedExerciseDraft,
  type SelectedExerciseDraft,
} from '@/lib/personal/workoutDraft';

function makeDraft(id: string, name: string): SelectedExerciseDraft {
  return toSelectedExerciseDraft({
    id,
    name,
    bodyPart: 'chest',
    target: 'pectorals',
    equipment: 'barbell',
    secondaryMuscles: [],
    instructions: [],
    prescription: { series: createDefaultTrainingSeries() },
  });
}

describe('workoutDraft', () => {
  it('conta exercícios e séries', () => {
    const a = makeDraft('0025', 'bench');
    const b = makeDraft('0030', 'fly');
    b.prescription.series = b.prescription.series.slice(0, 2);
    expect(getWorkoutDraftSummary([a, b])).toEqual({ exerciseCount: 2, seriesCount: 5 });
    expect(formatWorkoutDraftSummary({ exerciseCount: 3, seriesCount: 9 })).toBe(
      '3 exercícios · 9 séries'
    );
  });

  it('duplica com draftId e series.id novos, preservando exerciseId e prescrição', () => {
    const original = makeDraft('0025', 'bench');
    original.prescription.series[0].reps = 15;
    original.prescription.series[0].loadKg = 20;
    original.trainerNote = 'Manter escápulas retraídas.';
    const copy = duplicateSelectedExerciseDraft(original);

    expect(copy.draftId).not.toBe(original.draftId);
    expect(copy.id).toBe('0025');
    expect(copy.trainerNote).toBe('Manter escápulas retraídas.');
    expect(copy.prescription.series).toHaveLength(original.prescription.series.length);
    expect(copy.prescription.series.map((s) => s.id)).not.toEqual(
      original.prescription.series.map((s) => s.id)
    );
    expect(copy.prescription.series[0]).toMatchObject({
      order: 1,
      reps: 15,
      loadKg: 20,
      restSec: 60,
    });
    copy.trainerNote = 'Outra orientação';
    expect(original.trainerNote).toBe('Manter escápulas retraídas.');
  });

  it('duplica exercício sem trainerNote', () => {
    const original = makeDraft('0025', 'bench');
    original.trainerNote = '';
    const copy = duplicateSelectedExerciseDraft(original);
    expect(copy.trainerNote).toBeUndefined();
  });

  it('insere a cópia imediatamente após o original', () => {
    const items = [makeDraft('a', 'A'), makeDraft('b', 'B'), makeDraft('c', 'C')];
    const next = insertDuplicatedExercise(items, items[0].draftId);
    expect(next).toHaveLength(4);
    expect(next[0].id).toBe('a');
    expect(next[1].id).toBe('a');
    expect(next[1].draftId).not.toBe(next[0].draftId);
    expect(next[2].id).toBe('b');
  });

  it('reordena pelo índice', () => {
    const items = ['supino', 'crucifixo', 'triceps'];
    expect(reorderSelectedExercises(items, 2, 1)).toEqual(['supino', 'triceps', 'crucifixo']);
    expect(reorderSelectedExercises(items, 0, 0)).toEqual(items);
  });

  it('duplica intercalações remapeando afterSeriesId', () => {
    const original = makeDraft('0025', 'bench');
    const firstId = original.prescription.series[0].id;
    original.prescription.intercalations = [
      {
        id: 'int_old',
        afterSeriesId: firstId,
        slotOrder: 0,
        exerciseId: 'lat',
        name: 'lateral raise',
        bodyPart: 'shoulders',
        target: 'delts',
        equipment: 'dumbbell',
        series: { id: 'set_old', order: 1, reps: 12, loadKg: 8, restSec: 0 },
      },
    ];
    const copy = duplicateSelectedExerciseDraft(original);
    expect(copy.prescription.intercalations?.[0].afterSeriesId).toBe(copy.prescription.series[0].id);
    expect(copy.prescription.intercalations?.[0].id).not.toBe('int_old');
    expect(getWorkoutDraftSummary([original])).toEqual({ exerciseCount: 1, seriesCount: 4 });
  });

  it('catálogo bloqueia + se já existe o mesmo ExerciseDB id', () => {
    const selected = [makeDraft('0025', 'bench'), makeDraft('0025', 'bench copy')];
    expect(catalogExerciseIsAdded(selected, '0025')).toBe(true);
    expect(catalogExerciseIsAdded(selected, '9999')).toBe(false);
  });
});
