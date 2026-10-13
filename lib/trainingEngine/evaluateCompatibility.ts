/**
 * Compatibilidade exercício × TrainingPersonalizationIndex.
 */

import { targetsForPainRegions } from '@/lib/trainingEngine/bodyRegionMap';
import { isExerciseEquipmentCompatible } from '@/lib/trainingEngine/equipmentMap';
import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';
import type {
  ExerciseCompatibilityResult,
  ExerciseExclusionReasonCode,
  ExerciseCompatibilityWarningCode,
  NormalizedExercise,
} from '@/types/workoutPlanDraft';

function intersects(a: string[], b: string[]): boolean {
  return a.some((x) => b.includes(x));
}

export function evaluateExerciseCompatibility(
  exercise: NormalizedExercise,
  index: TrainingPersonalizationIndex
): ExerciseCompatibilityResult {
  const hardExclusionReasons: ExerciseExclusionReasonCode[] = [];
  const warnings: ExerciseCompatibilityWarningCode[] = [];
  const scoreAdjustments: { code: string; points: number }[] = [];

  if (!index.eligibility.generationAllowed) {
    hardExclusionReasons.push('generation_not_allowed');
    return {
      exerciseId: exercise.id,
      eligible: false,
      hardExclusionReasons,
      warnings,
      scoreAdjustments,
    };
  }

  if (!exercise.id || !exercise.name) {
    hardExclusionReasons.push('catalog_metadata_invalid');
  }

  const excluded = index.constraints.excludedMovementPatterns || [];
  if (intersects(exercise.movementPatterns, excluded)) {
    hardExclusionReasons.push('excluded_movement_pattern');
  }

  const restricted = index.constraints.restrictedMovementPatterns || [];
  const primaryPattern = exercise.movementPatterns[0];
  if (primaryPattern && restricted.includes(primaryPattern)) {
    hardExclusionReasons.push('restricted_movement_conflict');
  } else if (intersects(exercise.movementPatterns.slice(1), restricted)) {
    warnings.push('restricted_pattern_secondary');
    scoreAdjustments.push({ code: 'restricted_pattern_secondary', points: -30 });
  }

  if (!isExerciseEquipmentCompatible(exercise, index)) {
    hardExclusionReasons.push('equipment_unavailable');
  }

  if (
    index.constraints.requiresNoFloorExercises &&
    exercise.requiresFloor === true
  ) {
    hardExclusionReasons.push('floor_exercise_not_allowed');
  }

  if (index.constraints.requiresLowImpact && exercise.impactLevel === 'high') {
    hardExclusionReasons.push('high_impact_not_allowed');
  }

  if (index.constraints.requiresLowNoise && exercise.noiseLevel === 'high') {
    hardExclusionReasons.push('noise_not_allowed');
  }

  const allowedEnvs = index.environment.allowedEnvironments || [];
  if (
    allowedEnvs.length > 0 &&
    exercise.environments.length > 0 &&
    !intersects(exercise.environments, allowedEnvs)
  ) {
    hardExclusionReasons.push('environment_incompatible');
  } else if (exercise.environments.length === 0) {
    warnings.push('environment_inferred');
  }

  const exp = index.experience.category;
  if (
    (exp === 'beginner' || exp === 'returning') &&
    exercise.difficulty === 'advanced'
  ) {
    hardExclusionReasons.push('difficulty_incompatible');
  }
  if (exercise.difficulty === 'unknown') {
    warnings.push('difficulty_unknown');
  }

  const painTargets = targetsForPainRegions(index.constraints.restrictedBodyRegions || []);
  const primaryHit = exercise.primaryMuscles.some((m) => painTargets.includes(m));
  const secondaryHit = exercise.secondaryMuscles.some((m) => painTargets.includes(m));
  if (primaryHit && painTargets.length > 0) {
    // Conservador: conflito primário com região de dor → exclusão operacional
    hardExclusionReasons.push('body_region_conflict');
  } else if (secondaryHit) {
    warnings.push('secondary_pain_region');
    scoreAdjustments.push({ code: 'secondary_pain_region', points: -20 });
  }

  if (
    index.eligibility.requiresProfessionalReview ||
    index.constraints.professionalRestrictionDetails
  ) {
    // generationAllowed já cobre o caso principal; reforço se review sem blocker tipado
    if (!index.eligibility.generationAllowed) {
      hardExclusionReasons.push('professional_restriction');
    }
  }

  const unknownMeta =
    exercise.metadataConfidence.impact === 'unknown' ||
    exercise.metadataConfidence.movementPattern === 'unknown' ||
    exercise.metadataConfidence.equipment === 'unknown';
  if (unknownMeta) {
    warnings.push('metadata_unknown');
    scoreAdjustments.push({ code: 'metadata_unknown', points: -5 });
  }

  return {
    exerciseId: exercise.id,
    eligible: hardExclusionReasons.length === 0,
    hardExclusionReasons: [...new Set(hardExclusionReasons)],
    warnings: [...new Set(warnings)],
    scoreAdjustments,
  };
}
