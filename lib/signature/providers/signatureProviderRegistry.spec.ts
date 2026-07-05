import { afterEach, describe, expect, it, vi } from 'vitest';
import { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/providers/signatureProviderRegistry';
import {
  getSignatureProviderAdapter,
  isSignatureProviderRegistered,
  listRegisteredSignatureProviderIds,
} from '@/lib/signature/providers/signatureProviderRegistry';
import { BRY_CLOUD_PROVIDER_ID, LACUNA_REST_PKI_PROVIDER_ID } from '@/types/signatureProviderAdapter';
import { SANDBOX_MOCK_PROVIDER_ID } from '@/types/doctorSignatureProvider';

describe('signatureProviderRegistry', () => {
  it('registra sandbox, bry_cloud e lacuna', () => {
    const ids = listRegisteredSignatureProviderIds();
    expect(ids).toContain(SANDBOX_MOCK_PROVIDER_ID);
    expect(ids).toContain(BRY_CLOUD_PROVIDER_ID);
    expect(ids).toContain(LACUNA_REST_PKI_PROVIDER_ID);
    expect(isSignatureProviderRegistered('sandbox_mock')).toBe(true);
    expect(isSignatureProviderRegistered('bry_cloud')).toBe(true);
    expect(isSignatureProviderRegistered('lacuna_rest_pki')).toBe(true);
  });

  it('provedor desconhecido retorna not implemented', async () => {
    const adapter = getSignatureProviderAdapter('bry');
    expect(adapter.providerId).toBe('bry');
    const r = await adapter.submitPdfForSignature({
      doctorId: 'm1',
      documentType: 'prescription',
      originalPdfUrl: 'https://example.com/a.pdf',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(NON_SANDBOX_PROVIDER_SIGNATURE_ERROR);
      expect(r.code).toBe('not_implemented');
    }
  });

  it('lacuna stub retorna erro controlado quando env ausente', async () => {
    vi.stubEnv('SIGNATURE_LACUNA_API_URL', '');
    vi.stubEnv('SIGNATURE_LACUNA_CLIENT_ID', '');
    vi.stubEnv('SIGNATURE_LACUNA_CLIENT_SECRET', '');
    vi.stubEnv('SIGNATURE_LACUNA_REDIRECT_URI', '');

    const adapter = getSignatureProviderAdapter(LACUNA_REST_PKI_PROVIDER_ID);
    const r = await adapter.startAuthorization({ doctorId: 'm1' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('not_configured');
      expect(r.error).toContain('SIGNATURE_LACUNA');
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sandbox adapter expõe providerId correto', () => {
    expect(getSignatureProviderAdapter(SANDBOX_MOCK_PROVIDER_ID).providerId).toBe('sandbox_mock');
  });
});
