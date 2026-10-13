import { describe, expect, it } from 'vitest';
import {
  ORGANIZATION_METODO_ACCENT_COLOR,
  ORGANIZATION_METODO_PRIMARY_COLOR,
  ORGANIZATION_METODO_SECONDARY_COLOR,
} from './organizationBrandingDefaults';
import {
  ORGANIZATION_SHELL_NEUTRAL_PRIMARY,
  ORGANIZATION_SHELL_NEUTRAL_SECONDARY,
  WCAG_AA_NORMAL_TEXT,
  contrastRatio,
  organizationShellActiveClass,
  organizationShellBadgeClass,
  organizationShellCssVars,
  organizationShellIconButtonClass,
  organizationShellIdleClass,
  organizationShellSplashProps,
  organizationDashboardHeroPaint,
  organizationDashboardInk,
  organizationDashboardMark,
  organizationDarkPageSurface,
  organizationPatientDashboardPaint,
  resolveOrganizationShellChrome,
} from './resolveOrganizationShellChrome';

const METODO_ACTIVE = 'bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]';

describe('resolveOrganizationShellChrome', () => {
  it('Método conserva a paleta oficial mesmo com Firestore divergente', () => {
    const chrome = resolveOrganizationShellChrome({
      organizationId: 'metodo',
      branding: {
        primaryColor: '#FFFFFF',
        secondaryColor: '#000000',
        accentColor: '#123456',
      },
    });
    expect(chrome.useMetodoChrome).toBe(true);
    expect(chrome.primaryColor).toBe(ORGANIZATION_METODO_PRIMARY_COLOR);
    expect(chrome.secondaryColor).toBe(ORGANIZATION_METODO_SECONDARY_COLOR);
    expect(chrome.accentColor).toBe(ORGANIZATION_METODO_ACCENT_COLOR);
    expect(organizationShellActiveClass(chrome, METODO_ACTIVE)).toBe(METODO_ACTIVE);
    expect(organizationShellSplashProps(chrome).backgroundColor).toBe('#0A1F44');
    expect(organizationShellSplashProps(chrome).spinnerClassName).toBe('text-[#4CCB7A]');
  });

  it('Kamilla usa as cores cadastradas e não o verde ou o navy do Método', () => {
    const chrome = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: {
        primaryColor: '#7C3AED',
        secondaryColor: '#1E1B4B',
        accentColor: '#C4B5FD',
      },
    });
    expect(chrome.useMetodoChrome).toBe(false);
    expect(chrome.primaryColor).toBe('#7C3AED');
    expect(chrome.secondaryColor).toBe('#1E1B4B');
    expect(chrome.accentColor).toBe('#C4B5FD');
    expect(chrome.primaryColor).not.toBe('#4CCB7A');
    expect(chrome.secondaryColor).not.toBe('#0A1F44');
    expect(organizationShellActiveClass(chrome, METODO_ACTIVE)).toContain('var(--shell-primary)');
  });

  it('falha ou carregamento sem organização não herda a paleta do Método', () => {
    const chrome = resolveOrganizationShellChrome({ organizationId: null, branding: null });
    expect(chrome.secondaryColor).toBe(ORGANIZATION_SHELL_NEUTRAL_SECONDARY);
    expect(chrome.primaryColor).toBe(ORGANIZATION_SHELL_NEUTRAL_PRIMARY);
    expect(chrome.secondaryColor).not.toBe('#0A1F44');
    expect(chrome.primaryColor).not.toBe('#4CCB7A');
    expect(organizationShellSplashProps(chrome).spinnerClassName).not.toContain('4CCB7A');
  });

  it('organização conhecida sem cor usa neutro, não o Método', () => {
    const chrome = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: null, secondaryColor: 'nao-hex', accentColor: null },
    });
    expect(chrome.primaryColor).toBe(ORGANIZATION_SHELL_NEUTRAL_PRIMARY);
    expect(chrome.secondaryColor).toBe(ORGANIZATION_SHELL_NEUTRAL_SECONDARY);
  });

  it('fundo claro troca o texto da navegação para tom escuro', () => {
    const chrome = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: '#0F766E', secondaryColor: '#F9FAFB', accentColor: '#14B8A6' },
    });
    expect(chrome.onDark).toBe(false);
    expect(chrome.navText).toBe('#111827');
  });

  it('variáveis ficam no namespace do portal', () => {
    const chrome = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: '#7C3AED', secondaryColor: '#1E1B4B', accentColor: '#C4B5FD' },
    });
    const vars = organizationShellCssVars(chrome);
    expect(vars['--org-primary']).toBe('#7C3AED');
    expect(vars['--shell-secondary']).toBe('#1E1B4B');
    expect(Object.keys(vars).every((key) => key.startsWith('--org-') || key.startsWith('--shell-'))).toBe(
      true,
    );
    expect(vars['--shell-active-text']).toBe(chrome.activeText);
    expect(vars['--shell-nav-text']).toBe(chrome.navText);
  });

  it('fundo escuro usa texto claro com contraste AA e preserva a cor cadastrada', () => {
    const chrome = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: '#7C3AED', secondaryColor: '#1E1B4B', accentColor: '#C4B5FD' },
    });
    expect(chrome.onDark).toBe(true);
    expect(chrome.secondaryColor).toBe('#1E1B4B');
    expect(chrome.primaryColor).toBe('#7C3AED');
    expect(contrastRatio(chrome.navText, chrome.secondaryColor)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(chrome.navTextMuted, chrome.secondaryColor)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(chrome.activeText, chrome.secondaryColor)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(organizationShellIdleClass(chrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')).toContain(
      'hover:bg-white/10',
    );
    expect(organizationShellIconButtonClass(chrome, 'text-[#E8EDED] hover:bg-white/10')).toContain(
      'var(--shell-nav-text)',
    );
  });

  it('fundo claro usa texto escuro e não reescreve a primária clara', () => {
    const chrome = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: '#FFFFFF', secondaryColor: '#F9FAFB', accentColor: '#E5E7EB' },
    });
    expect(chrome.onDark).toBe(false);
    expect(chrome.primaryColor).toBe('#FFFFFF');
    expect(chrome.secondaryColor).toBe('#F9FAFB');
    expect(chrome.navText).toBe('#111827');
    expect(chrome.activeText).not.toBe('#FFFFFF');
    expect(contrastRatio(chrome.navText, chrome.secondaryColor)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(chrome.activeText, '#F9FAFB')).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(chrome.badgeText, chrome.secondaryColor)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(organizationShellActiveClass(chrome, METODO_ACTIVE)).toContain('var(--shell-active-text)');
    expect(organizationShellActiveClass(chrome, METODO_ACTIVE, 'light')).toContain('var(--shell-active-on-light)');
    expect(organizationShellIdleClass(chrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')).toContain(
      'hover:bg-black/5',
    );
    expect(organizationShellBadgeClass(chrome, 'text-[#4CCB7A]')).toContain('var(--shell-badge-text)');
    expect(organizationShellBadgeClass(chrome, 'text-[#4CCB7A]')).not.toContain('#4CCB7A');
  });

  it('cor intermediária escolhe o texto de maior contraste disponível', () => {
    const secondaryColor = '#808080';
    const chrome = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: '#808080', secondaryColor, accentColor: '#9CA3AF' },
    });
    expect(chrome.primaryColor).toBe('#808080');
    const light = contrastRatio('#E8EDED', secondaryColor);
    const dark = contrastRatio('#111827', secondaryColor);
    const chosen = contrastRatio(chrome.navText, secondaryColor);
    expect(chosen).toBeGreaterThanOrEqual(Math.max(light, dark) - 0.01);
    if (Math.max(light, dark) >= WCAG_AA_NORMAL_TEXT) {
      expect(chosen).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    }
    expect(contrastRatio(chrome.activeText, secondaryColor)).toBeGreaterThanOrEqual(
      Math.min(WCAG_AA_NORMAL_TEXT, Math.max(light, dark)) - 0.05,
    );
    expect(chrome.navText).not.toBe('#4CCB7A');
    expect(chrome.activeText).not.toBe('#0A1F44');
  });

  it('Método conserva as classes históricas de item, ícone e splash', () => {
    const chrome = resolveOrganizationShellChrome({
      organizationId: 'metodo',
      branding: { primaryColor: '#FFFFFF', secondaryColor: '#F9FAFB', accentColor: '#000000' },
    });
    const idle = 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]';
    const icon = 'text-[#E8EDED] hover:bg-white/10';
    expect(organizationShellIdleClass(chrome, idle)).toBe(idle);
    expect(organizationShellIconButtonClass(chrome, icon)).toBe(icon);
    expect(organizationShellActiveClass(chrome, METODO_ACTIVE, 'light')).toBe(METODO_ACTIVE);
    expect(organizationShellSplashProps(chrome)).toEqual({
      backgroundColor: '#0A1F44',
      spinnerClassName: 'text-[#4CCB7A]',
      messageClassName: 'text-[#E8EDED]/80',
    });
    expect(organizationDashboardInk(chrome)).toBe('#0A1F44');
    expect(organizationDashboardMark(chrome)).toBe('#4CCB7A');
  });

  it('dashboard do Método conserva navy e verde; Kamilla usa a cor cadastrada com contraste', () => {
    const metodo = resolveOrganizationShellChrome({
      organizationId: 'metodo',
      branding: { primaryColor: '#FFFFFF', secondaryColor: '#F9FAFB', accentColor: '#000000' },
    });
    expect(organizationDashboardInk(metodo)).toBe(ORGANIZATION_METODO_SECONDARY_COLOR);
    expect(organizationDashboardMark(metodo)).toBe(ORGANIZATION_METODO_PRIMARY_COLOR);
    const vars = organizationShellCssVars(metodo);
    expect(vars['--shell-ink']).toBe('#0A1F44');
    expect(vars['--shell-mark']).toBe('#4CCB7A');
    expect(vars['--shell-avatar-bg']).toBe('#0A1F44');
    expect(vars['--shell-avatar-text']).toBe('#FFFFFF');

    const kamilla = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: '#7C3AED', secondaryColor: '#1E1B4B', accentColor: '#C4B5FD' },
    });
    const hero = organizationDashboardHeroPaint(kamilla);
    expect(hero.background).toBe('#1E1B4B');
    expect(kamilla.primaryColor).toBe('#7C3AED');
    expect(contrastRatio(hero.text, hero.background)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(hero.highlight, hero.background)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(hero.chipText, hero.chipBackground)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(organizationDashboardInk(kamilla), '#FFFFFF')).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(organizationDashboardInk(kamilla)).not.toBe('#0A1F44');
    expect(hero.background).not.toBe('#0A1F44');
  });

  it('hero claro não usa texto branco nem a identidade do Método', () => {
    const chrome = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: '#FFFFFF', secondaryColor: '#F9FAFB', accentColor: '#E5E7EB' },
    });
    const hero = organizationDashboardHeroPaint(chrome);
    expect(chrome.primaryColor).toBe('#FFFFFF');
    expect(hero.background).toBe('#F9FAFB');
    expect(hero.text).toBe('#111827');
    expect(hero.highlight).not.toBe('#FFFFFF');
    expect(hero.highlight).not.toBe('#4CCB7A');
    expect(contrastRatio(hero.text, hero.background)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(organizationDashboardInk(chrome), '#FFFFFF')).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(organizationDashboardMark(chrome)).not.toBe('#4CCB7A');
  });

  it('área principal escura: Método mantém a classe; demais usam secundária escura ou neutro', () => {
    const metodo = resolveOrganizationShellChrome({ organizationId: 'metodo', branding: null });
    expect(organizationDarkPageSurface(metodo)).toBeNull();

    const escura = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: '#7C3AED', secondaryColor: '#1E1B4B', accentColor: '#C4B5FD' },
    });
    expect(organizationDarkPageSurface(escura)).toBe('#1E1B4B');

    const clara = resolveOrganizationShellChrome({
      organizationId: 'kamilla-montenegro',
      branding: { primaryColor: '#7C3AED', secondaryColor: '#F9FAFB', accentColor: '#C4B5FD' },
    });
    expect(organizationDarkPageSurface(clara)).toBe(ORGANIZATION_SHELL_NEUTRAL_SECONDARY);

    const semOrg = resolveOrganizationShellChrome({ organizationId: null, branding: null });
    expect(organizationDarkPageSurface(semOrg)).toBe(ORGANIZATION_SHELL_NEUTRAL_SECONDARY);
    expect(organizationDarkPageSurface(semOrg)).not.toBe(ORGANIZATION_METODO_SECONDARY_COLOR);
  });

  describe('organizationPatientDashboardPaint', () => {
    const METODO_COLORS = ['#0A1F44', '#4CCB7A', '#16A34A'];

    it('Método e chamadores sem chrome mantêm as classes atuais', () => {
      const metodo = resolveOrganizationShellChrome({
        organizationId: 'metodo',
        branding: { primaryColor: '#FFFFFF', secondaryColor: '#F9FAFB', accentColor: '#000000' },
      });
      expect(organizationPatientDashboardPaint(metodo)).toBeNull();
      expect(organizationPatientDashboardPaint(null)).toBeNull();
      expect(organizationPatientDashboardPaint(undefined)).toBeNull();
    });

    it('Kamilla usa secundária na tinta e primária nos destaques, com contraste AA', () => {
      const kamilla = resolveOrganizationShellChrome({
        organizationId: 'kamilla-montenegro',
        branding: { primaryColor: '#7C3AED', secondaryColor: '#1E1B4B', accentColor: '#C4B5FD' },
      });
      const paint = organizationPatientDashboardPaint(kamilla);
      expect(paint).not.toBeNull();
      expect(paint!.ink).toBe('#1E1B4B');
      expect(paint!.mark).toBe('#7C3AED');
      expect(paint!.focusRing).toBe('rgba(124, 58, 237, 0.3)');
      expect(contrastRatio(paint!.ink, '#FFFFFF')).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      expect(contrastRatio(paint!.mark, '#FFFFFF')).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      expect(contrastRatio(paint!.badgeText, paint!.badgeBackground)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      for (const value of [paint!.ink, paint!.mark, paint!.badgeText, paint!.badgeBackground]) {
        expect(METODO_COLORS).not.toContain(value.toUpperCase());
      }
    });

    it('cores claras recebem tinta escura legível', () => {
      const clara = resolveOrganizationShellChrome({
        organizationId: 'kamilla-montenegro',
        branding: { primaryColor: '#FFFFFF', secondaryColor: '#F9FAFB', accentColor: '#E5E7EB' },
      });
      const paint = organizationPatientDashboardPaint(clara)!;
      expect(paint.ink).toBe('#111827');
      expect(paint.mark).not.toBe('#FFFFFF');
      expect(contrastRatio(paint.mark, '#FFFFFF')).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      expect(contrastRatio(paint.badgeText, paint.badgeBackground)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('carregamento, falha da API ou sessão sem organização ficam neutros', () => {
      const semOrg = resolveOrganizationShellChrome({ organizationId: null, branding: null });
      const falhaApi = resolveOrganizationShellChrome({ organizationId: 'kamilla-montenegro', branding: null });
      for (const chrome of [semOrg, falhaApi]) {
        const paint = organizationPatientDashboardPaint(chrome)!;
        expect(paint.ink).toBe(ORGANIZATION_SHELL_NEUTRAL_SECONDARY);
        for (const value of [paint.ink, paint.mark, paint.badgeText]) {
          expect(METODO_COLORS).not.toContain(value.toUpperCase());
        }
      }
    });
  });
});
