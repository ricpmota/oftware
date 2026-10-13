import { describe, expect, it } from 'vitest';
import {
  ORGANIZATION_PUBLIC_NEUTRAL_ACCENT,
  ORGANIZATION_PUBLIC_NEUTRAL_DR_BACKGROUND,
  parseOrganizationPublicBranding,
  resolveOrganizationMedicoWhiteLabel,
  resolveOrganizationPublicPageTheme,
  resolvePublicPageIdentityRoute,
} from '@/lib/whiteLabel/organizationPublicIdentity';
import { isMetodoBrandAsset } from '@/lib/whiteLabel/metodoBrandAssets';
import {
  DEFAULT_PUBLIC_PAGE_LOGO_SRC,
  resolvePublicPageLogoPreviewSrc,
} from '@/lib/whiteLabel/publicPagesTheme';
import { resolveMedicoWhiteLabel } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';

const METODO_NAVY = '#0A1F44';
const METODO_GREEN = '#4CCB7A';
const METODO_LOGO = '/metodo-emagrecer-logotipo-28.png';

const kamillaRaw = {
  primaryColor: '#B2457A',
  secondaryColor: '#3B1530',
  surfaceColor: '#FFF7FA',
  textColor: '#FDF2F8',
  mutedTextColor: '#4A2238',
  logoMainUrl: 'https://cdn.example.com/kamilla/logo-main.png',
  logoDarkUrl: 'https://cdn.example.com/kamilla/logo-dark.png',
  faviconUrl: 'https://cdn.example.com/kamilla/favicon.png',
  defaultDescription: 'Endocrinologia com a Dra. Kamilla Montenegro.',
  showPoweredByOftware: false,
  publicPages: {
    dr: {
      backgroundColor: '#2A0F22',
      textColor: '#FFFFFF',
      logoUrl: 'https://cdn.example.com/kamilla/logo-dr.png',
    },
    aplicacao: { backgroundColor: '#FFF1F6', textColor: '#3B1530', logoUrl: null },
    conclusao: {},
  },
};

const kamillaMedico = {
  nome: 'Kamilla Montenegro',
  genero: 'F' as const,
  fotoPerfilUrl: 'https://cdn.example.com/kamilla/foto.jpg',
  organizationId: 'kamilla-montenegro',
};

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(collectStrings);
}

function expectNoMetodoIdentity(value: unknown) {
  const strings = collectStrings(value);
  for (const s of strings) {
    expect(isMetodoBrandAsset(s)).toBe(false);
    expect(s.toUpperCase()).not.toBe(METODO_NAVY);
    expect(s.toUpperCase()).not.toBe(METODO_GREEN);
  }
}

describe('resolvePublicPageIdentityRoute', () => {
  it('médico sem organização segue o fluxo legado', () => {
    expect(resolvePublicPageIdentityRoute({})).toEqual({ kind: 'legacy' });
    expect(resolvePublicPageIdentityRoute({ organizationId: '  ' })).toEqual({ kind: 'legacy' });
  });

  it('médico do Método segue o fluxo Método', () => {
    expect(resolvePublicPageIdentityRoute({ organizationId: 'metodo' })).toEqual({ kind: 'metodo' });
  });

  it('médico de outra organização usa a própria organização mesmo com metodoImagensAtivo', () => {
    const medico = { organizationId: 'kamilla-montenegro', metodoImagensAtivo: true };
    expect(resolvePublicPageIdentityRoute(medico)).toEqual({
      kind: 'organization',
      organizationId: 'kamilla-montenegro',
    });
  });
});

describe('parseOrganizationPublicBranding', () => {
  it('campos ausentes ficam nulos e nunca recebem cores do Método', () => {
    const parsed = parseOrganizationPublicBranding('kamilla-montenegro', {});
    expect(parsed.primaryColor).toBeNull();
    expect(parsed.secondaryColor).toBeNull();
    expect(parsed.logoMainUrl).toBeNull();
    expect(parsed.publicPages.dr).toEqual({ backgroundColor: null, textColor: null, logoUrl: null });
  });

  it('descarta arquivos da marca Método gravados na organização', () => {
    const parsed = parseOrganizationPublicBranding('kamilla-montenegro', {
      logoMainUrl: METODO_LOGO,
      faviconUrl: '/icones/metodo-simbolo.png',
      publicPages: { dr: { logoUrl: 'https://cdn.example.com/metodo-emagrecer%20logo.png' } },
    });
    expect(parsed.logoMainUrl).toBeNull();
    expect(parsed.faviconUrl).toBeNull();
    expect(parsed.publicPages.dr.logoUrl).toBeNull();
  });

  it('descarta cores inválidas', () => {
    const parsed = parseOrganizationPublicBranding('x', { primaryColor: 'rosa', secondaryColor: '#12' });
    expect(parsed.primaryColor).toBeNull();
    expect(parsed.secondaryColor).toBeNull();
  });
});

