import type { Firestore } from 'firebase-admin/firestore';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { scanCollectionOrganizationIdStats } from '@/lib/migrations/firestoreCollectionScan';
import { ORGANIZATION_BACKFILL_COLLECTIONS } from '@/lib/migrations/organizationBackfillCollections';
import { buildDryRunReport } from '@/lib/migrations/organizationBackfillReport';
import type { MigrationDryRunReport } from '@/lib/migrations/types';

export type OrganizationBackfillDryRunOptions = {
  organizationId?: OrganizationId;
  collections?: readonly string[];
};

/**
 * Parte 2 — Simulação: informa quantos documentos seriam atualizados, sem gravar.
 */
export async function dryRunOrganizationBackfill(
  db: Firestore,
  options: OrganizationBackfillDryRunOptions = {},
): Promise<MigrationDryRunReport> {
  const organizationId = options.organizationId ?? getDefaultOrganizationId();
  const collections = options.collections ?? ORGANIZATION_BACKFILL_COLLECTIONS;
  const startedAt = new Date();

  const rows = [];
  for (const collectionName of collections) {
    const row = await scanCollectionOrganizationIdStats(db, collectionName, organizationId);
    rows.push({
      ...row,
      wouldUpdate: row.withoutOrganizationId,
    });
  }

  return buildDryRunReport({
    organizationId,
    startedAt,
    finishedAt: new Date(),
    collections: rows,
  });
}
