import type { Medico } from '@/types/medico';
import type { PagamentoPaciente, VendaAvulsa } from '@/types/pagamento';
import type { PacienteCompleto } from '@/types/obesidade';

export type MedicoFinanceRow = {
  medicoId: string;
  medicoNome: string;
  medicoEmail: string;
  pacientesTotal: number;
  pacientesPendente: number;
  pacientesEmTratamento: number;
  pacientesConcluido: number;
  pacientesAbandono: number;
  pacientesComPagamento: number;
  vendasAvulsas: number;
  valorVendasAvulsas: number;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
};

export type OrganizationFinanceMetrics = {
  rows: MedicoFinanceRow[];
  totalFaturamento: number;
  totalPago: number;
  totalPendente: number;
  totalMedicos: number;
};

export type OrganizationFinanceMetricsInput = {
  medicos: Medico[];
  pacientes: Pick<PacienteCompleto, 'id' | 'medicoResponsavelId' | 'statusTratamento'>[];
  pagamentosPacientes: Record<string, PagamentoPaciente>;
  vendasAvulsas: VendaAvulsa[];
};

function emptyRow(medico: Medico): MedicoFinanceRow {
  return {
    medicoId: medico.id,
    medicoNome: medico.nome,
    medicoEmail: medico.email,
    pacientesTotal: 0,
    pacientesPendente: 0,
    pacientesEmTratamento: 0,
    pacientesConcluido: 0,
    pacientesAbandono: 0,
    pacientesComPagamento: 0,
    vendasAvulsas: 0,
    valorVendasAvulsas: 0,
    valorTotal: 0,
    valorPago: 0,
    valorPendente: 0,
  };
}

/** Faturamento por médico — pagamentos de pacientes + vendas avulsas. */
export function buildOrganizationFinanceMetrics(
  input: OrganizationFinanceMetricsInput,
): OrganizationFinanceMetrics {
  const byMedicoId = new Map<string, MedicoFinanceRow>();

  for (const medico of input.medicos) {
    byMedicoId.set(medico.id, emptyRow(medico));
  }

  for (const paciente of input.pacientes) {
    const medicoId = paciente.medicoResponsavelId;
    if (!medicoId) continue;

    const row = byMedicoId.get(medicoId);
    if (!row) continue;

    row.pacientesTotal += 1;
    const status = paciente.statusTratamento || 'pendente';
    if (status === 'pendente') row.pacientesPendente += 1;
    else if (status === 'em_tratamento') row.pacientesEmTratamento += 1;
    else if (status === 'concluido') row.pacientesConcluido += 1;
    else if (status === 'abandono') row.pacientesAbandono += 1;

    const pagamento = input.pagamentosPacientes[paciente.id];
    if (!pagamento) continue;

    row.pacientesComPagamento += 1;
    row.valorTotal += pagamento.valorTotal || 0;
    row.valorPago += pagamento.valorPago || 0;
    row.valorPendente += pagamento.valorPendente || 0;
  }

  for (const venda of input.vendasAvulsas) {
    const row = byMedicoId.get(venda.medicoId);
    if (!row) continue;

    row.vendasAvulsas += 1;
    row.valorVendasAvulsas += venda.valorTotal || 0;
    row.valorTotal += venda.valorTotal || 0;
    row.valorPago += venda.valorPago || 0;
    row.valorPendente += venda.valorPendente || 0;
  }

  const rows = Array.from(byMedicoId.values()).sort((a, b) => {
    if (b.valorTotal !== a.valorTotal) return b.valorTotal - a.valorTotal;
    return a.medicoNome.localeCompare(b.medicoNome, 'pt-BR');
  });

  const totalFaturamento = rows.reduce((sum, row) => sum + row.valorTotal, 0);
  const totalPago = rows.reduce((sum, row) => sum + row.valorPago, 0);
  const totalPendente = rows.reduce((sum, row) => sum + row.valorPendente, 0);

  return {
    rows,
    totalFaturamento,
    totalPago,
    totalPendente,
    totalMedicos: rows.length,
  };
}
