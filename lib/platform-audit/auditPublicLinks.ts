import type { Firestore } from 'firebase-admin/firestore';
import type { PublicLinksAuditSummary } from '@/lib/platform-audit/types';
import type { MigrationCollectionDiagnosis } from '@/lib/migrations/types';

const PUBLIC_LINK_COLLECTIONS = [
  'aplicacao_links',
  'conclusao_links',
  'relatorio_paciente_links',
] as const;

export function buildPublicLinksAuditFromOrganizationScan(
  collectionRows: MigrationCollectionDiagnosis[],
): PublicLinksAuditSummary {
  const rows = PUBLIC_LINK_COLLECTIONS.map((name) => {
    const row = collectionRows.find((c) => c.collection === name);
    return {
      collection: name,
      total: row?.total ?? 0,
      withoutOrganizationId: row?.withoutOrganizationId ?? 0,
    };
  });

  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const withoutOrganizationId = rows.reduce((sum, r) => sum + r.withoutOrganizationId, 0);

  return { collections: rows, total, withoutOrganizationId };
}

/** Fallback se organization scan não incluir links. */
export async function auditPublicLinks(
  db: Firestore,
  organizationId: string,
): Promise<PublicLinksAuditSummary> {
  const { scanCollectionOrganizationIdStats } = await import('@/lib/migrations/firestoreCollectionScan');
  const rows = [];
  for (const name of PUBLIC_LINK_COLLECTIONS) {
    const stats = await scanCollectionOrganizationIdStats(db, name, organizationId);
    rows.push({
      collection: name,
      total: stats.total,
      withoutOrganizationId: stats.withoutOrganizationId,
    });
  }
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const withoutOrganizationId = rows.reduce((sum, r) => sum + r.withoutOrganizationId, 0);
  return { collections: rows, total, withoutOrganizationId };
}

export { PUBLIC_LINK_COLLECTIONS };
