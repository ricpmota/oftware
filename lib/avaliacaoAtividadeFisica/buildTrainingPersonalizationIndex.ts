/**
 * Builder puro do Training Personalization Index.
 * Determinístico, sem Firestore/IA/efeitos colaterais.
 */

import { buildPhysicalActivityAssessmentSummary } from '@/lib/avaliacaoAtividadeFisica/buildAssessmentSummary';
import { normalizeTrainingWeekdays } from '@/lib/trainingEngine/normalizeWeekday';
import type {
  AvaliacaoAtividadeFisica,
  AvaliacaoAtividadeFisicaSummary,
} from '@/types/avaliacaoAtividadeFisica';
import type {
  TrainingExperienceCategory,
  TrainingGenerationBlockerCode,
  TrainingGenerationWarningCode,
  TrainingIntensityCategory,
  TrainingMovementPattern,
  TrainingPersonalizationIndex,
} from '@/types/trainingPersonalizationIndex';

function arr<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? [...v] : [];
}

function str(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}

function pushUnique<T extends string>(list: T[], code: T) {
  if (!list.includes(code)) list.push(code);
}

export function mapExperienceCategory(level: string | null | undefined): TrainingExperienceCategory {
  switch (level) {
    case 'never_trained':
    case 'less_than_6_months':
      return 'beginner';
    case 'returning':
      return 'returning';
    case 'between_6_months_and_2_years':
    case 'more_than_2_years':
      return 'intermediate';
    case 'advanced':
      return 'advanced';
    default:
      return 'unknown';
  }
}

export function mapIntensityCategory(
  preferred: string | null | undefined
): TrainingIntensityCategory {
  switch (preferred) {
    case 'very_light':
      return 'very_light';
    case 'light':
      return 'light';
    case 'moderate':
      return 'moderate';
    case 'intense':
    case 'very_intense':
      // very_intense is capped via RPE/experience; category stays intense
      return 'intense';
    case 'unsure':
    default:
      return 'unknown';
  }
}

export function deriveExerciseCountRange(
  sessionDurationMinutes: number | null,
  experience: TrainingExperienceCategory,
  reduceVolume: boolean
): { min: number | null; max: number | null } {
  if (sessionDurationMinutes == null || sessionDurationMinutes <= 0) {
    return { min: null, max: null };
  }
  let min = 3;
  let max = 4;
  if (sessionDurationMinutes <= 20) {
    min = 3;
    max = 4;
  } else if (sessionDurationMinutes <= 30) {
    min = 4;
    max = 6;
  } else if (sessionDurationMinutes <= 50) {
    min = 5;
    max = 7;
  } else if (sessionDurationMinutes <= 60) {
    min = 6;
    max = 9;
  } else if (sessionDurationMinutes <= 75) {
    min = 7;
    max = 10;
  } else {
    min = 8;
    max = 11;
  }

  if (
    experience === 'beginner' ||
    experience === 'returning' ||
    experience === 'unknown' ||
    reduceVolume
  ) {
    max = Math.max(min, max - 1);
  }
  return { min, max };
}

export function deriveSplitStrategy(
  weeklyFrequency: number | null,
  experience: TrainingExperienceCategory
): string | null {
  if (weeklyFrequency == null || weeklyFrequency < 1) return null;
  const freq = Math.min(weeklyFrequency, 6);
  const conservative =
    experience === 'beginner' || experience === 'returning' || experience === 'unknown';

  if (freq === 1) return 'full_body_once';
  if (freq === 2) return 'full_body_twice';
  if (freq === 3) return conservative ? 'full_body_three_times' : 'alternating_ab';
  if (freq === 4) return 'upper_lower';
  if (freq === 5) return conservative ? 'upper_lower_plus' : 'push_pull_lower_plus';
  return conservative ? 'upper_lower_plus' : 'advanced_split_candidate';
}

