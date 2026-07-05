/** Campos mínimos da Marca da Organização usados no shell (sidebar, header). */
export type OrganizationShellLogoBranding = {
  logoDarkUrl?: string | null;
  logoLightUrl?: string | null;
  logoMainUrl?: string | null;
};

const DEFAULT_SHELL_LOGO_FALLBACK = '/logo.png';

function pickUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

/**
 * Logo da sidebar/header conforme contraste do fundo:
 * - fundo escuro → logo clara
 * - fundo claro → logo escura
 */
export function resolveOrganizationShellLogoUrl(
  branding: OrganizationShellLogoBranding | null | undefined,
  options: { darkBackground: boolean; fallbackSrc?: string },
): string {
  const fallback = options.fallbackSrc?.trim() || DEFAULT_SHELL_LOGO_FALLBACK;
  if (!branding) return fallback;

  const main = pickUrl(branding.logoMainUrl);
  const dark = pickUrl(branding.logoDarkUrl);
  const light = pickUrl(branding.logoLightUrl);

  if (options.darkBackground) {
    return light ?? main ?? fallback;
  }
  return dark ?? main ?? fallback;
}
