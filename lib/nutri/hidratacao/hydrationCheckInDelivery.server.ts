import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  HYDRATION_CHECKIN_DELIVERIES_COLLECTION,
  hydrationCheckInDeliveryDocId,
  type HydrationCheckInDelivery,
  type HydrationDeliveryChannel,
  type HydrationDeliverySkipReason,
  type HydrationDeliverySource,
  type HydrationDeliveryStatus,
} from '@/lib/nutri/hidratacao/hydrationCheckInAutomation';

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseStatus(value: unknown): HydrationDeliveryStatus {
  if (value === 'pending' || value === 'sent' || value === 'failed' || value === 'skipped') {
    return value;
  }
  return 'pending';
}

function parseSource(value: unknown): HydrationDeliverySource {
  return value === 'manual' ? 'manual' : 'automatic';
}

export function hydrationCheckInDeliveryRef(
  db: Firestore,
  patientId: string,
  allowedDatesKey: string
) {
  return db
    .collection(HYDRATION_CHECKIN_DELIVERIES_COLLECTION)
    .doc(hydrationCheckInDeliveryDocId(patientId, allowedDatesKey));
}

export function deserializeHydrationCheckInDelivery(
  data: Record<string, unknown>
): HydrationCheckInDelivery | null {
  const patientId = String(data.patientId ?? '').trim();
  const allowedDatesKey = String(data.allowedDatesKey ?? '').trim();
  const allowedDates = Array.isArray(data.allowedDates)
    ? data.allowedDates.map((d) => String(d))
    : [];
  if (!patientId || !allowedDatesKey) return null;

  const attemptCount = Number(data.attemptCount);
  return {
    patientId,
    allowedDates,
    allowedDatesKey,
    linkId: typeof data.linkId === 'string' ? data.linkId : undefined,
    channel: (data.channel === 'canal_chat' ? 'canal_chat' : 'canal_chat') as HydrationDeliveryChannel,
    source: parseSource(data.source),
    attemptedAt: toDate(data.attemptedAt) ?? new Date(0),
    sentAt: toDate(data.sentAt),
    status: parseStatus(data.status),
    skipReason: data.skipReason as HydrationDeliverySkipReason | undefined,
    errorCode: typeof data.errorCode === 'string' ? data.errorCode : undefined,
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
    attemptCount: Number.isFinite(attemptCount) && attemptCount > 0 ? attemptCount : 0,
  };
}

export async function loadHydrationCheckInDelivery(
  db: Firestore,
  patientId: string,
  allowedDatesKey: string
): Promise<HydrationCheckInDelivery | null> {
  const snap = await hydrationCheckInDeliveryRef(db, patientId, allowedDatesKey).get();
  if (!snap.exists) return null;
  return deserializeHydrationCheckInDelivery((snap.data() || {}) as Record<string, unknown>);
}

export type UpsertHydrationCheckInDeliveryInput = {
  patientId: string;
  allowedDates: string[];
  allowedDatesKey: string;
  source: HydrationDeliverySource;
  status: HydrationDeliveryStatus;
  channel?: HydrationDeliveryChannel;
  linkId?: string;
  skipReason?: HydrationDeliverySkipReason;
  errorCode?: string;
  errorMessage?: string;
  incrementAttempt?: boolean;
  markSent?: boolean;
};

export async function upsertHydrationCheckInDelivery(
  db: Firestore,
  input: UpsertHydrationCheckInDeliveryInput
): Promise<void> {
  const ref = hydrationCheckInDeliveryRef(db, input.patientId, input.allowedDatesKey);
  const patch: Record<string, unknown> = {
    patientId: input.patientId,
    allowedDates: input.allowedDates,
    allowedDatesKey: input.allowedDatesKey,
    channel: input.channel ?? 'canal_chat',
    source: input.source,
    status: input.status,
    attemptedAt: FieldValue.serverTimestamp(),
  };
  if (input.linkId) patch.linkId = input.linkId;
  if (input.skipReason) patch.skipReason = input.skipReason;
  if (input.errorCode) patch.errorCode = input.errorCode;
  if (input.errorMessage) patch.errorMessage = input.errorMessage;
  if (input.incrementAttempt) patch.attemptCount = FieldValue.increment(1);
  if (input.status === 'pending') {
    patch.skipReason = FieldValue.delete();
  }
  if (input.status === 'skipped') {
    patch.errorCode = FieldValue.delete();
    patch.errorMessage = FieldValue.delete();
  }
  if (input.markSent || input.status === 'sent') {
    patch.sentAt = FieldValue.serverTimestamp();
    patch.skipReason = FieldValue.delete();
    patch.errorCode = FieldValue.delete();
    patch.errorMessage = FieldValue.delete();
  }
  await ref.set(patch, { merge: true });
}
