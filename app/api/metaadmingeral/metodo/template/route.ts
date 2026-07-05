import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { METODO_IMAGENS_SOURCE_EMAIL } from '@/lib/metodo/metodoImagens';
import {
  getMetodoImagensTemplateFromFirestore,
  syncMetodoImagensTemplateFromSourceMedico,
} from '@/lib/metodo/metodoImagensService.server';

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

export async function GET(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    let template = await getMetodoImagensTemplateFromFirestore();
    if (!template) {
      template = await syncMetodoImagensTemplateFromSourceMedico();
    }
    return NextResponse.json({ template, sourceEmail: METODO_IMAGENS_SOURCE_EMAIL });
  } catch (e) {
    console.error('[metaadmingeral/metodo/template GET]', e);
    const message = e instanceof Error ? e.message : 'Falha ao carregar template Método.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const template = await syncMetodoImagensTemplateFromSourceMedico();
    return NextResponse.json({ ok: true, template, sourceEmail: METODO_IMAGENS_SOURCE_EMAIL });
  } catch (e) {
    console.error('[metaadmingeral/metodo/template POST]', e);
    const message = e instanceof Error ? e.message : 'Falha ao sincronizar template Método.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
