import type { OrganizationId } from './organizationTypes';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';
import {
  ORGANIZATION_BRANDING_LEGACY_SEED_VERSIONS,
  ORGANIZATION_BRANDING_SEED_VERSION,
} from './organizationBrandingDefaults';
import { buildOrganizationBrandingSeedPayload } from './organizationBrandingMerge';
import {
  readOrganizationBrandingFromFirestore,
  readSourceMedicoWhiteLabel,
  writeOrganizationBrandingSeed,
} from './organizationBrandingFirestore.server';
import { getOrganizationById } from './organizationRegistry';
import { getMetodoImagensTemplateFromFirestore } from '@/lib/metodo/metodoImagensService.server';

function needsOfficialOwnershipMigration(
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
 * Etapa 11.1 — consolida assets legados (platformSettings + ricpmota.whiteLabel + hardcodes)
 * em organizations/{id}.branding sem alterar URLs (snapshot das fontes atuais).
 */
export async function ensureOfficialOrganizationBrandingOwnership(
  organizationId: OrganizationId,
): Promise<{ consolidatedNow: boolean; usedLegacySources: boolean }> {
  const organization = getOrganizationById(organizationId);
  if (!organization) {
    throw new Error(`Organização não encontrada: ${organizationId}`);
  }

  const existing = await readOrganizationBrandingFromFirestore(organizationId);
  if (!needsOfficialOwnershipMigration(existing)) {
    return { consolidatedNow: false, usedLegacySources: false };
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

  const now = new Date().toISOString();
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
