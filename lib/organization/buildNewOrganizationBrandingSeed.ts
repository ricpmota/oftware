import { INSTAGRAM_BIO_TEXT_DEFAULTS } from '@/lib/instagram/instagramBioConfig';
import {
  DEFAULT_APLICACAO_PAGE_BACKGROUND,
  DEFAULT_APLICACAO_PAGE_TEXT,
  DEFAULT_CONCLUSAO_PAGE_BACKGROUND,
  DEFAULT_CONCLUSAO_PAGE_TEXT,
  DEFAULT_DR_PAGE_BACKGROUND,
  DEFAULT_DR_PAGE_TEXT,
} from '@/lib/whiteLabel/publicPagesTheme';
import { DEFAULT_WHITE_LABEL_DESCRIPTION } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import {
  ORGANIZATION_BRANDING_SEED_VERSION,
  ORGANIZATION_METODO_ACCENT_COLOR,
  ORGANIZATION_METODO_PRIMARY_COLOR,
  ORGANIZATION_METODO_SECONDARY_COLOR,
} from './organizationBrandingDefaults';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';
import type { OrganizationDefinition } from './organizationTypes';

/**
 * Seed de marca para org nova — sem logos/assets do Método Emagrecer.
 * O admin configura identidade em MAG → Organização → Marca.
 */
export function buildNewOrganizationBrandingSeed(
  organization: OrganizationDefinition,
): OrganizationBrandingStored {
  const now = new Date().toISOString();
  return {
    publicName: organization.name,
    legalName: null,
    slogan: null,
    defaultDescription: DEFAULT_WHITE_LABEL_DESCRIPTION,
    logoMainUrl: null,
    logoDarkUrl: null,
    logoLightUrl: null,
    iconUrl: null,
    faviconUrl: null,
    ogImageUrl: null,
    pdfLogoUrl: null,
    watermarkUrl: null,
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
    publicPages: {
      dr: {
        backgroundColor: DEFAULT_DR_PAGE_BACKGROUND,
        textColor: DEFAULT_DR_PAGE_TEXT,
        logoUrl: null,
      },
      aplicacao: {
        backgroundColor: DEFAULT_APLICACAO_PAGE_BACKGROUND,
        textColor: DEFAULT_APLICACAO_PAGE_TEXT,
        logoUrl: null,
      },
      conclusao: {
        backgroundColor: DEFAULT_CONCLUSAO_PAGE_BACKGROUND,
        textColor: DEFAULT_CONCLUSAO_PAGE_TEXT,
        logoUrl: null,
      },
    },
    instagramBioDefaults: {
      headline: INSTAGRAM_BIO_TEXT_DEFAULTS.headline,
      subtitle: INSTAGRAM_BIO_TEXT_DEFAULTS.subtitle,
      contactButtonLabel: INSTAGRAM_BIO_TEXT_DEFAULTS.contactButtonLabel,
      contactModalText: INSTAGRAM_BIO_TEXT_DEFAULTS.contactModalText,
      profilePrompt: INSTAGRAM_BIO_TEXT_DEFAULTS.profilePrompt,
      emagrecerCtaLabel: INSTAGRAM_BIO_TEXT_DEFAULTS.emagrecerCtaLabel,
      emagrecimentoUrl: organization.primaryOrigin,
    },
    instagramUrl: null,
    siteUrl: organization.primaryOrigin,
    showPoweredByOftware: true,
    seedVersion: ORGANIZATION_BRANDING_SEED_VERSION,
    seededAt: now,
    updatedAt: now,
  };
}
