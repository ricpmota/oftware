import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMatchUid } from '@/lib/server/matchApiAuth';
import { forgetMatchPass, listMatchPasses, rememberMatchPass } from '@/lib/server/matchPassesAdmin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const uids = await listMatchPasses(getFirestoreAdmin(), auth.uid);
    return NextResponse.json({ ok: true, uids });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível ler as recusas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => null)) as { toUid?: string; action?: 'pass' | 'clear' } | null;
  const toUid = body?.toUid?.trim() || '';
  const action = body?.action;
  if (!toUid || (action !== 'pass' && action !== 'clear')) {
    return NextResponse.json({ ok: false, error: 'Recusa inválida.' }, { status: 400 });
  }
  try {
    const db = getFirestoreAdmin();
    if (action === 'pass') await rememberMatchPass(db, auth.uid, toUid);
    else await forgetMatchPass(db, auth.uid, toUid);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível gravar a recusa.' }, { status: 500 });
  }
}
