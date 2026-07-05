import { randomBytes } from 'node:crypto';

/** Alfabeto legível (sem I, L, O, U, 0, 1) — mesmo critério das prescrições. */
const VALIDATION_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const CONTRATO_TRATAMENTO_VALIDATION_CODE_PREFIX = 'OFTW-CT-';

const FULL_CODE_RE = /^OFTW-CT-[A-Z2-9]{8}$/;

export function generateContratoTratamentoValidationCodeSuffix(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += VALIDATION_CODE_CHARSET[bytes[i]! % VALIDATION_CODE_CHARSET.length]!;
  }
  return out;
}

export function generateContratoTratamentoValidationCode(): string {
  return `${CONTRATO_TRATAMENTO_VALIDATION_CODE_PREFIX}${generateContratoTratamentoValidationCodeSuffix(8)}`;
}

export function normalizeContratoTratamentoValidationCodeInput(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!trimmed) return null;

  if (FULL_CODE_RE.test(trimmed)) return trimmed;

  const suffixOnly = trimmed.replace(/^OFTW-?CT-?/i, '');
  if (/^[A-Z2-9]{8}$/.test(suffixOnly)) {
    return `${CONTRATO_TRATAMENTO_VALIDATION_CODE_PREFIX}${suffixOnly}`;
  }

  return null;
}

export function isValidContratoTratamentoValidationCode(code: string): boolean {
  return FULL_CODE_RE.test(code.trim().toUpperCase());
}
