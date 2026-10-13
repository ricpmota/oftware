import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import {
  ORGANIZATION_METODO_SECONDARY_COLOR,
  pickColor,
} from '@/lib/organization/organizationBrandingDefaults';
import type { OrganizationBrandingStored } from '@/lib/organization/organizationBrandingTypes';
import {
  METODO_ORGANIZATION_ID,
  getDefaultOrganization,
} from '@/lib/organization/organizationRegistry';
import type { OrganizationId } from '@/lib/organization/organizationTypes';

export type ShellOrganizationBranding = {
  publicName: string;
  logoMainUrl: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  iconUrl: string | null;
  faviconUrl: string | null;
  pdfLogoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
};

export type ShellOrganizationBrandingPayload = {
  organizationId: OrganizationId;
  branding: ShellOrganizationBranding;
};

export function toShellOrganizationBranding(
  branding: Pick<
    OrganizationBrandingStored,
    | 'publicName'
    | 'logoMainUrl'
    | 'logoDarkUrl'
    | 'logoLightUrl'
    | 'iconUrl'
    | 'faviconUrl'
    | 'pdfLogoUrl'
    | 'primaryColor'
    | 'secondaryColor'
    | 'accentColor'
  >,
  options?: { secondaryColorFallback?: string },
): ShellOrganizationBranding {
  return {
    publicName: branding.publicName,
    logoMainUrl: branding.logoMainUrl,
    logoLightUrl: branding.logoLightUrl ?? null,
    logoDarkUrl: branding.logoDarkUrl ?? null,
    iconUrl: branding.iconUrl ?? null,
    faviconUrl: branding.faviconUrl ?? null,
    pdfLogoUrl: branding.pdfLogoUrl ?? null,
    primaryColor: branding.primaryColor,
    secondaryColor: pickColor(
      branding.secondaryColor,
      options?.secondaryColorFallback ?? ORGANIZATION_METODO_SECONDARY_COLOR,
    ),
    accentColor: branding.accentColor?.trim() || null,
  };
}

/**
 * Marca padrão do Método. Os portais autenticados usam loadMemberOrganizationBranding.
 */
export async function getDefaultShellOrganizationBranding(): Promise<ShellOrganizationBrandingPayload> {
  const organizationId = (getDefaultOrganization().id || METODO_ORGANIZATION_ID) as OrganizationId;
  const branding = await getOrganizationBranding(organizationId);
  return {
    organizationId,
    branding: toShellOrganizationBranding(branding),
  };
}
