import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BRY_CLOUD_PRODUCTION_API_URL,
  BRY_CLOUD_PRODUCTION_APPLICATION_TOKEN_URL,
  BRY_CLOUD_PRODUCTION_HUB_API_URL,
  bryConfigContainsHomHost,
  diagnoseBryClientSecretFormat,
  getBryCloudEnvConfig,
  logBryEnvConfigOnce,
  parseBryCmsInputMode,
  resolveBryApplicationTokenUrl,
  resolveBryCloudDeployment,
  sanitizeBryEnvValue,
  isLegacyPdfBatchEnvExplicitlyDisabled,
  shouldUseCmsKmsHub,
  shouldUseHubPdfPadesSigning,
} from '@/lib/signature/providers/bryCloudEnv';

describe('bryCloudEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sanitizeBryEnvValue remove aspas e quebras de linha', () => {
    expect(sanitizeBryEnvValue('"abc"')).toBe('abc');
    expect(sanitizeBryEnvValue("'secret'")).toBe('secret');
    expect(sanitizeBryEnvValue('key\nline')).toBe('keyline');
  });

  it('diagnoseBryClientSecretFormat detecta JWT colado por engano', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(diagnoseBryClientSecretFormat(jwt)).toContain('Emitir token JWT');
  });

  it('homologação pela API_URL integra.hom', () => {
    vi.stubEnv('SIGNATURE_BRY_API_URL', 'https://integra.hom.bry.com.br/api/service');
    expect(resolveBryCloudDeployment('https://integra.hom.bry.com.br/api/service')).toBe(
      'homologation'
    );
    expect(resolveBryApplicationTokenUrl('https://integra.hom.bry.com.br/api/service')).toBe(
      'https://cloud-hom.bry.com.br/token-service/jwt'
    );
  });

  it('SIGNATURE_BRY_ENV força produção', () => {
    vi.stubEnv('SIGNATURE_BRY_API_URL', 'https://integra.hom.bry.com.br/api/service');
    vi.stubEnv('SIGNATURE_BRY_ENV', 'production');
    expect(resolveBryCloudDeployment('https://integra.hom.bry.com.br/api/service')).toBe(
      'production'
    );
  });

  it('produção pela API_URL integra.bry.com.br', () => {
    expect(resolveBryCloudDeployment(BRY_CLOUD_PRODUCTION_API_URL)).toBe('production');
    expect(resolveBryApplicationTokenUrl(BRY_CLOUD_PRODUCTION_API_URL)).toBe(
      BRY_CLOUD_PRODUCTION_APPLICATION_TOKEN_URL
    );
  });

  it('parseBryCmsInputMode — default hashes', () => {
    expect(parseBryCmsInputMode(undefined)).toBe('hashes');
    expect(parseBryCmsInputMode('originalDocuments')).toBe('originalDocuments');
  });

  it('hub padrão é PDF/PAdES; CMS só com USE_CMS_KMS', () => {
    expect(shouldUseHubPdfPadesSigning()).toBe(true);
    expect(shouldUseCmsKmsHub()).toBe(false);

    vi.stubEnv('SIGNATURE_BRY_USE_CMS_KMS', 'true');
    expect(shouldUseCmsKmsHub()).toBe(true);
    expect(shouldUseHubPdfPadesSigning()).toBe(false);
  });

  it('LEGACY_PDF_BATCH=false não desativa PAdES', () => {
    vi.stubEnv('SIGNATURE_BRY_USE_LEGACY_PDF_BATCH', 'false');
    expect(isLegacyPdfBatchEnvExplicitlyDisabled()).toBe(true);
    expect(shouldUseHubPdfPadesSigning()).toBe(true);
  });

  it('getBryCloudEnvConfig — produção', () => {
    vi.stubEnv('SIGNATURE_BRY_API_URL', BRY_CLOUD_PRODUCTION_API_URL);
    vi.stubEnv('SIGNATURE_BRY_HUB_API_URL', BRY_CLOUD_PRODUCTION_HUB_API_URL);
    vi.stubEnv('SIGNATURE_BRY_CLIENT_ID', 'id');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_SECRET', 'key');
    vi.stubEnv('SIGNATURE_BRY_REDIRECT_URI', 'https://www.oftware.com.br/api/signature/bry/callback');
    vi.stubEnv('SIGNATURE_BRY_ENV', 'production');
    const c = getBryCloudEnvConfig();
    expect(c.deployment).toBe('production');
    expect(c.applicationTokenUrl).toBe(BRY_CLOUD_PRODUCTION_APPLICATION_TOKEN_URL);
    expect(c.hubApiUrl).toBe(BRY_CLOUD_PRODUCTION_HUB_API_URL);
    expect(bryConfigContainsHomHost(c)).toBe(false);
    expect(c.pscLinkPath).toBe('/psc/link');
    expect(c.pscScope).toBe('signature_session');
    expect(c.pscAuthLifetimeSec).toBe(604800);
    expect(c.hubCmsSignPath).toBe('/fw/v1/cms/kms/assinaturas');
    expect(c.hubCmsInputMode).toBe('hashes');
    expect(c.hubPdfBatchSignPath).toBe('/fw/v1/pdf/kms/lote/assinaturas');
  });

  it('getBryCloudEnvConfig — homologação (legado)', () => {
    vi.stubEnv('SIGNATURE_BRY_API_URL', 'https://integra.hom.bry.com.br/api/service');
    vi.stubEnv('SIGNATURE_BRY_HUB_API_URL', 'https://hub2.hom.bry.com.br');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_ID', 'id');
    vi.stubEnv('SIGNATURE_BRY_CLIENT_SECRET', 'key');
    vi.stubEnv('SIGNATURE_BRY_REDIRECT_URI', 'https://app/cb');
    const c = getBryCloudEnvConfig();
    expect(c.deployment).toBe('homologation');
    expect(c.applicationTokenUrl).toContain('cloud-hom.bry.com.br');
    expect(bryConfigContainsHomHost(c)).toBe(true);
  });

  it('logBryEnvConfigOnce não lança', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logBryEnvConfigOnce({
      apiUrl: BRY_CLOUD_PRODUCTION_API_URL,
      hubApiUrl: BRY_CLOUD_PRODUCTION_HUB_API_URL,
      applicationTokenUrl: BRY_CLOUD_PRODUCTION_APPLICATION_TOKEN_URL,
      redirectUri: 'https://www.oftware.com.br/api/signature/bry/callback',
      clientId: 'id',
      clientSecret: 'secret',
      pdfSignPath: '/assinadores/pdf/assinar',
      pscLinkPath: '/psc/link',
      oauthTokenPath: '/oauth/token',
      pscName: '',
      pscScope: 'signature_session',
      pscAuthLifetimeSec: 604800,
      pscNumberOfDocuments: 50,
      deployment: 'production',
      hubCmsSignPath: '/fw/v1/cms/kms/assinaturas',
      hubCmsInputMode: 'hashes',
      hubPdfBatchSignPath: '/fw/v1/pdf/kms/lote/assinaturas',
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
