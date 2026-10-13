/**
 * Regras puras de persistência da Avaliação de Atividade Física,
 * compartilhadas entre o app do paciente (client SDK) e o link público (admin SDK).
 */

import { buildPhysicalActivityAssessmentSummary } from '@/lib/avaliacaoAtividadeFisica/buildAssessmentSummary';
import { buildSafetyAssessment } from '@/lib/avaliacaoAtividadeFisica/buildSafetyAssessment';
import { buildTrainingPersonalizationIndex } from '@/lib/avaliacaoAtividadeFisica/buildTrainingPersonalizationIndex';
import {
  AVALIACAO_COMPLETED_STEP,
  type AvaliacaoAtividadeFisica,
  type AvaliacaoAtividadeFisicaBasicAnswers,
  type AvaliacaoAtividadeFisicaSafety,
} from '@/types/avaliacaoAtividadeFisica';
import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';

/** Merge parcial de answers com as limpezas condicionais de cada etapa. */
export function mergeAssessmentStepAnswers(
  prevAnswers: AvaliacaoAtividadeFisicaBasicAnswers,
  stepId: string,
  partialAnswers: Partial<AvaliacaoAtividadeFisicaBasicAnswers>
): AvaliacaoAtividadeFisicaBasicAnswers {
  const mergedAnswers: AvaliacaoAtividadeFisicaBasicAnswers = {
    ...prevAnswers,
    ...partialAnswers,
  };

  if (stepId === 'current_activity' && partialAnswers.currentlyActive === false) {
    mergedAnswers.currentActivities = [];
    mergedAnswers.currentActivityOther = null;
    mergedAnswers.currentFrequencyPerWeek = null;
  }
  if (stepId === 'preferred_days' && partialAnswers.variableSchedule === true) {
    mergedAnswers.preferredWeekdays = [];
    mergedAnswers.variableSchedule = true;
  }
  if (stepId === 'preferred_days' && partialAnswers.variableSchedule === false) {
    mergedAnswers.variableSchedule = false;
  }
  if (stepId === 'current_pain' && partialAnswers.currentPainLevel === 'none') {
    mergedAnswers.painRegions = [];
    mergedAnswers.painRegionOther = null;
    mergedAnswers.painTriggers = [];
    mergedAnswers.painTriggerOther = null;
    mergedAnswers.painFunctionalImpact = null;
  }
  if (
    stepId === 'relevant_injury' &&
    (partialAnswers.hasRelevantInjury === 'no' || partialAnswers.hasRelevantInjury === 'unsure')
  ) {
    mergedAnswers.injuryDetails = null;
    mergedAnswers.injuryCurrentlyLimitsMovement = null;
  }
  if (stepId === 'relevant_surgery' && partialAnswers.hasRelevantSurgery === 'no') {
    mergedAnswers.surgeryDetails = null;
    mergedAnswers.surgeryTiming = null;
  }
  if (
    stepId === 'professional_restriction' &&
    partialAnswers.hasProfessionalExerciseRestriction === 'no'
  ) {
    mergedAnswers.professionalExerciseRestrictionDetails = null;
  }
  if (
    stepId === 'movement_limitations' &&
    (partialAnswers.movementLimitations || []).includes('none')
  ) {
    mergedAnswers.movementLimitations = ['none'];
    mergedAnswers.movementLimitationOther = null;
  }

  return mergedAnswers;
}

export function normalizeAssessmentSafety(
  safety: AvaliacaoAtividadeFisicaSafety
): AvaliacaoAtividadeFisicaSafety {
  return {
    requiresProfessionalAttention: Boolean(safety.requiresProfessionalAttention),
    reasons: Array.isArray(safety.reasons) ? safety.reasons : [],
  };
}

/** Calcula safety, summary e índice de personalização na conclusão. */
export function buildCompletedAssessment(params: {
  patientId: string;
  existing: Record<string, unknown>;
  answers: AvaliacaoAtividadeFisicaBasicAnswers;
  startedAt: Date;
  completedAt: Date | null;
}): {
  mergedAnswers: AvaliacaoAtividadeFisicaBasicAnswers;
  safety: AvaliacaoAtividadeFisicaSafety;
  summary: NonNullable<AvaliacaoAtividadeFisica['summary']>;
  trainingPersonalizationIndex: TrainingPersonalizationIndex;
} {
  const { patientId, existing } = params;
  const prevAnswers = (existing.answers as AvaliacaoAtividadeFisicaBasicAnswers) || {};
  const mergedAnswers: AvaliacaoAtividadeFisicaBasicAnswers = {
    ...prevAnswers,
    ...params.answers,
    finalConfirmationAccepted: true,
  };

  const safety = buildSafetyAssessment(mergedAnswers);
  const summary = buildPhysicalActivityAssessmentSummary(mergedAnswers, safety);

  const assessmentForIndex: AvaliacaoAtividadeFisica = {
    id: patientId,
    patientId,
    userId: (existing.userId as string | null | undefined) ?? null,
    organizationId: (existing.organizationId as string | null | undefined) ?? null,
    status: 'completed',
    version: typeof existing.version === 'number' ? existing.version : 1,
    currentStep: AVALIACAO_COMPLETED_STEP,
    progressPercent: 100,
    answers: mergedAnswers,
    safety,
    summary,
    startedAt: params.startedAt,
    updatedAt: new Date(),
    completedAt: params.completedAt ?? new Date(),
    createdBy: 'patient',
    lastUpdatedBy: 'patient',
  };

  const trainingPersonalizationIndex = buildTrainingPersonalizationIndex(assessmentForIndex);
  // Carimbo de geração no service (builder puro deixa generatedAt = null).
  trainingPersonalizationIndex.source.generatedAt = new Date();

  return {
    mergedAnswers,
    safety: normalizeAssessmentSafety(safety),
    summary: summary as NonNullable<AvaliacaoAtividadeFisica['summary']>,
    trainingPersonalizationIndex,
  };
}
