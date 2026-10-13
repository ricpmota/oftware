/**
 * Constantes versionadas de pontuação do motor.
 */

import type { ExerciseScoreReasonCode } from '@/types/workoutPlanDraft';

export const TRAINING_ENGINE_SCORING_V1: Record<ExerciseScoreReasonCode, number> = {
  goal_compatible: 30,
  primary_body_priority: 25,
  secondary_body_priority: 12,
  preferred_modality: 15,
  equipment_available: 10,
  difficulty_compatible: 10,
  environment_known_compatible: 5,
  compound_bonus: 4,
  unilateral_bonus: 2,
  unknown_metadata_penalty: -5,
  restricted_pattern_penalty: -30,
  secondary_pain_penalty: -20,
  execution_barrier_penalty: -10,
  slot_pattern_match: 20,
  slot_muscle_match: 18,
};

export const DIVERSITY_LIMITS_V1 = {
  maxPerMovementPattern: 2,
  maxPerPrimaryMuscle: 2,
  maxExercisesFromSameEquipment: 3,
};

export const UNSUPPORTED_MODALITIES = new Set(['pilates']);
