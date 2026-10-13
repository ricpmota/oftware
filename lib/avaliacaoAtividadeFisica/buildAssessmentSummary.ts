/**
 * Builder puro do resumo estruturado da avaliação (Etapa 07).
 * Não acessa Firestore, não chama IA, não traduz para UI.
 */

import type {
  AvaliacaoAtividadeFisicaBasicAnswers,
  AvaliacaoAtividadeFisicaSafety,
  AvaliacaoAtividadeFisicaSummary,
} from '@/types/avaliacaoAtividadeFisica';

function str(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}

function arr(v: string[] | null | undefined): string[] {
  return Array.isArray(v) ? [...v] : [];
}

export function buildPhysicalActivityAssessmentSummary(
  answers: AvaliacaoAtividadeFisicaBasicAnswers,
  safety: AvaliacaoAtividadeFisicaSafety
): AvaliacaoAtividadeFisicaSummary {
  return {
    version: 1,
    goalProfile: {
      primaryGoal: str(answers.primaryGoal),
      primaryGoalOther: str(answers.primaryGoalOther),
      secondaryGoals: arr(answers.secondaryGoals),
      experienceLevel: str(answers.experienceLevel),
      currentlyActive:
        answers.currentlyActive === true
          ? true
          : answers.currentlyActive === false
            ? false
            : null,
      currentActivities: arr(answers.currentActivities),
      currentActivityOther: str(answers.currentActivityOther),
      currentFrequencyPerWeek:
        typeof answers.currentFrequencyPerWeek === 'number'
          ? answers.currentFrequencyPerWeek
          : null,
    },
    routine: {
      availableDaysPerWeek:
        typeof answers.availableDaysPerWeek === 'number' ? answers.availableDaysPerWeek : null,
      preferredWeekdays: arr(answers.preferredWeekdays),
      variableSchedule: Boolean(answers.variableSchedule),
      sessionDurationMinutes:
        typeof answers.sessionDurationMinutes === 'number'
          ? answers.sessionDurationMinutes
          : null,
      durationConsistency: str(answers.durationConsistency),
      preferredTrainingPeriod: str(answers.preferredTrainingPeriod),
      preferredTrainingTime: str(answers.approximateTrainingTime),
      trainingLocation: str(answers.trainingLocation),
      trainingLocationOther: str(answers.trainingLocationOther),
    },
    trainingProfile: {
      bodyPriorities: arr(answers.bodyPriorities),
      preferredModalities: arr(answers.preferredModalities),
      preferredIntensity: str(answers.preferredIntensity),
      cardioPreference: str(answers.cardioPreference),
      preferredCardioActivities: arr(answers.preferredCardioActivities),
      preferredCardioOther: str(answers.preferredCardioOther),
      favoriteExercisesText: str(answers.favoriteExercisesText),
      avoidedExercisesText: str(answers.avoidedExercisesText),
      trainingBarriers: arr(answers.trainingBarriers),
      trainingBarrierOther: str(answers.trainingBarrierOther),
    },
    environment: {
      trainingLocation: str(answers.trainingLocation),
      gymStructureLevel: str(answers.gymStructureLevel),
      gymAvailableAreas: arr(answers.gymAvailableAreas),
      homeTrainingSpace: str(answers.homeTrainingSpace),
      availableEquipment: arr(answers.availableEquipment),
      availableEquipmentOther: str(answers.availableEquipmentOther),
      equipmentAccessFrequency: str(answers.equipmentAccessFrequency),
      outdoorEnvironment: arr(answers.outdoorEnvironment),
      outdoorEnvironmentOther: str(answers.outdoorEnvironmentOther),
      floorExerciseAvailability: str(answers.floorExerciseAvailability),
      environmentImpactNoiseRestriction: str(answers.environmentImpactNoiseRestriction),
      environmentNotes: str(answers.environmentNotes),
    },
    clinicalSafety: {
      currentPainLevel: str(answers.currentPainLevel),
      painRegions: arr(answers.painRegions),
      painRegionOther: str(answers.painRegionOther),
      painTriggers: arr(answers.painTriggers),
      painTriggerOther: str(answers.painTriggerOther),
      painFunctionalImpact: str(answers.painFunctionalImpact),
      injuryStatus: str(answers.hasRelevantInjury),
      injuryDetails: str(answers.injuryDetails),
      injuryCurrentlyLimitsMovement: str(answers.injuryCurrentlyLimitsMovement),
      surgeryStatus: str(answers.hasRelevantSurgery),
      surgeryDetails: str(answers.surgeryDetails),
      surgeryTiming: str(answers.surgeryTiming),
      movementLimitations: arr(answers.movementLimitations),
      movementLimitationOther: str(answers.movementLimitationOther),
      balanceFallHistory: str(answers.balanceFallHistory),
      shortnessOfBreathOnLightEffort: str(answers.shortnessOfBreathOnLightEffort),
      chestSymptomsDuringEffort: str(answers.chestSymptomsDuringEffort),
      dizzinessOrFaintingDuringEffort: str(answers.dizzinessOrFaintingDuringEffort),
      palpitationsDuringExercise: str(answers.palpitationsDuringExercise),
      uncontrolledBloodPressureAdvice: str(answers.uncontrolledBloodPressureAdvice),
      professionalExerciseRestriction: str(answers.hasProfessionalExerciseRestriction),
      professionalExerciseRestrictionDetails: str(
        answers.professionalExerciseRestrictionDetails
      ),
      additionalSafetyNotes: str(answers.additionalSafetyNotes),
    },
    safetyAssessment: {
      requiresProfessionalAttention: Boolean(safety.requiresProfessionalAttention),
      reasons: Array.isArray(safety.reasons) ? [...safety.reasons] : [],
    },
  };
}
