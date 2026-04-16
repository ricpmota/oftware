import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  sanitizeBioLimitOverrides,
  validateBioLimitOverrides,
} from '@/lib/bioImpedancia/validateBioLimitOverrides';
import type { BioLimitOverrides } from '@/types/bioImpedancia';

const METAADMINGERAL_EMAIL = 'ricpmota.med@gmail.com';
const COLLECTION = 'platformSettings';
const DOC_ID = 'bioImpedancia';

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
        bioLimitOverrides: {},
        source: 'default',
      });
    }
    const data = snap.data();
    const rawOv = data?.bioLimitOverrides;
    const bioLimitOverrides =
      rawOv && typeof rawOv === 'object' && !Array.isArray(rawOv) ? rawOv : {};
    return NextResponse.json({
      bioLimitOverrides,
      source: 'firestore',
      updatedAt: data?.updatedAt,
    });
  } catch (e) {
    console.error('[metaadmingeral/bio-impedancia GET]', e);
    return NextResponse.json({ error: 'Falha ao ler configuração.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const body = (await request.json()) as { bioLimitOverrides?: unknown };
    if (!('bioLimitOverrides' in body) || body.bioLimitOverrides === undefined) {
      return NextResponse.json({ error: 'Informe bioLimitOverrides.' }, { status: 400 });
    }
    const { ok, errors } = validateBioLimitOverrides(body.bioLimitOverrides);
    if (!ok) {
      return NextResponse.json({ error: 'Validação falhou (faixas).', details: errors }, { status: 400 });
    }
    const cleaned = sanitizeBioLimitOverrides(body.bioLimitOverrides as BioLimitOverrides);
    const db = getFirestoreAdmin();
    await db.collection(COLLECTION).doc(DOC_ID).set(
      {
        bioLimitOverrides: cleaned,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[metaadmingeral/bio-impedancia PUT]', e);
    return NextResponse.json({ error: 'Falha ao salvar.' }, { status: 500 });
  }
}
