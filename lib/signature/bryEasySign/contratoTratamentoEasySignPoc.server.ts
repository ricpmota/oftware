import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION } from '@/lib/documentos/contrato-tratamento/contratoTratamentoConstants';
import { SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO } from '@/types/digitalSignature';
import { getAdminStorageBucket, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { publicBrySignedPdfStorageUrl } from '@/lib/signature/brySignatureConstants';
import { contratoPocValidacaoFirestorePayload } from '@/lib/documentos/contrato-tratamento/contratoTratamentoPocValidacao';
import {
  createBryEasySignEnvelope,
  createEasySignSignerNonce,
  downloadBryEasySignSignedPdfUnsafe,
} from '@/lib/signature/bryEasySign/bryEasySignClient';
import { computeContratoPatientEasySignSignaturePositionMm } from '@/lib/signature/bryEasySign/contratoEasySignSignaturePosition';
import { fetchBryEasySignPatientEvidence } from '@/lib/signature/bryEasySign/bryEasySignPatientEvidence.server';
import { assertBryEasySignPatientSignatureReady } from '@/lib/signature/bryEasySign/assertBryEasySignPatientSignatureReady.server';
import { fetchBryEasySignPatientSignatureImageBytes } from '@/lib/signature/bryEasySign/bryEasySignPatientSignatureImage.server';
import { loadContratoValidationForEasySign } from '@/lib/signature/bryEasySign/loadContratoValidationForEasySign.server';
import { appendContratoTratamentoPatientEasySignEvidenceFooter } from '@/lib/signature/contratoTratamentoPatientSignedPdfVisualFooter';
import { obterPdfContratoGeradoParaPaciente } from '@/lib/documentos/contrato-tratamento/contratoTratamentoOpcaoEntrega.server';
import {
  createEasySignFlowContext,
  logEasySignError,
  logEasySignFlow,
  type EasySignFlowContext,
} from '@/lib/signature/bryEasySign/contratoEasySignFlowLog.server';

const MAX_PDF_BYTES = 12 * 1024 * 1024;

export type ContratoDocumentoFirestore = {
  id: string;
  tipoDocumento?: string;
  statusAssinatura?: string;
  pdfAssinadoMedicoUrl?: string;
  pdfUrl?: string;
  pdfParaAssinaturaPacienteUrl?: string | null;
  medicoId?: string;
  hashDocumento?: string;
  medicoAssinadoEm?: { toDate?: () => Date } | Date | null;
  opcaoEntregaMaterial?: 'domicilio' | 'clinica' | null;
  bryEasySignEnvelopeId?: string;
  bryEasySignDocumentUuid?: string;
  bryEasySignSignerNonce?: string;
  signatureRequestId?: string;
  fluxoAssinatura?: 'paciente_primeiro' | 'medico_primeiro';
  solicitadoPacienteEm?: { toDate?: () => Date } | Date | null;
  pacienteSignLinkUrl?: string | null;
  pacienteSignIframeUrl?: string | null;
  pacienteSignStatus?: string | null;
  pacienteAssinadoEm?: { toDate?: () => Date } | Date | null;
  pdfFinalAssinadoUrl?: string | null;
};

export type DisponibilizarContratoPacienteResult = {
  pacienteSignLinkUrl: string;
  pacienteSignIframeUrl?: string;
  bryEasySignEnvelopeId: string;
  bryEasySignDocumentUuid: string;
  /** Link/envelope já existia — nenhum envelope novo foi criado. */
  reusedExisting?: boolean;
};

function contratoJaDisponivelParaPaciente(doc: ContratoDocumentoFirestore): boolean {
  const link = doc.pacienteSignLinkUrl?.trim();
  if (link && doc.pacienteSignStatus === 'link_gerado') return true;
  if (link && doc.bryEasySignEnvelopeId?.trim() && doc.bryEasySignDocumentUuid?.trim()) return true;
  if (doc.bryEasySignEnvelopeId?.trim() && doc.pacienteSignStatus === 'link_gerado' && link) {
    return true;
  }
  return false;
}

function mapExistingDisponibilizacao(
  doc: ContratoDocumentoFirestore
): DisponibilizarContratoPacienteResult {
  const link = doc.pacienteSignLinkUrl?.trim();
  const envelopeId = doc.bryEasySignEnvelopeId?.trim();
  const documentUuid = doc.bryEasySignDocumentUuid?.trim();
  if (!link || !envelopeId || !documentUuid) {
    throw new Error('Dados de assinatura do paciente incompletos no documento.');
  }
  return {
    pacienteSignLinkUrl: link,
    pacienteSignIframeUrl: doc.pacienteSignIframeUrl?.trim() || undefined,
    bryEasySignEnvelopeId: envelopeId,
    bryEasySignDocumentUuid: documentUuid,
    reusedExisting: true,
  };
}

/**
 * Disponibiliza o contrato para assinatura do paciente via BRy EasySign.
 * Idempotente: não cria envelope duplicado se o link já existir.
 */
export async function disponibilizarContratoParaAssinaturaPaciente(args: {
  pacienteId: string;
  documentoId: string;
  medicoDocId: string;
}): Promise<DisponibilizarContratoPacienteResult> {
  const doc = await loadContratoDocumentoForEasySignPoc(args.pacienteId, args.documentoId);

  if (contratoJaDisponivelParaPaciente(doc)) {
    return mapExistingDisponibilizacao(doc);
  }

  try {
    const created = await createContratoEasySignPatientLink(args);
    return { ...created, reusedExisting: false };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro ao criar link de assinatura do paciente.';
    await contratoDocRef(args.pacienteId, args.documentoId).update({
      pacienteSignStatus: 'erro_gerar_link',
      pacienteSignErrorMessage: message.slice(0, 500),
      pacienteSignErrorAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw error;
  }
}

export function contratoDocRef(pacienteId: string, documentoId: string) {
  return getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection(CONTRATO_TRATAMENTO_FIRESTORE_SUBCOLLECTION)
    .doc(documentoId);
}

export async function loadContratoDocumentoForEasySignPoc(
  pacienteId: string,
  documentoId: string
): Promise<ContratoDocumentoFirestore> {
  const snap = await contratoDocRef(pacienteId, documentoId).get();
  if (!snap.exists) {
    throw new Error('Documento do contrato não encontrado.');
  }
  return { id: snap.id, ...(snap.data() as Omit<ContratoDocumentoFirestore, 'id'>) };
}

async function fetchPdfBuffer(url: string, flow?: EasySignFlowContext): Promise<Buffer> {
  const res = await fetch(url.trim());
  if (!res.ok) {
    const err = new Error(`Não foi possível baixar o PDF assinado pelo médico (${res.status}).`);
    logEasySignError(flow, err, 'pdf_download_failed');
    throw err;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) {
    const err = new Error('PDF assinado pelo médico está vazio.');
    logEasySignError(flow, err, 'pdf_empty');
    throw err;
  }
  if (buf.length > MAX_PDF_BYTES) {
    const err = new Error('PDF muito grande (máx. 12 MB).');
    logEasySignError(flow, err, 'pdf_too_large');
    throw err;
  }
  logEasySignFlow(flow, 'pdf_downloaded', { pdfBytes: buf.length });
  return buf;
}

function onlyDigits(value: string | undefined): string | undefined {
  const d = (value || '').replace(/\D/g, '');
  return d || undefined;
}

function resolveMedicoDisplayName(data: Record<string, unknown> | undefined): string {
  const nome = typeof data?.nome === 'string' ? data.nome.trim() : '';
  const genero = data?.genero === 'F' ? 'Dra.' : 'Dr.';
  return nome ? `${genero} ${nome}` : 'Médico Oftware';
}

export async function createContratoEasySignPatientLink(args: {
  pacienteId: string;
  documentoId: string;
  medicoDocId: string;
}): Promise<{
  pacienteSignLinkUrl: string;
  pacienteSignIframeUrl?: string;
  bryEasySignEnvelopeId: string;
  bryEasySignDocumentUuid: string;
}> {
  const flow = createEasySignFlowContext({
    pacienteId: args.pacienteId,
    documentoId: args.documentoId,
  });

  try {
    const doc = await loadContratoDocumentoForEasySignPoc(args.pacienteId, args.documentoId);

    if (doc.tipoDocumento !== SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO) {
      throw new Error('Documento inválido para contrato de tratamento.');
    }
    if (doc.statusAssinatura !== 'aguardando_paciente') {
      throw new Error('O contrato precisa estar aguardando assinatura do paciente.');
    }

    const pdfFinal = doc.pdfFinalAssinadoUrl?.trim();
    if (pdfFinal) {
      throw new Error('Este contrato já possui PDF final assinado.');
    }

    const pdfUrlMedico = doc.pdfAssinadoMedicoUrl || doc.pdfUrl;
    const temOpcao =
      doc.opcaoEntregaMaterial === 'domicilio' || doc.opcaoEntregaMaterial === 'clinica';

    let pdfUrl: string;
    if (temOpcao) {
      pdfUrl = await obterPdfContratoGeradoParaPaciente({
        pacienteId: args.pacienteId,
        documentoId: args.documentoId,
      });
    } else if (pdfUrlMedico) {
      pdfUrl = pdfUrlMedico;
    } else {
      throw new Error(
        'Selecione como deseja receber o tratamento antes de assinar, ou aguarde o médico disponibilizar o contrato.'
      );
    }

    if (doc.bryEasySignEnvelopeId?.trim() && !doc.pacienteSignLinkUrl?.trim()) {
      throw new Error(
        'Envelope de assinatura do paciente já registrado sem link. Use o retry no MetaAdmin ou contate suporte.'
      );
    }

    const db = getFirestoreAdmin();
    const pacSnap = await db.collection('pacientes_completos').doc(args.pacienteId).get();
    if (!pacSnap.exists) throw new Error('Paciente não encontrado.');
  const pac = pacSnap.data() as {
    nome?: string;
    email?: string;
    telefone?: string;
    dadosIdentificacao?: {
        nomeCompleto?: string;
        email?: string;
        cpf?: string;
        telefone?: string;
      };
    };

    const nomePaciente =
      pac.dadosIdentificacao?.nomeCompleto?.trim() || pac.nome?.trim() || '';
    const emailPaciente = pac.dadosIdentificacao?.email?.trim() || pac.email?.trim() || '';
    const cpfPaciente = onlyDigits(pac.dadosIdentificacao?.cpf);
    const telefonePaciente =
      pac.dadosIdentificacao?.telefone?.trim() || pac.telefone?.trim() || undefined;

    if (!nomePaciente) throw new Error('Paciente sem nome cadastrado.');
    if (!emailPaciente) throw new Error('Paciente sem e-mail cadastrado.');

    logEasySignFlow(flow, 'patient_email_resolved', {
      hasCpf: Boolean(cpfPaciente),
      hasPhone: Boolean(telefonePaciente),
    });

    const medSnap = await db.collection('medicos').doc(args.medicoDocId).get();
    const medicoNome = resolveMedicoDisplayName(medSnap.data());

    const pdfBuffer = await fetchPdfBuffer(pdfUrl, flow);

    const signaturePosition = await computeContratoPatientEasySignSignaturePositionMm(pdfBuffer);
    const signerNonce = createEasySignSignerNonce('paciente');

    logEasySignFlow(flow, 'patient_signature_layout', {
      page: signaturePosition.page,
      x: signaturePosition.x,
      y: signaturePosition.y,
      width: signaturePosition.width,
      height: signaturePosition.height,
    });

    const envelope = await createBryEasySignEnvelope(
      {
        name: `Contrato de Tratamento - ${nomePaciente}`,
        clientName: medicoNome,
        pdfBuffer,
        signer: {
          name: nomePaciente,
          email: emailPaciente,
          cpf: cpfPaciente,
          phone: telefonePaciente,
        },
        patientSignature: {
          positioningMode: 'PRESET',
          signerNonce,
          positions: [
            {
              ...signaturePosition,
              signerNonce,
            },
          ],
        },
      },
      flow
    );

    await contratoDocRef(args.pacienteId, args.documentoId).update({
      easysignPoc: true,
      bryEasySignEnvelopeId: envelope.envelopeId,
      bryEasySignDocumentUuid: envelope.documentUuid,
      bryEasySignSignerNonce: signerNonce,
      pacienteSignLinkUrl: envelope.pacienteSignLinkUrl,
      pacienteSignIframeUrl: envelope.pacienteSignIframeUrl || null,
      pacienteSignStatus: 'link_gerado',
      pacienteSignRequestedAt: FieldValue.serverTimestamp(),
      pacienteSignErrorMessage: null,
      pacienteSignErrorAt: null,
      pacienteAssinadoEm: null,
      pdfFinalAssinadoUrl: null,
      pocValidacao: contratoPocValidacaoFirestorePayload(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      pacienteSignLinkUrl: envelope.pacienteSignLinkUrl,
      pacienteSignIframeUrl: envelope.pacienteSignIframeUrl,
      bryEasySignEnvelopeId: envelope.envelopeId,
      bryEasySignDocumentUuid: envelope.documentUuid,
    };
  } catch (error) {
    if (flow.step === 'unknown') {
      logEasySignError(flow, error);
    }
    throw error;
  }
}

function contratoFinalPdfStoragePath(pacienteId: string, documentoId: string): string {
  return `digital-signatures/bry-easysign/contrato/${pacienteId.trim()}/${documentoId.trim()}/final-signed.pdf`;
}

export async function downloadContratoEasySignFinalPdf(args: {
  pacienteId: string;
  documentoId: string;
}): Promise<{ pdfFinalAssinadoUrl: string; pacienteAssinadoEm: Date }> {
  const doc = await loadContratoDocumentoForEasySignPoc(args.pacienteId, args.documentoId);

  const envelopeId = doc.bryEasySignEnvelopeId?.trim();
  const documentUuid = doc.bryEasySignDocumentUuid?.trim();
  if (!envelopeId || !documentUuid) {
    throw new Error('Envelope EasySign não encontrado. Gere o link de assinatura do paciente primeiro.');
  }

  await assertBryEasySignPatientSignatureReady({
    envelopeId,
    documentUuid,
    basePdfUrl: doc.pdfParaAssinaturaPacienteUrl || doc.pdfAssinadoMedicoUrl || doc.pdfUrl,
    signerNonce: doc.bryEasySignSignerNonce,
  });

  const pdfBufferRaw = await downloadBryEasySignSignedPdfUnsafe(envelopeId, documentUuid);

  const evidence = await fetchBryEasySignPatientEvidence({
    envelopeId,
    signerNonce: doc.bryEasySignSignerNonce,
  });

  const leadImageBytes = await fetchBryEasySignPatientSignatureImageBytes({
    envelopeId,
    documentUuid,
    signerNonce: doc.bryEasySignSignerNonce,
  });

  const validation = await loadContratoValidationForEasySign(doc.signatureRequestId);
  const validationCode =
    validation?.validationCode ||
    String(doc.hashDocumento || evidence.envelopeId).slice(0, 24);

  const publicValidationUrl =
    validation?.publicValidationUrl ||
    `https://www.oftware.com.br/contratos/documento?codigo=${encodeURIComponent(validationCode)}`;
  const publicPdfUrl =
    validation?.publicPdfUrl ||
    `https://www.oftware.com.br/contratos/documento?_format=application/pdf&codigo=${encodeURIComponent(validationCode)}`;

  const pdfBuffer = Buffer.from(
    await appendContratoTratamentoPatientEasySignEvidenceFooter(pdfBufferRaw, {
      evidence,
      validationCode,
      publicValidationUrl,
      publicPdfUrl,
      leadImageBytes,
    })
  );

  const pacienteAssinadoEm = evidence.signedAt;
  if (!pacienteAssinadoEm || Number.isNaN(pacienteAssinadoEm.getTime())) {
    throw new Error(
      'A BRy não confirmou a data da assinatura do paciente. A assinatura ainda não pode ser registrada.'
    );
  }

  const docAtual = await loadContratoDocumentoForEasySignPoc(args.pacienteId, args.documentoId);
  const fluxoPacientePrimeiro =
    docAtual.fluxoAssinatura === 'paciente_primeiro' ||
    (!docAtual.fluxoAssinatura && !docAtual.pdfAssinadoMedicoUrl?.trim() && !docAtual.medicoAssinadoEm);
  const medicoJaAssinou = fluxoPacientePrimeiro
    ? Boolean(docAtual.pdfAssinadoMedicoUrl?.trim() || docAtual.medicoAssinadoEm)
    : Boolean(
        docAtual.pdfAssinadoMedicoUrl?.trim() ||
          docAtual.pdfUrl?.trim() ||
          docAtual.medicoAssinadoEm ||
          docAtual.fluxoAssinatura === 'medico_primeiro'
      );
  const statusFinal = medicoJaAssinou ? 'assinado_completo' : 'aguardando_medico';

  const storagePath = contratoFinalPdfStoragePath(args.pacienteId, args.documentoId);
  const bucket = getAdminStorageBucket();
  const fileRef = bucket.file(storagePath);

  await fileRef.save(pdfBuffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=3600',
    },
  });
  await fileRef.makePublic();
  const pdfFinalAssinadoUrl = publicBrySignedPdfStorageUrl(bucket.name, storagePath);

  await contratoDocRef(args.pacienteId, args.documentoId).update({
    pacienteSignStatus: 'assinado',
    pacienteAssinadoEm: Timestamp.fromDate(pacienteAssinadoEm),
    pdfFinalAssinadoUrl,
    statusAssinatura: statusFinal,
    pacienteEasySignEvidence: {
      ipAddress: evidence.ipAddress || null,
      geolocationLabel: evidence.geolocationLabel || null,
      signedAtIso: pacienteAssinadoEm.toISOString(),
      envelopeId: evidence.envelopeId,
      authenticationMethods: evidence.authenticationMethods,
    },
    pocValidacao: contratoPocValidacaoFirestorePayload(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { pdfFinalAssinadoUrl, pacienteAssinadoEm };
}
