import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';

const ALLOWED_PREFIXES = [
  'medico-white-label-pdf/',
  'medico-white-label-og/',
  'medico-white-label-favicon/',
  'medico-white-label-public-logo/',
] as const;

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

function formatFromContentType(contentType: string | null, url: string): 'PNG' | 'JPEG' {
  const type = (contentType || '').toLowerCase();
  if (type.includes('jpeg') || type.includes('jpg')) return 'JPEG';
  const lower = url.toLowerCase();
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'JPEG';
  return 'PNG';
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')?.trim();
    if (!url) {
      return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 });
    }

    const bucket = getAdminStorageBucket();
    if (!isAllowedStorageUrl(url, bucket.name)) {
      return NextResponse.json({ error: 'URL não permitida' }, { status: 400 });
    }

    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
    const format = formatFromContentType(contentType, url);

    return NextResponse.json({ dataUrl, format });
  } catch (error: unknown) {
    console.error('[medico-white-label-image-data]', error);
    const message = error instanceof Error ? error.message : 'Erro ao carregar imagem';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
