import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { diagnoseOrganizationBackfill } from '@/lib/migrations/organizationBackfillDiagnose';
import { requireMetaAdminGeralMigration } from '@/lib/migrations/requireMetaAdminGeralMigration.server';

/** GET — diagnóstico somente leitura (Parte 1). */
export async function GET(request: NextRequest) {
  const gate = await requireMetaAdminGeralMigration(request);
  if (!gate.ok) return gate.res;

  try {
    const report = await diagnoseOrganizationBackfill(getFirestoreAdmin());
    return NextResponse.json(report);
  } catch (error) {
    console.error('[migrations/organization-backfill/diagnose]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao diagnosticar backfill' },
      { status: 500 },
    );
  }
}
