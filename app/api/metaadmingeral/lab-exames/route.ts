import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  getDefaultLabOrderBySection,
  validateLabOrderBySection,
} from '@/lib/labExames/validateLabOrderBySection';
import { validateLabLimitOverrides } from '@/lib/labExames/validateLabLimitOverrides';

const METAADMINGERAL_EMAIL = 'ricpmota.med@gmail.com';
const COLLECTION = 'platformSettings';
const DOC_ID = 'labExames';

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

export async function GET(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!snap.exists) {
      return NextResponse.json({
        labOrderBySection: getDefaultLabOrderBySection(),
        labLimitOverrides: {},
        source: 'default',
      });
    }
    const data = snap.data();
    const order = data?.labOrderBySection;
    const rawOv = data?.labLimitOverrides;
    const labLimitOverrides =
      rawOv && typeof rawOv === 'object' && !Array.isArray(rawOv) ? rawOv : {};
    if (order && typeof order === 'object') {
      return NextResponse.json({
        labOrderBySection: order,
        labLimitOverrides,
        source: 'firestore',
        updatedAt: data?.updatedAt,
      });
    }
    return NextResponse.json({
      labOrderBySection: getDefaultLabOrderBySection(),
      labLimitOverrides,
      source: 'default',
    });
  } catch (e) {
    console.error('[metaadmingeral/lab-exames GET]', e);
    return NextResponse.json({ error: 'Falha ao ler configuração.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const body = (await request.json()) as { labOrderBySection?: unknown; labLimitOverrides?: unknown };
    const hasOrder = 'labOrderBySection' in body && body.labOrderBySection !== undefined;
    const hasOverrides = 'labLimitOverrides' in body && body.labLimitOverrides !== undefined;
    if (!hasOrder && !hasOverrides) {
      return NextResponse.json(
        { error: 'Informe labOrderBySection e/ou labLimitOverrides.' },
        { status: 400 }
      );
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (hasOrder) {
      const { ok, errors } = validateLabOrderBySection(body.labOrderBySection);
      if (!ok) {
        return NextResponse.json({ error: 'Validação falhou (ordem).', details: errors }, { status: 400 });
      }
      updates.labOrderBySection = body.labOrderBySection;
    }
    if (hasOverrides) {
      const { ok, errors } = validateLabLimitOverrides(body.labLimitOverrides);
      if (!ok) {
        return NextResponse.json({ error: 'Validação falhou (faixas).', details: errors }, { status: 400 });
      }
      updates.labLimitOverrides = body.labLimitOverrides;
    }
    const db = getFirestoreAdmin();
    await db.collection(COLLECTION).doc(DOC_ID).set(updates, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[metaadmingeral/lab-exames PUT]', e);
    return NextResponse.json({ error: 'Falha ao salvar.' }, { status: 500 });
  }
}
