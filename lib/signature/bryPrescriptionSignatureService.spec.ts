import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitBryPrescriptionSignature } from '@/lib/signature/bryPrescriptionSignatureService';
import { BRY_CLOUD_PROVIDER_ID, BRY_PRESCRIPTION_ASYNC_MESSAGE } from '@/lib/signature/brySignatureConstants';
import { BRY_SIGNATURE_MISSING_TOKEN_ERROR } from '@/lib/signature/brySignatureConstants';
import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';

const connectedBry = {
  provider: BRY_CLOUD_PROVIDER_ID,
  providerLabel: 'BRy Cloud',
  providerCategory: 'signature_platform' as const,
  status: 'connected' as const,
  connection: {
    provider: BRY_CLOUD_PROVIDER_ID,
    status: 'connected' as const,
    pscProvider: 'safeid',
    accessTokenEncrypted: 'v1:x:y:z',
    externalAccountId: '12345678900',
  },
};

describe('submitBryPrescriptionSignature', () => {
  const pdf = Buffer.from('%PDF-1.4 test');

  let adapter: SignatureProviderAdapter;
  let updateRequest: ReturnType<typeof vi.fn>;
  let createRequest: ReturnType<typeof vi.fn>;
  let uploadSignedPdf: ReturnType<typeof vi.fn>;
  let fetchPdfFromUrl: ReturnType<typeof vi.fn>;
  let resolvePrescriptionMetadata: ReturnType<typeof vi.fn>;
  let incrementSessionUsedDocuments: ReturnType<typeof vi.fn>;
  let expireSignatureSession: ReturnType<typeof vi.fn>;
  let resolveVisualFooterParams: ReturnType<typeof vi.fn>;
  let applyVisualFooter: ReturnType<typeof vi.fn>;
  let allocateValidation: ReturnType<typeof vi.fn>;

  const testValidation = {
    validationCode: 'OFTW-RE-TESTCODE',
    publicValidationUrl: 'https://www.oftware.com.br/prescricao/documento?codigo=OFTW-RE-TESTCODE',
    publicPdfUrl:
      'https://www.oftware.com.br/prescricao/documento?_format=application/pdf&codigo=OFTW-RE-TESTCODE',
  };

  beforeEach(() => {
    vi.stubEnv('SIGNATURE_TOKEN_ENCRYPTION_KEY', Buffer.alloc(32, 2).toString('base64'));

    updateRequest = vi.fn().mockResolvedValue({});
    createRequest = vi.fn().mockResolvedValue('req-1');
    uploadSignedPdf = vi.fn().mockResolvedValue('https://storage.example/signed.pdf');
    fetchPdfFromUrl = vi.fn().mockResolvedValue(Buffer.from('%PDF-signed'));
    resolvePrescriptionMetadata = vi
      .fn()
      .mockResolvedValue({ crm: '', crmUf: '', specialty: '' });
    incrementSessionUsedDocuments = vi.fn().mockResolvedValue(undefined);
    expireSignatureSession = vi.fn().mockResolvedValue(undefined);
    resolveVisualFooterParams = vi.fn().mockResolvedValue({
      physicianName: 'Dr. Teste',
      crm: '12345',
      crmUf: 'SP',
      validationCode: 'OFTW-RE-TESTCODE',
      publicValidationUrl: 'https://www.oftware.com.br/prescricao/documento?codigo=OFTW-RE-TESTCODE',
      publicPdfUrl:
        'https://www.oftware.com.br/prescricao/documento?_format=application/pdf&codigo=OFTW-RE-TESTCODE',
    });
    applyVisualFooter = vi.fn(async (buf: Buffer) => buf);
    allocateValidation = vi.fn().mockResolvedValue(testValidation);

    adapter = {
      providerId: BRY_CLOUD_PROVIDER_ID,
      startAuthorization: vi.fn(),
      submitPdfForSignature: vi.fn(),
      getSignatureStatus: vi.fn(),
      downloadSignedPdf: vi.fn(),
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('signed imediato via BASE64 → rodapé antes do HUB, PDF assinado salvo sem alteração', async () => {
    const signedPdf = Buffer.from('%PDF-signed-hub');
    const footeredPdf = Buffer.from('%PDF-with-footer');
    applyVisualFooter.mockResolvedValue(footeredPdf);

    vi.mocked(adapter.submitPdfForSignature).mockImplementation(async (params) => {
      expect(params.originalPdfBuffer?.equals(footeredPdf)).toBe(true);
      return {
        ok: true,
        data: {
          requestId: 'req-1',
          status: 'signed',
          signedPdfBase64: signedPdf.toString('base64'),
        },
      };
    });

    const r = await submitBryPrescriptionSignature(
      { doctorId: 'med-1', patientId: 'pac-1', originalPdfBuffer: pdf },
      {
        getDoctorSignatureProvider: vi.fn().mockResolvedValue(connectedBry),
        getAdapter: () => adapter,
        allocateValidation,
        createRequest,
        updateRequest,
        uploadSignedPdf,
        fetchPdfFromUrl,
        resolvePrescriptionMetadata,
        resolveVisualFooterParams,
        applyVisualFooter,
        incrementSessionUsedDocuments,
        expireSignatureSession,
      }
    );

    expect(r.outcome).toBe('signed');
    expect(applyVisualFooter).toHaveBeenCalledTimes(1);
    expect(applyVisualFooter).toHaveBeenCalledWith(pdf, expect.any(Object));
    expect(incrementSessionUsedDocuments).toHaveBeenCalledWith('med-1');
    expect(fetchPdfFromUrl).not.toHaveBeenCalled();
    expect(uploadSignedPdf).toHaveBeenCalledWith(
      expect.objectContaining({ pdfBuffer: signedPdf })
    );
  });

  it('signed imediato → request signed + signedPdfUrl', async () => {
    vi.mocked(adapter.submitPdfForSignature).mockResolvedValue({
      ok: true,
      data: {
        requestId: 'req-1',
        status: 'signed',
        signedPdfUrl: 'https://bry.example/signed.pdf',
        operationId: 'op-99',
      },
    });

    const r = await submitBryPrescriptionSignature(
      { doctorId: 'med-1', patientId: 'pac-1', originalPdfBuffer: pdf },
      {
        getDoctorSignatureProvider: vi.fn().mockResolvedValue(connectedBry),
        getAdapter: () => adapter,
        allocateValidation,
        createRequest,
        updateRequest,
        uploadSignedPdf,
        fetchPdfFromUrl,
        resolvePrescriptionMetadata,
        resolveVisualFooterParams,
        applyVisualFooter,
        incrementSessionUsedDocuments,
        expireSignatureSession,
      }
    );

    expect(r.outcome).toBe('signed');
    expect(applyVisualFooter).toHaveBeenCalledTimes(1);
    expect(incrementSessionUsedDocuments).toHaveBeenCalledWith('med-1');
    if (r.outcome === 'signed') {
      expect(r.signedPdfUrl).toBe('https://storage.example/signed.pdf');
    }
    expect(uploadSignedPdf).toHaveBeenCalledWith(
      expect.objectContaining({ pdfBuffer: Buffer.from('%PDF-signed') })
    );
    expect(updateRequest).toHaveBeenCalledWith(
      'req-1',
      'signed',
      expect.objectContaining({ signedHash: expect.any(String) })
    );
  });

  it('assíncrono → sent_to_provider + providerOperationId', async () => {
    vi.mocked(adapter.submitPdfForSignature).mockResolvedValue({
      ok: true,
      data: {
        requestId: 'req-1',
        status: 'pending_provider_authorization',
        operationId: 'op-async',
      },
    });

    const r = await submitBryPrescriptionSignature(
      { doctorId: 'med-1', patientId: 'pac-1', originalPdfBuffer: pdf },
      {
        getDoctorSignatureProvider: vi.fn().mockResolvedValue(connectedBry),
        getAdapter: () => adapter,
        allocateValidation,
        createRequest,
        updateRequest,
        uploadSignedPdf,
        fetchPdfFromUrl,
        resolvePrescriptionMetadata,
        resolveVisualFooterParams,
        applyVisualFooter,
        incrementSessionUsedDocuments,
        expireSignatureSession,
      }
    );

    expect(r.outcome).toBe('pending');
    if (r.outcome === 'pending') {
      expect(r.message).toBe(BRY_PRESCRIPTION_ASYNC_MESSAGE);
      expect(r.providerOperationId).toBe('op-async');
    }
    expect(updateRequest).toHaveBeenCalledWith(
      'req-1',
      'sent_to_provider',
      expect.objectContaining({ providerOperationId: 'op-async' })
    );
  });

  it('erro BRy → request failed', async () => {
    vi.mocked(adapter.submitPdfForSignature).mockResolvedValue({
      ok: false,
      error: 'Falha no HUB',
      code: 'provider_error',
    });

    await expect(
      submitBryPrescriptionSignature(
        { doctorId: 'med-1', patientId: 'pac-1', originalPdfBuffer: pdf },
        {
          getDoctorSignatureProvider: vi.fn().mockResolvedValue(connectedBry),
          getAdapter: () => adapter,
          allocateValidation,
          createRequest,
          updateRequest,
          uploadSignedPdf,
          fetchPdfFromUrl,
          resolvePrescriptionMetadata,
          resolveVisualFooterParams,
          applyVisualFooter,
          incrementSessionUsedDocuments,
          expireSignatureSession,
        }
      )
    ).rejects.toThrow('Falha no HUB');

    expect(updateRequest).toHaveBeenCalledWith('req-1', 'failed', expect.objectContaining({ errorMessage: 'Falha no HUB' }));
  });

  it('sem accessTokenEncrypted em produção → erro seguro', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const noToken = {
      ...connectedBry,
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected' as const,
        pscProvider: 'safeid',
      },
    };

    await expect(
      submitBryPrescriptionSignature(
        { doctorId: 'med-1', patientId: 'pac-1', originalPdfBuffer: pdf },
        {
          getDoctorSignatureProvider: vi.fn().mockResolvedValue(noToken),
          getAdapter: () => adapter,
          allocateValidation,
          createRequest,
          updateRequest,
          uploadSignedPdf,
          fetchPdfFromUrl,
          resolvePrescriptionMetadata,
          resolveVisualFooterParams,
          applyVisualFooter,
          incrementSessionUsedDocuments,
          expireSignatureSession,
        }
      )
    ).rejects.toThrow(BRY_SIGNATURE_MISSING_TOKEN_ERROR);
  });
});
