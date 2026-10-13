/**
 * Decisão de apresentação da foto do prato (client-safe).
 * Sem geração. Sem signed URL persistida.
 */

import {
  parseMealImageRecord,
  type MealImageRecord,
  type MealImageStatus,
} from '@/lib/nutri/mealImageSource';
import { isMealImageSignableCurrent } from '@/lib/nutri/mealImageSlot';

export const MEAL_IMAGE_URL_API_PATH = '/api/nutri/meal-image';
export const MEAL_IMAGE_FILE_API_PATH = '/api/nutri/meal-image/file';

export type MealDishImageMode = 'photo' | 'loading' | 'placeholder';

export function mealDishImageAlt(mealName: string): string {
  const nome = String(mealName || '').trim() || 'refeição';
  const lower = nome.toLowerCase();
  if (lower === 'almoço' || lower === 'almoco') return 'Imagem ilustrativa do almoço';
  if (lower === 'jantar' || lower === 'janta') return 'Imagem ilustrativa do jantar';
  return `Imagem ilustrativa de ${nome}`;
}

export function mealDishImageInstanceKey(params: {
  patientId: string;
  refeicaoKey: string;
  slotId: string;
  gcsPath?: string;
  generatedAt?: string;
}): string {
  const version = String(params.gcsPath || params.generatedAt || '').trim();
  return version
    ? `${params.patientId}:${params.refeicaoKey}:${params.slotId}:${version}`
    : `${params.patientId}:${params.refeicaoKey}:${params.slotId}`;
}

export function mealDishImageUrlCacheKey(params: {
  patientId: string;
  refeicaoKey: string;
  slotId: string;
  sourceHash: string;
  gcsPath?: string;
  generatedAt?: string;
}): string {
  const version = String(params.gcsPath || params.generatedAt || '').trim();
  return `${params.patientId}:${params.refeicaoKey}:${params.slotId}:${params.sourceHash}:${version}`;
}

/** Só busca signed URL quando a foto representa o prato atual (ready ou pending com gcsPath). */
export function shouldFetchMealDishImageUrl(params: {
  mealImage?: MealImageRecord | null;
  currentSourceHash: string;
}): boolean {
  const mealImage = parseMealImageRecord(params.mealImage) || params.mealImage || undefined;
  const currentHash = String(params.currentSourceHash || '').trim();
  return isMealImageSignableCurrent(mealImage, currentHash);
}

export function mealDishImageMode(params: {
  mealImage?: MealImageRecord | null;
  currentSourceHash: string;
  imageUrl?: string | null;
  loading?: boolean;
}): MealDishImageMode {
  if (shouldFetchMealDishImageUrl(params)) {
    if (params.imageUrl) return 'photo';
    if (params.loading) return 'loading';
    return 'placeholder';
  }
  const mealImage = parseMealImageRecord(params.mealImage) || params.mealImage || undefined;
  const currentHash = String(params.currentSourceHash || '').trim();
  if (
    mealImage?.status === 'pending' &&
    (!mealImage.sourceHash || !currentHash || mealImage.sourceHash === currentHash)
  ) {
    return 'loading';
  }
  return 'placeholder';
}

export function mealImageStatusForDisplay(
  mealImage?: MealImageRecord | null
): MealImageStatus | null {
  const record = parseMealImageRecord(mealImage) || mealImage || undefined;
  return record?.status || null;
}
