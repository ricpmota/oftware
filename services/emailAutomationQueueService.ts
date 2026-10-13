import { Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  buildEmailAutomationQueueId,
  EMAIL_AUTOMATION_QUEUE_PAYLOAD_VERSION,
  type EmailAutomationQueueItem,
  type EmailAutomationQueueStatus,
  type LeadsMedicoQueuedEmailTipo,
} from '@/types/emailAutomationQueue';

const COLLECTION = 'email_automation_queue';

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') return maybe.toDate();
  }
  return undefined;
}

function docToItem(docId: string, data: Record<string, unknown>): EmailAutomationQueueItem {
  return {
    id: docId,
    organizationId: String(data.organizationId ?? ''),
    doctorId: String(data.doctorId ?? ''),
    leadId: String(data.leadId ?? ''),
    leadNome: String(data.leadNome ?? ''),
    leadEmail: String(data.leadEmail ?? ''),
    emailTipo: (data.emailTipo as LeadsMedicoQueuedEmailTipo) ?? 'email1',
    scheduledFor: toDate(data.scheduledFor) ?? new Date(0),
    status: (data.status as EmailAutomationQueueStatus) ?? 'pending',
    payloadVersion:
      typeof data.payloadVersion === 'number' ? data.payloadVersion : EMAIL_AUTOMATION_QUEUE_PAYLOAD_VERSION,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    sentAt: toDate(data.sentAt),
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
    retryCount: typeof data.retryCount === 'number' ? data.retryCount : Number(data.retryCount ?? 0),
    lastAttemptAt: toDate(data.lastAttemptAt),
    automationExecutionId:
      typeof data.automationExecutionId === 'string' ? data.automationExecutionId : undefined,
    processingStartedAt: toDate(data.processingStartedAt),
    lastRunId: typeof data.lastRunId === 'string' ? data.lastRunId : undefined,
    providerMessageId:
      typeof data.providerMessageId === 'string' ? data.providerMessageId : undefined,
  };
}

export type UpsertEmailAutomationQueueItemInput = {
  organizationId: string;
  doctorId?: string;
  leadId: string;
  leadNome: string;
  leadEmail: string;
  emailTipo: LeadsMedicoQueuedEmailTipo;
  scheduledFor: Date;
  /** Usado no rebuild para refletir envios já feitos pelo motor legado. */
  initialStatus?: EmailAutomationQueueStatus;
  sentAt?: Date;
  errorMessage?: string;
};

/**
 * Cria/atualiza um item da fila com id determinístico.
 * Nunca ressuscita um item já processado (sent/failed/skipped/processing).
 */
export async function upsertQueueItem(
  input: UpsertEmailAutomationQueueItemInput,
): Promise<{ id: string; created: boolean; updated: boolean; skipped: boolean }> {
  const id = buildEmailAutomationQueueId(input.leadId, input.emailTipo);
  const ref = getFirestoreAdmin().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  const now = Timestamp.now();

  const mutableFields = {
    organizationId: input.organizationId,
    doctorId: input.doctorId?.trim() ?? '',
    leadId: input.leadId,
    leadNome: input.leadNome,
    leadEmail: input.leadEmail,
    emailTipo: input.emailTipo,
    scheduledFor: Timestamp.fromDate(input.scheduledFor),
    payloadVersion: EMAIL_AUTOMATION_QUEUE_PAYLOAD_VERSION,
    updatedAt: now,
  };

  const desiredStatus = input.initialStatus ?? 'pending';

  if (!snap.exists) {
    await ref.set({
      ...mutableFields,
      status: desiredStatus,
      createdAt: now,
      sentAt: input.sentAt ? Timestamp.fromDate(input.sentAt) : null,
      errorMessage: input.errorMessage ?? null,
    });
    return { id, created: true, updated: false, skipped: false };
  }

  const currentStatus = (snap.data()?.status as EmailAutomationQueueStatus) ?? 'pending';
  if (currentStatus !== 'pending') {
    return { id, created: false, updated: false, skipped: true };
  }

  if (desiredStatus !== 'pending') {
    await ref.set(
      {
        ...mutableFields,
        status: desiredStatus,
        sentAt: input.sentAt ? Timestamp.fromDate(input.sentAt) : null,
        errorMessage: input.errorMessage ?? null,
      },
      { merge: true },
    );
    return { id, created: false, updated: true, skipped: false };
  }

  await ref.set(mutableFields, { merge: true });
  return { id, created: false, updated: true, skipped: false };
}

