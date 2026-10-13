import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMatchUid } from '@/lib/server/matchApiAuth';
import { personPayload } from '@/lib/server/matchSocialAdmin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  const { uid } = await context.params;
  if (!uid || uid === auth.uid) {
    return NextResponse.json({ ok: false, error: 'Perfil indisponível.' }, { status: 400 });
  }
  try {
    const person = await personPayload(getFirestoreAdmin(), auth.uid, uid);
    if (!person) return NextResponse.json({ ok: false, error: 'Perfil indisponível.' }, { status: 404 });
    return NextResponse.json({ ok: true, person });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível abrir este perfil.' }, { status: 500 });
  }
}
