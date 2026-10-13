import { MEAL_IMAGE_FILE_API_PATH } from '@/lib/nutri/mealImageDisplay';
import type { CardapioPdfMealImageRef } from '@/types/cardapioPrint';
import type { LoadedJsPdfImage } from '@/utils/loadImageForJsPdf';

export function cardapioPdfMealImageFileUrl(ref: CardapioPdfMealImageRef): string {
  const params = new URLSearchParams({
    patientId: ref.patientId,
    refeicaoKey: ref.refeicaoKey,
    slotId: ref.slotId,
  });
  return `${MEAL_IMAGE_FILE_API_PATH}?${params.toString()}`;
}

async function blobToJpegForPdf(blob: Blob): Promise<LoadedJsPdfImage | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Falha ao decodificar imagem do prato'));
      el.src = objectUrl;
    });
    const width = img.naturalWidth || img.width || 1;
    const height = img.naturalHeight || img.height || 1;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    return { dataUrl, format: 'JPEG', width, height };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Carrega a foto do prato pelo endpoint autenticado (mesmo origin, sem CORS do GCS). */
export async function loadCardapioMealImageForJsPdf(
  ref: CardapioPdfMealImageRef,
  getToken: () => Promise<string | null>
): Promise<LoadedJsPdfImage | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(cardapioPdfMealImageFileUrl(ref), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    return blobToJpegForPdf(blob);
  } catch {
    return null;
  }
}
