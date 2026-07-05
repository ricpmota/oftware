import type { MigrationDefinition } from '@/lib/migrations/types';
import {
  ORGANIZATION_BACKFILL_COLLECTIONS,
  ORGANIZATION_BACKFILL_MIGRATION_ID,
} from '@/lib/migrations/organizationBackfillCollections';
import { diagnoseOrganizationBackfill } from '@/lib/migrations/organizationBackfillDiagnose';
import { dryRunOrganizationBackfill } from '@/lib/migrations/organizationBackfillDryRun';
import { executeOrganizationBackfill } from '@/lib/migrations/organizationBackfillExecute';

export const ORGANIZATION_BACKFILL_DEFINITION: MigrationDefinition = {
  id: ORGANIZATION_BACKFILL_MIGRATION_ID,
  title: 'Organization Backfill',
  description:
    'Preenche organizationId: "metodo" em documentos legados das coleções da Organização Método. Idempotente.',
  magPath: ['Ferramentas', 'Migrações', 'Organization Backfill'],
  collections: ORGANIZATION_BACKFILL_COLLECTIONS,
};

/** Registry para futura UI MetaAdminGeral → Ferramentas → Migrações. */
export const MIGRATION_REGISTRY = {
  [ORGANIZATION_BACKFILL_MIGRATION_ID]: {
    definition: ORGANIZATION_BACKFILL_DEFINITION,
    diagnose: diagnoseOrganizationBackfill,
    dryRun: dryRunOrganizationBackfill,
    execute: executeOrganizationBackfill,
  },
} as const;

export type RegisteredMigrationId = keyof typeof MIGRATION_REGISTRY;

export function getMigrationDefinition(id: RegisteredMigrationId): MigrationDefinition {
  return MIGRATION_REGISTRY[id].definition;
}

export function listRegisteredMigrations(): MigrationDefinition[] {
  return Object.values(MIGRATION_REGISTRY).map((entry) => entry.definition);
}
