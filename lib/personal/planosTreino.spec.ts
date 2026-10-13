import { describe, expect, it } from 'vitest';
import { createDefaultTrainingSeries } from '@/lib/personal/trainingExerciseSeries';
import {
  clonePersonalWorkoutTemplate,
  cloneTemplateExerciseToWorkoutDraft,
  createTemplateExerciseFromCatalog,
  draftToTemplateExercise,
  duplicateTemplateExercise,
  importWorkoutTemplateToDraft,
  insertDuplicatedTemplateExercise,
  mergeClonedDraftsIntoWorkout,
  reorderTemplateExercises,
  stripLoadsFromSeries,
  suggestedSessionTitleFromTemplate,
  suggestedTemplateCopyName,
  templateExerciseToDraft,
  validatePersonalWorkoutTemplate,
  workoutDraftToTemplateExercises,
  type PersonalWorkoutTemplate,
} from '@/lib/personal/planosTreino';
import type { Exercise } from '@/types/exercise';

const catalogExercise: Exercise = {
  id: '0025',
  name: 'barbell bench press',
  bodyPart: 'chest',
  target: 'pectorals',
  equipment: 'barbell',
  secondaryMuscles: [],
  instructions: [],
};

function makeTemplate(): PersonalWorkoutTemplate {
  const a = createTemplateExerciseFromCatalog(catalogExercise);
  const b = createTemplateExerciseFromCatalog({
    ...catalogExercise,
    id: '0030',
    name: 'dumbbell fly',
  });
    a.prescription.series[0].reps = 15;
    a.prescription.series[0].loadKg = 20;
    a.trainerNote = 'Manter as escápulas retraídas.';
    return {
    nome: 'Peito + Tríceps — Hipertrofia',
    descricao: 'Intermediário',
    exercicios: [
      { ...a, order: 0 },
      { ...b, order: 1 },
    ],
  };
}

