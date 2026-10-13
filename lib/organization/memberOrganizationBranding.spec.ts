import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { buildNewOrganizationBrandingSeed } from './buildNewOrganizationBrandingSeed';
import { buildHardcodedOrganizationBranding } from './organizationBrandingDefaults';
import { buildMemberOrganizationBrandingPayload } from './memberOrganizationBranding';
import { METODO_ORGANIZATION } from './organizationRegistry';
import { resolveMemberOrganizationId } from './resolveMemberOrganizationId';
import { resolveOrganizationIdFromHostRecords } from './resolveOrganizationIdFromHostRecords';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';

const KAMILLA_ORG = {
  id: 'kamilla-montenegro',
  name: 'Kamilla Montenegro',
  kind: 'organization' as const,
  primaryOrigin: 'https://www.endocrinokamillamontenegro.com.br',
  hosts: ['endocrinokamillamontenegro.com.br', 'www.endocrinokamillamontenegro.com.br'],
};

function kamillaBranding(): OrganizationBrandingStored {
  return {
    ...buildNewOrganizationBrandingSeed(KAMILLA_ORG),
    publicName: 'Endócrino Kamilla Montenegro',
    logoMainUrl: 'https://storage.example/kamilla/logo-main.png',
    logoLightUrl: 'https://storage.example/kamilla/logo-light.png',
    logoDarkUrl: 'https://storage.example/kamilla/logo-dark.png',
    iconUrl: 'https://storage.example/kamilla/icon.png',
    faviconUrl: 'https://storage.example/kamilla/favicon.ico',
    pdfLogoUrl: 'https://storage.example/kamilla/pdf.png',
    primaryColor: '#7C3AED',
    secondaryColor: '#1E1B4B',
    accentColor: '#C4B5FD',
  };
}

const HOSTS = [
  {
    id: 'metodo',
    hosts: ['ometodoemagrecer.com.br', 'www.ometodoemagrecer.com.br'],
    status: 'active',
  },
  {
    id: 'kamilla-montenegro',
    hosts: ['endocrinokamillamontenegro.com.br', 'www.endocrinokamillamontenegro.com.br'],
    status: 'active',
  },
];

describe('resolveOrganizationIdFromHostRecords', () => {
  it('domínio da Kamilla resolve para kamilla-montenegro', () => {
    expect(
      resolveOrganizationIdFromHostRecords('www.endocrinokamillamontenegro.com.br', HOSTS),
    ).toBe('kamilla-montenegro');
    expect(
      resolveOrganizationIdFromHostRecords('endocrinokamillamontenegro.com.br', HOSTS),
    ).toBe('kamilla-montenegro');
  });

  it('domínio do Método continua no Método e host desconhecido não herda marca', () => {
    expect(resolveOrganizationIdFromHostRecords('www.ometodoemagrecer.com.br', HOSTS)).toBe('metodo');
    expect(resolveOrganizationIdFromHostRecords('www.oftware.com.br', HOSTS)).toBeNull();
    expect(
      resolveOrganizationIdFromHostRecords('www.endocrinokamillamontenegro.com.br', [
        { ...HOSTS[1], status: 'removed' },
      ]),
    ).toBeNull();
  });
});

