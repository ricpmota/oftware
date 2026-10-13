import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { getNutriAgendaSettings } from '@/lib/nutri/agenda/agendaSettingsService';
import { NUTRI_AVAILABILITY_COLLECTION } from '@/lib/nutri/agenda/agendaDefaults';
import {
  buildNutriConsultaCancelamentoPacienteTexto,
  buildNutriConsultaConfirmacaoPacienteTexto,
  buildNutriConsultaLembretePacienteTexto,
  buildNutriConsultaReminderTexto,
  buildNutriConsultaRemarcacaoPacienteTexto,
} from '@/lib/nutri/agenda/consultaReminder';
import { buildLembreteWhatsappNotifyFields } from '@/lib/lembrete/lembreteWhatsappNotify';
import { resolveWhatsappOwnerForProfessional } from '@/lib/server/whatsappProfessionalOwner.server';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import {
  resolveLegacyBrazilWhatsappPhone,
  tryResolvePhoneFromPacienteDoc,
} from '@/lib/whatsapp/resolveInternationalPhone';
import {
  telefoneAvisoWriteFieldsFromProfessional,
  tryResolvePhoneFromProfessionalDoc,
} from '@/lib/whatsapp/resolveProfessionalPhone';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';
import {
  NUTRI_CONSULTA_LEMBRETE_ORIGEM,
  NUTRI_CONSULTA_PACIENTE_LEMBRETE_ORIGEM,
} from '@/types/nutriAgenda';

const PATIENT_REMINDER_TOO_SOON_MS = 5 * 60_000;

function tryLegacyPhone(raw: string): string | null {
  try {
    return resolveLegacyBrazilWhatsappPhone(raw);
  } catch {
    return null;
  }
}

async function resolveNutriNome(nutricionistaId: string): Promise<string> {
  const snap = await getFirestoreAdmin().collection(COL_NUTRICIONISTAS).doc(nutricionistaId).get();
  return String(snap.data()?.nome || '').trim() || 'Nutricionista';
}

async function resolvePacienteWhatsappPhone(
  pacienteId: string,
  fallback?: string
): Promise<string | null> {
  const id = pacienteId.trim();
  if (id) {
    const db = getFirestoreAdmin();
    const completo = await db.collection('pacientes_completos').doc(id).get();
    if (completo.exists) {
      const phone = tryResolvePhoneFromPacienteDoc(completo.data() as Record<string, unknown>);
      if (phone) return phone;
    }
    const legado = await db.collection('pacientes').doc(id).get();
    if (legado.exists) {
      const phone = tryResolvePhoneFromPacienteDoc(legado.data() as Record<string, unknown>);
      if (phone) return phone;
    }
  }
  return fallback?.trim() ? tryLegacyPhone(fallback) : null;
}

async function resolveNutriAvisoFields(nutricionistaId: string): Promise<{
  telefoneAviso: string;
  telefoneAvisoDdi?: string;
  telefoneAvisoPais?: string;
} | null> {
  const db = getFirestoreAdmin();
  const snap = await db.collection(COL_NUTRICIONISTAS).doc(nutricionistaId).get();
  const fromProfile = telefoneAvisoWriteFieldsFromProfessional(
    (snap.data() || {}) as Record<string, unknown>,
  );
  if (fromProfile?.telefoneAviso) return fromProfile;

  const resolved = await resolveWhatsappOwnerForProfessional(nutricionistaId, 'nutricionista');
  if (!resolved?.doctorId) return null;
  const connection = await getWhatsappConnectionByDoctor(resolved.doctorId);
  const fromWhatsapp = tryResolvePhoneFromProfessionalDoc({
    telefone: connection?.phone,
  });
  return fromWhatsapp ? { telefoneAviso: fromWhatsapp } : null;
}

/**
 * Cria o lembrete que o cron do Canal Chat usa para avisar a nutricionista
 * da consulta agendada. Idempotente por `reminderLembreteId` no slot.
 */
