import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { parseHorarioBrasil } from '@/lib/time/brasilTimezone';
import {
  HYDRATION_CHECKIN_TIMEZONE,
  HYDRATION_REMINDER_ENABLED_FIELD,
  HYDRATION_REMINDER_TIME_FIELD,
  HYDRATION_REMINDER_TIMEZONE_FIELD,
  HYDRATION_REMINDER_UPDATED_AT_FIELD,
  HYDRATION_REMINDER_UPDATED_BY_TYPE_FIELD,
  HYDRATION_REMINDER_UPDATED_BY_USER_FIELD,
  parseHydrationCheckInReminderSettings,
  previewHydrationCheckInNextSend,
  type HydrationCheckInReminderSettings,
  type HydrationNextSendPreview,
  type HydrationReminderUpdatedByType,
} from '@/lib/nutri/hidratacao/hydrationCheckInSettings';
import { getHydrationCheckInCycleDates } from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import { loadHydrationRecordAdmin } from '@/lib/nutri/hidratacao/hydrationPersist.server';
import { loadHydrationCheckInDelivery } from '@/lib/nutri/hidratacao/hydrationCheckInDelivery.server';
import { hydrationYmdInTimeZone } from '@/lib/nutri/hidratacao/hydrationMath';

export async function loadHydrationCheckInReminderSettingsAdmin(
  db: Firestore,
  patientId: string
): Promise<HydrationCheckInReminderSettings> {
  const snap = await db.collection('pacientes_completos').doc(patientId).get();
  return parseHydrationCheckInReminderSettings(
    snap.exists ? ((snap.data() || {}) as Record<string, unknown>) : {}
  );
}

export async function saveHydrationCheckInReminderSettingsAdmin(
  db: Firestore,
  input: {
    patientId: string;
    enabled: boolean;
    time: string;
    updatedByUserId: string;
    updatedByType: HydrationReminderUpdatedByType;
  }
): Promise<HydrationCheckInReminderSettings> {
  const time = parseHorarioBrasil(input.time);
  if (!time) throw new Error('Horário inválido. Use HH:mm.');

  const ref = db.collection('pacientes_completos').doc(input.patientId);
  await ref.set(
    {
      [HYDRATION_REMINDER_ENABLED_FIELD]: input.enabled,
      [HYDRATION_REMINDER_TIME_FIELD]: time,
      [HYDRATION_REMINDER_TIMEZONE_FIELD]: HYDRATION_CHECKIN_TIMEZONE,
      [HYDRATION_REMINDER_UPDATED_AT_FIELD]: FieldValue.serverTimestamp(),
      [HYDRATION_REMINDER_UPDATED_BY_USER_FIELD]: input.updatedByUserId,
      [HYDRATION_REMINDER_UPDATED_BY_TYPE_FIELD]: input.updatedByType,
    },
    { merge: true }
  );

  return {
    enabled: input.enabled,
    time,
    timezone: HYDRATION_CHECKIN_TIMEZONE,
    configured: true,
    updatedAt: new Date(),
    updatedByUserId: input.updatedByUserId,
    updatedByType: input.updatedByType,
  };
}

export async function buildHydrationCheckInSettingsPreview(
  db: Firestore,
  patientId: string,
  settings: HydrationCheckInReminderSettings,
  now: Date = new Date()
): Promise<{
  allowedDates: string[];
  allowedDatesKey: string;
  pendingCount: number;
  alreadySentThisCycle: boolean;
  nextSend: HydrationNextSendPreview;
}> {
  const cycle = getHydrationCheckInCycleDates(now);
  let pendingCount = 0;
  for (const date of cycle.allowedDates) {
    const record = await loadHydrationRecordAdmin(db, patientId, date);
    if (!record) pendingCount += 1;
  }
  const delivery = await loadHydrationCheckInDelivery(db, patientId, cycle.allowedDatesKey);
  const alreadySentThisCycle = delivery?.status === 'sent';
  return {
    allowedDates: cycle.allowedDates,
    allowedDatesKey: cycle.allowedDatesKey,
    pendingCount,
    alreadySentThisCycle,
    nextSend: previewHydrationCheckInNextSend({
      enabled: settings.enabled,
      time: settings.time,
      todayYmd: hydrationYmdInTimeZone(now),
      pendingCount,
      alreadySentThisCycle,
    }),
  };
}
