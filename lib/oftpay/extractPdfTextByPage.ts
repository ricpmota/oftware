/**
 * Extração de texto por página — uso server-side (API route / Vercel).
 * Usa pdf-parse (pdfjs-dist + @napi-rs/canvas para polyfills Node).
 */

import { PDFParse } from 'pdf-parse';

export interface ExtractedPdfPage {
  page: number;
  content: string;
}

export interface ExtractPdfTextResult {
  pages: ExtractedPdfPage[];
  totalPages: number;
}

export async function extractPdfTextByPage(pdfBuffer: Buffer): Promise<ExtractPdfTextResult> {
  const parser = new PDFParse({
    data: pdfBuffer,
    disableFontFace: true,
    useSystemFonts: true,
  });

  try {
    const textResult = await parser.getText();
    const pages = textResult.pages.map((p) => ({
      page: p.num,
      content: (p.text ?? '').replace(/\s+/g, ' ').trim(),
    }));

    return {
      pages,
      totalPages: textResult.total > 0 ? textResult.total : pages.length,
    };
  } finally {
    await parser.destroy();
  }
}
