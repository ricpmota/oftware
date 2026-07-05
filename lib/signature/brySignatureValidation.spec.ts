import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateBryDoctorForSigning } from '@/lib/signature/brySignatureValidation';
import { BRY_SIGNATURE_MISSING_TOKEN_ERROR } from '@/lib/signature/brySignatureConstants';
import { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

describe('validateBryDoctorForSigning', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('safeid connected com tokens BRy → ok', () => {
    const r = validateBryDoctorForSigning({
      provider: 'safeid',
      providerLabel: 'SafeID',
      providerCategory: 'cloud_certificate',
      status: 'connected',
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        pscProvider: 'safeid',
        pscName: 'SafeID',
        accessTokenEncrypted: 'v1:aa:bb:cc',
      },
    });
    expect(r.ok).toBe(true);
  });

  it('bry_cloud connected com PSC e accessTokenEncrypted → ok', () => {
    const r = validateBryDoctorForSigning({
      provider: BRY_CLOUD_PROVIDER_ID,
      providerLabel: 'BRy',
      providerCategory: 'signature_platform',
      status: 'connected',
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        pscProvider: 'vidaas',
        pscName: 'Vidaas',
        accessTokenEncrypted: 'v1:aa:bb:cc',
      },
    });
    expect(r.ok).toBe(true);
  });

  it('sem accessTokenEncrypted → erro seguro', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const r = validateBryDoctorForSigning({
      provider: 'vidaas',
      providerLabel: 'VIDaaS',
      providerCategory: 'cloud_certificate',
      status: 'connected',
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        pscProvider: 'vidaas',
        pscName: 'Vidaas',
      },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe(BRY_SIGNATURE_MISSING_TOKEN_ERROR);
  });

  it('provider bry legado → indisponível', () => {
    const r = validateBryDoctorForSigning({
      provider: 'bry',
      providerLabel: 'Bry',
      providerCategory: 'signature_platform',
      status: 'connected',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe(NON_SANDBOX_PROVIDER_SIGNATURE_ERROR);
  });
});
