import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

const METAADMINGERAL_EMAIL = 'ricpmota.med@gmail.com';

async function requireMetaAdminGeral(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { ok: false as const, res: NextResponse.json({ error: 'Token obrigatório.' }, { status: 401 }) };
  }
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    if (decoded.email !== METAADMINGERAL_EMAIL) {
      return { ok: false as const, res: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, res: NextResponse.json({ error: 'Token inválido.' }, { status: 401 }) };
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const body = (await request.json()) as { medicoId?: string; ativo?: boolean };
    const medicoId = (body.medicoId || '').trim();
    if (!medicoId) {
      return NextResponse.json({ error: 'medicoId obrigatório.' }, { status: 400 });
    }
    if (typeof body.ativo !== 'boolean') {
      return NextResponse.json({ error: 'ativo (boolean) obrigatório.' }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const ref = db.collection('medicos').doc(medicoId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Médico não encontrado.' }, { status: 404 });
    }

    await ref.update({ metodoImagensAtivo: body.ativo });

    return NextResponse.json({ ok: true, medicoId, metodoImagensAtivo: body.ativo });
  } catch (e) {
    console.error('[metaadmingeral/metodo/toggle POST]', e);
    return NextResponse.json({ error: 'Falha ao atualizar Método do médico.' }, { status: 500 });
  }
}
