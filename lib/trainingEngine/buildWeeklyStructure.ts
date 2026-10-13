/**
 * Estrutura semanal e slots — sem seleção de exercícios.
 */

import {
  normalizeTrainingWeekdays,
  TRAINING_WEEKDAY_ORDER,
} from '@/lib/trainingEngine/normalizeWeekday';
import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';
import type { TrainingMovementPattern } from '@/types/trainingPersonalizationIndex';
import type {
  TrainingWeekday,
  WorkoutDayTemplate,
  WorkoutExerciseSlot,
} from '@/types/workoutPlanDraft';

function slot(
  slotId: string,
  role: WorkoutExerciseSlot['role'],
  patterns: TrainingMovementPattern[],
  muscles: string[],
  required = true
): WorkoutExerciseSlot {
  return {
    slotId,
    role,
    targetMovementPatterns: patterns,
    targetMuscles: muscles,
    required,
  };
}

function fullBodySlots(variant: 'A' | 'B' | 'C', dayIndex: number): WorkoutExerciseSlot[] {
  const prefix = `d${dayIndex}_${variant}`;
  if (variant === 'A') {
    return [
      slot(`${prefix}_squat`, 'primary_compound', ['squat'], ['quads', 'glutes']),
      slot(`${prefix}_hpush`, 'primary_compound', ['horizontal_push'], ['pectorals']),
      slot(`${prefix}_hpull`, 'secondary_compound', ['horizontal_pull'], ['lats', 'upper back']),
      slot(`${prefix}_hinge`, 'secondary_compound', ['hip_hinge'], ['hamstrings', 'glutes']),
      slot(`${prefix}_core`, 'core', ['core_stability'], ['abs'], false),
    ];
  }
  if (variant === 'B') {
    return [
      slot(`${prefix}_hinge`, 'primary_compound', ['hip_hinge'], ['hamstrings', 'glutes']),
      slot(`${prefix}_vpush`, 'primary_compound', ['vertical_push'], ['delts']),
      slot(`${prefix}_vpull`, 'secondary_compound', ['vertical_pull'], ['lats']),
      slot(`${prefix}_squat`, 'secondary_compound', ['squat'], ['quads']),
      slot(`${prefix}_core`, 'core', ['core_stability'], ['abs'], false),
    ];
  }
  return [
    slot(`${prefix}_squat`, 'primary_compound', ['squat'], ['quads']),
    slot(`${prefix}_hpush`, 'primary_compound', ['horizontal_push'], ['pectorals']),
    slot(`${prefix}_vpull`, 'secondary_compound', ['vertical_pull'], ['lats']),
    slot(`${prefix}_uni`, 'unilateral', ['squat', 'hip_hinge'], ['glutes', 'quads'], false),
    slot(`${prefix}_core`, 'core', ['core_stability'], ['abs'], false),
  ];
}

function upperSlots(variant: 'A' | 'B', dayIndex: number): WorkoutExerciseSlot[] {
  const prefix = `d${dayIndex}_upper${variant}`;
  return [
    slot(`${prefix}_hpush`, 'primary_compound', ['horizontal_push'], ['pectorals']),
    slot(`${prefix}_hpull`, 'primary_compound', ['horizontal_pull'], ['lats', 'upper back']),
    slot(`${prefix}_vpush`, 'secondary_compound', ['vertical_push'], ['delts']),
    slot(`${prefix}_vpull`, 'secondary_compound', ['vertical_pull'], ['lats']),
    slot(`${prefix}_bi`, 'accessory', ['elbow_flexion'], ['biceps'], false),
    slot(`${prefix}_tri`, 'accessory', ['elbow_extension'], ['triceps'], false),
  ];
}

