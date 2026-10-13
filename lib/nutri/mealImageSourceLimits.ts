/**
 * Limites defensivos da composição enviada ao Vertex.
 * Não trunca ingredientes: se exceder, a geração é recusada.
 */

import {
  buildMealImageSource,
  type MealImageSourceOption,
} from '@/lib/nutri/mealImageSource';

export const MEAL_IMAGE_MAX_SOURCE_CHARS = 4000;
export const MEAL_IMAGE_MAX_SOURCE_ITEMS = 40;
export const MEAL_IMAGE_MAX_PROMPT_CHARS = 12_000;
export const MEAL_COMPOSITION_TOO_LARGE = 'MEAL_COMPOSITION_TOO_LARGE';

export function mealImageSourceItemCount(option: MealImageSourceOption | null | undefined): number {
  if (!option || !Array.isArray(option.itensDetalhe)) return 0;
  return option.itensDetalhe.filter((item) => item && String(item.nome || '').trim()).length;
}

export function assertMealImageSourceWithinLimits(
  option: MealImageSourceOption | null | undefined
): { ok: true; source: string } | { ok: false; code: typeof MEAL_COMPOSITION_TOO_LARGE } {
  const source = buildMealImageSource(option);
  if (!source) return { ok: true, source: '' };
  if (source.length > MEAL_IMAGE_MAX_SOURCE_CHARS) {
    return { ok: false, code: MEAL_COMPOSITION_TOO_LARGE };
  }
  if (mealImageSourceItemCount(option) > MEAL_IMAGE_MAX_SOURCE_ITEMS) {
    return { ok: false, code: MEAL_COMPOSITION_TOO_LARGE };
  }
  return { ok: true, source };
}
