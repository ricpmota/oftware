import { PDFDocument } from 'pdf-lib';
import {
  CONTRATO_SIGNATURE_PAGE_PADDING_LINES,
  estimatePatientRubricaPositionOnLastPageMm,
  type BryEasySignSignaturePositionMm,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoSignaturePageLayout';

export type { BryEasySignSignaturePositionMm };

/**
 * Calcula a posição da rubrica visual do paciente (mm, origem no canto superior esquerdo da página),
 * alinhada ao bloco "Assinatura do Paciente" na última página do contrato.
 */
export async function computeContratoPatientEasySignSignaturePositionMm(
  pdfBuffer: Buffer | Uint8Array
): Promise<BryEasySignSignaturePositionMm> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  if (!pages.length) {
    throw new Error('PDF sem páginas para posicionar assinatura do paciente.');
  }

  const pageIndex = pages.length - 1;
  const box = estimatePatientRubricaPositionOnLastPageMm();

  return {
    page: pageIndex + 1,
    ...box,
  };
}

// Re-export for tests / logging
export { CONTRATO_SIGNATURE_PAGE_PADDING_LINES };
