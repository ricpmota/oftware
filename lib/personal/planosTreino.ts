/**
 * Biblioteca de treinos do personal (templates reutilizáveis).
 * Não misturar com trainingSessions, WorkoutPlanDraft nem selectedExercises do paciente.
 */

import type { Exercise } from '@/types/exercise';
import {
  clonePrescriptionWithNewIds,
  createExerciseDraftId,
  reorderSelectedExercises,
  sanitizeTrainerNote,
  type SelectedExerciseDraft,
} from '@/lib/personal/workoutDraft';
import {
  createDefaultTrainingSeries,
  normalizeTrainingExercisePrescription,
  serializeTrainingPrescription,
  validateTrainingPrescription,
  type TrainingExercisePrescription,
  type TrainingExerciseSeries,
} from '@/lib/personal/trainingExerciseSeries';

export type PersonalWorkoutTemplateExercise = {
  id: string;
  source: 'exercisedb';
  exerciseId: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl?: string;
  prescription: TrainingExercisePrescription;
  trainerNote?: string;
  order: number;
};

export type PersonalWorkoutTemplate = {
  id?: string;
  nome: string;
  descricao?: string;
  cor?: string;
  exercicios: PersonalWorkoutTemplateExercise[];
  criadoEm?: Date;
  atualizadoEm?: Date;
};

