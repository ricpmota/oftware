import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMatchUid } from '@/lib/server/matchApiAuth';
import { notifyMatchCanalChat } from '@/lib/server/matchCanalChatNotify';
import { forgetMatchPass } from '@/lib/server/matchPassesAdmin';
import { listIncomingRequests, sendConnectionRequest } from '@/lib/server/matchSocialAdmin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const people = await listIncomingRequests(getFirestoreAdmin(), auth.uid);
    return NextResponse.json({ ok: true, people, pendingCount: people.length });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível abrir as solicitações.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => null)) as { toUid?: string } | null;
  const toUid = body?.toUid?.trim() || '';
  if (!toUid) {
    return NextResponse.json({ ok: false, result: 'unavailable' }, { status: 400 });
  }
  try {
    const result = await sendConnectionRequest(getFirestoreAdmin(), auth.uid, toUid);
    if (!result.ok) {
      const status = result.result === 'blocked' ? 403 : 400;
      return NextResponse.json({ ok: false, result: result.result }, { status });
    }
    if (result.result === 'interest_sent' || result.result === 'connected' || result.result === 'already_connected') {
      const db = getFirestoreAdmin();
      await forgetMatchPass(db, auth.uid, toUid);
      if (result.result === 'connected' || result.result === 'already_connected') {
        await forgetMatchPass(db, toUid, auth.uid);
      }
    }
    if (result.result === 'connected') {
      await notifyMatchCanalChat(getFirestoreAdmin(), auth.uid, toUid);
    }
    return NextResponse.json({ ok: true, result: result.result, requestId: result.requestId });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível conectar agora.' }, { status: 500 });
  }
}
