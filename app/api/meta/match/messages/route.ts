import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { listMatchConversations } from '@/lib/server/matchChatAdmin';
import { requireMatchUid } from '@/lib/server/matchApiAuth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await listMatchConversations(getFirestoreAdmin(), auth.uid);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível abrir as mensagens.' }, { status: 500 });
  }
}
