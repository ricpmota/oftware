import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { PERSONAL_CALENDAR_EXCEPTIONS_COLLECTION } from '@/lib/personal/agenda/agendaDefaults';
import {
  isValidAvailabilityDate,
  isValidAvailabilityRange,
  isValidAvailabilityTime,
} from '@/lib/personal/agenda/availabilityFirestore';
import type { PersonalCalendarException } from '@/types/personalAgenda';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function mapException(id: string, data: FirebaseFirestore.DocumentData): PersonalCalendarException {
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

export async function listPersonalCalendarExceptions(
  personalTrainerId: string,
  fromDate?: string
): Promise<PersonalCalendarException[]> {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(PERSONAL_CALENDAR_EXCEPTIONS_COLLECTION)
    .where('personalTrainerId', '==', personalTrainerId.trim())
    .get();
  let rows = snap.docs.map((doc) => mapException(doc.id, doc.data()));
  if (fromDate && isValidAvailabilityDate(fromDate)) {
    rows = rows.filter((row) => row.date >= fromDate);
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export async function createPersonalCalendarException(
  personalTrainerId: string,
  input: {
    date: string;
    type: 'blocked' | 'extra';
    reason?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<PersonalCalendarException> {
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
  const docRef = await db.collection(PERSONAL_CALENDAR_EXCEPTIONS_COLLECTION).add({
    personalTrainerId: personalTrainerId.trim(),
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

export async function deletePersonalCalendarException(
  personalTrainerId: string,
  id: string
): Promise<void> {
  const db = getFirestoreAdmin();
  const ref = db.collection(PERSONAL_CALENDAR_EXCEPTIONS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Exceção não encontrada.');
  if (String(snap.data()?.personalTrainerId || '') !== personalTrainerId.trim()) {
    throw new Error('Exceção não encontrada.');
  }
  await ref.delete();
}
