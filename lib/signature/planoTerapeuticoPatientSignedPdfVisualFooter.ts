import {
  appendPrescriptionDigitalSignatureVisualFooter,
  type PrescriptionSignedPdfFooterParams,
} from '@/lib/signature/prescriptionSignedPdfVisualFooter';
import type { BryEasySignPatientEvidence } from '@/lib/signature/bryEasySign/bryEasySignPatientEvidence.server';
import {
  PATIENT_SIGNATURE_ABOVE_BAND_GAP_PT,
  PATIENT_SIGNATURE_ABOVE_BAND_HEIGHT_PT,
} from '@/lib/signature/contratoTratamentoPatientSignedPdfVisualFooter';

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

export function formatPatientDisplayNameForPlanoFooter(name: string): string {
  const trimmed = name?.trim();
  return trimmed || 'Paciente';
}

export function buildPlanoTerapeuticoPatientEasySignEvidenceFooterLines(
  evidence: BryEasySignPatientEvidence
): string[] {
  const name = formatPatientDisplayNameForPlanoFooter(evidence.name);
  const { date, time } = formatSignedAtPtBr(evidence.signedAt);

  const lines: string[] = [
    `Plano Terapêutico assinado eletronicamente por ${name} em ${date} às ${time} (horário de Brasília).`,
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

  return lines;
}

export async function appendPlanoTerapeuticoPatientEasySignEvidenceFooter(
  signedPdfBytes: Buffer | Uint8Array,
  args: {
    evidence: BryEasySignPatientEvidence;
    validationCode: string;
    leadImageBytes?: Uint8Array;
  }
): Promise<Uint8Array> {
  const centerLines = buildPlanoTerapeuticoPatientEasySignEvidenceFooterLines(args.evidence);

  const footerParams: Omit<PrescriptionSignedPdfFooterParams, 'centerLines'> & {
    centerLines: string[];
  } = {
    physicianName: args.evidence.name,
    signedAt: args.evidence.signedAt,
    validationCode: args.validationCode,
    publicValidationUrl: `https://www.oftware.com.br/contratos/documento?codigo=${encodeURIComponent(args.validationCode)}`,
    publicPdfUrl: `https://www.oftware.com.br/contratos/documento?_format=application/pdf&codigo=${encodeURIComponent(args.validationCode)}`,
    centerLines,
    footerBandHeightPt: 132,
    leadImageBytes: args.leadImageBytes,
    leadImageAboveEvidenceBand: Boolean(args.leadImageBytes?.length),
    leadImageAboveBandHeightPt: PATIENT_SIGNATURE_ABOVE_BAND_HEIGHT_PT,
    leadImageAboveBandGapPt: PATIENT_SIGNATURE_ABOVE_BAND_GAP_PT,
    leadImageMaxHeightPt: 40,
    leadImageMaxWidthPt: 160,
    omitLeadImageFallback: true,
  };

  return appendPrescriptionDigitalSignatureVisualFooter(signedPdfBytes, footerParams);
}
