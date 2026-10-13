import { METODO_ORGANIZATION_ID } from './organizationRegistry';
import type { OrganizationId } from './organizationTypes';

export type MemberOrganizationLink = {
  organizationId?: string | null;
  metodoImagensAtivo?: boolean | null;
};

export function memberOrganizationLinkFromData(
  data: Record<string, unknown> | null | undefined,
): MemberOrganizationLink {
  return {
    organizationId: typeof data?.organizationId === 'string' ? data.organizationId : null,
    metodoImagensAtivo: data?.metodoImagensAtivo === true,
  };
}

/**
 * `none` — MetaAdmin: sem vínculo explícito só herda o Método se `metodoImagensAtivo`.
 * `metodo` — portais que hoje já mostram a marca do Método quando o campo está vazio.
 */
export type MemberOrganizationLegacyDefault = 'metodo' | 'none';

/**
 * Organização do profissional autenticado.
 * O id explícito do documento vence. Não lê domínio nem organizationId enviado pelo cliente.
 */
export function resolveMemberOrganizationId(
  member: MemberOrganizationLink | null | undefined,
  legacyDefault: MemberOrganizationLegacyDefault,
): OrganizationId | null {
  const explicit = (member?.organizationId || '').trim();
  if (explicit) return explicit;
  if (member?.metodoImagensAtivo === true) return METODO_ORGANIZATION_ID;
  if (legacyDefault === 'metodo') return METODO_ORGANIZATION_ID;
  return null;
}
