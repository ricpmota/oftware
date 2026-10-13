import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { filterPacientesVisiveisPsi } from './filterPacientesVisiveisPsi';
import type { PacienteVisivelPsiquiatra } from '@/services/pacientePsiquiatraService';

const panelSrc = readFileSync(
  resolve(__dirname, '../../components/metapsi/MetaPsiPacientesPanel.tsx'),
  'utf8',
);
const pageSrc = readFileSync(resolve(__dirname, '../../app/metapsi/page.v2.tsx'), 'utf8');

function mockItem(
  partial: Partial<PacienteVisivelPsiquiatra> & {
    pacienteId: string;
    medicoId: string;
    status: PacienteVisivelPsiquiatra['status'];
    nome?: string;
    email?: string;
  },
): PacienteVisivelPsiquiatra {
  return {
    vinculoId: `v-${partial.pacienteId}`,
    pacienteId: partial.pacienteId,
    paciente: {
      id: partial.pacienteId,
      nome: partial.nome || partial.pacienteId,
      email: partial.email || '',
      dadosIdentificacao: {
        nomeCompleto: partial.nome || partial.pacienteId,
      },
    } as PacienteVisivelPsiquiatra['paciente'],
    medicoId: partial.medicoId,
    medicoNome: partial.medicoNome || 'Médico',
    dataCompartilhamento: new Date('2026-01-01'),
    status: partial.status,
  };
}

describe('filterPacientesVisiveisPsi — ETAPA 6.3.4', () => {
  const items = [
    mockItem({ pacienteId: 'p1', medicoId: 'm1', status: 'ativo', nome: 'Ana Silva', email: 'ana@x.com' }),
    mockItem({ pacienteId: 'p2', medicoId: 'm1', status: 'inativo', nome: 'Bruno' }),
    mockItem({ pacienteId: 'p3', medicoId: 'm2', status: 'ativo', nome: 'Carla', email: 'carla@x.com' }),
  ];

  it('A — ACL ativa → aparece', () => {
    const r = filterPacientesVisiveisPsi(items);
    expect(r.map((x) => x.pacienteId).sort()).toEqual(['p1', 'p3']);
  });

  it('B — ACL inativa → não aparece', () => {
    expect(filterPacientesVisiveisPsi(items).some((x) => x.pacienteId === 'p2')).toBe(false);
  });

  it('C — médico vinculado sem ACL não entra (lista só com ACL)', () => {
    // p4 seria paciente de m1 sem estar no array — filtro não inventa
    expect(filterPacientesVisiveisPsi(items).every((x) => x.status === 'ativo')).toBe(true);
  });

  it('I — busca só filtra acessíveis', () => {
    const r = filterPacientesVisiveisPsi(items, { busca: 'ana' });
    expect(r).toHaveLength(1);
    expect(r[0].pacienteId).toBe('p1');
    const byMed = filterPacientesVisiveisPsi(items, { medicoId: 'm2' });
    expect(byMed.map((x) => x.pacienteId)).toEqual(['p3']);
  });
});

describe('MetaPsiPacientesPanel — estrutura 6.3.4', () => {
  it('D/E — request pendente no carousel, não na lista ativa', () => {
    expect(panelSrc).toContain('SolicitacoesPacientesCarousel');
    expect(panelSrc).toContain('listPendingRequestsByPsiquiatra');
    expect(panelSrc).toContain("list.filter((p) => p.status === 'ativo')");
  });

  it('F/G — aceite e recusa usam service', () => {
    expect(panelSrc).toContain('approveShareRequest');
    expect(panelSrc).toContain('rejectShareRequest');
  });

  it('H — conflito one-active permanece no service (mensagem de erro)', () => {
    expect(panelSrc).toContain('e instanceof Error ? e.message');
  });

  it('J — abrir card abre MetaPsiPacienteWorkspaceModal', () => {
    expect(panelSrc).toContain('MetaPsiPacienteWorkspaceModal');
    expect(panelSrc).toContain('openWorkspace');
  });

  it('K/L — encerramento usa endCompartilhamento e não remove vínculo médico', () => {
    expect(panelSrc).toContain('endCompartilhamento');
    expect(panelSrc).toMatch(/vínculo profissional com o médico NÃO será removido/i);
  });

  it('M — carousel chrome Nutri', () => {
    expect(panelSrc).toContain('data-metapsi-pacientes-carousel');
    expect(panelSrc).toContain('Solicitações Pendentes');
  });

  it('N — busca padrão Nutri', () => {
    expect(panelSrc).toContain('Buscar paciente por nome ou email...');
    expect(panelSrc).toContain('focus:ring-green-500');
    expect(panelSrc).toContain('data-metapsi-pacientes-busca');
  });

  it('O — cards/tabela radius Nutri', () => {
    expect(panelSrc).toContain('rounded-lg border border-gray-200');
    expect(panelSrc).toContain('data-metapsi-pacientes-table');
    expect(panelSrc).toContain('data-metapsi-pacientes-cards');
  });

  it('P — avatar compartilhado', () => {
    expect(panelSrc).toContain('VinculoFotoAvatar');
  });

  it('Q — loading estruturado', () => {
    expect(panelSrc).toContain('data-metapsi-pacientes-skeleton');
    expect(panelSrc).toContain('animate-spin');
    expect(panelSrc).not.toMatch(/>\s*Carregando…\s*</);
  });

  it('R — empty states Nutri', () => {
    expect(panelSrc).toContain('Nenhum paciente compartilhado');
    expect(panelSrc).toContain('Nenhum paciente encontrado');
  });

  it('S — mobile min-w-0', () => {
    expect(panelSrc).toContain('min-w-0');
  });

  it('T — bottom nav shell permanece', () => {
    expect(pageSrc).toContain('data-metapsi-bottom-nav');
  });

  it('painel Pacientes não embute mn-pastas (workspace é componente separado)', () => {
    expect(panelSrc).not.toContain('mn-pastas');
    expect(panelSrc).toContain('MetaPsiPacienteWorkspaceModal');
  });
});
