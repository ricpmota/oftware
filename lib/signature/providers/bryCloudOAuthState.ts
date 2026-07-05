import { createHmac, timingSafeEqual } from 'crypto';

export type BryOAuthStatePayload = {
  medicoId: string;
  returnUrl?: string;
  nonce: string;
  ts: number;
  /** PSC selecionado no perfil (ex.: safeid) — usado no callback. */
  pscProvider?: string;
};

function encodePayload(payload: BryOAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(encoded: string): BryOAuthStatePayload | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as BryOAuthStatePayload;
    if (!parsed?.medicoId || !parsed?.nonce) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** State assinado (medicoId + CSRF) para callback OAuth. */
export function signBryOAuthState(payload: BryOAuthStatePayload, secret: string): string {
  const body = encodePayload(payload);
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyBryOAuthState(
  state: string,
  secret: string,
  maxAgeMs = 60 * 60 * 1000
): BryOAuthStatePayload | null {
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const payload = decodePayload(body);
  if (!payload) return null;
  if (Date.now() - payload.ts > maxAgeMs) return null;
  return payload;
}

export function createBryOAuthStatePayload(
  medicoId: string,
  returnUrl?: string,
  pscProvider?: string
): BryOAuthStatePayload {
  const payload: BryOAuthStatePayload = {
    medicoId: medicoId.trim(),
    returnUrl: returnUrl?.trim() || undefined,
    nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
    ts: Date.now(),
  };
  const psc = pscProvider?.trim();
  if (psc) payload.pscProvider = psc;
  return payload;
}
