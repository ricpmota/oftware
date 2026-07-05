import type { NextRequest } from 'next/server';
import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import { readOrganizationBrandingFromFirestore } from '@/lib/organization/organizationBrandingFirestore.server';
import { isMetodoOrganizationMember } from '@/lib/organization/isMetodoOrganizationMember';
import {
  getOrganizationById,
  METODO_ORGANIZATION_ID,
} from '@/lib/organization/organizationRegistry';
import {
  normalizeOrganizationHost,
  resolveOrganizationFromHost,
} from '@/lib/organization/resolveOrganizationFromHost';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

export function requestHostFromNextRequest(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-host');
  const fromForwarded = xf?.split(',')[0]?.trim();
  const raw = (fromForwarded || request.headers.get('host') || '').trim();
  return normalizeOrganizationHost(raw);
}

function resolveMedicoOrganizationId(data: Record<string, unknown> | undefined): OrganizationId | null {
  if (!data) return null;

  const member = isMetodoOrganizationMember({
    organizationId: typeof data.organizationId === 'string' ? data.organizationId : null,
    metodoImagensAtivo: data.metodoImagensAtivo === true,
  });

  if (!member) return null;

  const orgId =
    (typeof data.organizationId === 'string' ? data.organizationId.trim() : '') ||
    METODO_ORGANIZATION_ID;
  return orgId as OrganizationId;
}

async function readOrganizationMetaFromFirestore(organizationId: string): Promise<{
  primaryOrigin: string;
  hosts: string[];
} | null> {
  const snap = await getFirestoreAdmin().collection('organizations').doc(organizationId).get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  const primaryOrigin = typeof data.primaryOrigin === 'string' ? data.primaryOrigin.trim() : '';
  const hosts = Array.isArray(data.hosts)
    ? data.hosts.filter((h): h is string => typeof h === 'string').map((h) => h.toLowerCase())
    : [];
  if (!primaryOrigin && hosts.length === 0) return null;
  return { primaryOrigin, hosts };
}

async function resolveBrandingSiteUrl(organizationId: OrganizationId): Promise<string | null> {
  const fromFirestore = await readOrganizationBrandingFromFirestore(organizationId);
  if (fromFirestore?.siteUrl?.trim()) {
    return fromFirestore.siteUrl.trim().replace(/\/$/, '');
  }

  const registryOrg = getOrganizationById(organizationId);
  if (registryOrg) {
    try {
      const branding = await getOrganizationBranding(organizationId);
      if (branding.siteUrl?.trim()) {
        return branding.siteUrl.trim().replace(/\/$/, '');
      }
    } catch {
      /* fallback registry */
    }
    return registryOrg.primaryOrigin.replace(/\/$/, '');
  }

  const meta = await readOrganizationMetaFromFirestore(organizationId);
  if (meta?.primaryOrigin) {
    return meta.primaryOrigin.replace(/\/$/, '');
  }

  return null;
}

function hostBelongsToOrganization(
  host: string,
  organizationId: OrganizationId,
  meta: { hosts: string[] } | null
): boolean {
  if (!host) return false;
  const fromRegistry = resolveOrganizationFromHost(host);
  if (fromRegistry?.id === organizationId) return true;
  return meta?.hosts.includes(host) ?? false;
}

/** Resolve organização ativa: host da requisição → médico → Método. */
export async function resolveOrganizationIdForPlano(
  request: NextRequest,
  medicoDocId: string
): Promise<OrganizationId> {
  const requestHost = requestHostFromNextRequest(request);
  const fromHost = resolveOrganizationFromHost(requestHost);
  if (fromHost) return fromHost.id;

  if (requestHost) {
    const db = getFirestoreAdmin();
    const orgsSnap = await db.collection('organizations').limit(50).get();
    for (const doc of orgsSnap.docs) {
      const data = doc.data() as { hosts?: unknown };
      const hosts = Array.isArray(data.hosts)
        ? data.hosts.filter((h): h is string => typeof h === 'string').map((h) => h.toLowerCase())
        : [];
      if (hosts.includes(requestHost)) {
        return doc.id as OrganizationId;
      }
    }
  }

  const medSnap = await getFirestoreAdmin().collection('medicos').doc(medicoDocId).get();
  const fromMedico = resolveMedicoOrganizationId(medSnap.data() as Record<string, unknown>);
  return fromMedico ?? METODO_ORGANIZATION_ID;
}

export async function buildPlanoTerapeuticoPublicUrl(
  organizationId: OrganizationId,
  orcamentoId: string,
  publicAccessToken: string,
  requestHost?: string
): Promise<string> {
  const meta = await readOrganizationMetaFromFirestore(organizationId);
  const host = normalizeOrganizationHost(requestHost);

  let origin: string | null = null;
  if (host && hostBelongsToOrganization(host, organizationId, meta)) {
    origin = `https://${host}`;
  }

  if (!origin) {
    origin = await resolveBrandingSiteUrl(organizationId);
  }

  if (!origin) {
    origin = 'https://www.oftware.com.br';
  }

  const path = `/plano/${encodeURIComponent(orcamentoId)}?t=${encodeURIComponent(publicAccessToken)}`;
  return `${origin.replace(/\/$/, '')}${path}`;
}
