import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getNutriAgendaSettings } from '@/lib/nutri/agenda/agendaSettingsService';
import {
  listAllNutriSlotsFromEngine,
  listNutriAvailableSlotsFromEngine,
} from '@/lib/nutri/agenda/availabilityEngine';
import { nutriSlotDocId } from '@/lib/nutri/agenda/agendaDefaults';
import {
  NUTRI_AVAILABILITY_COLLECTION,
  compareAvailabilityTimes,
  isValidAvailabilityDate,
  isValidAvailabilityRange,
  isValidAvailabilityTime,
  mapNutriAvailabilityDoc,
  mapNutriAvailabilityDocApi,
} from '@/lib/nutri/agenda/availabilityFirestore';
import {
  addDaysToDateKey,
  getBrazilDateKey,
  parseAvailabilityDocId,
  slotKey,
} from '@/lib/whiteLabel/availabilitySlotUtils';
import { createNutriCalendarException, listNutriCalendarExceptions } from '@/lib/nutri/agenda/calendarExceptionsService';
import type { NutriAvailabilityApiRow, NutriAvailabilityStatus, NutriSlotSource } from '@/types/nutriAgenda';

export class NutriSlotUnavailableError extends Error {
  constructor(message = 'Esse horário acabou de ser reservado. Escolha outro horário.') {
    super(message);
    this.name = 'NutriSlotUnavailableError';
  }
}

function sortRows<T extends { date: string; startTime: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || compareAvailabilityTimes(a.startTime, b.startTime)
  );
}

export async function listNutriAvailableSlots(nutricionistaId: string, fromDate?: string) {
  return sortRows(await listNutriAvailableSlotsFromEngine(nutricionistaId, fromDate));
}

export async function listAllNutriAvailabilitySlots(
  nutricionistaId: string,
  fromDate?: string,
  toDate?: string
) {
  const today = fromDate || getBrazilDateKey();
  const end = toDate || addDaysToDateKey(today, 60);

  const engineSlots = await listAllNutriSlotsFromEngine(nutricionistaId, today, end);
  if (engineSlots.length > 0) return sortRows(engineSlots);

  const db = getFirestoreAdmin();
  const snap = await db
    .collection(NUTRI_AVAILABILITY_COLLECTION)
    .where('nutricionistaId', '==', nutricionistaId)
    .get();
  return sortRows(snap.docs.map((doc) => mapNutriAvailabilityDocApi(doc.id, doc.data())));
}

export async function listNutriReservedMeetings(
  nutricionistaId: string,
  fromDate?: string,
  toDate?: string
): Promise<NutriAvailabilityApiRow[]> {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(NUTRI_AVAILABILITY_COLLECTION)
    .where('nutricionistaId', '==', nutricionistaId)
    .where('status', '==', 'reserved')
    .get();
  let rows = snap.docs.map((doc) => mapNutriAvailabilityDocApi(doc.id, doc.data()));
  if (fromDate) rows = rows.filter((r) => r.date >= fromDate);
  if (toDate) rows = rows.filter((r) => r.date <= toDate);
  return sortRows(rows);
}

