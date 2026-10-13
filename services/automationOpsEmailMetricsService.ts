import { Timestamp } from 'firebase-admin/firestore';
import { percentile } from '@/lib/automation/opsHealthRules';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { AutomationOpsHourlyPoint, AutomationOpsSlaMetrics } from '@/types/automationOps';
import { logEmailEnviosResidual } from '@/lib/email/emailEnviosResidualMetrics';

const QUEUE = 'email_automation_queue';

export type EmailQueueDepthMetrics = {
  oldestPendingAt: Date | null;
  oldestProcessingAt: Date | null;
  avgQueueAgeMinutes: number | null;
  maxQueueAgeMinutes: number | null;
  oldestProcessingAgeMs: number | null;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') return maybe.toDate();
  }
  return null;
}

const EMPTY_DEPTH: EmailQueueDepthMetrics = {
  oldestPendingAt: null,
  oldestProcessingAt: null,
  avgQueueAgeMinutes: null,
  maxQueueAgeMinutes: null,
  oldestProcessingAgeMs: null,
};

const EMPTY_SLA: AutomationOpsSlaMetrics = {
  sampleSize: 0,
  p50Ms: null,
  p95Ms: null,
  p99Ms: null,
  avgMs: null,
  maxMs: null,
};

function processingAgeMs(data: Record<string, unknown>, now: number): number | null {
  const started = toDate(data.processingStartedAt ?? data.updatedAt);
  return started ? now - started.getTime() : null;
}

/** Idade da fila: pending + processing (amostra até 100). */
export async function getEmailQueueDepthMetrics(
  organizationId?: string,
): Promise<EmailQueueDepthMetrics> {
  try {
    const now = Date.now();
    const col = getFirestoreAdmin().collection(QUEUE);
    const orgId = organizationId?.trim();

    const pendingBase = orgId ?
      col.where('organizationId', '==', orgId).where('status', '==', 'pending')
    : col.where('status', '==', 'pending');

    const processingBase = orgId ?
      col.where('organizationId', '==', orgId).where('status', '==', 'processing')
    : col.where('status', '==', 'processing');

    // Processing: sem orderBy(updatedAt) — evita índice composto; ordena em memória.
    const [oldestPendingSnap, pendingSampleSnap, processingSampleSnap] = await Promise.all([
      pendingBase.orderBy('scheduledFor', 'asc').limit(1).get(),
      pendingBase.orderBy('scheduledFor', 'asc').limit(100).get(),
      processingBase.limit(50).get(),
    ]);

    const oldestPendingAt = oldestPendingSnap.docs[0] ?
      toDate(oldestPendingSnap.docs[0].data().scheduledFor)
    : null;

    const processingDocs = [...processingSampleSnap.docs].sort((a, b) => {
      const ta = toDate(a.data().updatedAt)?.getTime() ?? 0;
      const tb = toDate(b.data().updatedAt)?.getTime() ?? 0;
      return ta - tb;
    });
    const oldestProcessingDoc = processingDocs[0];
    const oldestProcessingAt =
      oldestProcessingDoc ?
        toDate(
          oldestProcessingDoc.data().processingStartedAt ?? oldestProcessingDoc.data().updatedAt,
        )
      : null;

    const agesMinutes: number[] = [];
    for (const doc of pendingSampleSnap.docs) {
      const scheduled = toDate(doc.data().scheduledFor);
      if (scheduled) agesMinutes.push((now - scheduled.getTime()) / 60_000);
    }
    for (const doc of processingDocs) {
      const ageMs = processingAgeMs(doc.data() as Record<string, unknown>, now);
      if (ageMs != null) agesMinutes.push(ageMs / 60_000);
    }

    const avgQueueAgeMinutes =
      agesMinutes.length > 0 ?
        agesMinutes.reduce((a, b) => a + b, 0) / agesMinutes.length
      : null;
    const maxQueueAgeMinutes = agesMinutes.length > 0 ? Math.max(...agesMinutes) : null;
    const oldestProcessingAgeMs =
      oldestProcessingAt ? now - oldestProcessingAt.getTime() : null;

    return {
      oldestPendingAt,
      oldestProcessingAt,
      avgQueueAgeMinutes,
      maxQueueAgeMinutes,
      oldestProcessingAgeMs,
    };
  } catch (error) {
    console.error('[automationOpsEmailMetrics] getEmailQueueDepthMetrics', error);
    return EMPTY_DEPTH;
  }
}

