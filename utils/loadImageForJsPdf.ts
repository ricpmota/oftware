export type JsPdfImageFormat = 'PNG' | 'JPEG';

export type LoadedJsPdfImage = {
  dataUrl: string;
  format: JsPdfImageFormat;
  width: number;
  height: number;
};

function formatFromMime(mime: string | undefined, src: string): JsPdfImageFormat {
  const type = (mime || '').toLowerCase();
  if (type.includes('jpeg') || type.includes('jpg')) return 'JPEG';
  const lower = src.toLowerCase();
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'JPEG';
  return 'PNG';
}

function isExternalHttpUrl(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://');
}

function toAbsoluteUrl(src: string): string {
  if (isExternalHttpUrl(src)) return src;
  if (typeof window === 'undefined') return src;
  return `${window.location.origin}${src.startsWith('/') ? src : `/${src}`}`;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler imagem'));
    reader.readAsDataURL(blob);
  });
}

async function fetchBlobFromUrl(src: string): Promise<Blob> {
  const res = await fetch(src, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

async function fetchViaStorageProxy(src: string): Promise<{ dataUrl: string; format: JsPdfImageFormat }> {
  const res = await fetch(`/api/medico-white-label-image-data?url=${encodeURIComponent(src)}`, {
    cache: 'force-cache',
  });
  if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
  const json = (await res.json()) as { dataUrl?: string; format?: JsPdfImageFormat };
  if (!json.dataUrl) throw new Error('Resposta inválida do proxy');
  return { dataUrl: json.dataUrl, format: json.format === 'JPEG' ? 'JPEG' : 'PNG' };
}

async function measureDataUrl(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width || 1,
        height: img.naturalHeight || img.height || 1,
      });
    };
    img.onerror = () => reject(new Error('Falha ao medir imagem'));
    img.src = dataUrl;
  });
}

/** Carrega imagem como data URL para uso no jsPDF (contorna CORS do Firebase Storage). */
export async function loadImageForJsPdf(src: string): Promise<LoadedJsPdfImage | null> {
  const trimmed = src.trim();
  if (!trimmed) return null;

  const isStorageUrl =
    trimmed.includes('storage.googleapis.com') ||
    trimmed.includes('firebasestorage.googleapis.com');

  if (isStorageUrl && typeof window === 'undefined') {
    const { loadStorageImageForJsPdfServer } = await import('@/utils/loadImageForJsPdf.server');
    return loadStorageImageForJsPdfServer(trimmed);
  }

  let dataUrl: string;
  let format: JsPdfImageFormat;

  if (isStorageUrl) {
    const proxied = await fetchViaStorageProxy(trimmed);
    dataUrl = proxied.dataUrl;
    format = proxied.format;
  } else {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const blob = await fetchBlobFromUrl(toAbsoluteUrl(trimmed));
      dataUrl = await blobToDataUrl(blob);
      format = formatFromMime(blob.type, trimmed);
    } catch {
      return null;
    }
  }

  const { width, height } = await measureDataUrl(dataUrl);
  return { dataUrl, format, width, height };
}
