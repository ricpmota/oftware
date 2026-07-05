import { getDefaultOrganization, getOrganizationById, METODO_ORGANIZATION } from './organizationRegistry';
import type { OrganizationDefinition, OrganizationId } from './organizationTypes';

function originFromEnv(): string {
  if (typeof process === 'undefined') return '';
  return (
    process.env.ORGANIZACAO_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_ORGANIZACAO_PUBLIC_APP_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '');
}

function resolveOriginForOrganization(org: OrganizationDefinition, explicitBase?: string): string {
  const explicit = explicitBase?.trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const fromEnv = originFromEnv();
  if (fromEnv) return fromEnv;
  return org.primaryOrigin.replace(/\/$/, '');
}

/** Origem pública canônica de uma organização (sem barra final). */
export function resolveOrganizationPublicOrigin(
  organizationId: OrganizationId,
  explicitBase?: string,
): string {
  const org = getOrganizationById(organizationId) ?? getDefaultOrganization();
  return resolveOriginForOrganization(org, explicitBase);
}

/** URL pública absoluta no domínio da organização. */
export function buildOrganizationPublicUrl(
  organizationId: OrganizationId,
  path: string,
  explicitBase?: string,
): string {
  const base = resolveOrganizationPublicOrigin(organizationId, explicitBase);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/** Atalho: origem do Método Emagrecer (organização #1). */
export const ORGANIZACAO_METODO_PUBLIC_ORIGIN = METODO_ORGANIZATION.primaryOrigin;

/** Compat Etapa 2 — default Método; override opcional via env ou parâmetro. */
export function resolveOrganizacaoPublicOrigin(explicitBase?: string): string {
  return resolveOrganizationPublicOrigin(METODO_ORGANIZATION.id, explicitBase);
}

/** Compat Etapa 2 — links públicos no domínio da Organização Método. */
export function buildOrganizacaoPublicUrl(path: string, explicitBase?: string): string {
  return buildOrganizationPublicUrl(METODO_ORGANIZATION.id, path, explicitBase);
}

/** Origem a partir de definição completa (útil após resolveOrganizationFromHost). */
export function resolvePublicOriginForOrganization(
  org: OrganizationDefinition,
  explicitBase?: string,
): string {
  return resolveOriginForOrganization(org, explicitBase);
}

export function buildPublicUrlForOrganization(
  org: OrganizationDefinition,
  path: string,
  explicitBase?: string,
): string {
  const base = resolveOriginForOrganization(org, explicitBase);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
