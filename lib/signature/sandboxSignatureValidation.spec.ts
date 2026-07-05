import { describe, expect, it } from 'vitest';
import { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';
import { validateSandboxDoctorForSigning } from '@/lib/signature/sandboxSignatureValidation';

describe('validateSandboxDoctorForSigning', () => {
  it('médico sem sandbox conectado → erro de integração', () => {
    const r = validateSandboxDoctorForSigning({
      provider: 'bry',
      providerLabel: 'Bry',
      providerCategory: 'signature_platform',
      status: 'connected',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toBe(NON_SANDBOX_PROVIDER_SIGNATURE_ERROR);
    }
  });

  it('sandbox não conectado → erro', () => {
    const r = validateSandboxDoctorForSigning({
      provider: 'sandbox_mock',
      providerLabel: 'Sandbox',
      providerCategory: 'sandbox',
      status: 'selected_pending_integration',
    });
    expect(r.ok).toBe(false);
  });

  it('sandbox conectado → ok', () => {
    const r = validateSandboxDoctorForSigning({
      provider: 'sandbox_mock',
      providerLabel: 'Sandbox',
      providerCategory: 'sandbox',
      status: 'connected',
    });
    expect(r.ok).toBe(true);
  });
});
