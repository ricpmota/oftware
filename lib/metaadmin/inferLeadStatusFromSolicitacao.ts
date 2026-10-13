import type { LeadMedicoStatus } from '@/types/leadMedico';

/**
 * Estágio inicial do lead criado a partir da solicitação.
 *
 * Aceitar o paciente (vínculo + `medicoResponsavelId`) não coloca o card em
 * Tratamento — isso só ocorre se o paciente já estiver em tratamento no
 * cadastro, ou quando o médico mover o card no CRM. Consulta agendada avança
 * para Consultas Agendadas em outro fluxo.
 */
export function inferLeadStatusFromSolicitacao(
  solicitacao: { status: string },
  paciente?: { statusTratamento?: string } | null
): LeadMedicoStatus {
  if (solicitacao.status === 'rejeitada' || solicitacao.status === 'desistiu') {
    return 'excluido';
  }
  if (paciente?.statusTratamento === 'em_tratamento') {
    return 'em_tratamento';
  }
  return 'nao_qualificado';
}
