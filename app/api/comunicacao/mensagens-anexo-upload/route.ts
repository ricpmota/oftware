import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';

export const runtime = 'nodejs';

const MAX_BYTES = 20 * 1024 * 1024;

function isMimePermitido(mime: string): boolean {
  const m = mime.toLowerCase().trim();
  if (!m) return false;
  if (m.startsWith('image/') || m.startsWith('video/')) return true;
  if (m === 'application/pdf' || m === 'text/plain') return true;
  if (
    m === 'application/msword' ||
    m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    m === 'application/vnd.ms-excel' ||
    m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return true;
  }
  return false;
}

/** Upload de anexo para e-mail corporativo (qualquer usuário autenticado). */
export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Faça login novamente.' }, { status: 401 });
    }
    let uid: string;
    try {
      const decoded = await getAuthAdmin().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ ok: false, error: 'Sessão expirada.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const contentType = (file.type || 'application/octet-stream').toLowerCase();
    if (!isMimePermitido(contentType)) {
      return NextResponse.json(
        { ok: false, error: 'Formato não aceito. Envie imagem, vídeo, PDF ou documento Office.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'Arquivo muito grande. Máximo 20 MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const safeName = (file.name || 'anexo').replace(/[^\w.\-()\s]+/g, '_').slice(0, 120);
    const storagePath = `organizacao_mensagens/${uid}/${timestamp}_${random}_${safeName}`;

    const bucket = getAdminStorageBucket();
    const fileRef = bucket.file(storagePath);
    const storageBucket =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e'}.appspot.com`;

    await fileRef.save(buffer, {
      metadata: { contentType, cacheControl: 'public, max-age=31536000' },
    });
    await fileRef.makePublic();
    const url = `https://storage.googleapis.com/${storageBucket}/${storagePath}`;

    return NextResponse.json({
      ok: true,
      url,
      storagePath,
      name: file.name || safeName,
      mimeType: contentType,
      size: file.size,
    });
  } catch (error: unknown) {
    console.error('[comunicacao/mensagens-anexo-upload]', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { ok: false, error: err.message || 'Erro ao fazer upload do anexo.' },
      { status: 500 }
    );
  }
}
