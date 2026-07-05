import { FieldValue } from 'firebase-admin/firestore';
import { CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION } from '@/lib/documentos/contrato-tratamento/contratoTratamentoConstants';
import { SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO } from '@/types/digitalSignature';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  contratoDocRef,
  loadContratoDocumentoForEasySignPoc,
} from '@/lib/signature/bryEasySign/contratoTratamentoEasySignPoc.server';

export async function solicitarAssinaturaPacienteContratoAdmin(args: {
  pacienteId: string;
  medicoId: string;
  hashDocumento: string;
  documentoId?: string;
}): Promise<string> {
  const hash = args.hashDocumento.trim();
  if (!hash) throw new Error('Hash do contrato inválido.');

  const db = getFirestoreAdmin();
  let documentoId = args.documentoId?.trim() || '';

  if (documentoId) {
    const doc = await loadContratoDocumentoForEasySignPoc(args.pacienteId, documentoId);
    if (doc.statusAssinatura === 'assinado_completo') {
      throw new Error('Este contrato já está completo.');
    }
    if (doc.statusAssinatura === 'aguardando_medico') {
      throw new Error('O paciente já assinou. Conclua com a assinatura digital do médico.');
    }
    if (
      doc.statusAssinatura === 'aguardando_paciente' &&
      doc.fluxoAssinatura === 'paciente_primeiro'
    ) {
      return documentoId;
    }
    if (
      doc.statusAssinatura === 'aguardando_paciente' &&
      doc.fluxoAssinatura === 'medico_primeiro'
    ) {
      throw new Error('Contrato legado aguardando paciente após assinatura médica.');
    }
  }

  const payload = {
    tipoDocumento: SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO,
    medicoId: args.medicoId,
    pacienteId: args.pacienteId,
    hashDocumento: hash,
    statusAssinatura: 'aguardando_paciente',
    fluxoAssinatura: 'paciente_primeiro',
    solicitadoPacienteEm: FieldValue.serverTimestamp(),
    pdfUrl: null,
    pdfAssinadoMedicoUrl: null,
    pdfFinalAssinadoUrl: null,
    medicoAssinadoEm: null,
    pacienteSignLinkUrl: null,
    pacienteSignIframeUrl: null,
    pacienteSignStatus: null,
    pacienteSignErrorMessage: null,
    pacienteSignErrorAt: null,
    pacienteAssinadoEm: null,
    pacienteSignRequestedAt: null,
    easysignPoc: false,
    bryEasySignEnvelopeId: null,
    bryEasySignDocumentUuid: null,
    bryEasySignSignerNonce: null,
    pdfParaAssinaturaPacienteUrl: null,
    opcaoEntregaMaterial: null,
    opcaoEntregaMaterialEm: null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (documentoId) {
    await contratoDocRef(args.pacienteId, documentoId).set(payload, { merge: true });
    return documentoId;
  }

  const ref = await db
    .collection('pacientes_completos')
    .doc(args.pacienteId)
    .collection(CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION)
    .add({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    });

  return ref.id;
}
