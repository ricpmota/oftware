import type { MedicoWhiteLabelStored } from '@/types/medico';

export const DEFAULT_DR_PAGE_BACKGROUND = '#0A1F44';
/** Fundo padrão original das páginas de aplicação e conclusão (Tailwind gray-50). */
export const DEFAULT_APLICACAO_PAGE_BACKGROUND = '#F9FAFB';
export const DEFAULT_CONCLUSAO_PAGE_BACKGROUND = '#F9FAFB';
export const DEFAULT_DR_PAGE_TEXT = '#E8EDED';
/** Texto padrão fora dos cards (Tailwind gray-700). */
export const DEFAULT_APLICACAO_PAGE_TEXT = '#374151';
export const DEFAULT_CONCLUSAO_PAGE_TEXT = '#374151';
export const DEFAULT_PUBLIC_PAGE_LOGO_SRC = '/metodo-emagrecer-logotipo-28.png';

/** @deprecated use DEFAULT_DR_PAGE_BACKGROUND */
export const DEFAULT_PAGE_BACKGROUND_COLOR = DEFAULT_DR_PAGE_BACKGROUND;

export type PublicPageKind = 'dr' | 'aplicacao' | 'conclusao';

export interface PublicPageThemeResolved {
  backgroundColor: string;
  textColor: string;
  logoUrl: string | null;
}

export interface MedicoPublicPagesResolved {
  dr: PublicPageThemeResolved;
  aplicacao: PublicPageThemeResolved;
  conclusao: PublicPageThemeResolved;
}

function defaultBackgroundFor(kind: PublicPageKind): string {
  if (kind === 'dr') return DEFAULT_DR_PAGE_BACKGROUND;
  if (kind === 'aplicacao') return DEFAULT_APLICACAO_PAGE_BACKGROUND;
  return DEFAULT_CONCLUSAO_PAGE_BACKGROUND;
}

function defaultTextFor(kind: PublicPageKind): string {
  if (kind === 'dr') return DEFAULT_DR_PAGE_TEXT;
  if (kind === 'aplicacao') return DEFAULT_APLICACAO_PAGE_TEXT;
  return DEFAULT_CONCLUSAO_PAGE_TEXT;
}

function storedBackgroundFor(
  wl: MedicoWhiteLabelStored | null | undefined,
  kind: PublicPageKind
): string | undefined {
  if (kind === 'dr') return wl?.drPageBackgroundColor;
  if (kind === 'aplicacao') return wl?.aplicacaoPageBackgroundColor;
  return wl?.conclusaoPageBackgroundColor;
}

function storedLogoFor(
  wl: MedicoWhiteLabelStored | null | undefined,
  kind: PublicPageKind
): string | undefined {
  if (kind === 'dr') return wl?.drPageLogoUrl;
  if (kind === 'aplicacao') return wl?.aplicacaoPageLogoUrl;
  return wl?.conclusaoPageLogoUrl;
}

function storedTextFor(
  wl: MedicoWhiteLabelStored | null | undefined,
  kind: PublicPageKind
): string | undefined {
  if (kind === 'dr') return wl?.drPageTextColor;
  if (kind === 'aplicacao') return wl?.aplicacaoPageTextColor;
  return wl?.conclusaoPageTextColor;
}

function isValidHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

export function resolvePublicPageTheme(
  wl: MedicoWhiteLabelStored | null | undefined,
  kind: PublicPageKind
): PublicPageThemeResolved {
  const legacyBg = wl?.pageBackgroundColor?.trim();
  const legacyLogo = wl?.publicPageLogoUrl?.trim() || null;

  const bgRaw = storedBackgroundFor(wl, kind)?.trim() || legacyBg;
  const backgroundColor =
    bgRaw && isValidHexColor(bgRaw) ? bgRaw : defaultBackgroundFor(kind);

  const logoUrl = storedLogoFor(wl, kind)?.trim() || legacyLogo || null;

  const textRaw = storedTextFor(wl, kind)?.trim();
  const textColor = textRaw && isValidHexColor(textRaw) ? textRaw : defaultTextFor(kind);

  return { backgroundColor, textColor, logoUrl };
}

export function resolveMedicoPublicPages(
  wl: MedicoWhiteLabelStored | null | undefined
): MedicoPublicPagesResolved {
  return {
    dr: resolvePublicPageTheme(wl, 'dr'),
    aplicacao: resolvePublicPageTheme(wl, 'aplicacao'),
    conclusao: resolvePublicPageTheme(wl, 'conclusao'),
  };
}

export function publicPagesFormFromStored(wl: MedicoWhiteLabelStored | null | undefined): {
  drPageBackgroundColor: string;
  drPageTextColor: string;
  drPageLogoUrl: string | null;
  aplicacaoPageBackgroundColor: string;
  aplicacaoPageTextColor: string;
  aplicacaoPageLogoUrl: string | null;
  conclusaoPageBackgroundColor: string;
  conclusaoPageTextColor: string;
  conclusaoPageLogoUrl: string | null;
} {
  const pages = resolveMedicoPublicPages(wl);
  return {
    drPageBackgroundColor: pages.dr.backgroundColor,
    drPageTextColor: pages.dr.textColor,
    drPageLogoUrl: pages.dr.logoUrl,
    aplicacaoPageBackgroundColor: pages.aplicacao.backgroundColor,
    aplicacaoPageTextColor: pages.aplicacao.textColor,
    aplicacaoPageLogoUrl: pages.aplicacao.logoUrl,
    conclusaoPageBackgroundColor: pages.conclusao.backgroundColor,
    conclusaoPageTextColor: pages.conclusao.textColor,
    conclusaoPageLogoUrl: pages.conclusao.logoUrl,
  };
}

export function publicPageCustomLogoUrl(
  theme: PublicPageThemeResolved | null | undefined
): string | null {
  return theme?.logoUrl?.trim() || null;
}

/** URL para exibição: só logo customizada; sem fallback Método Emagrecer. */
export function resolvePublicPageLogoSrc(theme: PublicPageThemeResolved | null | undefined): string | null {
  return publicPageCustomLogoUrl(theme);
}

/** Prévia no admin quando ainda não há logo enviada. */
export function resolvePublicPageLogoPreviewSrc(
  theme: PublicPageThemeResolved | null | undefined
): string {
  return publicPageCustomLogoUrl(theme) || DEFAULT_PUBLIC_PAGE_LOGO_SRC;
}

export const PUBLIC_PAGE_DEFAULT_BACKGROUNDS: Record<PublicPageKind, string> = {
  dr: DEFAULT_DR_PAGE_BACKGROUND,
  aplicacao: DEFAULT_APLICACAO_PAGE_BACKGROUND,
  conclusao: DEFAULT_CONCLUSAO_PAGE_BACKGROUND,
};

export const PUBLIC_PAGE_DEFAULT_TEXT_COLORS: Record<PublicPageKind, string> = {
  dr: DEFAULT_DR_PAGE_TEXT,
  aplicacao: DEFAULT_APLICACAO_PAGE_TEXT,
  conclusao: DEFAULT_CONCLUSAO_PAGE_TEXT,
};

export const PUBLIC_PAGE_LABELS: Record<PublicPageKind, string> = {
  dr: 'Meu Link',
  aplicacao: 'Aplicações',
  conclusao: 'Conclusão',
};
