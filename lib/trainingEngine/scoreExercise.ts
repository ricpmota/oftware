/**
 * Pontuação determinística de exercícios elegíveis.
 */

import { targetsForBodyPriorities } from '@/lib/trainingEngine/bodyRegionMap';
import { isBodyweightEquipment } from '@/lib/trainingEngine/equipmentMap';
import { TRAINING_ENGINE_SCORING_V1 } from '@/lib/trainingEngine/scoringConstants';
import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';
import type {
  ExerciseCompatibilityResult,
  ExerciseScoreReasonCode,
  ExerciseScoreResult,
  NormalizedExercise,
  WorkoutExerciseSlot,
} from '@/types/workoutPlanDraft';

function pushReason(
  reasons: ExerciseScoreResult['scoreReasons'],
  code: ExerciseScoreReasonCode,
  points: number
) {
  if (points === 0) return;
  reasons.push({ code, points });
}

export function scoreExercise(params: {
  exercise: NormalizedExercise;
  index: TrainingPersonalizationIndex;
  compatibility: ExerciseCompatibilityResult;
  slot?: WorkoutExerciseSlot;
}): ExerciseScoreResult {
  const { exercise, index, compatibility, slot } = params;
  const reasons: ExerciseScoreResult['scoreReasons'] = [];
  const S = TRAINING_ENGINE_SCORING_V1;

  const strategy = index.goals.priorityStrategy;
  const type = exercise.exerciseType;

  if (
    strategy === 'hypertrophy_bias' ||
    strategy === 'composition_bias' ||
    strategy === 'fat_loss_bias' ||
    strategy === 'general_health_bias' ||
    strategy === 'balanced'
  ) {
    if (type === 'strength' || type === 'cardio') {
      pushReason(reasons, 'goal_compatible', S.goal_compatible);
    }
  }
  if (strategy === 'conditioning_bias' && (type === 'cardio' || exercise.isCompound)) {
    pushReason(reasons, 'goal_compatible', S.goal_compatible);
  }
  if (strategy === 'mobility_bias' && type === 'mobility') {
    pushReason(reasons, 'goal_compatible', S.goal_compatible);
  }

  const priorities = index.trainingPreferences.bodyPriorities || [];
  const priorityTargets = targetsForBodyPriorities(priorities.filter((p) => p !== 'full_body'));
  if (priorities.includes('full_body') || priorityTargets.length === 0) {
    // full body: leve bônus se strength
    if (type === 'strength') pushReason(reasons, 'primary_body_priority', Math.floor(S.primary_body_priority / 2));
  } else {
    const primary = priorityTargets[0];
    const rest = priorityTargets.slice(1);
    if (exercise.primaryMuscles.includes(primary)) {
      pushReason(reasons, 'primary_body_priority', S.primary_body_priority);
    } else if (exercise.primaryMuscles.some((m) => rest.includes(m))) {
      pushReason(reasons, 'secondary_body_priority', S.secondary_body_priority);
    }
  }

  const modalities = index.trainingPreferences.preferredModalities || [];
  const eq = exercise.equipment.map((e) => e.toLowerCase());
  let modalityHit = false;
  if (modalities.includes('no_preference') || modalities.length === 0) {
    modalityHit = true;
  } else {
    if (modalities.includes('machines') && eq.some((e) => e.includes('machine') || e === 'cable')) {
      modalityHit = true;
    }
    if (
      modalities.includes('free_weights') &&
      eq.some((e) => e.includes('dumbbell') || e.includes('barbell') || e.includes('kettlebell'))
    ) {
      modalityHit = true;
    }
    if (modalities.includes('bodyweight') && isBodyweightEquipment(eq)) {
      modalityHit = true;
    }
    if (modalities.includes('functional') && (exercise.isCompound || type === 'strength')) {
      modalityHit = true;
    }
    if (
      (modalities.includes('walking') || modalities.includes('running') || modalities.includes('bike')) &&
      type === 'cardio'
    ) {
      modalityHit = true;
    }
  }
  if (modalityHit) pushReason(reasons, 'preferred_modality', S.preferred_modality);

  if (index.environment.equipmentAvailabilityKnown) {
    pushReason(reasons, 'equipment_available', S.equipment_available);
  }

  const exp = index.experience.category;
  if (
    exercise.difficulty === 'unknown' ||
    (exp === 'beginner' && exercise.difficulty === 'beginner') ||
    (exp === 'returning' && exercise.difficulty !== 'advanced') ||
    (exp === 'intermediate' && exercise.difficulty !== 'advanced') ||
    exp === 'advanced' ||
    exp === 'unknown'
  ) {
    if (exercise.difficulty !== 'unknown') {
      pushReason(reasons, 'difficulty_compatible', S.difficulty_compatible);
    }
  }

  if (
    exercise.environments.length > 0 &&
    exercise.metadataConfidence.environment !== 'unknown'
  ) {
    pushReason(reasons, 'environment_known_compatible', S.environment_known_compatible);
  }

  if (exercise.isCompound) pushReason(reasons, 'compound_bonus', S.compound_bonus);
  if (exercise.isUnilateral) pushReason(reasons, 'unilateral_bonus', S.unilateral_bonus);

  for (const adj of compatibility.scoreAdjustments) {
    if (adj.code === 'metadata_unknown') {
      pushReason(reasons, 'unknown_metadata_penalty', S.unknown_metadata_penalty);
    } else if (adj.code === 'restricted_pattern_secondary') {
      pushReason(reasons, 'restricted_pattern_penalty', S.restricted_pattern_penalty);
    } else if (adj.code === 'secondary_pain_region') {
      pushReason(reasons, 'secondary_pain_penalty', S.secondary_pain_penalty);
    }
  }

  const barriers = index.trainingPreferences.trainingBarriers || [];
  if (barriers.includes('unsure_form') || barriers.includes('fatigue')) {
    pushReason(reasons, 'execution_barrier_penalty', S.execution_barrier_penalty);
  }

  if (slot) {
    if (
      slot.targetMovementPatterns.length > 0 &&
      exercise.movementPatterns.some((p) => slot.targetMovementPatterns.includes(p))
    ) {
      pushReason(reasons, 'slot_pattern_match', S.slot_pattern_match);
    }
    if (
      slot.targetMuscles.length > 0 &&
      exercise.primaryMuscles.some((m) => slot.targetMuscles.includes(m))
    ) {
      pushReason(reasons, 'slot_muscle_match', S.slot_muscle_match);
    }
  }

  const totalScore = reasons.reduce((sum, r) => sum + r.points, 0);
  return { exerciseId: exercise.id, totalScore, scoreReasons: reasons };
}

/** Ordenação estável: score desc → confiança → nome → id. */
export function compareScoredExercises(
  a: { exercise: NormalizedExercise; score: ExerciseScoreResult },
  b: { exercise: NormalizedExercise; score: ExerciseScoreResult }
): number {
  if (b.score.totalScore !== a.score.totalScore) {
    return b.score.totalScore - a.score.totalScore;
  }
  const confScore = (e: NormalizedExercise) => {
    const vals = Object.values(e.metadataConfidence);
    return vals.filter((v) => v === 'mapped').length * 2 + vals.filter((v) => v === 'inferred').length;
  };
  const c = confScore(b.exercise) - confScore(a.exercise);
  if (c !== 0) return c;
  const n = a.exercise.normalizedName.localeCompare(b.exercise.normalizedName);
  if (n !== 0) return n;
  return a.exercise.id.localeCompare(b.exercise.id);
}
