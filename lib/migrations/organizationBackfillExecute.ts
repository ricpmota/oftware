import type { Firestore } from 'firebase-admin/firestore';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { executeOrganizationBackfillOnCollection } from '@/lib/migrations/firestoreCollectionScan';
import { ORGANIZATION_BACKFILL_COLLECTIONS } from '@/lib/migrations/organizationBackfillCollections';
import { buildExecuteReport } from '@/lib/migrations/organizationBackfillReport';
import type { MigrationCollectionExecuteResult, MigrationExecuteReport } from '@/lib/migrations/types';

export type OrganizationBackfillExecuteOptions = {
  organizationId?: OrganizationId;
  collections?: readonly string[];
  /**
   * Quando true, apenas simula (equivalente ao dry-run por coleção).
   * Use false apenas após autorização explícita.
   */
  dryRun?: boolean;
};

/**
 * Parte 3 — Migração idempotente.
 *
 * ⚠️ NÃO invocar em produção nesta etapa sem autorização.
 * Atualiza somente documentos sem organizationId; nunca sobrescreve valor existente.
 */
export async function executeOrganizationBackfill(
  db: Firestore,
  options: OrganizationBackfillExecuteOptions = {},
): Promise<MigrationExecuteReport> {
  if (options.dryRun) {
    throw new Error(
      'executeOrganizationBackfill: use dryRunOrganizationBackfill() para simulação. ' +
        'Passe dryRun: false apenas quando autorizado a gravar.',
    );
  }

  const organizationId = options.organizationId ?? getDefaultOrganizationId();
  const collections = options.collections ?? ORGANIZATION_BACKFILL_COLLECTIONS;
  const startedAt = new Date();

  const collectionResults: MigrationCollectionExecuteResult[] = [];

  for (const collectionName of collections) {
    const result = await executeOrganizationBackfillOnCollection(db, collectionName, organizationId);

    collectionResults.push({
      collection: collectionName,
      documentsUpdated: result.documentsUpdated,
      documentsIgnored: result.documentsIgnored,
      documentsWithOtherOrganizationId: result.documentsWithOtherOrganizationId,
      errors: result.errors.map((e) => ({
        collection: collectionName,
        docId: e.docId,
        message: e.message,
      })),
      durationMs: result.durationMs,
    });
  }

  return buildExecuteReport({
    organizationId,
    startedAt,
    finishedAt: new Date(),
    collections: collectionResults,
  });
}
