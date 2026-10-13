import type { EmailTipo } from '@/types/emailConfig';

/**
 * Sequência e offsets da campanha leads médico.
 * Espelha exatamente as regras de app/api/cron/send-automatic-emails/route.ts
 * (calcularProximoEmailCampanha) — horários inalterados nesta etapa.
 */
export const LEADS_MEDICO_EMAIL_SEQUENCE: EmailTipo[] = [
  'email1',
  'email2',
  'email3',
  'email4',
  'email5',
];

const HOUR_MS = 60 * 60 * 1000;

/** Milissegundos após createdAt para cada e-mail da sequência. */
export const LEADS_MEDICO_EMAIL_OFFSET_MS: Record<EmailTipo, number> = {
  email1: 1 * HOUR_MS,
  email2: 24 * HOUR_MS,
  email3: 72 * HOUR_MS,
  email4: 168 * HOUR_MS,
  email5: 336 * HOUR_MS,
};

/** Data mínima de cadastro elegível (mesma regra do cron legado). */
export const LEADS_MEDICO_DATA_MINIMA = new Date('2025-11-20T00:00:00');

export function scheduledForLeadsMedicoEmail(createdAt: Date, emailTipo: EmailTipo): Date {
  return new Date(createdAt.getTime() + LEADS_MEDICO_EMAIL_OFFSET_MS[emailTipo]);
}
