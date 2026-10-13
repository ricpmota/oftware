import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

export async function POST(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (gate instanceof NextResponse) return gate;

  try {
    const body = (await request.json()) as { medicoId?: string; ativo?: boolean };
    const medicoId = String(body.medicoId || '').trim();
    if (!medicoId) {
      return NextResponse.json({ error: 'medicoId obrigatório.' }, { status: 400 });
    }
    if (typeof body.ativo !== 'boolean') {
      return NextResponse.json({ error: 'ativo (boolean) obrigatório.' }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const ref = db.collection('medicos').doc(medicoId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Médico não encontrado.' }, { status: 404 });
    }

    await ref.update({ uploadMentor: body.ativo });

    return NextResponse.json({
      ok: true,
      medicoId,
      uploadMentor: body.ativo,
      message: 'Permissão atualizada.',
    });
  } catch (error) {
    console.error('[metaadmingeral/medicos/upload-mentor POST]', error);
    return NextResponse.json({ error: 'Falha ao atualizar a permissão Upload Mentor.' }, { status: 500 });
  }
}
