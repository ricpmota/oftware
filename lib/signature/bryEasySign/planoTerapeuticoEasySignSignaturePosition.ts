import { PDFDocument } from 'pdf-lib';
import {
  estimatePlanoPatientRubricaPositionOnLastPageMm,
  type BryEasySignSignaturePositionMm,
} from '@/lib/documentos/plano-terapeutico/planoTerapeuticoSignaturePageLayout';

export type { BryEasySignSignaturePositionMm };

export async function computePlanoPatientEasySignSignaturePositionMm(
  pdfBuffer: Buffer | Uint8Array
): Promise<BryEasySignSignaturePositionMm> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  if (!pages.length) {
    throw new Error('PDF sem páginas para posicionar assinatura do paciente.');
  }
  const pageIndex = pages.length - 1;
  const box = estimatePlanoPatientRubricaPositionOnLastPageMm();
  return { page: pageIndex + 1, ...box };
}
