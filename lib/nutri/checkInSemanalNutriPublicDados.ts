import type { CheckInMenuContext } from '@/lib/nutri/checkInSemanalNutriV3';
import { formatNutritionWeekLongLabel, type NutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { primeiroNomePublico } from '@/lib/nutri/checkInSemanalNutriPublicLink';

export type NutriCheckInPublicDados = {
  valid: true;
  alreadyCompleted: boolean;
  patient: { firstName: string };
  week: {
    weekKey: string;
    weekStart: string;
    weekEnd: string;
    label: string;
  };
  nutritionist: { displayName: string };
  context: {
    aguaDia_ml?: number;
    menu?: CheckInMenuContext;
  };
  score?: number;
};

export function buildNutriCheckInPublicDados(input: {
  week: NutritionWeek;
  patientName?: string | null;
  nutritionistName?: string | null;
  aguaDia_ml?: number | null;
  menu?: CheckInMenuContext | null;
  alreadyCompleted: boolean;
  score?: number | null;
}): NutriCheckInPublicDados {
  const firstName = primeiroNomePublico(input.patientName);
  const agua =
    typeof input.aguaDia_ml === 'number' && Number.isFinite(input.aguaDia_ml) && input.aguaDia_ml > 0
      ? Math.round(input.aguaDia_ml)
      : undefined;

  const payload: NutriCheckInPublicDados = {
    valid: true,
    alreadyCompleted: input.alreadyCompleted,
    patient: { firstName },
    week: {
      weekKey: input.week.weekKey,
      weekStart: input.week.weekStart,
      weekEnd: input.week.weekEnd,
      label: formatNutritionWeekLongLabel(input.week),
    },
    nutritionist: {
      displayName: String(input.nutritionistName || '').trim(),
    },
    context: {},
  };

  if (agua != null) payload.context.aguaDia_ml = agua;
  if (input.menu && input.menu.meals.length > 0) payload.context.menu = input.menu;
  if (input.alreadyCompleted && typeof input.score === 'number' && Number.isFinite(input.score)) {
    payload.score = input.score;
  }

  return payload;
}
