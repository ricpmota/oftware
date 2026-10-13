import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  DEFAULT_NUTRI_AGENDA_SETTINGS,
  NUTRI_AGENDA_SETTINGS_COLLECTION,
} from '@/lib/nutri/agenda/agendaDefaults';
import { parseNutriConsultaReminderAviso } from '@/lib/nutri/agenda/consultaReminder';
import { ensureWelcomeMessageHasLink } from '@/lib/nutri/agenda/welcomeMessage';
import type { NutriAgendaSettings } from '@/types/nutriAgenda';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function mapSettings(d: FirebaseFirestore.DocumentData | undefined): NutriAgendaSettings {
  const base = DEFAULT_NUTRI_AGENDA_SETTINGS;
  if (!d) return { ...base };

  return {
    defaultDurationMinutes: d.defaultDurationMinutes ?? base.defaultDurationMinutes,
    bufferMinutes: d.bufferMinutes ?? base.bufferMinutes,
    minAdvanceHours: d.minAdvanceHours ?? base.minAdvanceHours,
    maxAdvanceDays: d.maxAdvanceDays ?? base.maxAdvanceDays,
    allowedDaysMode: d.allowedDaysMode ?? base.allowedDaysMode,
    slotGenerationEnabled: asBool(d.slotGenerationEnabled, base.slotGenerationEnabled),
    welcomeMessageTemplate: ensureWelcomeMessageHasLink(
      typeof d.welcomeMessageTemplate === 'string' ? d.welcomeMessageTemplate : base.welcomeMessageTemplate
    ),
    consultaReminderAviso: parseNutriConsultaReminderAviso(
      d.consultaReminderAviso,
      base.consultaReminderAviso
    ),
    updatedAt: toIso(d.updatedAt),
  };
}

export async function getNutriAgendaSettings(nutricionistaId: string): Promise<NutriAgendaSettings> {
  const id = nutricionistaId.trim();
  if (!id) return { ...DEFAULT_NUTRI_AGENDA_SETTINGS };
  const db = getFirestoreAdmin();
  const snap = await db.collection(NUTRI_AGENDA_SETTINGS_COLLECTION).doc(id).get();
  return mapSettings(snap.exists ? snap.data() : undefined);
}

export async function updateNutriAgendaSettings(
  nutricionistaId: string,
  input: Partial<NutriAgendaSettings>
): Promise<NutriAgendaSettings> {
  const id = nutricionistaId.trim();
  if (!id) throw new Error('Nutricionista inválido.');

  const db = getFirestoreAdmin();
  const ref = db.collection(NUTRI_AGENDA_SETTINGS_COLLECTION).doc(id);
  const update: Record<string, unknown> = {
    nutricionistaId: id,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.defaultDurationMinutes !== undefined) update.defaultDurationMinutes = input.defaultDurationMinutes;
  if (input.bufferMinutes !== undefined) update.bufferMinutes = input.bufferMinutes;
  if (input.minAdvanceHours !== undefined) update.minAdvanceHours = input.minAdvanceHours;
  if (input.maxAdvanceDays !== undefined) update.maxAdvanceDays = input.maxAdvanceDays;
  if (input.allowedDaysMode !== undefined) update.allowedDaysMode = input.allowedDaysMode;
  if (input.slotGenerationEnabled !== undefined) update.slotGenerationEnabled = input.slotGenerationEnabled;
  if (input.welcomeMessageTemplate !== undefined) {
    update.welcomeMessageTemplate = ensureWelcomeMessageHasLink(String(input.welcomeMessageTemplate));
  }
  if (input.consultaReminderAviso !== undefined) {
    update.consultaReminderAviso = parseNutriConsultaReminderAviso(
      input.consultaReminderAviso,
      DEFAULT_NUTRI_AGENDA_SETTINGS.consultaReminderAviso
    );
  }

  await ref.set(update, { merge: true });
  return getNutriAgendaSettings(id);
}
