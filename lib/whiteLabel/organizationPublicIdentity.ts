import type { MedicoWhiteLabelStored } from '@/types/medico';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import { readableForeground } from '@/lib/organization/resolveOrganizationShellChrome';
import { isMetodoBrandAsset } from '@/lib/whiteLabel/metodoBrandAssets';
import {
  DEFAULT_APLICACAO_PAGE_BACKGROUND,
  DEFAULT_APLICACAO_PAGE_TEXT,
  DEFAULT_CONCLUSAO_PAGE_BACKGROUND,
  DEFAULT_CONCLUSAO_PAGE_TEXT,
  type PublicPageKind,
  type PublicPageThemeResolved,
} from '@/lib/whiteLabel/publicPagesTheme';
import {
  DEFAULT_WHITE_LABEL_DESCRIPTION,
  medicoDisplayTitle,
  type MedicoWhiteLabelResolved,
  type MedicoWhiteLabelSource,
} from '@/lib/whiteLabel/resolveMedicoWhiteLabel';

/** Fundo neutro do /dr quando a organização não define cor. */
export const ORGANIZATION_PUBLIC_NEUTRAL_DR_BACKGROUND = '#111827';
/** Destaque neutro (botões e selos) quando a organização não define `primaryColor`. */
export const ORGANIZATION_PUBLIC_NEUTRAL_ACCENT = '#374151';

/**
 * - `legacy`: médico sem `organizationId`. Mantém o fluxo atual (Método legado).
 * - `metodo`: vínculo explícito com o Método. Mantém o fluxo atual.
 * - `organization`: outra organização. Marca vem só de `organizations/{id}.branding`.
 */
export type PublicPageIdentityRoute =
  | { kind: 'legacy' }
  | { kind: 'metodo' }
  | { kind: 'organization'; organizationId: string };

/** Usa apenas o `organizationId` gravado no documento do médico. `metodoImagensAtivo` não muda a rota. */
export function resolvePublicPageIdentityRoute(medico: {
  organizationId?: string | null;
}): PublicPageIdentityRoute {
  const id = (medico.organizationId || '').trim();
  if (!id) return { kind: 'legacy' };
  if (id === METODO_ORGANIZATION_ID) return { kind: 'metodo' };
  return { kind: 'organization', organizationId: id };
}

export type OrganizationPublicPageBranding = {
  backgroundColor: string | null;
  textColor: string | null;
  logoUrl: string | null;
};

/** Campos de `organizations/{id}.branding` usados nas páginas públicas, sem fallbacks do Método. */
export type OrganizationPublicBranding = {
  organizationId: string;
  defaultDescription: string | null;
  logoMainUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  iconUrl: string | null;
  ogImageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  surfaceColor: string | null;
  textColor: string | null;
  mutedTextColor: string | null;
  showPoweredByOftware: boolean | null;
  publicPages: Record<PublicPageKind, OrganizationPublicPageBranding>;
};

function isValidHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}

function hexOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && isValidHexColor(trimmed) ? trimmed : null;
}

function brandUrlOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || isMetodoBrandAsset(trimmed)) return null;
  return trimmed;
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function parsePage(raw: unknown): OrganizationPublicPageBranding {
  const page = asRecord(raw);
  return {
    backgroundColor: hexOrNull(page.backgroundColor),
    textColor: hexOrNull(page.textColor),
    logoUrl: brandUrlOrNull(page.logoUrl),
  };
}

/** Leitura tolerante do branding bruto. Campos ausentes ficam `null` e nunca herdam o Método. */
export function parseOrganizationPublicBranding(
  organizationId: string,
  raw: unknown,
): OrganizationPublicBranding {
  const branding = asRecord(raw);
  const pages = asRecord(branding.publicPages);
  return {
    organizationId,
    defaultDescription: textOrNull(branding.defaultDescription),
    logoMainUrl: brandUrlOrNull(branding.logoMainUrl),
    logoDarkUrl: brandUrlOrNull(branding.logoDarkUrl),
    faviconUrl: brandUrlOrNull(branding.faviconUrl),
    iconUrl: brandUrlOrNull(branding.iconUrl),
    ogImageUrl: brandUrlOrNull(branding.ogImageUrl),
    primaryColor: hexOrNull(branding.primaryColor),
    secondaryColor: hexOrNull(branding.secondaryColor),
    surfaceColor: hexOrNull(branding.surfaceColor),
    textColor: hexOrNull(branding.textColor),
    mutedTextColor: hexOrNull(branding.mutedTextColor),
    showPoweredByOftware:
      typeof branding.showPoweredByOftware === 'boolean' ? branding.showPoweredByOftware : null,
    publicPages: {
      dr: parsePage(pages.dr),
      aplicacao: parsePage(pages.aplicacao),
      conclusao: parsePage(pages.conclusao),
    },
  };
}

