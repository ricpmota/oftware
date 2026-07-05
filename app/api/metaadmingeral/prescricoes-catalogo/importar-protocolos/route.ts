import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { importarProtocolosOftware } from '@/lib/prescricao/importarProtocolosOftware';

const METAADMINGERAL_EMAIL = 'ricpmota.med@gmail.com';

async function requireMetaAdminGeral(request: NextRequest): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { ok: false, res: NextResponse.json({ error: 'Token obrigatório.' }, { status: 401 }) };
  }
  try {
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(token);
    if (decoded.email !== METAADMINGERAL_EMAIL) {
      return { ok: false, res: NextResponse.json({ error: 'Acesso negado. Apenas MetaAdminGeral.' }, { status: 403 }) };
    }
    return { ok: true };
  } catch {
    return { ok: false, res: NextResponse.json({ error: 'Token inválido.' }, { status: 401 }) };
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const db = getFirestoreAdmin();
    const resultado = await importarProtocolosOftware(db);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    console.error('[metaadmingeral/prescricoes-catalogo/importar-protocolos POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha ao importar protocolos.' },
      { status: 500 }
    );
  }
}