export async function ensureNutriAvailabilitySlot(input: {
  nutricionistaId: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  source?: NutriSlotSource;
}) {
  const db = getFirestoreAdmin();
  const deterministicId = nutriSlotDocId(input.nutricionistaId, input.date, input.startTime, input.endTime);
  const docId = input.availabilityId || deterministicId;
  const ref = db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(docId);

  const existing = await ref.get();
  if (existing.exists) {
    return mapNutriAvailabilityDoc(existing.id, existing.data()!);
  }

  await ref.set({
    nutricionistaId: input.nutricionistaId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    status: 'available' satisfies NutriAvailabilityStatus,
    source: input.source || 'generated',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const created = await ref.get();
  return mapNutriAvailabilityDoc(created.id, created.data()!);
}

export const MAX_NUTRI_BULK_SLOTS = 1500;
export const MAX_NUTRI_BULK_DATES = 180;

export type CreateNutriSlotsBulkResult = {
  created: NutriAvailabilityApiRow[];
  skipped: { date?: string; startTime: string; endTime: string; reason: string }[];
  dates?: number;
};

export async function createNutriAvailabilitySlotsBulk(
  nutricionistaId: string,
  date: string,
  slots: { startTime: string; endTime: string }[]
): Promise<CreateNutriSlotsBulkResult> {
  return createNutriAvailabilitySlotsForDates(nutricionistaId, [date], slots);
}

export async function createNutriAvailabilitySlotsForDates(
  nutricionistaId: string,
  dates: string[],
  slots: { startTime: string; endTime: string }[]
): Promise<CreateNutriSlotsBulkResult> {
  const ownerId = nutricionistaId.trim();
  const uniqueDates = [...new Set(dates.filter((d) => isValidAvailabilityDate(d)))];
  const validSlots = slots.filter(
    (slot) =>
      isValidAvailabilityTime(slot.startTime) &&
      isValidAvailabilityTime(slot.endTime) &&
      isValidAvailabilityRange(slot.startTime, slot.endTime)
  );

  if (uniqueDates.length === 0) throw new Error('Nenhuma data válida no intervalo.');
  if (validSlots.length === 0) throw new Error('Nenhum horário válido para criar.');

  const total = uniqueDates.length * validSlots.length;
  if (total > MAX_NUTRI_BULK_SLOTS) {
    throw new Error(
      `Este intervalo geraria ${total} horários. O máximo é ${MAX_NUTRI_BULK_SLOTS}. Reduza o período, os dias da semana ou a duração.`
    );
  }

  const db = getFirestoreAdmin();
  const existingSnap = await db
    .collection(NUTRI_AVAILABILITY_COLLECTION)
    .where('nutricionistaId', '==', ownerId)
    .get();
  const existingKeys = new Set(
    existingSnap.docs.map((doc) => {
      const d = doc.data();
      return slotKey(String(d.date || ''), String(d.startTime || ''), String(d.endTime || ''));
    })
  );

  const created: NutriAvailabilityApiRow[] = [];
  const skipped: CreateNutriSlotsBulkResult['skipped'] = [];
  let batch = db.batch();
  let ops = 0;
  const createdAt = FieldValue.serverTimestamp();

  const flush = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const date of uniqueDates) {
    for (const slot of validSlots) {
      const key = slotKey(date, slot.startTime, slot.endTime);
      if (existingKeys.has(key)) {
        skipped.push({ date, ...slot, reason: 'already_exists' });
        continue;
      }
      existingKeys.add(key);
      const id = nutriSlotDocId(ownerId, date, slot.startTime, slot.endTime);
      const ref = db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(id);
      batch.set(ref, {
        nutricionistaId: ownerId,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'available' satisfies NutriAvailabilityStatus,
        source: 'manual' satisfies NutriSlotSource,
        createdAt,
        updatedAt: createdAt,
      });
      ops += 1;
      created.push({
        id,
        nutricionistaId: ownerId,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'available',
        source: 'manual',
        createdAt: null,
        updatedAt: null,
      });
      if (ops >= 400) await flush();
    }
  }

  await flush();
  return { created, skipped, dates: uniqueDates.length };
}

export type DeleteNutriSlotsForDatesResult = {
  deleted: number;
  keptReserved: number;
  blockedRecurring: number;
  datesProcessed: number;
};

export async function deleteNutriAvailabilitySlotsForDates(
  nutricionistaId: string,
  dates: string[],
  options?: { blockGenerated?: boolean; exceptionReason?: string }
): Promise<DeleteNutriSlotsForDatesResult> {
  const ownerId = nutricionistaId.trim();
  const uniqueDates = [...new Set(dates.filter((d) => isValidAvailabilityDate(d)))];
  if (uniqueDates.length === 0) throw new Error('Nenhuma data válida.');
  if (uniqueDates.length > MAX_NUTRI_BULK_DATES) {
    throw new Error(`Selecione no máximo ${MAX_NUTRI_BULK_DATES} datas.`);
  }

  const dateSet = new Set(uniqueDates);
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(NUTRI_AVAILABILITY_COLLECTION)
    .where('nutricionistaId', '==', ownerId)
    .get();

  const toDelete: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  let keptReserved = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!dateSet.has(String(data.date || ''))) continue;
    if (data.status === 'reserved') {
      keptReserved += 1;
      continue;
    }
    toDelete.push(doc);
  }

  let batch = db.batch();
  let ops = 0;
  for (const doc of toDelete) {
    batch.delete(doc.ref);
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  let blockedRecurring = 0;
  if (options?.blockGenerated) {
    const settings = await getNutriAgendaSettings(ownerId);
    if (settings.slotGenerationEnabled) {
      const fromDate = uniqueDates.reduce((a, b) => (a < b ? a : b));
      const exceptions = await listNutriCalendarExceptions(ownerId, fromDate);
      const alreadyBlocked = new Set(
        exceptions.filter((ex) => ex.type === 'blocked').map((ex) => ex.date)
      );
      const reason = options?.exceptionReason || 'Dia removido no calendário';
      for (const date of uniqueDates) {
        if (alreadyBlocked.has(date)) continue;
        await createNutriCalendarException(ownerId, {
          date,
          type: 'blocked',
          reason,
        });
        blockedRecurring += 1;
      }
    }
  }

  return {
    deleted: toDelete.length,
    keptReserved,
    blockedRecurring,
    datesProcessed: uniqueDates.length,
  };
}

