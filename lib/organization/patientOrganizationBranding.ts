import { buildHardcodedOrganizationBranding } from './organizationBrandingDefaults';
import { getOrganizationById } from './organizationRegistry';
import type {
  OrganizationBrandingPublicPages,
  OrganizationBrandingSourceLayer,
  OrganizationBrandingStored,
} from './organizationBrandingTypes';
import type { PatientOrganizationStatus } from './patientOrganizationContext';
import type { OrganizationId } from './organizationTypes';

export type PatientOrganizationBrandingStatus =
  | 'loading'
  | 'resolved'
  | 'fallback'
  | 'unresolved'
  | 'error';

/** Camada que efetivamente preencheu a identidade (não é autorização). */
export type PatientOrganizationBrandingSource = 'firestore' | 'default' | 'fallback';

/** Identidade pública da organização — sem instagramBioDefaults nem metadados internos. */
export type PatientOrganizationBrandingPublic = {
  publicName: string;
  legalName: string | null;
  slogan: string | null;
  defaultDescription: string;
  logoMainUrl: string | null;
  logoDarkUrl: string | null;
  logoLightUrl: string | null;
  iconUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  pdfLogoUrl: string | null;
  watermarkUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  backgroundColor: string | null;
  surfaceColor: string | null;
  textColor: string | null;
  mutedTextColor: string | null;
  borderColor: string | null;
  successColor: string | null;
  warningColor: string | null;
  errorColor: string | null;
  publicPages: OrganizationBrandingPublicPages;
  siteUrl: string;
  showPoweredByOftware: boolean;
};

export type PatientOrganizationBrandingValue = {
  status: PatientOrganizationBrandingStatus;
  organizationId: OrganizationId | null;
  branding: PatientOrganizationBrandingPublic | null;
  source: PatientOrganizationBrandingSource | null;
};

export type PatientOrganizationBrandingApiOk = {
  ok: true;
  organizationId: OrganizationId | null;
  branding: PatientOrganizationBrandingPublic | null;
  sourceLayer: OrganizationBrandingSourceLayer | null;
  hostOrganizationId?: OrganizationId | null;
  organizationMatch?: boolean;
};

export type PatientOrganizationBrandingFetchStatus = 'idle' | 'loading' | 'success' | 'error';

function optionalText(value: string | null | undefined): string | null {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed : null;
}

export function toPatientOrganizationBrandingPublic(
  stored: OrganizationBrandingStored,
): PatientOrganizationBrandingPublic {
  return {
    publicName: stored.publicName,
    legalName: optionalText(stored.legalName),
    slogan: optionalText(stored.slogan),
    defaultDescription: stored.defaultDescription,
    logoMainUrl: optionalText(stored.logoMainUrl),
    logoDarkUrl: optionalText(stored.logoDarkUrl),
    logoLightUrl: optionalText(stored.logoLightUrl),
    iconUrl: optionalText(stored.iconUrl),
    faviconUrl: optionalText(stored.faviconUrl),
    ogImageUrl: optionalText(stored.ogImageUrl),
    pdfLogoUrl: optionalText(stored.pdfLogoUrl),
    watermarkUrl: optionalText(stored.watermarkUrl),
    primaryColor: stored.primaryColor,
    secondaryColor: stored.secondaryColor,
    accentColor: optionalText(stored.accentColor),
    backgroundColor: optionalText(stored.backgroundColor),
    surfaceColor: optionalText(stored.surfaceColor),
    textColor: optionalText(stored.textColor),
    mutedTextColor: optionalText(stored.mutedTextColor),
    borderColor: optionalText(stored.borderColor),
    successColor: optionalText(stored.successColor),
    warningColor: optionalText(stored.warningColor),
    errorColor: optionalText(stored.errorColor),
    publicPages: stored.publicPages,
    siteUrl: stored.siteUrl,
    showPoweredByOftware: stored.showPoweredByOftware !== false,
  };
}

export function mapSourceLayerToPatientBrandingSource(
  layer: OrganizationBrandingSourceLayer | null | undefined,
): PatientOrganizationBrandingSource | null {
  if (!layer) return null;
  if (layer === 'firestore') return 'firestore';
  if (layer === 'hardcoded') return 'default';
  return 'fallback';
}

export function fallbackPatientOrganizationBranding(
  organizationId: string | null | undefined,
): PatientOrganizationBrandingValue {
  const id = (organizationId || '').trim();
  if (!id) {
    return {
      status: 'unresolved',
      organizationId: null,
      branding: null,
      source: null,
    };
  }

  const organization = getOrganizationById(id);
  if (!organization) {
    return {
      status: 'unresolved',
      organizationId: id,
      branding: null,
      source: null,
    };
  }

  return {
    status: 'fallback',
    organizationId: id,
    branding: toPatientOrganizationBrandingPublic(buildHardcodedOrganizationBranding(organization)),
    source: 'default',
  };
}

function brandingStatusFromSource(
  source: PatientOrganizationBrandingSource,
): PatientOrganizationBrandingStatus {
  return source === 'firestore' ? 'resolved' : 'fallback';
}

/**
 * Deriva o estado de branding do contexto de organização + resultado do fetch.
 * Não aplica UI. Mismatch não é tratado como autorização.
 */
export function resolvePatientOrganizationBrandingState(input: {
  organizationStatus: PatientOrganizationStatus;
  organizationId: OrganizationId | null;
  fetchStatus: PatientOrganizationBrandingFetchStatus;
  payload: PatientOrganizationBrandingApiOk | null;
}): PatientOrganizationBrandingValue {
  if (input.organizationStatus === 'loading') {
    return {
      status: 'loading',
      organizationId: input.organizationId,
      branding: null,
      source: null,
    };
  }

  if (input.organizationStatus === 'unresolved' || !input.organizationId) {
    return {
      status: 'unresolved',
      organizationId: input.organizationId,
      branding: null,
      source: null,
    };
  }

  const organizationId = input.organizationId;

  if (input.fetchStatus === 'idle' || input.fetchStatus === 'loading') {
    return {
      status: 'loading',
      organizationId,
      branding: null,
      source: null,
    };
  }

  if (
    input.payload?.organizationId &&
    input.payload.organizationId !== organizationId
  ) {
    return {
      status: 'loading',
      organizationId,
      branding: null,
      source: null,
    };
  }

  if (input.fetchStatus === 'success' && input.payload?.branding) {
    const source =
      mapSourceLayerToPatientBrandingSource(input.payload.sourceLayer) ?? 'fallback';
    return {
      status: brandingStatusFromSource(source),
      organizationId: input.payload.organizationId || organizationId,
      branding: input.payload.branding,
      source,
    };
  }

  if (input.fetchStatus === 'success' && !input.payload?.branding) {
    return fallbackPatientOrganizationBranding(organizationId);
  }

  const fallback = fallbackPatientOrganizationBranding(organizationId);
  if (fallback.branding) return fallback;

  return {
    status: 'error',
    organizationId,
    branding: null,
    source: null,
  };
}

export function patientOrganizationBrandingLogPayload(
  value: PatientOrganizationBrandingValue,
): Record<string, string | boolean | null> {
  return {
    organizationId: value.organizationId,
    status: value.status,
    source: value.source,
    hasLogo: Boolean(value.branding?.logoMainUrl),
    hasPrimaryColor: Boolean(value.branding?.primaryColor),
  };
}

export function shouldFetchPatientOrganizationBranding(
  organizationStatus: PatientOrganizationStatus,
  organizationId: OrganizationId | null,
): boolean {
  if (!organizationId) return false;
  return organizationStatus === 'resolved' || organizationStatus === 'mismatch';
}
