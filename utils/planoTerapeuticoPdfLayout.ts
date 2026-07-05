import type jsPDF from 'jspdf';

export type JsPDFDoc = InstanceType<typeof jsPDF>;

/** Reserva inferior para assinatura digital (mesmo padrão do contrato / requisição BRy). */
export const PDF_PLANO_Y_ASSINATURA = 248;

export function desenharNumeracaoPaginasPlanoTerapeuticoPdf(doc: JsPDFDoc): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
  }
}
