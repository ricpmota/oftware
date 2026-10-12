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

describe('normalizeOrganizationSlug', () => {
  it('gera slug a partir do nome', () => {
    expect(suggestOrganizationSlugFromName('Endocrino Kamilla Montenegro')).toBe(
      'endocrino-kamilla-montenegro',
    );
    expect(normalizeOrganizationSlug('Método Emagrecer')).toBe('metodo-emagrecer');
    expect(isValidOrganizationSlug('endocrino-kamilla')).toBe(true);
    expect(isValidOrganizationSlug('Método')).toBe(false);
  });
});

describe('normalizeOrganizationPrimaryOrigin', () => {
  it('aceita domínio sem protocolo', () => {
    const origin = normalizeOrganizationPrimaryOrigin('www.endocrinokamillamontenegro.com');
    expect(origin?.primaryOrigin).toBe('https://www.endocrinokamillamontenegro.com');
    expect(origin?.hosts).toEqual([
      'endocrinokamillamontenegro.com',
      'www.endocrinokamillamontenegro.com',
    ]);
  });

  it('aceita apex e normaliza primary com www', () => {
    const origin = normalizeOrganizationPrimaryOrigin('endocrinokamillamontenegro.com');
    expect(origin?.primaryOrigin).toBe('https://www.endocrinokamillamontenegro.com');
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
      name: 'Endocrino Kamilla Montenegro',
      domain: 'www.endocrinokamillamontenegro.com',
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.organizationId).toBe('endocrino-kamilla-montenegro');
      expect(ok.primaryOrigin).toBe('https://www.endocrinokamillamontenegro.com');
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
      id: 'endocrino-kamilla-montenegro',
      name: 'Endocrino Kamilla Montenegro',
      kind: 'organization',
      primaryOrigin: 'https://www.endocrinokamillamontenegro.com',
      hosts: ['endocrinokamillamontenegro.com', 'www.endocrinokamillamontenegro.com'],
    });
    expect(seed.publicName).toBe('Endocrino Kamilla Montenegro');
    expect(seed.siteUrl).toBe('https://www.endocrinokamillamontenegro.com');
    expect(seed.logoMainUrl).toBeNull();
    expect(seed.faviconUrl).toBeNull();
    expect(seed.ogImageUrl).toBeNull();
    expect(seed.publicPages.dr.logoUrl).toBeNull();
  });
});
