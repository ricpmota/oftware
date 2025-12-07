export type LeadStatus = 'nao_qualificado' | 'enviado_contato' | 'contato_feito' | 'qualificado' | 'excluido';

export interface Lead {
  id: string;
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  createdAt?: Date;
  lastSignInTime?: string;
  emailVerified?: boolean;
  status: LeadStatus;
  observacoes?: string;
  dataStatus?: Date; // Data da última mudança de status
  atualizadoPor?: string; // Email de quem atualizou
  createdAtFirestore?: Date; // Data de criação no Firestore
  updatedAt?: Date;
}


