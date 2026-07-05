import { describe, expect, it } from 'vitest';
import {
  generatePrescriptionValidationCode,
  isValidPrescriptionValidationCode,
  normalizePrescriptionValidationCodeInput,
} from '@/lib/signature/prescriptionValidationCode';

describe('prescriptionValidationCode', () => {
  it('generatePrescriptionValidationCode usa prefixo OFTW-RE-', () => {
    const code = generatePrescriptionValidationCode();
    expect(code).toMatch(/^OFTW-RE-[A-Z2-9]{8}$/);
  });

  it('normalize aceita código completo ou sufixo', () => {
    expect(normalizePrescriptionValidationCodeInput('OFTW-RE-4HEWEVWW')).toBe('OFTW-RE-4HEWEVWW');
    expect(normalizePrescriptionValidationCodeInput('4HEWEVWW')).toBe('OFTW-RE-4HEWEVWW');
  });

  it('isValidPrescriptionValidationCode', () => {
    expect(isValidPrescriptionValidationCode('OFTW-RE-4HEWEVWW')).toBe(true);
    expect(isValidPrescriptionValidationCode('invalid')).toBe(false);
  });
});