/** Enfileira um único e-mail da sequência leads médico. */
export async function enqueueLeadEmail(
  input: UpsertEmailAutomationQueueItemInput,
): Promise<{ id: string; created: boolean; updated: boolean; skipped: boolean }> {
  return upsertQueueItem(input);
}

/** Enfileira email1–email5 com scheduledFor derivado de createdAt. */
export async function enqueueLeadSequence(params: {
  organizationId: string;
  doctorId?: string;
  leadId: string;
  leadNome: string;
  leadEmail: string;
  createdAt: Date;
  schedule: Array<{
    emailTipo: LeadsMedicoQueuedEmailTipo;
    scheduledFor: Date;
    initialStatus?: EmailAutomationQueueStatus;
    sentAt?: Date;
    errorMessage?: string;
  }>;
}): Promise<{ enqueued: number; updated: number; skippedExisting: number }> {
  let enqueued = 0;
  let updated = 0;
  let skippedExisting = 0;

  for (const item of params.schedule) {
    const result = await upsertQueueItem({
      organizationId: params.organizationId,
      doctorId: params.doctorId,
      leadId: params.leadId,
      leadNome: params.leadNome,
      leadEmail: params.leadEmail,
      emailTipo: item.emailTipo,
      scheduledFor: item.scheduledFor,
      initialStatus: item.initialStatus,
      sentAt: item.sentAt,
      errorMessage: item.errorMessage,
    });
    if (result.created) enqueued += 1;
    else if (result.updated) updated += 1;
    else if (result.skipped) skippedExisting += 1;
  }

  return { enqueued, updated, skippedExisting };
}

async function updateStatus(
  id: string,
  status: EmailAutomationQueueStatus,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const trimmed = id?.trim();
  if (!trimmed) return;
  await getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(trimmed)
    .set({ status, updatedAt: Timestamp.now(), ...extra }, { merge: true });
}

export type ClaimQueueItemResult = 'claimed' | 'not_pending' | 'missing';

/** Lock otimista: pending → processing (transação). */
export async function claimQueueItemForProcessing(
  id: string,
  automationExecutionId: string,
  runId: string,
): Promise<ClaimQueueItemResult> {
  const trimmed = id?.trim();
  if (!trimmed) return 'missing';

  const db = getFirestoreAdmin();
  const ref = db.collection(COLLECTION).doc(trimmed);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 'missing';
    const status = (snap.data()?.status as EmailAutomationQueueStatus) ?? 'pending';
    if (status !== 'pending') return 'not_pending';

    tx.set(
      ref,
      {
        status: 'processing',
        automationExecutionId,
        lastRunId: runId,
        processingStartedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    return 'claimed';
  });
}

export async function markQueueItemSent(
  id: string,
  extra: { automationExecutionId?: string; messageId?: string } = {},
): Promise<void> {
  await updateStatus(id, 'sent', {
    sentAt: Timestamp.now(),
    errorMessage: null,
    ...(extra.automationExecutionId ? { automationExecutionId: extra.automationExecutionId } : {}),
    ...(extra.messageId ? { providerMessageId: extra.messageId } : {}),
  });
}

export async function markQueueItemFailed(
  id: string,
  error: string,
  retryCount: number,
): Promise<void> {
  await updateStatus(id, 'failed', {
    errorMessage: error,
    retryCount,
    lastAttemptAt: Timestamp.now(),
  });
}

export async function markQueueItemSkipped(id: string, reason: string): Promise<void> {
  await updateStatus(id, 'skipped', { errorMessage: reason });
}

export async function markQueueItemProcessing(id: string): Promise<void> {
  await updateStatus(id, 'processing');
}

