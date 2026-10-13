import { Timestamp } from 'firebase-admin/firestore';
import { MEDICO_AVAILABILITY_COLLECTION } from '@/lib/metaadmin/agenda/agendaDefaults';
import type { MedicoAvailability, MedicoAvailabilityApiRow, MedicoAvailabilityStatus } from '@/types/medicoAgenda';

export { MEDICO_AVAILABILITY_COLLECTION };

export {
  compareAvailabilityTimes,
  isValidAvailabilityDate,
  isValidAvailabilityRange,
  isValidAvailabilityTime,
} from '@/lib/whiteLabel/availabilityFirestore';

function asDateKey(value: unknown): string {
  if (typeof value === 'string') {
    const day = value.trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
  }
  return '';
}

function asTimeKey(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

export function mapMedicoAvailabilityDoc(
  id: string,
  data: FirebaseFirestore.DocumentData
): MedicoAvailability {
  return {
    id,
    medicoId: String(data.medicoId || ''),
    date: asDateKey(data.date),
    startTime: asTimeKey(data.startTime) || String(data.startTime || ''),
    endTime: asTimeKey(data.endTime) || String(data.endTime || ''),
    status: (data.status as MedicoAvailabilityStatus) || 'available',
    source: data.source || undefined,
    pacienteId: data.pacienteId || undefined,
    pacienteNome: data.pacienteNome || undefined,
    pacienteEmail: data.pacienteEmail || undefined,
    pacientePhone: data.pacientePhone || undefined,
    reminderLembreteId:
      typeof data.reminderLembreteId === 'string' && data.reminderLembreteId.trim()
        ? data.reminderLembreteId.trim()
        : undefined,
    patientReminderLembreteId:
      typeof data.patientReminderLembreteId === 'string' && data.patientReminderLembreteId.trim()
        ? data.patientReminderLembreteId.trim()
        : undefined,
    observacoes:
      typeof data.observacoes === 'string' && data.observacoes.trim()
        ? data.observacoes.trim()
        : undefined,
    realizada: data.realizada === true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function mapMedicoAvailabilityDocApi(
  id: string,
  data: FirebaseFirestore.DocumentData
): MedicoAvailabilityApiRow {
  const row = mapMedicoAvailabilityDoc(id, data);
  return {
    ...row,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}
