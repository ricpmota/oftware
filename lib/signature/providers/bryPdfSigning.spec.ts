import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/signature/providers/bryCloudApi', () => ({
  fetchBryApplicationAccessToken: vi.fn(),
}));
import {
  BRY_KMS_TYPE_PSC,
  buildBryPdfSignKmsData,
  buildPscKmsDataSignAttempts,
  normalizeCpfDigits,
  resolveBryPdfSignKmsType,
  resolveIntegraSessionApiKey,
  usesPscIntegraSigning,
} from '@/lib/signature/providers/bryPdfSigning';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

describe('bryPdfSigning', () => {
  it('resolveBryPdfSignKmsType retorna PSC quando há pscProvider', () => {
    expect(
      resolveBryPdfSignKmsType({
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        pscProvider: 'safeid',
      })
    ).toBe(BRY_KMS_TYPE_PSC);
  });

  it('buildPscKmsDataSignAttempts com signatureReady retorna só user', () => {
    const attempts = buildPscKmsDataSignAttempts(
      { user: '12345678901' },
      { signatureReady: true }
    );
    expect(attempts).toEqual([{ user: '12345678901' }]);
  });

  it('resolveIntegraSessionApiKey prioriza integraSessionApiKey', () => {
    expect(
      resolveIntegraSessionApiKey({
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        integraSessionApiKey: 'sess-primary',
        authorizationContextId: 'sess-legacy',
      })
    ).toBe('sess-primary');
  });
});

vi.mock('@/lib/signature/providers/bryPscAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/signature/providers/bryPscAuth')>();
  return {
    ...actual,
    fetchBryPscAuthInfo: vi.fn(),
  };
});

vi.mock('@/lib/signature/providers/bryCloudApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/signature/providers/bryCloudApi')>();
  return {
    ...actual,
    fetchBryApplicationAccessToken: vi.fn().mockResolvedValue({ accessToken: 'app-jwt-fallback' }),
  };
});

describe('preparePscPdfSigningCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exige integraSessionApiKey', async () => {
    const { preparePscPdfSigningCredentials } = await import('@/lib/signature/providers/bryPdfSigning');
    await expect(
      preparePscPdfSigningCredentials({
        connection: {
          provider: BRY_CLOUD_PROVIDER_ID,
          status: 'connected',
          pscProvider: 'safeid',
        },
      })
    ).rejects.toThrow(/Sessão PSC/);
  });

  it('usa JWT da aplicação e kms_data do auth/info quando signatureReady', async () => {
    const { fetchBryPscAuthInfo } = await import('@/lib/signature/providers/bryPscAuth');
    const { fetchBryApplicationAccessToken } = await import('@/lib/signature/providers/bryCloudApi');
    vi.mocked(fetchBryApplicationAccessToken).mockResolvedValue({ accessToken: 'app-jwt-direct' });
    vi.mocked(fetchBryPscAuthInfo).mockResolvedValue({
      accessToken: 'titular-should-not-be-used',
      authInfoAttempts: 1,
      sessionApiKey: 'integra-sess-key-48chars-base64xxxxxxxxxxxx',
      appAccessToken: 'app-jwt-direct',
      pscKmsData: { user: '12345678901' },
      signatureReady: true,
    });

    const { preparePscPdfSigningCredentials } = await import('@/lib/signature/providers/bryPdfSigning');
    const prepared = await preparePscPdfSigningCredentials({
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        pscProvider: 'safeid',
        integraSessionApiKey: 'integra-sess-key-48chars-base64xxxxxxxxxxxx',
      },
    });

    expect(fetchBryPscAuthInfo).toHaveBeenCalled();
    expect(prepared.accessToken).toBe('app-jwt-direct');
    expect(prepared.kmsData).toEqual({ user: '12345678901' });
    expect(prepared.signatureReady).toBe(true);
  });

  it('rejeita quando signatureReady é false', async () => {
    const { fetchBryPscAuthInfo } = await import('@/lib/signature/providers/bryPscAuth');
    vi.mocked(fetchBryPscAuthInfo).mockResolvedValue({
      accessToken: 'app-jwt',
      authInfoAttempts: 1,
      sessionApiKey: 'integra-sess',
      appAccessToken: 'app-jwt',
      pscKmsData: { user: '12345678901' },
      signatureReady: false,
    });
    const { preparePscPdfSigningCredentials } = await import('@/lib/signature/providers/bryPdfSigning');
    await expect(
      preparePscPdfSigningCredentials({
        connection: {
          provider: BRY_CLOUD_PROVIDER_ID,
          status: 'connected',
          pscProvider: 'safeid',
          integraSessionApiKey: 'integra-sess',
        },
      })
    ).rejects.toThrow(/ainda não está pronto/i);
  });
});