/**
 * Tema de uma página pública da organização. Prioridade:
 * cor da página → cor institucional genérica → neutro.
 * Logo: logo da página → logo principal → nenhuma.
 */
export function resolveOrganizationPublicPageTheme(
  branding: OrganizationPublicBranding | null,
  kind: PublicPageKind,
): PublicPageThemeResolved {
  const page = branding?.publicPages[kind];
  const logoUrl = page?.logoUrl ?? branding?.logoMainUrl ?? null;

  if (kind === 'dr') {
    const backgroundColor =
      page?.backgroundColor ?? branding?.secondaryColor ?? ORGANIZATION_PUBLIC_NEUTRAL_DR_BACKGROUND;
    const textColor = page?.textColor ?? readableForeground(backgroundColor, branding?.textColor);
    return { backgroundColor, textColor, logoUrl };
  }

  const fallbackBackground =
    kind === 'aplicacao' ? DEFAULT_APLICACAO_PAGE_BACKGROUND : DEFAULT_CONCLUSAO_PAGE_BACKGROUND;
  const fallbackText = kind === 'aplicacao' ? DEFAULT_APLICACAO_PAGE_TEXT : DEFAULT_CONCLUSAO_PAGE_TEXT;
  const backgroundColor = page?.backgroundColor ?? branding?.surfaceColor ?? fallbackBackground;
  const textColor =
    page?.textColor ?? readableForeground(backgroundColor, branding?.mutedTextColor ?? fallbackText);
  return { backgroundColor, textColor, logoUrl };
}

/**
 * White label público de médico de organização diferente do Método.
 * Institucional (organização): cores, logos, favicon, imagem de compartilhamento, destaque, "Powered by".
 * Individual (`medicos.whiteLabel`): somente nome de exibição e descrição.
 */
export function resolveOrganizationMedicoWhiteLabel(
  medico: MedicoWhiteLabelSource,
  branding: OrganizationPublicBranding | null,
): MedicoWhiteLabelResolved {
  const stored = medico.whiteLabel as MedicoWhiteLabelStored | null | undefined;
  const brandName = (stored?.brandName?.trim() || medicoDisplayTitle(medico)).slice(0, 60);
  const description = (
    stored?.description?.trim() ||
    branding?.defaultDescription ||
    DEFAULT_WHITE_LABEL_DESCRIPTION
  ).slice(0, 160);
  const profilePhotoUrl = medico.fotoPerfilUrl?.trim() || null;
  const primaryColor = branding?.primaryColor ?? ORGANIZATION_PUBLIC_NEUTRAL_ACCENT;

  return {
    brandName,
    description,
    ogImageUrl: branding?.ogImageUrl ?? branding?.logoMainUrl ?? profilePhotoUrl,
    profilePhotoUrl,
    faviconUrl: branding?.faviconUrl ?? branding?.iconUrl ?? null,
    primaryColor,
    publicPages: {
      dr: resolveOrganizationPublicPageTheme(branding, 'dr'),
      aplicacao: resolveOrganizationPublicPageTheme(branding, 'aplicacao'),
      conclusao: resolveOrganizationPublicPageTheme(branding, 'conclusao'),
    },
    showPoweredByOftware: branding?.showPoweredByOftware ?? true,
    organizationIdentity: {
      organizationId: (medico.organizationId || '').trim() || branding?.organizationId || null,
      footerLogoUrl: branding?.logoDarkUrl ?? branding?.logoMainUrl ?? null,
      accentTextColor: readableForeground(primaryColor),
    },
  };
}
