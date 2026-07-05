import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

vi.mock('@/lib/signature/providers/bryCloudApi', () => ({
  requestBryAuthorizationUrl: vi.fn(),
  exchangeBryAuthorizationCode: vi.fn(),
  submitBryPdfSignature: vi.fn(),
  getBrySignatureOperationStatus: vi.fn(),
  downloadBrySignedPdfUrl: vi.fn(),
  fetchBryApplicationAccessToken: vi.fn(),
}));

vi.mock('@/lib/signature/providers/bryHubPdfSigning', () => ({
  submitBryHubIntegraHubSignature: vi.fn(),
}));

vi.mock('@/lib/signature/providers/bryPendingAuth.server', () => ({
  saveBryPendingAuth: vi.fn().mockResolvedValue(undefined),
  buildBryPendingAuthRecord: vi.fn((r: Record<string, unknown>) => r),
}));

import { requestBryAuthorizationUrl } from '@/lib/signature/providers/bryCloudApi';
import { submitBryHubIntegraHubSignature } from '@/lib/signature/providers/bryHubPdfSigning';
import { fetchBryApplicationAccessToken } from '@/lib/signature/providers/bryCloudApi';
import { saveBryPendingAuth } from '@/lib/signature/providers/bryPendingAuth.server';
import { createBryOAuthStatePayload, signBryOAuthState } from '@/lib/signature/providers/bryCloudOAuthState';
import { bryCloudSignatureProviderAdapter } from '@/lib/signature/providers/bryCloudSignatureProviderAdapter';

describe('bryCloudSignatureProviderAdapter', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('startAuthorization retorna not_configured sem env', async () => {
    vi.stubEnv('SIGNATURE_BRY_API_URL', '');
    vi.stubEnv('SIGNATURE_BRY_HUB_API_URL', '');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_ID', '');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_SECRET', '');
    vi.stubEnv('SIGNATURE_BRY_REDIRECT_URI', '');

    const r = await bryCloudSignatureProviderAdapter.startAuthorization({ doctorId: 'm1' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('not_configured');
      expect(r.error).toContain('SIGNATURE_BRY');
    }
  });

  beforeEach(() => {
    vi.mocked(requestBryAuthorizationUrl).mockReset();
  });

  it('startAuthorization retorna authorizationUrl quando configurado', async () => {
    vi.stubEnv('SIGNATURE_BRY_API_URL', 'https://integra.bry.com.br/api/service');
    vi.stubEnv('SIGNATURE_BRY_HUB_API_URL', 'https://hub2.bry.com.br');
    vi.stubEnv('SIGNATURE_BRY_ENV', 'production');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_ID', 'cid');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_SECRET', 'secret');
    vi.stubEnv('SIGNATURE_BRY_REDIRECT_URI', 'https://app/callback');

    vi.mocked(requestBryAuthorizationUrl).mockResolvedValue({
      authorizationUrl: 'https://integra.example/psc-auth?state=x',
      integraApiKey: 'integra-cred-test',
      integraBrySigningToken: 'sign-token',
    });

    const r = await bryCloudSignatureProviderAdapter.startAuthorization({
      doctorId: 'm1',
      pscProvider: 'vidaas',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.authorizationUrl).toContain('psc-auth');
      expect(r.data).not.toHaveProperty('integraApiKey');
    }
    expect(saveBryPendingAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        integraBrySigningToken: 'sign-token',
      })
    );
  });

  it('submitPdfForSignature PSC usa HUB INTEGRABRY', async () => {
    vi.stubEnv('SIGNATURE_BRY_API_URL', 'https://integra.bry.com.br/api/service');
    vi.stubEnv('SIGNATURE_BRY_HUB_API_URL', 'https://hub2.bry.com.br');
    vi.stubEnv('SIGNATURE_BRY_ENV', 'production');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_ID', 'cid');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_SECRET', 'secret');
    vi.stubEnv('SIGNATURE_BRY_REDIRECT_URI', 'https://app/callback');
    vi.stubEnv('SIGNATURE_TOKEN_ENCRYPTION_KEY', Buffer.alloc(32, 1).toString('base64'));

    const { encryptSecret } = await import('@/lib/security/encryption');
    vi.mocked(fetchBryApplicationAccessToken).mockResolvedValue({ accessToken: 'app-jwt' });
    vi.mocked(submitBryHubIntegraHubSignature).mockResolvedValue({
      status: 'signed',
      signedPdfBase64: Buffer.from('%PDF-signed').toString('base64'),
      raw: {},
    });

    const r = await bryCloudSignatureProviderAdapter.submitPdfForSignature({
      doctorId: 'm1',
      documentType: 'prescription',
      originalPdfUrl: 'https://example.com/a.pdf',
      requestId: 'req-cms-1',
      prescriptionMetadata: { crm: '123', crmUf: 'SP' },
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        pscProvider: 'safeid',
        integraBrySigningTokenEncrypted: encryptSecret('psc-link-token'),
        signatureSessionScope: 'signature_session',
        signatureSessionMaxDocuments: 50,
        signatureSessionUsedDocuments: 0,
        signatureSessionExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
    });

    expect(r.ok).toBe(true);
    expect(submitBryHubIntegraHubSignature).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'app-jwt',
        integraSigningToken: 'psc-link-token',
        requestId: 'req-cms-1',
        prescriptionMetadata: { crm: '123', crmUf: 'SP' },
      })
    );
  });

  it('submitPdfForSignature PSC exige sessão válida na conexão', async () => {
    vi.stubEnv('SIGNATURE_BRY_API_URL', 'https://integra.bry.com.br/api/service');
    vi.stubEnv('SIGNATURE_BRY_HUB_API_URL', 'https://hub2.bry.com.br');
    vi.stubEnv('SIGNATURE_BRY_ENV', 'production');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_ID', 'cid');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_SECRET', 'secret');
    vi.stubEnv('SIGNATURE_BRY_REDIRECT_URI', 'https://app/callback');

    const r = await bryCloudSignatureProviderAdapter.submitPdfForSignature({
      doctorId: 'm1',
      documentType: 'prescription',
      originalPdfUrl: 'https://example.com/a.pdf',
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        pscProvider: 'safeid',
      },
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Sessão de assinatura expirada/);
  });

  it('providerId é bry_cloud', () => {
    expect(bryCloudSignatureProviderAdapter.providerId).toBe('bry_cloud');
  });

  it('startAuthorization com state externo grava pending com o mesmo nonce do state', async () => {
    vi.stubEnv('SIGNATURE_BRY_API_URL', 'https://integra.bry.com.br/api/service');
    vi.stubEnv('SIGNATURE_BRY_HUB_API_URL', 'https://hub2.bry.com.br');
    vi.stubEnv('SIGNATURE_BRY_ENV', 'production');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_ID', 'cid');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_SECRET', 'secret');
    vi.stubEnv('SIGNATURE_BRY_REDIRECT_URI', 'https://app/callback');

    vi.mocked(requestBryAuthorizationUrl).mockResolvedValue({
      authorizationUrl: 'https://integra.example/psc-auth',
      integraApiKey: 'integra-cred-test',
    });

    const statePayload = createBryOAuthStatePayload('m1', 'https://app/metaadmin', 'vidaas');
    const state = signBryOAuthState(statePayload, 'secret');

    const r = await bryCloudSignatureProviderAdapter.startAuthorization({
      doctorId: 'm1',
      state,
      pscProvider: 'vidaas',
    });

    expect(r.ok).toBe(true);
    expect(saveBryPendingAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: statePayload.nonce,
        integraApiKey: 'integra-cred-test',
        medicoId: 'm1',
      })
    );
  });
});
