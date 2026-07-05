/**
 * Organization Backfill — ponto de entrada da migração Etapa 6.
 *
 * - diagnoseOrganizationBackfill() — Parte 1 (leitura)
 * - dryRunOrganizationBackfill()     — Parte 2 (simulação)
 * - executeOrganizationBackfill()    — Parte 3 (gravar — só após autorização)
 */
export {
  diagnoseOrganizationBackfill,
  type OrganizationBackfillDiagnoseOptions,
} from '@/lib/migrations/organizationBackfillDiagnose';

export {
  dryRunOrganizationBackfill,
  type OrganizationBackfillDryRunOptions,
} from '@/lib/migrations/organizationBackfillDryRun';

export {
  executeOrganizationBackfill,
  type OrganizationBackfillExecuteOptions,
} from '@/lib/migrations/organizationBackfillExecute';

export {
  buildDiagnosisReport,
  buildDryRunReport,
  buildExecuteReport,
  formatDiagnosisReportForConsole,
  formatExecuteReportForConsole,
} from '@/lib/migrations/organizationBackfillReport';

export {
  ORGANIZATION_BACKFILL_COLLECTIONS,
  ORGANIZATION_BACKFILL_MIGRATION_ID,
} from '@/lib/migrations/organizationBackfillCollections';

export {
  ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE,
  isOrganizationBackfillConfirmationValid,
} from '@/lib/migrations/organizationBackfillConstants';

export {
  MIGRATION_REGISTRY,
  ORGANIZATION_BACKFILL_DEFINITION,
} from '@/lib/migrations/migrationRegistry';
