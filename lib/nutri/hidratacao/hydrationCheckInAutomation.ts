/**
 * Automação de check-in de hidratação (ETAPA 04).
 *
 * Elegibilidade oficial:
 *   coleção: pacientes_completos
 *   campo:   statusTratamento
 *   valor:   "em_tratamento"  (label de UI: "Em Tratamento")
 *
 * Ciclo de 2 dias (determinístico, America/Sao_Paulo):
 *   Dia âncora = número civil UTC do YYYY-MM-DD (epoch day).
 *   Dia de disparo quando epochDay % 2 === 0.
 *   Período = dois últimos dias civis COMPLETOS na âncora do ciclo
 *   (não inclui o dia em andamento).
 *
 *   31/08/2026 (par) → 29–30 AGO
 *   01/09/2026 (ímpar, janela de retry) → ainda 29–30 AGO
 *   02/09/2026 (par) → 31 AGO–01 SET
 *
 * A rotina é diária e idempotente; não é cron de 48h.
 */

import { hydrationYmdInTimeZone } from '@/lib/nutri/hidratacao/hydrationMath';
import {
  getHydrationCheckInCycleDates,
  hydrationCheckInCyclePeriod,
  hydrationCivilEpochDay,
  isHydrationCheckInCycleSendDay,
} from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import {
  HYDRATION_CHECKIN_TIMEZONE,
  isHydrationCheckInReminderEnabled,
} from '@/lib/nutri/hidratacao/hydrationCheckInSettings';

export {
  HYDRATION_CHECKIN_SEND_HOUR,
  HYDRATION_CHECKIN_SEND_HHMM,
  HYDRATION_CHECKIN_TIMEZONE,
} from '@/lib/nutri/hidratacao/hydrationCheckInSettings';
export {
  getHydrationCheckInCycleDates,
  hydrationCheckInCyclePeriod,
  hydrationCivilEpochDay,
  isHydrationCheckInCycleSendDay,
};
export { isHydrationCheckInReminderEnabled };

export const HYDRATION_CHECKIN_BATCH_SIZE = 80;
/** Tentativa inicial + 1 retry na próxima execução diária do mesmo ciclo. */
export const HYDRATION_CHECKIN_MAX_AUTO_ATTEMPTS = 2;
export const HYDRATION_CHECKIN_SYSTEM_ACTOR_ID = 'system';
export const HYDRATION_TREATMENT_STATUS = 'em_tratamento' as const;
export const HYDRATION_CHECKIN_DELIVERIES_COLLECTION = 'hydration_checkin_deliveries';
export const HYDRATION_CHECKIN_CRON_STATE_COLLECTION = 'hydration_checkin_cron_state';

export type HydrationDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';
export type HydrationDeliverySource = 'automatic' | 'manual';
export type HydrationDeliveryChannel = 'canal_chat';

export type HydrationDeliverySkipReason =
  | 'not_in_treatment'
  | 'status_changed'
  | 'period_completed'
  | 'already_sent_automatically'
  | 'already_sent_manually'
  | 'opt_out'
  | 'automation_disabled'
  | 'scheduled_time_not_reached'
  | 'too_early'
  | 'retry_exhausted'
  | 'no_goal';

export type HydrationCheckInDelivery = {
  patientId: string;
  allowedDates: string[];
  allowedDatesKey: string;
  linkId?: string;
  channel: HydrationDeliveryChannel;
  source: HydrationDeliverySource;
  attemptedAt: Date;
  sentAt?: Date;
  status: HydrationDeliveryStatus;
  skipReason?: HydrationDeliverySkipReason;
  errorCode?: string;
  errorMessage?: string;
  attemptCount: number;
};

export function hydrationCheckInDeliveryDocId(patientId: string, allowedDatesKey: string): string {
  return `${patientId}_${allowedDatesKey.replace(/,/g, '_')}`;
}

export function hydrationCheckInCyclePeriodFromNow(now: Date = new Date()) {
  return hydrationCheckInCyclePeriod(hydrationYmdInTimeZone(now, HYDRATION_CHECKIN_TIMEZONE));
}

export function isHydrationPatientInTreatment(statusTratamento: unknown): boolean {
  return statusTratamento === HYDRATION_TREATMENT_STATUS;
}

export type HydrationAutomationDecision =
  | { action: 'send' }
  | { action: 'retry' }
  | { action: 'skip'; reason: HydrationDeliverySkipReason };

export type HydrationDeliverySnapshot = {
  status: HydrationDeliveryStatus;
  source: HydrationDeliverySource;
  attemptCount: number;
  skipReason?: HydrationDeliverySkipReason;
};

