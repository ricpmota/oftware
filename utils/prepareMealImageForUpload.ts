/**
 * Redimensiona e converte para JPEG antes do POST /api/chatnutri/meal.
 * Fotos diretas da câmera costumam ser grandes (vários MB) e estouram limites de body
 * em edge/serverless ou geram multipart truncado — a galeria muitas vezes já traz arquivo menor.
 */
const COMPRESS_IF_LARGER_THAN = 700 * 1024; // bytes
const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 0.88;

export async function prepareMealImageForUpload(file: File): Promise<File> {
  const likelyHuge =
    file.size > COMPRESS_IF_LARGER_THAN ||
    /hei[cf]|heif/i.test(file.type || '') ||
    (file.type === 'image/png' && file.size > 400 * 1024);

  if (!likelyHuge) return file;

  try {
    const bitmap = await createImageBitmap(file);
    try {
      let w = bitmap.width;
      let h = bitmap.height;
      if (w > MAX_EDGE_PX || h > MAX_EDGE_PX) {
        if (w >= h) {
          h = Math.round((h * MAX_EDGE_PX) / w);
          w = MAX_EDGE_PX;
        } else {
          w = Math.round((w * MAX_EDGE_PX) / h);
          h = MAX_EDGE_PX;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY);
      });
      if (!blob || blob.size < 1) return file;
      return new File([blob], 'refeicao.jpg', { type: 'image/jpeg' });
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
