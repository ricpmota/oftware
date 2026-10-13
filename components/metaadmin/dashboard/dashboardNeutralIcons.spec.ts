import { describe, expect, it } from 'vitest';
import { resolveOrganizationShellChrome } from '@/lib/organization/resolveOrganizationShellChrome';
import { DASHBOARD_NEUTRAL_ICONS, shouldUseMetodoDashboardIcons } from './dashboardNeutralIcons';

describe('dashboardNeutralIcons', () => {
  it('Método e chamadores sem chrome mantêm o sprite do Método', () => {
    expect(shouldUseMetodoDashboardIcons(undefined)).toBe(true);
    expect(shouldUseMetodoDashboardIcons(null)).toBe(true);
    const metodo = resolveOrganizationShellChrome({ organizationId: 'metodo', branding: null });
    expect(shouldUseMetodoDashboardIcons(metodo)).toBe(true);
  });

  it('outra organização ou sessão sem organização usa ícones neutros', () => {
    const kamilla = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: '#7C3AED', secondaryColor: '#1E1B4B', accentColor: '#C4B5FD' },
    });
    expect(shouldUseMetodoDashboardIcons(kamilla)).toBe(false);
    const semOrg = resolveOrganizationShellChrome({ organizationId: null, branding: null });
    expect(shouldUseMetodoDashboardIcons(semOrg)).toBe(false);
  });

  it('status mantêm tons semânticos e todos os ícones do sprite têm equivalente', () => {
    expect(DASHBOARD_NEUTRAL_ICONS.pendente.tone).toBe('amber');
    expect(DASHBOARD_NEUTRAL_ICONS['em-tratamento'].tone).toBe('blue');
    expect(DASHBOARD_NEUTRAL_ICONS.concluido.tone).toBe('green');
    expect(DASHBOARD_NEUTRAL_ICONS.abandono.tone).toBe('red');
    for (const entry of Object.values(DASHBOARD_NEUTRAL_ICONS)) {
      expect(entry.Icon).toBeTruthy();
    }
  });
});
