import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';

export async function requireMatchUid(request: NextRequest): Promise<{ uid: string } | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Faça login novamente.' }, { status: 401 });
  }
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    if (!isValidFirebaseAuthUid(decoded.uid)) {
      return NextResponse.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });
    }
    return { uid: decoded.uid };
  } catch {
    return NextResponse.json({ ok: false, error: 'Sua sessão expirou. Faça login novamente.' }, { status: 401 });
  }
}
