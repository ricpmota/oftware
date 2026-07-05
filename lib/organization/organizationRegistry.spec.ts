import { describe, expect, it } from 'vitest';
import { isGlobalAssetModule, GLOBAL_ASSET_MODULES } from './globalAssetRegistry';
import {
  METODO_ORGANIZATION,
  METODO_ORGANIZATION_ID,
  getDefaultOrganization,
  getOrganizationById,
  listOrganizations,
} from './organizationRegistry';
import { normalizeOrganizationHost, resolveOrganizationFromHost } from './resolveOrganizationFromHost';
import {
  buildOrganizationPublicUrl,
  resolveOrganizationPublicOrigin,
} from './organizationUrls';

describe('organizationRegistry', () => {
  it('registra Método Emagrecer como organização inicial', () => {
    expect(METODO_ORGANIZATION.id).toBe('metodo');
    expect(METODO_ORGANIZATION.name).toBe('Método Emagrecer');
    expect(METODO_ORGANIZATION.primaryOrigin).toBe('https://www.ometodoemagrecer.com.br');
    expect(listOrganizations()).toHaveLength(1);
    expect(getDefaultOrganization().id).toBe(METODO_ORGANIZATION_ID);
    expect(getOrganizationById('metodo')).toEqual(METODO_ORGANIZATION);
    expect(getOrganizationById('inexistente')).toBeNull();
  });
});

describe('resolveOrganizationFromHost', () => {
  it('resolve host do Método', () => {
    expect(normalizeOrganizationHost('WWW.OmetodoEmagrecer.com.br:443')).toBe(
      'www.ometodoemagrecer.com.br',
    );
    expect(resolveOrganizationFromHost('www.ometodoemagrecer.com.br')?.id).toBe('metodo');
    expect(resolveOrganizationFromHost('ometodoemagrecer.com.br')?.id).toBe('metodo');
    expect(resolveOrganizationFromHost('www.oftware.com.br')).toBeNull();
  });
});

describe('organizationUrls', () => {
  it('monta URLs no domínio da organização', () => {
    expect(resolveOrganizationPublicOrigin('metodo')).toBe(
      'https://www.ometodoemagrecer.com.br',
    );
    expect(buildOrganizationPublicUrl('metodo', '/meta')).toBe(
      'https://www.ometodoemagrecer.com.br/meta',
    );
  });
});

describe('globalAssetRegistry', () => {
  it('lista patrimônio global sem organizationId', () => {
    expect(GLOBAL_ASSET_MODULES).toContain('protocolos');
    expect(isGlobalAssetModule('protocolos')).toBe(true);
    expect(isGlobalAssetModule('pacientes')).toBe(false);
  });
});
