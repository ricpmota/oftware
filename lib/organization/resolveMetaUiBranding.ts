import {
  ORGANIZATION_METODO_ACCENT_COLOR,
  ORGANIZATION_METODO_PRIMARY_COLOR,
  ORGANIZATION_METODO_SECONDARY_COLOR,
  isValidHexColor,
} from './organizationBrandingDefaults';
import { METODO_ORGANIZATION, METODO_ORGANIZATION_ID } from './organizationRegistry';
import { DEFAULT_APLICACAO_PAGE_BACKGROUND, DEFAULT_DR_PAGE_TEXT, DEFAULT_PUBLIC_PAGE_LOGO_SRC } from '@/lib/whiteLabel/publicPagesTheme';
import type { PatientOrganizationBrandingPublic, PatientOrganizationBrandingValue } from './patientOrganizationBranding';

export type MetaUiBrandingDivergence = {
  field: string;
  hardcoded: string;
  remote: string;
};

/** Valores prontos para a UI do /meta — sempre preenchidos (fallback oficial). */
export type MetaUiBranding = {
  publicName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  divergences: MetaUiBrandingDivergence[];
};

const OFFICIAL_DEFAULTS: Omit<MetaUiBranding, 'divergences'> = {
  publicName: METODO_ORGANIZATION.name,
  logoUrl: DEFAULT_PUBLIC_PAGE_LOGO_SRC,
  primaryColor: ORGANIZATION_METODO_PRIMARY_COLOR,
  secondaryColor: ORGANIZATION_METODO_SECONDARY_COLOR,
  accentColor: ORGANIZATION_METODO_ACCENT_COLOR,
  backgroundColor: ORGANIZATION_METODO_SECONDARY_COLOR,
  surfaceColor: DEFAULT_APLICACAO_PAGE_BACKGROUND,
  textColor: DEFAULT_DR_PAGE_TEXT,
};

function normalizeHex(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const short = trimmed.match(/^#([0-9a-f]{3})$/);
  if (short?.[1]) {
    const [r, g, b] = short[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return trimmed;
}

function hexesEqual(a: string, b: string): boolean {
  return normalizeHex(a) === normalizeHex(b);
}

function textsEqual(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

/**
 * Organização piloto: se o Firestore divergir do visual atual, não redesenhar.
 * Outras orgs recebem o branding remoto (hex/URL válidos).
 */
function shouldLockToOfficialDefaults(organizationId: string | null): boolean {
  return !organizationId || organizationId === METODO_ORGANIZATION_ID;
}

function pickLockedValue(
  field: string,
  remote: string | null | undefined,
  official: string,
  lock: boolean,
  isColor: boolean,
  divergences: MetaUiBrandingDivergence[],
): string {
  const value = (remote || '').trim();
  if (!value) return official;
  if (isColor && !isValidHexColor(value)) return official;

  if (lock) {
    const same = isColor ? hexesEqual(value, official) : textsEqual(value, official);
    if (!same) {
      divergences.push({ field, hardcoded: official, remote: value });
    }
    return official;
  }

  return value;
}

export function resolveMetaUiBranding(
  branding: PatientOrganizationBrandingValue | null | undefined,
): MetaUiBranding {
  const remote: PatientOrganizationBrandingPublic | null = branding?.branding ?? null;
  const lock = shouldLockToOfficialDefaults(branding?.organizationId ?? null);
  const divergences: MetaUiBrandingDivergence[] = [];

  if (!remote) {
    return { ...OFFICIAL_DEFAULTS, divergences };
  }

  return {
    publicName: pickLockedValue(
      'publicName',
      remote.publicName,
      OFFICIAL_DEFAULTS.publicName,
      lock,
      false,
      divergences,
    ),
    logoUrl: pickLockedValue(
      'logoUrl',
      remote.logoMainUrl,
      OFFICIAL_DEFAULTS.logoUrl,
      lock,
      false,
      divergences,
    ),
    primaryColor: pickLockedValue(
      'primaryColor',
      remote.primaryColor,
      OFFICIAL_DEFAULTS.primaryColor,
      lock,
      true,
      divergences,
    ),
    secondaryColor: pickLockedValue(
      'secondaryColor',
      remote.secondaryColor,
      OFFICIAL_DEFAULTS.secondaryColor,
      lock,
      true,
      divergences,
    ),
    accentColor: pickLockedValue(
      'accentColor',
      remote.accentColor,
      OFFICIAL_DEFAULTS.accentColor,
      lock,
      true,
      divergences,
    ),
    backgroundColor: pickLockedValue(
      'backgroundColor',
      remote.backgroundColor,
      OFFICIAL_DEFAULTS.backgroundColor,
      lock,
      true,
      divergences,
    ),
    surfaceColor: pickLockedValue(
      'surfaceColor',
      remote.surfaceColor,
      OFFICIAL_DEFAULTS.surfaceColor,
      lock,
      true,
      divergences,
    ),
    textColor: pickLockedValue(
      'textColor',
      remote.textColor,
      OFFICIAL_DEFAULTS.textColor,
      lock,
      true,
      divergences,
    ),
    divergences,
  };
}

/** CSS vars apenas no container do /meta — não aplicar em :root. */
export function metaUiBrandingCssVars(ui: MetaUiBranding): Record<string, string> {
  return {
    '--org-primary': ui.primaryColor,
    '--org-secondary': ui.secondaryColor,
    '--org-accent': ui.accentColor,
    '--org-background': ui.backgroundColor,
    '--org-surface': ui.surfaceColor,
    '--org-text': ui.textColor,
  };
}
