import { normalizeOrganizationHost } from './resolveOrganizationFromHost';

export type NormalizedOrganizationOrigin = {
  primaryOrigin: string;
  hosts: string[];
};

/**
 * Normaliza domínio/URL informados no cadastro de Nova Organização.
 * Aceita: www.clinicasaudetotal.com.br | clinicasaudetotal.com.br | https://...
 */
export function normalizeOrganizationPrimaryOrigin(raw: string): NormalizedOrganizationOrigin | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  let urlText = trimmed;
  if (!/^https?:\/\//i.test(urlText)) {
    urlText = `https://${urlText}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlText);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = normalizeOrganizationHost(parsed.hostname);
  if (!host || !host.includes('.')) return null;
  if (host === 'localhost' || host.endsWith('.local')) return null;

  const apex = host.startsWith('www.') ? host.slice(4) : host;
  const www = `www.${apex}`;
  const primaryHost = host.startsWith('www.') ? host : www;
  const primaryOrigin = `https://${primaryHost}`;
  const hosts = Array.from(new Set([apex, www]));

  return { primaryOrigin, hosts };
}
