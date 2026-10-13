import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';

export type PersonalTrainerAuth = {
  uid: string;
  email: string | null;
};

/**
 * Gate read-only MetaPersonal: Bearer Firebase + documento em personal_trainers/{uid}.
 */
export async function requirePersonalMetaPersonal(
  request: NextRequest
): Promise<PersonalTrainerAuth | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado. Faça login novamente.' }, { status: 401 });
  }

  let uid: string;
  let email: string | null = null;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? null;
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
  }

  const snap = await getFirestoreAdmin().collection(COL_PERSONAL_TRAINERS).doc(uid).get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: 'Acesso restrito a personal trainers cadastrados.' },
      { status: 403 }
    );
  }

  return { uid, email };
}
