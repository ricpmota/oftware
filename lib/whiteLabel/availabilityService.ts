import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { listAllSlotsFromEngine, listAvailableSlotsFromEngine } from '@/lib/whiteLabel/availabilityEngine';
import { getAgendaSettings } from '@/lib/whiteLabel/agendaSettingsService';
import { buildAvailabilityDocId, parseAvailabilityDocId } from '@/lib/whiteLabel/availabilitySlotUtils';
import type { WhiteLabelSlotSource } from '@/types/whiteLabelAgenda';
import type { WhiteLabelAvailabilityStatus } from '@/types/whiteLabelAvailability';
import {
  WHITELABEL_AVAILABILITY_COLLECTION,
  compareAvailabilityTimes,
  isValidAvailabilityDate,
  isValidAvailabilityRange,
  isValidAvailabilityTime,
  mapAvailabilityDoc,
  mapAvailabilityDocApi,
} from '@/lib/whiteLabel/availabilityFirestore';

export class SlotUnavailableError extends Error {
  constructor(message = 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário.') {
    super(message);
    this.name = 'SlotUnavailableError';
  }
}

function sortAvailabilityRows<T extends { date: string; startTime: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || compareAvailabilityTimes(a.startTime, b.startTime)
  );
}

export async function listAvailableSlots(fromDate?: string) {
  const settings = await getAgendaSettings();
  if (settings.slotGenerationEnabled) {
    return sortAvailabilityRows(await listAvailableSlotsFromEngine(fromDate));
  }

  const db = getFirestoreAdmin();
  const snap = await db
    .collection(WHITELABEL_AVAILABILITY_COLLECTION)
    .where('status', '==', 'available')
    .get();

  const minDate = fromDate && isValidAvailabilityDate(fromDate) ? fromDate : new Date().toISOString().slice(0, 10);
  const rows = snap.docs.map((doc) => mapAvailabilityDocApi(doc.id, doc.data()));
  return sortAvailabilityRows(rows.filter((row) => row.date >= minDate));
}

export async function listAllAvailabilitySlots(fromDate?: string, toDate?: string) {
  const today = fromDate || new Date().toISOString().slice(0, 10);
  const end = toDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  })();

  const engineSlots = await listAllSlotsFromEngine(today, end);
  if (engineSlots.length > 0) return sortAvailabilityRows(engineSlots);

  const db = getFirestoreAdmin();
  const snap = await db.collection(WHITELABEL_AVAILABILITY_COLLECTION).get();
  const rows = snap.docs.map((doc) => mapAvailabilityDocApi(doc.id, doc.data()));
  return sortAvailabilityRows(rows);
}

