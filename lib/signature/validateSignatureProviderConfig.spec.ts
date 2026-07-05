import { describe, expect, it } from 'vitest';
import { CLOUD_ONLY_SIGNATURE_ERROR } from '@/lib/signature/cloudOnlySignatureConstants';
import { DIGITAL_SIGNATURE_NOT_CONNECTED_MESSAGE } from '@/lib/signature/digitalSignatureMessages';
import {
  evaluateDoctorSignatureEligibility,
  validateSignatureProviderConfig,
} from '@/lib/signature/validateSignatureProviderConfig';

describe('validateSignatureProviderConfig', () => {
  it('rejeita none e vazio', () => {
    expect(validateSignatureProviderConfig('none').valid).toBe(false);
    expect(validateSignatureProviderConfig(null).valid).toBe(false);
  });

  it('aceita provedor conhecido', () => {
    const r = validateSignatureProviderConfig('vidas_valid');
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.provider).toBe('vidas_valid');
      expect(r.providerCategory).toBe('cloud_certificate');
    }
  });

  it('rejeita certificado físico (token A3)', () => {
    const r = validateSignatureProviderConfig('token_a3');
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.reason).toBe(CLOUD_ONLY_SIGNATURE_ERROR);
    }
  });

  it('exige nome em other', () => {
    const r = validateSignatureProviderConfig({
      provider: 'other',
      providerLabel: '',
      providerCategory: 'other',
      status: 'selected_pending_integration',
    });
    expect(r.valid).toBe(false);
  });
});

describe('evaluateDoctorSignatureEligibility', () => {
  it('bloqueia quando status não é connected', () => {
    const r = evaluateDoctorSignatureEligibility({
      provider: 'vidas_valid',
      providerLabel: 'VIDaaS / Valid',
      providerCategory: 'cloud_certificate',
      status: 'selected_pending_integration',
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.message).toBe(DIGITAL_SIGNATURE_NOT_CONNECTED_MESSAGE);
    }
  });

  it('permite quando connected', () => {
    const r = evaluateDoctorSignatureEligibility({
      provider: 'bry',
      providerLabel: 'Bry',
      providerCategory: 'signature_platform',
      status: 'connected',
    });
    expect(r.allowed).toBe(true);
  });
});
