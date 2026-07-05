import type { OrganizationId } from './organizationTypes';

export type OrganizationBrandingSourceLayer =
  | 'firestore'
  | 'platformSettings'
  | 'sourceMedico'
  | 'hardcoded';

export interface OrganizationBrandingPublicPageTheme {
  backgroundColor: string;
  textColor: string;
  logoUrl: string | null;
}

export interface OrganizationBrandingPublicPages {
  dr: OrganizationBrandingPublicPageTheme;
  aplicacao: OrganizationBrandingPublicPageTheme;
  conclusao: OrganizationBrandingPublicPageTheme;
}

export interface OrganizationBrandingInstagramBioDefaults {
  headline: string;
  subtitle: string;
  contactButtonLabel: string;
  contactModalText: string;
  profilePrompt: string;
  emagrecerCtaLabel: string;
  emagrecimentoUrl: string;
}

/** Identidade visual persistida em `organizations/{organizationId}.branding`. */
export interface OrganizationBrandingStored {
  publicName: string;
  legalName?: string | null;
  slogan?: string | null;
  defaultDescription: string;
  logoMainUrl: string | null;
  logoDarkUrl?: string | null;
  logoLightUrl?: string | null;
  iconUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  pdfLogoUrl: string | null;
  watermarkUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string | null;
  backgroundColor?: string | null;
  surfaceColor?: string | null;
  textColor?: string | null;
  mutedTextColor?: string | null;
  borderColor?: string | null;
  successColor?: string | null;
  warningColor?: string | null;
  errorColor?: string | null;
  publicPages: OrganizationBrandingPublicPages;
  instagramBioDefaults: OrganizationBrandingInstagramBioDefaults;
  instagramUrl?: string | null;
  siteUrl: string;
  showPoweredByOftware: boolean;
  seedVersion?: string;
  seededAt?: string | null;
  updatedAt?: string | null;
}

export interface OrganizationBrandingResolved extends OrganizationBrandingStored {
  organizationId: OrganizationId;
  sourceLayer: OrganizationBrandingSourceLayer;
}

export interface OrganizationBrandingLegacySourcesSummary {
  hasPlatformMetodoImagens: boolean;
  hasSourceMedicoWhiteLabel: boolean;
  sourceMedicoEmail: string;
}

export interface OrganizationBrandingApiResponse {
  branding: OrganizationBrandingResolved;
  firestoreDocExists: boolean;
  firestoreBrandingExists: boolean;
  /** @deprecated use consolidatedNow — mantido por compatibilidade de API */
  seededNow: boolean;
  consolidatedNow: boolean;
  legacySources: OrganizationBrandingLegacySourcesSummary;
}