export async function ensureAvailabilitySlot(input: {
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  source?: WhiteLabelSlotSource;
}) {
  const db = getFirestoreAdmin();
  const deterministicId = buildAvailabilityDocId(input.date, input.startTime, input.endTime);
  const docId = input.availabilityId || deterministicId;
  const ref = db.collection(WHITELABEL_AVAILABILITY_COLLECTION).doc(docId);

  const existing = await ref.get();
  if (existing.exists) {
    return mapAvailabilityDoc(existing.id, existing.data()!);
  }

  const byQuery = await db
    .collection(WHITELABEL_AVAILABILITY_COLLECTION)
    .where('date', '==', input.date)
    .where('startTime', '==', input.startTime)
    .where('endTime', '==', input.endTime)
    .limit(1)
    .get();

  if (!byQuery.empty) {
    const doc = byQuery.docs[0];
    return mapAvailabilityDoc(doc.id, doc.data());
  }

  await ref.set({
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    status: 'available' satisfies WhiteLabelAvailabilityStatus,
    source: input.source || 'generated',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const created = await ref.get();
  return mapAvailabilityDoc(created.id, created.data()!);
}

export type CreateSlotsBulkResult = {
  created: ReturnType<typeof mapAvailabilityDocApi>[];
  skipped: { startTime: string; endTime: string; reason: string }[];
};

export async function createAvailabilitySlotsBulk(
  date: string,
  slots: { startTime: string; endTime: string }[]
): Promise<CreateSlotsBulkResult> {
  const created: CreateSlotsBulkResult['created'] = [];
  const skipped: CreateSlotsBulkResult['skipped'] = [];

  for (const slot of slots) {
    try {
      const row = await createAvailabilitySlot({ date, ...slot });
      created.push(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar horário.';
      if (message.includes('Já existe')) {
        skipped.push({ ...slot, reason: 'already_exists' });
      } else {
        skipped.push({ ...slot, reason: message });
      }
    }
  }

  return { created, skipped };
}

export async function createAvailabilitySlot(input: {
  date: string;
  startTime: string;
  endTime: string;
}) {
  const { date, startTime, endTime } = input;

  if (!isValidAvailabilityDate(date)) {
    throw new Error('Data inválida. Use o formato yyyy-mm-dd.');
  }
  if (!isValidAvailabilityTime(startTime) || !isValidAvailabilityTime(endTime)) {
    throw new Error('Horário inválido. Use o formato HH:mm.');
  }
  if (!isValidAvailabilityRange(startTime, endTime)) {
    throw new Error('O horário de término deve ser posterior ao início.');
  }

  const db = getFirestoreAdmin();
  const sameDay = await db.collection(WHITELABEL_AVAILABILITY_COLLECTION).where('date', '==', date).get();
  const duplicate = sameDay.docs.some(
    (doc) => doc.data().startTime === startTime && doc.data().endTime === endTime
  );

  if (duplicate) {
    throw new Error('Já existe um horário cadastrado com essa data e intervalo.');
  }

  const docRef = db.collection(WHITELABEL_AVAILABILITY_COLLECTION).doc(
    buildAvailabilityDocId(date, startTime, endTime)
  );
  await docRef.set({
    date,
    startTime,
    endTime,
    status: 'available' satisfies WhiteLabelAvailabilityStatus,
    source: 'manual' satisfies WhiteLabelSlotSource,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const created = await docRef.get();
  return mapAvailabilityDocApi(created.id, created.data()!);
}

export async function updateAvailabilitySlot(input: {
  id: string;
  status?: WhiteLabelAvailabilityStatus;
  delete?: boolean;
}) {
  const db = getFirestoreAdmin();
  const ref = db.collection(WHITELABEL_AVAILABILITY_COLLECTION).doc(input.id);
  let existing = await ref.get();

  if (!existing.exists) {
    const parsed = parseAvailabilityDocId(input.id);
    if (!parsed) {
      throw new Error('Horário não encontrado.');
    }

    if (input.delete) {
      throw new Error('Horário não encontrado.');
    }

    if (!input.status) {
      throw new Error('Nenhuma alteração informada.');
    }

    await ref.set({
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      status: input.status,
      source: 'generated' satisfies WhiteLabelSlotSource,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const created = await ref.get();
    return mapAvailabilityDocApi(created.id, created.data()!);
  }

  const data = existing.data()!;

  if (input.delete) {
    if (data.status === 'reserved') {
      throw new Error('Não é possível remover um horário já reservado.');
    }
    await ref.delete();
    return { deleted: true, id: input.id };
  }

  if (!input.status) {
    throw new Error('Nenhuma alteração informada.');
  }

  if (input.status === 'available' && data.status === 'reserved') {
    throw new Error('Não é possível liberar um horário já reservado.');
  }

  await ref.update({
    status: input.status,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return mapAvailabilityDocApi(updated.id, updated.data()!);
}

export async function attachMeetingToAvailability(input: {
  availabilityId: string;
  googleCalendarEventId: string;
  googleMeetLink: string;
}) {
  const db = getFirestoreAdmin();
  const ref = db.collection(WHITELABEL_AVAILABILITY_COLLECTION).doc(input.availabilityId);
  await ref.update({
    googleCalendarEventId: input.googleCalendarEventId,
    googleMeetLink: input.googleMeetLink,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getAvailabilityById(id: string) {
  const db = getFirestoreAdmin();
  const snap = await db.collection(WHITELABEL_AVAILABILITY_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return mapAvailabilityDoc(snap.id, snap.data()!);
}
