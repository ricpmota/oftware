import { Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO } from '@/lib/whatsapp/whatsappQueuePatientGuard';
import {
  buildWhatsappAutomationQueueId,
  type WhatsappAutomationMilestone,
  type WhatsappAutomationQueueItem,
  type WhatsappAutomationQueueStatus,
} from '@/types/whatsappAutomationQueue';

const COLLECTION = 'whatsapp_automation_queue';

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

function docToItem(docId: string, data: Record<string, unknown>): WhatsappAutomationQueueItem {
  return {
    id: docId,
    automationId: String(data.automationId ?? ''),
    organizationId: String(data.organizationId ?? ''),
    doctorId: String(data.doctorId ?? ''),
    patientId: String(data.patientId ?? ''),
    patientName: String(data.patientName ?? ''),
    phone: String(data.phone ?? ''),
    dateKey: String(data.dateKey ?? ''),
    scheduledFor: toDate(data.scheduledFor) ?? new Date(0),
    scheduledDateKey: String(data.scheduledDateKey ?? ''),
    scheduledTime: String(data.scheduledTime ?? ''),
    milestone: (data.milestone as WhatsappAutomationMilestone) ?? 'd1',
    status: (data.status as WhatsappAutomationQueueStatus) ?? 'pending',
    templateId: String(data.templateId ?? ''),
    semana: typeof data.semana === 'number' ? data.semana : Number(data.semana ?? 0),
    dose: typeof data.dose === 'number' ? data.dose : Number(data.dose ?? 0),
    scopeKey: typeof data.scopeKey === 'string' ? data.scopeKey : undefined,
    protocoloNome: typeof data.protocoloNome === 'string' ? data.protocoloNome : undefined,
    link: typeof data.link === 'string' ? data.link : undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    sentAt: toDate(data.sentAt),
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
  };
}

export type EnqueueWhatsappAutomationItemInput = {
  automationId: string;
  organizationId: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  phone: string;
  dateKey: string;
  scheduledFor: Date;
  scheduledDateKey: string;
  scheduledTime: string;
  milestone: WhatsappAutomationMilestone;
  templateId: string;
  semana: number;
  dose: number;
  scopeKey?: string;
  protocoloNome?: string;
  link?: string;
};

/**
 * Cria/atualiza um item da fila com id determinístico.
 * Regras de reativação:
 * - sent/processing: preserva estado (não reenfileira automaticamente).
 * - failed/skipped/pending: atualiza campos mutáveis e mantém item em pending,
 *   desde que scheduledDateKey seja hoje ou futuro (itens de dias passados não
 *   são reativados — só atualizam dados mutáveis sem alterar o status).
 */
export async function enqueueWhatsappAutomationItem(
  input: EnqueueWhatsappAutomationItemInput,
): Promise<{ id: string; created: boolean; updated: boolean }> {
  const id = buildWhatsappAutomationQueueId(
    input.automationId,
    input.doctorId,
    input.patientId,
    input.dateKey,
    input.milestone,
    input.scopeKey,
  );
  const ref = getFirestoreAdmin().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  const now = Timestamp.now();

  const mutableFields = {
    automationId: input.automationId,
    organizationId: input.organizationId,
    doctorId: input.doctorId,
    patientId: input.patientId,
    patientName: input.patientName,
    phone: input.phone,
    dateKey: input.dateKey,
    scheduledFor: Timestamp.fromDate(input.scheduledFor),
    scheduledDateKey: input.scheduledDateKey,
    scheduledTime: input.scheduledTime,
    milestone: input.milestone,
    templateId: input.templateId,
    semana: input.semana,
    dose: input.dose,
    scopeKey: input.scopeKey ?? null,
    protocoloNome: input.protocoloNome ?? null,
    link: input.link ?? null,
    updatedAt: now,
  };

  if (!snap.exists) {
    await ref.set({ ...mutableFields, status: 'pending', createdAt: now, sentAt: null, errorMessage: null });
    return { id, created: true, updated: false };
  }

  const currentStatus = (snap.data()?.status as WhatsappAutomationQueueStatus) ?? 'pending';
  if (currentStatus === 'sent' || currentStatus === 'processing') {
    // Já concluído/em curso — não reverter para pending.
    return { id, created: false, updated: false };
  }

  // Determina se o item deve ser reativado para pending.
  // Itens de dias passados (scheduledDateKey < hoje) não são reativados para não
  // disparar mensagens fora do tempo; apenas atualiza dados mutáveis no Firestore.
  const todayStr = new Date().toISOString().slice(0, 10); // UTC, conservador
  const isToday = input.scheduledDateKey >= todayStr;

  await ref.set(
    {
      ...mutableFields,
      ...(isToday ? { status: 'pending', sentAt: null, errorMessage: null } : {}),
    },
    { merge: true },
  );
  return { id, created: false, updated: true };
}

async function updateStatus(
  id: string,
  status: WhatsappAutomationQueueStatus,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const trimmed = id?.trim();
  if (!trimmed) return;
  await getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(trimmed)
    .set({ status, updatedAt: Timestamp.now(), ...extra }, { merge: true });
}

