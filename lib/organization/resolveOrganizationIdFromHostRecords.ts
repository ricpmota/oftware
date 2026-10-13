import { normalizeOrganizationHost } from './resolveOrganizationFromHost';

export type OrganizationHostRecord = {
  id: string;
  hosts: readonly string[];
  status?: string | null;
};

function isInactiveStatus(status: string | null | undefined): boolean {
  const normalized = (status || '').trim().toLowerCase();
  return normalized === 'removed' || normalized === 'archived' || normalized === 'deleted';
}

/**
 * Casa o host com os hosts cadastrados. Não autoriza acesso.
 * O registry estático entra na lista antes dos documentos do Firestore.
 */
export function resolveOrganizationIdFromHostRecords(
  host: string | null | undefined,
  organizations: readonly OrganizationHostRecord[],
): string | null {
  const normalized = normalizeOrganizationHost(host);
  if (!normalized) return null;

  for (const organization of organizations) {
    if (isInactiveStatus(organization.status)) continue;
    const matches = organization.hosts.some(
      (item) => normalizeOrganizationHost(item) === normalized,
    );
    if (matches) return organization.id;
  }

  return null;
}
