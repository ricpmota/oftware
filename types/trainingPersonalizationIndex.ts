/**
 * Training Personalization Index — camada operacional entre avaliação e motor de treino.
 * Não é um treino; não seleciona exercícios.
 */

import type { AvaliacaoAtividadeFisicaStatus } from '@/types/avaliacaoAtividadeFisica';

export type TrainingGenerationBlockerCode =
  | 'assessment_not_completed'
  | 'professional_review_required'
  | 'weekly_frequency_missing'
  | 'session_duration_missing'
  | 'training_location_missing'
  | 'professional_restriction_present'
  | 'insufficient_assessment_data';

export type TrainingGenerationWarningCode =
  | 'summary_rebuilt_from_answers'
  | 'equipment_availability_unknown'
  | 'variable_schedule'
  | 'variable_session_duration'
  | 'returning_after_inactivity'
  | 'exercise_preferences_not_in_catalog'
  | 'environment_has_limitations'
  | 'low_training_experience'
  | 'cardio_preference_unknown'
  | 'seven_day_frequency'
  | 'very_intense_preference_capped';

export type TrainingExperienceCategory =
  | 'beginner'
  | 'returning'
  | 'intermediate'
  | 'advanced'
  | 'unknown';

export type TrainingIntensityCategory =
  | 'very_light'
  | 'light'
  | 'moderate'
  | 'intense'
  | 'unknown';

/**
 * Padrões alinhados ao motor (Etapa 10).
 * Contratos de restrição da avaliação usam o subconjunto clássico;
 * o normalizador pode emitir padrões adicionais do catálogo.
 */
export type TrainingMovementPattern =
  | 'squat'
  | 'kneeling'
  | 'floor_transition'
  | 'overhead_reach'
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'hip_hinge'
  | 'locomotion'
  | 'core_stability'
  | 'rotation'
  | 'anti_rotation'
  | 'carry'
  | 'calf_raise'
  | 'elbow_flexion'
  | 'elbow_extension'
  | 'knee_extension'
  | 'knee_flexion'
  | 'hip_abduction'
  | 'hip_adduction'
  | 'running'
  | 'jumping'
  | 'stair_climbing'
  | 'prolonged_standing'
  | 'other';

export type TrainingPersonalizationIndex = {
  version: 1;

  source: {
    assessmentId: string;
    assessmentVersion: number;
    summaryVersion: number | null;
    assessmentStatus: AvaliacaoAtividadeFisicaStatus | string;
    assessmentCompletedAt: Date | string | null;
    /**
     * Builder puro deixa null (sem Date.now).
     * O service pode preencher com timestamp do servidor ao persistir.
     */
    generatedAt: Date | string | null;
  };

  eligibility: {
    generationAllowed: boolean;
    requiresProfessionalReview: boolean;
    blockers: TrainingGenerationBlockerCode[];
    warnings: TrainingGenerationWarningCode[];
  };

  goals: {
    primaryGoal: string | null;
    secondaryGoals: string[];
    priorityStrategy: string | null;
  };

  experience: {
    level: string | null;
    category: TrainingExperienceCategory;
    currentlyActive: boolean | null;
    currentFrequencyPerWeek: number | null;
  };

  routine: {
    weeklyFrequency: number | null;
    preferredWeekdays: string[];
    variableSchedule: boolean;
    sessionDurationMinutes: number | null;
    durationConsistency: string | null;
    preferredTrainingPeriod: string | null;
    approximateTrainingTime: string | null;
  };

  trainingPreferences: {
    bodyPriorities: string[];
    preferredModalities: string[];
    preferredIntensity: string | null;
    targetIntensityCategory: TrainingIntensityCategory;
    cardioPreference: string | null;
    preferredCardioActivities: string[];
    favoriteExercisesText: string | null;
    avoidedExercisesText: string | null;
    trainingBarriers: string[];
  };

  environment: {
    trainingLocation: string | null;
    allowedEnvironments: string[];
    gymStructureLevel: string | null;
    gymAvailableAreas: string[];
    homeTrainingSpace: string | null;
    availableEquipment: string[];
    equipmentAvailabilityKnown: boolean;
    equipmentAccessFrequency: string | null;
    outdoorEnvironment: string[];
    floorExerciseAvailability: string | null;
    impactNoiseRestriction: string | null;
  };

  constraints: {
    restrictedBodyRegions: string[];
    restrictedMovementPatterns: TrainingMovementPattern[];
    excludedMovementPatterns: TrainingMovementPattern[];
    avoidedExerciseTerms: string[];
    requiresLowImpact: boolean;
    requiresNoFloorExercises: boolean;
    requiresLowNoise: boolean;
    requiresEnvironmentalLowImpact: boolean;
    requiresClinicalLowImpact: boolean;
    requiresBalanceCaution: boolean;
    requiresCardiorespiratoryCaution: boolean;
    professionalRestrictionDetails: string | null;
  };

  generationParameters: {
    recommendedSplitStrategy: string | null;
    minExercisesPerSession: number | null;
    maxExercisesPerSession: number | null;
    defaultSetsMin: number | null;
    defaultSetsMax: number | null;
    defaultRepRangeMin: number | null;
    defaultRepRangeMax: number | null;
    defaultRestSecondsMin: number | null;
    defaultRestSecondsMax: number | null;
    targetRpeMin: number | null;
    targetRpeMax: number | null;
    cardioDurationMinutesMin: number | null;
    cardioDurationMinutesMax: number | null;
  };
};

// NormalizedExercise vive em `@/types/workoutPlanDraft` (Etapa 10).
