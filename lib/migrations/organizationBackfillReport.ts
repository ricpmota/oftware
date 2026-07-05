import type {
  MigrationCollectionDiagnosis,
  MigrationCollectionExecuteResult,
  MigrationDiagnosisReport,
  MigrationDryRunReport,
  MigrationExecuteReport,
} from '@/lib/migrations/types';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { ORGANIZATION_BACKFILL_MIGRATION_ID } from '@/lib/migrations/organizationBackfillCollections';

export function sumDiagnosisCollections(collections: MigrationCollectionDiagnosis[]) {
  return collections.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      withOrganizationId: acc.withOrganizationId + row.withOrganizationId,
      withoutOrganizationId: acc.withoutOrganizationId + row.withoutOrganizationId,
      withTargetOrganizationId: acc.withTargetOrganizationId + row.withTargetOrganizationId,
      withOtherOrganizationId: acc.withOtherOrganizationId + row.withOtherOrganizationId,
    }),
    {
      total: 0,
      withOrganizationId: 0,
      withoutOrganizationId: 0,
      withTargetOrganizationId: 0,
      withOtherOrganizationId: 0,
    },
  );
}

export function buildDiagnosisReport(params: {
  organizationId: OrganizationId;
  startedAt: Date;
  finishedAt: Date;
  collections: MigrationCollectionDiagnosis[];
}): MigrationDiagnosisReport {
  const durationMs = params.finishedAt.getTime() - params.startedAt.getTime();
  return {
    migrationId: ORGANIZATION_BACKFILL_MIGRATION_ID,
    mode: 'diagnose',
    organizationId: params.organizationId,
    startedAt: params.startedAt.toISOString(),
    finishedAt: params.finishedAt.toISOString(),
    durationMs,
    collections: params.collections,
    totals: sumDiagnosisCollections(params.collections),
  };
}

export function buildDryRunReport(params: {
  organizationId: OrganizationId;
  startedAt: Date;
  finishedAt: Date;
  collections: MigrationCollectionDiagnosis[];
}): MigrationDryRunReport {
  const durationMs = params.finishedAt.getTime() - params.startedAt.getTime();
  const totals = sumDiagnosisCollections(params.collections);
  const wouldUpdate = totals.withoutOrganizationId;

  return {
    migrationId: ORGANIZATION_BACKFILL_MIGRATION_ID,
    mode: 'dry-run',
    organizationId: params.organizationId,
    startedAt: params.startedAt.toISOString(),
    finishedAt: params.finishedAt.toISOString(),
    durationMs,
    collections: params.collections.map((row) => ({
      ...row,
      wouldUpdate: row.withoutOrganizationId,
    })),
    totals: {
      total: totals.total,
      withOrganizationId: totals.withOrganizationId,
      withoutOrganizationId: totals.withoutOrganizationId,
      wouldUpdate,
    },
    message: `Seriam atualizados ${wouldUpdate} documentos`,
  };
}

export function buildExecuteReport(params: {
  organizationId: OrganizationId;
  startedAt: Date;
  finishedAt: Date;
  collections: MigrationCollectionExecuteResult[];
}): MigrationExecuteReport {
  const durationMs = params.finishedAt.getTime() - params.startedAt.getTime();
  const totals = params.collections.reduce(
    (acc, row) => ({
      documentsUpdated: acc.documentsUpdated + row.documentsUpdated,
      documentsIgnored: acc.documentsIgnored + row.documentsIgnored,
      documentsWithOtherOrganizationId:
        acc.documentsWithOtherOrganizationId + row.documentsWithOtherOrganizationId,
      errors: acc.errors + row.errors.length,
    }),
    { documentsUpdated: 0, documentsIgnored: 0, documentsWithOtherOrganizationId: 0, errors: 0 },
  );

  return {
    migrationId: ORGANIZATION_BACKFILL_MIGRATION_ID,
    mode: 'execute',
    organizationId: params.organizationId,
    startedAt: params.startedAt.toISOString(),
    finishedAt: params.finishedAt.toISOString(),
    durationMs,
    collections: params.collections,
    totals,
  };
}

/** Formato legível para CLI / logs. */
export function formatDiagnosisReportForConsole(report: MigrationDiagnosisReport | MigrationDryRunReport): string {
  const lines: string[] = [];
  const header =
    report.mode === 'dry-run'
      ? `DRY RUN — ${report.migrationId} (organizationId: ${report.organizationId})`
      : `DIAGNÓSTICO — ${report.migrationId} (organizationId: ${report.organizationId})`;

  lines.push(header);
  lines.push('─'.repeat(56));

  for (const row of report.collections) {
    lines.push('');
    lines.push(row.collection);
    lines.push(`  Total:              ${row.total}`);
    lines.push(`  Com organizationId: ${row.withOrganizationId}`);
    lines.push(`  Sem organizationId: ${row.withoutOrganizationId}`);
    if (row.withOtherOrganizationId > 0) {
      lines.push(`  Outra organização:  ${row.withOtherOrganizationId}`);
    }
    if (report.mode === 'dry-run' && row.wouldUpdate != null) {
      lines.push(`  Seriam atualizados: ${row.wouldUpdate}`);
    }
  }

  lines.push('');
  lines.push('─'.repeat(56));
  lines.push(`Total geral:              ${report.totals.total}`);
  lines.push(`Com organizationId:     ${report.totals.withOrganizationId}`);
  lines.push(`Sem organizationId:     ${report.totals.withoutOrganizationId}`);

  if (report.mode === 'dry-run') {
    lines.push(`Seriam atualizados:     ${report.totals.wouldUpdate}`);
    lines.push('');
    lines.push(report.message);
  }

  lines.push(`Tempo: ${report.durationMs}ms`);
  return lines.join('\n');
}

export function formatExecuteReportForConsole(report: MigrationExecuteReport): string {
  const lines: string[] = [];
  lines.push(`MIGRAÇÃO — ${report.migrationId} (organizationId: ${report.organizationId})`);
  lines.push('─'.repeat(56));

  for (const row of report.collections) {
    lines.push('');
    lines.push(row.collection);
    lines.push(`  Atualizados: ${row.documentsUpdated}`);
    lines.push(`  Ignorados:   ${row.documentsIgnored}`);
    if (row.errors.length > 0) {
      lines.push(`  Erros:       ${row.errors.length}`);
    }
  }

  lines.push('');
  lines.push('─'.repeat(56));
  lines.push(`Atualizados: ${report.totals.documentsUpdated}`);
  lines.push(`Ignorados:   ${report.totals.documentsIgnored}`);
  lines.push(`Outra org:   ${report.totals.documentsWithOtherOrganizationId}`);
  lines.push(`Erros:       ${report.totals.errors}`);
  lines.push(`Tempo total: ${report.durationMs}ms`);
  return lines.join('\n');
}
