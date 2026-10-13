import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getMedicoAgendaSettings } from '@/lib/metaadmin/agenda/agendaSettingsService';
import {
  listAllMedicoSlotsFromEngine,
  listMedicoAvailableSlotsFromEngine,
} from '@/lib/metaadmin/agenda/availabilityEngine';
import { medicoSlotDocId } from '@/lib/metaadmin/agenda/agendaDefaults';
import {
  MEDICO_AVAILABILITY_COLLECTION,
  compareAvailabilityTimes,
  isValidAvailabilityDate,
  isValidAvailabilityRange,
  isValidAvailabilityTime,
  mapMedicoAvailabilityDoc,
  mapMedicoAvailabilityDocApi,
} from '@/lib/metaadmin/agenda/availabilityFirestore';
import {
  addDaysToDateKey,
  getBrazilDateKey,
  parseAvailabilityDocId,
  slotKey,
} from '@/lib/whiteLabel/availabilitySlotUtils';
import {
  createMedicoCalendarException,
  listMedicoCalendarExceptions,
} from '@/lib/metaadmin/agenda/calendarExceptionsService';
import type { MedicoAvailabilityApiRow, MedicoAvailabilityStatus, MedicoSlotSource } from '@/types/medicoAgenda';

export class MedicoSlotUnavailableError extends Error {
  constructor(message = 'Esse horário acabou de ser reservado. Escolha outro horário.') {
    super(message);
    this.name = 'MedicoSlotUnavailableError';
  }
}

function sortRows<T extends { date: string; startTime: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || compareAvailabilityTimes(a.startTime, b.startTime)
  );
}

export async function listMedicoAvailableSlots(medicoId: string, fromDate?: string) {
  return sortRows(await listMedicoAvailableSlotsFromEngine(medicoId, fromDate));
}

export async function listAllMedicoAvailabilitySlots(
  medicoId: string,
  fromDate?: string,
  toDate?: string
) {
  const today = fromDate || getBrazilDateKey();
  const end = toDate || addDaysToDateKey(today, 60);

  const engineSlots = await listAllMedicoSlotsFromEngine(medicoId, today, end);
  if (engineSlots.length > 0) return sortRows(engineSlots);

  const db = getFirestoreAdmin();
  const snap = await db.collection(MEDICO_AVAILABILITY_COLLECTION).where('medicoId', '==', medicoId).get();
  return sortRows(snap.docs.map((doc) => mapMedicoAvailabilityDocApi(doc.id, doc.data())));
}

export async function listMedicoReservedMeetings(
  medicoId: string,
  fromDate?: string,
  toDate?: string
): Promise<MedicoAvailabilityApiRow[]> {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(MEDICO_AVAILABILITY_COLLECTION)
    .where('medicoId', '==', medicoId)
    .get();
  let rows = snap.docs
    .map((doc) => mapMedicoAvailabilityDocApi(doc.id, doc.data()))
    .filter((r) => r.status === 'reserved');
  if (fromDate) rows = rows.filter((r) => r.date >= fromDate);
  if (toDate) rows = rows.filter((r) => r.date <= toDate);
  return sortRows(rows);
}

