import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminStorageBucket, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { publicBrySignedPdfStorageUrl } from '@/lib/signature/brySignatureConstants';
import {
  createBryEasySignEnvelope,
  createEasySignSignerNonce,
  downloadBryEasySignSignedPdfUnsafe,
} from '@/lib/signature/bryEasySign/bryEasySignClient';
import { computePlanoPatientEasySignSignaturePositionMm } from '@/lib/signature/bryEasySign/planoTerapeuticoEasySignSignaturePosition';
import { fetchBryEasySignPatientEvidence } from '@/lib/signature/bryEasySign/bryEasySignPatientEvidence.server';
import { assertBryEasySignPatientSignatureReady } from '@/lib/signature/bryEasySign/assertBryEasySignPatientSignatureReady.server';
import { fetchBryEasySignPatientSignatureImageBytes } from '@/lib/signature/bryEasySign/bryEasySignPatientSignatureImage.server';
import { appendPlanoTerapeuticoPatientEasySignEvidenceFooter } from '@/lib/signature/planoTerapeuticoPatientSignedPdfVisualFooter';
import {
  createEasySignFlowContext,
  logEasySignError,
  logEasySignFlow,
  type EasySignFlowContext,
} from '@/lib/signature/bryEasySign/contratoEasySignFlowLog.server';

const SUBCOLLECTION = 'orcamentosTerapeuticos';
const MAX_PDF_BYTES = 12 * 1024 * 1024;

export type PlanoTerapeuticoEasySignDocumento = {
  id: string;
  status?: string;
  medicoId?: string;
  pdfUrl?: string;
  pdfParaAssinaturaPacienteUrl?: string | null;
  pdfFinalAssinadoUrl?: string | null;
  bryEasySignEnvelopeId?: string;
  bryEasySignDocumentUuid?: string;
  bryEasySignSignerNonce?: string;
  pacienteSignLinkUrl?: string | null;
  pacienteSignIframeUrl?: string | null;
  pacienteSignStatus?: string | null;
  pacienteAssinadoEm?: { toDate?: () => Date } | Date | null;
  pacienteAssinaturaNome?: string | null;
  acceptedAt?: { toDate?: () => Date } | Date | null;
};

export type DisponibilizarPlanoPacienteResult = {
  pacienteSignLinkUrl: string;
  pacienteSignIframeUrl?: string;
  bryEasySignEnvelopeId: string;
  bryEasySignDocumentUuid: string;
  reusedExisting?: boolean;
};

export function planoDocRef(pacienteId: string, orcamentoId: string) {
  return getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection(SUBCOLLECTION)
    .doc(orcamentoId);
}

export async function loadPlanoDocumentoForEasySign(
  pacienteId: string,
  orcamentoId: string
): Promise<PlanoTerapeuticoEasySignDocumento> {
  const snap = await planoDocRef(pacienteId, orcamentoId).get();
  if (!snap.exists) {
    throw new Error('Plano terapêutico não encontrado.');
  }
  return { id: snap.id, ...(snap.data() as Omit<PlanoTerapeuticoEasySignDocumento, 'id'>) };
}

function planoJaDisponivelParaPaciente(doc: PlanoTerapeuticoEasySignDocumento): boolean {
  const link = doc.pacienteSignLinkUrl?.trim();
  if (link && doc.pacienteSignStatus === 'link_gerado') return true;
  if (link && doc.bryEasySignEnvelopeId?.trim() && doc.bryEasySignDocumentUuid?.trim()) return true;
  return false;
}

function mapExistingDisponibilizacao(
  doc: PlanoTerapeuticoEasySignDocumento
): DisponibilizarPlanoPacienteResult {
  const link = doc.pacienteSignLinkUrl?.trim();
  const envelopeId = doc.bryEasySignEnvelopeId?.trim();
  const documentUuid = doc.bryEasySignDocumentUuid?.trim();
  if (!link || !envelopeId || !documentUuid) {
    throw new Error('Dados de assinatura do paciente incompletos no plano.');
  }
  return {
    pacienteSignLinkUrl: link,
    pacienteSignIframeUrl: doc.pacienteSignIframeUrl?.trim() || undefined,
    bryEasySignEnvelopeId: envelopeId,
    bryEasySignDocumentUuid: documentUuid,
    reusedExisting: true,
  };
}

