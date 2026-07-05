import {
  downloadBryEasySignSignedPdfUnsafe,
  isBryEasySignPatientSignatureComplete,
} from '@/lib/signature/bryEasySign/bryEasySignClient';
import { fetchBryEasySignPatientEvidence } from '@/lib/signature/bryEasySign/bryEasySignPatientEvidence.server';

const SIGNER_DONE_STATUSES = new Set([
  'SIGNED',
  'COMPLETED',
  'COMPLETED_SIGN',
  'COMPLETE',
  'FINISHED',
  'FINALIZED',
  'FINALIZADO',
  'FINALIZADA',
  'DONE',
  'ASSINADO',
  'ASSINADA',
  'CONCLUIDO',
  'CONCLUÍDO',
  'CONCLUIDA',
  'CONCLUÍDA',
  'CONCLUDED',
  'APPROVED',
  'APROVADO',
  'APROVADA',
  'SUCCESS',
  'SUCESSO',
]);

export class PatientSignatureNotReadyError extends Error {
  constructor(
    message = 'O paciente ainda não concluiu a assinatura no EasySign (OTP e confirmação pendentes).'
  ) {
    super(message);
    this.name = 'PatientSignatureNotReadyError';
  }
}

function normalizeStatus(value: string | undefined): string {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function signerStatusIndicatesComplete(status: string | undefined): boolean {
  const normalized = normalizeStatus(status);
  return normalized.length > 0 && SIGNER_DONE_STATUSES.has(normalized);
}

async function assertSignedPdfDiffersFromBase(args: {
  envelopeId: string;
  documentUuid: string;
  basePdfUrl: string;
}): Promise<void> {
  const signedBuf = await downloadBryEasySignSignedPdfUnsafe(args.envelopeId, args.documentUuid);
  if (!signedBuf.length) {
    throw new PatientSignatureNotReadyError('PDF assinado retornado pela BRy está vazio.');
  }

  const baseRes = await fetch(args.basePdfUrl.trim());
  if (!baseRes.ok) {
    throw new PatientSignatureNotReadyError(
      `Não foi possível validar o PDF base do contrato (${baseRes.status}).`
    );
  }

  const baseBuf = Buffer.from(await baseRes.arrayBuffer());
  if (!baseBuf.length) {
    throw new PatientSignatureNotReadyError('PDF base do contrato está vazio.');
  }

  if (signedBuf.equals(baseBuf)) {
    throw new PatientSignatureNotReadyError(
      'O PDF retornado pela BRy ainda não contém a assinatura do paciente.'
    );
  }

  if (signedBuf.length <= baseBuf.length + 200) {
    throw new PatientSignatureNotReadyError(
      'O PDF retornado pela BRy ainda não contém alterações de assinatura do paciente.'
    );
  }
}

/**
 * Garante que a BRy confirmou a conclusão da assinatura do paciente antes de persistir no Firestore.
 * Evita falso positivo quando /signed devolve o PDF original sem OTP concluído.
 */
export async function assertBryEasySignPatientSignatureReady(args: {
  envelopeId: string;
  documentUuid: string;
  basePdfUrl?: string | null;
  signerNonce?: string | null;
}): Promise<void> {
  const envelopeId = args.envelopeId.trim();
  const documentUuid = args.documentUuid.trim();
  if (!envelopeId || !documentUuid) {
    throw new PatientSignatureNotReadyError('Envelope EasySign incompleto.');
  }

  const basePdfUrl = args.basePdfUrl?.trim() || '';
  const statusComplete = await isBryEasySignPatientSignatureComplete(envelopeId);

  if (statusComplete) {
    if (basePdfUrl) {
      await assertSignedPdfDiffersFromBase({ envelopeId, documentUuid, basePdfUrl });
    }
    return;
  }

  const evidence = await fetchBryEasySignPatientEvidence({
    envelopeId,
    signerNonce: args.signerNonce,
  });

  if (!evidence.signedAt) {
    throw new PatientSignatureNotReadyError();
  }

  if (!signerStatusIndicatesComplete(evidence.signerStatus)) {
    throw new PatientSignatureNotReadyError(
      `Assinatura do paciente ainda não concluída na BRy (status: ${evidence.signerStatus || 'pendente'}).`
    );
  }

  if (!basePdfUrl) {
    throw new PatientSignatureNotReadyError(
      'Não foi possível validar a assinatura do paciente (PDF base ausente).'
    );
  }

  await assertSignedPdfDiffersFromBase({ envelopeId, documentUuid, basePdfUrl });
}

export function isPatientSignatureNotReadyError(error: unknown): boolean {
  if (error instanceof PatientSignatureNotReadyError) return true;
  const message = error instanceof Error ? error.message : String(error);
  const m = message.toLowerCase();
  return (
    m.includes('ainda não concluiu') ||
    m.includes('ainda nao concluiu') ||
    m.includes('otp e confirmação pendentes') ||
    m.includes('otp e confirmacao pendentes') ||
    m.includes('ainda não contém a assinatura') ||
    m.includes('ainda nao contem a assinatura') ||
    m.includes('alterações de assinatura') ||
    m.includes('alteracoes de assinatura') ||
    m.includes('assinatura do paciente ainda não concluída') ||
    m.includes('assinatura do paciente ainda nao concluida')
  );
}
