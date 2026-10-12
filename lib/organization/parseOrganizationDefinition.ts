import type { OrganizationDefinition } from './organizationTypes';
import { normalizeOrganizationHost } from './resolveOrganizationFromHost';

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Converte documento Firestore `organizations/{id}` em OrganizationDefinition. */
export function parseOrganizationDefinition(
  id: string,
  data: Record<string, unknown> | null | undefined,
): OrganizationDefinition | null {
  const docId = (id || '').trim();
  if (!docId || !data) return null;

  const status = asString(data.status).toLowerCase();
  if (status === 'removed' || status === 'archived' || status === 'deleted') {
    return null;
  }

  const name = asString(data.name) || asString((data.branding as { publicName?: unknown } | undefined)?.publicName);
  if (!name) return null;

  const primaryOrigin =
    asString(data.primaryOrigin) ||
    asString((data.branding as { siteUrl?: unknown } | undefined)?.siteUrl);
  if (!primaryOrigin) return null;

  const hostsRaw = Array.isArray(data.hosts) ? data.hosts : [];
  const hosts = hostsRaw
    .filter((h): h is string => typeof h === 'string')
    .map((h) => normalizeOrganizationHost(h))
    .filter(Boolean);

  if (hosts.length === 0) {
    try {
      const host = normalizeOrganizationHost(new URL(primaryOrigin).hostname);
      if (host) {
        const apex = host.startsWith('www.') ? host.slice(4) : host;
        hosts.push(apex, `www.${apex}`);
      }
    } catch {
      /* ignore */
    }
  }

  if (hosts.length === 0) return null;

  return {
    id: docId,
    name,
    kind: 'organization',
    primaryOrigin: primaryOrigin.replace(/\/$/, ''),
    hosts: Array.from(new Set(hosts)),
  };
}
