import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { dispatchMatchBroadcast } from '@/lib/server/matchBroadcastAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => null)) as { patientIds?: unknown; message?: unknown } | null;
  const patientIds = Array.isArray(body?.patientIds)
    ? body.patientIds.filter((id): id is string => typeof id === 'string')
    : [];
  const message = typeof body?.message === 'string' ? body.message : '';
  try {
    const result = await dispatchMatchBroadcast(getFirestoreAdmin(), { patientIds, message, email: auth.email });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[metaadmingeral/match-saudavel/disparo POST]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Não foi possível disparar.' },
      { status: 500 },
    );
  }
}
