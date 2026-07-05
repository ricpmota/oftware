import { describe, expect, it } from 'vitest';
import {
  buildPaciente360SummariesForLeads,
  resolvePacienteForLead,
  buildPacienteLookupIndex,
} from '@/lib/paciente360/buildPaciente360SummariesForLeads';
import type { LeadMedico } from '@/types/leadMedico';
import type { PacienteCompleto } from '@/types/obesidade';

function pacienteFixture(overrides: Partial<PacienteCompleto> = {}): PacienteCompleto {
  return {
    id: 'pac-1',
    userId: 'uid-1',
    email: 'maria@test.com',
    nome: 'Maria',
    medicoResponsavelId: 'm-1',
    dadosIdentificacao: { nomeCompleto: 'Maria', email: 'maria@test.com', dataCadastro: new Date(), endereco: {} },
    dadosClinicos: {},
    estiloVida: {},
    examesLaboratoriais: [],
    planoTerapeutico: { metas: {}, startDate: new Date(2026, 2, 1), numeroSemanasTratamento: 18, currentDoseMg: 2.5 },
    evolucaoSeguimento: [],
    alertas: [],
    comunicacao: { mensagens: [], anexos: [], logsAuditoria: [] },
    indicadores: {
      tempoEmTratamento: { dias: 0, semanas: 0 },
      adesaoMedia: 0,
      incidenciaEfeitosAdversos: { total: 0, grave: 0, moderado: 0, leve: 0 },
    },
    dataCadastro: new Date(),
    status: 'ativo',
    statusTratamento: 'pendente',
    ...overrides,
  };
}

describe('buildPaciente360SummariesForLeads', () => {
  it('resolve paciente por uid e depois por email', () => {
    const paciente = pacienteFixture();
    const index = buildPacienteLookupIndex([paciente]);

    expect(resolvePacienteForLead({ id: 'lead-1', uid: 'uid-1', email: 'maria@test.com' } as LeadMedico, index)?.id).toBe(
      'pac-1'
    );
    expect(
      resolvePacienteForLead({ id: 'lead-2', uid: 'outro', email: 'maria@test.com' } as LeadMedico, index)?.id
    ).toBe('pac-1');
    expect(resolvePacienteForLead({ id: 'lead-3', uid: 'x', email: 'nao@test.com' } as LeadMedico, index)).toBeNull();
  });

  it('gera summary apenas para leads com paciente vinculado', () => {
    const paciente = pacienteFixture();
    const leads: LeadMedico[] = [
      {
        id: 'lead-1',
        uid: 'uid-1',
        email: 'maria@test.com',
        name: 'Maria',
        status: 'em_tratamento',
        dataStatus: new Date(),
        medicoId: 'm-1',
      },
      {
        id: 'lead-2',
        uid: 'sem-paciente',
        email: 'novo@test.com',
        name: 'Novo',
        status: 'nao_qualificado',
        dataStatus: new Date(),
        medicoId: 'm-1',
      },
    ];

    const map = buildPaciente360SummariesForLeads({
      leads,
      pacientes: [paciente],
    });

    expect(map.size).toBe(1);
    expect(map.get('lead-1')?.pacienteId).toBe('pac-1');
    expect(map.has('lead-2')).toBe(false);
  });
});
