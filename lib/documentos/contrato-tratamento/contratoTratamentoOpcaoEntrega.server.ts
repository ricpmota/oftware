import { FieldValue } from 'firebase-admin/firestore';
import { buildContratoTratamentoJsPdfDocument } from '@/lib/documentos/contrato-tratamento/contratoTratamentoPdf';
import { CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION } from '@/lib/documentos/contrato-tratamento/contratoTratamentoConstants';
import { buildContratoTratamentoTexto } from '@/lib/documentos/contrato-tratamento/contratoTratamentoService';
import {
  isContratoOpcaoEntregaMaterial,
  type ContratoOpcaoEntregaMaterial,
} from '@/lib/contratos/contratoOpcaoEntregaMaterial';
import { getAdminStorageBucket, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { publicBrySignedPdfStorageUrl } from '@/lib/signature/brySignatureConstants';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';

type ContratoDocOpcaoSnapshot = {
  statusAssinatura?: string;
  medicoId?: string;
  pacienteSignLinkUrl?: string | null;
  opcaoEntregaMaterial?: 'domicilio' | 'clinica' | null;
  pdfParaAssinaturaPacienteUrl?: string | null;
  hashDocumento?: string;
  medicoAssinadoEm?: { toDate?: () => Date } | Date | null;
};

function contratoDocRef(pacienteId: string, documentoId: string) {
  return getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection(CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION)
    .doc(documentoId);
}

async function loadContratoDoc(
  pacienteId: string,
  documentoId: string
): Promise<ContratoDocOpcaoSnapshot> {
  const snap = await contratoDocRef(pacienteId, documentoId).get();
  if (!snap.exists) {
    throw new Error('Documento do contrato não encontrado.');
  }
  return snap.data() as ContratoDocOpcaoSnapshot;
}

function contratoPdfComOpcaoStoragePath(pacienteId: string, documentoId: string): string {
  return `digital-signatures/contrato-tratamento/${pacienteId.trim()}/${documentoId.trim()}/pdf-paciente-com-opcao.pdf`;
}

async function loadMedicoForContratoPdf(medicoDocId: string): Promise<Medico | null> {
  const snap = await getFirestoreAdmin().collection('medicos').doc(medicoDocId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Medico, 'id'>) };
}

async function loadPacienteCompletoForContratoPdf(
  pacienteId: string
): Promise<PacienteCompleto | null> {
  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<PacienteCompleto, 'id'>) };
}

function toDateFromFirestore(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

/**
 * Gera o PDF definitivo com ( {{opcao1}} ) / ( {{opcao2}} ) preenchidos.
 * Um único PDF — gerado quando o paciente escolhe a opção.
 */
export async function gerarPdfContratoComOpcaoParaPaciente(args: {
  pacienteId: string;
  documentoId: string;
  medicoDocId: string;
  opcaoEntregaMaterial: ContratoOpcaoEntregaMaterial;
}): Promise<string> {
  if (!isContratoOpcaoEntregaMaterial(args.opcaoEntregaMaterial)) {
    throw new Error('Opção de entrega inválida.');
  }

  const medico = await loadMedicoForContratoPdf(args.medicoDocId);
  const paciente = await loadPacienteCompletoForContratoPdf(args.pacienteId);
  if (!paciente) throw new Error('Paciente não encontrado.');

  const doc = await loadContratoDoc(args.pacienteId, args.documentoId);

  const buildCtx = {
    medicoId: args.medicoDocId,
    pacienteId: args.pacienteId,
    hashDocumento: doc.hashDocumento || '',
    assinaturaMedicoEm: toDateFromFirestore(doc.medicoAssinadoEm),
    opcaoEntregaMaterial: args.opcaoEntregaMaterial,
    reservaAssinaturaDigitalNoPdf: true,
  };

  const { hashDocumento } = await buildContratoTratamentoTexto(medico, paciente, buildCtx);

  const jsPdf = await buildContratoTratamentoJsPdfDocument(
    medico,
    paciente,
    { ...buildCtx, hashDocumento },
    { omitManualSignatureBlock: true }
  );

  const pdfBuffer = Buffer.from(jsPdf.output('arraybuffer') as ArrayBuffer);
  const storagePath = contratoPdfComOpcaoStoragePath(args.pacienteId, args.documentoId);
  const bucket = getAdminStorageBucket();
  const fileRef = bucket.file(storagePath);

  await fileRef.save(pdfBuffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=3600',
    },
  });
  await fileRef.makePublic();
  const pdfParaAssinaturaPacienteUrl = publicBrySignedPdfStorageUrl(bucket.name, storagePath);

  await contratoDocRef(args.pacienteId, args.documentoId).update({
    pdfParaAssinaturaPacienteUrl,
    hashDocumento,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return pdfParaAssinaturaPacienteUrl;
}

export type SalvarOpcaoContratoResult = {
  opcaoEntregaMaterial: ContratoOpcaoEntregaMaterial;
  pdfParaAssinaturaPacienteUrl: string;
};

/** Salva a opção e gera o PDF único (opcao1/opcao2 com X). */
export async function salvarContratoOpcaoEntregaMaterialAdmin(args: {
  pacienteId: string;
  documentoId: string;
  opcaoEntregaMaterial: ContratoOpcaoEntregaMaterial;
}): Promise<SalvarOpcaoContratoResult> {
  if (!isContratoOpcaoEntregaMaterial(args.opcaoEntregaMaterial)) {
    throw new Error('Opção de entrega inválida.');
  }

  const doc = await loadContratoDoc(args.pacienteId, args.documentoId);

  if (doc.statusAssinatura !== 'aguardando_paciente') {
    throw new Error('O contrato não está aguardando assinatura do paciente.');
  }

  if (doc.pacienteSignLinkUrl?.trim()) {
    throw new Error('A assinatura já foi iniciada. Não é possível alterar a opção.');
  }

  const medicoDocId = doc.medicoId?.trim();
  if (!medicoDocId) {
    throw new Error('Contrato sem médico responsável registrado.');
  }

  await contratoDocRef(args.pacienteId, args.documentoId).update({
    opcaoEntregaMaterial: args.opcaoEntregaMaterial,
    opcaoEntregaMaterialEm: FieldValue.serverTimestamp(),
    pdfParaAssinaturaPacienteUrl: null,
    pacienteSignLinkUrl: null,
    pacienteSignIframeUrl: null,
    pacienteSignStatus: null,
    bryEasySignEnvelopeId: null,
    bryEasySignDocumentUuid: null,
    bryEasySignSignerNonce: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const pdfParaAssinaturaPacienteUrl = await gerarPdfContratoComOpcaoParaPaciente({
    pacienteId: args.pacienteId,
    documentoId: args.documentoId,
    medicoDocId,
    opcaoEntregaMaterial: args.opcaoEntregaMaterial,
  });

  return {
    opcaoEntregaMaterial: args.opcaoEntregaMaterial,
    pdfParaAssinaturaPacienteUrl,
  };
}

/** Usa o PDF já gerado na escolha da opção — não regenera. */
export async function obterPdfContratoGeradoParaPaciente(args: {
  pacienteId: string;
  documentoId: string;
}): Promise<string> {
  const doc = await loadContratoDoc(args.pacienteId, args.documentoId);
  const url =
    typeof doc.pdfParaAssinaturaPacienteUrl === 'string'
      ? doc.pdfParaAssinaturaPacienteUrl.trim()
      : '';
  if (!url) {
    throw new Error(
      'O PDF do contrato ainda não foi preparado. Selecione novamente como deseja receber o tratamento.'
    );
  }
  return url;
}
