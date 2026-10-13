import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buildNewOrganizationBrandingSeed } from './buildNewOrganizationBrandingSeed';
import { isDemoOrganization } from './isDemoOrganization';
import { normalizeOrganizationPrimaryOrigin } from './normalizeOrganizationPrimaryOrigin';
import {
  isValidOrganizationSlug,
  normalizeOrganizationSlug,
  suggestOrganizationSlugFromName,
} from './normalizeOrganizationSlug';
import { isDoctorStylePublicName } from './organizationBrandingPublicNameRepair';
import { getOrganizationById, METODO_ORGANIZATION_ID } from './organizationRegistry';
import { writeOrganizationBrandingSeed } from './organizationBrandingFirestore.server';
import type { OrganizationDefinition } from './organizationTypes';

export type CreateOrganizationInput = {
  name: string;
  organizationId?: string;
  domain: string;
};

export type CreateOrganizationResult = {
  organization: OrganizationDefinition;
  created: boolean;
};

export function validateCreateOrganizationInput(input: CreateOrganizationInput): {
  ok: true;
  name: string;
  organizationId: string;
  primaryOrigin: string;
  hosts: string[];
} | { ok: false; error: string } {
  const name = (input.name || '').trim();
  if (name.length < 2) {
    return { ok: false, error: 'Informe o nome da organização (mín. 2 caracteres).' };
  }
  if (name.length > 120) {
    return { ok: false, error: 'Nome da organização muito longo.' };
  }
  if (isDoctorStylePublicName(name)) {
    return {
      ok: false,
      error:
        'O nome público da organização não pode ser o nome de um médico. Use o nome da clínica ou do programa.',
    };
  }

  const slugRaw = (input.organizationId || '').trim() || suggestOrganizationSlugFromName(name);
  const organizationId = normalizeOrganizationSlug(slugRaw);
  if (!isValidOrganizationSlug(organizationId)) {
    return {
      ok: false,
      error: 'ID inválido. Use letras minúsculas, números e hífens (ex.: endocrino-kamilla).',
    };
  }
  if (organizationId === METODO_ORGANIZATION_ID) {
    return { ok: false, error: 'O ID "metodo" é reservado à organização Método Emagrecer.' };
  }

  const origin = normalizeOrganizationPrimaryOrigin(input.domain);
  if (!origin) {
    return {
      ok: false,
      error: 'Domínio inválido. Ex.: www.clinicasaudetotal.com.br',
    };
  }

  const draft: OrganizationDefinition = {
    id: organizationId,
    name,
    kind: 'organization',
    primaryOrigin: origin.primaryOrigin,
    hosts: origin.hosts,
  };

  if (isDemoOrganization(draft)) {
    return { ok: false, error: 'Não é permitido criar a organização de demonstração Clínica Exemplo WL.' };
  }

  return {
    ok: true,
    name,
    organizationId,
    primaryOrigin: origin.primaryOrigin,
    hosts: origin.hosts,
  };
}

/**
 * Cria organização no Firestore + seed de branding isolado (sem assets do Método).
 */
export async function createOrganizationServer(
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  const validated = validateCreateOrganizationInput(input);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const { name, organizationId, primaryOrigin, hosts } = validated;

  if (getOrganizationById(organizationId)) {
    throw new Error(`Organização já existe no registry: ${organizationId}`);
  }

  const db = getFirestoreAdmin();
  const ref = db.collection('organizations').doc(organizationId);
  const existing = await ref.get();
  if (existing.exists) {
    const status = String((existing.data() as { status?: string })?.status || '').toLowerCase();
    if (status !== 'removed' && status !== 'archived' && status !== 'deleted') {
      throw new Error(`Já existe uma organização com o ID "${organizationId}".`);
    }
  }

  // Conflito de host com Método ou outra org ativa
  const all = await db.collection('organizations').limit(200).get();
  for (const doc of all.docs) {
    if (doc.id === organizationId) continue;
    const data = doc.data() as { hosts?: unknown; status?: string; primaryOrigin?: string };
    const status = String(data.status || '').toLowerCase();
    if (status === 'removed' || status === 'archived' || status === 'deleted') continue;
    const docHosts = Array.isArray(data.hosts)
      ? data.hosts.filter((h): h is string => typeof h === 'string').map((h) => h.toLowerCase())
      : [];
    for (const host of hosts) {
      if (docHosts.includes(host)) {
        throw new Error(`O domínio ${host} já está vinculado à organização "${doc.id}".`);
      }
    }
  }

  for (const host of hosts) {
    if (
      host === 'ometodoemagrecer.com.br' ||
      host === 'www.ometodoemagrecer.com.br'
    ) {
      throw new Error('Este domínio pertence à organização Método Emagrecer.');
    }
  }

  const organization: OrganizationDefinition = {
    id: organizationId,
    name,
    kind: 'organization',
    primaryOrigin,
    hosts,
  };

  const branding = buildNewOrganizationBrandingSeed(organization);
  const now = new Date().toISOString();

  await ref.set(
    {
      id: organizationId,
      name,
      kind: 'organization',
      primaryOrigin,
      hosts: [...hosts],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      removedAt: null,
      removedReason: null,
    },
    { merge: true },
  );

  await writeOrganizationBrandingSeed(organizationId, organization, branding);

  return { organization, created: true };
}
