import { INSTAGRAM_BIO_TEXT_DEFAULTS } from '@/lib/instagram/instagramBioConfig';
import {
  DEFAULT_APLICACAO_PAGE_BACKGROUND,
  DEFAULT_APLICACAO_PAGE_TEXT,
  DEFAULT_CONCLUSAO_PAGE_BACKGROUND,
  DEFAULT_CONCLUSAO_PAGE_TEXT,
  DEFAULT_DR_PAGE_BACKGROUND,
  DEFAULT_DR_PAGE_TEXT,
  DEFAULT_PUBLIC_PAGE_LOGO_SRC,
} from '@/lib/whiteLabel/publicPagesTheme';
import { DEFAULT_WHITE_LABEL_DESCRIPTION } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import type { OrganizationDefinition } from './organizationTypes';
import type {
  OrganizationBrandingInstagramBioDefaults,
  OrganizationBrandingPublicPages,
  OrganizationBrandingStored,
} from './organizationBrandingTypes';

/** Versão do seed — incrementar quando o schema ou consolidação oficial mudar. */
export const ORGANIZATION_BRANDING_SEED_VERSION = '11.1.0';

/** Etapas anteriores à propriedade oficial da Organização (Etapa 11.1). */
export const ORGANIZATION_BRANDING_LEGACY_SEED_VERSIONS = ['10.2.0'] as const;

export const ORGANIZATION_METODO_PRIMARY_COLOR = '#4CCB7A';
export const ORGANIZATION_METODO_SECONDARY_COLOR = '#0A1F44';
export const ORGANIZATION_METODO_ACCENT_COLOR = '#30f278';
export const ORGANIZATION_METODO_WATERMARK_SRC = '/simbolo-metodo.png';
export const ORGANIZATION_METODO_ICON_SRC = '/metodo-simbolo-18.png';
export const ORGANIZATION_METODO_FAVICON_SRC = '/metodo-simbolo-17.png';
export const ORGANIZATION_METODO_OG_FALLBACK_SRC = '/og-metodo-logotipo-6.jpg';

export function buildHardcodedOrganizationBranding(
  organization: OrganizationDefinition,
): OrganizationBrandingStored {
  const publicPages = buildHardcodedPublicPages();

  return {
    publicName: organization.name,
    legalName: null,
    slogan: null,
    defaultDescription: DEFAULT_WHITE_LABEL_DESCRIPTION,
    logoMainUrl: DEFAULT_PUBLIC_PAGE_LOGO_SRC,
    logoDarkUrl: null,
    logoLightUrl: null,
    iconUrl: ORGANIZATION_METODO_ICON_SRC,
    faviconUrl: ORGANIZATION_METODO_FAVICON_SRC,
    ogImageUrl: ORGANIZATION_METODO_OG_FALLBACK_SRC,
    pdfLogoUrl: null,
    watermarkUrl: ORGANIZATION_METODO_WATERMARK_SRC,
    primaryColor: ORGANIZATION_METODO_PRIMARY_COLOR,
    secondaryColor: ORGANIZATION_METODO_SECONDARY_COLOR,
    accentColor: ORGANIZATION_METODO_ACCENT_COLOR,
    backgroundColor: ORGANIZATION_METODO_SECONDARY_COLOR,
    surfaceColor: DEFAULT_APLICACAO_PAGE_BACKGROUND,
    textColor: DEFAULT_DR_PAGE_TEXT,
    mutedTextColor: DEFAULT_APLICACAO_PAGE_TEXT,
    borderColor: '#E5E7EB',
    successColor: ORGANIZATION_METODO_PRIMARY_COLOR,
    warningColor: '#D97706',
    errorColor: '#DC2626',
    publicPages,
    instagramBioDefaults: buildHardcodedInstagramBioDefaults(organization.primaryOrigin),
    instagramUrl: null,
    siteUrl: organization.primaryOrigin,
    showPoweredByOftware: true,
    seedVersion: ORGANIZATION_BRANDING_SEED_VERSION,
  };
}