export async function markQueueItemProcessing(id: string): Promise<void> {
  await updateStatus(id, 'processing');
}

export async function markQueueItemSent(id: string, link?: string): Promise<void> {
  await updateStatus(id, 'sent', {
    sentAt: Timestamp.now(),
    errorMessage: null,
    ...(link ? { link } : {}),
  });
}

export async function markQueueItemFailed(id: string, error: string): Promise<void> {
  await updateStatus(id, 'failed', { errorMessage: error });
}

export async function markQueueItemSkipped(id: string, reason: string): Promise<void> {
  await updateStatus(id, 'skipped', { errorMessage: reason });
}

export async function deleteWhatsappQueueItem(id: string): Promise<void> {
  const trimmed = id?.trim();
  if (!trimmed) return;
  await getFirestoreAdmin().collection(COLLECTION).doc(trimmed).delete();
}

async function deleteQueueDocsByIds(ids: string[]): Promise<number> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return 0;
  const db = getFirestoreAdmin();
  const col = db.collection(COLLECTION);
  const chunkSize = 400;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const batch = db.batch();
    for (const docId of chunk) {
      batch.delete(col.doc(docId));
    }
    await batch.commit();
  }
  return unique.length;
}

export async function deleteWhatsappQueueItemsByIds(ids: string[]): Promise<number> {
  return deleteQueueDocsByIds(ids);
}

const STATUSES_TO_PRUNE: WhatsappAutomationQueueStatus[] = ['pending', 'processing', 'failed'];

/**
 * Tira da fila ativa os envios de um paciente (ex.: médico removeu o vínculo).
 * Não mexe em itens já enviados.
 */
export async function skipWhatsappQueueItemsForPatient(params: {
  patientId: string;
  doctorId?: string;
  reason?: string;
}): Promise<{ skipped: number }> {
  const pid = params.patientId.trim();
  if (!pid) return { skipped: 0 };
  const doctorId = params.doctorId?.trim();
  const reason = params.reason?.trim() || WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO;

  const items = await listQueueItemsByPatient(pid);
  let skipped = 0;
  for (const item of items) {
    if (doctorId && item.doctorId !== doctorId) continue;
    if (!STATUSES_TO_PRUNE.includes(item.status)) continue;
    await markQueueItemSkipped(item.id, reason);
    skipped += 1;
  }
  return { skipped };
}

/**
 * Marca skipped pendentes/falhos cujo paciente não está mais no quadro deste médico.
 */
export async function skipWhatsappQueueItemsNotOnRoster(
  doctorId: string,
  rosterIds: Set<string>,
): Promise<{ skipped: number; patientIds: string[] }> {
  const id = doctorId.trim();
  if (!id) return { skipped: 0, patientIds: [] };

  const items = await listQueueItemsByDoctor(id);
  const missing = new Set<string>();
  let skipped = 0;

  for (const item of items) {
    if (!STATUSES_TO_PRUNE.includes(item.status)) continue;
    const pid = item.patientId.trim();
    if (!pid || rosterIds.has(pid)) continue;
    missing.add(pid);
    await markQueueItemSkipped(item.id, WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO);
    skipped += 1;
  }

  return { skipped, patientIds: [...missing] };
}

/**
 * Apaga da fila (exceto enviados) os itens de quem não está mais no quadro.
 * Usado na limpeza pontual: itens skipped/failed de pacientes deletados
 * continuam aparecendo na agenda enquanto o documento existir.
 */
export async function deleteWhatsappQueueItemsNotOnRoster(
  doctorId: string,
  rosterIds: Set<string>,
): Promise<{ deleted: number; patientIds: string[] }> {
  const id = doctorId.trim();
  if (!id) return { deleted: 0, patientIds: [] };

  const items = await listQueueItemsByDoctor(id);
  const missing = new Set<string>();
  const toDelete: string[] = [];

  for (const item of items) {
    if (item.status === 'sent') continue;
    const pid = item.patientId.trim();
    if (!pid || rosterIds.has(pid)) continue;
    missing.add(pid);
    toDelete.push(item.id);
  }

  const db = getFirestoreAdmin();
  const col = db.collection(COLLECTION);
  const chunkSize = 400;
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize);
    const batch = db.batch();
    for (const docId of chunk) {
      batch.delete(col.doc(docId));
    }
    await batch.commit();
  }

  return { deleted: toDelete.length, patientIds: [...missing] };
}

/**
 * Itens vencidos e prontos para envio.
 * Query: status == 'pending' AND scheduledFor <= now, ordenado por scheduledFor.
 * Requer índice composto (status ASC, scheduledFor ASC).
 */
export async function listDueWhatsappAutomationItems(
  now: Date,
  limit = 10,
): Promise<WhatsappAutomationQueueItem[]> {
  const snap = await getFirestoreAdmin()
    .collection(COLLECTION)
    .where('status', '==', 'pending')
    .where('scheduledFor', '<=', Timestamp.fromDate(now))
    .orderBy('scheduledFor', 'asc')
    .limit(Math.max(1, Math.min(limit, 100)))
    .get();

  return snap.docs.map((doc) => docToItem(doc.id, doc.data() as Record<string, unknown>));
}

