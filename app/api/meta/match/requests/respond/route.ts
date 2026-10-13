import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMatchUid } from '@/lib/server/matchApiAuth';
import { notifyMatchCanalChat } from '@/lib/server/matchCanalChatNotify';
import { forgetMatchPass } from '@/lib/server/matchPassesAdmin';
import { respondConnectionRequest } from '@/lib/server/matchSocialAdmin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => null)) as { requestId?: string; action?: 'accept' | 'ignore' } | null;
  const requestId = body?.requestId?.trim() || '';
  const action = body?.action;
  if (!requestId || (action !== 'accept' && action !== 'ignore')) {
    return NextResponse.json({ ok: false, error: 'Solicitação inválida.' }, { status: 400 });
  }
  try {
    const result = await respondConnectionRequest(getFirestoreAdmin(), auth.uid, requestId, action);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: 'Essa solicitação não pode ser atualizada.' }, { status: 403 });
    }
    if (result.connected && result.users.length === 2) {
      const [first, second] = result.users;
      const db = getFirestoreAdmin();
      await Promise.all([forgetMatchPass(db, first, second), forgetMatchPass(db, second, first)]);
      await notifyMatchCanalChat(db, first, second);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível responder agora.' }, { status: 500 });
  }
}
