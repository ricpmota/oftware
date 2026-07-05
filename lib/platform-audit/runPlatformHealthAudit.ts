import type { Firestore } from 'firebase-admin/firestore';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import { diagnoseOrganizationBackfill } from '@/lib/migrations/organizationBackfillDiagnose';
import { buildOrganizationAuditSummary } from '@/lib/platform-audit/auditOrganization';
import { auditPatients } from '@/lib/platform-audit/auditPatients';
import { auditTeam } from '@/lib/platform-audit/auditTeam';
import { buildPublicLinksAuditFromOrganizationScan } from '@/lib/platform-audit/auditPublicLinks';
import type { PlatformHealthReport } from '@/lib/platform-audit/types';

/**
 * Auditoria v1 — somente leitura, agrega saúde da plataforma Oftware 2.0.
 */
export async function runPlatformHealthAudit(db: Firestore): Promise<PlatformHealthReport> {
  const started = Date.now();
  const organizationId = getDefaultOrganizationId();

  const orgDiagnosis = await diagnoseOrganizationBackfill(db, { organizationId });
  const organization = buildOrganizationAuditSummary(orgDiagnosis);

  const [patients, team] = await Promise.all([
    auditPatients(db),
    auditTeam(db, orgDiagnosis.collections),
  ]);

  const publicLinks = buildPublicLinksAuditFromOrganizationScan(orgDiagnosis.collections);

  return {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    organizationId,
    organization,
    patients,
    team,
    publicLinks,
  };
}
