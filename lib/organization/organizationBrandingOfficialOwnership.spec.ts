import { describe, expect, it } from 'vitest';
import { buildNewOrganizationBrandingSeed } from './buildNewOrganizationBrandingSeed';
import { ORGANIZATION_BRANDING_SEED_VERSION } from './organizationBrandingDefaults';
import {
  buildNonMetodoOwnershipMigrationBranding,
  needsOfficialOwnershipMigration,
} from './organizationBrandingOfficialOwnership';
import type { OrganizationBrandingStored } from './organizationBrandingTypes';
import type { OrganizationDefinition } from './organizationTypes';

const KAMILLA: OrganizationDefinition = {
  id: 'kamilla-montenegro',
  name: 'Kamilla Montenegro',
  kind: 'organization',
  primaryOrigin: 'https://www.endocrinokamillamontenegro.com.br',
  hosts: ['endocrinokamillamontenegro.com.br', 'www.endocrinokamillamontenegro.com.br'],
};

const METODO_ASSET =
  /metodo-simbolo|simbolo-metodo|og-metodo|metodo-emagrecer-logotipo|#4CCB7A|#0A1F44/i;

function customizedBranding(seedVersion?: string): OrganizationBrandingStored {
  const base = buildNewOrganizationBrandingSeed(KAMILLA);
  return {
    ...base,
    publicName: 'Endócrino Kamilla Montenegro',
    legalName: 'Kamilla Montenegro LTDA',
    slogan: 'Endocrinologia',
    logoMainUrl: 'https://storage.example/kamilla/logo-main.png',
    logoDarkUrl: 'https://storage.example/kamilla/logo-dark.png',
    logoLightUrl: 'https://storage.example/kamilla/logo-light.png',
    iconUrl: 'https://storage.example/kamilla/icon.png',
    faviconUrl: 'https://storage.example/kamilla/favicon.ico',
    ogImageUrl: 'https://storage.example/kamilla/og.png',
    pdfLogoUrl: 'https://storage.example/kamilla/pdf.png',
    watermarkUrl: 'https://storage.example/kamilla/watermark.png',
    primaryColor: '#7C3AED',
    secondaryColor: '#1E1B4B',
    accentColor: '#C4B5FD',
    backgroundColor: '#FAF5FF',
    publicPages: {
      dr: {
        backgroundColor: '#111111',
        textColor: '#FFFFFF',
        logoUrl: 'https://storage.example/kamilla/dr.png',
      },
      aplicacao: {
        backgroundColor: '#222222',
        textColor: '#EEEEEE',
        logoUrl: 'https://storage.example/kamilla/aplicacao.png',
      },
      conclusao: {
        backgroundColor: '#333333',
        textColor: '#DDDDDD',
        logoUrl: 'https://storage.example/kamilla/conclusao.png',
      },
    },
    siteUrl: 'https://www.endocrinokamillamontenegro.com.br',
    seedVersion,
    seededAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  };
}

function expectCustomIdentityPreserved(branding: OrganizationBrandingStored) {
  expect(branding.publicName).toBe('Endócrino Kamilla Montenegro');
  expect(branding.legalName).toBe('Kamilla Montenegro LTDA');
  expect(branding.logoMainUrl).toBe('https://storage.example/kamilla/logo-main.png');
  expect(branding.logoDarkUrl).toBe('https://storage.example/kamilla/logo-dark.png');
  expect(branding.logoLightUrl).toBe('https://storage.example/kamilla/logo-light.png');
  expect(branding.iconUrl).toBe('https://storage.example/kamilla/icon.png');
  expect(branding.faviconUrl).toBe('https://storage.example/kamilla/favicon.ico');
  expect(branding.ogImageUrl).toBe('https://storage.example/kamilla/og.png');
  expect(branding.pdfLogoUrl).toBe('https://storage.example/kamilla/pdf.png');
  expect(branding.watermarkUrl).toBe('https://storage.example/kamilla/watermark.png');
  expect(branding.primaryColor).toBe('#7C3AED');
  expect(branding.secondaryColor).toBe('#1E1B4B');
  expect(branding.accentColor).toBe('#C4B5FD');
  expect(branding.publicPages.dr.logoUrl).toBe('https://storage.example/kamilla/dr.png');
  expect(branding.publicPages.aplicacao.logoUrl).toBe('https://storage.example/kamilla/aplicacao.png');
  expect(branding.publicPages.conclusao.backgroundColor).toBe('#333333');
  expect(branding.siteUrl).toBe('https://www.endocrinokamillamontenegro.com.br');
  expect(JSON.stringify(branding)).not.toMatch(METODO_ASSET);
}

