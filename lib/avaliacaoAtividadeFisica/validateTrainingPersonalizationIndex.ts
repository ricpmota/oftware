/**
 * Validação estrutural do Training Personalization Index.
 */

import type {
  TrainingPersonalizationIndex,
} from '@/types/trainingPersonalizationIndex';

export type TrainingPersonalizationIndexValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

function rangeOk(min: number | null, max: number | null, label: string, errors: string[]) {
  if (min != null && max != null && min > max) {
    errors.push(`${label}: min (${min}) > max (${max})`);
  }
}

export function validateTrainingPersonalizationIndex(
  index: TrainingPersonalizationIndex
): TrainingPersonalizationIndexValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (index.version !== 1) {
    errors.push(`version inválida: ${String(index.version)}`);
  }

  const freq = index.routine.weeklyFrequency;
  if (freq != null && (freq < 1 || freq > 7)) {
    errors.push(`weeklyFrequency fora de 1–7: ${freq}`);
  }

  const dur = index.routine.sessionDurationMinutes;
  if (dur != null && dur <= 0) {
    errors.push(`sessionDurationMinutes deve ser positivo: ${dur}`);
  }

  const gp = index.generationParameters;
  rangeOk(gp.minExercisesPerSession, gp.maxExercisesPerSession, 'exercisesPerSession', errors);
  rangeOk(gp.defaultSetsMin, gp.defaultSetsMax, 'sets', errors);
  rangeOk(gp.defaultRepRangeMin, gp.defaultRepRangeMax, 'reps', errors);
  rangeOk(gp.defaultRestSecondsMin, gp.defaultRestSecondsMax, 'rest', errors);
  rangeOk(gp.targetRpeMin, gp.targetRpeMax, 'rpe', errors);
  rangeOk(gp.cardioDurationMinutesMin, gp.cardioDurationMinutesMax, 'cardio', errors);

  if (gp.targetRpeMin != null && (gp.targetRpeMin < 1 || gp.targetRpeMin > 10)) {
    errors.push(`targetRpeMin fora de 1–10: ${gp.targetRpeMin}`);
  }
  if (gp.targetRpeMax != null && (gp.targetRpeMax < 1 || gp.targetRpeMax > 10)) {
    errors.push(`targetRpeMax fora de 1–10: ${gp.targetRpeMax}`);
  }

  const { generationAllowed, blockers, requiresProfessionalReview } = index.eligibility;
  if (generationAllowed && blockers.length > 0) {
    errors.push('generationAllowed=true com blockers presentes');
  }
  if (!generationAllowed && blockers.length === 0) {
    errors.push('generationAllowed=false sem blockers');
  }
  if (
    requiresProfessionalReview &&
    !blockers.includes('professional_review_required') &&
    !blockers.includes('professional_restriction_present')
  ) {
    warnings.push(
      'requiresProfessionalReview=true sem blocker professional_review_required/restriction'
    );
  }

  if (!Array.isArray(index.goals.secondaryGoals)) {
    errors.push('goals.secondaryGoals deve ser array');
  }
  if (!Array.isArray(index.environment.availableEquipment)) {
    errors.push('environment.availableEquipment deve ser array');
  }
  if (!Array.isArray(index.constraints.restrictedMovementPatterns)) {
    errors.push('constraints.restrictedMovementPatterns deve ser array');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
