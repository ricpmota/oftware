import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { PERSONAL_CONSULTA_LINKS_COLLECTION } from '@/lib/personal/agenda/agendaDefaults';
import { allocateUniquePublicLinkToken, normalizePublicLinkToken, isValidPublicLinkToken } from '@/lib/publicLinks/publicLinkToken';
import { buildOrganizacaoPublicUrl } from '@/lib/organization/organizationUrls';
import { personalTrainerHasActivePatientLink } from '@/lib/personal/personalTrainerHasActivePatientLink';
import type { PersonalConsultaLink } from '@/types/personalAgenda';

export const PERSONAL_CONSULTA_PUBLIC_PATH = '/consulta-personal';

function mapLink(token: string, data: FirebaseFirestore.DocumentData): PersonalConsultaLink {
  const createdAt = data.createdAt?.toDate?.() instanceof Date ? data.createdAt.toDate().toISOString() : null;
  return {
    token,
    personalTrainerId: String(data.personalTrainerId || ''),
    pacienteId: String(data.pacienteId || ''),
    status: data.status === 'revoked' ? 'revoked' : 'active',
    createdAt,
  };
}

export function personalConsultaPublicPath(token: string): string {
  return `${PERSONAL_CONSULTA_PUBLIC_PATH}/${encodeURIComponent(token)}`;
}

export async function loadPersonalConsultaLinkByToken(token: string): Promise<PersonalConsultaLink | null> {
  const normalized = normalizePublicLinkToken(token);
  if (!isValidPublicLinkToken(normalized)) return null;
  const snap = await getFirestoreAdmin().collection(PERSONAL_CONSULTA_LINKS_COLLECTION).doc(normalized).get();
  if (!snap.exists) return null;
  return mapLink(snap.id, snap.data()!);
}

/**
 * Gera ou reutiliza um link estável por personal + paciente.
 */
export async function ensurePersonalConsultaLink(
  db: Firestore,
  params: { personalTrainerId: string; pacienteId: string }
): Promise<{ token: string; url: string; created: boolean }> {
  const personalTrainerId = params.personalTrainerId.trim();
  const pacienteId = params.pacienteId.trim();
  if (!personalTrainerId || !pacienteId) {
    throw new Error('Personal e paciente são obrigatórios.');
  }

  const existing = await db
    .collection(PERSONAL_CONSULTA_LINKS_COLLECTION)
    .where('personalTrainerId', '==', personalTrainerId)
    .where('pacienteId', '==', pacienteId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!existing.empty) {
    const token = existing.docs[0].id;
    return {
      token,
      url: buildOrganizacaoPublicUrl(personalConsultaPublicPath(token)),
      created: false,
    };
  }

  const payload = {
    personalTrainerId,
    pacienteId,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const token = await allocateUniquePublicLinkToken(db, PERSONAL_CONSULTA_LINKS_COLLECTION, payload);
  return {
    token,
    url: buildOrganizacaoPublicUrl(personalConsultaPublicPath(token)),
    created: true,
  };
}

export async function assertPersonalConsultaAccess(
  personalTrainerId: string,
  pacienteId: string
): Promise<boolean> {
  return personalTrainerHasActivePatientLink(getFirestoreAdmin(), personalTrainerId, pacienteId);
}