/**
 * Itens da fila de um médico (todos os status).
 * Query de campo único (doctorId) — filtragem fina (data/status) em memória.
 */
export async function listQueueItemsByDoctor(
  doctorId: string,
): Promise<WhatsappAutomationQueueItem[]> {
  const id = doctorId?.trim();
  if (!id) return [];
  const snap = await getFirestoreAdmin()
    .collection(COLLECTION)
    .where('doctorId', '==', id)
    .get();
  return snap.docs.map((doc) => docToItem(doc.id, doc.data() as Record<string, unknown>));
}

/**
 * Itens cujo dia de envio (scheduledDateKey) é a data pedida.
 */
export async function listQueueItemsByDoctorScheduledDate(
  doctorId: string,
  scheduledDateKey: string,
): Promise<WhatsappAutomationQueueItem[]> {
  const dateKey = scheduledDateKey?.trim();
  if (!dateKey) return [];
  const items = await listQueueItemsByDoctor(doctorId);
  return items.filter((item) => item.scheduledDateKey === dateKey);
}

/**
 * Apaga itens da fila de um paciente. Por padrão preserva os já enviados.
 * `automationIds` vazio remove todos os tipos (exceto enviados, se keepSent).
 */
export async function deleteWhatsappQueueItemsForPatient(params: {
  patientId: string;
  automationIds?: readonly string[];
  keepSent?: boolean;
}): Promise<{ deleted: number }> {
  const pid = params.patientId.trim();
  if (!pid) return { deleted: 0 };
  const keepSent = params.keepSent !== false;
  const automationIds = params.automationIds?.map((id) => id.trim()).filter(Boolean);
  const allowed = automationIds && automationIds.length > 0 ? new Set(automationIds) : null;

  const items = await listQueueItemsByPatient(pid);
  const toDelete = items
    .filter((item) => {
      if (keepSent && item.status === 'sent') return false;
      if (allowed && !allowed.has(item.automationId)) return false;
      return true;
    })
    .map((item) => item.id);

  if (toDelete.length === 0) return { deleted: 0 };
  const deleted = await deleteQueueDocsByIds(toDelete);
  return { deleted };
}

/**
 * Itens da fila de um paciente (todos os status).
 * Usa índice de campo único (patientId) — barato o suficiente para gatilhos.
 * A filtragem por status/semana é feita em memória por quem chama.
 */
export async function listQueueItemsByPatient(
  patientId: string,
): Promise<WhatsappAutomationQueueItem[]> {
  const pid = patientId?.trim();
  if (!pid) return [];
  const snap = await getFirestoreAdmin()
    .collection(COLLECTION)
    .where('patientId', '==', pid)
    .get();
  return snap.docs.map((doc) => docToItem(doc.id, doc.data() as Record<string, unknown>));
}

export type WhatsappAutomationQueueStats = {
  counts: Record<WhatsappAutomationQueueStatus, number> & { total: number };
  dueNow: number;
  nextScheduledFor: Date | null;
  upcoming: WhatsappAutomationQueueItem[];
};

const QUEUE_STATUSES: WhatsappAutomationQueueStatus[] = [
  'pending',
  'processing',
  'sent',
  'failed',
  'skipped',
];

/**
 * Estatísticas da fila para o painel admin.
 * Usa agregação count() (barato) por status + count de vencidos + os 10 próximos
 * pendentes. Requer o índice composto (status ASC, scheduledFor ASC) já existente.
 */
export async function getWhatsappAutomationQueueStats(
  now: Date = new Date(),
): Promise<WhatsappAutomationQueueStats> {
  const col = getFirestoreAdmin().collection(COLLECTION);

  const countEntries = await Promise.all(
    QUEUE_STATUSES.map(async (status) => {
      const agg = await col.where('status', '==', status).count().get();
      return [status, agg.data().count] as const;
    }),
  );

  const counts = countEntries.reduce(
    (acc, [status, value]) => {
      acc[status] = value;
      acc.total += value;
      return acc;
    },
    { pending: 0, processing: 0, sent: 0, failed: 0, skipped: 0, total: 0 } as WhatsappAutomationQueueStats['counts'],
  );

  const dueAgg = await col
    .where('status', '==', 'pending')
    .where('scheduledFor', '<=', Timestamp.fromDate(now))
    .count()
    .get();
  const dueNow = dueAgg.data().count;

  const upcomingSnap = await col
    .where('status', '==', 'pending')
    .orderBy('scheduledFor', 'asc')
    .limit(10)
    .get();
  const upcoming = upcomingSnap.docs.map((doc) => docToItem(doc.id, doc.data() as Record<string, unknown>));

  return {
    counts,
    dueNow,
    nextScheduledFor: upcoming[0]?.scheduledFor ?? null,
    upcoming,
  };
}