function lowerSlots(variant: 'A' | 'B', dayIndex: number): WorkoutExerciseSlot[] {
  const prefix = `d${dayIndex}_lower${variant}`;
  return [
    slot(`${prefix}_squat`, 'primary_compound', ['squat'], ['quads']),
    slot(`${prefix}_hinge`, 'primary_compound', ['hip_hinge'], ['hamstrings', 'glutes']),
    slot(`${prefix}_uni`, 'unilateral', ['squat'], ['quads', 'glutes']),
    slot(`${prefix}_post`, 'accessory', ['hip_hinge', 'knee_flexion'], ['hamstrings'], false),
    slot(`${prefix}_calf`, 'accessory', ['calf_raise'], ['calves'], false),
    slot(`${prefix}_core`, 'core', ['core_stability'], ['abs'], false),
  ];
}

function assignWeekdays(
  count: number,
  preferred: TrainingWeekday[],
  variableSchedule: boolean
): { weekdays: (TrainingWeekday | null)[]; warning?: string } {
  if (variableSchedule) {
    return { weekdays: Array.from({ length: count }, () => null) };
  }
  const ordered = TRAINING_WEEKDAY_ORDER.filter((d) => preferred.includes(d));
  const weekdays: (TrainingWeekday | null)[] = [];
  for (let i = 0; i < count; i++) {
    weekdays.push(ordered[i] ?? null);
  }
  if (ordered.length < count) {
    return { weekdays, warning: 'preferred_weekdays_insufficient' };
  }
  return { weekdays };
}

export type WeeklyStructureResult = {
  templates: WorkoutDayTemplate[];
  splitStrategy: string;
  unsupportedSplit: boolean;
  warnings: string[];
};

