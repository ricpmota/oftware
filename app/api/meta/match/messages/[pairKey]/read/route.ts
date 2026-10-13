import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { markMatchThreadRead } from '@/lib/server/matchChatAdmin';
import { requireMatchUid } from '@/lib/server/matchApiAuth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ pairKey: string }> }) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  const { pairKey } = await context.params;
  try {
    const result = await markMatchThreadRead(getFirestoreAdmin(), auth.uid, pairKey);
    if (!result.ok) return NextResponse.json({ ok: false, code: result.code }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível atualizar a leitura.' }, { status: 500 });
  }
}
