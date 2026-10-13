import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  parseOrganizationPublicBranding,
  type OrganizationPublicBranding,
} from '@/lib/whiteLabel/organizationPublicIdentity';
import { isDemoOrganization } from './isDemoOrganization';
import { parseOrganizationDefinition } from './parseOrganizationDefinition';
import { METODO_ORGANIZATION_ID } from './organizationRegistry';

/**
 * Lê `organizations/{id}.branding` para páginas públicas de organização diferente do Método.
 * O id vem do documento do médico no servidor. Falha, org inexistente ou demo retornam `null` (neutro).
 */
export async function loadOrganizationPublicBranding(
  organizationId: string,
): Promise<OrganizationPublicBranding | null> {
  const id = (organizationId || '').trim();
  if (!id || id === METODO_ORGANIZATION_ID) return null;

  try {
    const snap = await getFirestoreAdmin().collection('organizations').doc(id).get();
    if (!snap.exists) return null;
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const definition = parseOrganizationDefinition(snap.id, data);
    if (!definition || isDemoOrganization(definition)) return null;
    return parseOrganizationPublicBranding(id, data.branding);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[public-pages] Falha ao ler organizations/{id}.branding — identidade neutra', id, error);
    }
    return null;
  }
}
