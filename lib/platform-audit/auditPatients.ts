import type { Firestore } from 'firebase-admin/firestore';
import type { PatientsAuditSummary } from '@/lib/platform-audit/types';
import { loadDocumentIdSet, paginateCollection } from '@/lib/platform-audit/firestorePaginate';
import { TEAM_MEMBER_COLLECTIONS } from '@/lib/organization/organizationTeam';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function auditPatients(db: Firestore): Promise<PatientsAuditSummary> {
  const started = Date.now();
  const medicoIds = await loadDocumentIdSet(db, TEAM_MEMBER_COLLECTIONS.medico);

  let total = 0;
  let withoutMedicoResponsavelId = 0;
  let withValidMedicoResponsavelId = 0;
  let withInvalidMedicoResponsavelId = 0;
  let withoutUserId = 0;

  await paginateCollection(db, 'pacientes_completos', (doc) => {
    total += 1;
    const data = doc.data();

    const medicoId = data.medicoResponsavelId;
    if (medicoId == null || (typeof medicoId === 'string' && !medicoId.trim())) {
      withoutMedicoResponsavelId += 1;
    } else if (medicoIds.has(String(medicoId))) {
      withValidMedicoResponsavelId += 1;
    } else {
      withInvalidMedicoResponsavelId += 1;
    }

    if (!isNonEmptyString(data.userId)) {
      withoutUserId += 1;
    }
  });

  return {
    total,
    withoutMedicoResponsavelId,
    withValidMedicoResponsavelId,
    withInvalidMedicoResponsavelId,
    withoutUserId,
    durationMs: Date.now() - started,
  };
}