export async function deleteNutriAvailabilitySlotsForDay(
  nutricionistaId: string,
  date: string,
  options?: { blockGenerated?: boolean }
): Promise<{ deleted: number; keptReserved: number; blockedRecurring: boolean }> {
  const result = await deleteNutriAvailabilitySlotsForDates(nutricionistaId, [date], {
    blockGenerated: options?.blockGenerated === true,
    exceptionReason: 'Dia removido no calendário',
  });
  return {
    deleted: result.deleted,
    keptReserved: result.keptReserved,
    blockedRecurring: result.blockedRecurring > 0,
  };
}

export async function replaceNutriAvailabilityForDates(
  nutricionistaId: string,
  dates: string[],
  slots: { startTime: string; endTime: string }[]
) {
  const deleted = await deleteNutriAvailabilitySlotsForDates(nutricionistaId, dates, {
    blockGenerated: true,
    exceptionReason: 'Horários substituídos em massa no resumo',
  });
  const created = await createNutriAvailabilitySlotsForDates(nutricionistaId, dates, slots);
  return {
    ...deleted,
    created: created.created.length,
    skipped: created.skipped,
  };
}

export async function createNutriAvailabilitySlot(
  nutricionistaId: string,
  input: { date: string; startTime: string; endTime: string }
) {
  const { date, startTime, endTime } = input;
  const ownerId = nutricionistaId.trim();

  if (!isValidAvailabilityDate(date)) throw new Error('Data inválida. Use o formato yyyy-mm-dd.');
  if (!isValidAvailabilityTime(startTime) || !isValidAvailabilityTime(endTime)) {
    throw new Error('Horário inválido. Use o formato HH:mm.');
  }
  if (!isValidAvailabilityRange(startTime, endTime)) {
    throw new Error('O horário de término deve ser posterior ao início.');
  }

  const db = getFirestoreAdmin();
  const sameDay = await db
    .collection(NUTRI_AVAILABILITY_COLLECTION)
    .where('nutricionistaId', '==', ownerId)
    .where('date', '==', date)
    .get();
  const duplicate = sameDay.docs.some(
    (doc) => doc.data().startTime === startTime && doc.data().endTime === endTime
  );
  if (duplicate) {
    throw new Error('Já existe um horário cadastrado com essa data e intervalo.');
  }

  const docRef = db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(nutriSlotDocId(ownerId, date, startTime, endTime));
  await docRef.set({
    nutricionistaId: ownerId,
    date,
    startTime,
    endTime,
    status: 'available' satisfies NutriAvailabilityStatus,
    source: 'manual' satisfies NutriSlotSource,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const created = await docRef.get();
  return mapNutriAvailabilityDocApi(created.id, created.data()!);
}

export async function updateNutriAvailabilitySlot(input: {
  nutricionistaId: string;
  id: string;
  status?: NutriAvailabilityStatus;
  delete?: boolean;
}) {
  const db = getFirestoreAdmin();
  const ref = db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(input.id);
  const existing = await ref.get();
  const ownerId = input.nutricionistaId.trim();

  if (!existing.exists) {
    const suffix = input.id.includes('__') ? input.id.split('__')[1] : input.id;
    const parsed = parseAvailabilityDocId(suffix || '');
    if (!parsed || input.delete || !input.status) {
      throw new Error('Horário não encontrado.');
    }

    await ref.set({
      nutricionistaId: ownerId,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      status: input.status,
      source: 'generated' satisfies NutriSlotSource,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const created = await ref.get();
    return mapNutriAvailabilityDocApi(created.id, created.data()!);
  }

  const data = existing.data()!;
  if (String(data.nutricionistaId || '') !== ownerId) {
    throw new Error('Horário não encontrado.');
  }

  if (input.delete) {
    if (data.status === 'reserved') {
      throw new Error('Não é possível remover um horário já reservado.');
    }
    await ref.delete();
    return { deleted: true, id: input.id };
  }

  if (!input.status) throw new Error('Nenhuma alteração informada.');
  if (input.status === 'available' && data.status === 'reserved') {
    throw new Error('Não é possível liberar um horário já reservado.');
  }

  await ref.update({
    status: input.status,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return mapNutriAvailabilityDocApi(updated.id, updated.data()!);
}

export async function getNutriAvailabilityById(id: string) {
  const db = getFirestoreAdmin();
  const snap = await db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return mapNutriAvailabilityDoc(snap.id, snap.data()!);
}
