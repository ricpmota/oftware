import {
  getPrescriptionSignedPrintEligibility,
  type PrescriptionSignedPrintEligibility,
} from '@/lib/signature/prescriptionPrintEligibility';
import { requestBryContratoTratamentoSignature } from '@/lib/signature/requestBryContratoTratamentoSignature';
import { requestSandboxContratoTratamentoSignature } from '@/lib/signature/requestSandboxContratoTratamentoSignature';
import { arrayBufferToBase64 } from '@/lib/signature/requestSandboxPrescriptionSignature';
import { buildContratoTratamentoJsPdfDocument, openContratoTratamentoPdfUrl } from '@/lib/documentos/contrato-tratamento/contratoTratamentoPdf';
import {
  buildContratoTratamentoTexto,
  salvarContratoTratamentoDocumento,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoService';
import { requestContratoEasySignCreateLink } from '@/lib/signature/requestContratoEasySignPoc';
import type { ContratoTratamentoBuildContext } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';

export type ContratoTratamentoSignedPrintProgressPhase = 'generating_pdf' | 'submitting_signature';

export type ContratoTratamentoSignedPrintResult =
  | { outcome: 'opened'; signedPdfUrl: string; hashDocumento: string; documentoId?: string }
  | { outcome: 'pending'; message: string; requestId: string; hashDocumento: string };

export type RunContratoTratamentoSignedPrintParams = {
  patientId: string;
  paciente: PacienteCompleto;
  medico: Medico | null;
  medicoId: string;
  ctx: ContratoTratamentoBuildContext;
  providerConfig?: DoctorSignatureProvider | null;
  onProgress?: (phase: ContratoTratamentoSignedPrintProgressPhase) => void;
};

function resolveEligibility(
  providerConfig: DoctorSignatureProvider | null | undefined
): PrescriptionSignedPrintEligibility {
  return getPrescriptionSignedPrintEligibility(providerConfig);
}

/** Após assinatura médica: gera link EasySign do paciente (flag POC). Falha não desfaz a assinatura médica. */
async function tryDisponibilizarContratoPacienteAutomaticamente(args: {
  pacienteId: string;
  documentoId: string;
}): Promise<void> {
  try {
    await requestContratoEasySignCreateLink(args);
  } catch (error) {
    console.error('[contrato] Falha ao disponibilizar assinatura do paciente automaticamente:', error);
  }
}

async function buildOriginalPdfBase64(
  medico: Medico | null,
  paciente: PacienteCompleto,
  ctx: ContratoTratamentoBuildContext,
  omitManualSignatureBlock: boolean
): Promise<{ base64: string; hashDocumento: string; ctxComHash: ContratoTratamentoBuildContext }> {
  const { hashDocumento } = await buildContratoTratamentoTexto(medico, paciente, ctx);
  const ctxComHash = {
    ...ctx,
    hashDocumento,
    reservaAssinaturaDigitalNoPdf: omitManualSignatureBlock,
  };
  const doc = await buildContratoTratamentoJsPdfDocument(medico, paciente, ctxComHash, {
    omitManualSignatureBlock,
  });
  const ab = doc.output('arraybuffer') as ArrayBuffer;
  return {
    base64: arrayBufferToBase64(ab),
    hashDocumento,
    ctxComHash,
  };
}

export type RunContratoMedicoAposPacienteParams = {
  patientId: string;
  paciente: PacienteCompleto;
  medico: Medico | null;
  medicoId: string;
  documentoId: string;
  pacientePdfUrl: string;
  hashDocumento: string;
  providerConfig?: DoctorSignatureProvider | null;
  onProgress?: (phase: ContratoTratamentoSignedPrintProgressPhase) => void;
};

/** Assina digitalmente o PDF já assinado pelo paciente (fluxo paciente primeiro). */
export async function runContratoTratamentoMedicoAssinaAposPaciente(
  params: RunContratoMedicoAposPacienteParams
): Promise<ContratoTratamentoSignedPrintResult> {
  const eligibility = resolveEligibility(params.providerConfig);
  if (!eligibility.allowed) {
    throw new Error(eligibility.message);
  }

  const pacientePdfUrl = params.pacientePdfUrl?.trim();
  if (!pacientePdfUrl) {
    throw new Error('PDF assinado pelo paciente não encontrado.');
  }

  params.onProgress?.('generating_pdf');
  const hashDocumento = params.hashDocumento;

  params.onProgress?.('submitting_signature');

  const pdfSource = { originalPdfUrl: pacientePdfUrl };

  if (eligibility.mode === 'sandbox') {
    const result = await requestSandboxContratoTratamentoSignature({
      patientId: params.patientId,
      ...pdfSource,
    });
    openContratoTratamentoPdfUrl(result.signedPdfUrl);

    await salvarContratoTratamentoDocumento({
      pacienteId: params.patientId,
      medicoId: params.medicoId,
      hashDocumento,
      statusAssinatura: 'assinado_completo',
      pdfAssinadoMedicoUrl: result.signedPdfUrl,
      medicoAssinadoEm: new Date(),
      signatureRequestId: result.requestId,
      documentoId: params.documentoId,
    });

    return {
      outcome: 'opened',
      signedPdfUrl: result.signedPdfUrl,
      hashDocumento,
      documentoId: params.documentoId,
    };
  }

  if (eligibility.mode === 'bry_cloud') {
    const result = await requestBryContratoTratamentoSignature({
      patientId: params.patientId,
      ...pdfSource,
    });

    if (result.outcome === 'signed') {
      openContratoTratamentoPdfUrl(result.signedPdfUrl);

      await salvarContratoTratamentoDocumento({
        pacienteId: params.patientId,
        medicoId: params.medicoId,
        hashDocumento,
        statusAssinatura: 'assinado_completo',
        pdfAssinadoMedicoUrl: result.signedPdfUrl,
        medicoAssinadoEm: new Date(),
        signatureRequestId: result.requestId,
        documentoId: params.documentoId,
      });

      return {
        outcome: 'opened',
        signedPdfUrl: result.signedPdfUrl,
        hashDocumento,
        documentoId: params.documentoId,
      };
    }

    if (result.outcome === 'pending') {
      return {
        outcome: 'pending',
        message: result.message,
        requestId: result.requestId,
        hashDocumento,
      };
    }

    throw new Error('Resposta inesperada do servidor de assinatura do contrato.');
  }

  throw new Error('Modo de assinatura não suportado para contrato de tratamento.');
}

/**
 * Gera PDF do contrato e assina via sandbox ou BRy Cloud conforme provedor conectado.
 * @deprecated Fluxo legado (médico assina antes do paciente). Preferir solicitar assinatura do paciente.
 */
export async function runContratoTratamentoSignedPrint(
  params: RunContratoTratamentoSignedPrintParams
): Promise<ContratoTratamentoSignedPrintResult> {
  const eligibility = resolveEligibility(params.providerConfig);
  if (!eligibility.allowed) {
    throw new Error(eligibility.message);
  }

  params.onProgress?.('generating_pdf');
  const omitManualSignatureBlock = eligibility.mode === 'bry_cloud';
  const { base64: originalPdfBase64, hashDocumento } = await buildOriginalPdfBase64(
    params.medico,
    params.paciente,
    params.ctx,
    omitManualSignatureBlock
  );

  params.onProgress?.('submitting_signature');

  if (eligibility.mode === 'sandbox') {
    const result = await requestSandboxContratoTratamentoSignature({
      patientId: params.patientId,
      originalPdfBase64,
    });
    openContratoTratamentoPdfUrl(result.signedPdfUrl);

    const medicoAssinadoEm = new Date();
    const documentoId = await salvarContratoTratamentoDocumento({
      pacienteId: params.patientId,
      medicoId: params.medicoId,
      hashDocumento,
      statusAssinatura: 'aguardando_paciente',
      pdfAssinadoMedicoUrl: result.signedPdfUrl,
      medicoAssinadoEm,
      signatureRequestId: result.requestId,
    });

    await tryDisponibilizarContratoPacienteAutomaticamente({
      pacienteId: params.patientId,
      documentoId,
    });

    return {
      outcome: 'opened',
      signedPdfUrl: result.signedPdfUrl,
      hashDocumento,
      documentoId,
    };
  }

  if (eligibility.mode === 'bry_cloud') {
    const result = await requestBryContratoTratamentoSignature({
      patientId: params.patientId,
      originalPdfBase64,
    });

    if (result.outcome === 'signed') {
      openContratoTratamentoPdfUrl(result.signedPdfUrl);

      const medicoAssinadoEm = new Date();
      const documentoId = await salvarContratoTratamentoDocumento({
        pacienteId: params.patientId,
        medicoId: params.medicoId,
        hashDocumento,
        statusAssinatura: 'aguardando_paciente',
        pdfAssinadoMedicoUrl: result.signedPdfUrl,
        medicoAssinadoEm,
        signatureRequestId: result.requestId,
      });

      await tryDisponibilizarContratoPacienteAutomaticamente({
        pacienteId: params.patientId,
        documentoId,
      });

      return {
        outcome: 'opened',
        signedPdfUrl: result.signedPdfUrl,
        hashDocumento,
        documentoId,
      };
    }

    if (result.outcome === 'pending') {
      return {
        outcome: 'pending',
        message: result.message,
        requestId: result.requestId,
        hashDocumento,
      };
    }

    throw new Error('Resposta inesperada do servidor de assinatura do contrato.');
  }

  throw new Error('Modo de assinatura não suportado para contrato de tratamento.');
}
