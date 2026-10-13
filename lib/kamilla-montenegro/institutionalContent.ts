import { isMetodoBrandAsset } from '@/lib/whiteLabel/metodoBrandAssets';

/**
 * Documento real no Firestore. O id pedido na conversa (`kamilla-montenegro`)
 * não existe; a organização ativa do domínio é esta.
 */
export const KAMILA_ORGANIZATION_ID = 'kamila-montenegro';

const GENERIC_DESCRIPTION =
  'Acompanhamento médico personalizado com equipe multidisciplinar integrada.';

const METODO_COLORS = new Set(['#4CCB7A', '#0A1F44', '#30F278']);

export type KamillaTheme = {
  canvas: string;
  paper: string;
  heading: string;
  sage: string;
  ink: string;
  line: string;
  onHeading: string;
};

/** Apresentação temporária. Não representa a paleta oficial. */
export const KAMILLA_NEUTRAL_THEME: KamillaTheme = {
  canvas: '#F7F5F2',
  paper: '#EFEAE4',
  heading: '#2F2C29',
  sage: '#8A847C',
  ink: '#3F3B37',
  line: '#E4DED6',
  onHeading: '#F7F5F2',
};

export type KamillaInstitutionalContent = {
  source: 'firestore' | 'neutral';
  organizationId: string;
  publicName: string;
  description: string | null;
  legalName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  instagramUrl: string | null;
  /** Canal de agendamento confirmado. Instagram não conta. */
  scheduleHref: string | null;
  showPoweredByOftware: boolean;
  theme: KamillaTheme;
  themeSource: 'firestore' | 'neutral';
};

export function neutralKamillaContent(): KamillaInstitutionalContent {
  return {
    source: 'neutral',
    organizationId: KAMILA_ORGANIZATION_ID,
    publicName: 'Kamila Montenegro',
    description: null,
    legalName: null,
    logoUrl: null,
    faviconUrl: null,
    instagramUrl: null,
    scheduleHref: null,
    showPoweredByOftware: false,
    theme: KAMILLA_NEUTRAL_THEME,
    themeSource: 'neutral',
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function hexOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) return null;
  const normalized =
    trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase()
      : trimmed.toUpperCase();
  if (METODO_COLORS.has(normalized)) return null;
  return normalized;
}

function publicUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || isMetodoBrandAsset(trimmed)) return null;
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) return null;
  return trimmed;
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function themeFromColors(raw: Record<string, unknown>): {
  theme: KamillaTheme;
  themeSource: 'firestore' | 'neutral';
} {
  const primary = hexOrNull(raw.primaryColor);
  const secondary = hexOrNull(raw.secondaryColor);
  const accent = hexOrNull(raw.accentColor);
  const surface = hexOrNull(raw.surfaceColor);
  const ink = hexOrNull(raw.mutedTextColor);
  const line = hexOrNull(raw.borderColor);
  if (!primary || !secondary || !accent || !surface || !ink) {
    return { theme: KAMILLA_NEUTRAL_THEME, themeSource: 'neutral' };
  }
  return {
    themeSource: 'firestore',
    theme: {
      canvas: surface,
      paper: accent,
      heading: primary,
      sage: secondary,
      ink,
      line: line ?? '#E5E7EB',
      onHeading: accent,
    },
  };
}

/**
 * Lê só campos institucionais. O fundo escuro cadastrado (`backgroundColor`)
 * fica de fora: esta home é clara e usa superfície, acento, primária e texto.
 */
export function parseKamillaInstitutionalBranding(
  raw: unknown,
): KamillaInstitutionalContent | null {
  const branding = asRecord(raw);
  const publicName = textOrNull(branding.publicName);
  if (!publicName) return null;

  const descriptionRaw = textOrNull(branding.defaultDescription);
  const description =
    descriptionRaw && descriptionRaw !== GENERIC_DESCRIPTION ? descriptionRaw : null;
  const { theme, themeSource } = themeFromColors(branding);

  return {
    source: 'firestore',
    organizationId: KAMILA_ORGANIZATION_ID,
    publicName,
    description,
    legalName: textOrNull(branding.legalName),
    logoUrl:
      publicUrl(branding.logoDarkUrl) ??
      publicUrl(branding.logoMainUrl) ??
      publicUrl(branding.iconUrl),
    faviconUrl: publicUrl(branding.faviconUrl) ?? publicUrl(branding.iconUrl),
    instagramUrl: publicUrl(branding.instagramUrl),
    scheduleHref: null,
    showPoweredByOftware: branding.showPoweredByOftware === true,
    theme,
    themeSource,
  };
}
