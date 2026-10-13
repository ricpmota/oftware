/**
 * Prepara buffer temporário para envio ao Gemini.
 * Não altera nem republica a fotografia original.
 */

const MAX_EDGE_PX = 1600;
const TARGET_MAX_BYTES = Math.floor(3.5 * 1024 * 1024);
const ABSOLUTE_MAX_BYTES = Math.floor(4.2 * 1024 * 1024);

export type PreparedBodyScanImage = {
  buffer: Buffer;
  mimeType: string;
};

function sniffMime(buffer: Buffer, fallback: string): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  const normalized = (fallback || 'image/jpeg').split(';')[0].trim().toLowerCase();
  if (normalized.startsWith('image/')) return normalized;
  return 'image/jpeg';
}

async function encodeJpegFromCanvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvasMod: any,
  img: { width: number; height: number },
  maxEdge: number,
  quality: number
): Promise<Buffer> {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = canvasMod.createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toBuffer('image/jpeg', quality);
}

/**
 * Redimensiona/comprime mantendo proporção quando possível.
 * Fallback: retorna original se já estiver abaixo do limite.
 */
export async function prepareBodyScanImageForGemini(params: {
  buffer: Buffer;
  mimeType?: string;
}): Promise<PreparedBodyScanImage> {
  const sourceMime = sniffMime(params.buffer, params.mimeType || 'image/jpeg');

  if (params.buffer.length <= TARGET_MAX_BYTES && sourceMime !== 'image/heic' && sourceMime !== 'image/heif') {
    // Ainda tenta normalizar para JPEG se for muito grande em dimensão — best effort
    try {
      const canvasMod = await import('@napi-rs/canvas');
      const img = await canvasMod.loadImage(params.buffer);
      if (Math.max(img.width, img.height) <= MAX_EDGE_PX) {
        return { buffer: params.buffer, mimeType: sourceMime };
      }
      const out = await encodeJpegFromCanvas(canvasMod, img, MAX_EDGE_PX, 0.82);
      if (out.length <= ABSOLUTE_MAX_BYTES) {
        return { buffer: out, mimeType: 'image/jpeg' };
      }
    } catch {
      return { buffer: params.buffer, mimeType: sourceMime };
    }
  }

  try {
    const canvasMod = await import('@napi-rs/canvas');
    const img = await canvasMod.loadImage(params.buffer);
    let quality = 0.82;
    let maxEdge = MAX_EDGE_PX;
    let out = await encodeJpegFromCanvas(canvasMod, img, maxEdge, quality);

    while (out.length > TARGET_MAX_BYTES && (quality > 0.55 || maxEdge > 900)) {
      if (quality > 0.55) quality -= 0.08;
      else maxEdge = Math.floor(maxEdge * 0.85);
      out = await encodeJpegFromCanvas(canvasMod, img, maxEdge, quality);
    }

    if (out.length > ABSOLUTE_MAX_BYTES) {
      throw new Error('Imagem ainda grande demais após compressão para BodyScan.');
    }
    return { buffer: out, mimeType: 'image/jpeg' };
  } catch (err) {
    if (params.buffer.length <= ABSOLUTE_MAX_BYTES) {
      return { buffer: params.buffer, mimeType: sourceMime };
    }
    throw err instanceof Error ? err : new Error('Falha ao preparar imagem para BodyScan.');
  }
}