function buildHardcodedPublicPages(): OrganizationBrandingPublicPages {
  return {
    dr: {
      backgroundColor: DEFAULT_DR_PAGE_BACKGROUND,
      textColor: DEFAULT_DR_PAGE_TEXT,
      logoUrl: DEFAULT_PUBLIC_PAGE_LOGO_SRC,
    },
    aplicacao: {
      backgroundColor: DEFAULT_APLICACAO_PAGE_BACKGROUND,
      textColor: DEFAULT_APLICACAO_PAGE_TEXT,
      logoUrl: DEFAULT_PUBLIC_PAGE_LOGO_SRC,
    },
    conclusao: {
      backgroundColor: DEFAULT_CONCLUSAO_PAGE_BACKGROUND,
      textColor: DEFAULT_CONCLUSAO_PAGE_TEXT,
      logoUrl: DEFAULT_PUBLIC_PAGE_LOGO_SRC,
    },
  };
}

function buildHardcodedInstagramBioDefaults(siteUrl: string): OrganizationBrandingInstagramBioDefaults {
  return {
    headline: INSTAGRAM_BIO_TEXT_DEFAULTS.headline,
    subtitle: INSTAGRAM_BIO_TEXT_DEFAULTS.subtitle,
    contactButtonLabel: INSTAGRAM_BIO_TEXT_DEFAULTS.contactButtonLabel,
    contactModalText: INSTAGRAM_BIO_TEXT_DEFAULTS.contactModalText,
    profilePrompt: INSTAGRAM_BIO_TEXT_DEFAULTS.profilePrompt,
    emagrecerCtaLabel: INSTAGRAM_BIO_TEXT_DEFAULTS.emagrecerCtaLabel,
    emagrecimentoUrl: siteUrl,
  };
}

function isValidHexColor(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

function pickColor(value: string | undefined | null, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && isValidHexColor(trimmed) ? trimmed : fallback;
}

function pickUrl(value: string | undefined | null, fallback: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function mergeDefined<T extends Record<string, unknown>>(base: T, patch?: Partial<T>): T {
  if (!patch) return base;
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && value !== null) {
      next[key as keyof T] = value as T[keyof T];
    }
  }
  return next;
}

function mergeScalarFields(
  base: OrganizationBrandingStored,
  layer: Partial<OrganizationBrandingStored>,
): OrganizationBrandingStored {
  const {
    publicPages: _pp,
    instagramBioDefaults: _ib,
    ...scalars
  } = layer;
  return mergeDefined(base, scalars as Partial<OrganizationBrandingStored>);
}

/** Mescla camadas do fallback (prioridade crescente — última vence). */
export function mergeOrganizationBrandingLayers(
  layers: Partial<OrganizationBrandingStored>[],
): OrganizationBrandingStored {
  let merged = { ...(layers[0] as OrganizationBrandingStored) };

  for (let i = 1; i < layers.length; i += 1) {
    const layer = layers[i];
    if (!layer) continue;
    merged = mergeScalarFields(merged, layer);
    if (layer.publicPages) {
      merged.publicPages = {
        dr: mergeDefined(merged.publicPages.dr, layer.publicPages.dr),
        aplicacao: mergeDefined(merged.publicPages.aplicacao, layer.publicPages.aplicacao),
        conclusao: mergeDefined(merged.publicPages.conclusao, layer.publicPages.conclusao),
      };
    }
    if (layer.instagramBioDefaults) {
      merged.instagramBioDefaults = mergeDefined(
        merged.instagramBioDefaults,
        layer.instagramBioDefaults,
      );
    }
  }

  return {
    ...merged,
    publicName: merged.publicName.trim() || 'Organização',
    defaultDescription: merged.defaultDescription.trim() || DEFAULT_WHITE_LABEL_DESCRIPTION,
    primaryColor: pickColor(merged.primaryColor, ORGANIZATION_METODO_PRIMARY_COLOR),
    secondaryColor: pickColor(merged.secondaryColor, ORGANIZATION_METODO_SECONDARY_COLOR),
    siteUrl: merged.siteUrl.trim() || merged.instagramBioDefaults.emagrecimentoUrl,
    showPoweredByOftware: merged.showPoweredByOftware !== false,
  };
}

export function hasFirestoreOrganizationBranding(
  branding: OrganizationBrandingStored | null | undefined,
): branding is OrganizationBrandingStored {
  return !!(branding?.publicName?.trim() && branding?.siteUrl?.trim());
}

export { isValidHexColor, pickColor, pickUrl };
