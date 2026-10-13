import {
  ORGANIZATION_METODO_ACCENT_COLOR,
  ORGANIZATION_METODO_PRIMARY_COLOR,
  ORGANIZATION_METODO_SECONDARY_COLOR,
  isValidHexColor,
} from './organizationBrandingDefaults';
import { METODO_ORGANIZATION_ID } from './organizationRegistry';

/** Fundo neutro quando a organização ainda não resolveu ou não tem secundária. */
export const ORGANIZATION_SHELL_NEUTRAL_SECONDARY = '#111827';
/** Destaque neutro sobre fundo escuro. Não é o verde do Método. */
export const ORGANIZATION_SHELL_NEUTRAL_PRIMARY = '#D1D5DB';
export const ORGANIZATION_SHELL_NEUTRAL_ACCENT = '#9CA3AF';
export const ORGANIZATION_SHELL_TEXT_ON_DARK = '#E8EDED';
export const ORGANIZATION_SHELL_TEXT_ON_LIGHT = '#111827';

export type OrganizationShellChromeColors = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
};

export type OrganizationShellChrome = {
  organizationId: string | null;
  /** Só o Método conserva as classes históricas da navegação. */
  useMetodoChrome: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  navText: string;
  navTextMuted: string;
  /** Texto do item ativo. Pode diferir da primária quando ela não atinge contraste. */
  activeText: string;
  /** Texto do item ativo sobre superfície clara (barra inferior branca). */
  activeTextOnLight: string;
  badgeText: string;
  onDark: boolean;
};

/** Contraste mínimo WCAG AA para texto normal. */
export const WCAG_AA_NORMAL_TEXT = 4.5;

export type OrganizationShellSplashProps = {
  backgroundColor: string;
  spinnerClassName: string;
  messageClassName: string;
};

