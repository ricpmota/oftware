export type OrganizationShellBrandingFields = {
  publicName: string;
  logoMainUrl: string | null;
  logoDarkUrl: string | null;
  logoLightUrl: string | null;
  iconUrl: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
};

export type OrganizationShellBrandingRead = {
  organizationId: string | null;
  organizationMatch: boolean;
  branding: OrganizationShellBrandingFields | null;
};

function optionalUrl(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Lê o JSON das APIs de branding sem aceitar organizationId vindo de outro lugar. */
export function readOrganizationShellBrandingResponse(json: unknown): OrganizationShellBrandingRead {
  const body = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
  const organizationId =
    typeof body.organizationId === 'string' && body.organizationId.trim()
      ? body.organizationId.trim()
      : null;
  const organizationMatch = body.organizationMatch !== false;
  const raw = body.branding;
  if (!raw || typeof raw !== 'object') {
    return { organizationId, organizationMatch, branding: null };
  }
  const branding = raw as Record<string, unknown>;
  return {
    organizationId,
    organizationMatch,
    branding: {
      publicName: typeof branding.publicName === 'string' ? branding.publicName : '',
      logoMainUrl: optionalUrl(branding.logoMainUrl),
      logoDarkUrl: optionalUrl(branding.logoDarkUrl),
      logoLightUrl: optionalUrl(branding.logoLightUrl),
      iconUrl: optionalUrl(branding.iconUrl),
      primaryColor: optionalUrl(branding.primaryColor),
      secondaryColor: optionalUrl(branding.secondaryColor),
      accentColor: optionalUrl(branding.accentColor),
    },
  };
}
