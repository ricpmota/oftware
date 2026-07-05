import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import type { JsPdfImageFormat, LoadedJsPdfImage } from '@/utils/loadImageForJsPdf';

const ALLOWED_PREFIXES = [
  'medico-white-label-pdf/',
  'medico-white-label-og/',
  'medico-white-label-favicon/',
  'medico-white-label-public-logo/',
] as const;

function formatFromContentType(contentType: string | null, url: string): JsPdfImageFormat {
  const type = (contentType || '').toLowerCase();
  if (type.includes('jpeg') || type.includes('jpg')) return 'JPEG';
  const lower = url.toLowerCase();
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'JPEG';
  return 'PNG';
}

function isAllowedStorageUrl(url: string, bucketName: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;

    const hostOk =
      parsed.hostname === 'storage.googleapis.com' ||
      parsed.hostname === 'firebasestorage.googleapis.com';

    if (!hostOk) return false;

    const path = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    const objectPath = path.startsWith(`${bucketName}/`) ? path.slice(bucketName.length + 1) : path;

    return ALLOWED_PREFIXES.some((prefix) => objectPath.startsWith(prefix));
  } catch {
    return false;
  }
}

/** Carrega logo/imagem do Firebase Storage no servidor (jsPDF / Node). */
export async function loadStorageImageForJsPdfServer(
  src: string
): Promise<LoadedJsPdfImage | null> {
  const trimmed = src.trim();
  if (!trimmed) return null;

  try {
    const bucket = getAdminStorageBucket();
    if (!isAllowedStorageUrl(trimmed, bucket.name)) {
      return null;
    }

    const res = await fetch(trimmed, { cache: 'force-cache' });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/png';
    const format = formatFromContentType(contentType, trimmed);
    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

    let width = 280;
    let height = 90;
    try {
      const sharp = (await import('sharp')).default;
      const meta = await sharp(buffer).metadata();
      if (meta.width && meta.height) {
        width = meta.width;
        height = meta.height;
      }
    } catch {
      /* dimensões padrão se sharp indisponível */
    }

    return { dataUrl, format, width, height };
  } catch {
    return null;
  }
}