describe('planosTreino', () => {
  it('cria exercício de catálogo com 3×10, loadKg null e id tpl_ex_', () => {
    const created = createTemplateExerciseFromCatalog(catalogExercise);
    expect(created.id.startsWith('tpl_ex_')).toBe(true);
    expect(created.exerciseId).toBe('0025');
    expect(created.source).toBe('exercisedb');
    expect(created.prescription.series).toHaveLength(3);
    expect(created.prescription.series.every((s) => s.reps === 10 && s.loadKg == null)).toBe(true);
    expect(created.gifUrl).toContain('/api/exercisedb/image?exerciseId=0025');
  });

  it('duplica exercício com novos ids de item e de séries, preservando prescrição', () => {
    const original = makeTemplate().exercicios[0];
    const copy = duplicateTemplateExercise(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.exerciseId).toBe(original.exerciseId);
    expect(copy.prescription.series.map((s) => s.id)).not.toEqual(
      original.prescription.series.map((s) => s.id)
    );
    expect(copy.prescription.series[0]).toMatchObject({ reps: 15, loadKg: 20, restSec: 60 });
    expect(copy.trainerNote).toBe('Manter as escápulas retraídas.');
  });

  it('insere cópia após o original e reordena', () => {
    const items = makeTemplate().exercicios;
    const withCopy = insertDuplicatedTemplateExercise(items, items[0].id);
    expect(withCopy).toHaveLength(3);
    expect(withCopy[0].exerciseId).toBe('0025');
    expect(withCopy[1].exerciseId).toBe('0025');
    expect(withCopy[1].id).not.toBe(withCopy[0].id);
    expect(withCopy.map((item) => item.order)).toEqual([0, 1, 2]);

    const reordered = reorderTemplateExercises(withCopy, 2, 0);
    expect(reordered[0].exerciseId).toBe('0030');
    expect(reordered.map((item) => item.order)).toEqual([0, 1, 2]);
  });

  it('clona template com nome (cópia) e ids novos', () => {
    const original = makeTemplate();
    original.cor = 'violet';
    const cloned = clonePersonalWorkoutTemplate(original);
    expect(cloned.nome).toBe('Peito + Tríceps — Hipertrofia (cópia)');
    expect(cloned.cor).toBe('violet');
    expect(cloned.exercicios).toHaveLength(2);
    expect(cloned.exercicios[0].id).not.toBe(original.exercicios[0].id);
    expect(cloned.exercicios[0].prescription.series[0].id).not.toBe(
      original.exercicios[0].prescription.series[0].id
    );
    expect(suggestedTemplateCopyName('Pernas')).toBe('Pernas (cópia)');
  });

  it('template sem trainerNote importa e salva sem quebrar', () => {
    const original = makeTemplate();
    original.exercicios[1].trainerNote = '';
    delete original.exercicios[1].trainerNote;
    const imported = importWorkoutTemplateToDraft(original);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.drafts[1].trainerNote).toBeUndefined();
    const saved = workoutDraftToTemplateExercises(imported.drafts, { preserveLoads: false });
    expect(saved[1].trainerNote).toBeUndefined();
  });

  it('converte draft ↔ template sem usar draftId como exerciseId', () => {
    const exercise = makeTemplate().exercicios[0];
    const draft = templateExerciseToDraft(exercise);
    expect(draft.draftId).toBe(exercise.id);
    expect(draft.id).toBe('0025');
    const back = draftToTemplateExercise(draft, 0);
    expect(back.exerciseId).toBe('0025');
    expect(back.id).toBe(exercise.id);
    expect(back.prescription.series[0].loadKg).toBe(20);
    expect(back.trainerNote).toBe('Manter as escápulas retraídas.');
  });

  it('valida nome, exercícios e séries', () => {
    expect(validatePersonalWorkoutTemplate({ nome: '   ', exercicios: [] }).ok).toBe(false);
    expect(validatePersonalWorkoutTemplate({ nome: 'Peito', exercicios: [] }).ok).toBe(false);
    const valid = makeTemplate();
    expect(validatePersonalWorkoutTemplate(valid).ok).toBe(true);
    valid.exercicios[0].prescription.series[0].reps = 0;
    expect(validatePersonalWorkoutTemplate(valid).ok).toBe(false);
  });

  it('clone profundo não compartilha referências nem ids', () => {
    const original = makeTemplate();
    original.id = 'plano_original';
    const cloned = clonePersonalWorkoutTemplate(original);
    expect('id' in cloned).toBe(false);
    cloned.exercicios[0].prescription.series[0].reps = 99;
    cloned.exercicios[0].trainerNote = 'Pegada mais fechada';
    expect(original.exercicios[0].prescription.series[0].reps).toBe(15);
    expect(original.exercicios[0].trainerNote).toBe('Manter as escápulas retraídas.');
    expect(cloned.nome).toBe('Peito + Tríceps — Hipertrofia (cópia)');
  });

  it('default series usa createDefaultTrainingSeries (3 iguais)', () => {
    expect(createDefaultTrainingSeries()).toHaveLength(3);
  });

  it('importa template para draft com novos draftId e series ids, preservando ExerciseDB e prescrição', () => {
    const original = makeTemplate();
    const result = importWorkoutTemplateToDraft(original);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.drafts).toHaveLength(2);
    expect(result.drafts[0].draftId.startsWith('draft_ex_')).toBe(true);
    expect(result.drafts[0].draftId).not.toBe(original.exercicios[0].id);
    expect(result.drafts[0].id).toBe('0025');
    expect(result.drafts[0].prescription.series.map((s) => s.id)).not.toEqual(
      original.exercicios[0].prescription.series.map((s) => s.id)
    );
    expect(result.drafts[0].prescription.series[0]).toMatchObject({
      reps: 15,
      loadKg: 20,
      restSec: 60,
    });
    expect(result.drafts[0].trainerNote).toBe('Manter as escápulas retraídas.');
    expect(result.drafts[0].gifUrl).toContain('/api/exercisedb/image?exerciseId=0025');
    result.drafts[0].trainerNote = 'Pegada mais fechada';
    expect(original.exercicios[0].trainerNote).toBe('Manter as escápulas retraídas.');
    result.drafts[0].prescription.series[0].loadKg = 99;
    expect(original.exercicios[0].prescription.series[0].loadKg).toBe(20);
  });

  it('importa intercalações remapeando afterSeriesId', () => {
    const original = makeTemplate();
    const series = original.exercicios[0].prescription.series;
    original.exercicios[0].prescription.intercalations = [
      {
        id: 'int_old',
        afterSeriesId: series[0].id,
        slotOrder: 0,
        exerciseId: 'lat-raise',
        name: 'lateral raise',
        bodyPart: 'shoulders',
        target: 'delts',
        equipment: 'dumbbell',
        series: { id: 'set_old', order: 1, reps: 12, loadKg: 8, restSec: 0 },
      },
    ];
    const imported = importWorkoutTemplateToDraft(original);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const cloned = imported.drafts[0].prescription.intercalations?.[0];
    expect(cloned).toBeTruthy();
    expect(cloned?.id).not.toBe('int_old');
    expect(cloned?.series.id).not.toBe('set_old');
    expect(cloned?.afterSeriesId).toBe(imported.drafts[0].prescription.series[0].id);
    expect(cloned?.afterSeriesId).not.toBe(series[0].id);
    expect(cloned?.series).toMatchObject({ reps: 12, loadKg: 8, restSec: 0 });

    const saved = workoutDraftToTemplateExercises(imported.drafts, { preserveLoads: true });
    expect(saved[0].prescription.intercalations?.[0].afterSeriesId).toBe(
      saved[0].prescription.series[0].id
    );
    expect(saved[0].prescription.intercalations?.[0].id).not.toBe(cloned?.id);
  });

  it('recusa import de template sem exercícios válidos', () => {
    const empty = importWorkoutTemplateToDraft({ nome: 'X', exercicios: [] });
    expect(empty.ok).toBe(false);
    const invalid = makeTemplate();
    invalid.exercicios[0].prescription.series[0].reps = 0;
    expect(importWorkoutTemplateToDraft(invalid).ok).toBe(false);
  });

  it('replace e append no merge do rascunho', () => {
    const current = [cloneTemplateExerciseToWorkoutDraft(makeTemplate().exercicios[1])];
    const imported = importWorkoutTemplateToDraft(makeTemplate());
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const replaced = mergeClonedDraftsIntoWorkout(current, imported.drafts, 'replace');
    expect(replaced).toHaveLength(2);
    expect(replaced[0].id).toBe('0025');
    const appended = mergeClonedDraftsIntoWorkout(current, imported.drafts, 'append');
    expect(appended).toHaveLength(3);
    expect(appended[0].id).toBe('0030');
    expect(appended[1].id).toBe('0025');
    expect(appended.filter((item) => item.id === '0030')).toHaveLength(2);
  });

  it('draft → template gera tpl_ex_ e novos series ids; preserveLoads on/off', () => {
    const imported = importWorkoutTemplateToDraft(makeTemplate());
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const withLoads = workoutDraftToTemplateExercises(imported.drafts, { preserveLoads: true });
    expect(withLoads[0].id.startsWith('tpl_ex_')).toBe(true);
    expect(withLoads[0].id).not.toBe(imported.drafts[0].draftId);
    expect(withLoads[0].exerciseId).toBe('0025');
    expect(withLoads[0].prescription.series[0].id).not.toBe(
      imported.drafts[0].prescription.series[0].id
    );
    expect(withLoads[0].prescription.series[0].loadKg).toBe(20);
    expect(withLoads.map((item) => item.order)).toEqual([0, 1]);

    const withoutLoads = workoutDraftToTemplateExercises(imported.drafts, { preserveLoads: false });
    expect(withoutLoads[0].prescription.series.every((s) => s.loadKg == null)).toBe(true);
    expect(withoutLoads[0].prescription.series[0].reps).toBe(15);
    expect(withoutLoads[0].trainerNote).toBe('Manter as escápulas retraídas.');
    imported.drafts[0].prescription.series[0].reps = 8;
    expect(withoutLoads[0].prescription.series[0].reps).toBe(15);
  });

  it('permite duplicar o mesmo ExerciseDB ao salvar modelo', () => {
    const imported = importWorkoutTemplateToDraft(makeTemplate());
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const duplicated = [imported.drafts[0], imported.drafts[0]];
    const saved = workoutDraftToTemplateExercises(duplicated, { preserveLoads: true });
    expect(saved).toHaveLength(2);
    expect(saved[0].exerciseId).toBe(saved[1].exerciseId);
    expect(saved[0].id).not.toBe(saved[1].id);
  });

  it('stripLoadsFromSeries zera carga e preserva o restante', () => {
    const series = makeTemplate().exercicios[0].prescription.series;
    const stripped = stripLoadsFromSeries(series);
    expect(stripped[0].loadKg).toBeNull();
    expect(stripped[0].reps).toBe(series[0].reps);
    expect(series[0].loadKg).toBe(20);
  });

  it('só preenche título do treino se estiver vazio', () => {
    expect(suggestedSessionTitleFromTemplate('', 'Peito + Tríceps')).toBe('Peito + Tríceps');
    expect(suggestedSessionTitleFromTemplate('Treino João', 'Peito + Tríceps')).toBe('Treino João');
  });
});
