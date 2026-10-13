import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  DEFAULT_MEDICO_AGENDA_SETTINGS,
  MEDICO_AGENDA_SETTINGS_COLLECTION,
} from '@/lib/metaadmin/agenda/agendaDefaults';
import { ensureWelcomeMessageHasLink, parseMedicoConsultaReminderAviso } from '@/lib/metaadmin/agenda/welcomeMessage';
import type { MedicoAgendaSettings } from '@/types/medicoAgenda';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function mapSettings(d: FirebaseFirestore.DocumentData | undefined): MedicoAgendaSettings {
  const base = DEFAULT_MEDICO_AGENDA_SETTINGS;
  if (!d) return { ...base };

  return {
    defaultDurationMinutes: d.defaultDurationMinutes ?? base.defaultDurationMinutes,
    bufferMinutes: d.bufferMinutes ?? base.bufferMinutes,
    minAdvanceHours: d.minAdvanceHours ?? base.minAdvanceHours,
    maxAdvanceDays: d.maxAdvanceDays ?? base.maxAdvanceDays,
    allowedDaysMode: d.allowedDaysMode ?? base.allowedDaysMode,
    slotGenerationEnabled: asBool(d.slotGenerationEnabled, base.slotGenerationEnabled),
    publicBookingEnabled: asBool(d.publicBookingEnabled, base.publicBookingEnabled),
    welcomeMessageTemplate: ensureWelcomeMessageHasLink(
      typeof d.welcomeMessageTemplate === 'string' ? d.welcomeMessageTemplate : base.welcomeMessageTemplate
    ),
    consultaReminderAviso: parseMedicoConsultaReminderAviso(
      d.consultaReminderAviso,
      base.consultaReminderAviso
    ),
    updatedAt: toIso(d.updatedAt),
  };
}

export async function getMedicoAgendaSettings(medicoId: string): Promise<MedicoAgendaSettings> {
  const id = medicoId.trim();
  if (!id) return { ...DEFAULT_MEDICO_AGENDA_SETTINGS };
  const db = getFirestoreAdmin();
  const snap = await db.collection(MEDICO_AGENDA_SETTINGS_COLLECTION).doc(id).get();
  return mapSettings(snap.exists ? snap.data() : undefined);
}

export async function updateMedicoAgendaSettings(
  medicoId: string,
  input: Partial<MedicoAgendaSettings>
): Promise<MedicoAgendaSettings> {
  const id = medicoId.trim();
  if (!id) throw new Error('Médico inválido.');

  const db = getFirestoreAdmin();
  const ref = db.collection(MEDICO_AGENDA_SETTINGS_COLLECTION).doc(id);
  const update: Record<string, unknown> = {
    medicoId: id,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.defaultDurationMinutes !== undefined) update.defaultDurationMinutes = input.defaultDurationMinutes;
  if (input.bufferMinutes !== undefined) update.bufferMinutes = input.bufferMinutes;
  if (input.minAdvanceHours !== undefined) update.minAdvanceHours = input.minAdvanceHours;
  if (input.maxAdvanceDays !== undefined) update.maxAdvanceDays = input.maxAdvanceDays;
  if (input.allowedDaysMode !== undefined) update.allowedDaysMode = input.allowedDaysMode;
  if (input.slotGenerationEnabled !== undefined) update.slotGenerationEnabled = input.slotGenerationEnabled;
  if (input.publicBookingEnabled !== undefined) update.publicBookingEnabled = input.publicBookingEnabled;
  if (input.welcomeMessageTemplate !== undefined) {
    update.welcomeMessageTemplate = ensureWelcomeMessageHasLink(String(input.welcomeMessageTemplate));
  }
  if (input.consultaReminderAviso !== undefined) {
    update.consultaReminderAviso = parseMedicoConsultaReminderAviso(
      input.consultaReminderAviso,
      DEFAULT_MEDICO_AGENDA_SETTINGS.consultaReminderAviso
    );
  }

  await ref.set(update, { merge: true });
  return getMedicoAgendaSettings(id);
}