function experienceBaseParams(experience: TrainingExperienceCategory): {
  setsMin: number;
  setsMax: number;
  repsMin: number;
  repsMax: number;
  restMin: number;
  restMax: number;
  rpeMin: number;
  rpeMax: number;
} {
  switch (experience) {
    case 'advanced':
      return {
        setsMin: 3,
        setsMax: 5,
        repsMin: 6,
        repsMax: 15,
        restMin: 60,
        restMax: 180,
        rpeMin: 6,
        rpeMax: 8,
      };
    case 'intermediate':
      return {
        setsMin: 3,
        setsMax: 4,
        repsMin: 8,
        repsMax: 15,
        restMin: 60,
        restMax: 120,
        rpeMin: 5,
        rpeMax: 7,
      };
    case 'beginner':
    case 'returning':
    case 'unknown':
    default:
      return {
        setsMin: 2,
        setsMax: 3,
        repsMin: 10,
        repsMax: 15,
        restMin: 60,
        restMax: 90,
        rpeMin: 4,
        rpeMax: 6,
      };
  }
}

function applyIntensityToRpe(
  base: { rpeMin: number; rpeMax: number },
  preferred: string | null | undefined,
  warnings: TrainingGenerationWarningCode[]
): { rpeMin: number; rpeMax: number } {
  let { rpeMin, rpeMax } = base;
  switch (preferred) {
    case 'very_light':
      rpeMin = Math.min(rpeMin, 3);
      rpeMax = Math.min(rpeMax, 5);
      break;
    case 'light':
      rpeMin = Math.min(rpeMin, 4);
      rpeMax = Math.min(rpeMax, 6);
      break;
    case 'moderate':
      // keep experience caps
      break;
    case 'intense':
      // can approach but not exceed experience max
      rpeMin = Math.max(rpeMin, Math.min(rpeMax - 1, base.rpeMin));
      break;
    case 'very_intense':
      pushUnique(warnings, 'very_intense_preference_capped');
      break;
    default:
      break;
  }
  if (rpeMin > rpeMax) rpeMin = rpeMax;
  return { rpeMin, rpeMax };
}

function deriveCardioRange(
  cardioPreference: string | null | undefined,
  sessionDurationMinutes: number | null
): { min: number | null; max: number | null } {
  let min = 5;
  let max = 15;
  switch (cardioPreference) {
    case 'warmup_only':
      min = 5;
      max = 8;
      break;
    case 'little':
      min = 8;
      max = 15;
      break;
    case 'moderate':
      min = 15;
      max = 25;
      break;
    case 'a_lot':
      min = 20;
      max = 35;
      break;
    case 'dislike':
      min = 0;
      max = 5;
      break;
    case 'no_preference':
    case null:
    case undefined:
      min = 5;
      max = 15;
      break;
    default:
      min = 5;
      max = 15;
  }
  if (sessionDurationMinutes != null && sessionDurationMinutes > 0) {
    const cap = Math.max(0, Math.floor(sessionDurationMinutes * 0.4));
    max = Math.min(max, cap || max);
    if (min > max) min = max;
  }
  return { min, max };
}

function mapAllowedEnvironments(location: string | null): string[] {
  switch (location) {
    case 'gym':
      return ['gym'];
    case 'home':
      return ['home'];
    case 'gym_and_home':
      return ['gym', 'home'];
    case 'condo_gym':
      return ['condo_gym'];
    case 'outdoors':
      return ['outdoors'];
    case 'other':
      return ['other'];
    default:
      return [];
  }
}

function mapMovementPatterns(limitations: string[]): {
  restricted: TrainingMovementPattern[];
  excluded: TrainingMovementPattern[];
} {
  const restricted: TrainingMovementPattern[] = [];
  const excluded: TrainingMovementPattern[] = [];
  const map: Record<string, TrainingMovementPattern | TrainingMovementPattern[]> = {
    squat: 'squat',
    kneel: 'kneeling',
    lie_down: 'floor_transition',
    get_up_from_floor: 'floor_transition',
    raise_arms: 'overhead_reach',
    push: ['horizontal_push', 'vertical_push'],
    pull: ['horizontal_pull', 'vertical_pull'],
    run: 'running',
    jump: 'jumping',
    stairs: 'stair_climbing',
    prolonged_standing: 'prolonged_standing',
    other: 'other',
  };

  for (const lim of limitations) {
    if (lim === 'none') continue;
    const mapped = map[lim];
    if (!mapped) continue;
    const list = Array.isArray(mapped) ? mapped : [mapped];
    for (const p of list) {
      pushUnique(restricted, p);
      // Preferências fortes de exclusão para salto/corrida quando marcados
      if (p === 'jumping' || p === 'running') {
        pushUnique(excluded, p);
      }
    }
  }
  return { restricted, excluded };
}

