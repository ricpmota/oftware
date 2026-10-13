import { FieldValue } from 'firebase-admin/firestore';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { isWhatsappSessionHealthFailureMessage } from '@/lib/whatsapp/whatsappSessionHealth';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { listQueueItemsByDoctorScheduledDate } from '@/services/whatsappAutomationQueueService';
import type { WhatsappAutomationQueueItem } from '@/types/whatsappAutomationQueue';

const LEMBRETES_COLLECTION = 'lembretes';

function isConnectionRelatedFailure(errorMessage?: string): boolean {
  // Sem mensagem: trata como falha de conexão (casos antigos / genéricos).
  if (!errorMessage?.trim()) return true;
  return isWhatsappSessionHealthFailureMessage(errorMessage);
}

function shouldReactivateQueueItem(item: WhatsappAutomationQueueItem, todayKey: string): boolean {
  if (item.scheduledDateKey !== todayKey) return false;
  if (item.status === 'failed') return isConnectionRelatedFailure(item.errorMessage);
  if (item.status === 'skipped') return isConnectionRelatedFailure(item.errorMessage);
  return false;
}

async function countTodayFailedCalendarioLembretes(
  doctorId: string,
  todayKey: string,
): Promise<number> {
  const snap = await getFirestoreAdmin()
    .collection(LEMBRETES_COLLECTION)
    .where('medicoId', '==', doctorId)
    .where('data', '==', todayKey)
    .get();

  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as {
      whatsappNotifyStatus?: string;
      whatsappNotifyError?: string;
      avisoWhatsApp?: string;
      concluido?: boolean;
    };
    if (data.concluido === true) continue;
    if (data.avisoWhatsApp === 'disabled' || !data.avisoWhatsApp) continue;
    if (data.whatsappNotifyStatus !== 'failed') continue;
    if (!isConnectionRelatedFailure(data.whatsappNotifyError)) continue;
    count += 1;
  }
  return count;
}

/** Conta mensagens de hoje que falharam por indisponibilidade da sessão WhatsApp. */
export async function countTodayUnsentWhatsappItemsForDoctor(doctorId: string): Promise<{
  dateKey: string;
  queueItems: number;
  calendarioLembretes: number;
  total: number;
}> {
  const id = doctorId?.trim();
  const todayKey = getBrasilDateTimeParts().dateKey;
  if (!id) {
    return { dateKey: todayKey, queueItems: 0, calendarioLembretes: 0, total: 0 };
  }

  const queueItems = await listQueueItemsByDoctorScheduledDate(id, todayKey);
  const queueCount = queueItems.filter((item) => shouldReactivateQueueItem(item, todayKey)).length;
  const calendarioCount = await countTodayFailedCalendarioLembretes(id, todayKey);

  return {
    dateKey: todayKey,
    queueItems: queueCount,
    calendarioLembretes: calendarioCount,
    total: queueCount + calendarioCount,
  };
}

/** Reativa para `pending` apenas itens de hoje que falharam por queda da sessão. */
export async function reactivateTodayUnsentWhatsappForDoctor(doctorId: string): Promise<{
  dateKey: string;
  queueReactivated: number;
  calendarioReactivated: number;
  total: number;
}> {
  const id = doctorId?.trim();
  const todayKey = getBrasilDateTimeParts().dateKey;
  if (!id) {
    return { dateKey: todayKey, queueReactivated: 0, calendarioReactivated: 0, total: 0 };
  }

  const db = getFirestoreAdmin();
  const queueItems = await listQueueItemsByDoctorScheduledDate(id, todayKey);
  let queueReactivated = 0;

  for (const item of queueItems) {
    if (!shouldReactivateQueueItem(item, todayKey)) continue;
    await db.collection('whatsapp_automation_queue').doc(item.id).set(
      {
        status: 'pending',
        errorMessage: null,
        sentAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    queueReactivated += 1;
  }

  const lembretesSnap = await db
    .collection(LEMBRETES_COLLECTION)
    .where('medicoId', '==', id)
    .where('data', '==', todayKey)
    .get();

  let calendarioReactivated = 0;
  for (const doc of lembretesSnap.docs) {
    const data = doc.data() as {
      whatsappNotifyStatus?: string;
      whatsappNotifyError?: string;
      avisoWhatsApp?: string;
      concluido?: boolean;
    };
    if (data.concluido === true) continue;
    if (data.avisoWhatsApp === 'disabled' || !data.avisoWhatsApp) continue;
    if (data.whatsappNotifyStatus !== 'failed') continue;
    if (!isConnectionRelatedFailure(data.whatsappNotifyError)) continue;

    await doc.ref.set(
      {
        whatsappNotifyStatus: 'pending',
        whatsappNotifyError: FieldValue.delete(),
        whatsappNotificadoEm: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    calendarioReactivated += 1;
  }

  return {
    dateKey: todayKey,
    queueReactivated,
    calendarioReactivated,
    total: queueReactivated + calendarioReactivated,
  };
}
