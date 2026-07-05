import type {
  ArchivedLaudoCaseAiOutput,
  ArchivedLaudoCaseFeedback,
  ArchivedLaudoCaseFile,
  DoctorAgreement,
} from '@/lib/oftpay/laudoCaseArchive';

export type ArchivePayload = {
  patientId?: string | null;
  analysisVersion?: string | null;
  files?: ArchivedLaudoCaseFile[];
  binocularContext?: unknown;
  temporalContext?: unknown;
  aiOutput?: ArchivedLaudoCaseAiOutput;
  feedback?: ArchivedLaudoCaseFeedback;
};

export function validateArchivePayload(payload: ArchivePayload): { valid: boolean; error?: string } {
  if (!Array.isArray(payload.files) || payload.files.length === 0) {
    return { valid: false, error: 'Envie ao menos um arquivo para arquivamento.' };
  }
  if (!payload.aiOutput || typeof payload.aiOutput !== 'object') {
    return { valid: false, error: 'aiOutput é obrigatório.' };
  }
  if (
    typeof payload.aiOutput.initialAnalysis !== 'string' ||
    !payload.aiOutput.initialAnalysis.trim()
  ) {
    return { valid: false, error: 'A análise inicial é obrigatória para arquivar.' };
  }
  const agreement = payload.feedback?.doctorAgreement;
  if (
    agreement != null &&
    agreement !== '' &&
    !(['agree', 'partial', 'disagree'] as DoctorAgreement[]).includes(
      agreement as DoctorAgreement
    )
  ) {
    return { valid: false, error: 'doctorAgreement inválido.' };
  }
  return { valid: true };
}
