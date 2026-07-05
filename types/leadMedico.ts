import type { LeadCrmTagSnapshot } from '@/types/crmTag';

export type LeadReferralType =
  | 'nutricionista'
  | 'personal'
  | 'paciente'
  | 'medico'
  | 'manual'
  | 'landing'
  | 'dr_link'
  | 'desconhecido';

export type LeadReferralSnapshot = {
  type: LeadReferralType;
  sourceId?: string;
  sourceName?: string;
  sourceContact?: string;
  indicacaoId?: string;
  capturedAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
  updatedManually?: boolean;
  note?: string;
};

export type LeadMedicoStatus =
  | 'nao_qualificado'
  | 'enviado_contato'
  | 'contato_feito'
  | 'tratamento_enviado'
  | 'em_tratamento'
  | 'concluido'
  | 'excluido';

export interface LeadMedico {
  id: string; // Firestore document ID
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  /** Qualificação do lead (1–5) na home / pipeline; 0 ou ausente = não classificado */
  estrelas?: number;
  telefone?: string;
  cidade?: string;
  estado?: string;
  createdAt?: Date;
  lastSignInTime?: string;
  emailVerified?: boolean;
  status: LeadMedicoStatus;
  /** Etapa customizada do CRM; quando ausente, usa `status` */
  crmStageKey?: string;
  dataStatus: Date; // Data da última mudança de status
  observacoes?: string;
  atualizadoPor?: string; // Email de quem atualizou
  medicoId: string; // ID do médico dono deste lead
  solicitacaoId?: string; // ID da solicitação de paciente relacionada
  /** Orçamento / valor projetado do tratamento (R$) */
  orcamento?: number;
  /** Etiquetas do CRM (snapshot por lead) */
  crmTags?: LeadCrmTagSnapshot[];
  /** Origem comercial / indicação (snapshot para o CRM) */
  referral?: LeadReferralSnapshot;
  createdAtFirestore?: Date;
  updatedAt?: Date;
}

