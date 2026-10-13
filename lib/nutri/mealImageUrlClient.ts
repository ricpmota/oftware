/**
 * Cliente da signed URL da foto do prato.
 * Cache in-memory + inflight compartilhado (Strict Mode).
 * Nunca chama geração.
 */

import {
  MEAL_IMAGE_URL_API_PATH,
  mealDishImageUrlCacheKey,
  shouldFetchMealDishImageUrl,
} from '@/lib/nutri/mealImageDisplay';
import type { MealImageRecord } from '@/lib/nutri/mealImageSource';

const urlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

export type MealDishImageUrlRequest = {
  patientId: string;
  refeicaoKey: string;
  slotId: string;
  sourceHash: string;
  gcsPath?: string;
  generatedAt?: string;
};

export type FetchMealDishImageUrlDeps = {
  getToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

export function peekMealDishImageUrlCache(key: string): string | undefined {
  return urlCache.get(key);
}

export function clearMealDishImageUrlCache(): void {
  urlCache.clear();
  inflight.clear();
}

export function rememberMealDishImageUrl(key: string, imageUrl: string): void {
  if (key && imageUrl) urlCache.set(key, imageUrl);
}

export async function fetchMealDishImageUrl(
  request: MealDishImageUrlRequest,
  deps: FetchMealDishImageUrlDeps
): Promise<string | null> {
  const key = mealDishImageUrlCacheKey(request);
  const cached = urlCache.get(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const run = (async () => {
    const fetchImpl = deps.fetchImpl || fetch;
    const token = await deps.getToken();
    if (!token) return null;

    const params = new URLSearchParams({
      patientId: request.patientId,
      refeicaoKey: request.refeicaoKey,
      slotId: request.slotId,
    });
    const res = await fetchImpl(`${MEAL_IMAGE_URL_API_PATH}?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: deps.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; imageUrl?: string | null };
    const imageUrl =
      typeof json.imageUrl === 'string' && json.imageUrl.trim() ? json.imageUrl.trim() : null;
    if (imageUrl) urlCache.set(key, imageUrl);
    return imageUrl;
  })();

  inflight.set(key, run);
  try {
    return await run;
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'AbortError') return null;
    return null;
  } finally {
    inflight.delete(key);
  }
}

export function canRequestMealDishImageUrl(params: {
  mealImage?: MealImageRecord | null;
  currentSourceHash: string;
}): boolean {
  return shouldFetchMealDishImageUrl(params);
}
