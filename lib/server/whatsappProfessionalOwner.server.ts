import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';
import {
  getWhatsappMedicoContext,
  resolveMedicoOrganizationId,
  type WhatsappMedicoContext,
} from '@/lib/server/whatsappMedicoContext.server';
import { buildWhatsappSessionId } from '@/services/whatsappConnectionService';

export type WhatsappProfessionalRole = 'nutricionista' | 'personal_trainer';

export type WhatsappOwnerResolution = WhatsappMedicoContext & {
  uid: string;
  /** True quando o Auth UID também é médico no metaadmin — mesma conexão/número. */
  sharedWithMedico: boolean;
  source: 'medico' | 'nutricionista' | 'personal_trainer';
};

/**
 * Resolve o dono da conexão WhatsApp para nutri/personal.
 * Se o mesmo login (Auth UID) existir como médico, reutiliza a conexão do médico
 * (mesmo número). Caso contrário, usa o doc do profissional (id = uid).
 */
export async function resolveWhatsappOwnerForProfessional(
  uid: string,
  role: WhatsappProfessionalRole,
): Promise<WhatsappOwnerResolution | null> {
  const authUid = uid?.trim();
  if (!authUid) return null;

  const db = getFirestoreAdmin();

  const medSnap = await db.collection('medicos').where('userId', '==', authUid).limit(1).get();
  if (!medSnap.empty) {
    const medicoDocId = medSnap.docs[0].id;
    const ctx = await getWhatsappMedicoContext(medicoDocId);
    return {
      ...ctx,
      uid: authUid,
      sharedWithMedico: true,
      source: 'medico',
    };
  }

  if (role === 'nutricionista') {
    const snap = await db.collection(COL_NUTRICIONISTAS).doc(authUid).get();
    if (!snap.exists) return null;
    const organizationId = resolveMedicoOrganizationId(snap.data() as Record<string, unknown>);
    return {
      doctorId: authUid,
      organizationId,
      sessionId: buildWhatsappSessionId(authUid, organizationId),
      uid: authUid,
      sharedWithMedico: false,
      source: 'nutricionista',
    };
  }

  const snap = await db.collection(COL_PERSONAL_TRAINERS).doc(authUid).get();
  if (!snap.exists) return null;
  const organizationId = resolveMedicoOrganizationId(snap.data() as Record<string, unknown>);
  return {
    doctorId: authUid,
    organizationId,
    sessionId: buildWhatsappSessionId(authUid, organizationId),
    uid: authUid,
    sharedWithMedico: false,
    source: 'personal_trainer',
  };
}
