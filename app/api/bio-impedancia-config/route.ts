import { NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

export const dynamic = 'force-dynamic';

const COLLECTION = 'platformSettings';
const DOC_ID = 'bioImpedancia';

/**
 * Leitura pública das faixas de referência (overrides) de Bio Impedância.
 * Usada por /meta, metaadmin, metanutri e metapersonal ao exibir barras de referência.
 */
export async function GET() {
  try {
    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!snap.exists) {
      return NextResponse.json({
        source: 'default',
        bioLimitOverrides: {},
      });
    }
    const data = snap.data();
    const rawOv = data?.bioLimitOverrides;
    const bioLimitOverrides =
      rawOv && typeof rawOv === 'object' && !Array.isArray(rawOv) ? (rawOv as Record<string, unknown>) : {};
    return NextResponse.json({
      source: 'firestore',
      bioLimitOverrides,
      updatedAt: data?.updatedAt?.toMillis?.() ?? data?.updatedAt ?? null,
    });
  } catch (e) {
    console.error('[bio-impedancia-config GET]', e);
    return NextResponse.json(
      {
        source: 'default',
        bioLimitOverrides: {},
        warning: 'Firestore indisponível; usando apenas JSON base.',
      },
      { status: 200 }
    );
  }
}
