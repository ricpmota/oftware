import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BRY_HUB_CMS_ORIGINAL_DOCUMENT_CONTENT_FIELD,
  BRY_HUB_CMS_ORIGINAL_DOCUMENT_HASH_FIELD,
  BRY_HUB_CMS_ORIGINAL_DOCUMENT_FILENAME_FIELD,
  BRY_HUB_CMS_ORIGINAL_DOCUMENT_NONCE_FIELD,
  BRY_HUB_CMS_PADRAO,
  BRY_HUB_CMS_FORMATO_ASSINATURA_HASH,
  BRY_HUB_CMS_REQUEST_FIELD,
  BRY_HUB_PDF_BATCH_DADOS_ASSINATURA_FIELD,
  BRY_HUB_CMS_SIGN_PATH_DEFAULT,
  BRY_HUB_DETACHED_CMS_ERROR_MESSAGE,
  BRY_HUB_PDF_BATCH_SIGN_PATH_DEFAULT,
  buildBryHubCmsHashEntry,
  buildHubIntegraCmsRequestPayload,
  buildBryHubPrescriptionMetadados,
  detectDetachedCmsInHubResponse,
  resolveBryHubCmsDocumentNonce,
  submitBryHubIntegraCmsHubSignature,
  submitBryHubIntegraHubSignature,
  submitBryHubIntegraPdfBatchSignature,
} from '@/lib/signature/providers/bryHubPdfSigning';
import {
  BRY_HUB_PDF_PRESCRIPTION_PERFIL,
  BRY_PHYSICIAN_CRM_OID,
  BRY_PRESCRIPTION_METADATA_OID,
} from '@/lib/signature/brySignatureConstants';
import { sha256Base64, sha256Hex } from '@/lib/signature/sandboxSignaturePdf';
import {
  BRY_CLOUD_PRODUCTION_API_URL,
  BRY_CLOUD_PRODUCTION_APPLICATION_TOKEN_URL,
  BRY_CLOUD_PRODUCTION_HUB_API_URL,
  type BryCloudEnvConfig,
} from '@/lib/signature/providers/bryCloudEnv';

const baseConfig: BryCloudEnvConfig = {
  apiUrl: BRY_CLOUD_PRODUCTION_API_URL,
  hubApiUrl: BRY_CLOUD_PRODUCTION_HUB_API_URL,
  hubCmsSignPath: BRY_HUB_CMS_SIGN_PATH_DEFAULT,
  hubCmsInputMode: 'hashes',
  hubPdfBatchSignPath: BRY_HUB_PDF_BATCH_SIGN_PATH_DEFAULT,
  clientId: 'app-id',
  clientSecret: 'app-secret-long-enough',
  redirectUri: 'https://www.oftware.com.br/api/signature/bry/callback',
  pdfSignPath: '/assinadores/pdf/assinar',
  pscLinkPath: '/psc/link',
  oauthTokenPath: '/oauth/token',
  pscName: '',
  pscScope: 'single_signature',
  pscAuthLifetimeSec: 604800,
  pscNumberOfDocuments: 50,
  deployment: 'production',
  applicationTokenUrl: BRY_CLOUD_PRODUCTION_APPLICATION_TOKEN_URL,
};

