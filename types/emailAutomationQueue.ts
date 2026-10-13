import type { EmailTipo } from '@/types/emailConfig';

/** Versão do payload gravado na fila (evolução futura sem quebrar docs antigos). */
export const EMAIL_AUTOMATION_QUEUE_PAYLOAD_VERSION = 1;

export const LEADS_MEDICO_EMAIL_CAMPAIGN = 'leads_medico' as const;

export type EmailAutomationQueueStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'skipped';

/** Tipos de e-mail enfileirados na campanha leads médico (sequência email1–email5). */
export type LeadsMedicoQueuedEmailTipo = EmailTipo;

/**
 * Item enxuto da fila de envios automáticos de e-mail para leads.
 * Guarda o mínimo para o consumidor enviar sem varrer Auth / email_envios.
 */
export interface EmailAutomationQueueItem {
  id: string;
  organizationId: string;
  /** Vazio na campanha leads médico; reservado para automações futuras por médico. */
  doctorId: string;
  leadId: string;
  leadNome: string;
  leadEmail: string;
  emailTipo: LeadsMedicoQueuedEmailTipo;
  scheduledFor: Date;
  status: EmailAutomationQueueStatus;
  payloadVersion: number;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  errorMessage?: string;
  retryCount?: number;
  lastAttemptAt?: Date;
  automationExecutionId?: string;
  processingStartedAt?: Date;
  lastRunId?: string;
  providerMessageId?: string;
}

/** id determinístico — evita duplicidade entre reconstruções da fila. */
export function buildEmailAutomationQueueId(leadId: string, emailTipo: LeadsMedicoQueuedEmailTipo): string {
  return `lead_${leadId}_${emailTipo}`;
}
