import { Timestamp } from 'firebase-admin/firestore';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  buildLegacyWouldSendReason,
  compareShadowDecisions,
  computeMatchRate,
  EMAIL_QUEUE_SHADOW_VALIDATION_ENABLED,
  evaluateQueueWouldSendDecision,
  EMPTY_SHADOW_BY_EMAIL,
  isCriticalShadowMismatch,
  shadowLog,
  type EmailQueueShadowAggregate,
  type EmailQueueShadowLogEntry,
  type ShadowDecision,
  type ShadowMismatchKind,
} from '@/lib/email/emailQueueShadowValidation';
import { getQueueItemByLeadAndTipo } from '@/services/emailAutomationQueueService';
import type { EmailTipo } from '@/types/emailConfig';

const SHADOW_ROOT = 'email_queue_shadow';
const AGGREGATE_DOC = 'aggregate';
const MISMATCHES_COLLECTION = 'email_queue_shadow_mismatches';
const EVENTS_COLLECTION = 'email_queue_shadow_events';
const MAX_MISMATCH_DOCS = 200;
const MAX_EVENT_DOCS = 5000;
const MS_DAY = 24 * 60 * 60 * 1000;

export type ShadowComparisonInput = {
  leadId: string;
  leadEmail: string;
  emailTipo: EmailTipo;
  proximoEnvio: Date;
  dataCriacao: Date;
  agora: Date;
  organizationId?: string;
  doctorId?: string;
};

function emptyAggregate(): EmailQueueShadowAggregate {
  return {
    totalComparisons: 0,
    matches: 0,
    mismatches: 0,
    matchRate: 100,
    byEmailTipo: { ...EMPTY_SHADOW_BY_EMAIL },
    lastUpdatedAt: new Date().toISOString(),
  };
}

function mergeAggregate(data: FirebaseFirestore.DocumentData | undefined): EmailQueueShadowAggregate {
  if (!data) return emptyAggregate();
  const byEmailTipo = { ...EMPTY_SHADOW_BY_EMAIL };
  const rawByTipo = (data.byEmailTipo ?? {}) as Record<string, { comparisons?: number; matches?: number; mismatches?: number }>;
  for (const tipo of Object.keys(byEmailTipo) as EmailTipo[]) {
    byEmailTipo[tipo] = {
      comparisons: rawByTipo[tipo]?.comparisons ?? 0,
      matches: rawByTipo[tipo]?.matches ?? 0,
      mismatches: rawByTipo[tipo]?.mismatches ?? 0,
    };
  }
  return {
    totalComparisons: data.totalComparisons ?? 0,
    matches: data.matches ?? 0,
    mismatches: data.mismatches ?? 0,
    matchRate: data.matchRate ?? 100,
    byEmailTipo,
    lastUpdatedAt: data.lastUpdatedAt ?? new Date().toISOString(),
    lastMismatchAt: typeof data.lastMismatchAt === 'string' ? data.lastMismatchAt : undefined,
    lastCriticalMismatchAt:
      typeof data.lastCriticalMismatchAt === 'string' ? data.lastCriticalMismatchAt : undefined,
    firstComparisonAt: typeof data.firstComparisonAt === 'string' ? data.firstComparisonAt : undefined,
  };
}

async function persistComparison(entry: EmailQueueShadowLogEntry): Promise<void> {
  const db = getFirestoreAdmin();
  const aggregateRef = db.collection(SHADOW_ROOT).doc(AGGREGATE_DOC);
  const isMatch = entry.status === 'MATCH';
  const isCritical = isCriticalShadowMismatch(entry);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(aggregateRef);
    const current = mergeAggregate(snap.data());
    const nextTotal = current.totalComparisons + 1;
    const nextMatches = current.matches + (isMatch ? 1 : 0);
    const nextMismatches = current.mismatches + (isMatch ? 0 : 1);
    const byEmailTipo = { ...current.byEmailTipo };
    const bucket = { ...byEmailTipo[entry.emailTipo] };
    bucket.comparisons += 1;
    if (isMatch) bucket.matches += 1;
    else bucket.mismatches += 1;
    byEmailTipo[entry.emailTipo] = bucket;

    const aggregatePatch: Record<string, unknown> = {
      totalComparisons: nextTotal,
      matches: nextMatches,
      mismatches: nextMismatches,
      matchRate: computeMatchRate(nextMatches, nextTotal),
      byEmailTipo,
      lastUpdatedAt: entry.timestamp,
    };

    if (!current.firstComparisonAt) {
      aggregatePatch.firstComparisonAt = entry.timestamp;
    }
    if (!isMatch) {
      aggregatePatch.lastMismatchAt = entry.timestamp;
    }
    if (isCritical) {
      aggregatePatch.lastCriticalMismatchAt = entry.timestamp;
    }

    tx.set(aggregateRef, aggregatePatch, { merge: true });
  });

  await db.collection(EVENTS_COLLECTION).add({
    timestamp: entry.timestamp,
    leadId: entry.leadId,
    organizationId: entry.organizationId,
    emailTipo: entry.emailTipo,
    status: entry.status,
    isCritical,
    mismatchKind: entry.mismatchKind ?? null,
    createdAt: Timestamp.now(),
  });

  if (!isMatch) {
    await db.collection(MISMATCHES_COLLECTION).add({
      ...entry,
      isCritical,
      createdAt: Timestamp.now(),
    });
  }

  void trimOldShadowDocs().catch(() => undefined);
}

