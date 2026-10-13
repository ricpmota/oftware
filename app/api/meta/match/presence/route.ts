import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMatchUid } from '@/lib/server/matchApiAuth';
import { recordMatchPresence } from '@/lib/server/matchPresenceAdmin';

export const runtime = 'nodejs';

/** Marca que esta pessoa abriu o Match. A contagem é agrupada no servidor. */
export async function POST(request: NextRequest) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const user = await getAuthAdmin().getUser(auth.uid);
    await recordMatchPresence(getFirestoreAdmin(), {
      uid: auth.uid,
      displayName: user.displayName || '',
      email: user.email || '',
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
