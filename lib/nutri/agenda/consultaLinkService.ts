import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { NUTRI_CONSULTA_LINKS_COLLECTION } from '@/lib/nutri/agenda/agendaDefaults';
import { allocateUniquePublicLinkToken, normalizePublicLinkToken, isValidPublicLinkToken } from '@/lib/publicLinks/publicLinkToken';
import { buildOrganizacaoPublicUrl } from '@/lib/organization/organizationUrls';
import { nutritionistHasActivePatientLink } from '@/lib/nutri/ensureNutriCheckInPublicLink';
import type { NutriConsultaLink } from '@/types/nutriAgenda';

export const NUTRI_CONSULTA_PUBLIC_PATH = '/consulta-nutri';

function mapLink(token: string, data: FirebaseFirestore.DocumentData): NutriConsultaLink {
  const createdAt = data.createdAt?.toDate?.() instanceof Date ? data.createdAt.toDate().toISOString() : null;
  return {
    token,
    nutricionistaId: String(data.nutricionistaId || ''),
    pacienteId: String(data.pacienteId || ''),
    status: data.status === 'revoked' ? 'revoked' : 'active',
    createdAt,
  };
}

export function nutriConsultaPublicPath(token: string): string {
  return `${NUTRI_CONSULTA_PUBLIC_PATH}/${encodeURIComponent(token)}`;
}

export async function loadNutriConsultaLinkByToken(token: string): Promise<NutriConsultaLink | null> {
  const normalized = normalizePublicLinkToken(token);
  if (!isValidPublicLinkToken(normalized)) return null;
  const snap = await getFirestoreAdmin().collection(NUTRI_CONSULTA_LINKS_COLLECTION).doc(normalized).get();
  if (!snap.exists) return null;
  return mapLink(snap.id, snap.data()!);
}

/**
 * Gera ou reutiliza um link estável por nutricionista + paciente.
 */
export async function ensureNutriConsultaLink(
  db: Firestore,
  params: { nutricionistaId: string; pacienteId: string }
): Promise<{ token: string; url: string; created: boolean }> {
  const nutricionistaId = params.nutricionistaId.trim();
  const pacienteId = params.pacienteId.trim();
  if (!nutricionistaId || !pacienteId) {
    throw new Error('Nutricionista e paciente são obrigatórios.');
  }

  const existing = await db
    .collection(NUTRI_CONSULTA_LINKS_COLLECTION)
    .where('nutricionistaId', '==', nutricionistaId)
    .where('pacienteId', '==', pacienteId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!existing.empty) {
    const token = existing.docs[0].id;
    return {
      token,
      url: buildOrganizacaoPublicUrl(nutriConsultaPublicPath(token)),
      created: false,
    };
  }

  const payload = {
    nutricionistaId,
    pacienteId,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const token = await allocateUniquePublicLinkToken(db, NUTRI_CONSULTA_LINKS_COLLECTION, payload);
  return {
    token,
    url: buildOrganizacaoPublicUrl(nutriConsultaPublicPath(token)),
    created: true,
  };
}

export async function assertNutriConsultaAccess(
  nutricionistaId: string,
  pacienteId: string
): Promise<boolean> {
  return nutritionistHasActivePatientLink(getFirestoreAdmin(), nutricionistaId, pacienteId);
}
