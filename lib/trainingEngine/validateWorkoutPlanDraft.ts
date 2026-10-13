/**
 * Validação estrutural do WorkoutPlanDraft.
 */

import type { WorkoutPlanDraft } from '@/types/workoutPlanDraft';

export type WorkoutPlanDraftValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateWorkoutPlanDraft(
  draft: WorkoutPlanDraft
): WorkoutPlanDraftValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (draft.version !== 1) errors.push(`version inválida: ${draft.version}`);

  if (
    (draft.status === 'blocked' ||
      draft.status === 'unsupported_profile' ||
      draft.status === 'unsupported_split') &&
    draft.sessions.length > 0
  ) {
    errors.push(`${draft.status} não deve possuir sessões`);
  }

  if (draft.status === 'generated' && draft.sessions.length === 0) {
    errors.push('generated sem sessões');
  }

  if (draft.status === 'generated') {
    if (!draft.source.engineVersion) errors.push('engineVersion ausente');
    if (draft.structure.weeklyFrequency < 1) {
      errors.push('weeklyFrequency inválida');
    }
  }

  const allIds: string[] = [];
  for (const session of draft.sessions) {
    if (session.exercises.length === 0 && session.missingRequiredSlots.length === 0) {
      warnings.push(`sessão ${session.dayIndex} sem exercícios`);
    }
    for (const ex of session.exercises) {
      allIds.push(ex.exerciseId);
      if (ex.sets < 1) errors.push(`${ex.exerciseId}: sets inválidos`);
      if (ex.repetitionRange.min > ex.repetitionRange.max) {
        errors.push(`${ex.exerciseId}: reps min > max`);
      }
      if (ex.targetRpe.min < 1 || ex.targetRpe.max > 10) {
        errors.push(`${ex.exerciseId}: RPE fora de 1–10`);
      }
      if (ex.targetRpe.min > ex.targetRpe.max) {
        errors.push(`${ex.exerciseId}: RPE min > max`);
      }
      if (ex.restSeconds < 0) errors.push(`${ex.exerciseId}: rest inválido`);
    }
    if (session.cardio) {
      if (session.cardio.durationMinutes < 0) {
        errors.push(`cardio duração inválida sessão ${session.dayIndex}`);
      }
    }
  }

  const unique = new Set(allIds);
  if (unique.size !== allIds.length) {
    // Repetir entre dias é ok; dentro da mesma sessão já é filtrado.
    // Aviso apenas se o mesmo id aparece > 2 vezes no plano.
    const counts = new Map<string, number>();
    for (const id of allIds) counts.set(id, (counts.get(id) || 0) + 1);
    for (const [id, n] of counts) {
      if (n > 2) warnings.push(`exercício ${id} repetido ${n}x no plano`);
    }
  }

  if (
    draft.status === 'insufficient_catalog' &&
    draft.catalogDiagnostics.missingSlots.length === 0
  ) {
    warnings.push('insufficient_catalog sem missingSlots');
  }

  if (draft.status === 'generated' && !draft.eligibility.generationAllowed) {
    errors.push('generated com generationAllowed=false');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
