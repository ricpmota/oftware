import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { executeOrganizationBackfill } from '@/lib/migrations/organizationBackfillExecute';
import {
  isOrganizationBackfillConfirmationValid,
  ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE,
} from '@/lib/migrations/organizationBackfillConstants';
import { requireMetaAdminGeralMigration } from '@/lib/migrations/requireMetaAdminGeralMigration.server';

/** Backfill de ~2k docs — margem para leitura + batches Firestore. */
export const maxDuration = 300;

type ExecuteRequestBody = {
  confirmation?: unknown;
};

/**
 * POST — executa Organization Backfill após confirmação explícita.
 * Dry-run deve ser feito na UI antes (GET /dry-run); não repetimos aqui para evitar timeout.
 */
export async function POST(request: NextRequest) {
  const gate = await requireMetaAdminGeralMigration(request);
  if (!gate.ok) return gate.res;

  let body: ExecuteRequestBody = {};
  try {
    body = (await request.json()) as ExecuteRequestBody;
  } catch {
    return NextResponse.json({ error: 'Corpo JSON inválido.' }, { status: 400 });
  }

  if (!isOrganizationBackfillConfirmationValid(body.confirmation)) {
    return NextResponse.json(
      {
        error: `Confirmação inválida. Digite exatamente: ${ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE}`,
      },
      { status: 400 },
    );
  }

  try {
    const report = await executeOrganizationBackfill(getFirestoreAdmin(), { dryRun: false });

    if (report.totals.documentsUpdated === 0) {
      return NextResponse.json({
        report,
        message: 'Nenhum documento pendente de backfill.',
      });
    }

    return NextResponse.json({
      report,
      message: `Backfill concluído: ${report.totals.documentsUpdated} documentos atualizados.`,
    });
  } catch (error) {
    console.error('[migrations/organization-backfill/execute]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao executar backfill' },
      { status: 500 },
    );
  }
}
