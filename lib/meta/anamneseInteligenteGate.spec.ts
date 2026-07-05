import { describe, expect, it } from 'vitest';
import {
  isAnamneseInteligenteAtivoParaMedico,
  isMetaAdminGeralEmail,
  METAADMIN_GERAL_EMAIL,
} from '@/lib/meta/anamneseInteligenteGate';

describe('anamneseInteligenteGate', () => {
  it('identifica admin geral', () => {
    expect(isMetaAdminGeralEmail(METAADMIN_GERAL_EMAIL)).toBe(true);
    expect(isMetaAdminGeralEmail('  Ricpmota.Med@Gmail.com ')).toBe(true);
    expect(isMetaAdminGeralEmail('outro@med.com')).toBe(false);
  });

  it('admin geral sempre ativo mesmo sem flag', () => {
    expect(isAnamneseInteligenteAtivoParaMedico({ email: METAADMIN_GERAL_EMAIL })).toBe(true);
    expect(
      isAnamneseInteligenteAtivoParaMedico({
        email: METAADMIN_GERAL_EMAIL,
        anamneseInteligenteAtivo: false,
      })
    ).toBe(true);
  });

  it('demais médicos só com flag explícita', () => {
    expect(isAnamneseInteligenteAtivoParaMedico({ email: 'dr@clinic.com' })).toBe(false);
    expect(
      isAnamneseInteligenteAtivoParaMedico({
        email: 'dr@clinic.com',
        anamneseInteligenteAtivo: true,
      })
    ).toBe(true);
  });
});
