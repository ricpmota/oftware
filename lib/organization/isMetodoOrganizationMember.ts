import { METODO_ORGANIZATION_ID } from './organizationRegistry';

/** Critérios para aplicar Marca da Organização Método (Etapa 11.2). */
export function isMetodoOrganizationMember(medico: {
  organizationId?: string | null;
  metodoImagensAtivo?: boolean | null;
}): boolean {
  const orgId = (medico.organizationId || '').trim();
  if (orgId === METODO_ORGANIZATION_ID) return true;
  return medico.metodoImagensAtivo === true;
}
