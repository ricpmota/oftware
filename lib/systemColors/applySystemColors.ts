import type { SystemColorsTokens } from './systemColorsTokens';

/**
 * Applies System Colors tokens as CSS variables on `document.documentElement`.
 * This function does not replace any existing colors in components; it only sets variables
 * so the rest of the system can consume them in later steps.
 */
export function applySystemColors(tokens: SystemColorsTokens) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const vars: Record<string, string> = {
    '--brand-primary': tokens.brand.primary,
    '--brand-secondary': tokens.brand.secondary,
    '--brand-accent': tokens.brand.accent,
    '--brand-gradient-from': tokens.brand.gradient.from,
    '--brand-gradient-via': tokens.brand.gradient.via ?? tokens.brand.gradient.from,
    '--brand-gradient-to': tokens.brand.gradient.to,

    '--surface-background': tokens.surface.background,
    '--surface-card': tokens.surface.card,
    '--surface-modal': tokens.surface.modal,
    '--surface-sidebar': tokens.surface.sidebar,
    '--surface-navbar': tokens.surface.navbar,

    '--text-primary': tokens.text.primary,
    '--text-secondary': tokens.text.secondary,
    '--text-inverse': tokens.text.inverse,

    '--border-default': tokens.border.default,
    '--border-focus': tokens.border.focus,

    '--state-success': tokens.state.success,
    '--state-warning': tokens.state.warning,
    '--state-danger': tokens.state.danger,
    '--state-info': tokens.state.info,

    '--chart-1': tokens.chart.c1,
    '--chart-2': tokens.chart.c2,
    '--chart-3': tokens.chart.c3,
    '--chart-4': tokens.chart.c4,
    '--chart-5': tokens.chart.c5,
  };

  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
}