describe('bryHubPdfSigning', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('buildBryHubPrescriptionMetadados monta OIDs ICP-Brasil', () => {
    const meta = buildBryHubPrescriptionMetadados({
      crm: '12345',
      crmUf: 'SP',
      specialty: 'Clínica',
    });
    expect(meta[BRY_PRESCRIPTION_METADATA_OID]).toBe('');
    expect(meta[BRY_PHYSICIAN_CRM_OID]).toBe('12345');
  });

  it('buildBryHubCmsHashEntry calcula SHA-256 hex do PDF', () => {
    const pdf = Buffer.from('%PDF-1.4 footer');
    const entry = buildBryHubCmsHashEntry({ pdfBuffer: pdf, requestId: 'req-1' });
    expect(entry.hashHex).toBe(sha256Hex(pdf));
    expect(entry.hashBase64).toBe(sha256Base64(pdf));
    expect(entry.filename).toBe('document.pdf');
    expect(entry.nonce).toBe('req-1');
    expect(entry.nonceSource).toBe('requestId');
  });

  it('submitBryHubIntegraHubSignature padrão usa PDF/PAdES no hub', async () => {
    const signedB64 = Buffer.from('%PDF-1.4 signed').toString('base64');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ documento: signedB64 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const r = await submitBryHubIntegraHubSignature({
      config: baseConfig,
      accessToken: 'app-jwt',
      integraServiceUrl: baseConfig.apiUrl,
      integraSigningToken: 'psc-link-token',
      originalPdfBuffer: Buffer.from('%PDF-1.4 with footer'),
      originalPdfUrl: 'bry://x',
      requestId: 'req-pdf-99',
      prescriptionMetadata: { crm: '1', crmUf: 'RJ' },
    });

    expect(r.status).toBe('signed');
    expect(r.signedPdfBase64).toBe(signedB64);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${BRY_CLOUD_PRODUCTION_HUB_API_URL}${BRY_HUB_PDF_BATCH_SIGN_PATH_DEFAULT}`);

    const body = fetchMock.mock.calls[0]![1]!.body as FormData;
    expect(body.get('documento[0]')).toBeTruthy();
    expect(body.get(BRY_HUB_CMS_REQUEST_FIELD)).toBeNull();

    const dadosAssinatura = JSON.parse(String(body.get(BRY_HUB_PDF_BATCH_DADOS_ASSINATURA_FIELD))) as {
      perfil: string;
      restructure: boolean;
      tipoRetorno: string;
    };
    expect(dadosAssinatura.perfil).toBe(BRY_HUB_PDF_PRESCRIPTION_PERFIL);
    expect(dadosAssinatura.restructure).toBe(true);
    expect(dadosAssinatura.tipoRetorno).toBe('BASE64');
  });

  it('submitBryHubIntegraHubSignature ignora LEGACY_PDF_BATCH=false e usa PDF/PAdES', async () => {
    vi.stubEnv('SIGNATURE_BRY_USE_LEGACY_PDF_BATCH', 'false');
    const signedB64 = Buffer.from('%PDF-1.4 signed').toString('base64');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ documento: signedB64 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await submitBryHubIntegraHubSignature({
      config: baseConfig,
      accessToken: 'app-jwt',
      integraServiceUrl: baseConfig.apiUrl,
      integraSigningToken: 'psc-link-token',
      originalPdfBuffer: Buffer.from('%PDF-1.4'),
      originalPdfUrl: 'bry://x',
      prescriptionMetadata: { crm: '1', crmUf: 'RJ' },
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain(BRY_HUB_PDF_BATCH_SIGN_PATH_DEFAULT);
    expect((fetchMock.mock.calls[0]![1]!.body as FormData).get(BRY_HUB_CMS_REQUEST_FIELD)).toBeNull();
  });

  it('submitBryHubIntegraHubSignature ignora USE_CMS_KMS e usa PDF/PAdES', async () => {
    vi.stubEnv('SIGNATURE_BRY_USE_CMS_KMS', 'true');
    const signedB64 = Buffer.from('%PDF-1.4 signed').toString('base64');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ documento: signedB64 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await submitBryHubIntegraHubSignature({
      config: baseConfig,
      accessToken: 'app-jwt',
      integraServiceUrl: baseConfig.apiUrl,
      integraSigningToken: 'psc-link-token',
      originalPdfBuffer: Buffer.from('%PDF-1.4'),
      originalPdfUrl: 'bry://x',
      prescriptionMetadata: { crm: '1', crmUf: 'RJ' },
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain(BRY_HUB_PDF_BATCH_SIGN_PATH_DEFAULT);
    expect((fetchMock.mock.calls[0]![1]!.body as FormData).get(BRY_HUB_CMS_REQUEST_FIELD)).toBeNull();
  });

  it('submitBryHubIntegraCmsHubSignature envia cmsRequest', async () => {
    const pdf = Buffer.from('%PDF-1.4 with footer');
    const signedB64 = Buffer.from('%PDF-1.4 signed').toString('base64');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ documentos: [{ base64: signedB64 }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const r = await submitBryHubIntegraCmsHubSignature({
      config: baseConfig,
      accessToken: 'app-jwt',
      integraServiceUrl: baseConfig.apiUrl,
      integraSigningToken: 'psc-link-token',
      originalPdfBuffer: pdf,
      originalPdfUrl: 'bry://x',
      requestId: 'req-cms-99',
      prescriptionMetadata: { crm: '1', crmUf: 'RJ' },
    });

    expect(r.status).toBe('signed');
    expect(r.signedPdfBase64).toBe(signedB64);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${BRY_CLOUD_PRODUCTION_HUB_API_URL}${BRY_HUB_CMS_SIGN_PATH_DEFAULT}`);

    const body = fetchMock.mock.calls[0]![1]!.body as FormData;
    expect(body.get('documento[0]')).toBeNull();
    expect(body.get(BRY_HUB_CMS_REQUEST_FIELD)).toBeTruthy();

    const cmsRequest = JSON.parse(String(body.get(BRY_HUB_CMS_REQUEST_FIELD))) as {
      padrao: string;
      formatoAssinatura: string;
      hashes: string[];
      nonces: string[];
      nomeDocumentos: string[];
      restructure?: unknown;
    };
    expect(cmsRequest.padrao).toBe(BRY_HUB_CMS_PADRAO);
    expect(cmsRequest.formatoAssinatura).toBe(BRY_HUB_CMS_FORMATO_ASSINATURA_HASH);
    expect(cmsRequest.hashes).toEqual([sha256Base64(pdf)]);
    expect(cmsRequest.nonces).toEqual(['req-cms-99']);
    expect(cmsRequest.restructure).toBeUndefined();
  });

  it('buildHubIntegraCmsRequestPayload modo hashes segue schema CMS BRy', () => {
    const pdf = Buffer.from('%PDF-1.4');
    const built = buildHubIntegraCmsRequestPayload({
      integraUrl: baseConfig.apiUrl,
      signingToken: 'token',
      cmsInputMode: 'hashes',
      pdfBuffer: pdf,
      requestId: 'req-1',
    });
    expect(built.hashesCount).toBe(1);
    expect(built.cmsRequest.hashes).toEqual([sha256Base64(pdf)]);
    expect(built.cmsRequest.nonces).toEqual(['req-1']);
  });

  it('submitBryHubIntegraCmsHubSignature modo originalDocuments envia hash no multipart CMS', async () => {
    const pdf = Buffer.from('%PDF-1.4');
    const signedB64 = Buffer.from('%PDF-1.4 signed').toString('base64');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ documentos: [{ base64: signedB64 }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await submitBryHubIntegraCmsHubSignature({
      config: { ...baseConfig, hubCmsInputMode: 'originalDocuments' },
      accessToken: 'app-jwt',
      integraServiceUrl: baseConfig.apiUrl,
      integraSigningToken: 'psc-link-token',
      originalPdfBuffer: pdf,
      originalPdfUrl: 'bry://x',
      requestId: 'req-cms-99',
      prescriptionMetadata: { crm: '1', crmUf: 'RJ' },
    });

    const body = fetchMock.mock.calls[0]![1]!.body as FormData;
    expect(body.get(BRY_HUB_CMS_ORIGINAL_DOCUMENT_CONTENT_FIELD)).toBeNull();
    expect(body.get(BRY_HUB_CMS_ORIGINAL_DOCUMENT_HASH_FIELD)).toBe(sha256Hex(pdf));
    expect(body.get(BRY_HUB_CMS_ORIGINAL_DOCUMENT_HASH_FIELD)).not.toBe(sha256Base64(pdf));
    expect(body.get(BRY_HUB_CMS_ORIGINAL_DOCUMENT_FILENAME_FIELD)).toBe('document.pdf');
    expect(body.get(BRY_HUB_CMS_ORIGINAL_DOCUMENT_NONCE_FIELD)).toBe('req-cms-99');

    const cmsRequest = JSON.parse(String(body.get(BRY_HUB_CMS_REQUEST_FIELD))) as {
      hashes?: unknown;
      padrao?: string;
    };
    expect(cmsRequest.hashes).toBeUndefined();
    expect(cmsRequest.padrao).toBe(BRY_HUB_CMS_PADRAO);
    expect(String(body.get(BRY_HUB_PDF_BATCH_DADOS_ASSINATURA_FIELD))).toBe(
      String(body.get(BRY_HUB_CMS_REQUEST_FIELD))
    );
  });

  it('rejeita CMS destacado sem PDF embutido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            assinatura: 'MIIEogIBAAKCAQEAfakecmspayloadnotpdfxxxxxxxxxxxxxxxxxxxx',
          }),
      })
    );

    await expect(
      submitBryHubIntegraCmsHubSignature({
        config: baseConfig,
        accessToken: 'app-jwt',
        integraServiceUrl: baseConfig.apiUrl,
        integraSigningToken: 'psc-link-token',
        originalPdfBuffer: Buffer.from('%PDF-1.4'),
        originalPdfUrl: 'bry://x',
        prescriptionMetadata: { crm: '1', crmUf: 'RJ' },
      })
    ).rejects.toThrow(BRY_HUB_DETACHED_CMS_ERROR_MESSAGE);
  });

  it('submitBryHubIntegraPdfBatchSignature usa endpoint legado documento[0]', async () => {
    const signedB64 = Buffer.from('%PDF-1.4 signed').toString('base64');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ documento: signedB64 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await submitBryHubIntegraPdfBatchSignature({
      config: baseConfig,
      accessToken: 'app-jwt',
      integraServiceUrl: baseConfig.apiUrl,
      integraSigningToken: 'psc-link-token',
      originalPdfBuffer: Buffer.from('%PDF-1.4'),
      originalPdfUrl: 'bry://x',
      prescriptionMetadata: { crm: '1', crmUf: 'RJ' },
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${BRY_CLOUD_PRODUCTION_HUB_API_URL}${BRY_HUB_PDF_BATCH_SIGN_PATH_DEFAULT}`);
    const body = fetchMock.mock.calls[0]![1]!.body as FormData;
    expect(body.get('documento[0]')).toBeTruthy();
    expect(body.get(BRY_HUB_PDF_BATCH_DADOS_ASSINATURA_FIELD)).toBeTruthy();
    expect(body.get(BRY_HUB_CMS_REQUEST_FIELD)).toBeNull();

    const dadosAssinatura = JSON.parse(String(body.get(BRY_HUB_PDF_BATCH_DADOS_ASSINATURA_FIELD))) as {
      perfil: string;
      restructure: boolean;
      tipoRetorno: string;
      padrao?: string;
    };
    expect(dadosAssinatura.perfil).toBe(BRY_HUB_PDF_PRESCRIPTION_PERFIL);
    expect(dadosAssinatura.restructure).toBe(true);
    expect(dadosAssinatura.tipoRetorno).toBe('BASE64');
    expect(dadosAssinatura.padrao).toBeUndefined();
  });

  it('resolveBryHubCmsDocumentNonce usa requestId quando disponível', () => {
    expect(resolveBryHubCmsDocumentNonce('req-firestore-1')).toEqual({
      nonce: 'req-firestore-1',
      nonceSource: 'requestId',
    });
  });

  it('detectDetachedCmsInHubResponse identifica PKCS7 destacado', () => {
    expect(
      detectDetachedCmsInHubResponse({
        pkcs7: 'MIIEogIBAAKCAQEAfakecmspayloadnotpdfxxxxxxxxxxxxxxxxxxxx',
      })
    ).toBe(true);
  });
});
