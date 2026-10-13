/**
 * Sugestões de consumo para o check-in externo, em torno da meta do dia.
 * Não usa valores fixos desconectados de aguaDia_ml / goalMl.
 */

import { HYDRATION_MAX_DAILY_ML } from '@/lib/nutri/hidratacao/hydrationTypes';

const FRACTIONS = [0.4, 0.6, 0.8, 1, 1.2] as const;

function roundToNiceMl(ml: number): number {
  if (!Number.isFinite(ml) || ml <= 0) return 0;
  const step = ml >= 2000 ? 100 : 50;
  return Math.max(step, Math.round(ml / step) * step);
}

/**
 * Cinco atalhos em torno da meta (≈ 40–120%), arredondados.
 * A meta real continua sendo exibida à parte (ex.: 2.503 ml).
 */
export function hydrationCheckInQuickAmounts(goalMl: number): number[] {
  const goal = Math.round(goalMl);
  if (!Number.isFinite(goal) || goal <= 0) {
    return [1000, 1500, 2000, 2500, 3000];
  }

  const rounded = new Set<number>();
  for (const fraction of FRACTIONS) {
    const value = roundToNiceMl(goal * fraction);
    if (value > 0 && value <= HYDRATION_MAX_DAILY_ML) rounded.add(value);
  }

  const goalNice = roundToNiceMl(goal);
  if (goalNice > 0 && goalNice <= HYDRATION_MAX_DAILY_ML) rounded.add(goalNice);

  let amounts = [...rounded].sort((a, b) => a - b);
  let step = goal >= 2000 ? 500 : 250;
  while (amounts.length < 5) {
    const last = amounts[amounts.length - 1] ?? goalNice;
    const next = Math.min(HYDRATION_MAX_DAILY_ML, last + step);
    if (next <= last || amounts.includes(next)) {
      step = Math.max(100, Math.floor(step / 2));
      if (step < 50) break;
      continue;
    }
    amounts.push(next);
    amounts.sort((a, b) => a - b);
  }

  if (amounts.length > 5) {
    const goalIndex = amounts.indexOf(goalNice);
    if (goalIndex >= 0) {
      const start = Math.max(0, Math.min(goalIndex - 2, amounts.length - 5));
      amounts = amounts.slice(start, start + 5);
      if (!amounts.includes(goalNice)) {
        amounts[Math.min(3, amounts.length - 1)] = goalNice;
        amounts = [...new Set(amounts)].sort((a, b) => a - b).slice(0, 5);
      }
    } else {
      amounts = amounts.slice(0, 5);
    }
  }

  return amounts;
}

export function hydrationCheckInAmountClosestToGoal(amounts: number[], goalMl: number): number | null {
  if (!amounts.length || !(goalMl > 0)) return null;
  return amounts.reduce((best, ml) => (Math.abs(ml - goalMl) < Math.abs(best - goalMl) ? ml : best));
}

export function hydrationCheckInStartStep(days: Array<{ registered: boolean }>): number | 'done' {
  const index = days.findIndex((day) => !day.registered);
  return index < 0 ? 'done' : index;
}