async function trimOldShadowDocs(): Promise<void> {
  const db = getFirestoreAdmin();

  const mismatchCol = db.collection(MISMATCHES_COLLECTION);
  const mismatchCount = (await mismatchCol.count().get()).data().count;
  if (mismatchCount > MAX_MISMATCH_DOCS) {
    const excess = mismatchCount - MAX_MISMATCH_DOCS;
    const oldest = await mismatchCol.orderBy('createdAt', 'asc').limit(excess).get();
    const batch = db.batch();
    oldest.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  const eventsCol = db.collection(EVENTS_COLLECTION);
  const eventsCount = (await eventsCol.count().get()).data().count;
  if (eventsCount > MAX_EVENT_DOCS) {
    const excess = eventsCount - MAX_EVENT_DOCS;
    const oldest = await eventsCol.orderBy('createdAt', 'asc').limit(excess).get();
    const batch = db.batch();
    oldest.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

/**
 * Compara decisão do motor legado (would_send) com o motor de fila (read-only).
 * Nunca envia e-mail nem altera fila / email_envios.
 */
export async function compareShadowForLegacySendDecision(
  input: ShadowComparisonInput,
): Promise<EmailQueueShadowLogEntry | null> {
  if (!EMAIL_QUEUE_SHADOW_VALIDATION_ENABLED) return null;

  const organizationId = input.organizationId?.trim() || getDefaultOrganizationId();
  const doctorId = input.doctorId?.trim() ?? '';
  const legacyDecision: ShadowDecision = 'would_send';
  const horasDesdeCriacao = (input.agora.getTime() - input.dataCriacao.getTime()) / (1000 * 60 * 60);
  const legacyReason = buildLegacyWouldSendReason({
    emailTipo: input.emailTipo,
    proximoEnvio: input.proximoEnvio,
    agora: input.agora,
    horasDesdeCriacao,
  });

  const queueItem = await getQueueItemByLeadAndTipo(input.leadId, input.emailTipo);
  const queueEval = evaluateQueueWouldSendDecision(queueItem, input.agora);

  const entry: EmailQueueShadowLogEntry = {
    timestamp: new Date().toISOString(),
    leadId: input.leadId,
    organizationId,
    doctorId,
    emailTipo: input.emailTipo,
    legacyDecision,
    queueDecision: queueEval.decision,
    legacyReason,
    queueReason: queueEval.reason,
    status: compareShadowDecisions(legacyDecision, queueEval.decision),
  };

  if (entry.status === 'MISMATCH') {
    entry.mismatchKind = inferMismatchKind(queueEval.mismatchKind, legacyDecision, queueEval.decision);
  }

  shadowLog(entry);

  try {
    await persistComparison(entry);
  } catch (error) {
    console.error('[email_queue_shadow] falha ao persistir métricas (ignorado):', error);
  }

  return entry;
}

function inferMismatchKind(
  queueHint: ShadowMismatchKind | undefined,
  legacy: ShadowDecision,
  queue: ShadowDecision,
): ShadowMismatchKind {
  if (legacy === 'would_send' && queue === 'would_not_send') {
    return queueHint ?? 'queue_stale_or_missing';
  }
  if (legacy === 'would_not_send' && queue === 'would_send') {
    return 'queue_stale_or_missing';
  }
  return queueHint ?? 'unknown';
}

/** Compara todos os leads aptos do cron legado antes do envio real. */
export async function runShadowValidationForLegacyLeadsAptos(
  leads: Array<{
    leadId: string;
    leadEmail: string;
    dataCriacao: Date;
    proximoEmail?: EmailTipo;
    proximoEnvio?: Date;
  }>,
  agora: Date,
): Promise<{ compared: number; matches: number; mismatches: number }> {
  if (!EMAIL_QUEUE_SHADOW_VALIDATION_ENABLED || leads.length === 0) {
    return { compared: 0, matches: 0, mismatches: 0 };
  }

  let compared = 0;
  let matches = 0;
  let mismatches = 0;

  for (const lead of leads) {
    if (!lead.proximoEmail || !lead.proximoEnvio) continue;

    try {
      const entry = await compareShadowForLegacySendDecision({
        leadId: lead.leadId,
        leadEmail: lead.leadEmail,
        emailTipo: lead.proximoEmail,
        proximoEnvio: lead.proximoEnvio,
        dataCriacao: lead.dataCriacao,
        agora,
      });
      if (!entry) continue;
      compared += 1;
      if (entry.status === 'MATCH') matches += 1;
      else mismatches += 1;
    } catch (error) {
      console.error('[email_queue_shadow] comparação falhou (ignorado):', error);
    }
  }

  if (compared > 0) {
    shadowLog({
      timestamp: new Date().toISOString(),
      leadId: '_batch_summary',
      organizationId: getDefaultOrganizationId(),
      doctorId: '',
      emailTipo: 'email1',
      legacyDecision: 'would_send',
      queueDecision: 'would_send',
      legacyReason: `Batch: ${compared} comparações nesta execução do cron legado.`,
      queueReason: `matches=${matches} mismatches=${mismatches}`,
      status: mismatches === 0 ? 'MATCH' : 'MISMATCH',
    });
  }

  return { compared, matches, mismatches };
}

export type EmailQueueShadowWindowStats = {
  comparisons: number;
  matches: number;
  mismatches: number;
  criticalMismatches: number;
  matchRate: number;
};

export type EmailQueueShadowExtendedStats = {
  aggregate: EmailQueueShadowAggregate;
  enabled: boolean;
  recentMismatches: EmailQueueShadowLogEntry[];
  last24h: EmailQueueShadowWindowStats;
  last72h: EmailQueueShadowWindowStats;
  previous24h: EmailQueueShadowWindowStats;
  matchRateTrend24h: number;
  lastMismatchAt: string | null;
  lastCriticalMismatchAt: string | null;
  consecutiveDaysWithoutCriticalMismatch: number;
  criticalMismatchesInLast72h: number;
};

async function countWindowStats(since: Date, until?: Date): Promise<EmailQueueShadowWindowStats> {
  const db = getFirestoreAdmin();
  let query = db
    .collection(EVENTS_COLLECTION)
    .where('createdAt', '>=', Timestamp.fromDate(since));

  if (until) {
    query = query.where('createdAt', '<', Timestamp.fromDate(until));
  }

  const snap = await query.get();
  let matches = 0;
  let mismatches = 0;
  let criticalMismatches = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.status === 'MATCH') matches += 1;
    else mismatches += 1;
    if (data.isCritical === true) criticalMismatches += 1;
  }

  const comparisons = snap.size;
  return {
    comparisons,
    matches,
    mismatches,
    criticalMismatches,
    matchRate: computeMatchRate(matches, comparisons),
  };
}

function daysSince(iso: string | undefined | null, now: Date): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / MS_DAY));
}

