import type { LeadStatus } from '@/types/lead';
import type { NPSEstatisticas } from '@/types/nps';
import type { PacienteCompleto } from '@/types/obesidade';

export type OrganizationDashboardMetricsInput = {
  medicos: { isVerificado?: boolean }[];
  nutricionistas: { isVerificado?: boolean }[];
  personalTrainers: { isVerificado?: boolean }[];
  pacientes: Pick<PacienteCompleto, 'statusTratamento'>[];
  leadsByStatus: Record<LeadStatus, unknown[]>;
  npsEstatisticas: NPSEstatisticas | null;
  solicitacoesPendentes: unknown[];
  totalPacientesCompartilhados: number;
};

export type OrganizationDashboardMetrics = {
  totalMedicos: number;
  medicosVerificados: number;
  totalNutricionistas: number;
  nutricionistasVerificados: number;
  totalPersonalTrainers: number;
  personalTrainersVerificados: number;
  totalPacientes: number;
  pacientesEmTratamento: number;
  pacientesPendentes: number;
  pacientesConcluidos: number;
  pacientesAbandono: number;
  totalLeadsAtivos: number;
  totalLeads: number;
  npsGeral: number | null;
  solicitacoesPendentes: number;
  pacientesCompartilhados: number;
};

/** Métricas puras a partir de arrays já carregados no MetaAdminGeral — sem queries extras. */
export function buildOrganizationDashboardMetrics(
  input: OrganizationDashboardMetricsInput,
): OrganizationDashboardMetrics {
  const totalMedicos = input.medicos.length;
  const medicosVerificados = input.medicos.filter((m) => m.isVerificado).length;

  const totalNutricionistas = input.nutricionistas.length;
  const nutricionistasVerificados = input.nutricionistas.filter((n) => n.isVerificado).length;

  const totalPersonalTrainers = input.personalTrainers.length;
  const personalTrainersVerificados = input.personalTrainers.filter((p) => p.isVerificado).length;

  let pacientesEmTratamento = 0;
  let pacientesPendentes = 0;
  let pacientesConcluidos = 0;
  let pacientesAbandono = 0;

  for (const paciente of input.pacientes) {
    const status = paciente.statusTratamento || 'pendente';
    if (status === 'em_tratamento') pacientesEmTratamento += 1;
    else if (status === 'pendente') pacientesPendentes += 1;
    else if (status === 'concluido') pacientesConcluidos += 1;
    else if (status === 'abandono') pacientesAbandono += 1;
  }

  const totalLeadsAtivos =
    input.leadsByStatus.nao_qualificado.length +
    input.leadsByStatus.enviado_contato.length +
    input.leadsByStatus.contato_feito.length +
    input.leadsByStatus.qualificado.length;

  const totalLeads =
    totalLeadsAtivos +
    input.leadsByStatus.excluido.length;

  return {
    totalMedicos,
    medicosVerificados,
    totalNutricionistas,
    nutricionistasVerificados,
    totalPersonalTrainers,
    personalTrainersVerificados,
    totalPacientes: input.pacientes.length,
    pacientesEmTratamento,
    pacientesPendentes,
    pacientesConcluidos,
    pacientesAbandono,
    totalLeadsAtivos,
    totalLeads,
    npsGeral: input.npsEstatisticas?.npsGeral ?? null,
    solicitacoesPendentes: input.solicitacoesPendentes.length,
    pacientesCompartilhados: input.totalPacientesCompartilhados,
  };
}
