import { describe, expect, it } from 'vitest';
import {
  assertCanApprovePsiquiatra,
  formatPsiquiatraRegistroAdmin,
  psiquiatraApprovalPatch,
  psiquiatraMatchesAdminSearch,
} from '@/services/psiquiatraService';
import { PSIQUIATRA_STATUS } from '@/features/metaPsi/metaPsi.constants';

describe('psiquiatraService — aprovação admin', () => {
  it('psiquiatraApprovalPatch define isVerificado e status ativo', () => {
    expect(psiquiatraApprovalPatch()).toEqual({
      isVerificado: true,
      status: PSIQUIATRA_STATUS.ATIVO,
    });
  });

  it('assertCanApprovePsiquiatra permite autoaprovação (testes / gestor com perfil Psi)', () => {
    expect(() => assertCanApprovePsiquiatra('uid-mesmo', 'uid-mesmo')).not.toThrow();
  });

  it('assertCanApprovePsiquiatra rejeita UID alvo vazio', () => {
    expect(() => assertCanApprovePsiquiatra('gestor', '')).toThrow(/UID inválido/i);
  });

  it('assertCanApprovePsiquiatra permite gestor diferente', () => {
    expect(() => assertCanApprovePsiquiatra('gestor-admin', 'psi-uid')).not.toThrow();
  });

  it('formatPsiquiatraRegistroAdmin monta CRM / UF', () => {
    expect(formatPsiquiatraRegistroAdmin({ registroNumero: '12345', crmUf: 'SP' })).toBe(
      '12345 / SP'
    );
    expect(formatPsiquiatraRegistroAdmin({ registroNumero: '', crmUf: '' })).toBe('N/A');
  });

  it('psiquiatraMatchesAdminSearch filtra por nome, email e CRM', () => {
    const psi = {
      nome: 'Ana Silva',
      email: 'ana@oftware.com',
      registroNumero: '99887',
    };
    expect(psiquiatraMatchesAdminSearch(psi, 'ana')).toBe(true);
    expect(psiquiatraMatchesAdminSearch(psi, 'oftware')).toBe(true);
    expect(psiquiatraMatchesAdminSearch(psi, '99887')).toBe(true);
    expect(psiquiatraMatchesAdminSearch(psi, 'xyz')).toBe(false);
    expect(psiquiatraMatchesAdminSearch(psi, '')).toBe(true);
  });
});
