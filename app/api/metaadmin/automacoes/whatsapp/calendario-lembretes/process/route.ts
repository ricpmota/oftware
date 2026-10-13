import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  processCalendarioLembreteNow,
  processDueCalendarioLembretesWhatsapp,
} from '@/services/calendarioLembreteWhatsappService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/metaadmin/automacoes/whatsapp/calendario-lembretes/process
 * Body: { lembreteId?: string } — se informado, dispara só esse; senão processa vencidos do médico.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const body = (await request.json().catch(() => null)) as { lembreteId?: string } | null;
    const lembreteId = body?.lembreteId?.trim();

    if (lembreteId) {
      const snap = await (
        await import('@/lib/server/firebaseAdminOftware')
      )
        .getFirestoreAdmin()
        .collection('lembretes')
        .doc(lembreteId)
        .get();
      if (!snap.exists) {
        return NextResponse.json({ ok: false, error: 'Lembrete não encontrado.' }, { status: 404 });
      }
      const medicoId = String(snap.data()?.medicoId ?? '').trim();
      if (medicoId !== auth.medicoDocId) {
        return NextResponse.json({ ok: false, error: 'Lembrete de outro médico.' }, { status: 403 });
      }

      const result = await processCalendarioLembreteNow(lembreteId);
      return NextResponse.json({ ok: result.ok, result });
    }

    const result = await processDueCalendarioLembretesWhatsapp({
      now: new Date(),
      limit: 20,
      doctorId: auth.medicoDocId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[metaadmin/calendario-lembretes/process]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao processar lembretes.',
      },
      { status: 500 },
    );
  }
}
