import type { Firestore } from 'firebase-admin/firestore';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { scanCollectionOrganizationIdStats } from '@/lib/migrations/firestoreCollectionScan';
import {
  ORGANIZATION_BACKFILL_COLLECTIONS,
} from '@/lib/migrations/organizationBackfillCollections';
import { buildDiagnosisReport } from '@/lib/migrations/organizationBackfillReport';
import type { MigrationDiagnosisReport } from '@/lib/migrations/types';

export type OrganizationBackfillDiagnoseOptions = {
  organizationId?: OrganizationId;
  /** Subconjunto de coleções (default: todas da Etapa 4). */
  collections?: readonly string[];
};

/**
 * Parte 1 — Diagnóstico somente leitura, coleção por coleção.
 */
export async function diagnoseOrganizationBackfill(
  db: Firestore,
  options: OrganizationBackfillDiagnoseOptions = {},
): Promise<MigrationDiagnosisReport> {
  const organizationId = options.organizationId ?? getDefaultOrganizationId();
  const collections = options.collections ?? ORGANIZATION_BACKFILL_COLLECTIONS;
  const startedAt = new Date();

  const rows = [];
  for (const collectionName of collections) {
    rows.push(await scanCollectionOrganizationIdStats(db, collectionName, organizationId));
  }

  return buildDiagnosisReport({
    organizationId,
    startedAt,
    finishedAt: new Date(),
    collections: rows,
  });
}
