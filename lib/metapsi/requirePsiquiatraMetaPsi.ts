import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { COL_PSIQUIATRAS } from '@/features/metaPsi/metaPsi.constants';

export type PsiquiatraAuth = {
  uid: string;
  email: string | null;
};

/**
 * Gate MetaPsi: Bearer Firebase + documento em psiquiatras/{uid}.
 * Segue o padrão de requireNutricionistaMetaNutri / requirePersonalMetaPersonal:
 * verifica existência do documento, não isVerificado.
 * NÃO consulta nutricionistas nem personal_trainers.
 */
export async function requirePsiquiatraMetaPsi(
  request: NextRequest
): Promise<PsiquiatraAuth | NextResponse> {
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

  const snap = await getFirestoreAdmin().collection(COL_PSIQUIATRAS).doc(uid).get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: 'Acesso restrito a psiquiatras cadastrados.' },
      { status: 403 }
    );
  }

  return { uid, email };
}
