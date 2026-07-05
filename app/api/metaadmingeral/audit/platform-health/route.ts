import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { runPlatformHealthAudit } from '@/lib/platform-audit/runPlatformHealthAudit';
import { requireMetaAdminGeralMigration } from '@/lib/migrations/requireMetaAdminGeralMigration.server';

/** GET — auditoria da plataforma (somente leitura). */
export async function GET(request: NextRequest) {
  const gate = await requireMetaAdminGeralMigration(request);
  if (!gate.ok) return gate.res;

  try {
    const report = await runPlatformHealthAudit(getFirestoreAdmin());
    return NextResponse.json(report);
  } catch (error) {
    console.error('[audit/platform-health]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao auditar plataforma' },
      { status: 500 },
    );
  }
}
