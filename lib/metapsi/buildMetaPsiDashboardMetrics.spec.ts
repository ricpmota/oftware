import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildMetaPsiDashboardMetrics } from './buildMetaPsiDashboardMetrics';

const pageSrc = readFileSync(resolve(__dirname, '../../app/metapsi/page.v2.tsx'), 'utf8');
const homeSrc = readFileSync(
  resolve(__dirname, '../../components/metapsi/MetaPsiDashboardHome.tsx'),
  'utf8',
);

describe('buildMetaPsiDashboardMetrics — ETAPA 6.3.2', () => {
  const now = new Date('2026-09-17T12:00:00.000Z');

  it('A — paciente ativo conta somente ACL ativa', () => {
    const m = buildMetaPsiDashboardMetrics({
      vinculos: [
        { status: 'ativo', dataCompartilhamento: new Date('2026-09-01T00:00:00.000Z') },
        { status: 'ativo', dataCompartilhamento: new Date('2026-08-01T00:00:00.000Z') },
      ],
      medicoVinculadoIds: [],
      compartilhamentosPendentes: 0,
      vinculosPendentesRecebidos: 0,
      now,
    });
    expect(m.pacientesAtivos).toBe(2);
  });

  it('B — paciente inativo não conta', () => {
    const m = buildMetaPsiDashboardMetrics({
      vinculos: [
        { status: 'ativo', dataCompartilhamento: now },
        { status: 'inativo', dataCompartilhamento: now },
        { status: 'removido', dataCompartilhamento: now },
      ],
      medicoVinculadoIds: ['m1'],
      compartilhamentosPendentes: 0,
      vinculosPendentesRecebidos: 0,
      now,
    });
    expect(m.pacientesAtivos).toBe(1);
  });

  it('C — médico vinculado conta corretamente (dedup)', () => {
    const m = buildMetaPsiDashboardMetrics({
      vinculos: [],
      medicoVinculadoIds: ['m1', 'm1', ' m2 ', ''],
      compartilhamentosPendentes: 0,
      vinculosPendentesRecebidos: 0,
      now,
    });
    expect(m.medicosVinculados).toBe(2);
  });

  it('D — solicitação pendente conta corretamente', () => {
    const m = buildMetaPsiDashboardMetrics({
      vinculos: [],
      medicoVinculadoIds: [],
      compartilhamentosPendentes: 3,
      vinculosPendentesRecebidos: 2,
      now,
    });
    expect(m.compartilhamentosPendentes).toBe(3);
    expect(m.vinculosPendentesRecebidos).toBe(2);
    expect(m.solicitacoesAguardandoAcao).toBe(5);
  });

  it('novos compartilhamentos respeitam janela recentDays', () => {
    const m = buildMetaPsiDashboardMetrics({
      vinculos: [
        { status: 'ativo', dataCompartilhamento: new Date('2026-09-10T00:00:00.000Z') },
        { status: 'ativo', dataCompartilhamento: new Date('2026-07-01T00:00:00.000Z') },
      ],
      medicoVinculadoIds: [],
      compartilhamentosPendentes: 0,
      vinculosPendentesRecebidos: 0,
      recentDays: 30,
      now,
    });
    expect(m.novosCompartilhamentosRecentes).toBe(1);
    expect(m.compartilhamentoTimestamps).toHaveLength(2);
  });
});

describe('MetaPsiDashboardHome — paridade estrutural 6.3.2', () => {
  it('E — dados zerados usam dashboard completo (não EmptyPanel genérico)', () => {
    expect(pageSrc).toContain('ProfissionalDashboardHome');
    expect(pageSrc).toContain('MetaPsiDashboardHome');
    expect(pageSrc).toMatch(/case 'home':/);
    expect(homeSrc).toContain('DashboardHeroKpi');
    expect(homeSrc).toContain('DashboardKpiCard');
    expect(homeSrc).toContain('Nenhuma pendência no momento');
  });

  it('F — loading usa padrão estruturado (skeleton)', () => {
    expect(homeSrc).toContain('data-metapsi-home-skeleton');
    expect(homeSrc).toContain('animate-pulse');
    expect(homeSrc).not.toMatch(/>\s*Carregando\.\.\.\s*</);
  });

  it('G — quick actions apontam para menus válidos', () => {
    expect(homeSrc).toContain("onNavigate('pacientes')");
    expect(homeSrc).toContain("onNavigate('medicos')");
    expect(homeSrc).toContain("onNavigate('comunicacao')");
    expect(homeSrc).toContain("onNavigate('leads')");
    expect(homeSrc).toContain('data-metapsi-home-quick-actions');
    expect(homeSrc).not.toMatch(/Nova consulta|Nova prescrição|Nova anamnese/);
  });

  it('H — layout evita overflow horizontal estrutural', () => {
    expect(homeSrc).toContain('min-w-0 w-full');
    expect(homeSrc).toContain('grid-cols-2');
    expect(homeSrc).toContain('lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]');
  });

  it('I — bottom nav / shell 6.3.1 permanece (página não remove)', () => {
    expect(pageSrc).toContain('data-metapsi-bottom-nav');
    expect(pageSrc).toContain('pb-20');
  });

  it('J — Início completo via ProfissionalDashboardHome; extras Psi sem clínica nova', () => {
    expect(pageSrc).toContain('ProfissionalDashboardHome');
    expect(pageSrc).toContain("from '@/components/profissional/dashboard/ProfissionalDashboardHome'");
    expect(homeSrc).not.toMatch(/anamnese|prescri[cç][aã]o|escala|evolu[cç][aã]o psiqui/i);
    expect(homeSrc).not.toContain('NutritionPortfolioOverview');
  });

  it('Leads MetaPsi usa pipeline role psiquiatra', () => {
    expect(pageSrc).toContain('MetaPsiHomeLeadsPipeline');
    expect(pageSrc).toContain("case 'leads'");
    const leadsSrc = readFileSync(
      resolve(__dirname, '../../components/metapsi/MetaPsiHomeLeadsPipeline.tsx'),
      'utf8',
    );
    expect(leadsSrc).toContain('role="psiquiatra"');
    expect(leadsSrc).toContain('LeadsProfissionalCrmView');
  });
});
