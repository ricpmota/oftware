import { NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getDefaultLabOrderBySection } from '@/lib/labExames/validateLabOrderBySection';
import {
  catalogLimitOverridesFromDoc,
  customExamsToLimitOverrides,
  extraSectionLabelsFromCustomExams,
  normalizeLabCustomExams,
} from '@/lib/labExames/labCustomExams';

export const dynamic = 'force-dynamic';

const COLLECTION = 'platformSettings';
const DOC_ID = 'labExames';

/**
 * Leitura pública da ordem dos exames por sistema (sem auth).
 * Usada por /metaadmin e /metanutri para refletir o que o Admin Geral salvou no Firestore.
 * Exames criados por médicos (habilitados) entram em labCustomExams + overrides.
 */
export async function GET() {
  const empty = {
    source: 'default' as const,
    labOrderBySection: getDefaultLabOrderBySection(),
    labLimitOverrides: {},
    labCustomExams: [],
    labSectionLabels: {},
  };
  try {
    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!snap.exists) {
      return NextResponse.json(empty);
    }
    const data = snap.data();
    const catalogOverrides = catalogLimitOverridesFromDoc(data?.labLimitOverrides);
    const enabledCustoms = normalizeLabCustomExams(data?.labCustomExams).filter((e) => e.enabled);
    const order = data?.labOrderBySection;
    const catalogOrder =
      order && typeof order === 'object' && !Array.isArray(order)
        ? (order as Record<string, string[]>)
        : getDefaultLabOrderBySection();
    return NextResponse.json({
      source: 'firestore',
      labOrderBySection: catalogOrder,
      labLimitOverrides: { ...catalogOverrides, ...customExamsToLimitOverrides(enabledCustoms) },
      labCustomExams: enabledCustoms,
      labSectionLabels: extraSectionLabelsFromCustomExams(enabledCustoms),
      updatedAt: data?.updatedAt?.toMillis?.() ?? data?.updatedAt ?? null,
    });
  } catch (e) {
    console.error('[lab-exames-config GET]', e);
    return NextResponse.json(
      {
        ...empty,
        warning: 'Firestore indisponível; usando ordem padrão do código.',
      },
      { status: 200 }
    );
  }
}
