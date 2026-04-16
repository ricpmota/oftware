import { NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getDefaultLabOrderBySection } from '@/lib/labExames/validateLabOrderBySection';

export const dynamic = 'force-dynamic';

const COLLECTION = 'platformSettings';
const DOC_ID = 'labExames';

/**
 * Leitura pública da ordem dos exames por sistema (sem auth).
 * Usada por /metaadmin e /metanutri para refletir o que o Admin Geral salvou no Firestore.
 */
export async function GET() {
  try {
    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!snap.exists) {
      return NextResponse.json({
        source: 'default',
        labOrderBySection: getDefaultLabOrderBySection(),
        labLimitOverrides: {},
      });
    }
    const data = snap.data();
    const order = data?.labOrderBySection;
    const rawOv = data?.labLimitOverrides;
    const labLimitOverrides =
      rawOv && typeof rawOv === 'object' && !Array.isArray(rawOv) ? (rawOv as Record<string, unknown>) : {};
    if (order && typeof order === 'object' && !Array.isArray(order)) {
      return NextResponse.json({
        source: 'firestore',
        labOrderBySection: order as Record<string, string[]>,
        labLimitOverrides,
        updatedAt: data?.updatedAt?.toMillis?.() ?? data?.updatedAt ?? null,
      });
    }
    return NextResponse.json({
      source: 'default',
      labOrderBySection: getDefaultLabOrderBySection(),
      labLimitOverrides,
    });
  } catch (e) {
    console.error('[lab-exames-config GET]', e);
    return NextResponse.json(
      {
        source: 'default',
        labOrderBySection: getDefaultLabOrderBySection(),
        labLimitOverrides: {},
        warning: 'Firestore indisponível; usando ordem padrão do código.',
      },
      { status: 200 }
    );
  }
}