/** SLA: scheduledFor → sentAt (amostra recente de itens sent). */
export async function getEmailQueueSlaMetrics(organizationId?: string): Promise<AutomationOpsSlaMetrics> {
  try {
    const col = getFirestoreAdmin().collection(QUEUE);
    const orgId = organizationId?.trim();

    const base = orgId ?
      col.where('organizationId', '==', orgId).where('status', '==', 'sent')
    : col.where('status', '==', 'sent');

    let snap;
    try {
      snap = await base.orderBy('sentAt', 'desc').limit(200).get();
    } catch {
      snap = await base.limit(200).get();
    }

    const deltas: number[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const scheduled = toDate(data.scheduledFor);
      const sent = toDate(data.sentAt);
      if (scheduled && sent) {
        const delta = sent.getTime() - scheduled.getTime();
        if (delta >= 0) deltas.push(delta);
      }
    }

    deltas.sort((a, b) => a - b);

    return {
      sampleSize: deltas.length,
      p50Ms: percentile(deltas, 50),
      p95Ms: percentile(deltas, 95),
      p99Ms: percentile(deltas, 99),
      avgMs: deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null,
      maxMs: deltas.length > 0 ? deltas[deltas.length - 1]! : null,
    };
  } catch (error) {
    console.error('[automationOpsEmailMetrics] getEmailQueueSlaMetrics', error);
    return EMPTY_SLA;
  }
}

/** Emails enviados por hora (últimas 24h) via fila do Automation Engine — sem varrer email_envios. */
export async function getEmailsSentByHourLast24h(): Promise<AutomationOpsHourlyPoint[]> {
  const buckets = new Map<string, number>();
  for (let h = 23; h >= 0; h--) {
    const d = new Date(Date.now() - h * 60 * 60 * 1000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:00`;
    buckets.set(key, 0);
  }

  const startedAt = Date.now();
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let snap;
    try {
      snap = await getFirestoreAdmin()
        .collection(QUEUE)
        .where('status', '==', 'sent')
        .where('sentAt', '>=', Timestamp.fromDate(since))
        .orderBy('sentAt', 'desc')
        .limit(500)
        .get();
    } catch {
      snap = await getFirestoreAdmin()
        .collection(QUEUE)
        .where('status', '==', 'sent')
        .orderBy('sentAt', 'desc')
        .limit(500)
        .get();
    }

    let counted = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      const sent = toDate(data.sentAt);
      if (!sent || sent.getTime() < since.getTime()) continue;
      const key = `${sent.getUTCFullYear()}-${String(sent.getUTCMonth() + 1).padStart(2, '0')}-${String(sent.getUTCDate()).padStart(2, '0')}T${String(sent.getUTCHours()).padStart(2, '0')}:00`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
        counted += 1;
      }
    }

    logEmailEnviosResidual({
      origin: 'automationOps.getEmailsSentByHourLast24h',
      queryCount: 1,
      docsRead: 0,
      durationMs: Date.now() - startedAt,
      returnedDocs: counted,
      paginationUsed: true,
      timeWindow: { start: since.toISOString(), end: new Date().toISOString() },
      note: `ETAPA 2.3 — gráfico Ops usa email_automation_queue (docsQueue=${snap.size}); zero reads em email_envios`,
    });
  } catch (error) {
    console.error('[automationOpsEmailMetrics] getEmailsSentByHourLast24h', error);
  }

  return Array.from(buckets.entries()).map(([hour, count]) => ({ hour, count }));
}
