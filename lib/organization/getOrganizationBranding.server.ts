import type { OrganizationId } from './organizationTypes';
import type {
  OrganizationBrandingApiResponse,
  OrganizationBrandingResolved,
  OrganizationBrandingStored,
} from './organizationBrandingTypes';
import {
  ORGANIZATION_BRANDING_SEED_VERSION,
  hasFirestoreOrganizationBranding,
} from './organizationBrandingDefaults';
import {
  resolveOrganizationBrandingFromSources,
  resolveOrganizationBrandingSourceLayer,
} from './organizationBrandingMerge';
import { ensureOfficialOrganizationBrandingOwnership } from './organizationBrandingOfficialOwnership';
import { repairOrganizationPublicNameIfNeeded } from './organizationBrandingPublicNameRepair';
import {
  readOrganizationBrandingFromFirestore,
  readOrganizationDocumentExists,
  readSourceMedicoWhiteLabel,
  writeOrganizationBrandingUpdate,
  METODO_IMAGENS_SOURCE_EMAIL,
} from './organizationBrandingFirestore.server';
import { getOrganizationById } from './organizationRegistry';
import { getMetodoImagensTemplateFromFirestore } from '@/lib/metodo/metodoImagensService.server';

export async function getOrganizationBranding(
  organizationId: OrganizationId,
): Promise<OrganizationBrandingResolved> {
  const organization = getOrganizationById(organizationId);
  if (!organization) {
    throw new Error(`Organização não encontrada: ${organizationId}`);
  }

  const [firestoreBranding, metodoImagens, sourceWhiteLabel] = await Promise.all([
    readOrganizationBrandingFromFirestore(organizationId),
    getMetodoImagensTemplateFromFirestore(),
    readSourceMedicoWhiteLabel(),
  ]);

  const branding = resolveOrganizationBrandingFromSources({
    organization,
    firestoreBranding: hasFirestoreOrganizationBranding(firestoreBranding)
      ? firestoreBranding
      : null,
    metodoImagens,
    sourceWhiteLabel,
  });

  const sourceLayer = resolveOrganizationBrandingSourceLayer({
    firestoreBranding: hasFirestoreOrganizationBranding(firestoreBranding)
      ? firestoreBranding
      : null,
    metodoImagens,
    sourceWhiteLabel,
  });

  return {
    ...branding,
    organizationId,
    sourceLayer,
  };
}

export async function getOrganizationBrandingForAdmin(
  organizationId: OrganizationId,
): Promise<OrganizationBrandingApiResponse> {
  const organization = getOrganizationById(organizationId);
  if (!organization) {
    throw new Error(`Organização não encontrada: ${organizationId}`);
  }

  const ownership = await ensureOfficialOrganizationBrandingOwnership(organizationId);
  let firestoreBranding = await readOrganizationBrandingFromFirestore(organizationId);

  const repairedPublicName = await repairOrganizationPublicNameIfNeeded(
    organizationId,
    organization,
    firestoreBranding,
  );
  if (repairedPublicName) {
    firestoreBranding = await readOrganizationBrandingFromFirestore(organizationId);
  }

  const firestoreDocExists = await readOrganizationDocumentExists(organizationId);

  const [metodoImagens, sourceWhiteLabel] = await Promise.all([
    getMetodoImagensTemplateFromFirestore(),
    readSourceMedicoWhiteLabel(),
  ]);

  const branding = await getOrganizationBranding(organizationId);

  return {
    branding,
    firestoreDocExists,
    firestoreBrandingExists: hasFirestoreOrganizationBranding(firestoreBranding),
    seededNow: ownership.consolidatedNow,
    consolidatedNow: ownership.consolidatedNow,
    legacySources: {
      hasPlatformMetodoImagens: !!metodoImagens,
      hasSourceMedicoWhiteLabel: !!sourceWhiteLabel,
      sourceMedicoEmail: METODO_IMAGENS_SOURCE_EMAIL,
    },
  };
}

export async function saveOrganizationBrandingForAdmin(
  organizationId: OrganizationId,
  branding: OrganizationBrandingStored,
): Promise<OrganizationBrandingResolved> {
  const organization = getOrganizationById(organizationId);
  if (!organization) {
    throw new Error(`Organização não registrada: ${organizationId}`);
  }

  const payload: OrganizationBrandingStored = {
    ...branding,
    seedVersion: ORGANIZATION_BRANDING_SEED_VERSION,
    updatedAt: new Date().toISOString(),
  };

  await writeOrganizationBrandingUpdate(organizationId, organization, payload);
  return getOrganizationBranding(organizationId);
}

export type { OrganizationBrandingResolved };
