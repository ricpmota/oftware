import { describe, expect, it } from 'vitest';
import { METODO_ORGANIZATION_ID } from './organizationRegistry';
import { getDefaultOrganizationId, shadowOrganizationFields } from './shadowOrganizationId';

describe('shadowOrganizationId', () => {
  it('retorna ID canônico do Método', () => {
    expect(getDefaultOrganizationId()).toBe(METODO_ORGANIZATION_ID);
    expect(getDefaultOrganizationId()).toBe('metodo');
  });

  it('expõe organizationId para novos documentos', () => {
    expect(shadowOrganizationFields()).toEqual({ organizationId: 'metodo' });
  });
});
