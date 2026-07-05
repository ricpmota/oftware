/**
 * Etapa 1 — conexão WhatsApp do médico (status apenas).
 * Não envia mensagens, não sincroniza conversas, contatos ou CRM.
 */

export type WhatsappConnectionStatus = 'disconnected' | 'qr_pending' | 'connected' | 'error';

export type WhatsappConnectionProvider = 'wppconnect';

export interface WhatsappConnection {
  doctorId: string;
  organizationId?: string;
  status: WhatsappConnectionStatus;
  provider: WhatsappConnectionProvider;
  sessionId: string;
  phone?: string;
  profileName?: string;
  qrCode?: string;
  connectedAt?: Date;
  lastCheckAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Payload serializado para respostas da API (sem Timestamps do Firestore). */
export interface WhatsappConnectionDto {
  doctorId: string;
  organizationId?: string;
  status: WhatsappConnectionStatus;
  provider: WhatsappConnectionProvider;
  sessionId: string;
  phone?: string;
  profileName?: string;
  qrCode?: string;
  connectedAt?: string;
  lastCheckAt?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type WhatsappConnectionUpsert = Omit<WhatsappConnection, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};
