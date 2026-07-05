import type { Firestore } from 'firebase-admin/firestore';
import { SOLICITACAO_STATUS } from '@/features/metaNutri/metaNutri.constants';
import { TEAM_MEMBER_COLLECTIONS, TEAM_SHARING_COLLECTIONS } from '@/lib/organization/organizationTeam';
import type { MigrationCollectionDiagnosis } from '@/lib/migrations/types';
import type { TeamAuditSummary, TeamMemberAuditRow } from '@/lib/platform-audit/types';
import { countDocumentsWhereFieldEquals } from '@/lib/platform-audit/firestorePaginate';

const TEAM_LABELS: Record<string, string> = {
  [TEAM_MEMBER_COLLECTIONS.medico]: 'Médicos',
  [TEAM_MEMBER_COLLECTIONS.nutricionista]: 'Nutricionistas',
  [TEAM_MEMBER_COLLECTIONS.personal]: 'Personal trainers',
};

function memberRowFromScan(
  collection: string,
  rows: MigrationCollectionDiagnosis[],
): TeamMemberAuditRow {
  const scan = rows.find((r) => r.collection === collection);
  return {
    collection,
    label: TEAM_LABELS[collection] ?? collection,
    total: scan?.total ?? 0,
    withoutOrganizationId: scan?.withoutOrganizationId ?? 0,
  };
}

export async function auditTeam(
  db: Firestore,
  organizationCollectionRows: MigrationCollectionDiagnosis[],
): Promise<TeamAuditSummary> {
  const started = Date.now();

  const memberCollections = [
    TEAM_MEMBER_COLLECTIONS.medico,
    TEAM_MEMBER_COLLECTIONS.nutricionista,
    TEAM_MEMBER_COLLECTIONS.personal,
  ] as const;

  const members = memberCollections.map((c) => memberRowFromScan(c, organizationCollectionRows));
  const professionalsWithoutOrganizationId = members.reduce(
    (sum, m) => sum + m.withoutOrganizationId,
    0,
  );

  const [medicoNutriVinculos, medicoPersonalVinculos] = await Promise.all([
    countDocumentsWhereFieldEquals(
      db,
      TEAM_SHARING_COLLECTIONS.vinculoNutriMedico,
      'status',
      SOLICITACAO_STATUS.ACEITA,
    ),
    countDocumentsWhereFieldEquals(
      db,
      TEAM_SHARING_COLLECTIONS.vinculoPersonalMedico,
      'status',
      SOLICITACAO_STATUS.ACEITA,
    ),
  ]);

  return {
    members,
    professionalsWithoutOrganizationId,
    medicoNutriVinculos,
    medicoPersonalVinculos,
    durationMs: Date.now() - started,
  };
}
