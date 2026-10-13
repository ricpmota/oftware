export type WhatsappAutomationQueueStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'skipped';

/** Marcos de envio: dia (d0), véspera (d1), reforços de atraso (dplus1, dplus3), aniversário (birthday) e conclusão (conclusao). */
export type WhatsappAutomationMilestone = 'd0' | 'd1' | 'dplus1' | 'dplus3' | 'birthday' | 'conclusao';

/**
 * Item enxuto da fila de envios automáticos de WhatsApp.
 * Guarda apenas o mínimo necessário para o cron enviar sem varrer pacientes.
 */
export interface WhatsappAutomationQueueItem {
  id: string;
  automationId: string;
  organizationId: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  phone: string;
  /** Data prevista da aplicação (YYYY-MM-DD). */
  dateKey: string;
  /** Instante do envio (dia do envio + horário da automação, Brasília). */
  scheduledFor: Date;
  /** Dia do envio (YYYY-MM-DD). */
  scheduledDateKey: string;
  /** Horário da automação (HH:mm, Brasília). */
  scheduledTime: string;
  milestone: WhatsappAutomationMilestone;
  status: WhatsappAutomationQueueStatus;
  templateId: string;
  /** Semana/dose da aplicação — necessárias para o link e a checagem de registro. */
  semana: number;
  dose: number;
  /** Escopo extra no id (ex.: protocolo injetável) — evita colisão no mesmo dia. */
  scopeKey?: string;
  /** Nome do protocolo injetável (variável de template). */
  protocoloNome?: string;
  /** Observação da semana do injetável (exibida na mensagem se houver). */
  observacao?: string;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  errorMessage?: string;
}

/** id determinístico — evita duplicidade entre reconstruções da fila. */
export function buildWhatsappAutomationQueueId(
  automationId: string,
  doctorId: string,
  patientId: string,
  dateKey: string,
  milestone: string,
  scopeKey?: string,
): string {
  const base = `${automationId}_${doctorId}_${patientId}_${dateKey}_${milestone}`;
  const scope = (scopeKey || '').trim();
  return scope ? `${base}_${scope}` : base;
}
