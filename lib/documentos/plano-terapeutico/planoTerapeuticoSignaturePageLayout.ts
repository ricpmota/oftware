import {
  CONTRATO_PDF_MARGIN_X_MM,
  CONTRATO_PDF_PAGE_TOP_MM,
  CONTRATO_PDF_SIGNATURE_LINE_HEIGHT_MM,
  CONTRATO_SIGNATURE_PAGE_PADDING_LINES,
  type BryEasySignSignaturePositionMm,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoSignaturePageLayout';

export type { BryEasySignSignaturePositionMm };

/** Altura de cada linha de espaço reservado para rubrica (igual ao contrato). */
export const PLANO_SIGN_SPACE_LINE_HEIGHT_MM = 7;
export const PLANO_SIGN_HDR_GAP_MM = 5;
export const PLANO_SIGN_HDR_LINE_MM = 4.5;
export const PLANO_SIGN_SPACE_LINES_MEDICO = 4;
export const PLANO_SIGN_SPACE_LINES_PACIENTE = 4;

export function planoSignaturePageContentStartY(): number {
  return (
    CONTRATO_PDF_PAGE_TOP_MM +
    CONTRATO_SIGNATURE_PAGE_PADDING_LINES * CONTRATO_PDF_SIGNATURE_LINE_HEIGHT_MM
  );
}

/** Rubrica EasySign do paciente — alinhada ao bloco "ASSINATURA DO PACIENTE". */
export function estimatePlanoPatientRubricaPositionOnLastPageMm(): Omit<
  BryEasySignSignaturePositionMm,
  'page'
> {
  let y = planoSignaturePageContentStartY();
  y += 15; // texto de fechamento
  y += 8; // local/data
  y += 10; // identificador
  y += PLANO_SIGN_HDR_GAP_MM + PLANO_SIGN_HDR_LINE_MM; // cabeçalho médico
  y += PLANO_SIGN_SPACE_LINES_MEDICO * PLANO_SIGN_SPACE_LINE_HEIGHT_MM;
  y += 12; // data médico + espaço
  y += PLANO_SIGN_HDR_GAP_MM + PLANO_SIGN_HDR_LINE_MM; // cabeçalho paciente

  return {
    x: CONTRATO_PDF_MARGIN_X_MM,
    y,
    width: 174,
    height: 28,
  };
}