describe('resolveOrganizationPublicPageTheme', () => {
  const kamilla = parseOrganizationPublicBranding('kamilla-montenegro', kamillaRaw);

  it('cores da página têm prioridade sobre as institucionais', () => {
    expect(resolveOrganizationPublicPageTheme(kamilla, 'dr')).toEqual({
      backgroundColor: '#2A0F22',
      textColor: '#FFFFFF',
      logoUrl: 'https://cdn.example.com/kamilla/logo-dr.png',
    });
    const aplicacao = resolveOrganizationPublicPageTheme(kamilla, 'aplicacao');
    expect(aplicacao.backgroundColor).toBe('#FFF1F6');
    expect(aplicacao.textColor).toBe('#3B1530');
  });

  it('logo da página tem prioridade e o logo principal cobre a ausência', () => {
    expect(resolveOrganizationPublicPageTheme(kamilla, 'dr').logoUrl).toBe(
      'https://cdn.example.com/kamilla/logo-dr.png',
    );
    expect(resolveOrganizationPublicPageTheme(kamilla, 'aplicacao').logoUrl).toBe(
      'https://cdn.example.com/kamilla/logo-main.png',
    );
  });

  it('página sem cor usa a cor institucional', () => {
    const conclusao = resolveOrganizationPublicPageTheme(kamilla, 'conclusao');
    expect(conclusao.backgroundColor).toBe('#FFF7FA');
    expect(conclusao.textColor).toBe('#4A2238');
  });

  it('organização sem logo fica sem imagem', () => {
    const semLogo = parseOrganizationPublicBranding('kamilla-montenegro', { primaryColor: '#B2457A' });
    for (const kind of ['dr', 'aplicacao', 'conclusao'] as const) {
      expect(resolveOrganizationPublicPageTheme(semLogo, kind).logoUrl).toBeNull();
    }
  });

  it('branding ausente usa o neutro', () => {
    const dr = resolveOrganizationPublicPageTheme(null, 'dr');
    expect(dr.backgroundColor).toBe(ORGANIZATION_PUBLIC_NEUTRAL_DR_BACKGROUND);
    expect(dr.logoUrl).toBeNull();
    expectNoMetodoIdentity(dr);
    expectNoMetodoIdentity(resolveOrganizationPublicPageTheme(null, 'aplicacao'));
    expectNoMetodoIdentity(resolveOrganizationPublicPageTheme(null, 'conclusao'));
  });
});

