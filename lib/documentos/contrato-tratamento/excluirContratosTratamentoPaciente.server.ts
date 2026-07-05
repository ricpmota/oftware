import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION,
  CONTRATO_TRATAMENTO_TIPO_DOCUMENTO,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoConstants';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

const CONTRATO_STATUS_KNOWN = new Set([
  'rascunho',
  'assinado_medico',
  'aguardando_paciente',
  'aguardando_medico',
  'assinado_completo',
]);

export type ExcluirContratosTratamentoResult = {
  deletedDocumentoIds: string[];
  pacienteIdsLimpos: string[];
  tinhaAssinaturaPacienteAnterior: boolean;
};

function isContratoTratamentoFirestoreDoc(data: Record<string, unknown>): boolean {
  if (data.tipoDocumento === CONTRATO_TRATAMENTO_TIPO_DOCUMENTO) return true;

  const status = String(data.statusAssinatura || '');
  if (CONTRATO_STATUS_KNOWN.has(status) && (data.hashDocumento || data.medicoId)) {
    return true;
  }

  // Legado / registro só com assinatura do paciente (EasySign).
  if (data.pacienteAssinadoEm || data.bryEasySignEnvelopeId) return true;
  if (data.pacienteSignLinkUrl || data.pacienteSignStatus) return true;
  if (typeof data.pdfFinalAssinadoUrl === 'string' && data.pdfFinalAssinadoUrl.trim()) {
    return true;
  }

  return false;
}

function pacienteJaAssinou(data: Record<string, unknown>): boolean {
  if (data.statusAssinatura === 'assinado_completo') return true;
  if (data.statusAssinatura === 'aguardando_medico') return true;
  if (data.pacienteAssinadoEm) return true;
  if (data.pacienteSignStatus === 'assinado') return true;
  if (typeof data.pdfFinalAssinadoUrl === 'string' && data.pdfFinalAssinadoUrl.trim()) {
    return true;
  }
  return false;
}

/**
 * Inclui cadastros duplicados do mesmo login (userId / e-mail) para limpar o portal /meta.
 */
async function resolvePacienteIdsParaLimpezaContrato(
  pacienteId: string,
  medicoDocId: string
): Promise<string[]> {
  const db = getFirestoreAdmin();
  const primaryId = pacienteId.trim();
  const ids = new Set<string>([primaryId]);

  const snap = await db.collection('pacientes_completos').doc(primaryId).get();
  if (!snap.exists) return [...ids];

  const data = snap.data() as {
    medicoResponsavelId?: string;
    userId?: string;
    email?: string;
    dadosIdentificacao?: { email?: string };
  };

  if (data.medicoResponsavelId && data.medicoResponsavelId !== medicoDocId) {
    return [primaryId];
  }

  const uid = String(data.userId || '').trim();
  const email = String(data.email || data.dadosIdentificacao?.email || '')
    .trim()
    .toLowerCase();

  const candidatos: QueryDocumentSnapshot[] = [];

  if (uid) {
    const uidSnap = await db.collection('pacientes_completos').where('userId', '==', uid).get();
    candidatos.push(...uidSnap.docs);
  }

  if (email) {
    const emailSnap = await db.collection('pacientes_completos').where('email', '==', email).get();
    candidatos.push(...emailSnap.docs);

    const idEmailSnap = await db
      .collection('pacientes_completos')
      .where('dadosIdentificacao.email', '==', email)
      .get();
    candidatos.push(...idEmailSnap.docs);
  }

  for (const doc of candidatos) {
    ids.add(doc.id);
  }

  return [...ids];
}

/**
 * Remove contratos de tratamento do paciente (inclui versões anteriores assinadas pelo paciente).
 */
export async function excluirContratosTratamentoPacienteAdmin(args: {
  pacienteId: string;
  medicoDocId: string;
  documentoId?: string;
}): Promise<ExcluirContratosTratamentoResult> {
  const pacienteIds = await resolvePacienteIdsParaLimpezaContrato(args.pacienteId, args.medicoDocId);

  const deletedDocumentoIds = new Set<string>();
  let tinhaAssinaturaPacienteAnterior = false;

  for (const pacienteId of pacienteIds) {
    const subcol = getFirestoreAdmin()
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection(CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION);

    const snap = await subcol.get();

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const isExplicitTarget = args.documentoId?.trim() === docSnap.id;
      if (!isContratoTratamentoFirestoreDoc(data) && !isExplicitTarget) continue;

      if (pacienteJaAssinou(data)) {
        tinhaAssinaturaPacienteAnterior = true;
      }

      await docSnap.ref.delete();
      deletedDocumentoIds.add(`${pacienteId}/${docSnap.id}`);
    }
  }

  console.info('[contrato.excluir]', {
    pacienteId: args.pacienteId,
    pacienteIdsLimpos: pacienteIds,
    deletedCount: deletedDocumentoIds.size,
    tinhaAssinaturaPacienteAnterior,
  });

  return {
    deletedDocumentoIds: [...deletedDocumentoIds],
    pacienteIdsLimpos: pacienteIds,
    tinhaAssinaturaPacienteAnterior,
  };
}
