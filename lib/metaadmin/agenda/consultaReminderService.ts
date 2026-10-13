import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getMedicoAgendaSettings } from '@/lib/metaadmin/agenda/agendaSettingsService';
import { MEDICO_AVAILABILITY_COLLECTION } from '@/lib/metaadmin/agenda/agendaDefaults';
import { findUpcomingMedicoConsultaForPaciente } from '@/lib/metaadmin/agenda/meetingService';
import {
  DEFAULT_CONSULTA_CONFIRMACAO_BODY,
  DEFAULT_CONSULTA_LEMBRETE_MEDICO_BODY,
  DEFAULT_CONSULTA_LEMBRETE_PACIENTE_BODY,
  buildConsultaTemplateVars,
  renderConsultaMessageTemplate,
} from '@/lib/metaadmin/agenda/consultaMessageTemplates';
import { notifyPacienteViaCanalChatMedico } from '@/lib/metaadmin/pacienteCanalChatNotifyCore';
import { renderMedicoConsultaConfirmacaoTexto } from '@/lib/metaadmin/agenda/welcomeMessage';
import { buildLembreteWhatsappNotifyFields } from '@/lib/lembrete/lembreteWhatsappNotify';
import {
  CONSULTA_CONFIRMACAO_AUTOMATION_ID,
  CONSULTA_LEMBRETE_MEDICO_AUTOMATION_ID,
  CONSULTA_LEMBRETE_PACIENTE_AUTOMATION_ID,
} from '@/lib/whatsapp/canalChatTemplates';
import {
  isMedicoEventAutomationEnabled,
  resolveMedicoAutomationTemplate,
} from '@/services/medicoAutomationTemplateResolveService';
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
  MEDICO_CONSULTA_LEMBRETE_ORIGEM,
  MEDICO_CONSULTA_PACIENTE_LEMBRETE_ORIGEM,
} from '@/types/medicoAgenda';

const PATIENT_REMINDER_TOO_SOON_MS = 5 * 60_000;

function tryLegacyPhone(raw: string): string | null {
  try {
    return resolveLegacyBrazilWhatsappPhone(raw);
  } catch {
    return null;
  }
}