describe('resolveOrganizationMedicoWhiteLabel', () => {
  const kamilla = parseOrganizationPublicBranding('kamilla-montenegro', kamillaRaw);

  it('Kamilla recebe cores, logos e destaque da própria organização', () => {
    const wl = resolveOrganizationMedicoWhiteLabel(kamillaMedico, kamilla);
    expect(wl.primaryColor).toBe('#B2457A');
    expect(wl.faviconUrl).toBe('https://cdn.example.com/kamilla/favicon.png');
    expect(wl.ogImageUrl).toBe('https://cdn.example.com/kamilla/logo-main.png');
    expect(wl.description).toBe('Endocrinologia com a Dra. Kamilla Montenegro.');
    expect(wl.showPoweredByOftware).toBe(false);
    expect(wl.organizationIdentity).toEqual({
      organizationId: 'kamilla-montenegro',
      footerLogoUrl: 'https://cdn.example.com/kamilla/logo-dark.png',
      accentTextColor: expect.any(String),
    });
    expectNoMetodoIdentity(wl);
  });

  it('whiteLabel individual mantém nome e descrição e ignora cores e imagens gravadas', () => {
    const wl = resolveOrganizationMedicoWhiteLabel(
      {
        ...kamillaMedico,
        metodoImagensAtivo: true,
        whiteLabel: {
          brandName: 'Dra. Kamilla',
          description: 'Descrição individual',
          primaryColor: '#30f278',
          ogImageUrl: '/og-metodo.png',
          publicPages: {
            dr: { backgroundColor: METODO_NAVY, textColor: '#E8EDED', logoUrl: METODO_LOGO },
          },
        },
      } as Parameters<typeof resolveOrganizationMedicoWhiteLabel>[0],
      kamilla,
    );
    expect(wl.brandName).toBe('Dra. Kamilla');
    expect(wl.description).toBe('Descrição individual');
    expect(wl.primaryColor).toBe('#B2457A');
    expect(wl.publicPages.dr.backgroundColor).toBe('#2A0F22');
    expectNoMetodoIdentity(wl);
  });

  it('branding ausente gera identidade neutra sem marca de outra organização', () => {
    const wl = resolveOrganizationMedicoWhiteLabel({ ...kamillaMedico, fotoPerfilUrl: null }, null);
    expect(wl.primaryColor).toBe(ORGANIZATION_PUBLIC_NEUTRAL_ACCENT);
    expect(wl.ogImageUrl).toBeNull();
    expect(wl.faviconUrl).toBeNull();
    expect(wl.organizationIdentity?.footerLogoUrl).toBeNull();
    expectNoMetodoIdentity(wl);
  });

  it('troca de médico e organização não carrega identidade anterior', () => {
    const primeiro = resolveOrganizationMedicoWhiteLabel(kamillaMedico, kamilla);
    const segundo = resolveOrganizationMedicoWhiteLabel(
      { nome: 'Outro', genero: 'M', organizationId: 'clinica-b' },
      parseOrganizationPublicBranding('clinica-b', { primaryColor: '#1D4ED8' }),
    );
    expect(primeiro.primaryColor).toBe('#B2457A');
    expect(segundo.primaryColor).toBe('#1D4ED8');
    expect(segundo.organizationIdentity?.organizationId).toBe('clinica-b');
    expect(collectStrings(segundo).some((s) => s.includes('kamilla'))).toBe(false);
    expect(segundo.publicPages.dr.logoUrl).toBeNull();
  });

  it('acentos claros recebem texto escuro legível', () => {
    const claro = parseOrganizationPublicBranding('x', { primaryColor: '#FDE68A' });
    expect(resolveOrganizationMedicoWhiteLabel(kamillaMedico, claro).organizationIdentity?.accentTextColor).toBe(
      '#111827',
    );
  });
});

describe('Método preservado', () => {
  it('resolver legado do Método continua sem organizationIdentity', () => {
    const wl = resolveMedicoWhiteLabel({ nome: 'Ana', genero: 'F', organizationId: 'metodo' });
    expect(wl.organizationIdentity).toBeUndefined();
  });
});

describe('resolvePublicPageLogoPreviewSrc', () => {
  const vazio = { backgroundColor: '', textColor: '', logoUrl: null };
  const custom = { backgroundColor: '', textColor: '', logoUrl: 'https://cdn.example.com/k.png' };

  it('Método e médico sem organização mantêm o logotipo padrão', () => {
    expect(resolvePublicPageLogoPreviewSrc(vazio)).toBe(DEFAULT_PUBLIC_PAGE_LOGO_SRC);
    expect(resolvePublicPageLogoPreviewSrc(vazio, { organizationId: 'metodo' })).toBe(
      DEFAULT_PUBLIC_PAGE_LOGO_SRC,
    );
  });

  it('outra organização sem logo fica sem imagem', () => {
    expect(resolvePublicPageLogoPreviewSrc(vazio, { organizationId: 'kamilla-montenegro' })).toBeNull();
    expect(
      resolvePublicPageLogoPreviewSrc(
        { ...vazio, logoUrl: METODO_LOGO },
        { organizationId: 'kamilla-montenegro' },
      ),
    ).toBeNull();
  });

  it('logo própria aparece para qualquer organização', () => {
    expect(resolvePublicPageLogoPreviewSrc(custom, { organizationId: 'kamilla-montenegro' })).toBe(
      'https://cdn.example.com/k.png',
    );
    expect(resolvePublicPageLogoPreviewSrc(custom)).toBe('https://cdn.example.com/k.png');
  });
});
