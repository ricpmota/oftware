import { describe, expect, it } from 'vitest';
import {
  findDepartmentIdForMenu,
  inferNavContextFromMenu,
  resolveMetaAdminGeralMenuId,
} from '@/lib/metaadmingeral/metaAdminGeralNavUx';

describe('metaAdminGeralNavUx', () => {
  it('resolve alias estatisticas → org-dashboard', () => {
    expect(resolveMetaAdminGeralMenuId('estatisticas')).toBe('org-dashboard');
  });

  it('resolve aliases de deptos legados', () => {
    expect(resolveMetaAdminGeralMenuId('org-marca')).toBe('organizacao-metodo-branding');
    expect(resolveMetaAdminGeralMenuId('org-operacao')).toBe('calendario');
    expect(resolveMetaAdminGeralMenuId('org-configuracoes')).toBe('organizacao-metodo');
  });

  it('findDepartmentIdForMenu — template oficial', () => {
    expect(findDepartmentIdForMenu('emails')).toBe('org-identidade');
    expect(findDepartmentIdForMenu('calendario')).toBe('org-jornada');
    expect(findDepartmentIdForMenu('tirzepatida')).toBe('org-negocio');
  });

  it('infere contexto plataforma vs organização', () => {
    expect(inferNavContextFromMenu('dashboard-oftware')).toBe('platform');
    expect(inferNavContextFromMenu('organizacoes')).toBe('platform');
    expect(inferNavContextFromMenu('oftpay')).toBe('platform');
    expect(inferNavContextFromMenu('medicos')).toBe('organization');
    expect(inferNavContextFromMenu('org-dashboard')).toBe('organization');
    expect(inferNavContextFromMenu('estatisticas')).toBe('organization');
    expect(inferNavContextFromMenu('leads-whitelabel')).toBe('platform');
  });
});