export async function disponibilizarPlanoParaAssinaturaPaciente(args: {
  pacienteId: string;
  orcamentoId: string;
  medicoDocId: string;
}): Promise<DisponibilizarPlanoPacienteResult> {
  const doc = await loadPlanoDocumentoForEasySign(args.pacienteId, args.orcamentoId);

  if (doc.status === 'aceito' && doc.pdfFinalAssinadoUrl?.trim()) {
    throw new Error('Este plano já foi assinado pelo paciente.');
  }

  if (planoJaDisponivelParaPaciente(doc)) {
    return mapExistingDisponibilizacao(doc);
  }

  try {
    const created = await createPlanoEasySignPatientLink(args);
    return { ...created, reusedExisting: false };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro ao criar link de assinatura do paciente.';
    await planoDocRef(args.pacienteId, args.orcamentoId).update({
      pacienteSignStatus: 'erro_gerar_link',
      pacienteSignErrorMessage: message.slice(0, 500),
      pacienteSignErrorAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw error;
  }
}

async function fetchPdfBuffer(url: string, flow?: EasySignFlowContext): Promise<Buffer> {
  const res = await fetch(url.trim());
  if (!res.ok) {
    const err = new Error(`Não foi possível baixar o PDF do plano (${res.status}).`);
    logEasySignError(flow, err, 'pdf_download_failed');
    throw err;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) {
    const err = new Error('PDF do plano está vazio.');
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

export async function createPlanoEasySignPatientLink(args: {
  pacienteId: string;
  orcamentoId: string;
  medicoDocId: string;
}): Promise<{
  pacienteSignLinkUrl: string;
  pacienteSignIframeUrl?: string;
  bryEasySignEnvelopeId: string;
  bryEasySignDocumentUuid: string;
}> {
  const flow = createEasySignFlowContext({
    pacienteId: args.pacienteId,
    documentoId: args.orcamentoId,
  });

  try {
    const doc = await loadPlanoDocumentoForEasySign(args.pacienteId, args.orcamentoId);

    if (doc.status === 'cancelado') {
      throw new Error('Este plano foi cancelado.');
    }
    if (doc.status === 'aceito' && doc.pdfFinalAssinadoUrl?.trim()) {
      throw new Error('Este plano já foi assinado pelo paciente.');
    }

    const pdfUrl = doc.pdfParaAssinaturaPacienteUrl?.trim() || doc.pdfUrl?.trim();
    if (!pdfUrl) {
      throw new Error('PDF do plano ainda não está disponível para assinatura.');
    }

    if (doc.bryEasySignEnvelopeId?.trim() && !doc.pacienteSignLinkUrl?.trim()) {
      throw new Error(
        'Envelope de assinatura já registrado sem link. Entre em contato com a clínica.'
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
    const signaturePosition = await computePlanoPatientEasySignSignaturePositionMm(pdfBuffer);
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
        name: `Plano Terapêutico - ${nomePaciente}`,
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

    await planoDocRef(args.pacienteId, args.orcamentoId).update({
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

function planoFinalPdfStoragePath(pacienteId: string, orcamentoId: string): string {
  return `digital-signatures/bry-easysign/plano-terapeutico/${pacienteId.trim()}/${orcamentoId.trim()}/final-signed.pdf`;
}

export async function downloadPlanoEasySignFinalPdf(args: {
  pacienteId: string;
  orcamentoId: string;
  pacienteNome: string;
}): Promise<{ pdfFinalAssinadoUrl: string; pacienteAssinadoEm: Date }> {
  const doc = await loadPlanoDocumentoForEasySign(args.pacienteId, args.orcamentoId);

  const envelopeId = doc.bryEasySignEnvelopeId?.trim();
  const documentUuid = doc.bryEasySignDocumentUuid?.trim();
  if (!envelopeId || !documentUuid) {
    throw new Error('Envelope EasySign não encontrado. Gere o link de assinatura primeiro.');
  }

  await assertBryEasySignPatientSignatureReady({
    envelopeId,
    documentUuid,
    basePdfUrl: doc.pdfParaAssinaturaPacienteUrl || doc.pdfUrl,
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

  const validationCode = evidence.envelopeId.slice(0, 24) || args.orcamentoId.slice(0, 24);

  const pdfBuffer = Buffer.from(
    await appendPlanoTerapeuticoPatientEasySignEvidenceFooter(pdfBufferRaw, {
      evidence,
      validationCode,
      leadImageBytes,
    })
  );

  const pacienteAssinadoEm = evidence.signedAt;
  if (!pacienteAssinadoEm || Number.isNaN(pacienteAssinadoEm.getTime())) {
    throw new Error(
      'A BRy não confirmou a data da assinatura do paciente. A assinatura ainda não pode ser registrada.'
    );
  }

  const storagePath = planoFinalPdfStoragePath(args.pacienteId, args.orcamentoId);
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

  const nome = args.pacienteNome.trim() || evidence.name.trim();

  await planoDocRef(args.pacienteId, args.orcamentoId).update({
    status: 'aceito',
    pacienteSignStatus: 'assinado',
    pacienteAssinaturaNome: nome,
    pacienteAssinadoEm: Timestamp.fromDate(pacienteAssinadoEm),
    acceptedAt: Timestamp.fromDate(pacienteAssinadoEm),
    pdfFinalAssinadoUrl,
    pdfUrl: pdfFinalAssinadoUrl,
    pacienteEasySignEvidence: {
      ipAddress: evidence.ipAddress || null,
      geolocationLabel: evidence.geolocationLabel || null,
      signedAtIso: pacienteAssinadoEm.toISOString(),
      envelopeId: evidence.envelopeId,
      authenticationMethods: evidence.authenticationMethods,
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { pdfFinalAssinadoUrl, pacienteAssinadoEm };
}
