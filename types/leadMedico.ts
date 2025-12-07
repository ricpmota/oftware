export type LeadMedicoStatus = 'nao_qualificado' | 'enviado_contato' | 'contato_feito' | 'em_tratamento' | 'excluido';

export interface LeadMedico {
  id: string; // Firestore document ID
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  createdAt?: Date;
  lastSignInTime?: string;
  emailVerified?: boolean;
  status: LeadMedicoStatus;
  dataStatus: Date; // Data da última mudança de status
  observacoes?: string;
  atualizadoPor?: string; // Email de quem atualizou
  medicoId: string; // ID do médico dono deste lead
  solicitacaoId?: string; // ID da solicitação de paciente relacionada
  createdAtFirestore?: Date;
  updatedAt?: Date;
}

