import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { MEDICO_CALENDAR_EXCEPTIONS_COLLECTION } from '@/lib/metaadmin/agenda/agendaDefaults';
import {
  isValidAvailabilityDate,
  isValidAvailabilityRange,
  isValidAvailabilityTime,
} from '@/lib/metaadmin/agenda/availabilityFirestore';
import type { MedicoCalendarException } from '@/types/medicoAgenda';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function mapException(id: string, data: FirebaseFirestore.DocumentData): MedicoCalendarException {
  return {
    id,
    date: data.date || '',
    type: data.type === 'extra' ? 'extra' : 'blocked',
    reason: data.reason || undefined,
    startTime: data.startTime || undefined,
    endTime: data.endTime || undefined,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function listMedicoCalendarExceptions(
  medicoId: string,
  fromDate?: string
): Promise<MedicoCalendarException[]> {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(MEDICO_CALENDAR_EXCEPTIONS_COLLECTION)
    .where('medicoId', '==', medicoId.trim())
    .get();
  let rows = snap.docs.map((doc) => mapException(doc.id, doc.data()));
  if (fromDate && isValidAvailabilityDate(fromDate)) {
    rows = rows.filter((row) => row.date >= fromDate);
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export async function createMedicoCalendarException(
  medicoId: string,
  input: {
    date: string;
    type: 'blocked' | 'extra';
    reason?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<MedicoCalendarException> {
  if (!isValidAvailabilityDate(input.date)) {
    throw new Error('Data inválida.');
  }

  if (input.type === 'extra') {
    if (!input.startTime || !input.endTime) {
      throw new Error('Horários de início e fim são obrigatórios para exceções extras.');
    }
    if (!isValidAvailabilityTime(input.startTime) || !isValidAvailabilityTime(input.endTime)) {
      throw new Error('Horário inválido.');
    }
    if (!isValidAvailabilityRange(input.startTime, input.endTime)) {
      throw new Error('Período extra inválido.');
    }
  }

  const db = getFirestoreAdmin();
  const docRef = await db.collection(MEDICO_CALENDAR_EXCEPTIONS_COLLECTION).add({
    medicoId: medicoId.trim(),
    date: input.date,
    type: input.type,
    reason: input.reason?.trim() || '',
    startTime: input.startTime || null,
    endTime: input.endTime || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const saved = await docRef.get();
  return mapException(saved.id, saved.data()!);
}

export async function deleteMedicoCalendarException(medicoId: string, id: string): Promise<void> {
  const db = getFirestoreAdmin();
  const ref = db.collection(MEDICO_CALENDAR_EXCEPTIONS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Exceção não encontrada.');
  if (String(snap.data()?.medicoId || '') !== medicoId.trim()) {
    throw new Error('Exceção não encontrada.');
  }
  await ref.delete();
}
