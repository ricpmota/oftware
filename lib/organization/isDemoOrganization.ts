import type { OrganizationDefinition } from './organizationTypes';

/** IDs conhecidos de org de demonstração — não devem aparecer como ativas. */
const DEMO_ORGANIZATION_IDS = new Set([
  'clinica-exemplo',
  'clinica-exemplo-wl',
  'exemplo-wl',
  'exemplo',
  'whitelabel-x',
]);

const DEMO_NAME_RE = /cl[ií]nica\s+exemplo(\s+wl)?/i;
const DEMO_HOST_RE = /clinicaexemplo\.com\.br$/i;

/** True quando a org é placeholder / demo (ex.: Clínica Exemplo WL). */
export function isDemoOrganization(org: Pick<OrganizationDefinition, 'id' | 'name' | 'hosts'>): boolean {
  const id = (org.id || '').trim().toLowerCase();
  if (DEMO_ORGANIZATION_IDS.has(id)) return true;
  if (DEMO_NAME_RE.test(org.name || '')) return true;
  for (const host of org.hosts || []) {
    if (DEMO_HOST_RE.test(String(host).toLowerCase())) return true;
  }
  return false;
}
