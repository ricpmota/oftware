/**
 * Rate limit in-memory por uid autenticado.
 * Só deve contar tentativas que iriam adquirir lock / chamar Vertex.
 * already_current e already_pending não usam isto.
 *
 * 40 / 10 min: fila automática de um cardápio (≤25 slots) cabe; reload de ready não conta.
 */

const WINDOW_MS = 10 * 60 * 1000;
export const MEAL_IMAGE_GENERATE_RATE_MAX = 40;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const MEAL_IMAGE_RATE_LIMITED = 'MEAL_IMAGE_RATE_LIMITED';

export function mealImageGenerateRateLimited(uid: string, now = Date.now()): boolean {
  const key = String(uid || '').trim();
  if (!key) return false;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MEAL_IMAGE_GENERATE_RATE_MAX;
}

export function resetMealImageGenerateRateLimitForTests(): void {
  buckets.clear();
}
