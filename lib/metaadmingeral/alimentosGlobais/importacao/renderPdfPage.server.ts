/**
 * Renderiza página de PDF → PNG (cacheável). Usa pdfjs do pdf-parse + @napi-rs/canvas.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export type RenderedPdfPage = {
  pageNumber: number;
  pngBuffer: Buffer;
  width: number;
  height: number;
  scale: number;
  mimeType: 'image/png';
};

function pdfJsDistRoot(): string {
  const nested = path.join(
    process.cwd(),
    'node_modules',
    'pdf-parse',
    'node_modules',
    'pdfjs-dist'
  );
  if (fs.existsSync(nested)) return nested;
  return path.join(process.cwd(), 'node_modules', 'pdfjs-dist');
}

export async function renderPdfPageToPng(
  pdfBuffer: Buffer,
  pageNumber: number,
  opts?: { maxWidth?: number; scale?: number }
): Promise<RenderedPdfPage> {
  const canvasMod = await import('@napi-rs/canvas');
  const root = pdfJsDistRoot();
  const pdfjs = await import(pathToFileURL(path.join(root, 'legacy/build/pdf.mjs')).href);
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(root, 'legacy/build/pdf.worker.mjs')
  ).href;

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: false,
    useSystemFonts: true,
    standardFontDataUrl: pathToFileURL(path.join(root, 'standard_fonts') + '/').href,
    cMapUrl: pathToFileURL(path.join(root, 'cmaps') + '/').href,
    cMapPacked: true,
    isEvalSupported: false,
  }).promise;

  try {
    const page = await doc.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const maxWidth = opts?.maxWidth ?? 1400;
    const scale =
      opts?.scale ??
      Math.min(2.2, Math.max(1.2, maxWidth / Math.max(base.width, 1)));
    const viewport = page.getViewport({ scale });
    const canvas = canvasMod.createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    const ctx = canvas.getContext('2d');
    // fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const pngBuffer = canvas.toBuffer('image/png');
    return {
      pageNumber,
      pngBuffer,
      width: canvas.width,
      height: canvas.height,
      scale,
      mimeType: 'image/png',
    };
  } finally {
    await doc.destroy();
  }
}

export function pngToInlineDataPart(pngBuffer: Buffer): {
  inlineData: { mimeType: string; data: string };
} {
  return {
    inlineData: {
      mimeType: 'image/png',
      data: pngBuffer.toString('base64'),
    },
  };
}
