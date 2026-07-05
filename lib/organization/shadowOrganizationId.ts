import { METODO_ORGANIZATION_ID } from './organizationRegistry';
import type { OrganizationId } from './organizationTypes';

/**
 * Etapa 4 — shadow: ID da organização para novos documentos.
 * Hoje só existe o Método; leituras ainda não filtram por este campo.
 */
export function getDefaultOrganizationId(): OrganizationId {
  return METODO_ORGANIZATION_ID;
}

/** Campos a incluir em creates shadow (sem alterar queries/rules). */
export function shadowOrganizationFields(): { organizationId: OrganizationId } {
  return { organizationId: getDefaultOrganizationId() };
}
