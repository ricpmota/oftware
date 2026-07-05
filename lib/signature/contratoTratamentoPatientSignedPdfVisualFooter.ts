import {
  appendPrescriptionDigitalSignatureVisualFooter,
  PRESCRIPTION_FOOTER_BAND_HEIGHT_PT,
  PRESCRIPTION_FOOTER_BOTTOM_MARGIN_PT,
  PRESCRIPTION_FOOTER_STACK_GAP_PT,
  type PrescriptionSignedPdfFooterParams,
} from '@/lib/signature/prescriptionSignedPdfVisualFooter';
import type { BryEasySignPatientEvidence } from '@/lib/signature/bryEasySign/bryEasySignPatientEvidence.server';
import { buildContratoTratamentoPublicDocumentPageDisplayUrl } from '@/lib/signature/contratoTratamentoPublicDocumentUrls';

const PATIENT_EVIDENCE_FOOTER_BAND_HEIGHT_PT = 132;
/** Faixa dedicada à rubrica EasySign — acima do bloco de evidências (nunca na coluna do texto). */
export const PATIENT_SIGNATURE_ABOVE_BAND_HEIGHT_PT = 52;
export const PATIENT_SIGNATURE_ABOVE_BAND_GAP_PT = 10;
const PATIENT_SIGNATURE_IMAGE_MAX_HEIGHT_PT = 40;
const PATIENT_SIGNATURE_IMAGE_MAX_WIDTH_PT = 160;

function formatSignedAtPtBr(signedAt?: Date): { date: string; time: string } {
  const d = signedAt instanceof Date && !Number.isNaN(signedAt.getTime()) ? signedAt : new Date();
  return {
    date: d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }),
    time: d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'America/Sao_Paulo',
    }),
  };
}

export function formatPatientDisplayNameForFooter(name: string): string {
  const trimmed = name?.trim();
  return trimmed || 'Paciente';
}

/** Linhas do rodapé com evidências EasySign coletadas na BRy. */
export function buildContratoTratamentoPatientEasySignEvidenceFooterLines(
  evidence: BryEasySignPatientEvidence
): string[] {
  const name = formatPatientDisplayNameForFooter(evidence.name);
  const { date, time } = formatSignedAtPtBr(evidence.signedAt);
  const documentPageUrl = buildContratoTratamentoPublicDocumentPageDisplayUrl();

  const lines: string[] = [
    `Contrato de Tratamento assinado eletronicamente por ${name} em ${date} às ${time} (horário de Brasília).`,
    'Assinatura via BRy EasySign — evidências de autenticidade registradas abaixo.',
  ];

  if (evidence.cpf) lines.push(`CPF do signatário: ${evidence.cpf}.`);
  if (evidence.email) lines.push(`E-mail confirmado: ${evidence.email}.`);
  if (evidence.phone) lines.push(`Telefone cadastrado: ${evidence.phone}.`);
  if (evidence.ipAddress) lines.push(`Endereço IP no momento da assinatura: ${evidence.ipAddress}.`);
  if (evidence.geolocationLabel) {
    lines.push(`Geolocalização aproximada: ${evidence.geolocationLabel}.`);
  }
  if (evidence.authenticationMethods.length) {
    lines.push(`Autenticações: ${evidence.authenticationMethods.join(', ')}.`);
  }
  lines.push(`ID do envelope EasySign: ${evidence.envelopeId}.`);
  lines.push('Consulte este documento:', documentPageUrl);

  return lines;
}

/** Deslocamento para empilhar o rodapé do paciente acima do rodapé ICP-Brasil do médico. */
export function contratoPatientFooterBottomOffsetPt(): number {
  return (
    PRESCRIPTION_FOOTER_BOTTOM_MARGIN_PT +
    PRESCRIPTION_FOOTER_BAND_HEIGHT_PT +
    PRESCRIPTION_FOOTER_STACK_GAP_PT
  );
}

export async function appendContratoTratamentoPatientEasySignEvidenceFooter(
  signedPdfBytes: Buffer | Uint8Array,
  params: {
    evidence: BryEasySignPatientEvidence;
    validationCode: string;
    publicValidationUrl: string;
    publicPdfUrl: string;
    /** Rubrica retornada pela BRy EasySign — substitui qualquer logo institucional. */
    leadImageBytes?: Uint8Array;
  }
): Promise<Uint8Array> {
  const centerLines = buildContratoTratamentoPatientEasySignEvidenceFooterLines(params.evidence);

  const footerParams: PrescriptionSignedPdfFooterParams = {
    physicianName: params.evidence.name,
    signedAt: params.evidence.signedAt,
    validationCode: params.validationCode,
    publicValidationUrl: params.publicValidationUrl,
    publicPdfUrl: params.publicPdfUrl,
    centerLines,
    footerBottomOffsetPt: contratoPatientFooterBottomOffsetPt(),
    footerBandHeightPt: PATIENT_EVIDENCE_FOOTER_BAND_HEIGHT_PT,
    leadImageBytes: params.leadImageBytes,
    omitLeadImageFallback: true,
    leadImageAboveEvidenceBand: true,
    leadImageAboveBandHeightPt: PATIENT_SIGNATURE_ABOVE_BAND_HEIGHT_PT,
    leadImageAboveBandGapPt: PATIENT_SIGNATURE_ABOVE_BAND_GAP_PT,
    leadImageMaxHeightPt: PATIENT_SIGNATURE_IMAGE_MAX_HEIGHT_PT,
    leadImageMaxWidthPt: PATIENT_SIGNATURE_IMAGE_MAX_WIDTH_PT,
  };

  return appendPrescriptionDigitalSignatureVisualFooter(signedPdfBytes, footerParams);
}

// Compat — testes legados
export function buildContratoTratamentoPatientSignatureFooterCenterLines(params: {
  patientName: string;
  signedAt?: Date;
}): string[] {
  return buildContratoTratamentoPatientEasySignEvidenceFooterLines({
    envelopeId: '—',
    signerNonce: '—',
    name: params.patientName,
    signedAt: params.signedAt,
    authenticationMethods: ['Geolocalização', 'Endereço IP', 'Confirmação por e-mail (OTP)'],
  });
}

export async function appendContratoTratamentoPatientDigitalSignatureVisualFooter(
  signedPdfBytes: Buffer | Uint8Array,
  params: {
    patientName: string;
    signedAt?: Date;
    validationCode: string;
    publicValidationUrl: string;
    publicPdfUrl: string;
    leadImageBytes?: Uint8Array;
  }
): Promise<Uint8Array> {
  return appendContratoTratamentoPatientEasySignEvidenceFooter(signedPdfBytes, {
    evidence: {
      envelopeId: '—',
      signerNonce: '—',
      name: params.patientName,
      signedAt: params.signedAt,
      authenticationMethods: ['Geolocalização', 'Endereço IP', 'Confirmação por e-mail (OTP)'],
    },
    validationCode: params.validationCode,
    publicValidationUrl: params.publicValidationUrl,
    publicPdfUrl: params.publicPdfUrl,
    leadImageBytes: params.leadImageBytes,
  });
}
