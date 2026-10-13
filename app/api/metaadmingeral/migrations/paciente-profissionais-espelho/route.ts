import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMetaAdminGeralMigration } from '@/lib/migrations/requireMetaAdminGeralMigration.server';
import { backfillPacienteProfissionaisEspelho } from '@/lib/paciente/backfillPacienteProfissionaisEspelho.server';

export const maxDuration = 300;

/**
 * POST /api/metaadmingeral/migrations/paciente-profissionais-espelho
 * Body: { dryRun?: boolean }
 *
 * Preenche pacientes_completos.nutricionistaVinculadoIds e
 * pacientes_completos.personalTrainerVinculadoIds a partir dos vínculos ativos.
 */
export async function POST(request: NextRequest) {
  const gate = await requireMetaAdminGeralMigration(request);
  if (!gate.ok) return gate.res;

  let dryRun = false;
  try {
    const body = (await request.json().catch(() => ({}))) as { dryRun?: unknown };
    dryRun = body.dryRun === true;
  } catch {
    dryRun = false;
  }

  try {
    const report = await backfillPacienteProfissionaisEspelho(getFirestoreAdmin(), { dryRun });
    return NextResponse.json({
      ok: true,
      report,
      message: dryRun
        ? `Dry-run: ${report.pacientesAtualizados} pacientes seriam atualizados.`
        : `Backfill concluído: ${report.pacientesAtualizados} pacientes atualizados.`,
    });
  } catch (error) {
    console.error('[migrations/paciente-profissionais-espelho]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro no backfill' },
      { status: 500 }
    );
  }
}
