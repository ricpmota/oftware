import { DIGITAL_SIGNATURE_REQUESTS_COLLECTION } from '@/lib/signature/digitalSignatureMessages';
import { buildPrescriptionPublicUrls } from '@/lib/signature/prescriptionPublicDocumentUrls';
import { normalizePrescriptionValidationCodeInput } from '@/lib/signature/prescriptionValidationCode';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { DigitalSignatureRequestRecord } from '@/types/digitalSignature';

export type PrescriptionSignedDocumentPublicView = {
  validationCode: string;
  requestId: string;
  physicianName: string;
  physicianCrm: string;
  physicianCrmUf: string;
  patientName?: string;
  signedAt?: Date;
  issuedAt?: Date;
  /** Uso interno (redirect PDF). Não expor em APIs públicas. */
  signedPdfUrl: string;
  publicValidationUrl: string;
  publicPdfUrl: string;
  statusLabel: string;
};

function timestampToDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date ? d : undefined;
  }
  return undefined;
}

function pickMedicoDisplayName(data: Record<string, unknown> | undefined): string {
  if (!data) return 'Médico';
  if (typeof data.nome === 'string' && data.nome.trim()) return data.nome.trim();
  return 'Médico';
}

function pickMedicoCrm(data: Record<string, unknown> | undefined): { crm: string; crmUf: string } {
  if (!data) return { crm: '', crmUf: '' };
  const crmRaw = data.crm;
  if (crmRaw && typeof crmRaw === 'object' && !Array.isArray(crmRaw)) {
    const c = crmRaw as Record<string, unknown>;
    return {
      crm: typeof c.numero === 'string' ? c.numero.trim() : '',
      crmUf: typeof c.estado === 'string' ? c.estado.trim() : '',
    };
  }
  if (typeof crmRaw === 'string') return { crm: crmRaw.trim(), crmUf: '' };
  return { crm: '', crmUf: '' };
}

function pickPatientDisplayName(data: Record<string, unknown> | undefined): string | undefined {
  if (!data) return undefined;
  const ident = data.dadosIdentificacao as Record<string, unknown> | undefined;
  if (ident && typeof ident.nomeCompleto === 'string' && ident.nomeCompleto.trim()) {
    return ident.nomeCompleto.trim();
  }
  if (typeof data.nome === 'string' && data.nome.trim()) return data.nome.trim();
  return undefined;
}

export async function findSignedPrescriptionByValidationCode(
  rawCode: string
): Promise<PrescriptionSignedDocumentPublicView | null> {
  const validationCode = normalizePrescriptionValidationCodeInput(rawCode);
  if (!validationCode) return null;

  const snap = await getFirestoreAdmin()
    .collection(DIGITAL_SIGNATURE_REQUESTS_COLLECTION)
    .where('validationCode', '==', validationCode)
    .limit(3)
    .get();

  const signedDoc = snap.docs.find((d) => d.data().status === 'signed');
  if (!signedDoc) return null;

  const doc = signedDoc;
  const data = doc.data() as DigitalSignatureRequestRecord & {
    validationCode?: string;
    publicValidationUrl?: string;
    publicPdfUrl?: string;
  };

  const signedPdfUrl = data.signedPdfUrl?.trim();
  if (!signedPdfUrl) return null;

  const doctorId = data.doctorId?.trim();
  let physicianName = 'Médico';
  let physicianCrm = '';
  let physicianCrmUf = '';

  if (doctorId) {
    const medicoSnap = await getFirestoreAdmin().collection('medicos').doc(doctorId).get();
    if (medicoSnap.exists) {
      const medicoData = medicoSnap.data() as Record<string, unknown> | undefined;
      physicianName = pickMedicoDisplayName(medicoData);
      const crmFields = pickMedicoCrm(medicoData);
      physicianCrm = crmFields.crm;
      physicianCrmUf = crmFields.crmUf;
    }
  }

  let patientName: string | undefined;
  const patientId = data.patientId?.trim();
  if (patientId) {
    const pacSnap = await getFirestoreAdmin().collection('pacientes').doc(patientId).get();
    if (pacSnap.exists) {
      patientName = pickPatientDisplayName(pacSnap.data() as Record<string, unknown>);
    }
  }

  const signedAt = timestampToDate((data as { signedAt?: unknown }).signedAt);
  const issuedAt = timestampToDate((data as { createdAt?: unknown }).createdAt) ?? signedAt;
  const officialUrls = buildPrescriptionPublicUrls(validationCode);

  return {
    validationCode,
    requestId: doc.id,
    physicianName,
    physicianCrm,
    physicianCrmUf,
    patientName,
    signedAt,
    issuedAt,
    signedPdfUrl,
    publicValidationUrl: officialUrls.publicValidationUrl,
    publicPdfUrl: officialUrls.publicPdfUrl,
    statusLabel: 'Documento assinado digitalmente ICP-Brasil',
  };
}
