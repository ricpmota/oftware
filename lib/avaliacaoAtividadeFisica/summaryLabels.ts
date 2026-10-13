/**
 * Labels humanos para o resumo da avaliação (somente UI).
 */

import type { ChoiceOption } from '@/lib/avaliacaoAtividadeFisica/questionsBasic';
import {
  BALANCE_FALL_OPTIONS,
  BARRIER_OPTIONS,
  BODY_PRIORITY_OPTIONS,
  BP_ADVICE_OPTIONS,
  CARDIO_ACTIVITY_OPTIONS,
  CARDIO_PREFERENCE_OPTIONS,
  CHEST_SYMPTOM_OPTIONS,
  CURRENT_ACTIVITY_OPTIONS,
  CURRENT_PAIN_OPTIONS,
  DIZZINESS_OPTIONS,
  DURATION_CONSISTENCY_OPTIONS,
  DURATION_OPTIONS,
  ENVIRONMENT_NOISE_OPTIONS,
  EQUIPMENT_ACCESS_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  FLOOR_EXERCISE_OPTIONS,
  GYM_AREA_OPTIONS,
  GYM_STRUCTURE_OPTIONS,
  HOME_SPACE_OPTIONS,
  INJURY_LIMITS_OPTIONS,
  INJURY_STATUS_OPTIONS,
  INTENSITY_OPTIONS,
  MODALITY_OPTIONS,
  MOVEMENT_LIMITATION_OPTIONS,
  OUTDOOR_SPACE_OPTIONS,
  PAIN_IMPACT_OPTIONS,
  PAIN_REGION_OPTIONS,
  PAIN_TRIGGER_OPTIONS,
  PALPITATION_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  PROFESSIONAL_RESTRICTION_OPTIONS,
  SECONDARY_NONE_VALUE,
  SHORTNESS_OF_BREATH_OPTIONS,
  SURGERY_STATUS_OPTIONS,
  SURGERY_TIMING_OPTIONS,
  TRAINING_LOCATION_OPTIONS,
  TRAINING_PERIOD_OPTIONS,
  WEEKDAY_OPTIONS,
} from '@/lib/avaliacaoAtividadeFisica/questionsBasic';

export function labelFromOptions(
  options: ChoiceOption[],
  value: string | null | undefined,
  fallback = 'Não informado'
): string {
  if (value == null || value === '') return fallback;
  return options.find((o) => o.value === value)?.label ?? value;
}

export function labelsFromOptions(
  options: ChoiceOption[],
  values: string[] | null | undefined
): string[] {
  if (!values?.length) return [];
  return values.map((v) => labelFromOptions(options, v, v));
}

export const SAFETY_REASON_LABELS: Record<string, string> = {
  severe_current_pain: 'Dor atual importante',
  pain_prevents_activities: 'Dor que limita atividades',
  active_injury: 'Lesão em recuperação ou atual',
  injury_limits_movement: 'Lesão limitando movimento',
  recent_surgery: 'Cirurgia recente',
  movement_limitation: 'Limitação de movimento',
  frequent_balance_problem: 'Dificuldade frequente de equilíbrio',
  recent_fall: 'Queda recente',
  shortness_of_breath_light_effort: 'Falta de ar em esforço leve',
  shortness_of_breath_at_rest: 'Falta de ar em repouso',
  chest_symptoms: 'Sintomas no peito durante esforço',
  dizziness_or_fainting: 'Tontura ou desmaio relacionado a esforço',
  frequent_palpitations: 'Palpitações frequentes',
  uncontrolled_blood_pressure_advice: 'Orientação sobre pressão arterial',
  professional_exercise_restriction: 'Restrição profissional informada',
  pregnancy_or_possible_pregnancy: 'Gestação ou possibilidade de gestação',
  other_relevant_condition: 'Outra condição relevante',
};

export function getSafetyReasonLabel(reason: string): string {
  return SAFETY_REASON_LABELS[reason] ?? reason;
}

export function getPrimaryGoalLabel(value: string | null | undefined): string {
  return labelFromOptions(PRIMARY_GOAL_OPTIONS, value);
}

export function getSecondaryGoalLabels(values: string[] | null | undefined): string[] {
  if (!values?.length) return [];
  return values.map((v) =>
    v === SECONDARY_NONE_VALUE
      ? 'Nenhum objetivo adicional'
      : labelFromOptions(PRIMARY_GOAL_OPTIONS, v, v)
  );
}

export function getExperienceLabel(value: string | null | undefined): string {
  return labelFromOptions(EXPERIENCE_OPTIONS, value);
}

export function getTrainingLocationLabel(value: string | null | undefined): string {
  return labelFromOptions(TRAINING_LOCATION_OPTIONS, value);
}

export function getEquipmentLabels(values: string[] | null | undefined): string[] {
  return labelsFromOptions(EQUIPMENT_OPTIONS, values);
}

export function getWeekdayLabels(values: string[] | null | undefined): string[] {
  return labelsFromOptions(WEEKDAY_OPTIONS, values);
}

export function getDurationLabel(minutes: number | null | undefined): string {
  if (minutes == null) return 'Não informado';
  return labelFromOptions(DURATION_OPTIONS, String(minutes), `${minutes} minutos`);
}

export {
  BALANCE_FALL_OPTIONS,
  BARRIER_OPTIONS,
  BODY_PRIORITY_OPTIONS,
  BP_ADVICE_OPTIONS,
  CARDIO_ACTIVITY_OPTIONS,
  CARDIO_PREFERENCE_OPTIONS,
  CHEST_SYMPTOM_OPTIONS,
  CURRENT_ACTIVITY_OPTIONS,
  CURRENT_PAIN_OPTIONS,
  DIZZINESS_OPTIONS,
  DURATION_CONSISTENCY_OPTIONS,
  ENVIRONMENT_NOISE_OPTIONS,
  EQUIPMENT_ACCESS_OPTIONS,
  FLOOR_EXERCISE_OPTIONS,
  GYM_AREA_OPTIONS,
  GYM_STRUCTURE_OPTIONS,
  HOME_SPACE_OPTIONS,
  INJURY_LIMITS_OPTIONS,
  INJURY_STATUS_OPTIONS,
  INTENSITY_OPTIONS,
  MODALITY_OPTIONS,
  MOVEMENT_LIMITATION_OPTIONS,
  OUTDOOR_SPACE_OPTIONS,
  PAIN_IMPACT_OPTIONS,
  PAIN_REGION_OPTIONS,
  PAIN_TRIGGER_OPTIONS,
  PALPITATION_OPTIONS,
  PROFESSIONAL_RESTRICTION_OPTIONS,
  SHORTNESS_OF_BREATH_OPTIONS,
  SURGERY_STATUS_OPTIONS,
  SURGERY_TIMING_OPTIONS,
  TRAINING_PERIOD_OPTIONS,
};