export function evaluateHydrationCheckInAutomation(input: {
  statusTratamento: unknown;
  reminderEnabled?: unknown;
  pendingCount: number;
  delivery: HydrationDeliverySnapshot | null;
  /** Default true: horário já chegou (ou cron atrasado no mesmo dia). */
  scheduledTimeReached?: boolean;
}): HydrationAutomationDecision {
  if (!isHydrationPatientInTreatment(input.statusTratamento)) {
    return { action: 'skip', reason: 'not_in_treatment' };
  }
  if (!isHydrationCheckInReminderEnabled(input.reminderEnabled)) {
    return { action: 'skip', reason: 'automation_disabled' };
  }
  if (input.scheduledTimeReached === false) {
    return { action: 'skip', reason: 'scheduled_time_not_reached' };
  }
  if (input.pendingCount <= 0) {
    return { action: 'skip', reason: 'period_completed' };
  }

  const delivery = input.delivery;
  if (delivery?.status === 'sent') {
    return {
      action: 'skip',
      reason: delivery.source === 'manual' ? 'already_sent_manually' : 'already_sent_automatically',
    };
  }
  if (delivery?.status === 'skipped') {
    if (
      delivery.skipReason === 'period_completed' ||
      delivery.skipReason === 'already_sent_automatically' ||
      delivery.skipReason === 'already_sent_manually' ||
      delivery.skipReason === 'retry_exhausted'
    ) {
      return { action: 'skip', reason: delivery.skipReason };
    }
  }
  if (delivery?.status === 'failed' || delivery?.status === 'pending') {
    if (delivery.attemptCount >= HYDRATION_CHECKIN_MAX_AUTO_ATTEMPTS) {
      return { action: 'skip', reason: 'retry_exhausted' };
    }
    return { action: 'retry' };
  }
  return { action: 'send' };
}

/** Revalidação imediata antes do Canal Chat (status / registros podem ter mudado). */
export function evaluateHydrationCheckInPreSend(input: {
  statusTratamento: unknown;
  pendingCount: number;
  reminderEnabled?: unknown;
  scheduledTimeReached?: boolean;
}): HydrationAutomationDecision {
  if (!isHydrationPatientInTreatment(input.statusTratamento)) {
    return { action: 'skip', reason: 'status_changed' };
  }
  if (input.reminderEnabled !== undefined && !isHydrationCheckInReminderEnabled(input.reminderEnabled)) {
    return { action: 'skip', reason: 'automation_disabled' };
  }
  if (input.scheduledTimeReached === false) {
    return { action: 'skip', reason: 'scheduled_time_not_reached' };
  }
  if (input.pendingCount <= 0) {
    return { action: 'skip', reason: 'period_completed' };
  }
  return { action: 'send' };
}

export function isHydrationSkipReasonTerminal(reason: HydrationDeliverySkipReason): boolean {
  return (
    reason === 'period_completed' ||
    reason === 'already_sent_automatically' ||
    reason === 'already_sent_manually' ||
    reason === 'retry_exhausted'
  );
}

export type HydrationCheckInPatientResult = {
  outcome: 'sent' | 'skipped' | 'failed';
  skipReason?: HydrationDeliverySkipReason;
  errorCode?: string;
  errorMessage?: string;
  attemptCount?: number;
};

export type HydrationCheckInPatientActions = {
  createLink: () => Promise<{ linkId: string; url: string }>;
  notify: (created: {
    linkId: string;
    url: string;
  }) => Promise<{ ok: true } | { ok: false; errorCode: string; errorMessage: string }>;
  recordDelivery: (patch: {
    status: HydrationDeliveryStatus;
    skipReason?: HydrationDeliverySkipReason;
    errorCode?: string;
    errorMessage?: string;
    linkId?: string;
    incrementAttempt?: boolean;
    markSent?: boolean;
  }) => Promise<void>;
  revalidate: () => Promise<{
    statusTratamento: unknown;
    pendingCount: number;
    reminderEnabled?: unknown;
    scheduledTimeReached?: boolean;
  }>;
};

/**
 * Fluxo de um paciente (sem I/O). Retry: no máximo 2 tentativas automáticas
 * no mesmo ciclo (disparo + 1 retry na execução diária seguinte da janela).
 */
export async function runHydrationCheckInPatient(
  input: {
    statusTratamento: unknown;
    reminderEnabled?: unknown;
    pendingCount: number;
    delivery: HydrationDeliverySnapshot | null;
    scheduledTimeReached?: boolean;
  },
  actions: HydrationCheckInPatientActions
): Promise<HydrationCheckInPatientResult> {
  const decision = evaluateHydrationCheckInAutomation(input);
  if (decision.action === 'skip') {
    if (isHydrationSkipReasonTerminal(decision.reason) && input.delivery?.status !== 'sent') {
      await actions.recordDelivery({ status: 'skipped', skipReason: decision.reason });
    }
    return { outcome: 'skipped', skipReason: decision.reason };
  }

  const live = await actions.revalidate();
  const preSend = evaluateHydrationCheckInPreSend(live);
  if (preSend.action === 'skip') {
    if (isHydrationSkipReasonTerminal(preSend.reason)) {
      await actions.recordDelivery({ status: 'skipped', skipReason: preSend.reason });
    }
    return { outcome: 'skipped', skipReason: preSend.reason };
  }

  await actions.recordDelivery({ status: 'pending', incrementAttempt: true });

  let created: { linkId: string; url: string };
  try {
    created = await actions.createLink();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Falha ao gerar link de hidratação.';
    await actions.recordDelivery({
      status: 'failed',
      errorCode: 'link_error',
      errorMessage,
      incrementAttempt: false,
    });
    return { outcome: 'failed', errorCode: 'link_error', errorMessage };
  }

  const notified = await actions.notify(created);
  if (!notified.ok) {
    await actions.recordDelivery({
      status: 'failed',
      linkId: created.linkId,
      errorCode: notified.errorCode,
      errorMessage: notified.errorMessage,
    });
    return {
      outcome: 'failed',
      errorCode: notified.errorCode,
      errorMessage: notified.errorMessage,
    };
  }

  await actions.recordDelivery({ status: 'sent', linkId: created.linkId, markSent: true });
  return { outcome: 'sent' };
}
