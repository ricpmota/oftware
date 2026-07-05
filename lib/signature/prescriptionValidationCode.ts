import { randomBytes } from 'node:crypto';

/** Alfabeto legível (sem I, L, O, U, 0, 1). */
const VALIDATION_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const PRESCRIPTION_VALIDATION_CODE_PREFIX = 'OFTW-RE-';

const FULL_CODE_RE = /^OFTW-RE-[A-Z2-9]{8}$/;

export function generatePrescriptionValidationCodeSuffix(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += VALIDATION_CODE_CHARSET[bytes[i]! % VALIDATION_CODE_CHARSET.length]!;
  }
  return out;
}

export function generatePrescriptionValidationCode(): string {
  return `${PRESCRIPTION_VALIDATION_CODE_PREFIX}${generatePrescriptionValidationCodeSuffix(8)}`;
}

/** Normaliza entrada do farmacêutico (aceita com ou sem prefixo). */
export function normalizePrescriptionValidationCodeInput(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!trimmed) return null;

  if (FULL_CODE_RE.test(trimmed)) return trimmed;

  const suffixOnly = trimmed.replace(/^OFTW-?RE-?/i, '');
  if (/^[A-Z2-9]{8}$/.test(suffixOnly)) {
    return `${PRESCRIPTION_VALIDATION_CODE_PREFIX}${suffixOnly}`;
  }

  return null;
}

export function isValidPrescriptionValidationCode(code: string): boolean {
  return FULL_CODE_RE.test(code.trim().toUpperCase());
}
