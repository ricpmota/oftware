import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';

const OG_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const PDF_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);
const FAVICON_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'application/octet-stream',
]);
const FAVICON_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico']);

const MAX_OG_BYTES = 2 * 1024 * 1024;
const MAX_PDF_BYTES = 2 * 1024 * 1024;
const MAX_FAVICON_BYTES = 1 * 1024 * 1024;

function folderForTipo(tipo: string): string {
  if (tipo === 'pdf') return 'medico-white-label-pdf';
  if (tipo === 'favicon') return 'medico-white-label-favicon';
  if (tipo === 'public-logo') return 'medico-white-label-public-logo';
  if (tipo === 'instagram-bio') return 'medico-instagram-bio';
  return 'medico-white-label-og';
}

function validateFile(file: File, tipo: string): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (tipo === 'favicon') {
    if (!FAVICON_TYPES.has(file.type) && !FAVICON_EXTENSIONS.has(ext)) {
      return 'Formato inválido. Use PNG, JPG, SVG, ICO ou WebP.';
    }
    if (file.size > MAX_FAVICON_BYTES) {
      return 'Arquivo muito grande. Tamanho máximo: 1MB.';
    }
    return null;
  }

  if (tipo === 'pdf') {
    if (!PDF_TYPES.has(file.type)) {
      return 'Formato inválido. Use PNG ou JPG.';
    }
    if (file.size > MAX_PDF_BYTES) {
      return 'Arquivo muito grande. Tamanho máximo: 2MB.';
    }
    return null;
  }

  if (tipo === 'public-logo' || tipo === 'instagram-bio') {
    if (!PDF_TYPES.has(file.type) && !OG_TYPES.has(file.type)) {
      return 'Formato inválido. Use PNG, JPG ou WebP.';
    }
    if (file.size > MAX_OG_BYTES) {
      return 'Arquivo muito grande. Tamanho máximo: 2MB.';
    }
    return null;
  }

  if (!OG_TYPES.has(file.type)) {
    return 'Formato inválido. Use PNG, JPG ou WebP.';
  }
  if (file.size > MAX_OG_BYTES) {
    return 'Arquivo muito grande. Tamanho máximo: 2MB.';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tipo = String(formData.get('tipo') || 'og').trim().toLowerCase();

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const validationError = validateFile(file, tipo);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${folderForTipo(tipo)}/${timestamp}_${random}.${ext}`;

    const bucket = getAdminStorageBucket();
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type || undefined,
        cacheControl: 'public, max-age=31536000',
      },
    });

    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error: unknown) {
    console.error('Erro ao fazer upload da imagem white label:', error);
    const message =
      error instanceof Error ? error.message : 'Erro ao fazer upload da imagem';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
