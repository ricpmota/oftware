import type { EmailTipo } from '@/types/emailConfig';
import type { EmailAutomationQueueItem } from '@/types/emailAutomationQueue';

export const EMAIL_QUEUE_SHADOW_VALIDATION_ENABLED =
  process.env.EMAIL_QUEUE_SHADOW_VALIDATION === 'true';

export type ShadowDecision = 'would_send' | 'would_not_send';

export type ShadowComparisonStatus = 'MATCH' | 'MISMATCH';

export type ShadowMismatchKind =
  | 'queue_stale_or_missing'
  | 'queue_not_due_yet'
  | 'queue_already_sent'
  | 'queue_skipped'
  | 'queue_failed_or_processing'
  | 'unknown';

export type EmailQueueShadowLogEntry = {
  timestamp: string;
  leadId: string;
  organizationId: string;
  doctorId: string;
  emailTipo: EmailTipo;
  legacyDecision: ShadowDecision;
  queueDecision: ShadowDecision;
  legacyReason: string;
  queueReason: string;
  status: ShadowComparisonStatus;
  mismatchKind?: ShadowMismatchKind;
};

export type EmailQueueShadowByEmailTipo = Record<
  EmailTipo,
  { comparisons: number; matches: number; mismatches: number }
>;

export type EmailQueueShadowAggregate = {
  totalComparisons: number;
  matches: number;
  mismatches: number;
  matchRate: number;
  byEmailTipo: EmailQueueShadowByEmailTipo;
  lastUpdatedAt: string;
  lastMismatchAt?: string;
  lastCriticalMismatchAt?: string;
  firstComparisonAt?: string;
};

export function isCriticalShadowMismatch(entry: Pick<
  EmailQueueShadowLogEntry,
  'status' | 'mismatchKind' | 'legacyDecision' | 'queueDecision'
>): boolean {
  return (
    entry.status === 'MISMATCH' &&
    entry.mismatchKind === 'queue_stale_or_missing' &&
    entry.legacyDecision === 'would_send' &&
    entry.queueDecision === 'would_not_send'
  );
}

export const EMPTY_SHADOW_BY_EMAIL: EmailQueueShadowByEmailTipo = {
  email1: { comparisons: 0, matches: 0, mismatches: 0 },
  email2: { comparisons: 0, matches: 0, mismatches: 0 },
  email3: { comparisons: 0, matches: 0, mismatches: 0 },
  email4: { comparisons: 0, matches: 0, mismatches: 0 },
  email5: { comparisons: 0, matches: 0, mismatches: 0 },
};

const LOG_PREFIX = '[email_queue_shadow]';

export function shadowLog(entry: EmailQueueShadowLogEntry): void {
  console.info(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
}

/**
 * Decide o que o motor de fila faria — somente leitura, sem mutação.
 */
export function evaluateQueueWouldSendDecision(
  item: EmailAutomationQueueItem | null,
  now: Date,
): { decision: ShadowDecision; reason: string; mismatchKind?: ShadowMismatchKind } {
  if (!item) {
    return {
      decision: 'would_not_send',
      reason: 'Item ausente na fila (rebuild pendente ou lead não materializado).',
      mismatchKind: 'queue_stale_or_missing',
    };
  }

  if (item.status === 'sent') {
    return {
      decision: 'would_not_send',
      reason: 'Fila marca e-mail como já enviado (sent).',
      mismatchKind: 'queue_already_sent',
    };
  }

  if (item.status === 'skipped') {
    return {
      decision: 'would_not_send',
      reason: item.errorMessage || 'Fila marca lead/e-mail como skipped (ex.: convertido).',
      mismatchKind: 'queue_skipped',
    };
  }

  if (item.status === 'failed') {
    return {
      decision: 'would_not_send',
      reason: item.errorMessage || 'Item failed na fila — não reenviaria automaticamente.',
      mismatchKind: 'queue_failed_or_processing',
    };
  }

  if (item.status === 'processing') {
    return {
      decision: 'would_not_send',
      reason: 'Item em processing na fila.',
      mismatchKind: 'queue_failed_or_processing',
    };
  }

  if (item.status === 'pending') {
    if (item.scheduledFor.getTime() <= now.getTime()) {
      return {
        decision: 'would_send',
        reason: `pending com scheduledFor ${item.scheduledFor.toISOString()} <= agora.`,
      };
    }
    return {
      decision: 'would_not_send',
      reason: `pending mas scheduledFor ${item.scheduledFor.toISOString()} ainda no futuro.`,
      mismatchKind: 'queue_not_due_yet',
    };
  }

  return {
    decision: 'would_not_send',
    reason: `Status desconhecido na fila: ${item.status}.`,
    mismatchKind: 'unknown',
  };
}

export function buildLegacyWouldSendReason(params: {
  emailTipo: EmailTipo;
  proximoEnvio: Date;
  agora: Date;
  horasDesdeCriacao: number;
}): string {
  return [
    `${params.emailTipo} elegível no motor legado:`,
    `proximoEnvio ${params.proximoEnvio.toISOString()} <= agora ${params.agora.toISOString()};`,
    `${params.horasDesdeCriacao.toFixed(2)}h desde cadastro;`,
    'sequência anterior enviada ou primeira da fila.',
  ].join(' ');
}

export function compareShadowDecisions(
  legacyDecision: ShadowDecision,
  queueDecision: ShadowDecision,
): ShadowComparisonStatus {
  return legacyDecision === queueDecision ? 'MATCH' : 'MISMATCH';
}

export function computeMatchRate(matches: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((matches / total) * 100_000) / 1000;
}

export { LOG_PREFIX };
