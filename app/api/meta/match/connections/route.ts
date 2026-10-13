import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMatchUid } from '@/lib/server/matchApiAuth';
import { listConnections } from '@/lib/server/matchSocialAdmin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const limitRaw = Number(request.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 40;
    const people = await listConnections(getFirestoreAdmin(), auth.uid, limit);
    return NextResponse.json({ ok: true, people });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível abrir suas conexões.' }, { status: 500 });
  }
}
