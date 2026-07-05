import type jsPDF from 'jspdf';

export type JsPDFDoc = InstanceType<typeof jsPDF>;

export const PDF_REQ_EXAMES_Y_ASSINATURA = 250;
export const PDF_REQ_EXAMES_X_INICIO = 20;
export const PDF_REQ_EXAMES_X_FIM = 190;

export function numColunasExamesPdfPorQuantidade(n: number): number {
  if (n <= 10) return 1;
  if (n <= 20) return 2;
  return 3;
}

export function dividirExamesEmKColunasEquilibradas(items: string[], k: number): string[][] {
  const n = items.length;
  if (k <= 1) return [items];
  const base = Math.floor(n / k);
  const rem = n % k;
  const cols: string[][] = [];
  let idx = 0;
  for (let c = 0; c < k; c++) {
    const len = base + (c < rem ? 1 : 0);
    cols.push(items.slice(idx, idx + len));
    idx += len;
  }
  return cols;
}

export function posicoesXColunasPdfExames(k: number): number[] {
  const left = PDF_REQ_EXAMES_X_INICIO;
  const W = PDF_REQ_EXAMES_X_FIM - left;
  if (k <= 1) return [left + 2];
  return Array.from({ length: k }, (_, c) => left + (W * c) / k + 2);
}

export function estimarAlturaQuadroHipotesePdf(doc: JsPDFDoc, hipoteseTexto: string): number {
  const texto = hipoteseTexto.trim();
  if (!texto) return 0;
  const largura = 170;
  const pad = 4;
  doc.setFontSize(9);
  const linhas = doc.splitTextToSize(texto, largura - pad * 2);
  const linhasMinReservadas = 3;
  const alturaTitulo = 7;
  const alturaLinhaTxt = 4.5;
  const numLinhas = Math.max(linhas.length, linhasMinReservadas);
  return alturaTitulo + pad + numLinhas * alturaLinhaTxt + pad;
}

export function desenharListaExamesSolicitacaoPdf(
  doc: JsPDFDoc,
  yInicio: number,
  todosExames: string[],
  yMaxFimBlocoExames: number
): number {
  if (todosExames.length === 0) return yInicio;
  const k = numColunasExamesPdfPorQuantidade(todosExames.length);
  const colunas = dividirExamesEmKColunasEquilibradas(todosExames, k);
  const xs = posicoesXColunasPdfExames(k);
  const maxRows = Math.max(...colunas.map((col) => col.length), 0);
  let fontSize = 9;
  let lineH = 5;
  const minFont = 6.5;
  const minLineH = 3.4;
  doc.setFont('helvetica', 'normal');
  for (;;) {
    doc.setFontSize(fontSize);
    const blocoAltura = maxRows * lineH;
    if (yInicio + blocoAltura <= yMaxFimBlocoExames || (fontSize <= minFont && lineH <= minLineH)) {
      for (let r = 0; r < maxRows; r++) {
        const yLine = yInicio + r * lineH;
        for (let c = 0; c < k; c++) {
          if (r < colunas[c].length) doc.text(`• ${colunas[c][r]}`, xs[c], yLine);
        }
      }
      return yInicio + blocoAltura;
    }
    fontSize = Math.max(minFont, fontSize - 0.5);
    lineH = Math.max(minLineH, lineH - 0.35);
  }
}

export function desenharHipoteseDiagnosticaSolicitacaoPdf(
  doc: JsPDFDoc,
  yPos: number,
  hipoteseTexto: string,
  darkColor: [number, number, number],
  yMaxBottom: number
): number {
  const margem = 20;
  const largura = 170;
  const pad = 3;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const texto = hipoteseTexto.trim();
  if (!texto) return yPos;
  let linhas = doc.splitTextToSize(texto, largura - pad * 2);
  const alturaTitulo = 7;
  let alturaLinhaTxt = 4.5;
  let linhasMinReservadas = 3;
  let numLinhas = Math.max(linhas.length, linhasMinReservadas);
  let boxH = alturaTitulo + pad + numLinhas * alturaLinhaTxt + pad;
  while (yPos + boxH > yMaxBottom) {
    if (linhasMinReservadas > linhas.length) {
      linhasMinReservadas -= 1;
    } else if (alturaLinhaTxt > 3.2) {
      alturaLinhaTxt = Math.max(3.2, alturaLinhaTxt - 0.35);
    } else {
      break;
    }
    numLinhas = Math.max(linhas.length, linhasMinReservadas);
    boxH = alturaTitulo + pad + numLinhas * alturaLinhaTxt + pad;
  }
  doc.setDrawColor(...darkColor);
  doc.setLineWidth(0.35);
  doc.rect(margem, yPos, largura, boxH);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Hipótese Diagnóstica', margem + pad, yPos + alturaTitulo);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let ly = yPos + alturaTitulo + pad + 4;
  if (linhas.length > 0) {
    linhas.forEach((line) => {
      doc.text(line, margem + pad, ly);
      ly += alturaLinhaTxt;
    });
  }
  return yPos + boxH + 4;
}

export function desenharRodapeManualSolicitacaoExamesPdf(
  doc: JsPDFDoc,
  darkColor: [number, number, number],
  local: string,
  dataExibicao: string
): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = PDF_REQ_EXAMES_Y_ASSINATURA;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(...darkColor);
    doc.setLineWidth(0.5);
    doc.line(70, footerY, 140, footerY);
    doc.text('Assinatura do Médico', 105, footerY + 6, { align: 'center' });
    doc.text(`Local: ${local}`, 105, footerY + 12, { align: 'center' });
    doc.text(`Data: ${dataExibicao}`, 105, footerY + 18, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${i} de ${pageCount}`, 105, footerY + 26, { align: 'center' });
  }
}

export function desenharNumeracaoPaginasSolicitacaoExamesPdf(doc: JsPDFDoc): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
  }
}
