import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';
import { pdfHasSandboxSimulationNotice } from '@/lib/signature/sandboxSignaturePdf';
import {
  simulateSandboxPdfSignature,
  type SandboxSignatureDeps,
} from '@/lib/signature/sandboxSignatureService';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';

async function createMinimalPdfBuffer(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 300]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Original', { x: 50, y: 150, size: 14, font });
  return Buffer.from(await doc.save());
}

const connectedSandbox: DoctorSignatureProvider = {
  provider: 'sandbox_mock',
  providerLabel: 'Sandbox / Teste interno',
  providerCategory: 'sandbox',
  status: 'connected',
};

function buildDeps(overrides: Partial<SandboxSignatureDeps> = {}): SandboxSignatureDeps {
  const statuses: string[] = [];
  let pendingId = 'req-test-1';
  let uploadedBuffer: Buffer | null = null;

  return {
    getDoctorSignatureProvider: vi.fn(async () => connectedSandbox),
    fetchOriginalPdf: vi.fn(async () => createMinimalPdfBuffer()),
    createPendingRequest: vi.fn(async () => {
      statuses.push('pending_provider_authorization');
      return pendingId;
    }),
    uploadSignedPdf: vi.fn(async ({ pdfBuffer }) => {
      uploadedBuffer = pdfBuffer;
      return `https://storage.googleapis.com/bucket/digital-signatures/sandbox/doc/${pendingId}/signed.pdf`;
    }),
    finalizeSignedRequest: vi.fn(async ({ requestId, signedPdfUrl, originalHash, signedHash }) => {
      statuses.push('signed');
      expect(requestId).toBe(pendingId);
      expect(signedPdfUrl).toContain('signed.pdf');
      expect(originalHash).toHaveLength(64);
      expect(signedHash).toHaveLength(64);
      expect(originalHash).not.toBe(signedHash);
    }),
    now: () => new Date('2026-05-22T12:00:00.000Z'),
    ...overrides,
  };
}

describe('simulateSandboxPdfSignature', () => {
  it('médico sem sandbox conectado → erro', async () => {
    const deps = buildDeps({
      getDoctorSignatureProvider: vi.fn(async () => ({
        provider: 'bry',
        providerLabel: 'Bry',
        providerCategory: 'signature_platform',
        status: 'connected',
      })),
    });

    await expect(
      simulateSandboxPdfSignature(
        {
          doctorId: 'med-1',
          documentType: 'prescription',
          originalPdfUrl: 'https://example.com/doc.pdf',
          originalPdfBuffer: await createMinimalPdfBuffer(),
        },
        deps
      )
    ).rejects.toThrow(NON_SANDBOX_PROVIDER_SIGNATURE_ERROR);
  });

  it('sandbox conectado → request signed com hashes', async () => {
    const deps = buildDeps();
    const original = await createMinimalPdfBuffer();

    const result = await simulateSandboxPdfSignature(
      {
        doctorId: 'med-1',
        patientId: 'pac-1',
        documentType: 'prescription',
        originalPdfUrl: 'https://example.com/original.pdf',
        originalPdfBuffer: original,
      },
      deps
    );

    expect(result.status).toBe('signed');
    expect(result.requestId).toBe('req-test-1');
    expect(result.originalHash).toHaveLength(64);
    expect(result.signedHash).toHaveLength(64);
    expect(result.signedPdfUrl).toContain('signed.pdf');

    expect(deps.createPendingRequest).toHaveBeenCalledOnce();
    expect(deps.finalizeSignedRequest).toHaveBeenCalledOnce();

    const uploadCall = vi.mocked(deps.uploadSignedPdf).mock.calls[0]![0];
    expect(await pdfHasSandboxSimulationNotice(original, uploadCall.pdfBuffer)).toBe(true);
  });

  it('status muda de pending_provider_authorization para signed', async () => {
    const order: string[] = [];
    const deps = buildDeps({
      createPendingRequest: vi.fn(async () => {
        order.push('pending_provider_authorization');
        return 'req-2';
      }),
      finalizeSignedRequest: vi.fn(async () => {
        order.push('signed');
      }),
    });

    await simulateSandboxPdfSignature(
      {
        doctorId: 'med-2',
        documentType: 'exam_request',
        originalPdfUrl: 'https://example.com/a.pdf',
        originalPdfBuffer: await createMinimalPdfBuffer(),
      },
      deps
    );

    expect(order).toEqual(['pending_provider_authorization', 'signed']);
  });
});
