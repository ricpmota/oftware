import { describe, expect, it } from 'vitest';
import { readOrganizationShellBrandingResponse } from './readOrganizationShellBrandingResponse';
import { resolveOrganizationShellLogoUrl } from './resolveOrganizationShellLogoUrl';

describe('readOrganizationShellBrandingResponse', () => {
  it('lê a organização e as logos devolvidas pela API autenticada', () => {
    const read = readOrganizationShellBrandingResponse({
      organizationId: 'kamilla-montenegro',
      organizationMatch: true,
      branding: {
        publicName: 'Kamilla Montenegro',
        logoMainUrl: 'https://cdn.example/kamilla/main.png',
        logoLightUrl: 'https://cdn.example/kamilla/light.png',
        logoDarkUrl: 'https://cdn.example/kamilla/dark.png',
        iconUrl: 'https://cdn.example/kamilla/icon.png',
        primaryColor: '#7C3AED',
        secondaryColor: '#111827',
        accentColor: '#C4B5FD',
      },
    });

    expect(read.organizationId).toBe('kamilla-montenegro');
    expect(read.organizationMatch).toBe(true);
    expect(read.branding?.primaryColor).toBe('#7C3AED');
    expect(read.branding?.accentColor).toBe('#C4B5FD');
    expect(
      resolveOrganizationShellLogoUrl(read.branding, { darkBackground: true }),
    ).toBe('https://cdn.example/kamilla/light.png');
  });

  it('preserva organizationMatch false sem trocar a marca pelo domínio', () => {
    const read = readOrganizationShellBrandingResponse({
      organizationId: 'kamilla-montenegro',
      hostOrganizationId: 'metodo',
      organizationMatch: false,
      branding: {
        publicName: 'Kamilla Montenegro',
        logoMainUrl: 'https://cdn.example/kamilla/main.png',
        logoLightUrl: 'https://cdn.example/kamilla/light.png',
        logoDarkUrl: null,
        iconUrl: null,
      },
    });

    expect(read.organizationMatch).toBe(false);
    expect(read.organizationId).toBe('kamilla-montenegro');
    expect(read.branding?.logoLightUrl).toBe('https://cdn.example/kamilla/light.png');
    expect(read.branding?.primaryColor).toBeNull();
  });

  it('falha da API não produz marca de outra organização', () => {
    const read = readOrganizationShellBrandingResponse(null);
    expect(read.branding).toBeNull();
    expect(read.organizationId).toBeNull();
    expect(resolveOrganizationShellLogoUrl(read.branding, { darkBackground: true })).toBe(
      '/logo.png',
    );
  });
});