export async function removeQueueItem(id: string): Promise<boolean> {
  const trimmed = id?.trim();
  if (!trimmed) return false;
  const ref = getFirestoreAdmin().collection(COLLECTION).doc(trimmed);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

/**
 * Itens vencidos e prontos para envio (consumidor futuro).
 * Query: status == 'pending' AND scheduledFor <= now.
 */
export async function getPendingItems(now: Date, limit = 10): Promise<EmailAutomationQueueItem[]> {
  const snap = await getFirestoreAdmin()
    .collection(COLLECTION)
    .where('status', '==', 'pending')
    .where('scheduledFor', '<=', Timestamp.fromDate(now))
    .orderBy('scheduledFor', 'asc')
    .limit(Math.max(1, Math.min(limit, 100)))
    .get();

  return snap.docs.map((doc) => docToItem(doc.id, doc.data() as Record<string, unknown>));
}

/** Itens vencidos filtrados por organização (piloto / cutover gradual). */
export async function getPendingDueItemsForOrganization(
  organizationId: string,
  now: Date,
  limit = 10,
): Promise<EmailAutomationQueueItem[]> {
  const orgId = organizationId?.trim();
  if (!orgId) return [];

  const snap = await getFirestoreAdmin()
    .collection(COLLECTION)
    .where('organizationId', '==', orgId)
    .where('status', '==', 'pending')
    .where('scheduledFor', '<=', Timestamp.fromDate(now))
    .orderBy('scheduledFor', 'asc')
    .limit(Math.max(1, Math.min(limit, 100)))
    .get();

  return snap.docs.map((doc) => docToItem(doc.id, doc.data() as Record<string, unknown>));
}

/** Leitura pontual — usada pelo shadow validation (sem mutação). */
export async function getQueueItemByLeadAndTipo(
  leadId: string,
  emailTipo: LeadsMedicoQueuedEmailTipo,
): Promise<EmailAutomationQueueItem | null> {
  const id = buildEmailAutomationQueueId(leadId, emailTipo);
  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return docToItem(snap.id, snap.data() as Record<string, unknown>);
}

export async function listQueueItemsByLead(leadId: string): Promise<EmailAutomationQueueItem[]> {
  const lid = leadId?.trim();
  if (!lid) return [];
  const snap = await getFirestoreAdmin().collection(COLLECTION).where('leadId', '==', lid).get();
  return snap.docs.map((doc) => docToItem(doc.id, doc.data() as Record<string, unknown>));
}

export type EmailAutomationQueueStats = {
  counts: Record<EmailAutomationQueueStatus, number> & { total: number };
  dueNow: number;
  nextScheduledFor: Date | null;
  upcoming: EmailAutomationQueueItem[];
  /** Média de retryCount em itens failed (ETAPA 2). */
  avgRetryCountFailed: number;
  /** Soma de retryCount em failed. */
  totalRetries: number;
};

const QUEUE_STATUSES: EmailAutomationQueueStatus[] = [
  'pending',
  'processing',
  'sent',
  'failed',
  'skipped',
];

/** Estatísticas via count() — sem full-scan. */
export async function stats(
  now: Date = new Date(),
  organizationId?: string,
): Promise<EmailAutomationQueueStats> {
  const col = getFirestoreAdmin().collection(COLLECTION);
  const orgId = organizationId?.trim();

  const baseQuery = orgId ? col.where('organizationId', '==', orgId) : col;

  const countEntries = await Promise.all(
    QUEUE_STATUSES.map(async (status) => {
      const q = orgId ? baseQuery.where('status', '==', status) : col.where('status', '==', status);
      const agg = await q.count().get();
      return [status, agg.data().count] as const;
    }),
  );

  const counts = countEntries.reduce(
    (acc, [status, value]) => {
      acc[status] = value;
      acc.total += value;
      return acc;
    },
    { pending: 0, processing: 0, sent: 0, failed: 0, skipped: 0, total: 0 } as EmailAutomationQueueStats['counts'],
  );

  const dueQuery = orgId
    ? baseQuery.where('status', '==', 'pending').where('scheduledFor', '<=', Timestamp.fromDate(now))
    : col.where('status', '==', 'pending').where('scheduledFor', '<=', Timestamp.fromDate(now));
  const dueAgg = await dueQuery.count().get();
  const dueNow = dueAgg.data().count;

  const upcomingQuery = orgId
    ? baseQuery.where('status', '==', 'pending').orderBy('scheduledFor', 'asc').limit(10)
    : col.where('status', '==', 'pending').orderBy('scheduledFor', 'asc').limit(10);
  const upcomingSnap = await upcomingQuery.get();
  const upcoming = upcomingSnap.docs.map((doc) => docToItem(doc.id, doc.data() as Record<string, unknown>));

  let avgRetryCountFailed = 0;
  let totalRetries = 0;
  if (counts.failed > 0) {
    const failedQuery = orgId
      ? baseQuery.where('status', '==', 'failed').limit(200)
      : col.where('status', '==', 'failed').limit(200);
    const failedSnap = await failedQuery.get();
    for (const doc of failedSnap.docs) {
      const rc = Number(doc.data()?.retryCount ?? 0);
      totalRetries += rc;
    }
    avgRetryCountFailed = failedSnap.size > 0 ? totalRetries / failedSnap.size : 0;
  }

  return {
    counts,
    dueNow,
    nextScheduledFor: upcoming[0]?.scheduledFor ?? null,
    upcoming,
    avgRetryCountFailed,
    totalRetries,
  };
}
