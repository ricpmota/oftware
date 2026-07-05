import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { isMetodoOrganizationMember } from '@/lib/organization/isMetodoOrganizationMember';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { buildWhatsappSessionId } from '@/services/whatsappConnectionService';

export function resolveMedicoOrganizationId(
  data: Record<string, unknown> | undefined,
): OrganizationId | undefined {
  if (!data) return undefined;

  const member = isMetodoOrganizationMember({
    organizationId: typeof data.organizationId === 'string' ? data.organizationId : null,
    metodoImagensAtivo: data.metodoImagensAtivo === true,
  });

  if (!member) return undefined;

  const orgId =
    (typeof data.organizationId === 'string' ? data.organizationId.trim() : '') || METODO_ORGANIZATION_ID;
  return orgId as OrganizationId;
}

export type WhatsappMedicoContext = {
  doctorId: string;
  organizationId?: string;
  sessionId: string;
};

/** Contexto do médico para sessão WhatsApp central (white label). */
export async function getWhatsappMedicoContext(doctorId: string): Promise<WhatsappMedicoContext> {
  const id = doctorId?.trim();
  if (!id) throw new Error('doctorId é obrigatório.');

  const medSnap = await getFirestoreAdmin().collection('medicos').doc(id).get();
  const organizationId = resolveMedicoOrganizationId(medSnap.data() as Record<string, unknown>);

  return {
    doctorId: id,
    organizationId,
    sessionId: buildWhatsappSessionId(id, organizationId),
  };
}