describe('buildMemberOrganizationBrandingPayload', () => {
  const metodoBranding = buildHardcodedOrganizationBranding(METODO_ORGANIZATION);
  const kamilla = kamillaBranding();

  it('médico do Método recebe a marca do Método', () => {
    const payload = buildMemberOrganizationBrandingPayload({
      member: { organizationId: 'metodo' },
      legacyDefault: 'none',
      organizationExists: true,
      branding: metodoBranding,
      hostOrganizationId: 'metodo',
    });
    expect(payload.organizationId).toBe('metodo');
    expect(payload.organizationMatch).toBe(true);
    expect(payload.branding?.publicName).toBe('Método Emagrecer');
    expect(payload.branding?.primaryColor).toBe('#4CCB7A');
    expect(payload.branding?.secondaryColor).toBe('#0A1F44');
    expect(payload.branding?.logoMainUrl).toBe(metodoBranding.logoMainUrl);
  });

  it('médico da Kamilla recebe a marca da Kamilla, sem herdar o Método', () => {
    const payload = buildMemberOrganizationBrandingPayload({
      member: { organizationId: 'kamilla-montenegro', metodoImagensAtivo: false },
      legacyDefault: 'none',
      organizationExists: true,
      branding: kamilla,
      hostOrganizationId: 'kamilla-montenegro',
    });
    expect(payload.organizationId).toBe('kamilla-montenegro');
    expect(payload.branding?.publicName).toBe('Endócrino Kamilla Montenegro');
    expect(payload.branding?.logoMainUrl).toBe('https://storage.example/kamilla/logo-main.png');
    expect(payload.branding?.logoLightUrl).toBe('https://storage.example/kamilla/logo-light.png');
    expect(payload.branding?.faviconUrl).toBe('https://storage.example/kamilla/favicon.ico');
    expect(payload.branding?.iconUrl).toBe('https://storage.example/kamilla/icon.png');
    expect(payload.branding?.pdfLogoUrl).toBe('https://storage.example/kamilla/pdf.png');
    expect(payload.branding?.primaryColor).toBe('#7C3AED');
    expect(payload.branding?.secondaryColor).toBe('#1E1B4B');
    expect(payload.branding?.accentColor).toBe('#C4B5FD');
    expect(JSON.stringify(payload.branding)).not.toMatch(/#4CCB7A|#0A1F44|metodo-emagrecer-logotipo/);
  });

  it.each(['metodo', 'none'] as const)(
    'personal, nutricionista e psicólogo com vínculo recebem a organização (%s)',
    (legacyDefault) => {
      for (const _role of ['personal', 'nutricionista', 'psiquiatra']) {
        const payload = buildMemberOrganizationBrandingPayload({
          member: { organizationId: 'kamilla-montenegro' },
          legacyDefault,
          organizationExists: true,
          branding: kamilla,
          hostOrganizationId: null,
        });
        expect(payload.organizationId).toBe('kamilla-montenegro');
        expect(payload.branding?.logoMainUrl).toBe(kamilla.logoMainUrl);
        expect(payload.organizationMatch).toBe(true);
      }
    },
  );

  it('organização inexistente não recebe marca de outra', () => {
    const payload = buildMemberOrganizationBrandingPayload({
      member: { organizationId: 'org-inexistente' },
      legacyDefault: 'none',
      organizationExists: false,
      branding: metodoBranding,
      hostOrganizationId: null,
    });
    expect(payload.organizationId).toBe('org-inexistente');
    expect(payload.branding).toBeNull();
  });

  it('divergência de domínio sinaliza conflito e mantém a marca do usuário', () => {
    const payload = buildMemberOrganizationBrandingPayload({
      member: { organizationId: 'metodo' },
      legacyDefault: 'none',
      organizationExists: true,
      branding: metodoBranding,
      hostOrganizationId: 'kamilla-montenegro',
    });
    expect(payload.organizationMatch).toBe(false);
    expect(payload.hostOrganizationId).toBe('kamilla-montenegro');
    expect(payload.organizationId).toBe('metodo');
    expect(payload.branding?.logoMainUrl).toBe(metodoBranding.logoMainUrl);
  });

  it('preserva profissional legado e não pinta médico sem vínculo como Método', () => {
    expect(resolveMemberOrganizationId({ metodoImagensAtivo: true }, 'none')).toBe('metodo');
    expect(resolveMemberOrganizationId({ organizationId: 'metodo' }, 'none')).toBe('metodo');
    expect(resolveMemberOrganizationId({ organizationId: null, metodoImagensAtivo: false }, 'none')).toBe(
      null,
    );
    expect(resolveMemberOrganizationId({}, 'metodo')).toBe('metodo');

    const legadoPortal = buildMemberOrganizationBrandingPayload({
      member: {},
      legacyDefault: 'metodo',
      organizationExists: true,
      branding: metodoBranding,
      hostOrganizationId: 'metodo',
    });
    expect(legadoPortal.organizationId).toBe('metodo');
    expect(legadoPortal.branding?.primaryColor).toBe('#4CCB7A');

    const medicoSemVinculo = buildMemberOrganizationBrandingPayload({
      member: {},
      legacyDefault: 'none',
      organizationExists: true,
      branding: metodoBranding,
      hostOrganizationId: null,
    });
    expect(medicoSemVinculo.organizationId).toBeNull();
    expect(medicoSemVinculo.branding).toBeNull();
  });

  it('carregamento não dispara migração nem aceita organizationId do cliente', () => {
    const loader = readFileSync(
      new URL('./loadMemberOrganizationBranding.server.ts', import.meta.url),
      'utf8',
    );
    expect(loader).not.toContain('ensureOfficialOrganizationBrandingOwnership');
    expect(loader).not.toContain('searchParams');

    const before = kamilla.logoMainUrl;
    buildMemberOrganizationBrandingPayload({
      member: { organizationId: 'kamilla-montenegro' },
      legacyDefault: 'none',
      organizationExists: true,
      branding: kamilla,
      hostOrganizationId: 'kamilla-montenegro',
    });
    expect(kamilla.logoMainUrl).toBe(before);
    expect(kamilla.primaryColor).toBe('#7C3AED');
  });
});
