import { NextRequest, NextResponse } from 'next/server';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import {
  assertStoragePathBelongsToPaciente,
  requireMedicoPacienteMetaadmin,
} from '@/lib/server/metaadminExamesImagemGate';

export const runtime = 'nodejs';

type Body = { pacienteId?: string; storagePath?: string };

/**
 * POST JSON { pacienteId, storagePath }
 * Requer Authorization: Bearer &lt;Firebase ID token&gt;.
 * Remove o objeto do bucket (idempotente se já não existir).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const pacienteId = (body.pacienteId || '').trim();
    const storagePath = (body.storagePath || '').trim();

    if (!pacienteId || !storagePath) {
      return NextResponse.json({ ok: false, error: 'Informe pacienteId e storagePath.' }, { status: 400 });
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    if (!assertStoragePathBelongsToPaciente(pacienteId, storagePath)) {
      return NextResponse.json({ ok: false, error: 'Caminho de arquivo inválido.' }, { status: 400 });
    }

    const bucket = getAdminStorageBucket();
    const fileRef = bucket.file(storagePath);
    const [exists] = await fileRef.exists();
    if (exists) {
      await fileRef.delete({ ignoreNotFound: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[exames-imagem-delete-pdf]', e);
    const message = e instanceof Error ? e.message : 'Falha ao excluir arquivo.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
