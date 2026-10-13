/**
 * Extração de texto por página — uso server-side (API route / Vercel).
 * Usa pdf-parse (pdfjs-dist). Polyfills DOMMatrix via @napi-rs/canvas quando disponível.
 */

import type { ExtractedPdfPage, ExtractPdfTextResult } from '@/lib/oftpay/extractedPdfPage';

export type { ExtractedPdfPage, ExtractPdfTextResult };

async function ensurePdfDomPolyfills(): Promise<void> {
  const g = globalThis as typeof globalThis & {
    DOMMatrix?: unknown;
    ImageData?: unknown;
    Path2D?: unknown;
  };
  if (g.DOMMatrix && g.ImageData && g.Path2D) return;

  try {
    const canvas = await import('@napi-rs/canvas');
    if (!g.DOMMatrix && canvas.DOMMatrix) g.DOMMatrix = canvas.DOMMatrix;
    if (!g.ImageData && canvas.ImageData) g.ImageData = canvas.ImageData;
    if (!g.Path2D && canvas.Path2D) g.Path2D = canvas.Path2D;
  } catch (err) {
    console.warn('[extractPdfTextByPage] @napi-rs/canvas indisponível:', err);
  }

  // Stubs mínimos se o nativo não carregou (texto puro ainda pode funcionar).
  if (!g.DOMMatrix) {
    g.DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      m11 = 1;
      m12 = 0;
      m13 = 0;
      m14 = 0;
      m21 = 0;
      m22 = 1;
      m23 = 0;
      m24 = 0;
      m31 = 0;
      m32 = 0;
      m33 = 1;
      m34 = 0;
      m41 = 0;
      m42 = 0;
      m43 = 0;
      m44 = 1;
      is2D = true;
      isIdentity = true;
      constructor(_init?: unknown) {}
      multiply() {
        return this;
      }
      inverse() {
        return this;
      }
      translate() {
        return this;
      }
      scale() {
        return this;
      }
      rotate() {
        return this;
      }
      toFloat32Array() {
        return new Float32Array(16);
      }
      toFloat64Array() {
        return new Float64Array(16);
      }
      toString() {
        return 'matrix(1, 0, 0, 1, 0, 0)';
      }
    };
  }
}

export async function extractPdfTextByPage(pdfBuffer: Buffer): Promise<ExtractPdfTextResult> {
  await ensurePdfDomPolyfills();
  const { PDFParse } = await import('pdf-parse');

  const parser = new PDFParse({
    data: pdfBuffer,
    disableFontFace: true,
    useSystemFonts: true,
  });

  try {
    const textResult = await parser.getText();
    const pages: ExtractedPdfPage[] = textResult.pages.map((p) => ({
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
