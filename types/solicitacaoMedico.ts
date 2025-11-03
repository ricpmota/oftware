export interface SolicitacaoMedico {
  id: string;
  pacienteId?: string; // ID do paciente se existir
  pacienteEmail: string; // Email do paciente que fez a solicitação
  pacienteNome: string; // Nome do paciente
  medicoId: string; // ID do médico
  medicoNome: string; // Nome do médico
  status: 'pendente' | 'aceita' | 'rejeitada' | 'desistiu'; // Status da solicitação
  criadoEm: Date; // Data da solicitação
  aceitaEm?: Date; // Data de aceitação (se aceita)
  rejeitadaEm?: Date; // Data de rejeição (se rejeitada)
  desistiuEm?: Date; // Data de desistência (se desistiu)
  observacoes?: string; // Observações do médico ou paciente
}

