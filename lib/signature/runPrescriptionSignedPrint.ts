import {
  getPrescriptionSignedPrintEligibility,
  type PrescriptionSignedPrintEligibility,
} from '@/lib/signature/prescriptionPrintEligibility';
import { requestBryPrescriptionSignature } from '@/lib/signature/requestBryPrescriptionSignature';
import { arrayBufferToBase64, requestSandboxPrescriptionSignature } from '@/lib/signature/requestSandboxPrescriptionSignature';
import type { ReceituarioControleEspecialPacienteContext } from '@/lib/prescricao/receituarioControleEspecialContext';
import { buildPrescricaoJsPdfDocument } from '@/utils/prescricaoPdfGenerate';
import { openPrescricaoPdfUrl } from '@/utils/prescricaoPdfGenerate';
import { generateReceituarioControleEspecialPdf } from '@/utils/receituarioControleEspecialPdfGenerate';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import type { Medico } from '@/types/medico';
import type { Prescricao } from '@/types/prescricao';
import type { PrescriptionPrintType } from '@/types/prescriptionPrintType';
import type { PrescricaoPdfPacienteContext } from '@/utils/prescricaoPdfDownload';

export type PrescriptionSignedPrintProgressPhase = 'generating_pdf' | 'submitting_signature';

export type PrescriptionSignedPrintResult =
  | { outcome: 'opened'; signedPdfUrl: string }
  | { outcome: 'pending'; message: string; requestId: string };

export type RunPrescriptionSignedPrintParams = {
  patientId: string;
  prescricao: Prescricao;
  medico: Medico | null;
  ctx: PrescricaoPdfPacienteContext;
  providerConfig?: DoctorSignatureProvider | null;
  printType?: PrescriptionPrintType;
  controleEspecialCtx?: ReceituarioControleEspecialPacienteContext;
  onProgress?: (phase: PrescriptionSignedPrintProgressPhase) => void;
};

function resolveEligibility(
  providerConfig: DoctorSignatureProvider | null | undefined,
  prescricao: Prescricao
): PrescriptionSignedPrintEligibility {
  return getPrescriptionSignedPrintEligibility(providerConfig, {
    isRecibo: prescricao.tipoDocumento === 'recibo_medico',
  });
}

async function buildOriginalPdfBase64(
  prescricao: Prescricao,
  medico: Medico | null,
  ctx: PrescricaoPdfPacienteContext,
  omitManualSignatureBlock: boolean,
  printType: PrescriptionPrintType = 'simple',
  controleEspecialCtx?: ReceituarioControleEspecialPacienteContext
): Promise<string> {
  const doc =
    printType === 'controle_especial' && controleEspecialCtx
      ? await generateReceituarioControleEspecialPdf(prescricao, medico, controleEspecialCtx, {
          reserveSignedFooterSpace: omitManualSignatureBlock,
        })
      : await buildPrescricaoJsPdfDocument(prescricao, medico, ctx, {
          omitManualSignatureBlock,
        });
  const ab = doc.output('arraybuffer') as ArrayBuffer;
  return arrayBufferToBase64(ab);
}

/**
 * Gera PDF no cliente e assina via sandbox ou BRy Cloud conforme provedor conectado.
 */
export async function runPrescriptionSignedPrint(
  params: RunPrescriptionSignedPrintParams
): Promise<PrescriptionSignedPrintResult> {
  const eligibility = resolveEligibility(params.providerConfig, params.prescricao);
  if (!eligibility.allowed) {
    throw new Error(eligibility.message);
  }

  params.onProgress?.('generating_pdf');
  const omitManualSignatureBlock = eligibility.mode === 'bry_cloud';
  const printType = params.printType ?? 'simple';
  const originalPdfBase64 = await buildOriginalPdfBase64(
    params.prescricao,
    params.medico,
    params.ctx,
    omitManualSignatureBlock,
    printType,
    params.controleEspecialCtx
  );

  params.onProgress?.('submitting_signature');

  if (eligibility.mode === 'sandbox') {
    const result = await requestSandboxPrescriptionSignature({
      patientId: params.patientId,
      originalPdfBase64,
      prescriptionPrintType: printType,
    });
    openPrescricaoPdfUrl(result.signedPdfUrl);
    return { outcome: 'opened', signedPdfUrl: result.signedPdfUrl };
  }

  if (eligibility.mode === 'bry_cloud') {
    const result = await requestBryPrescriptionSignature({
      patientId: params.patientId,
      originalPdfBase64,
      prescriptionPrintType: printType,
    });

    if (result.outcome === 'signed') {
      openPrescricaoPdfUrl(result.signedPdfUrl);
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