export async function ensureMedicoAvailabilitySlot(input: {
  medicoId: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  source?: MedicoSlotSource;
}) {
  const db = getFirestoreAdmin();
  const deterministicId = medicoSlotDocId(input.medicoId, input.date, input.startTime, input.endTime);
  const docId = input.availabilityId || deterministicId;
  const ref = db.collection(MEDICO_AVAILABILITY_COLLECTION).doc(docId);

  const existing = await ref.get();
  if (existing.exists) {
    return mapMedicoAvailabilityDoc(existing.id, existing.data()!);
  }

  await ref.set({
    medicoId: input.medicoId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    status: 'available' satisfies MedicoAvailabilityStatus,
    source: input.source || 'generated',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const created = await ref.get();
  return mapMedicoAvailabilityDoc(created.id, created.data()!);
}

export const MAX_MEDICO_BULK_SLOTS = 1500;
export const MAX_MEDICO_BULK_DATES = 180;

export type CreateMedicoSlotsBulkResult = {
  created: MedicoAvailabilityApiRow[];
  skipped: { date?: string; startTime: string; endTime: string; reason: string }[];
  dates?: number;
};

export async function createMedicoAvailabilitySlotsForDates(
  medicoId: string,
  dates: string[],
  slots: { startTime: string; endTime: string }[]
): Promise<CreateMedicoSlotsBulkResult> {
  const ownerId = medicoId.trim();
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
  if (total > MAX_MEDICO_BULK_SLOTS) {
    throw new Error(
      `Este intervalo geraria ${total} horários. O máximo é ${MAX_MEDICO_BULK_SLOTS}. Reduza o período, os dias da semana ou a duração.`
    );
  }

  const db = getFirestoreAdmin();
  const existingSnap = await db.collection(MEDICO_AVAILABILITY_COLLECTION).where('medicoId', '==', ownerId).get();
  const existingKeys = new Set(
    existingSnap.docs.map((doc) => {
      const d = doc.data();
      return slotKey(String(d.date || ''), String(d.startTime || ''), String(d.endTime || ''));
    })
  );

  const created: MedicoAvailabilityApiRow[] = [];
  const skipped: CreateMedicoSlotsBulkResult['skipped'] = [];
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
      const id = medicoSlotDocId(ownerId, date, slot.startTime, slot.endTime);
      const ref = db.collection(MEDICO_AVAILABILITY_COLLECTION).doc(id);
      batch.set(ref, {
        medicoId: ownerId,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'available' satisfies MedicoAvailabilityStatus,
        source: 'manual' satisfies MedicoSlotSource,
        createdAt,
        updatedAt: createdAt,
      });
      ops += 1;
      created.push({
        id,
        medicoId: ownerId,
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

export type DeleteMedicoSlotsForDatesResult = {
  deleted: number;
  keptReserved: number;
  blockedRecurring: number;
  datesProcessed: number;
};

export async function deleteMedicoAvailabilitySlotsForDates(
  medicoId: string,
  dates: string[],
  options?: { blockGenerated?: boolean; exceptionReason?: string }
): Promise<DeleteMedicoSlotsForDatesResult> {
  const ownerId = medicoId.trim();
  const uniqueDates = [...new Set(dates.filter((d) => isValidAvailabilityDate(d)))];
  if (uniqueDates.length === 0) throw new Error('Nenhuma data válida.');
  if (uniqueDates.length > MAX_MEDICO_BULK_DATES) {
    throw new Error(`Selecione no máximo ${MAX_MEDICO_BULK_DATES} datas.`);
  }

  const dateSet = new Set(uniqueDates);
  const db = getFirestoreAdmin();
  const snap = await db.collection(MEDICO_AVAILABILITY_COLLECTION).where('medicoId', '==', ownerId).get();

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
    const settings = await getMedicoAgendaSettings(ownerId);
    if (settings.slotGenerationEnabled) {
      const fromDate = uniqueDates.reduce((a, b) => (a < b ? a : b));
      const exceptions = await listMedicoCalendarExceptions(ownerId, fromDate);
      const alreadyBlocked = new Set(exceptions.filter((ex) => ex.type === 'blocked').map((ex) => ex.date));
      const reason = options?.exceptionReason || 'Dia removido no calendário';
      for (const date of uniqueDates) {
        if (alreadyBlocked.has(date)) continue;
        await createMedicoCalendarException(ownerId, {
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

export async function deleteMedicoAvailabilitySlotsForDay(
  medicoId: string,
  date: string,
  options?: { blockGenerated?: boolean }
): Promise<{ deleted: number; keptReserved: number; blockedRecurring: boolean }> {
  const result = await deleteMedicoAvailabilitySlotsForDates(medicoId, [date], {
    blockGenerated: options?.blockGenerated === true,
    exceptionReason: 'Dia removido no calendário',
  });
  return {
    deleted: result.deleted,
    keptReserved: result.keptReserved,
    blockedRecurring: result.blockedRecurring > 0,
  };
}

export async function replaceMedicoAvailabilityForDates(
  medicoId: string,
  dates: string[],
  slots: { startTime: string; endTime: string }[]
) {
  const deleted = await deleteMedicoAvailabilitySlotsForDates(medicoId, dates, {
    blockGenerated: true,
    exceptionReason: 'Horários substituídos em massa no resumo',
  });
  const created = await createMedicoAvailabilitySlotsForDates(medicoId, dates, slots);
  return {
    ...deleted,
    created: created.created.length,
    skipped: created.skipped,
  };
}

export async function updateMedicoAvailabilitySlot(input: {
  medicoId: string;
  id: string;
  status?: MedicoAvailabilityStatus;
  delete?: boolean;
}) {
  const db = getFirestoreAdmin();
  const ref = db.collection(MEDICO_AVAILABILITY_COLLECTION).doc(input.id);
  const existing = await ref.get();
  const ownerId = input.medicoId.trim();

  if (!existing.exists) {
    const suffix = input.id.includes('__') ? input.id.split('__')[1] : input.id;
    const parsed = parseAvailabilityDocId(suffix || '');
    if (!parsed || input.delete || !input.status) {
      throw new Error('Horário não encontrado.');
    }

    await ref.set({
      medicoId: ownerId,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      status: input.status,
      source: 'generated' satisfies MedicoSlotSource,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const created = await ref.get();
    return mapMedicoAvailabilityDocApi(created.id, created.data()!);
  }

  const data = existing.data()!;
  if (String(data.medicoId || '') !== ownerId) {
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
  return mapMedicoAvailabilityDocApi(updated.id, updated.data()!);
}
