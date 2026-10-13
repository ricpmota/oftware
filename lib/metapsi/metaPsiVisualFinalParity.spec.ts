/**
 * ETAPA 6.3.9 — smoke de paridade visual final /metapsi (invariantes de chrome).
 * Não replica HTML; evita regressão das etapas 6.3.1–6.3.7.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  METAPSI_BOTTOM_NAV,
  METAPSI_SHELL_FORBIDDEN_ICON_NAMES,
  METAPSI_SIDEBAR_NAV,
} from './metaPsiShellChrome';

const pageSrc = readFileSync(resolve(__dirname, '../../app/metapsi/page.v2.tsx'), 'utf8');
const workspaceSrc = readFileSync(
  resolve(__dirname, '../../components/metapsi/MetaPsiPacienteWorkspaceModal.tsx'),
  'utf8'
);
const pacientesSrc = readFileSync(
  resolve(__dirname, '../../components/metapsi/MetaPsiPacientesPanel.tsx'),
  'utf8'
);
const homeSrc = readFileSync(
  resolve(__dirname, '../../components/metapsi/MetaPsiDashboardHome.tsx'),
  'utf8'
);

describe('MetaPsi — revisão visual final 6.3.9', () => {
  it('ícones canônicos do shell', () => {
    expect(METAPSI_SIDEBAR_NAV.map((i) => i.iconName)).toEqual([
      'LayoutDashboard',
      'Kanban',
      'Stethoscope',
      'Users',
      'DollarSign',
      'Calendar',
      'Mail',
    ]);
    expect(METAPSI_BOTTOM_NAV.map((i) => i.iconName)).toEqual([
      'LayoutDashboard',
      'Kanban',
      'Users',
      'Mail',
    ]);
    expect(METAPSI_SHELL_FORBIDDEN_ICON_NAMES).toContain('Home');
    expect(METAPSI_SHELL_FORBIDDEN_ICON_NAMES).toContain('MessageSquare');
    expect(pageSrc).not.toMatch(/\bMessageSquare\b/);
    expect(pageSrc).not.toContain('/oftware-site-novo2.png');
  });

  it('Início usa ProfissionalDashboardHome completo + extras Psi', () => {
    expect(pageSrc).toContain('ProfissionalDashboardHome');
    expect(pageSrc).toContain('MetaPsiDashboardHome');
    expect(pageSrc).toContain('hideHeroKpis');
    expect(pageSrc).toContain('MetaPsiHomeLeadsPipeline');
    expect(pageSrc).toContain("case 'leads'");
    expect(homeSrc).toContain('DashboardHeroKpi');
    expect(homeSrc).toContain('DashboardKpiCard');
    expect(homeSrc).not.toContain('Bem-vindo ao MetaPsi');
  });

  it('Pacientes reutiliza carousel + avatar compartilhados', () => {
    expect(pacientesSrc).toContain('SolicitacoesPacientesCarousel');
    expect(pacientesSrc).toContain('VinculoFotoAvatar');
    expect(pacientesSrc).toContain('MetaPsiPacienteWorkspaceModal');
  });

  it('Workspace usa mn-pastas + PacienteModalHeader', () => {
    expect(workspaceSrc).toContain('mn-pastas');
    expect(workspaceSrc).toContain('PacienteModalHeader');
    expect(workspaceSrc).toContain('assertPsiquiatraCanOpenPaciente');
    expect(workspaceSrc).not.toMatch(/indigo/);
  });

  it('Comunicação = OrganizacaoComunicacaoGmailPanel + Mail', () => {
    expect(pageSrc).toContain('OrganizacaoComunicacaoGmailPanel');
    expect(pageSrc).toContain('loadDestinatariosMetapsi');
    expect(pageSrc).not.toContain('Abrir mensagens');
  });

  it('Meu Perfil chrome Nutri (gradient + Salvar Perfil)', () => {
    expect(pageSrc).toContain('data-metapsi-meu-perfil');
    expect(pageSrc).toContain('bg-gradient-to-r from-green-600 to-teal-600');
    expect(pageSrc).toContain('Dados Iniciais');
    expect(pageSrc).toContain('Salvar Perfil');
  });

  it('Financeiro/Calendário permanecem placeholder visual Nutri', () => {
    expect(pageSrc).toContain('data-metapsi-placeholder');
    expect(pageSrc).toContain('O módulo financeiro ainda não está disponível para este perfil.');
    expect(pageSrc).toContain('O calendário ainda não está disponível para este perfil.');
    expect(pageSrc).not.toContain('Nenhuma API de outro profissional');
    expect(pageSrc).not.toContain('backend próprio');
    // Sem implementação operacional
    expect(pageSrc).not.toContain('ProfissionalFinanceiroSection');
    expect(pageSrc).not.toContain('ProfissionalCalendarioSection');
  });

  it('Brain só como identidade Psiquiatria no header mobile', () => {
    expect(pageSrc).toContain('<Brain');
    expect(pageSrc).toContain('identidade Psiquiatria');
  });
});