describe('needsOfficialOwnershipMigration', () => {
  it('não migra branding já na versão oficial', () => {
    expect(needsOfficialOwnershipMigration(customizedBranding(ORGANIZATION_BRANDING_SEED_VERSION))).toBe(
      false,
    );
  });

  it('migra seed legado, ausente ou anterior', () => {
    expect(needsOfficialOwnershipMigration(customizedBranding('10.2.0'))).toBe(true);
    expect(needsOfficialOwnershipMigration(customizedBranding(undefined))).toBe(true);
    expect(needsOfficialOwnershipMigration(customizedBranding(''))).toBe(true);
    expect(needsOfficialOwnershipMigration(customizedBranding('11.0.0'))).toBe(true);
    expect(needsOfficialOwnershipMigration(null)).toBe(true);
  });
});

describe('buildNonMetodoOwnershipMigrationBranding', () => {
  const now = '2026-10-13T12:00:00.000Z';

  it.each(['10.2.0', undefined, '', '11.0.0'] as const)(
    'preserva a marca personalizada ao alinhar seed %s',
    (seedVersion) => {
      const existing = customizedBranding(seedVersion);
      const migrated = buildNonMetodoOwnershipMigrationBranding(KAMILLA, existing, now);

      expectCustomIdentityPreserved(migrated);
      expect(migrated.seedVersion).toBe(ORGANIZATION_BRANDING_SEED_VERSION);
      expect(migrated.seededAt).toBe('2026-01-01T00:00:00.000Z');
      expect(migrated.updatedAt).toBe(now);
      expect(needsOfficialOwnershipMigration(migrated)).toBe(false);
    },
  );

  it('é idempotente: uma segunda passagem não troca logos nem cores', () => {
    const once = buildNonMetodoOwnershipMigrationBranding(
      KAMILLA,
      customizedBranding('10.2.0'),
      now,
    );
    const twice = buildNonMetodoOwnershipMigrationBranding(
      KAMILLA,
      once,
      '2026-10-14T12:00:00.000Z',
    );

    expectCustomIdentityPreserved(twice);
    expect(twice.seedVersion).toBe(once.seedVersion);
    expect(twice.seededAt).toBe(once.seededAt);
    expect(twice.logoMainUrl).toBe(once.logoMainUrl);
    expect(twice.primaryColor).toBe(once.primaryColor);
    expect(twice.publicPages).toEqual(once.publicPages);
  });

  it('sem branding existente grava seed neutro, sem assets do Método', () => {
    const seeded = buildNonMetodoOwnershipMigrationBranding(KAMILLA, null, now);
    const neutral = buildNewOrganizationBrandingSeed(KAMILLA);

    expect(seeded.publicName).toBe(KAMILLA.name);
    expect(seeded.logoMainUrl).toBeNull();
    expect(seeded.faviconUrl).toBeNull();
    expect(seeded.primaryColor).toBe(neutral.primaryColor);
    expect(seeded.secondaryColor).toBe(neutral.secondaryColor);
    expect(seeded.publicPages.dr.logoUrl).toBeNull();
    expect(seeded.seedVersion).toBe(ORGANIZATION_BRANDING_SEED_VERSION);
    expect(JSON.stringify(seeded)).not.toMatch(METODO_ASSET);
    expect(needsOfficialOwnershipMigration(seeded)).toBe(false);
  });
});
