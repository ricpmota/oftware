import type { CheckInSemanalNutriAnswers } from '@/lib/nutri/checkInSemanalNutriTypes';
import {
  deriveAdherenceFromDaily,
  isCompleteDailyAdherence,
  type CheckInFoodSwapRequest,
  type CheckInMealAdherenceItem,
  type CheckInMenuContext,
  type MealAdherenceStatus,
} from '@/lib/nutri/checkInSemanalNutriV3';

const MEAL_STATUS: MealAdherenceStatus[] = [
  'followed',
  'partial',
  'substituted',
  'skipped',
  'not_followed',
];

export function finalizeCheckInSemanalNutriV3Answers(
  answers: CheckInSemanalNutriAnswers,
  menuContext?: CheckInMenuContext | null
): CheckInSemanalNutriAnswers {
  const daily = answers.dailyAdherence;
  const derived = daily && isCompleteDailyAdherence(daily) ? deriveAdherenceFromDaily(daily) : null;
  const mealsById = new Map((menuContext?.meals || []).map((meal) => [meal.mealId, meal]));

  const mealAdherence = (answers.mealAdherence || [])
    .map((item) => sanitizeMeal(item, mealsById.get(item.mealId)))
    .filter((item): item is CheckInMealAdherenceItem => Boolean(item));

  const foodSwapRequests = (answers.foodSwapRequests || [])
    .map((item) => sanitizeSwap(item, mealsById.get(item.mealId)))
    .filter((item): item is CheckInFoodSwapRequest => Boolean(item));

  const next: CheckInSemanalNutriAnswers = {
    ...answers,
    aderenciaPlano: derived?.aderenciaPlano ?? 0,
    diasBons: derived?.diasBons,
    diasRegulares: derived?.diasRegulares,
    diasRuins: derived?.diasRuins,
    mealAdherence: menuContext && menuContext.meals.length > 0 ? mealAdherence : undefined,
    foodSwapRequests: foodSwapRequests.length > 0 ? foodSwapRequests : undefined,
    menuSnapshot: menuContext
      ? {
          capturedAt: new Date().toISOString(),
          meals: menuContext.meals,
          ...(menuContext.aguaDia_ml != null ? { aguaDia_ml: menuContext.aguaDia_ml } : {}),
        }
      : answers.menuSnapshot,
  };

  delete next.diasProteinaMeta;
  delete next.diasFrutasVegetais;
  delete next.diasMetaAgua;
  delete next.alimentacaoForaPlano;
  return next;
}

function sanitizeMeal(
  item: CheckInMealAdherenceItem,
  meal?: CheckInMenuContext['meals'][number]
): CheckInMealAdherenceItem | null {
  if (!meal || !MEAL_STATUS.includes(item.status)) return null;
  const foodsById = new Map(meal.foods.map((food) => [food.id, food]));
  const sanitized: CheckInMealAdherenceItem = {
    mealId: meal.mealId,
    mealLabel: meal.mealLabel,
    status: item.status,
  };
  if (item.status === 'skipped' && item.skippedDays?.length) {
    sanitized.skippedDays = item.skippedDays;
  }
  if (item.status === 'partial' && item.missingFoods?.length) {
    sanitized.missingFoods = item.missingFoods
      .map((food) => foodsById.get(food.foodId))
      .filter(Boolean)
      .map((food) => ({ foodId: food!.id, foodLabel: food!.label }));
  }
  if (item.status === 'substituted' && item.substitutions?.length) {
    sanitized.substitutions = item.substitutions
      .map((sub) => {
        const food = foodsById.get(sub.foodId);
        if (!food) return null;
        return {
          foodId: food.id,
          foodLabel: food.label,
          ...(sub.replacementText?.trim() ? { replacementText: sub.replacementText.trim() } : {}),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }
  return sanitized;
}

function sanitizeSwap(
  item: CheckInFoodSwapRequest,
  meal?: CheckInMenuContext['meals'][number]
): CheckInFoodSwapRequest | null {
  if (!meal) return null;
  const food = meal.foods.find((row) => row.id === item.foodId);
  if (!food) return null;
  if (item.reason === 'other' && !String(item.reasonOther || '').trim()) return null;
  return {
    mealId: meal.mealId,
    mealLabel: meal.mealLabel,
    foodId: food.id,
    foodLabel: food.label,
    reason: item.reason,
    ...(item.reason === 'other' && item.reasonOther ? { reasonOther: item.reasonOther.trim() } : {}),
    ...(item.desiredReplacement?.trim() ? { desiredReplacement: item.desiredReplacement.trim() } : {}),
  };
}