export function buildWeeklyStructure(
  index: TrainingPersonalizationIndex
): WeeklyStructureResult {
  const warnings: string[] = [];
  const strategy = index.generationParameters.recommendedSplitStrategy || 'full_body_once';
  const freq = Math.min(Math.max(index.routine.weeklyFrequency || 1, 1), 6);
  const preferred = normalizeTrainingWeekdays(index.routine.preferredWeekdays);

  if (strategy === 'advanced_split_candidate') {
    return {
      templates: [],
      splitStrategy: strategy,
      unsupportedSplit: true,
      warnings: ['unsupported_split'],
    };
  }

  const templates: WorkoutDayTemplate[] = [];

  const pushDay = (
    dayIndex: number,
    weekday: TrainingWeekday | null,
    focus: string,
    slots: WorkoutExerciseSlot[]
  ) => {
    templates.push({
      dayIndex,
      weekday,
      focus,
      targetMovementPatterns: [
        ...new Set(slots.flatMap((s) => s.targetMovementPatterns)),
      ],
      targetMuscles: [...new Set(slots.flatMap((s) => s.targetMuscles))],
      exerciseSlots: slots,
    });
  };

  if (strategy === 'full_body_once' || (strategy.startsWith('full_body') && freq === 1)) {
    const { weekdays, warning } = assignWeekdays(1, preferred, index.routine.variableSchedule);
    if (warning) warnings.push(warning);
    pushDay(0, weekdays[0], 'full_body_A', fullBodySlots('A', 0));
  } else if (strategy === 'full_body_twice' || (strategy.includes('full_body') && freq === 2)) {
    const { weekdays, warning } = assignWeekdays(2, preferred, index.routine.variableSchedule);
    if (warning) warnings.push(warning);
    pushDay(0, weekdays[0], 'full_body_A', fullBodySlots('A', 0));
    pushDay(1, weekdays[1], 'full_body_B', fullBodySlots('B', 1));
  } else if (
    strategy === 'full_body_three_times' ||
    (strategy.includes('full_body') && freq === 3)
  ) {
    const { weekdays, warning } = assignWeekdays(3, preferred, index.routine.variableSchedule);
    if (warning) warnings.push(warning);
    pushDay(0, weekdays[0], 'full_body_A', fullBodySlots('A', 0));
    pushDay(1, weekdays[1], 'full_body_B', fullBodySlots('B', 1));
    pushDay(2, weekdays[2], 'full_body_C', fullBodySlots('C', 2));
  } else if (strategy === 'alternating_ab') {
    const sessions = Math.min(freq, 3);
    const { weekdays, warning } = assignWeekdays(
      sessions,
      preferred,
      index.routine.variableSchedule
    );
    if (warning) warnings.push(warning);
    const focuses = ['A', 'B', 'A'] as const;
    for (let i = 0; i < sessions; i++) {
      pushDay(i, weekdays[i], `alternating_${focuses[i]}`, fullBodySlots(focuses[i], i));
    }
    warnings.push('alternating_ab_same_week_limitation');
  } else if (strategy === 'upper_lower') {
    const sessions = Math.min(Math.max(freq, 4), 4);
    const { weekdays, warning } = assignWeekdays(
      sessions,
      preferred,
      index.routine.variableSchedule
    );
    if (warning) warnings.push(warning);
    pushDay(0, weekdays[0], 'upper_A', upperSlots('A', 0));
    pushDay(1, weekdays[1], 'lower_A', lowerSlots('A', 1));
    pushDay(2, weekdays[2], 'upper_B', upperSlots('B', 2));
    pushDay(3, weekdays[3], 'lower_B', lowerSlots('B', 3));
  } else if (strategy === 'upper_lower_plus') {
    const sessions = Math.min(Math.max(freq, 5), 5);
    const { weekdays, warning } = assignWeekdays(
      sessions,
      preferred,
      index.routine.variableSchedule
    );
    if (warning) warnings.push(warning);
    pushDay(0, weekdays[0], 'upper_A', upperSlots('A', 0));
    pushDay(1, weekdays[1], 'lower_A', lowerSlots('A', 1));
    pushDay(2, weekdays[2], 'upper_B', upperSlots('B', 2));
    pushDay(3, weekdays[3], 'lower_B', lowerSlots('B', 3));
    pushDay(4, weekdays[4], 'full_body_C', fullBodySlots('C', 4));
  } else if (strategy === 'push_pull_lower_plus') {
    const sessions = Math.min(Math.max(freq, 5), 6);
    const { weekdays, warning } = assignWeekdays(
      sessions,
      preferred,
      index.routine.variableSchedule
    );
    if (warning) warnings.push(warning);
    pushDay(0, weekdays[0], 'push', upperSlots('A', 0).filter((s) => !s.slotId.includes('_bi')));
    pushDay(1, weekdays[1], 'pull', [
      slot(`d1_hpull`, 'primary_compound', ['horizontal_pull'], ['lats']),
      slot(`d1_vpull`, 'primary_compound', ['vertical_pull'], ['lats']),
      slot(`d1_hinge`, 'secondary_compound', ['hip_hinge'], ['hamstrings']),
      slot(`d1_bi`, 'accessory', ['elbow_flexion'], ['biceps'], false),
    ]);
    pushDay(2, weekdays[2], 'lower', lowerSlots('A', 2));
    if (sessions >= 4) pushDay(3, weekdays[3], 'push_B', upperSlots('B', 3));
    if (sessions >= 5) pushDay(4, weekdays[4], 'pull_B', fullBodySlots('B', 4));
    if (sessions >= 6) pushDay(5, weekdays[5], 'lower_B', lowerSlots('B', 5));
  } else {
    // fallback conservador
    const { weekdays, warning } = assignWeekdays(freq, preferred, index.routine.variableSchedule);
    if (warning) warnings.push(warning);
    for (let i = 0; i < freq; i++) {
      const v = (['A', 'B', 'C'] as const)[i % 3];
      pushDay(i, weekdays[i], `full_body_${v}`, fullBodySlots(v, i));
    }
  }

  // Trim à frequência real se template gerou mais
  const trimmed = templates.slice(0, freq);

  return {
    templates: trimmed,
    splitStrategy: strategy,
    unsupportedSplit: false,
    warnings,
  };
}
