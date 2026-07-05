import { Timestamp } from 'firebase-admin/firestore';
import type { WhiteLabelAvailability, WhiteLabelAvailabilityStatus } from '@/types/whiteLabelAvailability';

export const WHITELABEL_AVAILABILITY_COLLECTION = 'whiteLabelAvailability';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidAvailabilityDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00`);
  return !Number.isNaN(parsed.getTime());
}

export function isValidAvailabilityTime(time: string): boolean {
  return TIME_RE.test(time);
}

export function compareAvailabilityTimes(a: string, b: string): number {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return ah * 60 + am - (bh * 60 + bm);
}

export function isValidAvailabilityRange(startTime: string, endTime: string): boolean {
  return compareAvailabilityTimes(endTime, startTime) > 0;
}

export function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

export function mapAvailabilityDoc(
  id: string,
  data: FirebaseFirestore.DocumentData
): WhiteLabelAvailability {
  return {
    id,
    date: data.date || '',
    startTime: data.startTime || '',
    endTime: data.endTime || '',
    status: (data.status as WhiteLabelAvailabilityStatus) || 'available',
    leadId: data.leadId || undefined,
    doctorName: data.doctorName || undefined,
    doctorEmail: data.doctorEmail || undefined,
    doctorPhone: data.doctorPhone || undefined,
    googleCalendarEventId: data.googleCalendarEventId || undefined,
    googleMeetLink: data.googleMeetLink || undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
  };
}

export function mapAvailabilityDocApi(
  id: string,
  data: FirebaseFirestore.DocumentData
) {
  const row = mapAvailabilityDoc(id, data);
  return {
    ...row,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}
