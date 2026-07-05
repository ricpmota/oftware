import { describe, expect, it } from 'vitest';
import { isSignatureProviderConnected } from '@/lib/metaadmin/isSignatureProviderConnected';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

describe('isSignatureProviderConnected', () => {
  it('retorna false para null, undefined e status não connected', () => {
    expect(isSignatureProviderConnected(null)).toBe(false);
    expect(isSignatureProviderConnected(undefined)).toBe(false);
    expect(
      isSignatureProviderConnected({
        provider: 'bry',
        providerLabel: 'Bry',
        providerCategory: 'signature_platform',
        status: 'selected_pending_integration',
      })
    ).toBe(false);
    expect(
      isSignatureProviderConnected({
        provider: 'none',
        providerLabel: 'Nenhum',
        providerCategory: 'none',
        status: 'not_configured',
      })
    ).toBe(false);
    expect(
      isSignatureProviderConnected({
        provider: 'bry',
        providerLabel: 'Bry',
        providerCategory: 'signature_platform',
        status: 'error',
      })
    ).toBe(false);
  });

  it('retorna true para status connected', () => {
    expect(
      isSignatureProviderConnected({
        provider: 'sandbox_mock',
        providerLabel: 'Sandbox',
        providerCategory: 'sandbox',
        status: 'connected',
      })
    ).toBe(true);
  });

  it('retorna true quando connection.status é connected', () => {
    expect(
      isSignatureProviderConnected({
        provider: BRY_CLOUD_PROVIDER_ID,
        providerLabel: 'BRy',
        providerCategory: 'signature_platform',
        status: 'selected_pending_integration',
        connection: {
          provider: 'bry_cloud',
          status: 'connected',
        },
      })
    ).toBe(true);
  });
});
