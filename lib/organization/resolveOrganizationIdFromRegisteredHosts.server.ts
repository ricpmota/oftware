import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { listOrganizations } from './organizationRegistry';
import {
  resolveOrganizationIdFromHostRecords,
  type OrganizationHostRecord,
} from './resolveOrganizationIdFromHostRecords';
import {
  normalizeOrganizationHost,
  resolveOrganizationFromHost,
} from './resolveOrganizationFromHost';

/**
 * Host da requisição → organizationId cadastrado.
 * Registry estático primeiro (Método). Depois `organizations.hosts` no Firestore.
 * Não escolhe a marca do usuário autenticado.
 */
export async function resolveOrganizationIdFromRegisteredHosts(
  host: string | null | undefined,
): Promise<string | null> {
  const normalized = normalizeOrganizationHost(host);
  if (!normalized) return null;

  const fromRegistry = resolveOrganizationFromHost(normalized);
  if (fromRegistry) return fromRegistry.id;

  const snap = await getFirestoreAdmin().collection('organizations').limit(200).get();
  const records: OrganizationHostRecord[] = snap.docs.map((doc) => {
    const data = doc.data() as { hosts?: unknown; status?: string };
    const hosts = Array.isArray(data.hosts)
      ? data.hosts.filter((item): item is string => typeof item === 'string')
      : [];
    return { id: doc.id, hosts, status: data.status };
  });

  const registryIds = new Set(listOrganizations().map((organization) => organization.id));
  return resolveOrganizationIdFromHostRecords(
    normalized,
    records.filter((record) => !registryIds.has(record.id)),
  );
}
