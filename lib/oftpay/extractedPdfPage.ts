/** Tipo compartilhado — sem dependência de pdf-parse/pdfjs. */

export interface ExtractedPdfPage {
  page: number;
  content: string;
}

export interface ExtractPdfTextResult {
  pages: ExtractedPdfPage[];
  totalPages: number;
}
