import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';

export const runtime = 'nodejs';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

function isMimePermitido(mime: string): boolean {
  const m = mime.toLowerCase().trim();
  if (!m) return false;
  if (m.startsWith('image/')) return true;
  if (m.startsWith('video/')) return true;
  if (m === 'application/pdf') return true;
  if (
    m === 'application/msword' ||
    m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    m === 'application/vnd.ms-excel' ||
    m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    m === 'text/plain'
  ) {
    return true;
  }
  return false;
}

/**
 * POST multipart/form-data:
 * - file
 * - pacienteId
 *
 * Authorization: Bearer <Firebase ID token>
 * Retorna URL pública para embutir na mensagem.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pacienteIdRaw = formData.get('pacienteId');
    const pacienteId =
      typeof pacienteIdRaw === 'string'
        ? pacienteIdRaw.trim()
        : pacienteIdRaw != null
          ? String(pacienteIdRaw).trim()
          : '';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }
    if (!pacienteId) {
      return NextResponse.json({ ok: false, error: 'Informe pacienteId.' }, { status: 400 });
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    const contentType = (file.type || 'application/octet-stream').toLowerCase();
    if (!isMimePermitido(contentType)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Formato não aceito. Envie imagem, vídeo, PDF ou documento Office.',
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'Arquivo muito grande. Máximo 20 MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const safeName = (file.name || 'anexo').replace(/[^\w.\-()\s]+/g, '_').slice(0, 120);
    const storagePath = `pacientes_mensagens/${pacienteId}/${timestamp}_${random}_${safeName}`;

    const bucket = getAdminStorageBucket();
    const fileRef = bucket.file(storagePath);
    const storageBucket =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e'}.appspot.com`;

    await fileRef.save(buffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000',
      },
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
    console.error('[mensagens-anexo-upload]', error);
    const err = error as { code?: string; message?: string };
    let errorMessage = 'Erro ao fazer upload do anexo.';
    if (err.code === 404 || err.message?.includes('does not exist')) {
      errorMessage =
        'O Firebase Storage não está configurado. Ative o bucket no Firebase Console.';
    } else if (err.message) {
      errorMessage = err.message;
    }
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
