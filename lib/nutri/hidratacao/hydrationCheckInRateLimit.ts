/**
 * Rate limit in-memory por instância (IP + credencial do token).
 * Em serverless o mapa não é global — ainda reduz abuso no mesmo isolate.
 * Resposta ao exceder deve ser genérica (não revelar se o token existe).
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 40;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function hydrationCheckInClientKey(request: { headers: { get(name: string): string | null } }): string {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown';
  return ip;
}

export function hydrationCheckInRateLimited(ip: string, credential: string, now = Date.now()): boolean {
  const key = `${ip}:${credential.slice(0, 80)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_HITS;
}

/** Só para testes. */
export function resetHydrationCheckInRateLimitForTests() {
  buckets.clear();
}
