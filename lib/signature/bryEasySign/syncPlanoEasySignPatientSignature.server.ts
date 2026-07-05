import {
  downloadPlanoEasySignFinalPdf,
  loadPlanoDocumentoForEasySign,
} from '@/lib/signature/bryEasySign/planoTerapeuticoEasySign.server';
import {
  assertBryEasySignPatientSignatureReady,
  isPatientSignatureNotReadyError,
} from '@/lib/signature/bryEasySign/assertBryEasySignPatientSignatureReady.server';

export type SyncPlanoEasySignResult =
  | {
      ok: true;
      statusAssinatura: 'aguardando_paciente';
      pending: true;
    }
  | {
      ok: true;
      statusAssinatura: 'aceito';
      pending: false;
      pdfFinalAssinadoUrl: string;
      pacienteAssinadoEm: string;
      newlySynced: boolean;
    };

function isNotSignedYetError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('otp e confirmação pendentes') ||
    m.includes('otp e confirmacao pendentes') ||
    m.includes('ainda não contém a assinatura') ||
    m.includes('ainda nao contem a assinatura') ||
    m.includes('alterações de assinatura') ||
    m.includes('alteracoes de assinatura') ||
    m.includes('não confirmou a data da assinatura') ||
    m.includes('nao confirmou a data da assinatura') ||
    m.includes('ainda não ter assinado') ||
    m.includes('ainda nao ter assinado') ||
    m.includes('ainda não concluiu') ||
    m.includes('ainda nao concluiu') ||
    m.includes('não foi possível baixar o pdf final') ||
    m.includes('nao foi possivel baixar o pdf final') ||
    m.includes('(404)') ||
    m.includes('(400)') ||
    m.includes('(409)') ||
    m.includes('(403)')
  );
}

function pacienteSyncConcluido(
  doc: Awaited<ReturnType<typeof loadPlanoDocumentoForEasySign>>
): boolean {
  if (!doc.pdfFinalAssinadoUrl?.trim()) return false;
  return doc.status === 'aceito' || doc.pacienteSignStatus === 'assinado';
}

function timestampToIso(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

export async function syncPlanoEasySignPatientSignature(args: {
  pacienteId: string;
  orcamentoId: string;
  pacienteNome: string;
}): Promise<SyncPlanoEasySignResult> {
  const doc = await loadPlanoDocumentoForEasySign(args.pacienteId, args.orcamentoId);

  if (pacienteSyncConcluido(doc)) {
    return {
      ok: true,
      statusAssinatura: 'aceito',
      pending: false,
      pdfFinalAssinadoUrl: doc.pdfFinalAssinadoUrl!.trim(),
      pacienteAssinadoEm: timestampToIso(doc.pacienteAssinadoEm ?? doc.acceptedAt),
      newlySynced: false,
    };
  }

  try {
    const envelopeId = doc.bryEasySignEnvelopeId?.trim();
    const documentUuid = doc.bryEasySignDocumentUuid?.trim();
    if (!envelopeId || !documentUuid) {
      return {
        ok: true,
        statusAssinatura: 'aguardando_paciente',
        pending: true,
      };
    }

    await assertBryEasySignPatientSignatureReady({
      envelopeId,
      documentUuid,
      basePdfUrl: doc.pdfParaAssinaturaPacienteUrl || doc.pdfUrl,
      signerNonce: doc.bryEasySignSignerNonce,
    });

    const result = await downloadPlanoEasySignFinalPdf({
      pacienteId: args.pacienteId,
      orcamentoId: args.orcamentoId,
      pacienteNome: args.pacienteNome,
    });

    return {
      ok: true,
      statusAssinatura: 'aceito',
      pending: false,
      pdfFinalAssinadoUrl: result.pdfFinalAssinadoUrl,
      pacienteAssinadoEm: result.pacienteAssinadoEm.toISOString(),
      newlySynced: true,
    };
  } catch (error: unknown) {
    if (isPatientSignatureNotReadyError(error)) {
      return {
        ok: true,
        statusAssinatura: 'aguardando_paciente',
        pending: true,
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    if (isNotSignedYetError(message)) {
      return {
        ok: true,
        statusAssinatura: 'aguardando_paciente',
        pending: true,
      };
    }
    throw error;
  }
}