async function resolveMedicoNome(medicoId: string): Promise<string> {
  const snap = await getFirestoreAdmin().collection('medicos').doc(medicoId).get();
  return String(snap.data()?.nome || '').trim() || 'Médico';
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

async function resolveMedicoAvisoFields(medicoId: string): Promise<{
  telefoneAviso: string;
  telefoneAvisoDdi?: string;
  telefoneAvisoPais?: string;
} | null> {
  const db = getFirestoreAdmin();
  const snap = await db.collection('medicos').doc(medicoId).get();
  const fromProfile = telefoneAvisoWriteFieldsFromProfessional(
    (snap.data() || {}) as Record<string, unknown>,
  );
  if (fromProfile?.telefoneAviso) return fromProfile;

  const connection = await getWhatsappConnectionByDoctor(medicoId);
  const fromWhatsapp = tryResolvePhoneFromProfessionalDoc({
    telefone: connection?.phone,
  });
  return fromWhatsapp ? { telefoneAviso: fromWhatsapp } : null;
}

async function resolveConsultaAutomationTexto(
  medicoId: string,
  automationId: string,
  fallbackBody: string,
  vars: ReturnType<typeof buildConsultaTemplateVars>,
): Promise<string> {
  const resolved = await resolveMedicoAutomationTemplate({ automationId, medicoId });
  const body = resolved?.body?.trim() || fallbackBody;
  return renderConsultaMessageTemplate(body, vars);
}

async function resolveConfirmacaoTexto(input: {
  medicoId: string;
  pacienteNome: string;
  medicoNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<string> {
  const vars = buildConsultaTemplateVars({
    pacienteNome: input.pacienteNome,
    medicoNome: input.medicoNome,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  const resolved = await resolveMedicoAutomationTemplate({
    automationId: CONSULTA_CONFIRMACAO_AUTOMATION_ID,
    medicoId: input.medicoId,
  });
  if (resolved?.body?.trim()) {
    return renderConsultaMessageTemplate(resolved.body, vars);
  }
  const settings = await getMedicoAgendaSettings(input.medicoId);
  if (settings.welcomeMessageTemplate?.trim()) {
    return renderMedicoConsultaConfirmacaoTexto({
      template: settings.welcomeMessageTemplate,
      pacienteNome: input.pacienteNome,
      medicoNome: input.medicoNome,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    });
  }
  return renderConsultaMessageTemplate(DEFAULT_CONSULTA_CONFIRMACAO_BODY, vars);
}

export async function scheduleMedicoConsultaReminder(input: {
  medicoId: string;
  pacienteId: string;
  pacienteNome: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<{ lembreteId: string | null; skipped?: string }> {
  const enabled = await isMedicoEventAutomationEnabled({
    medicoId: input.medicoId,
    automationId: CONSULTA_LEMBRETE_MEDICO_AUTOMATION_ID,
  });
  if (!enabled) {
    return { lembreteId: null, skipped: 'disabled' };
  }

  const slotRef = getFirestoreAdmin()
    .collection(MEDICO_AVAILABILITY_COLLECTION)
    .doc(input.availabilityId);
  const slotSnap = await slotRef.get();
  const existingId =
    typeof slotSnap.data()?.reminderLembreteId === 'string'
      ? slotSnap.data()!.reminderLembreteId.trim()
      : '';
  if (existingId) {
    return { lembreteId: existingId, skipped: 'already_scheduled' };
  }

  const settings = await getMedicoAgendaSettings(input.medicoId);
  const avisoWhatsApp = settings.consultaReminderAviso;
  const avisoFields = await resolveMedicoAvisoFields(input.medicoId);
  const notify = buildLembreteWhatsappNotifyFields({
    data: input.date,
    horario: input.startTime,
    avisoWhatsApp,
  });

  const vars = buildConsultaTemplateVars({
    pacienteNome: input.pacienteNome,
    medicoNome: await resolveMedicoNome(input.medicoId),
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  const texto = await resolveConsultaAutomationTexto(
    input.medicoId,
    CONSULTA_LEMBRETE_MEDICO_AUTOMATION_ID,
    DEFAULT_CONSULTA_LEMBRETE_MEDICO_BODY,
    vars,
  );

  const payload: Record<string, unknown> = {
    medicoId: input.medicoId,
    nutricionistaId: null,
    personalTrainerId: null,
    pacienteId: input.pacienteId,
    pacienteNome: input.pacienteNome,
    data: input.date,
    texto,
    tag: 'Consulta',
    origem: MEDICO_CONSULTA_LEMBRETE_ORIGEM,
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
    payload.whatsappNotifyError = 'Médico sem telefone cadastrado para o alerta de consulta.';
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

type MedicoConsultaPacienteWhatsappInput = {
  medicoId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  date: string;
};

async function sendMedicoConsultaPacienteWhatsapp(
  input: MedicoConsultaPacienteWhatsappInput,
  buildMessage: (medicoNome: string) => string | Promise<string>,
  failLabel: string
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const phone = await resolvePacienteWhatsappPhone(input.pacienteId, input.pacientePhone);
  if (!phone) {
    return { ok: false, skipped: 'no_phone' };
  }

  const connection = await getWhatsappConnectionByDoctor(input.medicoId);
  if (!connection || connection.status !== 'connected' || !connection.sessionId?.trim()) {
    return { ok: false, skipped: 'whatsapp_disconnected' };
  }

  const medicoNome = await resolveMedicoNome(input.medicoId);
  const message = await Promise.resolve(buildMessage(medicoNome));

  try {
    await sendPatientAutomationWhatsapp({
      ownerId: input.medicoId,
      ownerSessionId: connection.sessionId,
      ownerConnectedPhone: connection.phone,
      phone,
      message,
    });
    await registrarWhatsappMessageLog({
      medicoId: input.medicoId,
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
      medicoId: input.medicoId,
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
      console.warn(`[meta/agenda] ${label} WhatsApp`, sent.skipped || sent.error);
    } else if (!sent.ok && sent.skipped) {
      console.warn(`[meta/agenda] ${label} WhatsApp ignorada:`, sent.skipped);
    }
  } catch (error) {
    console.error(`[meta/agenda] ${label} WhatsApp`, error);
  }
}

export async function sendMedicoConsultaConfirmacaoPaciente(input: {
  medicoId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<{ ok: boolean; skipped?: string; error?: string; via?: 'medico' | 'canal_chat' }> {
  const enabled = await isMedicoEventAutomationEnabled({
    medicoId: input.medicoId,
    automationId: CONSULTA_CONFIRMACAO_AUTOMATION_ID,
  });
  if (!enabled) return { ok: false, skipped: 'disabled' };

  const primary = await sendMedicoConsultaPacienteWhatsapp(
    input,
    (medicoNome) =>
      resolveConfirmacaoTexto({
        medicoId: input.medicoId,
        pacienteNome: input.pacienteNome,
        medicoNome,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
      }),
    'Erro ao enviar confirmação.'
  );
  if (primary.ok) return { ...primary, via: 'medico' };
  if (primary.skipped === 'no_phone') return primary;

  const canalMessage = await resolveConfirmacaoTexto({
    medicoId: input.medicoId,
    pacienteNome: input.pacienteNome,
    medicoNome: await resolveMedicoNome(input.medicoId),
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  const canal = await notifyPacienteViaCanalChatMedico({
    medicoId: input.medicoId,
    pacienteId: input.pacienteId,
    logType: 'calendario_lembrete',
    logTag: 'meta/agenda-confirmacao',
    buildMessage: () => canalMessage,
  });
  if (canal.status === 'sent') {
    return { ok: true, via: 'canal_chat' };
  }
  return {
    ok: false,
    skipped: primary.skipped || 'canal_chat',
    error: canal.status === 'skipped' ? canal.reason : primary.error,
  };
}

export async function scheduleMedicoConsultaPatientReminder(input: {
  medicoId: string;
  pacienteId: string;
  pacienteNome: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<{ lembreteId: string | null; skipped?: string }> {
  const enabled = await isMedicoEventAutomationEnabled({
    medicoId: input.medicoId,
    automationId: CONSULTA_LEMBRETE_PACIENTE_AUTOMATION_ID,
  });
  if (!enabled) {
    return { lembreteId: null, skipped: 'disabled' };
  }

  const slotRef = getFirestoreAdmin()
    .collection(MEDICO_AVAILABILITY_COLLECTION)
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

  const medicoNome = await resolveMedicoNome(input.medicoId);
  const vars = buildConsultaTemplateVars({
    pacienteNome: input.pacienteNome,
    medicoNome,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  const texto = await resolveConsultaAutomationTexto(
    input.medicoId,
    CONSULTA_LEMBRETE_PACIENTE_AUTOMATION_ID,
    DEFAULT_CONSULTA_LEMBRETE_PACIENTE_BODY,
    vars,
  );
  const payload: Record<string, unknown> = {
    medicoId: input.medicoId,
    nutricionistaId: null,
    personalTrainerId: null,
    pacienteId: input.pacienteId,
    pacienteNome: input.pacienteNome,
    data: input.date,
    horario: notify.horario,
    texto,
    tag: 'Consulta',
    origem: MEDICO_CONSULTA_PACIENTE_LEMBRETE_ORIGEM,
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

export async function notifyPacienteConsultaMedicoAgendada(input: {
  medicoId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Confirmação imediata só se o médico já é o responsável (retorno/remarcação). */
  sendConfirmacao?: boolean;
}): Promise<void> {
  if (input.sendConfirmacao !== false) {
    await notifyPacienteConsultaWhatsapp('confirmação', () =>
      sendMedicoConsultaConfirmacaoPaciente(input)
    );
  }

  try {
    await scheduleMedicoConsultaPatientReminder(input);
  } catch (error) {
    console.error('[meta/agenda] lembrete 30 min paciente', error);
  }
}

/**
 * Ao aceitar a solicitação: confirma o horário pelo WhatsApp do médico
 * (Canal Chat se o WhatsApp do médico estiver desconectado) e garante os lembretes de 30 min.
 */
export async function notifyMedicoConsultaAposAceite(input: {
  medicoId: string;
  pacienteId: string;
  pacienteNome: string;
  pacientePhone?: string;
  pacienteEmail?: string;
}): Promise<{ hadConsulta: boolean }> {
  const meeting = await findUpcomingMedicoConsultaForPaciente(input.medicoId, input.pacienteId, {
    pacienteEmail: input.pacienteEmail,
  });
  if (!meeting) return { hadConsulta: false };

  const payload = {
    medicoId: input.medicoId,
    pacienteId: input.pacienteId || meeting.pacienteId || '',
    pacienteNome: input.pacienteNome,
    pacientePhone: input.pacientePhone || meeting.pacientePhone,
    availabilityId: meeting.availabilityId,
    date: meeting.date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
  };

  await notifyPacienteConsultaWhatsapp('confirmação pós-aceite', () =>
    sendMedicoConsultaConfirmacaoPaciente(payload)
  );

  try {
    await scheduleMedicoConsultaReminder(payload);
  } catch (error) {
    console.error('[meta/agenda] alerta 30 min médico pós-aceite', error);
  }

  try {
    await scheduleMedicoConsultaPatientReminder(payload);
  } catch (error) {
    console.error('[meta/agenda] lembrete 30 min paciente pós-aceite', error);
  }

  return { hadConsulta: true };
}
