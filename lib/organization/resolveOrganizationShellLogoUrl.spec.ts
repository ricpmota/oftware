import { describe, expect, it } from 'vitest';
import { resolveOrganizationShellLogoUrl } from './resolveOrganizationShellLogoUrl';

describe('resolveOrganizationShellLogoUrl', () => {
  const branding = {
    logoMainUrl: '/main.png',
    logoDarkUrl: '/dark.png',
    logoLightUrl: '/light.png',
  };

  it('uses light logo on dark background', () => {
    expect(resolveOrganizationShellLogoUrl(branding, { darkBackground: true })).toBe('/light.png');
  });

  it('uses dark logo on light background', () => {
    expect(resolveOrganizationShellLogoUrl(branding, { darkBackground: false })).toBe('/dark.png');
  });

  it('falls back to main logo when variant missing', () => {
    expect(
      resolveOrganizationShellLogoUrl(
        { logoMainUrl: '/main.png', logoDarkUrl: null, logoLightUrl: null },
        { darkBackground: true },
      ),
    ).toBe('/main.png');
  });

  it('falls back to default when branding is null', () => {
    expect(resolveOrganizationShellLogoUrl(null, { darkBackground: false })).toBe('/logo.png');
  });
});
