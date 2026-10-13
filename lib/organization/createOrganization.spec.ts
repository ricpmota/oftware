import { describe, expect, it } from 'vitest';
import { validateCreateOrganizationInput } from './createOrganization.server';
import { isDemoOrganization } from './isDemoOrganization';
import { normalizeOrganizationPrimaryOrigin } from './normalizeOrganizationPrimaryOrigin';
import {
  isValidOrganizationSlug,
  normalizeOrganizationSlug,
  suggestOrganizationSlugFromName,
} from './normalizeOrganizationSlug';
import { parseOrganizationDefinition } from './parseOrganizationDefinition';
import { buildNewOrganizationBrandingSeed } from './buildNewOrganizationBrandingSeed';
import { listNavOrganizations } from '@/lib/metaadmingeral/metaAdminGeralNavUx';

describe('normalizeOrganizationSlug', () => {
  it('gera slug a partir do nome', () => {
    expect(suggestOrganizationSlugFromName('Clínica Saúde Total')).toBe('clinica-saude-total');
    expect(normalizeOrganizationSlug('Método Emagrecer')).toBe('metodo-emagrecer');
    expect(isValidOrganizationSlug('endocrino-kamilla')).toBe(true);
    expect(isValidOrganizationSlug('Método')).toBe(false);
  });
});

describe('normalizeOrganizationPrimaryOrigin', () => {
  it('aceita domínio sem protocolo', () => {
    const origin = normalizeOrganizationPrimaryOrigin('www.clinicasaudetotal.com.br');
    expect(origin?.primaryOrigin).toBe('https://www.clinicasaudetotal.com.br');
    expect(origin?.hosts).toEqual([
      'clinicasaudetotal.com.br',
      'www.clinicasaudetotal.com.br',
    ]);
  });

  it('aceita apex e normaliza primary com www', () => {
    const origin = normalizeOrganizationPrimaryOrigin('clinicasaudetotal.com.br');
    expect(origin?.primaryOrigin).toBe('https://www.clinicasaudetotal.com.br');
  });
});

describe('listNavOrganizations', () => {
  it('omite Clínica Exemplo WL da lista ativa do MAG', () => {
    const organizations = listNavOrganizations();
    expect(organizations.some((org) => org.id === 'metodo')).toBe(true);
    expect(organizations.every((org) => !isDemoOrganization(org))).toBe(true);
    expect(organizations.some((org) => org.id === 'clinica_exemplo_wl')).toBe(false);
  });
});

describe('isDemoOrganization', () => {
  it('detecta Clínica Exemplo WL', () => {
    expect(
      isDemoOrganization({
        id: 'clinica-exemplo-wl',
        name: 'Clínica Exemplo WL',
        hosts: ['www.clinicaexemplo.com.br'],
      }),
    ).toBe(true);
    expect(
      isDemoOrganization({
        id: 'clinica_exemplo_wl',
        name: 'Clínica Exemplo WL',
        hosts: ['app.clinicaexemplo.com.br'],
      }),
    ).toBe(true);
    expect(
      isDemoOrganization({
        id: 'metodo',
        name: 'Método Emagrecer',
        hosts: ['www.ometodoemagrecer.com.br'],
      }),
    ).toBe(false);
  });
});

describe('validateCreateOrganizationInput', () => {
  it('valida payload mínimo', () => {
    const ok = validateCreateOrganizationInput({
      name: 'Clínica Saúde Total',
      domain: 'www.clinicasaudetotal.com.br',
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.organizationId).toBe('clinica-saude-total');
      expect(ok.primaryOrigin).toBe('https://www.clinicasaudetotal.com.br');
    }
  });

  it('bloqueia ID metodo e demo', () => {
    expect(
      validateCreateOrganizationInput({
        name: 'Org Teste',
        organizationId: 'metodo',
        domain: 'www.exemplo.com',
      }).ok,
    ).toBe(false);
    expect(
      validateCreateOrganizationInput({
        name: 'Clínica Exemplo WL',
        domain: 'www.clinicaexemplo.com.br',
      }).ok,
    ).toBe(false);
    expect(
      validateCreateOrganizationInput({
        name: 'Dra. Maria Silva',
        domain: 'www.clinicasaudetotal.com.br',
      }).ok,
    ).toBe(false);
  });
});

describe('parseOrganizationDefinition', () => {
  it('ignora status removed', () => {
    expect(
      parseOrganizationDefinition('clinica-exemplo', {
        name: 'Clínica Exemplo WL',
        primaryOrigin: 'https://www.clinicaexemplo.com.br',
        hosts: ['clinicaexemplo.com.br'],
        status: 'removed',
      }),
    ).toBeNull();
  });
});

describe('buildNewOrganizationBrandingSeed', () => {
  it('não usa logos do Método', () => {
    const seed = buildNewOrganizationBrandingSeed({
      id: 'clinica-saude-total',
      name: 'Clínica Saúde Total',
      kind: 'organization',
      primaryOrigin: 'https://www.clinicasaudetotal.com.br',
      hosts: ['clinicasaudetotal.com.br', 'www.clinicasaudetotal.com.br'],
    });
    expect(seed.publicName).toBe('Clínica Saúde Total');
    expect(seed.siteUrl).toBe('https://www.clinicasaudetotal.com.br');
    expect(seed.logoMainUrl).toBeNull();
    expect(seed.faviconUrl).toBeNull();
    expect(seed.ogImageUrl).toBeNull();
    expect(seed.publicPages.dr.logoUrl).toBeNull();
    expect(seed.primaryColor).not.toBe('#4CCB7A');
    expect(seed.showPoweredByOftware).toBe(false);
    expect(JSON.stringify(seed)).not.toMatch(/metodo-simbolo|simbolo-metodo|og-metodo|metodo-emagrecer-logotipo/);
  });
});
