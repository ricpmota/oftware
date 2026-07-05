import { describe, expect, it } from 'vitest';
import { buildOrganizationAuditSummary } from '@/lib/platform-audit/auditOrganization';
import type { MigrationDiagnosisReport } from '@/lib/migrations/types';

describe('buildOrganizationAuditSummary', () => {
  it('calcula cobertura percentual da organização alvo', () => {
    const report: MigrationDiagnosisReport = {
      migrationId: 'organization-backfill',
      mode: 'diagnose',
      organizationId: 'metodo',
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:00:01.000Z',
      durationMs: 1000,
      collections: [],
      totals: {
        total: 200,
        withOrganizationId: 50,
        withoutOrganizationId: 150,
        withTargetOrganizationId: 40,
        withOtherOrganizationId: 10,
      },
    };

    const summary = buildOrganizationAuditSummary(report);
    expect(summary.coveragePercent).toBe(20);
    expect(summary.withOtherOrganizationId).toBe(10);
    expect(summary.withoutOrganizationId).toBe(150);
  });
});
