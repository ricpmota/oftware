import type { ActiveOrganizationContext, OrganizationDefinition, OrganizationId } from './organizationTypes';

/** ID canônico da primeira organização da plataforma. */
export const METODO_ORGANIZATION_ID = 'metodo' as const;

/** Organização white label de exemplo (registry estático). */
export const CLINICA_EXEMPLO_WL_ID = 'clinica_exemplo_wl' as const;

/** Organização inicial — Método Emagrecer (registry estático, Etapa 3). */
export const METODO_ORGANIZATION: OrganizationDefinition = {
  id: METODO_ORGANIZATION_ID,
  name: 'Método Emagrecer',
  kind: 'organization',
  primaryOrigin: 'https://www.ometodoemagrecer.com.br',
  hosts: ['ometodoemagrecer.com.br', 'www.ometodoemagrecer.com.br'],
};

/** Organização white label ilustrativa para governança de automações. */
export const CLINICA_EXEMPLO_WL_ORGANIZATION: OrganizationDefinition = {
  id: CLINICA_EXEMPLO_WL_ID,
  name: 'Clínica Exemplo WL',
  kind: 'organization',
  primaryOrigin: 'https://app.clinicaexemplo.com.br',
  hosts: ['app.clinicaexemplo.com.br', 'www.app.clinicaexemplo.com.br'],
};

/** Registry estático — evoluir para Firestore/API em multi-org. */
const ORGANIZATION_REGISTRY: Readonly<Record<OrganizationId, OrganizationDefinition>> = {
  [METODO_ORGANIZATION_ID]: METODO_ORGANIZATION,
  [CLINICA_EXEMPLO_WL_ID]: CLINICA_EXEMPLO_WL_ORGANIZATION,
};

export function listOrganizations(): OrganizationDefinition[] {
  return Object.values(ORGANIZATION_REGISTRY);
}

export function getOrganizationById(id: OrganizationId): OrganizationDefinition | null {
  return ORGANIZATION_REGISTRY[id] ?? null;
}

/** Organização padrão quando o contexto não especifica outra (hoje: Método). */
export function getDefaultOrganization(): OrganizationDefinition {
  return METODO_ORGANIZATION;
}

export function organizationExists(id: OrganizationId): boolean {
  return id in ORGANIZATION_REGISTRY;
}

/** Monta contexto de Organização Ativa a partir do registry (sem persistência). */
export function buildActiveOrganizationContext(
  organizationId: OrganizationId = METODO_ORGANIZATION_ID,
): ActiveOrganizationContext | null {
  const org = getOrganizationById(organizationId);
  if (!org) return null;
  return {
    organizationId: org.id,
    primaryOrigin: org.primaryOrigin,
  };
}
