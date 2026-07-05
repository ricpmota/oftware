import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { dryRunOrganizationBackfill } from '@/lib/migrations/organizationBackfillDryRun';
import { requireMetaAdminGeralMigration } from '@/lib/migrations/requireMetaAdminGeralMigration.server';

/** GET — simulação sem gravação (Parte 2). */
export async function GET(request: NextRequest) {
  const gate = await requireMetaAdminGeralMigration(request);
  if (!gate.ok) return gate.res;

  try {
    const report = await dryRunOrganizationBackfill(getFirestoreAdmin());
    return NextResponse.json(report);
  } catch (error) {
    console.error('[migrations/organization-backfill/dry-run]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro no dry-run do backfill' },
      { status: 500 },
    );
  }
}
