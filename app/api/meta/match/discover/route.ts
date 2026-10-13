import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMatchUid } from '@/lib/server/matchApiAuth';
import { listDiscovery } from '@/lib/server/matchSocialAdmin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const cursor = request.nextUrl.searchParams.get('cursor') || undefined;
    const result = await listDiscovery(getFirestoreAdmin(), auth.uid, cursor);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível buscar conexões agora.' }, { status: 500 });
  }
}
