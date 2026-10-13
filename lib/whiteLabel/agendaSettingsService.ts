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

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function mapSettings(d: FirebaseFirestore.DocumentData | undefined): WhiteLabelAgendaSettings {
  const base = DEFAULT_WHITELABEL_AGENDA_SETTINGS;
  if (!d) return { ...base };

  return {
    defaultDurationMinutes: d.defaultDurationMinutes ?? base.defaultDurationMinutes,
    bufferMinutes: d.bufferMinutes ?? base.bufferMinutes,
    minAdvanceHours: d.minAdvanceHours ?? base.minAdvanceHours,
    maxAdvanceDays: d.maxAdvanceDays ?? base.maxAdvanceDays,
    allowedDaysMode: d.allowedDaysMode ?? base.allowedDaysMode,
    slotGenerationEnabled: asBool(d.slotGenerationEnabled, base.slotGenerationEnabled),
    whatsappConfirmacaoEnabled: asBool(d.whatsappConfirmacaoEnabled, base.whatsappConfirmacaoEnabled),
    whatsappSenderDoctorEmail: asString(d.whatsappSenderDoctorEmail, base.whatsappSenderDoctorEmail),
    whatsappNotifyLead: asBool(d.whatsappNotifyLead, base.whatsappNotifyLead),
    whatsappNotifyResponsavel: asBool(d.whatsappNotifyResponsavel, base.whatsappNotifyResponsavel),
    whatsappResponsavelNome: asString(d.whatsappResponsavelNome, base.whatsappResponsavelNome),
    whatsappResponsavelEmail: asString(d.whatsappResponsavelEmail, base.whatsappResponsavelEmail),
    whatsappResponsavelPhone: asString(d.whatsappResponsavelPhone, base.whatsappResponsavelPhone),
    updatedAt: toIso(d.updatedAt),
  };
}

function needsWhatsAppDefaultsPersist(d: FirebaseFirestore.DocumentData | undefined): boolean {
  if (!d) return true;
  const keys = [
    'whatsappConfirmacaoEnabled',
    'whatsappSenderDoctorEmail',
    'whatsappNotifyLead',
    'whatsappNotifyResponsavel',
    'whatsappResponsavelNome',
    'whatsappResponsavelEmail',
    'whatsappResponsavelPhone',
  ] as const;
  return keys.some((key) => d[key] === undefined);
}

/** Garante que os alertas WhatsApp (lead + responsável) fiquem persistidos no Firestore. */
export async function ensureAgendaWhatsAppSettings(): Promise<WhiteLabelAgendaSettings> {
  const db = getFirestoreAdmin();
  const ref = db.collection(WHITELABEL_AGENDA_SETTINGS_COLLECTION).doc(WHITELABEL_AGENDA_SETTINGS_DOC_ID);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : undefined;

  if (!needsWhatsAppDefaultsPersist(data)) {
    return mapSettings(data);
  }

  const mapped = mapSettings(data);
  await ref.set(
    {
      whatsappConfirmacaoEnabled: mapped.whatsappConfirmacaoEnabled,
      whatsappSenderDoctorEmail: mapped.whatsappSenderDoctorEmail,
      whatsappNotifyLead: mapped.whatsappNotifyLead,
      whatsappNotifyResponsavel: mapped.whatsappNotifyResponsavel,
      whatsappResponsavelNome: mapped.whatsappResponsavelNome,
      whatsappResponsavelEmail: mapped.whatsappResponsavelEmail,
      whatsappResponsavelPhone: mapped.whatsappResponsavelPhone,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return getAgendaSettings();
}

export async function getAgendaSettings(): Promise<WhiteLabelAgendaSettings> {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(WHITELABEL_AGENDA_SETTINGS_COLLECTION)
    .doc(WHITELABEL_AGENDA_SETTINGS_DOC_ID)
    .get();

  return mapSettings(snap.exists ? snap.data() : undefined);
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
  if (input.whatsappConfirmacaoEnabled !== undefined) {
    update.whatsappConfirmacaoEnabled = Boolean(input.whatsappConfirmacaoEnabled);
  }
  if (input.whatsappSenderDoctorEmail !== undefined) {
    update.whatsappSenderDoctorEmail = String(input.whatsappSenderDoctorEmail).trim().toLowerCase();
  }
  if (input.whatsappNotifyLead !== undefined) update.whatsappNotifyLead = Boolean(input.whatsappNotifyLead);
  if (input.whatsappNotifyResponsavel !== undefined) {
    update.whatsappNotifyResponsavel = Boolean(input.whatsappNotifyResponsavel);
  }
  if (input.whatsappResponsavelNome !== undefined) {
    update.whatsappResponsavelNome = String(input.whatsappResponsavelNome).trim();
  }
  if (input.whatsappResponsavelEmail !== undefined) {
    update.whatsappResponsavelEmail = String(input.whatsappResponsavelEmail).trim().toLowerCase();
  }
  if (input.whatsappResponsavelPhone !== undefined) {
    update.whatsappResponsavelPhone = String(input.whatsappResponsavelPhone).replace(/\D/g, '');
  }

  await ref.set(update, { merge: true });
  return getAgendaSettings();
}
