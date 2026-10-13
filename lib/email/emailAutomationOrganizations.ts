import {
  listOrganizations,
  organizationExists,
} from '@/lib/organization/organizationRegistry';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import { listEmailAutomationEngineSettings } from '@/services/emailAutomationEngineService';

/**
 * Fonte de verdade para organizações no cron de e-mail automático (leads médico):
 * 1. `organizationRegistry` — orgs ativas da plataforma com capacidade de automação;
 * 2. `automation_email_engine` — orgs com governança explícita de engine;
 * 3. org default (`metodo`) — sempre incluída para compatibilidade.
 *
 * Não varre leads nem Auth — apenas metadados leves.
 */
export async function listEmailAutomationOrganizations(): Promise<OrganizationId[]> {
  const ids = new Set<OrganizationId>();

  ids.add(getDefaultOrganizationId());

  for (const org of listOrganizations()) {
    ids.add(org.id);
  }

  const engineSettings = await listEmailAutomationEngineSettings();
  for (const setting of engineSettings) {
    if (organizationExists(setting.organizationId as OrganizationId)) {
      ids.add(setting.organizationId as OrganizationId);
    }
  }

  return [...ids].sort();
}

type AuthUserLike = {
  uid: string;
  customClaims?: Record<string, unknown> | null;
};

/**
 * Resolve a organização de um lead (Auth user).
 * Hoje: custom claim `organizationId` quando presente; senão default `metodo`.
 */
export function resolveLeadOrganizationIdFromAuthUser(user: AuthUserLike): OrganizationId {
  const raw = user.customClaims?.organizationId;
  if (typeof raw === 'string' && organizationExists(raw as OrganizationId)) {
    return raw as OrganizationId;
  }
  return getDefaultOrganizationId();
}

export function leadBelongsToOrganization(user: AuthUserLike, organizationId: string): boolean {
  return resolveLeadOrganizationIdFromAuthUser(user) === organizationId;
}
