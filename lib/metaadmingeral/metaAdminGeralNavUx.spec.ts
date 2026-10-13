import { describe, expect, it } from 'vitest';
import {
  findDepartmentIdForMenu,
  inferNavContextFromMenu,
  listNavOrganizations,
  resolveMetaAdminGeralMenuId,
} from '@/lib/metaadmingeral/metaAdminGeralNavUx';
import { isDemoOrganization } from '@/lib/organization/isDemoOrganization';

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
    expect(findDepartmentIdForMenu('org-negocio-pacientes')).toBe('org-negocio');
  });

  it('infere contexto plataforma vs organização', () => {
    expect(inferNavContextFromMenu('dashboard-oftware')).toBe('platform');
    expect(inferNavContextFromMenu('organizacoes')).toBe('platform');
    expect(inferNavContextFromMenu('oftpay')).toBe('platform');
    expect(inferNavContextFromMenu('alimentos-globais')).toBe('platform');
    expect(inferNavContextFromMenu('match-saudavel')).toBe('platform');
    expect(inferNavContextFromMenu('disparos')).toBe('platform');
    expect(inferNavContextFromMenu('automacoes-dashboard')).toBe('platform');
    expect(inferNavContextFromMenu('automacoes-canal-chat')).toBe('platform');
    expect(inferNavContextFromMenu('automacoes-logs')).toBe('platform');
    expect(inferNavContextFromMenu('automacoes-ferramentas')).toBe('platform');
    expect(inferNavContextFromMenu('medicos')).toBe('organization');
    expect(inferNavContextFromMenu('org-dashboard')).toBe('organization');
    expect(inferNavContextFromMenu('estatisticas')).toBe('organization');
    expect(inferNavContextFromMenu('leads-whitelabel')).toBe('platform');
  });

  it('findDepartmentIdForMenu — patrimônio alimentos', () => {
    expect(findDepartmentIdForMenu('alimentos-globais')).toBe('platform-patrimonio');
    expect(findDepartmentIdForMenu('match-saudavel')).toBe('platform-patrimonio');
    expect(findDepartmentIdForMenu('disparos')).toBe('platform-patrimonio');
  });

  it('lista ativa omite organização demo', () => {
    const organizations = listNavOrganizations();
    expect(organizations.some((org) => org.id === 'metodo')).toBe(true);
    expect(organizations.every((org) => !isDemoOrganization(org))).toBe(true);
    expect(organizations.some((org) => org.id === 'clinica_exemplo_wl')).toBe(false);
  });

  it('findDepartmentIdForMenu — centro de automações', () => {
    expect(findDepartmentIdForMenu('automacoes-dashboard')).toBe('platform-automacoes');
    expect(findDepartmentIdForMenu('automacoes-canal-chat')).toBe('platform-automacoes');
    expect(findDepartmentIdForMenu('automacoes-templates')).toBe('platform-automacoes');
    expect(findDepartmentIdForMenu('automacoes-ferramentas')).toBe('platform-automacoes');
  });
});
