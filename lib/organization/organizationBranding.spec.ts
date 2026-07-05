import { describe, expect, it } from 'vitest';
import { METODO_ORGANIZATION } from './organizationRegistry';
import {
  buildOrganizationBrandingSeedPayload,
  organizationBrandingLayerFromMetodoImagens,
  organizationBrandingLayerFromSourceMedicoWhiteLabel,
  resolveOrganizationBrandingFromSources,
  resolveOrganizationBrandingSourceLayer,
} from './organizationBrandingMerge';
import { buildHardcodedOrganizationBranding } from './organizationBrandingDefaults';

describe('organizationBrandingMerge', () => {
  const hardcoded = buildHardcodedOrganizationBranding(METODO_ORGANIZATION);

  it('hardcoded inclui domínio e nome do Método', () => {
    expect(hardcoded.publicName).toBe('Método Emagrecer');
    expect(hardcoded.siteUrl).toBe('https://www.ometodoemagrecer.com.br');
    expect(hardcoded.faviconUrl).toBe('/metodo-simbolo-17.png');
    expect(hardcoded.primaryColor).toBe('#4CCB7A');
    expect(hardcoded.secondaryColor).toBe('#0A1F44');
  });

  it('camada platformSettings sobrescreve imagens', () => {
    const layer = organizationBrandingLayerFromMetodoImagens({
      ogImageUrl: 'https://cdn.example/og.png',
      faviconUrl: 'https://cdn.example/favicon.png',
      pdfLogoUrl: 'https://cdn.example/pdf.png',
      drPageLogoUrl: 'https://cdn.example/dr.png',
      aplicacaoPageLogoUrl: 'https://cdn.example/app.png',
      conclusaoPageLogoUrl: 'https://cdn.example/conc.png',
    });

    const merged = resolveOrganizationBrandingFromSources({
      organization: METODO_ORGANIZATION,
      metodoImagens: {
        ogImageUrl: 'https://cdn.example/og.png',
        faviconUrl: 'https://cdn.example/favicon.png',
        pdfLogoUrl: 'https://cdn.example/pdf.png',
        drPageLogoUrl: 'https://cdn.example/dr.png',
        aplicacaoPageLogoUrl: 'https://cdn.example/app.png',
        conclusaoPageLogoUrl: 'https://cdn.example/conc.png',
      },
    });

    expect(layer?.ogImageUrl).toBe('https://cdn.example/og.png');
    expect(merged.ogImageUrl).toBe('https://cdn.example/og.png');
    expect(merged.publicPages.dr.logoUrl).toBe('https://cdn.example/dr.png');
  });

  it('camada sourceMedico sobrescreve cores e brandName', () => {
    const merged = resolveOrganizationBrandingFromSources({
      organization: METODO_ORGANIZATION,
      sourceWhiteLabel: {
        brandName: 'Clínica Fonte',
        primaryColor: '#112233',
        drPageBackgroundColor: '#AABBCC',
        drPageTextColor: '#FFFFFF',
        drPageLogoUrl: 'https://cdn.example/medico-dr.png',
      },
    });

    expect(merged.publicName).toBe('Método Emagrecer');
    expect(merged.primaryColor).toBe('#112233');
    expect(merged.publicPages.dr.backgroundColor).toBe('#AABBCC');
  });

  it('firestore tem prioridade sobre demais camadas', () => {
    const merged = resolveOrganizationBrandingFromSources({
      organization: METODO_ORGANIZATION,
      firestoreBranding: {
        ...hardcoded,
        publicName: 'Nome Firestore',
        primaryColor: '#FF00FF',
        ogImageUrl: null,
      },
      metodoImagens: {
        ogImageUrl: 'https://cdn.example/og.png',
        faviconUrl: null,
        pdfLogoUrl: null,
        drPageLogoUrl: null,
        aplicacaoPageLogoUrl: null,
        conclusaoPageLogoUrl: null,
      },
      sourceWhiteLabel: { brandName: 'Ignorado', primaryColor: '#000000' },
    });

    expect(merged.publicName).toBe('Nome Firestore');
    expect(merged.primaryColor).toBe('#FF00FF');
    expect(merged.ogImageUrl).toBe('https://cdn.example/og.png');
  });

  it('resolve sourceLayer na ordem correta', () => {
    expect(
      resolveOrganizationBrandingSourceLayer({
        firestoreBranding: { ...hardcoded, publicName: 'FS' },
      }),
    ).toBe('firestore');

    expect(
      resolveOrganizationBrandingSourceLayer({
        metodoImagens: {
          ogImageUrl: 'https://x/og.png',
          faviconUrl: null,
          pdfLogoUrl: null,
          drPageLogoUrl: null,
          aplicacaoPageLogoUrl: null,
          conclusaoPageLogoUrl: null,
        },
      }),
    ).toBe('platformSettings');

    expect(
      resolveOrganizationBrandingSourceLayer({
        sourceWhiteLabel: { brandName: 'Medico' },
      }),
    ).toBe('sourceMedico');

    expect(resolveOrganizationBrandingSourceLayer({})).toBe('hardcoded');
  });

  it('seed payload combina hardcoded + medico + platform', () => {
    const seed = buildOrganizationBrandingSeedPayload({
      organization: METODO_ORGANIZATION,
      metodoImagens: {
        faviconUrl: 'https://cdn.example/fav.png',
        ogImageUrl: null,
        pdfLogoUrl: null,
        drPageLogoUrl: 'https://cdn.example/dr.png',
        aplicacaoPageLogoUrl: null,
        conclusaoPageLogoUrl: null,
      },
      sourceWhiteLabel: {
        brandName: 'Método Emagrecer',
        primaryColor: '#4CCB7A',
      },
    });

    expect(seed.publicName).toBe('Método Emagrecer');
    expect(seed.faviconUrl).toBe('https://cdn.example/fav.png');
    expect(seed.siteUrl).toBe('https://www.ometodoemagrecer.com.br');
    expect(seed.instagramBioDefaults.headline).toContain('acompanhamento');
    expect(seed.seedVersion).toBe('11.1.0');
  });

  it('sourceMedico layer retorna null sem whiteLabel', () => {
    expect(
      organizationBrandingLayerFromSourceMedicoWhiteLabel(METODO_ORGANIZATION, null),
    ).toBeNull();
  });
});
