import { describe, expect, it } from 'vitest';
import { METODO_ORGANIZATION } from './organizationRegistry';
import {
  isDoctorStylePublicName,
} from './organizationBrandingPublicNameRepair';

describe('organizationBrandingPublicNameRepair', () => {
  it('detecta nome estilo médico', () => {
    expect(isDoctorStylePublicName('Dr. Ricardo Mota')).toBe(true);
    expect(isDoctorStylePublicName('Dra. Maria Silva')).toBe(true);
    expect(isDoctorStylePublicName('Método Emagrecer')).toBe(false);
  });

  it('nome da organização não é estilo médico', () => {
    expect(isDoctorStylePublicName(METODO_ORGANIZATION.name)).toBe(false);
  });
});
