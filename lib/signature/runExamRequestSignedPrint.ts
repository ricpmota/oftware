import {
  getPrescriptionSignedPrintEligibility,
  type PrescriptionSignedPrintEligibility,
} from '@/lib/signature/prescriptionPrintEligibility';
import { requestBryExamRequestSignature } from '@/lib/signature/requestBryExamRequestSignature';
import { requestSandboxExamRequestSignature } from '@/lib/signature/requestSandboxExamRequestSignature';
import { arrayBufferToBase64 } from '@/lib/signature/requestSandboxPrescriptionSignature';
import {
  buildSolicitacaoExamesJsPdfDocument,
  openSolicitacaoExamesPdfUrl,
} from '@/utils/solicitacaoExamesPdfGenerate';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import type { Medico } from '@/types/medico';
import type { SolicitacaoExamesPdfContext } from '@/utils/solicitacaoExamesPdfDownload';

export type ExamRequestSignedPrintProgressPhase = 'generating_pdf' | 'submitting_signature';

export type ExamRequestSignedPrintResult =
  | { outcome: 'opened'; signedPdfUrl: string }
  | { outcome: 'pending'; message: string; requestId: string };

export type RunExamRequestSignedPrintParams = {
  patientId: string;
  exames: string[];
  hipoteseDiagnostica: string;
  medico: Medico | null;
  ctx: SolicitacaoExamesPdfContext;
  providerConfig?: DoctorSignatureProvider | null;
  onProgress?: (phase: ExamRequestSignedPrintProgressPhase) => void;
};

function resolveEligibility(
  providerConfig: DoctorSignatureProvider | null | undefined
): PrescriptionSignedPrintEligibility {
  return getPrescriptionSignedPrintEligibility(providerConfig);
}

async function buildOriginalPdfBase64(
  params: RunExamRequestSignedPrintParams,
  omitManualSignatureBlock: boolean
): Promise<string> {
  const doc = await buildSolicitacaoExamesJsPdfDocument(
    {
      exames: params.exames,
      hipoteseDiagnostica: params.hipoteseDiagnostica,
      medico: params.medico,
      ctx: params.ctx,
    },
    { omitManualSignatureBlock }
  );
  const ab = doc.output('arraybuffer') as ArrayBuffer;
  return arrayBufferToBase64(ab);
}

/**
 * Gera PDF da requisição de exames e assina via sandbox ou BRy Cloud conforme provedor conectado.
 */
export async function runExamRequestSignedPrint(
  params: RunExamRequestSignedPrintParams
): Promise<ExamRequestSignedPrintResult> {
  const eligibility = resolveEligibility(params.providerConfig);
  if (!eligibility.allowed) {
    throw new Error(eligibility.message);
  }

  params.onProgress?.('generating_pdf');
  const omitManualSignatureBlock = eligibility.mode === 'bry_cloud';
  const originalPdfBase64 = await buildOriginalPdfBase64(params, omitManualSignatureBlock);

  params.onProgress?.('submitting_signature');

  if (eligibility.mode === 'sandbox') {
    const result = await requestSandboxExamRequestSignature({
      patientId: params.patientId,
      originalPdfBase64,
    });
    openSolicitacaoExamesPdfUrl(result.signedPdfUrl);
    return { outcome: 'opened', signedPdfUrl: result.signedPdfUrl };
  }

  if (eligibility.mode === 'bry_cloud') {
    const result = await requestBryExamRequestSignature({
      patientId: params.patientId,
      originalPdfBase64,
    });

    if (result.outcome === 'signed') {
      openSolicitacaoExamesPdfUrl(result.signedPdfUrl);
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
