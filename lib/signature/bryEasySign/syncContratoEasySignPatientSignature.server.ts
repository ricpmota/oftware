import {
  downloadContratoEasySignFinalPdf,
  loadContratoDocumentoForEasySignPoc,
} from '@/lib/signature/bryEasySign/contratoTratamentoEasySignPoc.server';
import { sendContratoAssinadoPacienteEmail } from '@/lib/signature/bryEasySign/sendContratoAssinadoPacienteEmail.server';
import {
  assertBryEasySignPatientSignatureReady,
  isPatientSignatureNotReadyError,
} from '@/lib/signature/bryEasySign/assertBryEasySignPatientSignatureReady.server';
export type SyncContratoEasySignResult =
  | {
      ok: true;
      statusAssinatura: 'aguardando_paciente';
      pending: true;
    }
  | {
      ok: true;
      statusAssinatura: 'aguardando_medico' | 'assinado_completo';
      pending: false;
      pdfFinalAssinadoUrl: string;
      pacienteAssinadoEm: string;
      newlySynced: boolean;
      emailSent: boolean;
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

function pacienteSyncConcluido(doc: Awaited<ReturnType<typeof loadContratoDocumentoForEasySignPoc>>): boolean {
  if (!doc.pdfFinalAssinadoUrl?.trim()) return false;
  if (doc.statusAssinatura === 'aguardando_medico' || doc.statusAssinatura === 'assinado_completo') {
    return true;
  }
  return doc.pacienteSignStatus === 'assinado' && Boolean(doc.pacienteAssinadoEm);
}

/**
 * Baixa o PDF final do EasySign (se o paciente já assinou), atualiza Firestore e envia e-mail.
 */
export async function syncContratoEasySignPatientSignature(args: {
  pacienteId: string;
  documentoId: string;
  sendEmail?: boolean;
}): Promise<SyncContratoEasySignResult> {
  const sendEmail = args.sendEmail !== false;
  const doc = await loadContratoDocumentoForEasySignPoc(args.pacienteId, args.documentoId);

  if (pacienteSyncConcluido(doc)) {
    let emailSent = false;
    if (sendEmail) {
      const emailResult = await sendContratoAssinadoPacienteEmail({
        pacienteId: args.pacienteId,
        documentoId: args.documentoId,
        pdfFinalAssinadoUrl: doc.pdfFinalAssinadoUrl!.trim(),
      });
      emailSent = emailResult.sent;
    }
    const assinadoEmRaw = doc.pacienteAssinadoEm;
    const pacienteAssinadoEm =
      assinadoEmRaw &&
      typeof assinadoEmRaw === 'object' &&
      'toDate' in assinadoEmRaw &&
      typeof (assinadoEmRaw as { toDate: () => Date }).toDate === 'function'
        ? (assinadoEmRaw as { toDate: () => Date }).toDate().toISOString()
        : assinadoEmRaw instanceof Date
          ? assinadoEmRaw.toISOString()
          : new Date().toISOString();

    return {
      ok: true,
      statusAssinatura:
        doc.statusAssinatura === 'assinado_completo' ? 'assinado_completo' : 'aguardando_medico',
      pending: false,
      pdfFinalAssinadoUrl: doc.pdfFinalAssinadoUrl!.trim(),
      pacienteAssinadoEm,
      newlySynced: false,
      emailSent,
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
      basePdfUrl: doc.pdfParaAssinaturaPacienteUrl || doc.pdfAssinadoMedicoUrl || doc.pdfUrl,
      signerNonce: doc.bryEasySignSignerNonce,
    });

    const result = await downloadContratoEasySignFinalPdf({
      pacienteId: args.pacienteId,
      documentoId: args.documentoId,
    });

    const docAtualizado = await loadContratoDocumentoForEasySignPoc(args.pacienteId, args.documentoId);

    let emailSent = false;
    if (sendEmail) {
      const emailResult = await sendContratoAssinadoPacienteEmail({
        pacienteId: args.pacienteId,
        documentoId: args.documentoId,
        pdfFinalAssinadoUrl: result.pdfFinalAssinadoUrl,
      });
      emailSent = emailResult.sent;
    }

    return {
      ok: true,
      statusAssinatura:
        docAtualizado.statusAssinatura === 'assinado_completo'
          ? 'assinado_completo'
          : 'aguardando_medico',
      pending: false,
      pdfFinalAssinadoUrl: result.pdfFinalAssinadoUrl,
      pacienteAssinadoEm: result.pacienteAssinadoEm.toISOString(),
      newlySynced: true,
      emailSent,
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
