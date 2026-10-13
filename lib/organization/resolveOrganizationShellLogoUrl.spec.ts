import { describe, expect, it } from 'vitest';
import {
  resolveOrganizationShellLogoUrl,
  shouldShowOrganizationLogoInMobileHeader,
} from './resolveOrganizationShellLogoUrl';

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

  it('usa o ícone institucional antes do fallback da plataforma', () => {
    expect(
      resolveOrganizationShellLogoUrl(
        { logoMainUrl: null, logoDarkUrl: null, logoLightUrl: null, iconUrl: '/kamilla-icon.png' },
        { darkBackground: true },
      ),
    ).toBe('/kamilla-icon.png');
  });

  it('com só a logo clara, fundo claro ainda usa a logo da organização', () => {
    expect(
      resolveOrganizationShellLogoUrl(
        {
          logoMainUrl: null,
          logoDarkUrl: null,
          logoLightUrl: 'https://storage.example/kamilla/light.png',
          iconUrl: null,
        },
        { darkBackground: false },
      ),
    ).toBe('https://storage.example/kamilla/light.png');
  });

  it('Kamilla no fundo escuro usa a logo clara e não a do Método', () => {
    expect(
      resolveOrganizationShellLogoUrl(
        {
          logoMainUrl: 'https://storage.example/kamilla/main.png',
          logoDarkUrl: 'https://storage.example/kamilla/dark.png',
          logoLightUrl: 'https://storage.example/kamilla/light.png',
        },
        { darkBackground: true },
      ),
    ).toBe('https://storage.example/kamilla/light.png');
  });

  it('a cor real do fundo da sidebar prevalece sobre darkBackground', () => {
    expect(
      resolveOrganizationShellLogoUrl(branding, {
        darkBackground: true,
        backgroundColor: '#F9FAFB',
      }),
    ).toBe('/dark.png');
    expect(
      resolveOrganizationShellLogoUrl(branding, {
        darkBackground: false,
        backgroundColor: '#1E1B4B',
      }),
    ).toBe('/light.png');
  });

  it('Método no fundo escuro continua na logo clara cadastrada', () => {
    expect(
      resolveOrganizationShellLogoUrl(
        {
          logoMainUrl: '/metodo-emagrecer-logotipo-28.png',
          logoDarkUrl: null,
          logoLightUrl: '/metodo-logo-clara.png',
        },
        { darkBackground: true },
      ),
    ).toBe('/metodo-logo-clara.png');
  });
});

describe('shouldShowOrganizationLogoInMobileHeader', () => {
  it('Método conserva o ícone do menu mobile', () => {
    expect(
      shouldShowOrganizationLogoInMobileHeader('metodo', 'https://storage.example/kamilla/light.png'),
    ).toBe(false);
    expect(shouldShowOrganizationLogoInMobileHeader(null, '/logo.png')).toBe(false);
  });

  it('Kamilla mostra a logo institucional e não o fallback da plataforma', () => {
    expect(
      shouldShowOrganizationLogoInMobileHeader(
        'kamilla-montenegro',
        'https://storage.example/kamilla/dark.png',
      ),
    ).toBe(true);
    expect(shouldShowOrganizationLogoInMobileHeader('kamilla-montenegro', '/logo.png')).toBe(false);
  });
});