export async function scheduleNutriConsultaReminder(input: {
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<{ lembreteId: string | null; skipped?: string }> {
  const slotRef = getFirestoreAdmin()
    .collection(NUTRI_AVAILABILITY_COLLECTION)
    .doc(input.availabilityId);
  const slotSnap = await slotRef.get();
  const existingId =
    typeof slotSnap.data()?.reminderLembreteId === 'string'
      ? slotSnap.data()!.reminderLembreteId.trim()
      : '';
  if (existingId) {
    return { lembreteId: existingId, skipped: 'already_scheduled' };
  }

  const settings = await getNutriAgendaSettings(input.nutricionistaId);
  const avisoWhatsApp = settings.consultaReminderAviso;
  const avisoFields = await resolveNutriAvisoFields(input.nutricionistaId);
  const notify = buildLembreteWhatsappNotifyFields({
    data: input.date,
    horario: input.startTime,
    avisoWhatsApp,
  });

  const payload: Record<string, unknown> = {
    medicoId: null,
    nutricionistaId: input.nutricionistaId,
    personalTrainerId: null,
    pacienteId: input.pacienteId,
    pacienteNome: input.pacienteNome,
    data: input.date,
    texto: buildNutriConsultaReminderTexto({
      pacienteNome: input.pacienteNome,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    }),
    tag: 'Consulta',
    origem: NUTRI_CONSULTA_LEMBRETE_ORIGEM,
    concluido: false,
    criadoEm: FieldValue.serverTimestamp(),
    notificarPaciente: false,
    avisoWhatsApp: notify.avisoWhatsApp ?? avisoWhatsApp,
    whatsappNotifyStatus: notify.whatsappNotifyStatus ?? 'pending',
  };

  if (notify.horario) payload.horario = notify.horario;
  if (notify.notificarEm) payload.notificarEm = Timestamp.fromDate(notify.notificarEm);

  if (avisoFields?.telefoneAviso && notify.avisoWhatsApp !== 'disabled') {
    payload.telefoneAviso = avisoFields.telefoneAviso;
    if (avisoFields.telefoneAvisoDdi) payload.telefoneAvisoDdi = avisoFields.telefoneAvisoDdi;
    if (avisoFields.telefoneAvisoPais) payload.telefoneAvisoPais = avisoFields.telefoneAvisoPais;
  } else if (!avisoFields?.telefoneAviso) {
    payload.whatsappNotifyStatus = 'skipped';
    payload.whatsappNotifyError =
      'Nutricionista sem telefone cadastrado para o alerta de consulta.';
  }

  const lembreteRef = await getFirestoreAdmin().collection('lembretes').add(payload);
  await slotRef.set(
    {
      reminderLembreteId: lembreteRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { lembreteId: lembreteRef.id };
}

export async function updateNutriConsultaReminder(input: {
  lembreteId: string;
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<void> {
  const id = input.lembreteId.trim();
  if (!id) return;
  const db = getFirestoreAdmin();
  const ref = db.collection('lembretes').doc(id);
  const existing = await ref.get();
  if (!existing.exists) return;

  const data = existing.data() || {};
  const avisoWhatsApp = data.avisoWhatsApp === 'disabled' ? 'disabled' : data.avisoWhatsApp;
  const notify = buildLembreteWhatsappNotifyFields({
    data: input.date,
    horario: input.startTime,
    avisoWhatsApp,
  });
  const alreadySent = data.whatsappNotifyStatus === 'sent';
  const payload: Record<string, unknown> = {
    data: input.date,
    texto: buildNutriConsultaReminderTexto({
      pacienteNome: input.pacienteNome,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    }),
    pacienteId: input.pacienteId,
    pacienteNome: input.pacienteNome,
    avisoWhatsApp: notify.avisoWhatsApp ?? avisoWhatsApp,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (notify.horario) payload.horario = notify.horario;
  if (notify.notificarEm) payload.notificarEm = Timestamp.fromDate(notify.notificarEm);
  if (!alreadySent) {
    payload.whatsappNotifyStatus = notify.whatsappNotifyStatus ?? 'pending';
    payload.whatsappNotifyError = FieldValue.delete();
  }
  await ref.set(payload, { merge: true });
}

type NutriConsultaPacienteWhatsappInput = {
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  date: string;
};

async function sendNutriConsultaPacienteWhatsapp(
  input: NutriConsultaPacienteWhatsappInput,
  buildMessage: (nutriNome: string) => string,
  failLabel: string
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const phone = await resolvePacienteWhatsappPhone(input.pacienteId, input.pacientePhone);
  if (!phone) {
    return { ok: false, skipped: 'no_phone' };
  }

  const resolved = await resolveWhatsappOwnerForProfessional(input.nutricionistaId, 'nutricionista');
  const ownerId = resolved?.doctorId || input.nutricionistaId;
  const connection = await getWhatsappConnectionByDoctor(ownerId);
  if (!connection || connection.status !== 'connected' || !connection.sessionId?.trim()) {
    return { ok: false, skipped: 'whatsapp_disconnected' };
  }

  const nutriNome = await resolveNutriNome(input.nutricionistaId);
  const message = buildMessage(nutriNome);

  try {
    await sendPatientAutomationWhatsapp({
      ownerId,
      ownerSessionId: connection.sessionId,
      ownerConnectedPhone: connection.phone,
      phone,
      message,
    });
    await registrarWhatsappMessageLog({
      medicoId: ownerId,
      type: 'calendario_lembrete',
      status: 'sent',
      phone,
      message,
      pacienteId: input.pacienteId,
      pacienteNome: input.pacienteNome,
      aplicacaoData: input.date,
    }).catch(() => undefined);
    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : failLabel;
    await registrarWhatsappMessageLog({
      medicoId: ownerId,
      type: 'calendario_lembrete',
      status: 'failed',
      phone,
      message,
      pacienteId: input.pacienteId,
      pacienteNome: input.pacienteNome,
      aplicacaoData: input.date,
      errorMessage,
    }).catch(() => undefined);
    return { ok: false, error: errorMessage };
  }
}

async function notifyPacienteConsultaWhatsapp(
  label: string,
  send: () => Promise<{ ok: boolean; skipped?: string; error?: string }>
): Promise<void> {
  try {
    const sent = await send();
    if (!sent.ok && sent.error) {
      console.warn(`[consulta-nutri] ${label} WhatsApp`, sent.skipped || sent.error);
    } else if (!sent.ok && sent.skipped) {
      console.warn(`[consulta-nutri] ${label} WhatsApp ignorada:`, sent.skipped);
    }
  } catch (error) {
    console.error(`[consulta-nutri] ${label} WhatsApp`, error);
  }
}

export async function sendNutriConsultaConfirmacaoPaciente(input: {
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  return sendNutriConsultaPacienteWhatsapp(
    input,
    (nutriNome) =>
      buildNutriConsultaConfirmacaoPacienteTexto({
        pacienteNome: input.pacienteNome,
        nutriNome,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
      }),
    'Erro ao enviar confirmação.'
  );
}

export async function sendNutriConsultaRemarcacaoPaciente(input: {
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  oldDate: string;
  oldStartTime: string;
  oldEndTime: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  return sendNutriConsultaPacienteWhatsapp(
    input,
    (nutriNome) =>
      buildNutriConsultaRemarcacaoPacienteTexto({
        pacienteNome: input.pacienteNome,
        nutriNome,
        oldDate: input.oldDate,
        oldStartTime: input.oldStartTime,
        oldEndTime: input.oldEndTime,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
      }),
    'Erro ao avisar a remarcação.'
  );
}

export async function sendNutriConsultaCancelamentoPaciente(input: {
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  return sendNutriConsultaPacienteWhatsapp(
    input,
    (nutriNome) =>
      buildNutriConsultaCancelamentoPacienteTexto({
        pacienteNome: input.pacienteNome,
        nutriNome,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
      }),
    'Erro ao avisar o cancelamento.'
  );
}

/**
 * Lembrete 30 min antes: cron do calendário envia pelo WhatsApp da nutricionista.
 * Idempotente por `patientReminderLembreteId` no slot.
 */
export async function scheduleNutriConsultaPatientReminder(input: {
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<{ lembreteId: string | null; skipped?: string }> {
  const slotRef = getFirestoreAdmin()
    .collection(NUTRI_AVAILABILITY_COLLECTION)
    .doc(input.availabilityId);
  const slotSnap = await slotRef.get();
  const existingId =
    typeof slotSnap.data()?.patientReminderLembreteId === 'string'
      ? slotSnap.data()!.patientReminderLembreteId.trim()
      : '';
  if (existingId) {
    return { lembreteId: existingId, skipped: 'already_scheduled' };
  }

  const notify = buildLembreteWhatsappNotifyFields({
    data: input.date,
    horario: input.startTime,
    avisoWhatsApp: '30_min_antes',
  });
  if (!notify.notificarEm) {
    return { lembreteId: null, skipped: 'invalid_time' };
  }
  if (notify.notificarEm.getTime() <= Date.now() + PATIENT_REMINDER_TOO_SOON_MS) {
    return { lembreteId: null, skipped: 'too_soon' };
  }

  const nutriNome = await resolveNutriNome(input.nutricionistaId);
  const payload: Record<string, unknown> = {
    medicoId: null,
    nutricionistaId: input.nutricionistaId,
    personalTrainerId: null,
    pacienteId: input.pacienteId,
    pacienteNome: input.pacienteNome,
    data: input.date,
    horario: notify.horario,
    texto: buildNutriConsultaLembretePacienteTexto({
      pacienteNome: input.pacienteNome,
      nutriNome,
      date: input.date,
      startTime: input.startTime,
    }),
    tag: 'Consulta',
    origem: NUTRI_CONSULTA_PACIENTE_LEMBRETE_ORIGEM,
    whatsappNotifyTarget: 'paciente',
    concluido: false,
    criadoEm: FieldValue.serverTimestamp(),
    notificarPaciente: true,
    avisoWhatsApp: '30_min_antes',
    notificarEm: Timestamp.fromDate(notify.notificarEm),
    whatsappNotifyStatus: 'pending',
  };

  const lembreteRef = await getFirestoreAdmin().collection('lembretes').add(payload);
  await slotRef.set(
    {
      patientReminderLembreteId: lembreteRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { lembreteId: lembreteRef.id };
}

export async function updateNutriConsultaPatientReminder(input: {
  lembreteId: string;
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  date: string;
  startTime: string;
}): Promise<void> {
  const id = input.lembreteId.trim();
  if (!id) return;
  const db = getFirestoreAdmin();
  const ref = db.collection('lembretes').doc(id);
  const existing = await ref.get();
  if (!existing.exists) return;

  const data = existing.data() || {};
  const alreadySent = data.whatsappNotifyStatus === 'sent';
  const notify = buildLembreteWhatsappNotifyFields({
    data: input.date,
    horario: input.startTime,
    avisoWhatsApp: '30_min_antes',
  });
  const nutriNome = await resolveNutriNome(input.nutricionistaId);
  const payload: Record<string, unknown> = {
    data: input.date,
    texto: buildNutriConsultaLembretePacienteTexto({
      pacienteNome: input.pacienteNome,
      nutriNome,
      date: input.date,
      startTime: input.startTime,
    }),
    pacienteId: input.pacienteId,
    pacienteNome: input.pacienteNome,
    avisoWhatsApp: '30_min_antes',
    whatsappNotifyTarget: 'paciente',
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (notify.horario) payload.horario = notify.horario;
  if (notify.notificarEm) payload.notificarEm = Timestamp.fromDate(notify.notificarEm);
  const tooSoon =
    notify.notificarEm && notify.notificarEm.getTime() <= Date.now() + PATIENT_REMINDER_TOO_SOON_MS;
  if (tooSoon) {
    if (!alreadySent) {
      payload.whatsappNotifyStatus = 'skipped';
      payload.whatsappNotifyError =
        'Consulta remarcada para daqui a pouco; lembrete de 30 min não se aplica.';
    }
  } else {
    payload.whatsappNotifyStatus = notify.whatsappNotifyStatus ?? 'pending';
    payload.whatsappNotifyError = FieldValue.delete();
  }
  await ref.set(payload, { merge: true });
}

/** Confirmação na hora + lembrete 30 min antes. Não deve falhar o agendamento. */
export async function notifyPacienteConsultaAgendada(input: {
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<void> {
  await notifyPacienteConsultaWhatsapp('confirmação', () => sendNutriConsultaConfirmacaoPaciente(input));

  try {
    await scheduleNutriConsultaPatientReminder(input);
  } catch (error) {
    console.error('[consulta-nutri] lembrete 30 min paciente', error);
  }
}

/** Aviso imediato quando a nutricionista remarca data/horário. Não deve falhar a edição. */
export async function notifyPacienteConsultaAlterada(input: {
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  oldDate: string;
  oldStartTime: string;
  oldEndTime: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<void> {
  await notifyPacienteConsultaWhatsapp('remarcação', () => sendNutriConsultaRemarcacaoPaciente(input));
}

/** Aviso imediato quando a nutricionista apaga a consulta. Não deve falhar o cancelamento. */
export async function notifyPacienteConsultaCancelada(input: {
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<void> {
  await notifyPacienteConsultaWhatsapp('cancelamento', () => sendNutriConsultaCancelamentoPaciente(input));
}
