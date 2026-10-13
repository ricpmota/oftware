/**
 * Avaliação Inicial para Atividade Física — tipos (Etapas 03–09).
 * answers permanece flat (sem reorganizar em blocos).
 */

import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';

export type AvaliacaoAtividadeFisicaStatus = 'draft' | 'completed' | 'needs_review';

export type AvaliacaoAtividadeFisicaBasicAnswers = {
  // ——— Etapa 03 ———
  primaryGoal?: string | null;
  primaryGoalOther?: string | null;

  secondaryGoals?: string[];

  experienceLevel?: string | null;

  currentlyActive?: boolean | null;
  currentActivities?: string[];
  currentActivityOther?: string | null;
  currentFrequencyPerWeek?: number | null;

  availableDaysPerWeek?: number | null;
  preferredWeekdays?: string[];
  variableSchedule?: boolean;

  /** Minutos. "Mais de 90" → 100 (convenção Etapa 03). */
  sessionDurationMinutes?: number | null;
  durationConsistency?: string | null;

  preferredTrainingPeriod?: string | null;
  approximateTrainingTime?: string | null;

  trainingLocation?: string | null;
  trainingLocationOther?: string | null;

  // ——— Etapa 04 — Perfil do treino ———
  /** Regiões ordenadas por prioridade (1ª → 3ª). `full_body` é exclusivo. */
  bodyPriorities?: string[];

  preferredModalities?: string[];

  preferredIntensity?: string | null;

  cardioPreference?: string | null;
  preferredCardioActivities?: string[];
  preferredCardioOther?: string | null;

  favoriteExercisesText?: string | null;
  avoidedExercisesText?: string | null;

  trainingBarriers?: string[];
  trainingBarrierOther?: string | null;

  // ——— Etapa 05 — Ambiente e equipamentos ———
  gymStructureLevel?: string | null;
  /** Áreas da academia. `unknown` é exclusivo. */
  gymAvailableAreas?: string[];

  homeTrainingSpace?: string | null;

  availableEquipment?: string[];
  availableEquipmentOther?: string | null;

  equipmentAccessFrequency?: string | null;

  outdoorEnvironment?: string[];
  outdoorEnvironmentOther?: string | null;

  /** Preferência/ambiente — não é limitação clínica. */
  floorExerciseAvailability?: string | null;

  /** Limitação do ambiente (ruído/impacto), não médica. */
  environmentImpactNoiseRestriction?: string | null;

  environmentNotes?: string | null;

  // ——— Etapa 06 — Segurança clínica ———
  currentPainLevel?: string | null;
  painRegions?: string[];
  painRegionOther?: string | null;
  painTriggers?: string[];
  painTriggerOther?: string | null;
  painFunctionalImpact?: string | null;

  hasRelevantInjury?: string | null;
  injuryDetails?: string | null;
  injuryCurrentlyLimitsMovement?: string | null;

  hasRelevantSurgery?: string | null;
  surgeryDetails?: string | null;
  surgeryTiming?: string | null;

  movementLimitations?: string[];
  movementLimitationOther?: string | null;

  balanceFallHistory?: string | null;

  shortnessOfBreathOnLightEffort?: string | null;
  chestSymptomsDuringEffort?: string | null;
  dizzinessOrFaintingDuringEffort?: string | null;
  palpitationsDuringExercise?: string | null;

  uncontrolledBloodPressureAdvice?: string | null;

  hasProfessionalExerciseRestriction?: string | null;
  professionalExerciseRestrictionDetails?: string | null;

  /** Reservado; pergunta só se regra de sexo biológico for segura no futuro. */
  pregnancyStatusForExercise?: string | null;

  additionalSafetyNotes?: string | null;
  safetyAnswersConfirmed?: boolean | null;

  /** Confirmação final da Etapa 07. */
  finalConfirmationAccepted?: boolean | null;
};

export type AvaliacaoAtividadeFisicaSafety = {
  requiresProfessionalAttention: boolean;
  reasons: string[];
};

