/**
 * TreatmentNegotiation — serviço futuro para propostas, contrapropostas, aceite e histórico.
 *
 * Nesta etapa: apenas contrato e stubs. Sem persistência Firestore.
 * Ver docs/oi/16_TREATMENT_NEGOTIATION.md
 */
import type {
  AcaoPacienteNegociacao,
  NegociacaoTerapeuticaState,
  PropostaNegociacaoPaciente,
  StatusNegociacaoTerapeutica,
} from '@/lib/treatment-negotiation/types';

export class TreatmentNegotiationService {
  /**
   * Futuro: carregar negociação do Firestore por orcamentoId.
   */
  static async carregar(_orcamentoId: string): Promise<NegociacaoTerapeuticaState | null> {
    return null;
  }

  /**
   * Futuro: persistir estado da negociação.
   */
  static async salvar(
    _orcamentoId: string,
    _estado: NegociacaoTerapeuticaState
  ): Promise<void> {
    // Não implementado — sem alteração de Firestore nesta etapa.
  }

  /**
   * Futuro: paciente aceita proposta do médico.
   */
  static async aceitarPropostaPaciente(_orcamentoId: string): Promise<StatusNegociacaoTerapeutica> {
    return 'ACEITA_PACIENTE';
  }

  /**
   * Futuro: paciente envia contraproposta com alterações solicitadas.
   */
  static async solicitarAlteracoesPaciente(
    _orcamentoId: string,
    _proposta: PropostaNegociacaoPaciente
  ): Promise<StatusNegociacaoTerapeutica> {
    return 'EM_NEGOCIACAO';
  }

  /**
   * Futuro: listar histórico de versões persistidas.
   */
  static async listarVersoes(_orcamentoId: string): Promise<NegociacaoTerapeuticaState['versoes']> {
    return [];
  }

  /** Valida se ação do paciente é permitida no status atual. */
  static acaoPacientePermitida(
    status: StatusNegociacaoTerapeutica,
    acao: AcaoPacienteNegociacao
  ): boolean {
    if (acao === 'aceitar_proposta') {
      return status === 'PROPOSTA_MEDICO' || status === 'EM_NEGOCIACAO';
    }
    if (acao === 'solicitar_alteracoes') {
      return status === 'PROPOSTA_MEDICO' || status === 'EM_NEGOCIACAO';
    }
    return false;
  }
}
