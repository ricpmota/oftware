import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMatchUid } from '@/lib/server/matchApiAuth';
import { buildMatchPublicProfile, setMatchDiscoverable } from '@/lib/server/matchPublicProfile';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const profile = await buildMatchPublicProfile(getFirestoreAdmin(), auth.uid);
    return NextResponse.json({ ok: true, discoverable: profile?.discoverable === true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível abrir esta opção.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => null)) as { discoverable?: boolean } | null;
  if (typeof body?.discoverable !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'Não foi possível salvar.' }, { status: 400 });
  }
  try {
    const result = await setMatchDiscoverable(getFirestoreAdmin(), auth.uid, body.discoverable);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível salvar.' }, { status: 500 });
  }
}
