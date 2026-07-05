import { CONTRATO_SIGNATURE_PAGE_PADDING_LINES } from '@/lib/documentos/contrato-tratamento/contratoTratamentoPdfLayout';

export type BryEasySignSignaturePositionMm = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const CONTRATO_PDF_MARGIN_X_MM = 18;
export const CONTRATO_PDF_PAGE_TOP_MM = 18;
export const CONTRATO_PDF_SIGNATURE_LINE_HEIGHT_MM = 3.5;

/** Estimativa do retângulo da rubrica EasySign na faixa inferior da última página. */
export function estimatePatientRubricaPositionOnLastPageMm(): Omit<
  BryEasySignSignaturePositionMm,
  'page'
> {
  const paddingMm =
    CONTRATO_SIGNATURE_PAGE_PADDING_LINES * CONTRATO_PDF_SIGNATURE_LINE_HEIGHT_MM;
  const closingBlockMm = 19;
  const y = CONTRATO_PDF_PAGE_TOP_MM + paddingMm + closingBlockMm;

  return {
    x: CONTRATO_PDF_MARGIN_X_MM,
    y,
    width: 174,
    height: 28,
  };
}

export { CONTRATO_SIGNATURE_PAGE_PADDING_LINES };
