import crypto from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';

/** Sem 0/O/1/I para reduzir erro ao copiar o link. 32 símbolos: 256 % 32 === 0 (sem viés). */
export const PUBLIC_LINK_TOKEN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const PUBLIC_LINK_TOKEN_LENGTH = 8;

const SHORT_TOKEN_RE = new RegExp(
  `^[${PUBLIC_LINK_TOKEN_ALPHABET}]{${PUBLIC_LINK_TOKEN_LENGTH}}$`
);
const SHORT_TOKEN_RE_I = new RegExp(
  `^[${PUBLIC_LINK_TOKEN_ALPHABET}]{${PUBLIC_LINK_TOKEN_LENGTH}}$`,
  'i'
);
const LEGACY_HEX_TOKEN_RE = /^[0-9a-f]{16,}$/i;

export function generatePublicLinkToken(): string {
  const bytes = crypto.randomBytes(PUBLIC_LINK_TOKEN_LENGTH);
  let token = '';
  for (let i = 0; i < PUBLIC_LINK_TOKEN_LENGTH; i++) {
    token += PUBLIC_LINK_TOKEN_ALPHABET[bytes[i]! % PUBLIC_LINK_TOKEN_ALPHABET.length];
  }
  return token;
}

/** Tokens novos são maiúsculos; hex legado permanece como veio. */
export function normalizePublicLinkToken(raw: string): string {
  const token = String(raw || '').trim();
  if (SHORT_TOKEN_RE_I.test(token)) return token.toUpperCase();
  return token;
}

export function isValidPublicLinkToken(raw: string): boolean {
  const token = normalizePublicLinkToken(raw);
  return SHORT_TOKEN_RE.test(token) || LEGACY_HEX_TOKEN_RE.test(token);
}

export function isShortPublicLinkToken(raw: string): boolean {
  return SHORT_TOKEN_RE.test(normalizePublicLinkToken(raw));
}

export function publicLinkTokensMatch(a: string, b: string): boolean {
  const left = normalizePublicLinkToken(a);
  const right = normalizePublicLinkToken(b);
  return Boolean(left) && left === right;
}

function isAlreadyExistsError(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS';
}

export async function allocateUniquePublicLinkToken(
  db: Firestore,
  collection: string,
  payload: Record<string, unknown>,
  maxAttempts = 8
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = generatePublicLinkToken();
    try {
      await db.collection(collection).doc(token).create(payload);
      return token;
    } catch (error) {
      if (!isAlreadyExistsError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }
  throw new Error(`Falha ao gerar token único em ${collection}`);
}
