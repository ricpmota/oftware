import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BryPdfSignError,
  fetchBryApplicationAccessToken,
  listBryPscProviders,
  requestBryAuthorizationUrl,
  resolveBryPscNameForAuthorization,
  submitBryPdfSignature,
} from '@/lib/signature/providers/bryCloudApi';
import {
  BRY_CLOUD_PRODUCTION_API_URL,
  BRY_CLOUD_PRODUCTION_APPLICATION_TOKEN_URL,
  BRY_CLOUD_PRODUCTION_HUB_API_URL,
  type BryCloudEnvConfig,
} from '@/lib/signature/providers/bryCloudEnv';

const config: BryCloudEnvConfig = {
  apiUrl: BRY_CLOUD_PRODUCTION_API_URL,
  hubApiUrl: BRY_CLOUD_PRODUCTION_HUB_API_URL,
  hubCmsSignPath: '/fw/v1/cms/kms/assinaturas',
  hubCmsInputMode: 'hashes',
  hubPdfBatchSignPath: '/fw/v1/pdf/kms/lote/assinaturas',
  clientId: 'app-id',
  clientSecret: 'app-secret-long-enough',
  redirectUri: 'https://www.oftware.com.br/api/signature/bry/callback',
  pdfSignPath: '/assinadores/pdf/assinar',
  pscLinkPath: '/psc/link',
  oauthTokenPath: '/oauth/token',
  pscName: '',
  pscScope: 'signature_session',
  pscAuthLifetimeSec: 604800,
  pscNumberOfDocuments: 50,
  deployment: 'production',
  applicationTokenUrl: BRY_CLOUD_PRODUCTION_APPLICATION_TOKEN_URL,
};

describe('bryCloudApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requestBryAuthorizationUrl usa POST /psc/link', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'app-jwt' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          link: 'https://psc.example/auth?state=st',
          apiKey: 'integra-key-abc',
          token: 'psc-signing-token-xyz',
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const r = await requestBryAuthorizationUrl({
      config,
      state: 'signed-state',
      cpf: '12345678901',
      signatureProvider: 'vidaas',
    });

    expect(r.authorizationUrl).toBe('https://psc.example/auth?state=st');
    expect(r.integraApiKey).toBe('integra-key-abc');
    expect(r.integraBrySigningToken).toBe('psc-signing-token-xyz');
    const pscLinkCall = fetchMock.mock.calls[1];
    expect(String(pscLinkCall[0])).toContain('/psc/link');
    expect(JSON.parse(String(pscLinkCall[1]?.body))).toMatchObject({
      pscName: 'Vidaas',
      scope: 'signature_session',
    });
  });

  it('resolveBryPscNameForAuthorization usa provider do médico, não env', () => {
    vi.stubEnv('SIGNATURE_BRY_PSC_NAME', 'BirdID');
    vi.stubEnv('SIGNATURE_BRY_PSC_ENV_FALLBACK', 'true');
    expect(resolveBryPscNameForAuthorization({ signatureProvider: 'safeid' })).toBe('SafeID');
  });

  it('fetchBryApplicationAccessToken obtém access_token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'app-jwt', expires_in: 300 }),
      })
    );

    const token = await fetchBryApplicationAccessToken(config);
    expect(token.accessToken).toBe('app-jwt');
  });

  it('listBryPscProviders extrai nomes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          pscs: [{ name: 'Vidaas' }, { pscName: 'BirdID' }],
        }),
      })
    );

    const names = await listBryPscProviders({ config, appToken: 'jwt', cpf: '12345678901' });
    expect(names).toContain('Vidaas');
    expect(names).toContain('BirdID');
  });

  it('submitBryPdfSignature BRYKMS envia kms_data separado', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'signed', url: 'https://signed.example/x.pdf' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await submitBryPdfSignature({
      config,
      accessToken: 'app-jwt',
      kmsType: 'BRYKMS',
      originalPdfUrl: 'https://example.com/doc.pdf',
      originalPdfBuffer: Buffer.from('%PDF-1.4'),
      kmsData: { user: '12345678901' },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ kms_type: 'BRYKMS' });
    const body = init.body as FormData;
    expect(body.get('kms_data')).toBeTruthy();
  });

  it('submitBryPdfSignature PSC envia kms_data em dados_assinatura sem X-API-KEY', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ message: 'Sem permissão de acesso!' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      submitBryPdfSignature({
        config,
        accessToken: 'app-jwt',
        kmsType: 'PSC',
        originalPdfUrl: 'https://example.com/doc.pdf',
        originalPdfBuffer: Buffer.from('%PDF-1.4'),
        kmsData: { user: '12345678901' },
        documentType: 'prescription',
      })
    ).rejects.toBeInstanceOf(BryPdfSignError);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer app-jwt',
      kms_type: 'PSC',
    });
    expect(init.headers).not.toHaveProperty('X-API-KEY');

    const body = init.body as FormData;
    const dadosRaw = body.get('dados_assinatura');
    expect(dadosRaw).toBeTruthy();
    const dados = JSON.parse(String(dadosRaw)) as { kms_data?: { user?: string } };
    expect(dados.kms_data).toEqual({ user: '12345678901' });
    expect(body.get('kms_data')).toBeNull();
  });
});