function expandHex(value: string): string | null {
  const trimmed = value.trim();
  if (!isValidHexColor(trimmed)) return null;
  if (trimmed.length === 4) {
    const [hash, r, g, b] = trimmed;
    return `${hash}${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function channel(hex: string, start: number): number {
  return parseInt(hex.slice(start, start + 2), 16) / 255;
}

export function relativeLuminance(hex: string): number {
  const full = expandHex(hex);
  if (!full) return 0;
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const r = linear(channel(full, 1));
  const g = linear(channel(full, 3));
  const b = linear(channel(full, 5));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão WCAG entre duas cores. 1 é o mínimo, 21 é o máximo aproximado. */
export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function isDarkShellColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.45;
}

function mixHex(foreground: string, background: string, foregroundWeight: number): string {
  const fg = expandHex(foreground);
  const bg = expandHex(background);
  if (!fg || !bg) return foreground;
  const weight = Math.min(1, Math.max(0, foregroundWeight));
  const mix = (start: number) =>
    Math.round(
      parseInt(fg.slice(start, start + 2), 16) * weight +
        parseInt(bg.slice(start, start + 2), 16) * (1 - weight),
    );
  const hex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${hex(mix(1))}${hex(mix(3))}${hex(mix(5))}`;
}

/** Compõe uma cor translúcida sobre um fundo opaco. */
export function compositeHex(color: string, background: string, alpha: number): string {
  return mixHex(color, background, alpha);
}

/**
 * Escolhe texto legível sobre o fundo.
 * Se `preferred` já atinge AA, ela é mantida. Caso contrário, entra claro ou escuro neutro.
 */
export function readableForeground(
  background: string,
  preferred?: string | null,
  minimum = WCAG_AA_NORMAL_TEXT,
): string {
  const candidate = preferred?.trim();
  if (candidate && isValidHexColor(candidate) && contrastRatio(candidate, background) >= minimum) {
    return candidate;
  }
  const light = ORGANIZATION_SHELL_TEXT_ON_DARK;
  const dark = ORGANIZATION_SHELL_TEXT_ON_LIGHT;
  const lightRatio = contrastRatio(light, background);
  const darkRatio = contrastRatio(dark, background);
  if (darkRatio >= minimum && lightRatio >= minimum) {
    return darkRatio >= lightRatio ? dark : light;
  }
  if (darkRatio >= minimum) return dark;
  if (lightRatio >= minimum) return light;
  return darkRatio >= lightRatio ? dark : light;
}

function mutedForeground(text: string, background: string): string {
  for (let weight = 0.72; weight <= 1; weight += 0.04) {
    const mixed = mixHex(text, background, weight);
    if (contrastRatio(mixed, background) >= WCAG_AA_NORMAL_TEXT) return mixed;
  }
  return text;
}

function pickHex(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && isValidHexColor(trimmed) ? trimmed : fallback;
}

function withAlpha(hex: string, alpha: number): string {
  const full = expandHex(hex);
  if (!full) return `rgba(17, 24, 39, ${alpha})`;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Cores da navegação a partir da organização autenticada.
 * Org desconhecida ou sem cor não herda #0A1F44 / #4CCB7A.
 * `metodo` permanece na paleta oficial, mesmo se o Firestore divergir.
 */
export function resolveOrganizationShellChrome(input: {
  organizationId?: string | null;
  branding?: OrganizationShellChromeColors | null;
}): OrganizationShellChrome {
  const organizationId = input.organizationId?.trim() || null;
  const useMetodoChrome = organizationId === METODO_ORGANIZATION_ID;

  if (useMetodoChrome) {
    return {
      organizationId,
      useMetodoChrome: true,
      primaryColor: ORGANIZATION_METODO_PRIMARY_COLOR,
      secondaryColor: ORGANIZATION_METODO_SECONDARY_COLOR,
      accentColor: ORGANIZATION_METODO_ACCENT_COLOR,
      navText: ORGANIZATION_SHELL_TEXT_ON_DARK,
      navTextMuted: withAlpha(ORGANIZATION_SHELL_TEXT_ON_DARK, 0.8),
      activeText: ORGANIZATION_METODO_PRIMARY_COLOR,
      activeTextOnLight: ORGANIZATION_METODO_PRIMARY_COLOR,
      badgeText: ORGANIZATION_METODO_PRIMARY_COLOR,
      onDark: true,
    };
  }

  const secondaryColor = pickHex(input.branding?.secondaryColor, ORGANIZATION_SHELL_NEUTRAL_SECONDARY);
  const primaryColor = pickHex(input.branding?.primaryColor, ORGANIZATION_SHELL_NEUTRAL_PRIMARY);
  const accentColor = pickHex(input.branding?.accentColor, ORGANIZATION_SHELL_NEUTRAL_ACCENT);
  const onDark = isDarkShellColor(secondaryColor);
  const navText = readableForeground(secondaryColor);
  const sidebarChip = onDark
    ? compositeHex('#FFFFFF', secondaryColor, 0.1)
    : compositeHex('#000000', secondaryColor, 0.05);
  const lightChip = compositeHex(primaryColor, '#FFFFFF', 0.16);
  const badgeSurface = compositeHex(primaryColor, secondaryColor, 0.16);

  return {
    organizationId,
    useMetodoChrome: false,
    primaryColor,
    secondaryColor,
    accentColor,
    navText,
    navTextMuted: mutedForeground(navText, secondaryColor),
    activeText: readableForeground(sidebarChip, primaryColor),
    activeTextOnLight: readableForeground(lightChip, primaryColor),
    badgeText: readableForeground(badgeSurface, primaryColor),
    onDark,
  };
}

/** Texto institucional sobre card claro. No Método permanece o navy oficial. */
export function organizationDashboardInk(chrome: OrganizationShellChrome, surface = '#FFFFFF'): string {
  if (chrome.useMetodoChrome) return ORGANIZATION_METODO_SECONDARY_COLOR;
  return readableForeground(surface, chrome.secondaryColor);
}

/** Destaque institucional sobre card claro. No Método permanece o verde oficial. */
export function organizationDashboardMark(chrome: OrganizationShellChrome, surface = '#FFFFFF'): string {
  if (chrome.useMetodoChrome) return ORGANIZATION_METODO_PRIMARY_COLOR;
  return readableForeground(surface, chrome.primaryColor);
}

export type OrganizationDashboardHeroPaint = {
  background: string;
  text: string;
  muted: string;
  highlight: string;
  chipBackground: string;
  chipText: string;
  spark: string;
  sparkFill: string;
  totalSeries: string;
  axis: string;
  onDark: boolean;
};

/** Cores do hero. Não altera a primária cadastrada; ajusta o que fica sobre o fundo. */
export function organizationDashboardHeroPaint(chrome: OrganizationShellChrome): OrganizationDashboardHeroPaint {
  const background = chrome.secondaryColor;
  const text = readableForeground(background);
  const muted = mutedForeground(text, background);
  const highlight = readableForeground(background, chrome.primaryColor);
  const chipBackground = text;
  return {
    background,
    text,
    muted,
    highlight,
    chipBackground,
    chipText: readableForeground(chipBackground, chrome.secondaryColor),
    spark: highlight,
    sparkFill: withAlpha(highlight, 0.18),
    totalSeries: highlight,
    axis: muted,
    onDark: isDarkShellColor(background),
  };
}

export type OrganizationPatientDashboardPaint = {
  ink: string;
  mark: string;
  focusRing: string;
  badgeBackground: string;
  badgeText: string;
};

/** Dashboard do paciente em cards brancos. `null` mantém as classes do Método. */
export function organizationPatientDashboardPaint(
  chrome: OrganizationShellChrome | null | undefined,
): OrganizationPatientDashboardPaint | null {
  if (!chrome || chrome.useMetodoChrome) return null;
  const mark = organizationDashboardMark(chrome);
  const badgeBackground = compositeHex(chrome.primaryColor, '#FFFFFF', 0.15);
  return {
    ink: organizationDashboardInk(chrome),
    mark,
    focusRing: withAlpha(mark, 0.3),
    badgeBackground,
    badgeText: readableForeground(badgeBackground, chrome.primaryColor),
  };
}

/**
 * Fundo da área principal no tema escuro. `null` mantém a classe histórica do Método.
 * O conteúdo escuro usa texto claro; secundária clara cede lugar à superfície neutra.
 */
export function organizationDarkPageSurface(chrome: OrganizationShellChrome): string | null {
  if (chrome.useMetodoChrome) return null;
  return chrome.onDark ? chrome.secondaryColor : ORGANIZATION_SHELL_NEUTRAL_SECONDARY;
}

/** Variáveis no container do portal. Não aplicar em :root. */
export function organizationShellCssVars(chrome: OrganizationShellChrome): Record<string, string> {
  return {
    '--org-primary': chrome.primaryColor,
    '--org-secondary': chrome.secondaryColor,
    '--org-accent': chrome.accentColor,
    '--shell-primary': chrome.primaryColor,
    '--shell-secondary': chrome.secondaryColor,
    '--shell-accent': chrome.accentColor,
    '--shell-nav-text': chrome.navText,
    '--shell-nav-muted': chrome.navTextMuted,
    '--shell-active-text': chrome.activeText,
    '--shell-active-on-light': chrome.activeTextOnLight,
    '--shell-badge-text': chrome.badgeText,
    '--shell-primary-soft': withAlpha(chrome.primaryColor, 0.16),
    '--shell-ink': organizationDashboardInk(chrome),
    '--shell-mark': organizationDashboardMark(chrome),
    '--shell-avatar-bg': chrome.useMetodoChrome ? ORGANIZATION_METODO_SECONDARY_COLOR : chrome.secondaryColor,
    '--shell-avatar-text': chrome.useMetodoChrome ? '#FFFFFF' : readableForeground(chrome.secondaryColor),
  };
}

const ORG_SIDEBAR_ACTIVE_DARK =
  'bg-white/10 border-r-2 border-[color:var(--shell-primary)] text-[color:var(--shell-active-text)]';
const ORG_SIDEBAR_ACTIVE_LIGHT =
  'bg-black/5 border-r-2 border-[color:var(--shell-primary)] text-[color:var(--shell-active-text)]';
const ORG_LIGHT_ACTIVE =
  'bg-[color:var(--shell-primary-soft)] text-[color:var(--shell-active-on-light)]';
const ORG_IDLE_DARK =
  'text-[color:var(--shell-nav-muted)] hover:bg-white/10 hover:text-[color:var(--shell-nav-text)]';
const ORG_IDLE_LIGHT =
  'text-[color:var(--shell-nav-muted)] hover:bg-black/5 hover:text-[color:var(--shell-nav-text)]';

/** Classe do item ativo. No Método devolve a classe que já estava na navegação. */
export function organizationShellActiveClass(
  chrome: OrganizationShellChrome,
  metodoActiveClass: string,
  surface: 'dark' | 'light' = 'dark',
): string {
  if (chrome.useMetodoChrome) return metodoActiveClass;
  if (surface === 'light') return ORG_LIGHT_ACTIVE;
  return chrome.onDark ? ORG_SIDEBAR_ACTIVE_DARK : ORG_SIDEBAR_ACTIVE_LIGHT;
}

/** Item inativo e hover. No Método devolve a classe histórica. */
export function organizationShellIdleClass(
  chrome: OrganizationShellChrome,
  metodoIdleClass: string,
): string {
  if (chrome.useMetodoChrome) return metodoIdleClass;
  return chrome.onDark ? ORG_IDLE_DARK : ORG_IDLE_LIGHT;
}

/** Texto ou ícone sobre o fundo da navegação. No Método devolve a classe histórica. */
export function organizationShellForegroundClass(
  chrome: OrganizationShellChrome,
  metodoClass: string,
): string {
  if (chrome.useMetodoChrome) return metodoClass;
  return metodoClass.replace(/text-\[#E8EDED\](?:\/\d+)?/g, 'text-[color:var(--shell-nav-text)]');
}

/** Botão de ícone da navegação. No Método devolve a classe histórica. */
export function organizationShellIconButtonClass(
  chrome: OrganizationShellChrome,
  metodoClass: string,
): string {
  if (chrome.useMetodoChrome) return metodoClass;
  return chrome.onDark
    ? 'text-[color:var(--shell-nav-text)] hover:bg-white/10'
    : 'text-[color:var(--shell-nav-text)] hover:bg-black/5';
}

/** Selo da profissão na sidebar. No Método devolve a classe atual. */
export function organizationShellBadgeClass(
  chrome: OrganizationShellChrome,
  metodoClass: string,
): string {
  if (chrome.useMetodoChrome) return metodoClass;
  return 'inline-flex items-center rounded-full border border-[color:var(--shell-primary)] bg-[color:var(--shell-primary-soft)] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[color:var(--shell-badge-text)]';
}

export function organizationShellSplashProps(chrome: OrganizationShellChrome): OrganizationShellSplashProps {
  if (chrome.useMetodoChrome) {
    return {
      backgroundColor: ORGANIZATION_METODO_SECONDARY_COLOR,
      spinnerClassName: 'text-[#4CCB7A]',
      messageClassName: 'text-[#E8EDED]/80',
    };
  }
  return {
    backgroundColor: chrome.secondaryColor,
    spinnerClassName: 'text-[color:var(--shell-nav-text)]',
    messageClassName: 'text-[color:var(--shell-nav-muted)]',
  };
}
