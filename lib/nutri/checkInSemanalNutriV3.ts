import {
  NUTRITION_WEEKDAY_KEYS,
  type NutritionWeekdayKey,
} from '@/lib/nutri/checkInSemanalNutriWeek';

export const DAILY_ADHERENCE_POINTS = {
  good: 100,
  regular: 60,
  bad: 20,
} as const;

export const MEAL_ADHERENCE_POINTS = {
  followed: 100,
  partial: 70,
  substituted: 80,
  skipped: 40,
  not_followed: 20,
} as const;

export const HYDRATION_QUALITY_POINTS = {
  excellent: 100,
  good: 80,
  regular: 50,
  poor: 20,
} as const;

export type DailyAdherenceRating = keyof typeof DAILY_ADHERENCE_POINTS;
export type MealAdherenceStatus = keyof typeof MEAL_ADHERENCE_POINTS;
export type HydrationQuality = keyof typeof HYDRATION_QUALITY_POINTS;

export type CheckInDailyAdherence = Record<NutritionWeekdayKey, DailyAdherenceRating>;

export type CheckInMenuFood = {
  id: string;
  label: string;
  display: string;
  alimentoGlobalId?: string;
};

export type CheckInMenuMeal = {
  mealId: string;
  mealLabel: string;
  foods: CheckInMenuFood[];
};

export type CheckInMenuContext = {
  aguaDia_ml?: number;
  meals: CheckInMenuMeal[];
};

export type CheckInMenuSnapshot = CheckInMenuContext & {
  capturedAt: string;
};

export type CheckInMealSubstitution = {
  foodId: string;
  foodLabel: string;
  replacementText?: string;
};

export type CheckInMealAdherenceItem = {
  mealId: string;
  mealLabel: string;
  status: MealAdherenceStatus;
  skippedDays?: NutritionWeekdayKey[];
  missingFoods?: Array<{ foodId: string; foodLabel: string }>;
  substitutions?: CheckInMealSubstitution[];
};

export type CheckInFoodSwapReason =
  | 'dislike'
  | 'tired_of'
  | 'hard_to_find'
  | 'expensive'
  | 'hard_to_prepare'
  | 'hard_to_take'
  | 'does_not_sit_well'
  | 'no_appetite'
  | 'other';

export type CheckInFoodSwapRequest = {
  mealId: string;
  mealLabel: string;
  foodId: string;
  foodLabel: string;
  reason: CheckInFoodSwapReason;
  reasonOther?: string;
  desiredReplacement?: string;
};

export const FOOD_SWAP_REASON_OPTIONS: Array<{ value: CheckInFoodSwapReason; label: string }> = [
  { value: 'dislike', label: 'Não gosto' },
  { value: 'tired_of', label: 'Enjoei' },
  { value: 'hard_to_find', label: 'Difícil encontrar' },
  { value: 'expensive', label: 'Muito caro' },
  { value: 'hard_to_prepare', label: 'Difícil preparar' },
  { value: 'hard_to_take', label: 'Difícil levar comigo' },
  { value: 'does_not_sit_well', label: 'Não me faz bem' },
  { value: 'no_appetite', label: 'Não tenho vontade de comer' },
  { value: 'other', label: 'Outro' },
];

export const MEAL_ADHERENCE_STATUS_OPTIONS: Array<{ value: MealAdherenceStatus; label: string }> = [
  { value: 'followed', label: 'Segui como planejado' },
  { value: 'partial', label: 'Segui parcialmente' },
  { value: 'substituted', label: 'Fiz substituições' },
  { value: 'skipped', label: 'Pulei esta refeição algumas vezes' },
  { value: 'not_followed', label: 'Não consegui seguir' },
];

export const HYDRATION_QUALITY_OPTIONS: Array<{ value: HydrationQuality; label: string }> = [
  { value: 'excellent', label: 'Muito boa' },
  { value: 'good', label: 'Boa' },
  { value: 'regular', label: 'Regular' },
  { value: 'poor', label: 'Ruim' },
];

