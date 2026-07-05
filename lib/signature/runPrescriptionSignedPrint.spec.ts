import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPrescriptionSignedPrintEligibility } from '@/lib/signature/prescriptionPrintEligibility';
import { runPrescriptionSignedPrint } from '@/lib/signature/runPrescriptionSignedPrint';
import { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

vi.mock('@/utils/prescricaoPdfGenerate', () => ({
  buildPrescricaoJsPdfDocument: vi.fn().mockResolvedValue({
    output: () => new ArrayBuffer(8),
  }),
  openPrescricaoPdfUrl: vi.fn(),
}));

vi.mock('@/lib/signature/requestSandboxPrescriptionSignature', () => ({
  requestSandboxPrescriptionSignature: vi.fn().mockResolvedValue({
    ok: true,
    requestId: 's1',
    status: 'signed',
    signedPdfUrl: 'https://sandbox.example/s.pdf',
    originalHash: 'a',
    signedHash: 'b',
  }),
  arrayBufferToBase64: () => 'cGRm',
}));

vi.mock('@/lib/signature/requestBryPrescriptionSignature', () => ({
  requestBryPrescriptionSignature: vi.fn(),
}));

import { requestBryPrescriptionSignature } from '@/lib/signature/requestBryPrescriptionSignature';
import { requestSandboxPrescriptionSignature } from '@/lib/signature/requestSandboxPrescriptionSignature';
import { openPrescricaoPdfUrl } from '@/utils/prescricaoPdfGenerate';

const basePrescricao = {
  id: 'p1',
  tipoDocumento: 'prescricao_medica',
} as import('@/types/prescricao').Prescricao;

describe('runPrescriptionSignedPrint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sandbox continua chamando API sandbox', async () => {
    await runPrescriptionSignedPrint({
      patientId: 'pac-1',
      prescricao: basePrescricao,
      medico: null,
      ctx: {},
      providerConfig: {
        provider: 'sandbox_mock',
        providerLabel: 'Sandbox',
        providerCategory: 'sandbox',
        status: 'connected',
      },
    });

    expect(requestSandboxPrescriptionSignature).toHaveBeenCalled();
    expect(openPrescricaoPdfUrl).toHaveBeenCalledWith('https://sandbox.example/s.pdf');
  });

  it('bry_cloud abre PDF quando assinado', async () => {
    vi.mocked(requestBryPrescriptionSignature).mockResolvedValue({
      ok: true,
      outcome: 'signed',
      requestId: 'r1',
      status: 'signed',
      signedPdfUrl: 'https://bry.example/s.pdf',
      originalHash: 'oh',
      signedHash: 'sh',
    });

    const r = await runPrescriptionSignedPrint({
      patientId: 'pac-1',
      prescricao: basePrescricao,
      medico: null,
      ctx: {},
      providerConfig: {
        provider: BRY_CLOUD_PROVIDER_ID,
        providerLabel: 'BRy',
        providerCategory: 'signature_platform',
        status: 'connected',
        connection: {
          provider: BRY_CLOUD_PROVIDER_ID,
          status: 'connected',
          accessTokenEncrypted: 'v1:a:b:c',
        },
      },
    });

    expect(requestBryPrescriptionSignature).toHaveBeenCalled();
    expect(r.outcome).toBe('opened');
  });

  it('bry_cloud pendente retorna mensagem sem abrir PDF', async () => {
    vi.mocked(requestBryPrescriptionSignature).mockResolvedValue({
      ok: true,
      outcome: 'pending',
      requestId: 'r2',
      status: 'sent_to_provider',
      message: 'Aguarde',
    });

    const r = await runPrescriptionSignedPrint({
      patientId: 'pac-1',
      prescricao: basePrescricao,
      medico: null,
      ctx: {},
      providerConfig: {
        provider: BRY_CLOUD_PROVIDER_ID,
        providerLabel: 'BRy',
        providerCategory: 'signature_platform',
        status: 'connected',
        connection: {
          provider: BRY_CLOUD_PROVIDER_ID,
          status: 'connected',
          accessTokenEncrypted: 'v1:a:b:c',
        },
      },
    });

    expect(r.outcome).toBe('pending');
    expect(openPrescricaoPdfUrl).not.toHaveBeenCalled();
  });

  it('provider real não suportado → indisponível', () => {
    const e = getPrescriptionSignedPrintEligibility({
      provider: 'bry',
      providerLabel: 'Bry',
      providerCategory: 'signature_platform',
      status: 'connected',
    });
    expect(e.allowed).toBe(false);
    if (!e.allowed) expect(e.message).toBe(NON_SANDBOX_PROVIDER_SIGNATURE_ERROR);
  });
});
