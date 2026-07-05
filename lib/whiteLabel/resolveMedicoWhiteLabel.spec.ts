import { describe, expect, it } from 'vitest';
import { METODO_ORGANIZATION } from '@/lib/organization/organizationRegistry';
import { buildHardcodedOrganizationBranding } from '@/lib/organization/organizationBrandingDefaults';
import { isMetodoOrganizationMember } from '@/lib/organization/isMetodoOrganizationMember';
import { mergeMedicoWhiteLabelSources } from '@/lib/whiteLabel/mergeMedicoWhiteLabelSources';
import {
  isPreResolvedMedicoWhiteLabel,
  resolveMedicoWhiteLabel,
} from '@/lib/whiteLabel/resolveMedicoWhiteLabel';

describe('isMetodoOrganizationMember', () => {
  it('reconhece organizationId metodo', () => {
    expect(isMetodoOrganizationMember({ organizationId: 'metodo' })).toBe(true);
  });

  it('usa metodoImagensAtivo como fallback temporário', () => {
    expect(isMetodoOrganizationMember({ metodoImagensAtivo: true })).toBe(true);
  });

  it('ignora médicos independentes', () => {
    expect(isMetodoOrganizationMember({ organizationId: 'outra' })).toBe(false);
    expect(isMetodoOrganizationMember({})).toBe(false);
  });
});

describe('mergeMedicoWhiteLabelSources — dual read 11.2', () => {
  const orgBranding = {
    ...buildHardcodedOrganizationBranding(METODO_ORGANIZATION),
    faviconUrl: null,
    iconUrl: null,
    ogImageUrl: 'https://cdn.example/org-og.png',
    pdfLogoUrl: 'https://cdn.example/org-pdf.png',
    publicPages: {
      dr: {
        backgroundColor: '#111111',
        textColor: '#EEEEEE',
        logoUrl: 'https://cdn.example/org-dr.png',
      },
      aplicacao: {
        backgroundColor: '#222222',
        textColor: '#DDDDDD',
        logoUrl: 'https://cdn.example/org-app.png',
      },
      conclusao: {
        backgroundColor: '#333333',
        textColor: '#CCCCCC',
        logoUrl: 'https://cdn.example/org-conc.png',
      },
    },
  };

  it('org branding vence platformSettings e whiteLabel do médico', () => {
    const merged = mergeMedicoWhiteLabelSources({
      whiteLabel: {
        brandName: 'Médico WL',
        ogImageUrl: 'https://cdn.example/medico-og.png',
        pdfLogoUrl: 'https://cdn.example/medico-pdf.png',
        drPageLogoUrl: 'https://cdn.example/medico-dr.png',
      },
      metodoTemplate: {
        ogImageUrl: 'https://cdn.example/platform-og.png',
        faviconUrl: 'https://cdn.example/platform-fav.png',
        pdfLogoUrl: 'https://cdn.example/platform-pdf.png',
        drPageLogoUrl: 'https://cdn.example/platform-dr.png',
        aplicacaoPageLogoUrl: null,
        conclusaoPageLogoUrl: null,
      },
      metodoImagensAtivo: true,
      organizationBranding: orgBranding,
      applyOrganizationLayer: true,
    });

    expect(merged?.ogImageUrl).toBe('https://cdn.example/org-og.png');
    expect(merged?.pdfLogoUrl).toBe('https://cdn.example/org-pdf.png');
    expect(merged?.drPageLogoUrl).toBe('https://cdn.example/org-dr.png');
    expect(merged?.faviconUrl).toBe('https://cdn.example/platform-fav.png');
  });

  it('não aplica org branding fora da Organização Método', () => {
    const merged = mergeMedicoWhiteLabelSources({
      whiteLabel: { brandName: 'Independente', ogImageUrl: 'https://cdn.example/solo.png' },
      organizationBranding: orgBranding,
      applyOrganizationLayer: false,
    });

    expect(merged?.ogImageUrl).toBe('https://cdn.example/solo.png');
  });
});

describe('resolveMedicoWhiteLabel', () => {
  it('prioriza whiteLabel pré-resolvido da API', () => {
    const preResolved = resolveMedicoWhiteLabel({
      nome: 'João Silva',
      whiteLabel: {
        brandName: 'Marca API',
        description: 'Desc',
        ogImageUrl: null,
        profilePhotoUrl: null,
        faviconUrl: null,
        primaryColor: '#4CCB7A',
        showPoweredByOftware: true,
        publicPages: {
          dr: { backgroundColor: '#0A1F44', textColor: '#E8EDED', logoUrl: null },
          aplicacao: { backgroundColor: '#F9FAFB', textColor: '#374151', logoUrl: null },
          conclusao: { backgroundColor: '#F9FAFB', textColor: '#374151', logoUrl: null },
        },
      },
    });

    expect(preResolved.brandName).toBe('Marca API');
    expect(isPreResolvedMedicoWhiteLabel(preResolved)).toBe(true);
  });

  it('aplica org branding para médico da Organização Método sem sobrescrever nome do médico', () => {
    const resolved = resolveMedicoWhiteLabel({
      nome: 'Ricardo Mota',
      metodoImagensAtivo: true,
      whiteLabel: { primaryColor: '#000000' },
      metodoTemplate: {
        ogImageUrl: 'https://cdn.example/platform.png',
        faviconUrl: null,
        pdfLogoUrl: null,
        drPageLogoUrl: null,
        aplicacaoPageLogoUrl: null,
        conclusaoPageLogoUrl: null,
      },
      organizationBranding: {
        ...buildHardcodedOrganizationBranding(METODO_ORGANIZATION),
        publicName: 'Método Emagrecer Oficial',
        primaryColor: '#4CCB7A',
        ogImageUrl: null,
      },
    });

    expect(resolved.brandName).toBe('Dr. Ricardo Mota');
    expect(resolved.primaryColor).toBe('#4CCB7A');
    expect(resolved.ogImageUrl).toBe('https://cdn.example/platform.png');
  });
});
