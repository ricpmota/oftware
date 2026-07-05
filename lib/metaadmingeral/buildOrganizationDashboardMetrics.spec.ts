import { describe, expect, it } from 'vitest';
import { buildOrganizationDashboardMetrics } from '@/lib/metaadmingeral/buildOrganizationDashboardMetrics';

const emptyLeadsByStatus = {
  nao_qualificado: [],
  enviado_contato: [],
  contato_feito: [],
  qualificado: [],
  excluido: [],
};

describe('buildOrganizationDashboardMetrics', () => {
  it('agrega contagens de equipe, pacientes e leads', () => {
    const metrics = buildOrganizationDashboardMetrics({
      medicos: [{ isVerificado: true }, { isVerificado: false }],
      nutricionistas: [{ isVerificado: true }],
      personalTrainers: [],
      pacientes: [
        { statusTratamento: 'em_tratamento' },
        { statusTratamento: 'pendente' },
        { statusTratamento: 'concluido' },
      ],
      leadsByStatus: {
        ...emptyLeadsByStatus,
        nao_qualificado: [{}],
        qualificado: [{}, {}],
        excluido: [{}],
      },
      npsEstatisticas: { npsGeral: 42.5 } as never,
      solicitacoesPendentes: [{}, {}],
      totalPacientesCompartilhados: 5,
    });

    expect(metrics.totalMedicos).toBe(2);
    expect(metrics.medicosVerificados).toBe(1);
    expect(metrics.totalNutricionistas).toBe(1);
    expect(metrics.totalPersonalTrainers).toBe(0);
    expect(metrics.totalPacientes).toBe(3);
    expect(metrics.pacientesEmTratamento).toBe(1);
    expect(metrics.pacientesPendentes).toBe(1);
    expect(metrics.pacientesConcluidos).toBe(1);
    expect(metrics.totalLeadsAtivos).toBe(3);
    expect(metrics.totalLeads).toBe(4);
    expect(metrics.npsGeral).toBe(42.5);
    expect(metrics.solicitacoesPendentes).toBe(2);
    expect(metrics.pacientesCompartilhados).toBe(5);
  });
});
