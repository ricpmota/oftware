import type { OrganizationDefinition, OrganizationId } from './organizationTypes';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';
import {
  ORGANIZATION_BRANDING_LEGACY_SEED_VERSIONS,
  ORGANIZATION_BRANDING_SEED_VERSION,
} from './organizationBrandingDefaults';
import { buildNewOrganizationBrandingSeed } from './buildNewOrganizationBrandingSeed';
import { buildOrganizationBrandingSeedPayload } from './organizationBrandingMerge';
import {
  readOrganizationBrandingFromFirestore,
  readSourceMedicoWhiteLabel,
  writeOrganizationBrandingSeed,
} from './organizationBrandingFirestore.server';
import { METODO_ORGANIZATION_ID } from './organizationRegistry';
import { resolveOrganizationDefinition } from './resolveOrganizationDefinition.server';
import { getMetodoImagensTemplateFromFirestore } from '@/lib/metodo/metodoImagensService.server';

export function needsOfficialOwnershipMigration(
  existing: OrganizationBrandingStored | null | undefined,
): boolean {
  if (!existing?.publicName?.trim()) return true;
  const version = existing.seedVersion?.trim() ?? '';
  if (!version) return true;
  if (version === ORGANIZATION_BRANDING_SEED_VERSION) return false;
  if ((ORGANIZATION_BRANDING_LEGACY_SEED_VERSIONS as readonly string[]).includes(version)) {
    return true;
  }
  // Versão desconhecida anterior — consolidar uma vez para 11.1
  return version < ORGANIZATION_BRANDING_SEED_VERSION;
}

/**
 * Marca já gravada de organização white label: só alinha seedVersion.
 * Seed neutro entra apenas quando ainda não existe branding.
 */
export function buildNonMetodoOwnershipMigrationBranding(
  organization: OrganizationDefinition,
  existing: OrganizationBrandingStored | null | undefined,
  now: string,
): OrganizationBrandingStored {
  if (existing?.publicName?.trim()) {
    return {
      ...existing,
      seedVersion: ORGANIZATION_BRANDING_SEED_VERSION,
      seededAt: existing.seededAt ?? now,
      updatedAt: now,
    };
  }

  const seed = buildNewOrganizationBrandingSeed(organization);
  return {
    ...seed,
    seededAt: now,
    updatedAt: now,
  };
}

/**
 * Etapa 11.1 — no Método, consolida assets legados em organizations/metodo.branding.
 * Nas demais organizações, não substitui logos, cores nem páginas já cadastradas.
 */
export async function ensureOfficialOrganizationBrandingOwnership(
  organizationId: OrganizationId,
): Promise<{ consolidatedNow: boolean; usedLegacySources: boolean }> {
  const organization = await resolveOrganizationDefinition(organizationId);
  if (!organization) {
    throw new Error(`Organização não encontrada: ${organizationId}`);
  }

  const existing = await readOrganizationBrandingFromFirestore(organizationId);
  if (!needsOfficialOwnershipMigration(existing)) {
    return { consolidatedNow: false, usedLegacySources: false };
  }

  const now = new Date().toISOString();

  if (organizationId !== METODO_ORGANIZATION_ID) {
    await writeOrganizationBrandingSeed(
      organizationId,
      organization,
      buildNonMetodoOwnershipMigrationBranding(organization, existing, now),
    );
    return { consolidatedNow: true, usedLegacySources: false };
  }

  const [metodoImagens, sourceWhiteLabel] = await Promise.all([
    getMetodoImagensTemplateFromFirestore(),
    readSourceMedicoWhiteLabel(),
  ]);

  const legacySnapshot = buildOrganizationBrandingSeedPayload({
    organization,
    metodoImagens,
    sourceWhiteLabel,
  });

  await writeOrganizationBrandingSeed(organizationId, organization, {
    ...legacySnapshot,
    seedVersion: ORGANIZATION_BRANDING_SEED_VERSION,
    seededAt: existing?.seededAt ?? now,
    updatedAt: now,
  });

  return {
    consolidatedNow: true,
    usedLegacySources: !!(metodoImagens || sourceWhiteLabel),
  };
}
