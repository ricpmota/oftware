import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  getInstagramBioStatsForMedico,
  isInstagramBioAnalyticsAllowed,
  recordInstagramBioAnalyticsEvent,
} from '@/lib/instagram/instagramBioStats.server';
import type { InstagramBioStatsProfileKey } from '@/types/instagramBioStats';

const PROFILE_KEYS = new Set<InstagramBioStatsProfileKey>([
  'emagrecer',
  'nutricionista',
  'personal',
  'fundador',
  'medico',
]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      medicoId?: string;
      type?: string;
      profile?: string;
    };

    const medicoId = body.medicoId?.trim();
    const type = body.type?.trim();
    const profile = body.profile?.trim() as InstagramBioStatsProfileKey | undefined;

    if (!medicoId || !type) {
      return NextResponse.json({ error: 'medicoId e type são obrigatórios' }, { status: 400 });
    }

    if (type !== 'view' && type !== 'click' && type !== 'whatsapp') {
      return NextResponse.json({ error: 'type inválido' }, { status: 400 });
    }

    if (profile && !PROFILE_KEYS.has(profile)) {
      return NextResponse.json({ error: 'profile inválido' }, { status: 400 });
    }

    const allowed = await isInstagramBioAnalyticsAllowed(medicoId);
    if (!allowed) {
      return NextResponse.json({ error: 'Link da Bio inativo' }, { status: 404 });
    }

    await recordInstagramBioAnalyticsEvent({
      medicoId,
      type,
      profile,
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[instagram-bio/analytics/event]', error);
    return NextResponse.json({ error: 'Erro ao registrar evento' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const gate = await requireMedicoMetaadmin(request);
    if (!gate.ok) return gate.res;

    const db = getFirestoreAdmin();
    const medicoSnap = await db.collection('medicos').doc(gate.medicoDocId).get();
    const medicoEmail = typeof medicoSnap.data()?.email === 'string' ? medicoSnap.data()!.email : undefined;

    const stats = await getInstagramBioStatsForMedico(gate.medicoDocId, medicoEmail);
    return NextResponse.json(stats);
  } catch (error: unknown) {
    console.error('[instagram-bio/analytics/stats GET]', error);
    return NextResponse.json({ error: 'Erro ao carregar estatísticas' }, { status: 500 });
  }
}
