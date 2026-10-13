/**
 * Tipos do motor determinístico de treino (Etapa 10).
 * WorkoutPlanDraft NÃO é treino publicado.
 */

import type { TrainingMovementPattern } from '@/types/trainingPersonalizationIndex';

export type TrainingWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type TrainingEnvironmentCode =
  | 'gym'
  | 'home'
  | 'condo_gym'
  | 'outdoors'
  | 'other';

export type NormalizedEquipmentCode = string;

export type MetadataConfidenceLevel = 'mapped' | 'inferred' | 'unknown';

export type NormalizedExercise = {
  id: string;
  source: 'exercise_db' | 'internal';
  sourceId: string;

  name: string;
  normalizedName: string;

  bodyPart: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];

  equipment: NormalizedEquipmentCode[];
  environments: TrainingEnvironmentCode[];

  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'unknown';

  movementPatterns: TrainingMovementPattern[];

  exerciseType: 'strength' | 'cardio' | 'mobility' | 'warmup' | 'other';

  impactLevel: 'low' | 'moderate' | 'high' | 'unknown';
  requiresFloor: boolean | null;
  noiseLevel: 'low' | 'moderate' | 'high' | 'unknown';

  isUnilateral: boolean | null;
  isCompound: boolean | null;

  contraindicationTags: string[];
  limitationTags: string[];

  instructions: string[];
  imageUrl: string | null;
  videoUrl: string | null;

  metadataConfidence: {
    equipment: MetadataConfidenceLevel;
    movementPattern: MetadataConfidenceLevel;
    environment: MetadataConfidenceLevel;
    impact: MetadataConfidenceLevel;
  };
};

export type ExerciseExclusionReasonCode =
  | 'generation_not_allowed'
  | 'excluded_movement_pattern'
  | 'restricted_movement_conflict'
  | 'equipment_unavailable'
  | 'environment_incompatible'
  | 'floor_exercise_not_allowed'
  | 'high_impact_not_allowed'
  | 'noise_not_allowed'
  | 'difficulty_incompatible'
  | 'body_region_conflict'
  | 'professional_restriction'
  | 'catalog_metadata_invalid';

export type ExerciseCompatibilityWarningCode =
  | 'metadata_unknown'
  | 'secondary_pain_region'
  | 'restricted_pattern_secondary'
  | 'environment_inferred'
  | 'equipment_inferred'
  | 'difficulty_unknown';

export type ExerciseCompatibilityResult = {
  exerciseId: string;
  eligible: boolean;
  hardExclusionReasons: ExerciseExclusionReasonCode[];
  warnings: ExerciseCompatibilityWarningCode[];
  scoreAdjustments: { code: string; points: number }[];
};

export type ExerciseScoreReasonCode =
  | 'goal_compatible'
  | 'primary_body_priority'
  | 'secondary_body_priority'
  | 'preferred_modality'
  | 'equipment_available'
  | 'difficulty_compatible'
  | 'environment_known_compatible'
  | 'compound_bonus'
  | 'unilateral_bonus'
  | 'unknown_metadata_penalty'
  | 'restricted_pattern_penalty'
  | 'secondary_pain_penalty'
  | 'execution_barrier_penalty'
  | 'slot_pattern_match'
  | 'slot_muscle_match';

export type ExerciseScoreResult = {
  exerciseId: string;
  totalScore: number;
  scoreReasons: { code: ExerciseScoreReasonCode; points: number }[];
};

export type WorkoutExerciseSlotRole =
  | 'primary_compound'
  | 'secondary_compound'
  | 'accessory'
  | 'unilateral'
  | 'core'
  | 'mobility'
  | 'cardio'
  | 'warmup';

export type WorkoutExerciseSlot = {
  slotId: string;
  role: WorkoutExerciseSlotRole;
  targetMovementPatterns: TrainingMovementPattern[];
  targetMuscles: string[];
  required: boolean;
};

export type WorkoutDayTemplate = {
  dayIndex: number;
  weekday: TrainingWeekday | null;
  focus: string;
  targetMovementPatterns: TrainingMovementPattern[];
  targetMuscles: string[];
  exerciseSlots: WorkoutExerciseSlot[];
};

export type SelectedWorkoutExercise = {
  exerciseId: string;
  exerciseName: string;
  sourceId: string;
  slotId: string;
  role: string;
  primaryMuscles: string[];
  movementPatterns: string[];
  equipment: string[];
  sets: number;
  repetitionRange: { min: number; max: number };
  restSeconds: number;
  targetRpe: { min: number; max: number };
  score: number;
  selectionReasons: string[];
  compatibilityWarnings: string[];
};

export type WorkoutCardioBlock = {
  activityCode: string;
  durationMinutes: number;
  intensity: { rpeMin: number; rpeMax: number };
};

export type WorkoutWarmupBlock = {
  durationMinutes: number;
  notesCode: 'general_dynamic_warmup';
};

export type WorkoutPlanDraftSession = {
  dayIndex: number;
  weekday: TrainingWeekday | null;
  title: string;
  focus: string;
  warmup: WorkoutWarmupBlock | null;
  exercises: SelectedWorkoutExercise[];
  cardio: WorkoutCardioBlock | null;
  missingRequiredSlots: string[];
};

export type WorkoutPlanDraftStatus =
  | 'generated'
  | 'blocked'
  | 'unsupported_profile'
  | 'unsupported_split'
  | 'insufficient_catalog';

export type WorkoutPlanDraft = {
  version: 1;
  status: WorkoutPlanDraftStatus;
  source: {
    patientId: string;
    assessmentId: string;
    personalizationIndexVersion: number;
    engineVersion: string;
    generatedAt: Date | string | null;
  };
  eligibility: {
    generationAllowed: boolean;
    blockers: string[];
    warnings: string[];
  };
  structure: {
    weeklyFrequency: number;
    splitStrategy: string;
    sessionDurationMinutes: number;
  };
  sessions: WorkoutPlanDraftSession[];
  catalogDiagnostics: {
    totalExercises: number;
    normalizedExercises: number;
    eligibleExercises: number;
    excludedExercises: number;
    missingSlots: string[];
  };
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
};

export const TRAINING_ENGINE_VERSION = 'training_engine_v1';
