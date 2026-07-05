import {
  getPrescriptionSignedPrintEligibility,
  type PrescriptionSignedPrintEligibility,
} from '@/lib/signature/prescriptionPrintEligibility';
import { requestBryExamRequestSignature } from '@/lib/signature/requestBryExamRequestSignature';
import { requestSandboxExamRequestSignature } from '@/lib/signature/requestSandboxExamRequestSignature';
import { arrayBufferToBase64 } from '@/lib/signature/requestSandboxPrescriptionSignature';
import { openPlanoTerapeuticoPdfUrl } from '@/utils/planoTerapeuticoPdfGenerate';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';

export type PlanoTerapeuticoSignedPrintProgressPhase = 'submitting_signature';

export type PlanoTerapeuticoSignedPrintResult =
  | { outcome: 'opened'; signedPdfUrl: string }
  | { outcome: 'pending'; message: string; requestId: string };

export type RunPlanoTerapeuticoSignedPrintParams = {
  patientId: string;
  originalPdfUrl: string;
  providerConfig?: DoctorSignatureProvider | null;
  onProgress?: (phase: PlanoTerapeuticoSignedPrintProgressPhase) => void;
};

function resolveEligibility(
  providerConfig: DoctorSignatureProvider | null | undefined
): PrescriptionSignedPrintEligibility {
  return getPrescriptionSignedPrintEligibility(providerConfig);
}

async function fetchPdfBase64FromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Não foi possível carregar o PDF do plano.');
  const ab = await res.arrayBuffer();
  return arrayBufferToBase64(ab);
}

/**
 * Assina digitalmente o PDF do plano terapêutico (sandbox ou BRy), reutilizando o fluxo de requisição de exames.
 */
export async function runPlanoTerapeuticoSignedPrint(
  params: RunPlanoTerapeuticoSignedPrintParams
): Promise<PlanoTerapeuticoSignedPrintResult> {
  const eligibility = resolveEligibility(params.providerConfig);
  if (!eligibility.allowed) {
    throw new Error(eligibility.message);
  }

  params.onProgress?.('submitting_signature');
  const originalPdfBase64 = await fetchPdfBase64FromUrl(params.originalPdfUrl);

  if (eligibility.mode === 'sandbox') {
    const result = await requestSandboxExamRequestSignature({
      patientId: params.patientId,
      originalPdfBase64,
    });
    openPlanoTerapeuticoPdfUrl(result.signedPdfUrl);
    return { outcome: 'opened', signedPdfUrl: result.signedPdfUrl };
  }

  if (eligibility.mode === 'bry_cloud') {
    const result = await requestBryExamRequestSignature({
      patientId: params.patientId,
      originalPdfBase64,
    });

    if (result.outcome === 'signed') {
      openPlanoTerapeuticoPdfUrl(result.signedPdfUrl);
      return { outcome: 'opened', signedPdfUrl: result.signedPdfUrl };
    }

    return {
      outcome: 'pending',
      message: result.message,
      requestId: result.requestId,
    };
  }

  throw new Error(eligibility.message);
}
