import { createHmac, timingSafeEqual } from 'crypto';

export const CARPLAY_COOKIE = 'oftpay_carplay';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export function carplaySessionSecret(): string {
  const dedicated = process.env.OFTPAY_CARPLAY_SECRET?.trim();
  if (dedicated) return dedicated;
  const key = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';
  return key.replace(/\\n/g, '\n').trim();
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function signCarplaySession(
  email: string,
  secret: string,
  now = Date.now(),
  displayName?: string | null
): string {
  const payload = Buffer.from(
    JSON.stringify({
      email: email.trim().toLowerCase(),
      name: displayName?.trim() || null,
      exp: now + SESSION_MS,
    }),
    'utf8'
  ).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyCarplaySession(
  token: string | undefined,
  secret: string,
  now = Date.now()
): { email: string; displayName: string | null } | null {
  if (!token || !secret) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = sign(payload, secret);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: unknown;
      name?: unknown;
      exp?: unknown;
    };
    if (typeof data.email !== 'string' || !data.email.includes('@')) return null;
    if (typeof data.exp !== 'number' || data.exp < now) return null;
    return { email: data.email, displayName: typeof data.name === 'string' ? data.name : null };
  } catch {
    return null;
  }
}
