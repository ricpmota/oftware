import type { MigrationDiagnosisReport } from '@/lib/migrations/types';
import type { OrganizationAuditSummary } from '@/lib/platform-audit/types';

export function buildOrganizationAuditSummary(
  report: MigrationDiagnosisReport,
): OrganizationAuditSummary {
  const { totals, organizationId, collections } = report;
  const coveragePercent =
    totals.total > 0
      ? Math.round((totals.withTargetOrganizationId / totals.total) * 1000) / 10
      : 100;

  return {
    organizationId,
    totalDocuments: totals.total,
    withOrganizationId: totals.withOrganizationId,
    withoutOrganizationId: totals.withoutOrganizationId,
    withTargetOrganizationId: totals.withTargetOrganizationId,
    withOtherOrganizationId: totals.withOtherOrganizationId,
    coveragePercent,
    collections,
  };
}