/** Resumo estruturado (códigos) — labels humanos só na UI. */
export type AvaliacaoAtividadeFisicaSummary = {
  version: 1;

  goalProfile: {
    primaryGoal: string | null;
    primaryGoalOther: string | null;
    secondaryGoals: string[];
    experienceLevel: string | null;
    currentlyActive: boolean | null;
    currentActivities: string[];
    currentActivityOther: string | null;
    currentFrequencyPerWeek: number | null;
  };

  routine: {
    availableDaysPerWeek: number | null;
    preferredWeekdays: string[];
    variableSchedule: boolean;
    sessionDurationMinutes: number | null;
    durationConsistency: string | null;
    preferredTrainingPeriod: string | null;
    preferredTrainingTime: string | null;
    trainingLocation: string | null;
    trainingLocationOther: string | null;
  };

  trainingProfile: {
    bodyPriorities: string[];
    preferredModalities: string[];
    preferredIntensity: string | null;
    cardioPreference: string | null;
    preferredCardioActivities: string[];
    preferredCardioOther: string | null;
    favoriteExercisesText: string | null;
    avoidedExercisesText: string | null;
    trainingBarriers: string[];
    trainingBarrierOther: string | null;
  };

  environment: {
    trainingLocation: string | null;
    gymStructureLevel: string | null;
    gymAvailableAreas: string[];
    homeTrainingSpace: string | null;
    availableEquipment: string[];
    availableEquipmentOther: string | null;
    equipmentAccessFrequency: string | null;
    outdoorEnvironment: string[];
    outdoorEnvironmentOther: string | null;
    floorExerciseAvailability: string | null;
    environmentImpactNoiseRestriction: string | null;
    environmentNotes: string | null;
  };

  clinicalSafety: {
    currentPainLevel: string | null;
    painRegions: string[];
    painRegionOther: string | null;
    painTriggers: string[];
    painTriggerOther: string | null;
    painFunctionalImpact: string | null;
    injuryStatus: string | null;
    injuryDetails: string | null;
    injuryCurrentlyLimitsMovement: string | null;
    surgeryStatus: string | null;
    surgeryDetails: string | null;
    surgeryTiming: string | null;
    movementLimitations: string[];
    movementLimitationOther: string | null;
    balanceFallHistory: string | null;
    shortnessOfBreathOnLightEffort: string | null;
    chestSymptomsDuringEffort: string | null;
    dizzinessOrFaintingDuringEffort: string | null;
    palpitationsDuringExercise: string | null;
    uncontrolledBloodPressureAdvice: string | null;
    professionalExerciseRestriction: string | null;
    professionalExerciseRestrictionDetails: string | null;
    additionalSafetyNotes: string | null;
  };

  safetyAssessment: {
    requiresProfessionalAttention: boolean;
    reasons: string[];
  };
};

export type AvaliacaoAtividadeFisica = {
  id: string;
  patientId: string;
  userId?: string | null;
  organizationId?: string | null;

  status: AvaliacaoAtividadeFisicaStatus;
  version: number;

  /** Ex.: primary_goal | … | safety_complete | final_review | completed */
  currentStep?: string | null;
  progressPercent?: number;

  answers: AvaliacaoAtividadeFisicaBasicAnswers;

  safety: AvaliacaoAtividadeFisicaSafety;

  summary?: AvaliacaoAtividadeFisicaSummary | Record<string, unknown> | null;

  /** Índice operacional para futura geração (Etapa 09). */
  trainingPersonalizationIndex?: TrainingPersonalizationIndex | null;

  /**
   * Plano do paciente gravado no calendário Personal (Criar/Cronograma/Hoje).
   * Quando preenchido (savedAt ou clearedAt), o gate libera o app sem nova revisão obrigatória.
   */
  patientPlanCalendar?: {
    savedAt: Date | string;
    draftId: string | null;
    sessionCount: number;
    /** Um grupo por tipo de treino gravado (Superior ≠ Inferior). */
    recurrenceGroupIds?: string[];
    sessionIds?: string[];
    /**
     * Paciente removeu as séries geradas (ou marco legado foi zerado).
     * Mantém o gate no Personal — não força recriar o treino padrão.
     */
    clearedAt?: Date | string | null;
  } | null;

  /**
   * Paciente escolheu seguir no Personal sem gravar o plano gerado.
   * Libera o gate de forma permanente (até nova conclusão de avaliação, se houver).
   */
  patientPlanDismissedAt?: Date | string | null;

  startedAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string | null;

  createdBy: 'patient';
  lastUpdatedBy: 'patient';
};

export const COL_AVALIACAO_ATIVIDADE_FISICA = 'avaliacaoAtividadeFisica';

/** Marco entre Etapa 03 e 04. */
export const AVALIACAO_BASIC_COMPLETE_STEP = 'basic_complete';

/** Marco entre Etapa 04 e 05. */
export const AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP = 'training_profile_complete';

/** Marco entre Etapa 05 e 06. */
export const AVALIACAO_ENVIRONMENT_COMPLETE_STEP = 'environment_complete';

/** Marco entre Etapa 06 e 07. */
export const AVALIACAO_SAFETY_COMPLETE_STEP = 'safety_complete';

/** Conclusão definitiva (Etapa 07). */
export const AVALIACAO_COMPLETED_STEP = 'completed';

/** Códigos estruturados de atenção (não são diagnóstico). */
export const AVALIACAO_SAFETY_REASON_CODES = [
  'severe_current_pain',
  'pain_prevents_activities',
  'active_injury',
  'injury_limits_movement',
  'recent_surgery',
  'movement_limitation',
  'frequent_balance_problem',
  'recent_fall',
  'shortness_of_breath_light_effort',
  'shortness_of_breath_at_rest',
  'chest_symptoms',
  'dizziness_or_fainting',
  'frequent_palpitations',
  'uncontrolled_blood_pressure_advice',
  'professional_exercise_restriction',
  'pregnancy_or_possible_pregnancy',
  'other_relevant_condition',
] as const;

export type AvaliacaoSafetyReasonCode = (typeof AVALIACAO_SAFETY_REASON_CODES)[number];