function priorityStrategyFromGoal(primaryGoal: string | null): string | null {
  if (!primaryGoal) return null;
  switch (primaryGoal) {
    case 'weight_loss':
      return 'fat_loss_bias';
    case 'muscle_gain':
      return 'hypertrophy_bias';
    case 'body_definition':
      return 'composition_bias';
    case 'conditioning':
      return 'conditioning_bias';
    case 'mobility':
      return 'mobility_bias';
    case 'health':
      return 'general_health_bias';
    default:
      return 'balanced';
  }
}

function isSummaryShape(v: unknown): v is AvaliacaoAtividadeFisicaSummary {
  return Boolean(
    v &&
      typeof v === 'object' &&
      (v as AvaliacaoAtividadeFisicaSummary).version === 1 &&
      'goalProfile' in (v as object)
  );
}

export function buildTrainingPersonalizationIndex(
  assessment: AvaliacaoAtividadeFisica
): TrainingPersonalizationIndex {
  const blockers: TrainingGenerationBlockerCode[] = [];
  const warnings: TrainingGenerationWarningCode[] = [];

  const answers = assessment.answers || {};
  let summaryRebuilt = false;
  let summary: AvaliacaoAtividadeFisicaSummary;
  if (isSummaryShape(assessment.summary)) {
    summary = assessment.summary;
  } else {
    summary = buildPhysicalActivityAssessmentSummary(answers, assessment.safety || {
      requiresProfessionalAttention: false,
      reasons: [],
    });
    summaryRebuilt = true;
    if (assessment.status === 'completed') {
      pushUnique(warnings, 'summary_rebuilt_from_answers');
    }
  }

  if (assessment.status !== 'completed') {
    pushUnique(blockers, 'assessment_not_completed');
  }

  const requiresProfessionalReview = Boolean(
    assessment.safety?.requiresProfessionalAttention
  );
  if (requiresProfessionalReview) {
    pushUnique(blockers, 'professional_review_required');
  }

  const weeklyFrequency =
    typeof summary.routine.availableDaysPerWeek === 'number'
      ? summary.routine.availableDaysPerWeek
      : typeof answers.availableDaysPerWeek === 'number'
        ? answers.availableDaysPerWeek
        : null;

  const sessionDurationMinutes =
    typeof summary.routine.sessionDurationMinutes === 'number'
      ? summary.routine.sessionDurationMinutes
      : typeof answers.sessionDurationMinutes === 'number'
        ? answers.sessionDurationMinutes
        : null;

  const trainingLocation =
    str(summary.environment.trainingLocation) ||
    str(summary.routine.trainingLocation) ||
    str(answers.trainingLocation);

  if (weeklyFrequency == null) pushUnique(blockers, 'weekly_frequency_missing');
  if (sessionDurationMinutes == null) pushUnique(blockers, 'session_duration_missing');
  if (!trainingLocation) pushUnique(blockers, 'training_location_missing');

  if (
    summary.clinicalSafety.professionalExerciseRestriction &&
    summary.clinicalSafety.professionalExerciseRestriction !== 'no'
  ) {
    // Já coberto por safety na maioria dos casos; reforça blocker tipado.
    pushUnique(blockers, 'professional_restriction_present');
  }

  if (
    assessment.status === 'completed' &&
    !trainingLocation &&
    weeklyFrequency == null &&
    sessionDurationMinutes == null
  ) {
    pushUnique(blockers, 'insufficient_assessment_data');
  }

  const experienceLevel =
    str(summary.goalProfile.experienceLevel) || str(answers.experienceLevel);
  const experienceCategory = mapExperienceCategory(experienceLevel);

  if (experienceCategory === 'beginner' || experienceCategory === 'unknown') {
    pushUnique(warnings, 'low_training_experience');
  }
  if (experienceCategory === 'returning') {
    pushUnique(warnings, 'returning_after_inactivity');
  }

  if (summary.routine.variableSchedule || answers.variableSchedule) {
    pushUnique(warnings, 'variable_schedule');
  }
  if (
    summary.routine.durationConsistency === 'sometimes_less' ||
    summary.routine.durationConsistency === 'variable' ||
    answers.durationConsistency === 'sometimes_less' ||
    answers.durationConsistency === 'variable'
  ) {
    pushUnique(warnings, 'variable_session_duration');
  }

  if (weeklyFrequency != null && weeklyFrequency >= 7) {
    pushUnique(warnings, 'seven_day_frequency');
  }

  const preferredIntensity =
    str(summary.trainingProfile.preferredIntensity) || str(answers.preferredIntensity);
  const intensityCategory = mapIntensityCategory(preferredIntensity);
  if (preferredIntensity === 'unsure' || !preferredIntensity) {
    // intensity unknown handled via category
  }

  const cardioPreference =
    str(summary.trainingProfile.cardioPreference) || str(answers.cardioPreference);
  if (!cardioPreference || cardioPreference === 'no_preference') {
    pushUnique(warnings, 'cardio_preference_unknown');
  }

  const equipmentRaw = arr(
    summary.environment.availableEquipment.length
      ? summary.environment.availableEquipment
      : answers.availableEquipment
  );
  let availableEquipment: string[] = [];
  let equipmentAvailabilityKnown = false;
  if (equipmentRaw.includes('none')) {
    availableEquipment = [];
    equipmentAvailabilityKnown = true;
  } else if (equipmentRaw.includes('unknown')) {
    availableEquipment = [];
    equipmentAvailabilityKnown = false;
    pushUnique(warnings, 'equipment_availability_unknown');
  } else if (equipmentRaw.length > 0) {
    availableEquipment = equipmentRaw.filter((e) => e !== 'none' && e !== 'unknown');
    equipmentAvailabilityKnown = true;
  } else {
    availableEquipment = [];
    equipmentAvailabilityKnown = false;
    if (assessment.status === 'completed') {
      pushUnique(warnings, 'equipment_availability_unknown');
    }
  }

  const floor =
    str(summary.environment.floorExerciseAvailability) ||
    str(answers.floorExerciseAvailability);
  const noise =
    str(summary.environment.environmentImpactNoiseRestriction) ||
    str(answers.environmentImpactNoiseRestriction);

  let requiresNoFloorExercises = floor === 'no_space';
  if (floor === 'prefer_avoid' || floor === 'no_mat') {
    pushUnique(warnings, 'environment_has_limitations');
  }
  if (floor === 'no_space') {
    pushUnique(warnings, 'environment_has_limitations');
  }

  const requiresEnvironmentalLowImpact = noise === 'yes';
  const requiresLowNoise = noise === 'yes';
  if (noise === 'sometimes') {
    pushUnique(warnings, 'environment_has_limitations');
  }

  // Clinical low impact: only when safety already flagged cardio/balance/pain patterns
  const safetyReasons = arr(assessment.safety?.reasons);
  const requiresClinicalLowImpact =
    safetyReasons.includes('recent_fall') ||
    safetyReasons.includes('frequent_balance_problem') ||
    safetyReasons.includes('severe_current_pain');

  const requiresBalanceCaution =
    safetyReasons.includes('frequent_balance_problem') ||
    safetyReasons.includes('recent_fall') ||
    summary.clinicalSafety.balanceFallHistory === 'frequent' ||
    summary.clinicalSafety.balanceFallHistory === 'fell_once' ||
    summary.clinicalSafety.balanceFallHistory === 'fell_multiple';

  const requiresCardiorespiratoryCaution =
    safetyReasons.includes('shortness_of_breath_light_effort') ||
    safetyReasons.includes('shortness_of_breath_at_rest') ||
    safetyReasons.includes('chest_symptoms') ||
    safetyReasons.includes('dizziness_or_fainting') ||
    safetyReasons.includes('frequent_palpitations') ||
    safetyReasons.includes('uncontrolled_blood_pressure_advice');

  const restrictedBodyRegions = arr(
    summary.clinicalSafety.currentPainLevel &&
      summary.clinicalSafety.currentPainLevel !== 'none'
      ? summary.clinicalSafety.painRegions
      : []
  );

  const movementLimitations = arr(
    summary.clinicalSafety.movementLimitations.length
      ? summary.clinicalSafety.movementLimitations
      : answers.movementLimitations
  ).filter((v) => v !== 'none');
  const { restricted, excluded } = mapMovementPatterns(movementLimitations);

  const avoidedText =
    str(summary.trainingProfile.avoidedExercisesText) ||
    str(answers.avoidedExercisesText);
  const favoriteText =
    str(summary.trainingProfile.favoriteExercisesText) ||
    str(answers.favoriteExercisesText);
  const avoidedExerciseTerms = avoidedText ? [avoidedText] : [];
  if (avoidedText || favoriteText) {
    pushUnique(warnings, 'exercise_preferences_not_in_catalog');
  }

  const barriers = arr(
    summary.trainingProfile.trainingBarriers.length
      ? summary.trainingProfile.trainingBarriers
      : answers.trainingBarriers
  );

  const reduceVolume =
    barriers.includes('lack_of_time') ||
    barriers.includes('fatigue') ||
    summary.routine.durationConsistency === 'variable';

  if (barriers.includes('unsure_form')) {
    pushUnique(warnings, 'low_training_experience');
  }

  const baseParams = experienceBaseParams(experienceCategory);
  const rpe = applyIntensityToRpe(baseParams, preferredIntensity, warnings);
  const exerciseRange = deriveExerciseCountRange(
    sessionDurationMinutes,
    experienceCategory,
    reduceVolume
  );
  const split = deriveSplitStrategy(
    weeklyFrequency != null ? Math.min(weeklyFrequency, 6) : null,
    experienceCategory
  );
  const cardio = deriveCardioRange(cardioPreference, sessionDurationMinutes);

  const generationAllowed = blockers.length === 0;

  const primaryGoal =
    str(summary.goalProfile.primaryGoal) || str(answers.primaryGoal);

  return {
    version: 1,
    source: {
      assessmentId: assessment.id || assessment.patientId || '',
      assessmentVersion: typeof assessment.version === 'number' ? assessment.version : 1,
      summaryVersion: summary.version ?? (summaryRebuilt ? 1 : null),
      assessmentStatus: assessment.status || 'draft',
      assessmentCompletedAt: assessment.completedAt ?? null,
      // Builder puro: sem Date.now(). Persistência pode carimbar no service.
      generatedAt: null,
    },
    eligibility: {
      generationAllowed,
      requiresProfessionalReview,
      blockers: [...blockers],
      warnings: [...warnings],
    },
    goals: {
      primaryGoal,
      secondaryGoals: arr(
        summary.goalProfile.secondaryGoals.length
          ? summary.goalProfile.secondaryGoals
          : answers.secondaryGoals
      ),
      priorityStrategy: priorityStrategyFromGoal(primaryGoal),
    },
    experience: {
      level: experienceLevel,
      category: experienceCategory,
      currentlyActive:
        summary.goalProfile.currentlyActive ??
        (answers.currentlyActive === true
          ? true
          : answers.currentlyActive === false
            ? false
            : null),
      currentFrequencyPerWeek:
        summary.goalProfile.currentFrequencyPerWeek ??
        (typeof answers.currentFrequencyPerWeek === 'number'
          ? answers.currentFrequencyPerWeek
          : null),
    },
    routine: {
      weeklyFrequency,
      preferredWeekdays: normalizeTrainingWeekdays(
        summary.routine.preferredWeekdays.length
          ? summary.routine.preferredWeekdays
          : answers.preferredWeekdays
      ),
      variableSchedule: Boolean(summary.routine.variableSchedule || answers.variableSchedule),
      sessionDurationMinutes,
      durationConsistency:
        str(summary.routine.durationConsistency) || str(answers.durationConsistency),
      preferredTrainingPeriod:
        str(summary.routine.preferredTrainingPeriod) ||
        str(answers.preferredTrainingPeriod),
      approximateTrainingTime:
        str(summary.routine.preferredTrainingTime) ||
        str(answers.approximateTrainingTime),
    },
    trainingPreferences: {
      bodyPriorities: arr(
        summary.trainingProfile.bodyPriorities.length
          ? summary.trainingProfile.bodyPriorities
          : answers.bodyPriorities
      ),
      preferredModalities: arr(
        summary.trainingProfile.preferredModalities.length
          ? summary.trainingProfile.preferredModalities
          : answers.preferredModalities
      ),
      preferredIntensity,
      targetIntensityCategory: intensityCategory,
      cardioPreference,
      preferredCardioActivities: arr(
        summary.trainingProfile.preferredCardioActivities.length
          ? summary.trainingProfile.preferredCardioActivities
          : answers.preferredCardioActivities
      ),
      favoriteExercisesText: favoriteText,
      avoidedExercisesText: avoidedText,
      trainingBarriers: barriers,
    },
    environment: {
      trainingLocation,
      allowedEnvironments: mapAllowedEnvironments(trainingLocation),
      gymStructureLevel:
        str(summary.environment.gymStructureLevel) || str(answers.gymStructureLevel),
      gymAvailableAreas: arr(
        summary.environment.gymAvailableAreas.length
          ? summary.environment.gymAvailableAreas
          : answers.gymAvailableAreas
      ),
      homeTrainingSpace:
        str(summary.environment.homeTrainingSpace) || str(answers.homeTrainingSpace),
      availableEquipment,
      equipmentAvailabilityKnown,
      equipmentAccessFrequency:
        str(summary.environment.equipmentAccessFrequency) ||
        str(answers.equipmentAccessFrequency),
      outdoorEnvironment: arr(
        summary.environment.outdoorEnvironment.length
          ? summary.environment.outdoorEnvironment
          : answers.outdoorEnvironment
      ),
      floorExerciseAvailability: floor,
      impactNoiseRestriction: noise,
    },
    constraints: {
      restrictedBodyRegions: [...restrictedBodyRegions],
      restrictedMovementPatterns: [...restricted],
      excludedMovementPatterns: [...excluded],
      avoidedExerciseTerms: [...avoidedExerciseTerms],
      requiresLowImpact: requiresEnvironmentalLowImpact || requiresClinicalLowImpact,
      requiresNoFloorExercises,
      requiresLowNoise,
      requiresEnvironmentalLowImpact,
      requiresClinicalLowImpact,
      requiresBalanceCaution,
      requiresCardiorespiratoryCaution,
      professionalRestrictionDetails:
        str(summary.clinicalSafety.professionalExerciseRestrictionDetails) ||
        str(answers.professionalExerciseRestrictionDetails),
    },
    generationParameters: {
      recommendedSplitStrategy: split,
      minExercisesPerSession: exerciseRange.min,
      maxExercisesPerSession: exerciseRange.max,
      defaultSetsMin: baseParams.setsMin,
      defaultSetsMax: baseParams.setsMax,
      defaultRepRangeMin: baseParams.repsMin,
      defaultRepRangeMax: baseParams.repsMax,
      defaultRestSecondsMin: baseParams.restMin,
      defaultRestSecondsMax: baseParams.restMax,
      targetRpeMin: rpe.rpeMin,
      targetRpeMax: rpe.rpeMax,
      cardioDurationMinutesMin: cardio.min,
      cardioDurationMinutesMax: cardio.max,
    },
  };
}
