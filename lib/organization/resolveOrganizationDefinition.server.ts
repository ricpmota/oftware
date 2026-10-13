import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { isDemoOrganization } from './isDemoOrganization';
import { getOrganizationById, METODO_ORGANIZATION } from './organizationRegistry';
import { parseOrganizationDefinition } from './parseOrganizationDefinition';
import type { OrganizationDefinition, OrganizationId } from './organizationTypes';

/**
 * Resolve definição da org: registry estático (Método) → Firestore.
 * Orgs demo (Clínica Exemplo WL) retornam null.
 */
export async function resolveOrganizationDefinition(
  organizationId: OrganizationId,
): Promise<OrganizationDefinition | null> {
  const id = (organizationId || '').trim();
  if (!id) return null;

  const fromRegistry = getOrganizationById(id);
  if (fromRegistry) {
    if (isDemoOrganization(fromRegistry)) return null;
    return fromRegistry;
  }

  const snap = await getFirestoreAdmin().collection('organizations').doc(id).get();
  if (!snap.exists) return null;

  const parsed = parseOrganizationDefinition(snap.id, snap.data() as Record<string, unknown>);
  if (!parsed || isDemoOrganization(parsed)) return null;
  return parsed;
}

/** Lista orgs ativas: Método + Firestore (sem demos). */
export async function listOrganizationsMergedServer(): Promise<OrganizationDefinition[]> {
  const byId = new Map<string, OrganizationDefinition>();
  byId.set(METODO_ORGANIZATION.id, METODO_ORGANIZATION);

  const snap = await getFirestoreAdmin().collection('organizations').limit(200).get();
  for (const doc of snap.docs) {
    const parsed = parseOrganizationDefinition(doc.id, doc.data() as Record<string, unknown>);
    if (!parsed || isDemoOrganization(parsed)) continue;
    // Método do registry prevalece se o doc Firestore estiver incompleto
    if (parsed.id === METODO_ORGANIZATION.id) {
      byId.set(METODO_ORGANIZATION.id, {
        ...METODO_ORGANIZATION,
        name: parsed.name || METODO_ORGANIZATION.name,
        primaryOrigin: parsed.primaryOrigin || METODO_ORGANIZATION.primaryOrigin,
        hosts:
          parsed.hosts.length > 0 ? parsed.hosts : METODO_ORGANIZATION.hosts,
      });
      continue;
    }
    byId.set(parsed.id, parsed);
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.id === METODO_ORGANIZATION.id) return -1;
    if (b.id === METODO_ORGANIZATION.id) return 1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

/** Marca orgs demo como removed no Firestore (não altera Método). */
export async function archiveDemoOrganizationsInFirestore(): Promise<string[]> {
  const db = getFirestoreAdmin();
  const snap = await db.collection('organizations').limit(200).get();
  const archived: string[] = [];
  const now = new Date().toISOString();

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const parsed = parseOrganizationDefinition(doc.id, { ...data, status: 'active' });
    if (!parsed || !isDemoOrganization(parsed)) continue;
    if (doc.id === METODO_ORGANIZATION.id) continue;

    await doc.ref.set(
      {
        status: 'removed',
        removedAt: now,
        removedReason: 'demo-organization-clinica-exemplo-wl',
      },
      { merge: true },
    );
    archived.push(doc.id);
  }

  return archived;
}
