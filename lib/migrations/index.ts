export type {
  MigrationCollectionDiagnosis,
  MigrationCollectionError,
  MigrationCollectionExecuteResult,
  MigrationDefinition,
  MigrationDiagnosisReport,
  MigrationDryRunReport,
  MigrationExecuteReport,
  MigrationMode,
  MigrationReport,
  OrganizationIdDocClass,
} from '@/lib/migrations/types';

export {
  ORGANIZATION_BACKFILL_COLLECTIONS,
  ORGANIZATION_BACKFILL_MIGRATION_ID,
  type OrganizationBackfillCollection,
} from '@/lib/migrations/organizationBackfillCollections';

export {
  classifyOrganizationIdField,
  isOrganizationBackfillCandidate,
  scanCollectionOrganizationIdStats,
  listOrganizationBackfillCandidates,
  batchSetOrganizationIdOnCandidates,
  executeOrganizationBackfillOnCollection,
} from '@/lib/migrations/firestoreCollectionScan';

export { diagnoseOrganizationBackfill } from '@/lib/migrations/organizationBackfillDiagnose';
export { dryRunOrganizationBackfill } from '@/lib/migrations/organizationBackfillDryRun';
export { executeOrganizationBackfill } from '@/lib/migrations/organizationBackfillExecute';

export {
  buildDiagnosisReport,
  buildDryRunReport,
  buildExecuteReport,
  formatDiagnosisReportForConsole,
  formatExecuteReportForConsole,
  sumDiagnosisCollections,
} from '@/lib/migrations/organizationBackfillReport';

export {
  MIGRATION_REGISTRY,
  ORGANIZATION_BACKFILL_DEFINITION,
  getMigrationDefinition,
  listRegisteredMigrations,
  type RegisteredMigrationId,
} from '@/lib/migrations/migrationRegistry';

export {
  ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE,
  isOrganizationBackfillConfirmationValid,
} from '@/lib/migrations/organizationBackfillConstants';
