import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  DEFAULT_WHITELABEL_AGENDA_SETTINGS,
  WHITELABEL_AGENDA_SETTINGS_COLLECTION,
  WHITELABEL_AGENDA_SETTINGS_DOC_ID,
} from '@/lib/whiteLabel/agendaDefaults';
import type { WhiteLabelAgendaSettings } from '@/types/whiteLabelAgenda';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

export async function getAgendaSettings(): Promise<WhiteLabelAgendaSettings> {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(WHITELABEL_AGENDA_SETTINGS_COLLECTION)
    .doc(WHITELABEL_AGENDA_SETTINGS_DOC_ID)
    .get();

  if (!snap.exists) {
    return { ...DEFAULT_WHITELABEL_AGENDA_SETTINGS };
  }

  const d = snap.data()!;
  return {
    defaultDurationMinutes: d.defaultDurationMinutes ?? DEFAULT_WHITELABEL_AGENDA_SETTINGS.defaultDurationMinutes,
    bufferMinutes: d.bufferMinutes ?? DEFAULT_WHITELABEL_AGENDA_SETTINGS.bufferMinutes,
    minAdvanceHours: d.minAdvanceHours ?? DEFAULT_WHITELABEL_AGENDA_SETTINGS.minAdvanceHours,
    maxAdvanceDays: d.maxAdvanceDays ?? DEFAULT_WHITELABEL_AGENDA_SETTINGS.maxAdvanceDays,
    allowedDaysMode: d.allowedDaysMode ?? DEFAULT_WHITELABEL_AGENDA_SETTINGS.allowedDaysMode,
    slotGenerationEnabled: d.slotGenerationEnabled ?? DEFAULT_WHITELABEL_AGENDA_SETTINGS.slotGenerationEnabled,
    updatedAt: toIso(d.updatedAt),
  };
}

export async function updateAgendaSettings(
  input: Partial<WhiteLabelAgendaSettings>
): Promise<WhiteLabelAgendaSettings> {
  const db = getFirestoreAdmin();
  const ref = db.collection(WHITELABEL_AGENDA_SETTINGS_COLLECTION).doc(WHITELABEL_AGENDA_SETTINGS_DOC_ID);

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.defaultDurationMinutes !== undefined) update.defaultDurationMinutes = input.defaultDurationMinutes;
  if (input.bufferMinutes !== undefined) update.bufferMinutes = input.bufferMinutes;
  if (input.minAdvanceHours !== undefined) update.minAdvanceHours = input.minAdvanceHours;
  if (input.maxAdvanceDays !== undefined) update.maxAdvanceDays = input.maxAdvanceDays;
  if (input.allowedDaysMode !== undefined) update.allowedDaysMode = input.allowedDaysMode;
  if (input.slotGenerationEnabled !== undefined) update.slotGenerationEnabled = input.slotGenerationEnabled;

  await ref.set(update, { merge: true });
  return getAgendaSettings();
}
