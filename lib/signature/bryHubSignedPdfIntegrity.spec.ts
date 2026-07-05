import { afterEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { submitBryPrescriptionSignature } from '@/lib/signature/bryPrescriptionSignatureService';
import { BRY_CLOUD_PROVIDER_ID } from '@/lib/signature/brySignatureConstants';
import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';

async function minimalPdfBuffer(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Prescrição teste', { x: 72, y: 700, size: 12, font });
  return Buffer.from(await doc.save());
}

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

/**
 * Garante: rodapé antes da BRy; PDF assinado retornado pelo HUB é salvo sem pdf-lib pós-assinatura.
 * Validação ITI manual: https://validar.iti.gov.br com o PDF do Storage.
 */
describe('bryHubSignedPdfIntegrity', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('PDF assinado pelo HUB é persistido byte-a-byte sem modificação pós-assinatura', async () => {
    vi.stubEnv('SIGNATURE_TOKEN_ENCRYPTION_KEY', Buffer.alloc(32, 3).toString('base64'));

    const originalPdf = await minimalPdfBuffer();
    const footeredPdf = Buffer.from(`${originalPdf.toString()}--footer-applied`);
    const hubSignedPdf = Buffer.from('%PDF-1.7 signed-by-hub-cms-no-touch');

    const applyVisualFooter = vi.fn(async () => footeredPdf);
    const uploadSignedPdf = vi.fn().mockResolvedValue('https://storage.example/signed.pdf');

    const adapter: SignatureProviderAdapter = {
      providerId: BRY_CLOUD_PROVIDER_ID,
      startAuthorization: vi.fn(),
      submitPdfForSignature: vi.fn(),
      getSignatureStatus: vi.fn(),
      downloadSignedPdf: vi.fn(),
    };

    vi.mocked(adapter.submitPdfForSignature).mockImplementation(async (params) => {
      expect(params.originalPdfBuffer?.equals(footeredPdf)).toBe(true);
      return {
        ok: true,
        data: {
          requestId: 'req-integrity',
          status: 'signed',
          signedPdfBase64: hubSignedPdf.toString('base64'),
        },
      };
    });

    const r = await submitBryPrescriptionSignature(
      { doctorId: 'med-1', patientId: 'pac-1', originalPdfBuffer: originalPdf },
      {
        getDoctorSignatureProvider: vi.fn().mockResolvedValue(connectedBry),
        getAdapter: () => adapter,
        allocateValidation: vi.fn().mockResolvedValue({
          validationCode: 'OFTW-RE-INTEGRITY',
          publicValidationUrl: 'https://www.oftware.com.br/prescricao/documento?codigo=OFTW-RE-INTEGRITY',
          publicPdfUrl:
            'https://www.oftware.com.br/prescricao/documento?_format=application/pdf&codigo=OFTW-RE-INTEGRITY',
        }),
        createRequest: vi.fn().mockResolvedValue('req-integrity'),
        updateRequest: vi.fn().mockResolvedValue({}),
        uploadSignedPdf,
        fetchPdfFromUrl: vi.fn(),
        resolvePrescriptionMetadata: vi.fn().mockResolvedValue({ crm: '', crmUf: '', specialty: '' }),
        resolveVisualFooterParams: vi.fn().mockResolvedValue({
          physicianName: 'Dr. Teste',
          validationCode: 'OFTW-RE-INTEGRITY',
          publicValidationUrl: 'https://www.oftware.com.br/prescricao/documento?codigo=OFTW-RE-INTEGRITY',
          publicPdfUrl:
            'https://www.oftware.com.br/prescricao/documento?_format=application/pdf&codigo=OFTW-RE-INTEGRITY',
        }),
        applyVisualFooter,
        incrementSessionUsedDocuments: vi.fn(),
        expireSignatureSession: vi.fn(),
      }
    );

    expect(r.outcome).toBe('signed');
    expect(applyVisualFooter).toHaveBeenCalledTimes(1);
    expect(applyVisualFooter).toHaveBeenCalledWith(originalPdf, expect.any(Object));
    expect(adapter.submitPdfForSignature).toHaveBeenCalled();
    expect(uploadSignedPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        pdfBuffer: hubSignedPdf,
      })
    );
    expect(applyVisualFooter.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(adapter.submitPdfForSignature).mock.invocationCallOrder[0]!
    );
  });
});
