import type { JsPDFDoc } from '@/utils/planoTerapeuticoPdfLayout';
import {
  CONTRATO_PDF_MARGIN_X_MM,
  planoSignaturePageContentStartY,
  PLANO_SIGN_HDR_GAP_MM,
  PLANO_SIGN_HDR_LINE_MM,
  PLANO_SIGN_SPACE_LINE_HEIGHT_MM,
  PLANO_SIGN_SPACE_LINES_MEDICO,
  PLANO_SIGN_SPACE_LINES_PACIENTE,
} from '@/lib/documentos/plano-terapeutico/planoTerapeuticoSignaturePageLayout';

const DARK: [number, number, number] = [30, 42, 58];
const MUTED: [number, number, number] = [90, 90, 90];

function advanceSpace(y: number, lines: number): number {
  return y + lines * PLANO_SIGN_SPACE_LINE_HEIGHT_MM;
}

/**
 * Página dedicada de assinaturas — mesma estrutura do contrato (médico + paciente).
 * Sem linhas manuais; apenas faixas reservadas para assinatura digital.
 */
export function desenharPaginaAssinaturasReservadaPlanoTerapeutico(
  doc: JsPDFDoc,
  args?: {
    localData?: string;
    hashDocumento?: string;
  }
): void {
  doc.addPage();
  let y = planoSignaturePageContentStartY();

  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const closing =
    'E, por estarem de acordo, as partes firmam o presente plano terapêutico.';
  const closingLines = doc.splitTextToSize(closing, 174) as string[];
  for (const line of closingLines) {
    doc.text(line, CONTRATO_PDF_MARGIN_X_MM, y);
    y += 3.8;
  }
  y += 4;

  if (args?.localData?.trim()) {
    doc.setFontSize(8);
    doc.text(args.localData.trim(), CONTRATO_PDF_MARGIN_X_MM, y);
    y += 8;
  }

  if (args?.hashDocumento?.trim()) {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Identificador do documento: ${args.hashDocumento.trim()}`,
      CONTRATO_PDF_MARGIN_X_MM,
      y
    );
    doc.setTextColor(...DARK);
    y += 10;
  }

  // Médico — faixa reservada
  y += PLANO_SIGN_HDR_GAP_MM;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA DIGITAL DO MÉDICO', CONTRATO_PDF_MARGIN_X_MM, y);
  y += PLANO_SIGN_HDR_LINE_MM;
  y = advanceSpace(y, PLANO_SIGN_SPACE_LINES_MEDICO);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Data da assinatura do médico: —', CONTRATO_PDF_MARGIN_X_MM, y);
  y += 12;

  // Paciente — faixa reservada (EasySign)
  y += PLANO_SIGN_HDR_GAP_MM;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA DO PACIENTE', CONTRATO_PDF_MARGIN_X_MM, y);
  y += PLANO_SIGN_HDR_LINE_MM;
  y = advanceSpace(y, PLANO_SIGN_SPACE_LINES_PACIENTE);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Nome:', CONTRATO_PDF_MARGIN_X_MM, y);
  y += 6;
  doc.text('CPF:', CONTRATO_PDF_MARGIN_X_MM, y);
  y += 6;
  doc.text('Data:', CONTRATO_PDF_MARGIN_X_MM, y);
}
