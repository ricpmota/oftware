import { isDarkShellColor } from './resolveOrganizationShellChrome';

/** Campos mínimos da Marca da Organização usados no shell (sidebar, header). */
export type OrganizationShellLogoBranding = {
  logoDarkUrl?: string | null;
  logoLightUrl?: string | null;
  logoMainUrl?: string | null;
  iconUrl?: string | null;
};

/** Fallback neutro da plataforma. Não é a marca de uma organização. */
export const PLATFORM_SHELL_LOGO_SRC = '/logo.png';

const DEFAULT_SHELL_LOGO_FALLBACK = PLATFORM_SHELL_LOGO_SRC;

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
  options: { darkBackground?: boolean; backgroundColor?: string | null; fallbackSrc?: string },
): string {
  const fallback = options.fallbackSrc?.trim() || DEFAULT_SHELL_LOGO_FALLBACK;
  const darkBackground = options.backgroundColor?.trim()
    ? isDarkShellColor(options.backgroundColor)
    : Boolean(options.darkBackground);
  if (!branding) return fallback;

  const main = pickUrl(branding.logoMainUrl);
  const dark = pickUrl(branding.logoDarkUrl);
  const light = pickUrl(branding.logoLightUrl);
  const icon = pickUrl(branding.iconUrl);
  const preferred = darkBackground ? light : dark;
  const alternate = darkBackground ? dark : light;

  return preferred ?? main ?? icon ?? alternate ?? fallback;
}

export function isPlatformShellLogo(src: string | null | undefined): boolean {
  return !src?.trim() || src.trim() === PLATFORM_SHELL_LOGO_SRC;
}

/**
 * O menu mobile do Método mantém o ícone atual.
 * Outra organização só troca esse ícone quando há arquivo institucional.
 */
export function shouldShowOrganizationLogoInMobileHeader(
  organizationId: string | null | undefined,
  logoSrc: string | null | undefined,
): boolean {
  const id = (organizationId || '').trim();
  if (!id || id === 'metodo') return false;
  return !isPlatformShellLogo(logoSrc);
}