export async function getEmailQueueShadowStats(): Promise<EmailQueueShadowExtendedStats> {
  const db = getFirestoreAdmin();
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * MS_DAY);
  const since48h = new Date(now.getTime() - 48 * MS_DAY);
  const since72h = new Date(now.getTime() - 72 * MS_DAY);

  const aggregateSnap = await db.collection(SHADOW_ROOT).doc(AGGREGATE_DOC).get();
  const aggregate = mergeAggregate(aggregateSnap.data());

  const [last24h, last72h, previous24h] = await Promise.all([
    countWindowStats(since24h),
    countWindowStats(since72h),
    countWindowStats(since48h, since24h),
  ]);

  const mismatchesSnap = await db
    .collection(MISMATCHES_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const recentMismatches = mismatchesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      timestamp: String(data.timestamp ?? ''),
      leadId: String(data.leadId ?? ''),
      organizationId: String(data.organizationId ?? ''),
      doctorId: String(data.doctorId ?? ''),
      emailTipo: data.emailTipo as EmailTipo,
      legacyDecision: data.legacyDecision as ShadowDecision,
      queueDecision: data.queueDecision as ShadowDecision,
      legacyReason: String(data.legacyReason ?? ''),
      queueReason: String(data.queueReason ?? ''),
      status: data.status as 'MATCH' | 'MISMATCH',
      mismatchKind: data.mismatchKind,
    };
  });

  const matchRateTrend24h = Math.round((last24h.matchRate - previous24h.matchRate) * 1000) / 1000;

  const consecutiveDaysWithoutCriticalMismatch = aggregate.lastCriticalMismatchAt
    ? daysSince(aggregate.lastCriticalMismatchAt, now)
    : aggregate.firstComparisonAt
      ? daysSince(aggregate.firstComparisonAt, now)
      : 0;

  return {
    aggregate,
    enabled: EMAIL_QUEUE_SHADOW_VALIDATION_ENABLED,
    recentMismatches,
    last24h,
    last72h,
    previous24h,
    matchRateTrend24h,
    lastMismatchAt: aggregate.lastMismatchAt ?? null,
    lastCriticalMismatchAt: aggregate.lastCriticalMismatchAt ?? null,
    consecutiveDaysWithoutCriticalMismatch,
    criticalMismatchesInLast72h: last72h.criticalMismatches,
  };
}
