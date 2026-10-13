import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket, getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function storagePublicUrl(storagePath: string): string {
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e'}.appspot.com`;
  return `https://storage.googleapis.com/${storageBucket}/${storagePath}`;
}

async function requireUid(request: NextRequest): Promise<{ uid: string } | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Faça login novamente.' }, { status: 401 });
  }
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    if (!isValidFirebaseAuthUid(decoded.uid)) {
      return NextResponse.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });
    }
    return { uid: decoded.uid };
  } catch {
    return NextResponse.json({ ok: false, error: 'Sua sessão expirou. Faça login novamente.' }, { status: 401 });
  }
}

function extensionFor(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUid(request);
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Nenhuma foto enviada.' }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ ok: false, error: 'Use uma foto JPG, PNG ou WebP.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'A foto deve ter no máximo 5 MB.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const storagePath = `match-profiles/${auth.uid}/photos/${id}.${extensionFor(file.type)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileRef = getAdminStorageBucket().file(storagePath);
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      },
    });
    let url = storagePublicUrl(storagePath);
    try {
      await fileRef.makePublic();
    } catch {
      const [signed] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 5,
      });
      url = signed;
    }

    return NextResponse.json({
      ok: true,
      photo: {
        id,
        url,
        storagePath,
      },
    });
  } catch (error) {
    console.error('[meta/match/photo]', error);
    const message = error instanceof Error ? error.message : 'Não foi possível enviar a foto.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUid(request);
    if (auth instanceof NextResponse) return auth;
    const body = (await request.json().catch(() => ({}))) as { storagePath?: string };
    const storagePath = String(body.storagePath || '').trim();
    const prefix = `match-profiles/${auth.uid}/photos/`;
    if (!storagePath.startsWith(prefix) || storagePath.includes('..')) {
      return NextResponse.json({ ok: false, error: 'Foto inválida.' }, { status: 403 });
    }
    await getAdminStorageBucket().file(storagePath).delete({ ignoreNotFound: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[meta/match/photo:delete]', error);
    return NextResponse.json({ ok: false, error: 'Não foi possível remover a foto.' }, { status: 500 });
  }
}
