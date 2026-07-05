import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';

export type MetaAdminGeralAuth = {
  email: string;
  uid: string;
};

export async function requireMetaAdminGeral(
  request: NextRequest
): Promise<MetaAdminGeralAuth | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Token de autenticação obrigatório.' }, { status: 401 });
  }

  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    const email = (decoded.email || '').trim().toLowerCase();
    if (email !== METAADMIN_GERAL_EMAIL.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    return { email: decoded.email!, uid: decoded.uid };
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
  }
}
