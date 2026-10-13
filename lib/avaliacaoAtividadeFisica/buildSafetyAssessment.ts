/**
 * Função pura: calcula sinais de atenção profissional a partir das respostas.
 * Não diagnostica, não libera clinicamente, não chama IA/backend.
 */

import type {
  AvaliacaoAtividadeFisicaBasicAnswers,
  AvaliacaoAtividadeFisicaSafety,
  AvaliacaoSafetyReasonCode,
} from '@/types/avaliacaoAtividadeFisica';

function pushReason(reasons: AvaliacaoSafetyReasonCode[], code: AvaliacaoSafetyReasonCode) {
  if (!reasons.includes(code)) reasons.push(code);
}

export function buildSafetyAssessment(
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): AvaliacaoAtividadeFisicaSafety {
  const reasons: AvaliacaoSafetyReasonCode[] = [];

  if (answers.currentPainLevel === 'severe') {
    pushReason(reasons, 'severe_current_pain');
  }
  if (answers.painFunctionalImpact === 'prevents_activities') {
    pushReason(reasons, 'pain_prevents_activities');
  }

  if (
    answers.hasRelevantInjury === 'current' ||
    answers.hasRelevantInjury === 'recovering'
  ) {
    pushReason(reasons, 'active_injury');
  }
  if (answers.injuryCurrentlyLimitsMovement === 'yes') {
    pushReason(reasons, 'injury_limits_movement');
  }

  if (
    answers.surgeryTiming === 'less_than_3_months' ||
    answers.surgeryTiming === 'between_3_and_6_months'
  ) {
    pushReason(reasons, 'recent_surgery');
  }

  const movement = answers.movementLimitations || [];
  if (movement.length > 0 && !movement.includes('none')) {
    pushReason(reasons, 'movement_limitation');
  }

  if (answers.balanceFallHistory === 'frequent') {
    pushReason(reasons, 'frequent_balance_problem');
  }
  if (
    answers.balanceFallHistory === 'fell_once' ||
    answers.balanceFallHistory === 'fell_multiple'
  ) {
    pushReason(reasons, 'recent_fall');
  }

  if (answers.shortnessOfBreathOnLightEffort === 'frequently') {
    pushReason(reasons, 'shortness_of_breath_light_effort');
  }
  if (answers.shortnessOfBreathOnLightEffort === 'at_rest') {
    pushReason(reasons, 'shortness_of_breath_at_rest');
  }

  if (
    answers.chestSymptomsDuringEffort === 'sometimes' ||
    answers.chestSymptomsDuringEffort === 'frequently' ||
    answers.chestSymptomsDuringEffort === 'at_rest'
  ) {
    pushReason(reasons, 'chest_symptoms');
  }

  if (
    answers.dizzinessOrFaintingDuringEffort === 'frequent' ||
    answers.dizzinessOrFaintingDuringEffort === 'near_faint' ||
    answers.dizzinessOrFaintingDuringEffort === 'fainted'
  ) {
    pushReason(reasons, 'dizziness_or_fainting');
  }

  if (answers.palpitationsDuringExercise === 'frequently') {
    pushReason(reasons, 'frequent_palpitations');
  }

  if (answers.uncontrolledBloodPressureAdvice === 'yes') {
    pushReason(reasons, 'uncontrolled_blood_pressure_advice');
  }

  if (
    answers.hasProfessionalExerciseRestriction &&
    answers.hasProfessionalExerciseRestriction !== 'no'
  ) {
    pushReason(reasons, 'professional_exercise_restriction');
  }

  if (
    answers.pregnancyStatusForExercise === 'yes' ||
    answers.pregnancyStatusForExercise === 'possibility'
  ) {
    pushReason(reasons, 'pregnancy_or_possible_pregnancy');
  }

  // Texto livre NÃO gera other_relevant_condition automaticamente (sem regex/IA).

  return {
    requiresProfessionalAttention: reasons.length > 0,
    reasons,
  };
}

/** Sintomas que pedem orientação reforçada na UI (sem diagnóstico). */
export function needsReinforcedSafetyMessage(
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): boolean {
  return (
    answers.chestSymptomsDuringEffort === 'at_rest' ||
    answers.shortnessOfBreathOnLightEffort === 'at_rest' ||
    answers.dizzinessOrFaintingDuringEffort === 'fainted' ||
    answers.currentPainLevel === 'severe'
  );
}