export const DAILY_ADHERENCE_OPTIONS: Array<{ value: DailyAdherenceRating; label: string; helper: string }> = [
  { value: 'good', label: 'Boa', helper: 'Consegui seguir bem meu planejamento.' },
  { value: 'regular', label: 'Regular', helper: 'Segui parcialmente ou tive alguns desvios.' },
  { value: 'bad', label: 'Ruim', helper: 'Tive bastante dificuldade em seguir o planejamento.' },
];

export function isDailyAdherenceRating(value: unknown): value is DailyAdherenceRating {
  return value === 'good' || value === 'regular' || value === 'bad';
}

export function isCompleteDailyAdherence(value: unknown): value is CheckInDailyAdherence {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return NUTRITION_WEEKDAY_KEYS.every((key) => isDailyAdherenceRating(row[key]));
}

export function deriveAdherenceFromDaily(daily: CheckInDailyAdherence): {
  aderenciaPlano: number;
  diasBons: number;
  diasRegulares: number;
  diasRuins: number;
} {
  const values = NUTRITION_WEEKDAY_KEYS.map((key) => daily[key]);
  const total = values.reduce((sum, rating) => sum + DAILY_ADHERENCE_POINTS[rating], 0);
  return {
    aderenciaPlano: Math.round(total / values.length),
    diasBons: values.filter((v) => v === 'good').length,
    diasRegulares: values.filter((v) => v === 'regular').length,
    diasRuins: values.filter((v) => v === 'bad').length,
  };
}

export function mealAdherenceAverage(items: CheckInMealAdherenceItem[]): number | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + MEAL_ADHERENCE_POINTS[item.status], 0);
  return Math.round(total / items.length);
}

export function weekdayAdherenceAverage(daily: CheckInDailyAdherence): number {
  const keys: NutritionWeekdayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const total = keys.reduce((sum, key) => sum + DAILY_ADHERENCE_POINTS[daily[key]], 0);
  return Math.round(total / keys.length);
}

export function weekendAdherenceAverage(daily: CheckInDailyAdherence): number {
  return Math.round((DAILY_ADHERENCE_POINTS[daily.saturday] + DAILY_ADHERENCE_POINTS[daily.sunday]) / 2);
}

export function worstDailyAdherenceDays(daily: CheckInDailyAdherence): NutritionWeekdayKey[] {
  const min = Math.min(...NUTRITION_WEEKDAY_KEYS.map((key) => DAILY_ADHERENCE_POINTS[daily[key]]));
  return NUTRITION_WEEKDAY_KEYS.filter((key) => DAILY_ADHERENCE_POINTS[daily[key]] === min);
}

export function bestDailyAdherenceDays(daily: CheckInDailyAdherence): NutritionWeekdayKey[] {
  const max = Math.max(...NUTRITION_WEEKDAY_KEYS.map((key) => DAILY_ADHERENCE_POINTS[daily[key]]));
  return NUTRITION_WEEKDAY_KEYS.filter((key) => DAILY_ADHERENCE_POINTS[daily[key]] === max);
}

export function hasWeekendAdherenceProblem(daily: CheckInDailyAdherence): boolean {
  const weekendBad = [daily.saturday, daily.sunday].filter((v) => v === 'bad').length;
  const weekdayBad = (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as NutritionWeekdayKey[]).filter(
    (key) => daily[key] === 'bad'
  ).length;
  return weekendBad >= 1 && weekendBad >= weekdayBad && weekendAdherenceAverage(daily) <= 60;
}

export function rotuloDailyAdherence(value: DailyAdherenceRating): string {
  return DAILY_ADHERENCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function rotuloMealAdherence(value: MealAdherenceStatus): string {
  return MEAL_ADHERENCE_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function rotuloHydrationQuality(value: HydrationQuality): string {
  return HYDRATION_QUALITY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function rotuloFoodSwapReason(value: CheckInFoodSwapReason, other?: string): string {
  if (value === 'other') return other?.trim() || 'Outro';
  return FOOD_SWAP_REASON_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
