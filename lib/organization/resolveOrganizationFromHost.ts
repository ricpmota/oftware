import {
  getDefaultOrganization,
  getOrganizationById,
  listOrganizations,
} from './organizationRegistry';
import type { OrganizationDefinition, OrganizationId } from './organizationTypes';

/** Normaliza host HTTP (lowercase, sem porta). */
export function normalizeOrganizationHost(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.split(':')[0];
}

/**
 * Resolve Organização a partir do host da requisição.
 * Etapa 3: registry estático; alinha com METODO_SITE_HOSTS no middleware.
 */
export function resolveOrganizationFromHost(host: string | null | undefined): OrganizationDefinition | null {
  const normalized = normalizeOrganizationHost(host);
  if (!normalized) return null;

  for (const org of listOrganizations()) {
    if (org.hosts.includes(normalized)) return org;
  }

  return null;
}

/** Resolve por ID ou retorna organização padrão (Método). */
export function resolveOrganizationById(id: OrganizationId | null | undefined): OrganizationDefinition {
  if (id) {
    const found = getOrganizationById(id);
    if (found) return found;
  }
  return getDefaultOrganization();
}