export function createTemplateExerciseId(): string {
  return `tpl_ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function templateExerciseGifUrl(exerciseId: string): string {
  const id = String(exerciseId || '').trim();
  if (!id) return '';
  return `/api/exercisedb/image?exerciseId=${encodeURIComponent(id)}&resolution=360`;
}

export function createTemplateExerciseFromCatalog(
  exercise: Exercise
): PersonalWorkoutTemplateExercise {
  const exerciseId = String(exercise.id || '').trim();
  const gifUrl = templateExerciseGifUrl(exerciseId);
  return {
    id: createTemplateExerciseId(),
    source: 'exercisedb',
    exerciseId,
    name: exercise.name,
    bodyPart: exercise.bodyPart,
    target: exercise.target,
    equipment: exercise.equipment,
    ...(gifUrl ? { gifUrl } : {}),
    prescription: { series: createDefaultTrainingSeries() },
    order: 0,
  };
}

export function templateExerciseToDraft(
  exercise: PersonalWorkoutTemplateExercise
): SelectedExerciseDraft {
  const prescription = normalizeTrainingExercisePrescription(exercise.prescription);
  const trainerNote = sanitizeTrainerNote(exercise.trainerNote);
  return {
    draftId: exercise.id,
    id: exercise.exerciseId,
    name: exercise.name,
    bodyPart: exercise.bodyPart,
    target: exercise.target,
    equipment: exercise.equipment,
    secondaryMuscles: [],
    instructions: [],
    gifUrl: templateExerciseGifUrl(exercise.exerciseId) || exercise.gifUrl,
    prescription,
    ...(trainerNote ? { trainerNote } : {}),
  };
}

export function draftToTemplateExercise(
  draft: SelectedExerciseDraft,
  order: number
): PersonalWorkoutTemplateExercise {
  const exerciseId = String(draft.id || '').trim();
  const gifUrl = templateExerciseGifUrl(exerciseId);
  const trainerNote = sanitizeTrainerNote(draft.trainerNote);
  return {
    id: draft.draftId || createTemplateExerciseId(),
    source: 'exercisedb',
    exerciseId,
    name: draft.name,
    bodyPart: draft.bodyPart,
    target: draft.target,
    equipment: draft.equipment,
    ...(gifUrl ? { gifUrl } : {}),
    prescription: serializeTrainingPrescription(draft.prescription),
    ...(trainerNote ? { trainerNote } : {}),
    order,
  };
}

export function duplicateTemplateExercise(
  exercise: PersonalWorkoutTemplateExercise
): PersonalWorkoutTemplateExercise {
  const prescription = clonePrescriptionWithNewIds(
    normalizeTrainingExercisePrescription(exercise.prescription)
  );
  const trainerNote = sanitizeTrainerNote(exercise.trainerNote);
  return {
    ...exercise,
    id: createTemplateExerciseId(),
    prescription,
    ...(trainerNote ? { trainerNote } : { trainerNote: undefined }),
  };
}

export function insertDuplicatedTemplateExercise(
  exercises: PersonalWorkoutTemplateExercise[],
  templateExerciseId: string
): PersonalWorkoutTemplateExercise[] {
  const index = exercises.findIndex((item) => item.id === templateExerciseId);
  if (index < 0) return exercises;
  const copy = duplicateTemplateExercise(exercises[index]);
  return [...exercises.slice(0, index + 1), copy, ...exercises.slice(index + 1)].map(
    (item, order) => ({ ...item, order })
  );
}

export function reorderTemplateExercises(
  exercises: PersonalWorkoutTemplateExercise[],
  fromIndex: number,
  toIndex: number
): PersonalWorkoutTemplateExercise[] {
  return reorderSelectedExercises(exercises, fromIndex, toIndex).map((item, order) => ({
    ...item,
    order,
  }));
}

export function suggestedTemplateCopyName(nome: string): string {
  const base = nome.trim() || 'Plano';
  if (/\(cópia\)$/i.test(base)) return base;
  return `${base} (cópia)`;
}

export function clonePersonalWorkoutTemplate(
  template: PersonalWorkoutTemplate,
  nome = suggestedTemplateCopyName(template.nome)
): Omit<PersonalWorkoutTemplate, 'id' | 'criadoEm' | 'atualizadoEm'> {
  return {
    nome,
    ...(template.descricao?.trim() ? { descricao: template.descricao.trim() } : {}),
    ...(template.cor?.trim() ? { cor: template.cor.trim() } : {}),
    exercicios: template.exercicios.map((exercise, order) => ({
      ...duplicateTemplateExercise(exercise),
      order,
    })),
  };
}

export function validatePersonalWorkoutTemplate(input: {
  nome?: string;
  exercicios?: PersonalWorkoutTemplateExercise[];
}): { ok: true } | { ok: false; message: string } {
  if (!input.nome || !input.nome.trim()) {
    return { ok: false, message: 'Informe o nome do plano.' };
  }
  const exercicios = input.exercicios || [];
  if (exercicios.length < 1) {
    return { ok: false, message: 'Adicione pelo menos um exercício.' };
  }
  for (const exercise of exercicios) {
    const check = validateTrainingPrescription(exercise.prescription);
    if (!check.ok) return check;
  }
  return { ok: true };
}

export type ImportWorkoutMode = 'replace' | 'append';

export function stripLoadsFromSeries(series: TrainingExerciseSeries[]): TrainingExerciseSeries[] {
  return series.map((item) => ({ ...item, loadKg: null }));
}

export function cloneTemplateExerciseToWorkoutDraft(
  exercise: PersonalWorkoutTemplateExercise
): SelectedExerciseDraft {
  const prescription = clonePrescriptionWithNewIds(
    normalizeTrainingExercisePrescription(exercise.prescription)
  );
  const exerciseId = String(exercise.exerciseId || '').trim();
  const trainerNote = sanitizeTrainerNote(exercise.trainerNote);
  return {
    draftId: createExerciseDraftId(),
    id: exerciseId,
    name: exercise.name,
    bodyPart: exercise.bodyPart,
    target: exercise.target,
    equipment: exercise.equipment,
    secondaryMuscles: [],
    instructions: [],
    gifUrl: templateExerciseGifUrl(exerciseId) || exercise.gifUrl,
    prescription,
    ...(trainerNote ? { trainerNote } : {}),
  };
}

export function importWorkoutTemplateToDraft(
  template: PersonalWorkoutTemplate
): { ok: true; drafts: SelectedExerciseDraft[] } | { ok: false; message: string } {
  const exercicios = [...(template.exercicios || [])].sort((a, b) => a.order - b.order);
  if (exercicios.length < 1) {
    return { ok: false, message: 'Não foi possível importar este modelo.' };
  }
  for (const exercise of exercicios) {
    if (!String(exercise.exerciseId || '').trim() || !exercise.name) {
      return { ok: false, message: 'Não foi possível importar este modelo.' };
    }
    const check = validateTrainingPrescription(exercise.prescription);
    if (!check.ok) {
      return { ok: false, message: 'Não foi possível importar este modelo.' };
    }
  }
  return {
    ok: true,
    drafts: exercicios.map((exercise) => cloneTemplateExerciseToWorkoutDraft(exercise)),
  };
}

export function mergeClonedDraftsIntoWorkout(
  current: SelectedExerciseDraft[],
  cloned: SelectedExerciseDraft[],
  mode: ImportWorkoutMode
): SelectedExerciseDraft[] {
  if (mode === 'replace') return cloned;
  return [...current, ...cloned];
}

export function workoutDraftToTemplateExercises(
  drafts: SelectedExerciseDraft[],
  options?: { preserveLoads?: boolean }
): PersonalWorkoutTemplateExercise[] {
  const preserveLoads = options?.preserveLoads === true;
  return (drafts || []).map((draft, order) => {
    const exerciseId = String(draft.id || '').trim();
    const gifUrl = templateExerciseGifUrl(exerciseId);
    const cloned = clonePrescriptionWithNewIds(
      normalizeTrainingExercisePrescription(draft.prescription)
    );
    const series = cloned.series.map((item) => ({
      ...item,
      loadKg: preserveLoads ? item.loadKg : null,
    }));
    const intercalations = (cloned.intercalations || []).map((item) => ({
      ...item,
      series: {
        ...item.series,
        loadKg: preserveLoads ? item.series.loadKg : null,
      },
    }));
    const trainerNote = sanitizeTrainerNote(draft.trainerNote);
    return {
      id: createTemplateExerciseId(),
      source: 'exercisedb' as const,
      exerciseId,
      name: draft.name,
      bodyPart: draft.bodyPart,
      target: draft.target,
      equipment: draft.equipment,
      ...(gifUrl ? { gifUrl } : {}),
      prescription: {
        series,
        ...(intercalations.length > 0 ? { intercalations } : {}),
      },
      ...(trainerNote ? { trainerNote } : {}),
      order,
    };
  });
}

export function suggestedSessionTitleFromTemplate(
  currentTitle: string | undefined,
  templateNome: string
): string {
  if (currentTitle && currentTitle.trim()) return currentTitle;
  return templateNome.trim();
}
