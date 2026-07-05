import type { PrescriptionSignedDocumentPublicView } from '@/lib/signature/prescriptionSignedDocumentLookup.server';
import { buildPrescriptionPublicUrls } from '@/lib/signature/prescriptionPublicDocumentUrls';

const ITI_VALIDATION_URL = 'https://validar.iti.gov.br';

export const PRESCRIPTION_PUBLIC_STATUS_LABEL =
  'Documento assinado digitalmente ICP-Brasil';

function formatDateTimePtBr(date?: Date): string | undefined {
  if (!date) return undefined;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Sao_Paulo',
    }).format(date);
  } catch {
    return date.toLocaleString('pt-BR');
  }
}

function formatDatePtBr(date?: Date): string | undefined {
  if (!date) return undefined;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(date);
  } catch {
    return date.toLocaleDateString('pt-BR');
  }
}

function buildCrmLine(doc: PrescriptionSignedDocumentPublicView): string | undefined {
  if (doc.physicianCrmUf && doc.physicianCrm) {
    return `CRM-${doc.physicianCrmUf} ${doc.physicianCrm}`;
  }
  if (doc.physicianCrm) return `CRM ${doc.physicianCrm}`;
  return undefined;
}

/** Resposta JSON pública — sem URLs de Storage nem credenciais. */
export function buildPrescriptionPublicDocumentJson(
  document: PrescriptionSignedDocumentPublicView
) {
  const officialUrls = buildPrescriptionPublicUrls(document.validationCode);
  return {
    valid: true as const,
    validationCode: document.validationCode,
    physicianName: document.physicianName,
    physicianCrmLine: buildCrmLine(document),
    patientName: document.patientName,
    signedAt: document.signedAt?.toISOString(),
    signedAtFormatted: formatDateTimePtBr(document.signedAt),
    issuedAt: document.issuedAt?.toISOString(),
    issuedAtFormatted: formatDateTimePtBr(document.issuedAt) ?? formatDatePtBr(document.issuedAt),
    statusLabel: PRESCRIPTION_PUBLIC_STATUS_LABEL,
    publicValidationUrl: officialUrls.publicValidationUrl,
    publicPdfUrl: officialUrls.publicPdfUrl,
    itiValidationUrl: ITI_VALIDATION_URL,
  };
}

export type PrescriptionPublicDocumentJson = ReturnType<typeof buildPrescriptionPublicDocumentJson>;
