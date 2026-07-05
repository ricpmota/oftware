import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import {
  assertStoragePathBelongsToPaciente,
  requireLeituraExamesImagemAutorizado,
} from '@/lib/server/metaadminExamesImagemGate';

export const runtime = 'nodejs';

const SIGNED_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * GET ?pacienteId=...&storagePath=...
 * Requer Authorization: Bearer &lt;Firebase ID token&gt;.
 * Retorna URL assinada de leitura (curta duração) para visualização do anexo (PDF ou imagem).
 * Autorizado: médico responsável ou o próprio paciente (portal /meta).
 */
export async function GET(request: NextRequest) {
  try {
    const pacienteId = (request.nextUrl.searchParams.get('pacienteId') || '').trim();
    const storagePathRaw = request.nextUrl.searchParams.get('storagePath') || '';
    let storagePath = storagePathRaw.trim();
    try {
      storagePath = decodeURIComponent(storagePath);
    } catch {
      /* já decodificado */
    }

    if (!pacienteId || !storagePath) {
      return NextResponse.json({ ok: false, error: 'Informe pacienteId e storagePath.' }, { status: 400 });
    }

    const gate = await requireLeituraExamesImagemAutorizado(request, pacienteId);
    if (!gate.ok) return gate.res;

    if (!assertStoragePathBelongsToPaciente(pacienteId, storagePath)) {
      return NextResponse.json({ ok: false, error: 'Caminho de arquivo inválido.' }, { status: 400 });
    }

    const bucket = getAdminStorageBucket();
    const fileRef = bucket.file(storagePath);
    const [exists] = await fileRef.exists();
    if (!exists) {
      return NextResponse.json({ ok: false, error: 'Arquivo não encontrado.' }, { status: 404 });
    }

    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_TTL_MS,
    });

    return NextResponse.json({ ok: true, url, expiresInSeconds: Math.floor(SIGNED_TTL_MS / 1000) });
  } catch (e) {
    console.error('[exames-imagem-signed-url]', e);
    const message = e instanceof Error ? e.message : 'Falha ao gerar URL.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
