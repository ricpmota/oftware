import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  isMimeExameImagemAceito,
  mimeNormalizadoExameImagem,
} from '@/lib/metaadmin/examesImagemAllowedMime';

export const runtime = 'nodejs';

const MAX_BYTES = Math.floor(8 * 1024 * 1024);

/**
 * POST multipart/form-data:
 * - file: PDF ou imagem (JPEG, PNG, WEBP, GIF)
 * - pacienteId: ID do documento em pacientes_completos
 *
 * Requer Authorization: Bearer &lt;Firebase ID token&gt;.
 * Objeto fica **privado** no bucket; use a rota de URL assinada para visualizar.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pacienteIdRaw = formData.get('pacienteId');
    const pacienteId =
      typeof pacienteIdRaw === 'string' ? pacienteIdRaw.trim() : pacienteIdRaw != null ? String(pacienteIdRaw).trim() : '';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }
    if (!pacienteId) {
      return NextResponse.json({ ok: false, error: 'Informe pacienteId.' }, { status: 400 });
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    const contentType = mimeNormalizadoExameImagem(file);
    if (!isMimeExameImagemAceito(contentType)) {
      return NextResponse.json(
        { ok: false, error: 'Formato não aceito. Envie PDF, JPEG, PNG, WEBP ou GIF.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'Arquivo muito grande. Máximo 8 MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 12);
    const safeName = (file.name || 'laudo').replace(/[^\w.\-()\s]/g, '_').slice(0, 120);
    const storagePath = `pacientes-exames-imagem/${pacienteId}/${timestamp}_${random}_${safeName}`;

    const bucket = getAdminStorageBucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType,
        cacheControl: 'private, max-age=0',
      },
    });

    return NextResponse.json({ ok: true, storagePath });
  } catch (error: unknown) {
    console.error('[exames-imagem-upload-pdf]', error);
    const err = error as { code?: string; message?: string };
    let errorMessage = 'Erro ao fazer upload do arquivo';
    if (err.code === 404 || err.message?.includes('does not exist')) {
      errorMessage =
        'O Firebase Storage não está configurado. Ative o bucket no Firebase Console.';
    } else if (err.message) {
      errorMessage = err.message;
    }
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
