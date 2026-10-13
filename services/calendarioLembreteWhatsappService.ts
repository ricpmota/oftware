import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buildCalendarioLembreteWhatsappMessage } from '@/lib/lembrete/lembreteWhatsappNotify';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { MEDICO_CONSULTA_PACIENTE_LEMBRETE_ORIGEM } from '@/types/medicoAgenda';
import {
  resolveWhatsappOwnerForProfessional,
  type WhatsappProfessionalRole,
} from '@/lib/server/whatsappProfessionalOwner.server';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { tryResolveTelefoneAviso } from '@/lib/whatsapp/resolveProfessionalPhone';
import {
  sendPatientAutomationWhatsapp,
  WhatsappPatientSendError,
} from '@/services/whatsappPatientSendRouter';
import { flagWhatsappSessionBrokenFromSendFailure } from '@/services/whatsappDisconnectNotifyService';
import { isWhatsappSessionHealthFailure } from '@/lib/whatsapp/whatsappSessionHealth';
import type { LembreteWhatsappNotifyStatus } from '@/types/lembrete';

const COLLECTION = 'lembretes';

type LembreteOwnerRole = 'medico' | WhatsappProfessionalRole;

type DueCalendarioLembrete = {
  id: string;
  /** Quem recebe o aviso (Canal Chat → telefoneAviso) e de quem sai a notificação ao paciente. */
  ownerId: string;
  ownerRole: LembreteOwnerRole;
  pacienteId: string;
  pacienteNome: string;
  data: string;
  horario?: string;
  telefoneAviso?: string;
  telefoneAvisoDdi?: string;
  telefoneAvisoPais?: string;
  notificarPaciente?: boolean;
  texto: string;
  tag: string;
  notificarEm: Date;
  whatsappNotifyTarget?: 'profissional' | 'paciente';
  origem?: string;
};

function ownerRoleLabel(role: LembreteOwnerRole): string {
  if (role === 'nutricionista') return 'nutricionista';
  if (role === 'personal_trainer') return 'personal';
  return 'médico';
}

function notifyTargetFromData(
  data: Record<string, unknown>
): 'profissional' | 'paciente' {
  if (data.whatsappNotifyTarget === 'paciente') return 'paciente';
  if (data.origem === 'nutri_consulta_paciente') return 'paciente';
  if (data.origem === 'personal_consulta_paciente') return 'paciente';
  if (data.origem === 'medico_consulta_paciente') return 'paciente';
  return 'profissional';
}

function resolveOwnerFromData(
  data: Record<string, unknown>,
): { ownerId: string; ownerRole: LembreteOwnerRole } | null {
  const medicoId = typeof data.medicoId === 'string' ? data.medicoId.trim() : '';
  if (medicoId) return { ownerId: medicoId, ownerRole: 'medico' };

  const nutricionistaId =
    typeof data.nutricionistaId === 'string' ? data.nutricionistaId.trim() : '';
  if (nutricionistaId) return { ownerId: nutricionistaId, ownerRole: 'nutricionista' };

  const personalTrainerId =
    typeof data.personalTrainerId === 'string' ? data.personalTrainerId.trim() : '';
  if (personalTrainerId) {
    return { ownerId: personalTrainerId, ownerRole: 'personal_trainer' };
  }

  return null;
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      try {
        return maybe.toDate();
      } catch {
        return undefined;
      }
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function mapDueDoc(
  id: string,
  data: Record<string, unknown>,
  now: Date,
): DueCalendarioLembrete | null {
  const owner = resolveOwnerFromData(data);
  const notificarEm = toDate(data.notificarEm);
  if (!owner || !notificarEm) return null;
  if (data.concluido === true) return null;
  if (data.whatsappNotifyStatus !== 'pending') return null;
  if (notificarEm.getTime() > now.getTime()) return null;

  return {
    id,
    ownerId: owner.ownerId,
    ownerRole: owner.ownerRole,
    pacienteId: typeof data.pacienteId === 'string' ? data.pacienteId : '',
    pacienteNome: typeof data.pacienteNome === 'string' ? data.pacienteNome : 'Paciente',
    data: typeof data.data === 'string' ? data.data : '',
    horario: typeof data.horario === 'string' ? data.horario : undefined,
    telefoneAviso: typeof data.telefoneAviso === 'string' ? data.telefoneAviso : undefined,
    telefoneAvisoDdi: typeof data.telefoneAvisoDdi === 'string' ? data.telefoneAvisoDdi : undefined,
    telefoneAvisoPais: typeof data.telefoneAvisoPais === 'string' ? data.telefoneAvisoPais : undefined,
    notificarPaciente: data.notificarPaciente === true,
    texto: typeof data.texto === 'string' ? data.texto : '',
    tag: typeof data.tag === 'string' ? data.tag : 'Consulta',
    notificarEm,
    whatsappNotifyTarget: notifyTargetFromData(data),
    origem: typeof data.origem === 'string' ? data.origem : undefined,
  };
}

function buildForcedDueItem(
  id: string,
  data: Record<string, unknown>,
): DueCalendarioLembrete | null {
  const owner = resolveOwnerFromData(data);
  if (!owner) return null;
  return {
    id,
    ownerId: owner.ownerId,
    ownerRole: owner.ownerRole,
    pacienteId: typeof data.pacienteId === 'string' ? data.pacienteId : '',
    pacienteNome: typeof data.pacienteNome === 'string' ? data.pacienteNome : 'Paciente',
    data: typeof data.data === 'string' ? data.data : '',
    horario: typeof data.horario === 'string' ? data.horario : undefined,
    telefoneAviso: typeof data.telefoneAviso === 'string' ? data.telefoneAviso : undefined,
    telefoneAvisoDdi: typeof data.telefoneAvisoDdi === 'string' ? data.telefoneAvisoDdi : undefined,
    telefoneAvisoPais: typeof data.telefoneAvisoPais === 'string' ? data.telefoneAvisoPais : undefined,
    notificarPaciente: data.notificarPaciente === true,
    texto: typeof data.texto === 'string' ? data.texto : '',
    tag: typeof data.tag === 'string' ? data.tag : 'Consulta',
    notificarEm: toDate(data.notificarEm) ?? new Date(),
    whatsappNotifyTarget: notifyTargetFromData(data),
    origem: typeof data.origem === 'string' ? data.origem : undefined,
  };
}

async function resolveProfessionalWhatsappConnection(item: DueCalendarioLembrete): Promise<{
  doctorId: string;
  sessionId: string;
  phone?: string;
} | null> {
  let doctorId = item.ownerId;

  if (item.ownerRole !== 'medico') {
    const resolved = await resolveWhatsappOwnerForProfessional(item.ownerId, item.ownerRole);
    if (!resolved?.doctorId) return null;
    doctorId = resolved.doctorId;
  }

  const connection = await getWhatsappConnectionByDoctor(doctorId);
  if (!connection || connection.status !== 'connected' || !connection.sessionId?.trim()) {
    return null;
  }

  return {
    doctorId,
    sessionId: connection.sessionId,
    phone: connection.phone,
  };
}

async function listDueCalendarioLembretes(
  now: Date,
  limit: number,
): Promise<DueCalendarioLembrete[]> {
  const capped = Math.max(1, Math.min(limit, 50));
  const col = getFirestoreAdmin().collection(COLLECTION);

  try {
    const snap = await col
      .where('whatsappNotifyStatus', '==', 'pending')
      .where('notificarEm', '<=', Timestamp.fromDate(now))
      .orderBy('notificarEm', 'asc')
      .limit(capped)
      .get();

    const items: DueCalendarioLembrete[] = [];
    for (const doc of snap.docs) {
      const mapped = mapDueDoc(doc.id, doc.data() as Record<string, unknown>, now);
      if (mapped) items.push(mapped);
    }
    return items;
  } catch (error) {
    console.warn(
      '[calendario-lembrete] query composta falhou — usando fallback por status:',
      error instanceof Error ? error.message : error,
    );
  }

  const snap = await col.where('whatsappNotifyStatus', '==', 'pending').limit(200).get();
  const items: DueCalendarioLembrete[] = [];
  for (const doc of snap.docs) {
    const mapped = mapDueDoc(doc.id, doc.data() as Record<string, unknown>, now);
    if (mapped) items.push(mapped);
  }
  items.sort((a, b) => a.notificarEm.getTime() - b.notificarEm.getTime());
  return items.slice(0, capped);
}

async function markNotifyStatus(
  id: string,
  status: LembreteWhatsappNotifyStatus,
  extra: Record<string, unknown> = {},
): Promise<void> {
  await getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(id)
    .set(
      {
        whatsappNotifyStatus: status,
        updatedAt: FieldValue.serverTimestamp(),
        ...extra,
      },
      { merge: true },
    );
}

async function resolveAvisoPhone(item: DueCalendarioLembrete): Promise<string | null> {
  return tryResolveTelefoneAviso({
    telefoneAviso: item.telefoneAviso,
    telefoneAvisoDdi: item.telefoneAvisoDdi,
    telefoneAvisoPais: item.telefoneAvisoPais,
  });
}

async function getCanalChatConnection() {
  const connection = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
  if (!connection || connection.status !== 'connected') return null;
  const sessionId = connection.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
  if (!sessionId) return null;
  return { ...connection, sessionId };
}

function extrairTelefonePacienteDoc(data: Record<string, unknown>): string | null {
  return tryResolvePhoneFromPacienteDoc(data);
}

async function resolvePacientePhone(pacienteId: string): Promise<string | null> {
  const id = pacienteId?.trim();
  if (!id) return null;
  try {
    const db = getFirestoreAdmin();
    // Cadastro canônico do metaadmin / automações WhatsApp.
    const completo = await db.collection('pacientes_completos').doc(id).get();
    if (completo.exists) {
      const phone = extrairTelefonePacienteDoc(completo.data() as Record<string, unknown>);
      if (phone) return phone;
    }
    // Fallback legado (alguns docs antigos).
    const legado = await db.collection('pacientes').doc(id).get();
    if (!legado.exists) return null;
    return extrairTelefonePacienteDoc(legado.data() as Record<string, unknown>);
  } catch (error) {
    console.warn(
      '[calendario-lembrete] falha ao buscar telefone do paciente:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function sendWhatsappToPhone(params: {
  ownerId: string;
  sessionId: string;
  phone: string;
  message: string;
  connectedPhone?: string;
  allowSelfSend?: boolean;
  logMedicoId: string;
  pacienteId?: string;
  pacienteNome?: string;
  aplicacaoData?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendPatientAutomationWhatsapp({
      ownerId: params.ownerId,
      ownerSessionId: params.sessionId,
      ownerConnectedPhone: params.connectedPhone,
      phone: params.phone,
      message: params.message,
      allowSelfSend: params.allowSelfSend === true,
    });

    try {
      await registrarWhatsappMessageLog({
        medicoId: params.logMedicoId,
        type: 'calendario_lembrete',
        status: 'sent',
        phone: params.phone,
        message: params.message,
        pacienteId: params.pacienteId || undefined,
        pacienteNome: params.pacienteNome,
        aplicacaoData: params.aplicacaoData,
      });
    } catch (logError) {
      console.warn('[calendario-lembrete] log failed:', logError);
    }

    return { ok: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro ao enviar lembrete do calendário.';

    try {
      await registrarWhatsappMessageLog({
        medicoId: params.logMedicoId,
        type: 'calendario_lembrete',
        status: 'failed',
        phone: params.phone,
        message: params.message,
        pacienteId: params.pacienteId || undefined,
        pacienteNome: params.pacienteNome,
        aplicacaoData: params.aplicacaoData,
        errorMessage,
      });
    } catch (logError) {
      console.warn('[calendario-lembrete] log failed:', logError);
    }

    if (isWhatsappSessionHealthFailure(error)) {
      const senderOwnerId =
        error instanceof WhatsappPatientSendError ? error.senderOwnerId : params.ownerId;
      await flagWhatsappSessionBrokenFromSendFailure({
        doctorId: senderOwnerId,
        errorMessage,
        errorCode: error instanceof WhatsappPatientSendError ? error.code : undefined,
      }).catch((notifyError) => {
        console.warn('[calendario-lembrete] flag session broken:', notifyError);
      });
    }

    return { ok: false, error: errorMessage };
  }
}

async function sendPacienteFromProfessional(item: DueCalendarioLembrete): Promise<{
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}> {
  const roleLabel = ownerRoleLabel(item.ownerRole);
  const professionalWa = await resolveProfessionalWhatsappConnection(item);
  if (!professionalWa) {
    return {
      status: 'skipped',
      error: `WhatsApp do ${roleLabel} desconectado ou sem sessão.`,
    };
  }

  const pacientePhone = await resolvePacientePhone(item.pacienteId);
  if (!pacientePhone) {
    await markNotifyStatus(item.id, 'failed', {
      whatsappNotifyError: 'Paciente sem telefone válido no cadastro.',
      whatsappNotificadoEm: Timestamp.now(),
    });
    return { status: 'failed', error: 'Paciente sem telefone válido no cadastro.' };
  }

  const message = item.texto.trim() || buildCalendarioLembreteWhatsappMessage(item);
  const sent = await sendWhatsappToPhone({
    ownerId: professionalWa.doctorId,
    sessionId: professionalWa.sessionId,
    phone: pacientePhone,
    message,
    connectedPhone: professionalWa.phone,
    logMedicoId: professionalWa.doctorId,
    pacienteId: item.pacienteId,
    pacienteNome: item.pacienteNome,
    aplicacaoData: item.data,
  });

  if (!sent.ok) {
    await markNotifyStatus(item.id, 'failed', {
      whatsappNotifyError: sent.error,
      whatsappNotificadoEm: Timestamp.now(),
    });
    return { status: 'failed', error: sent.error };
  }

  await markNotifyStatus(item.id, 'sent', {
    whatsappNotificadoEm: Timestamp.now(),
    whatsappNotifyError: FieldValue.delete(),
  });
  return { status: 'sent' };
}

async function sendPacienteFromCanalChat(item: DueCalendarioLembrete): Promise<{
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}> {
  const canalChat = await getCanalChatConnection();
  if (!canalChat) {
    return {
      status: 'skipped',
      error: 'Canal Chat desconectado ou sem sessão.',
    };
  }

  const pacientePhone = await resolvePacientePhone(item.pacienteId);
  if (!pacientePhone) {
    await markNotifyStatus(item.id, 'failed', {
      whatsappNotifyError: 'Paciente sem telefone válido no cadastro.',
      whatsappNotificadoEm: Timestamp.now(),
    });
    return { status: 'failed', error: 'Paciente sem telefone válido no cadastro.' };
  }

  const message = item.texto.trim() || buildCalendarioLembreteWhatsappMessage(item);
  const sent = await sendWhatsappToPhone({
    ownerId: CANAL_CHAT_OWNER_ID,
    sessionId: canalChat.sessionId,
    phone: pacientePhone,
    message,
    connectedPhone: canalChat.phone,
    logMedicoId: item.ownerId,
    pacienteId: item.pacienteId,
    pacienteNome: item.pacienteNome,
    aplicacaoData: item.data,
  });

  if (!sent.ok) {
    await markNotifyStatus(item.id, 'failed', {
      whatsappNotifyError: sent.error,
      whatsappNotificadoEm: Timestamp.now(),
    });
    return { status: 'failed', error: sent.error };
  }

  await markNotifyStatus(item.id, 'sent', {
    whatsappNotificadoEm: Timestamp.now(),
    whatsappNotifyError: FieldValue.delete(),
  });
  return { status: 'sent' };
}

async function sendOneCalendarioLembrete(item: DueCalendarioLembrete): Promise<{
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}> {
  if (item.whatsappNotifyTarget === 'paciente') {
    if (item.origem === MEDICO_CONSULTA_PACIENTE_LEMBRETE_ORIGEM) {
      return sendPacienteFromCanalChat(item);
    }
    return sendPacienteFromProfessional(item);
  }

  // Lembretes de calendário para nutri/personal são sempre ativos (sem toggle no painel).
  const canalChat = await getCanalChatConnection();
  if (!canalChat) {
    return {
      status: 'skipped',
      error: 'Canal Chat desconectado ou sem sessão.',
    };
  }

  const avisoPhone = await resolveAvisoPhone(item);
  if (!avisoPhone) {
    await markNotifyStatus(item.id, 'failed', {
      whatsappNotifyError:
        'Sem telefone de destino: informe o telefone do aviso no lembrete.',
      whatsappNotificadoEm: Timestamp.now(),
    });
    return {
      status: 'failed',
      error: 'Sem telefone de destino para o aviso.',
    };
  }

  const message = buildCalendarioLembreteWhatsappMessage(item);
  const primary = await sendWhatsappToPhone({
    ownerId: CANAL_CHAT_OWNER_ID,
    sessionId: canalChat.sessionId,
    phone: avisoPhone,
    message,
    connectedPhone: canalChat.phone,
    logMedicoId: CANAL_CHAT_OWNER_ID,
    pacienteId: item.pacienteId,
    pacienteNome: item.pacienteNome,
    aplicacaoData: item.data,
  });

  if (!primary.ok) {
    await markNotifyStatus(item.id, 'failed', {
      whatsappNotifyError: primary.error,
      whatsappNotificadoEm: Timestamp.now(),
    });
    return { status: 'failed', error: primary.error };
  }

  let pacienteNotifyNote: string | undefined;
  if (item.notificarPaciente) {
    const roleLabel = ownerRoleLabel(item.ownerRole);
    const professionalWa = await resolveProfessionalWhatsappConnection(item);
    if (!professionalWa) {
      pacienteNotifyNote = `Aviso ao paciente não enviado: WhatsApp do ${roleLabel} desconectado ou sem sessão.`;
      console.warn(`[calendario-lembrete] ${item.id}: ${pacienteNotifyNote}`);
    } else {
      const pacientePhone = await resolvePacientePhone(item.pacienteId);
      if (!pacientePhone) {
        pacienteNotifyNote =
          'Aviso ao paciente não enviado: sem telefone válido no cadastro.';
        console.warn(`[calendario-lembrete] ${item.id}: ${pacienteNotifyNote}`);
      } else {
        // Canal Chat → telefoneAviso; profissional → paciente (remetentes distintos).
        const pacienteSend = await sendWhatsappToPhone({
          ownerId: professionalWa.doctorId,
          sessionId: professionalWa.sessionId,
          phone: pacientePhone,
          message,
          connectedPhone: professionalWa.phone,
          logMedicoId: professionalWa.doctorId,
          pacienteId: item.pacienteId,
          pacienteNome: item.pacienteNome,
          aplicacaoData: item.data,
        });
        if (!pacienteSend.ok) {
          pacienteNotifyNote = `Aviso ao paciente falhou: ${pacienteSend.error}`;
          console.warn(`[calendario-lembrete] ${item.id}: ${pacienteNotifyNote}`);
        }
      }
    }
  }

  await markNotifyStatus(item.id, 'sent', {
    whatsappNotificadoEm: Timestamp.now(),
    whatsappNotifyError: pacienteNotifyNote
      ? pacienteNotifyNote
      : FieldValue.delete(),
    telefoneAviso: avisoPhone,
  });

  return { status: 'sent', error: pacienteNotifyNote };
}

/**
 * Motor de lembretes do calendário:
 * pending + notificarEm <= agora → Canal Chat envia para telefoneAviso;
 * lembrete de consulta médica 30 min → Canal Chat → paciente;
 * demais whatsappNotifyTarget=paciente → WhatsApp do profissional → paciente.
 */
export async function processDueCalendarioLembretesWhatsapp(options?: {
  now?: Date;
  limit?: number;
  doctorId?: string;
}): Promise<{
  scanned: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const now = options?.now ?? new Date();
  const limit = options?.limit ?? 20;
  let due = await listDueCalendarioLembretes(now, limit);
  const doctorFilter = options?.doctorId?.trim();
  if (doctorFilter) {
    due = due.filter((item) => item.ownerId === doctorFilter);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of due) {
    const result = await sendOneCalendarioLembrete(item);
    if (result.status === 'sent') sent += 1;
    else if (result.status === 'failed') failed += 1;
    else skipped += 1;
  }

  return { scanned: due.length, sent, failed, skipped };
}

/** Dispara (ou re-dispara) um lembrete específico agora — útil no Log / debug. */
export async function processCalendarioLembreteNow(lembreteId: string): Promise<{
  ok: boolean;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}> {
  const id = lembreteId?.trim();
  if (!id) return { ok: false, status: 'failed', error: 'lembreteId obrigatório.' };

  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return { ok: false, status: 'failed', error: 'Lembrete não encontrado.' };

  const data = snap.data() as Record<string, unknown>;
  const mapped = mapDueDoc(snap.id, { ...data, whatsappNotifyStatus: 'pending' }, new Date());
  if (!mapped) {
    // Força even if notificarEm is future — user clicked "enviar agora".
    const forced = buildForcedDueItem(snap.id, data);
    if (!forced) {
      return {
        ok: false,
        status: 'failed',
        error: 'Lembrete sem médico, nutricionista ou personal.',
      };
    }
    await markNotifyStatus(forced.id, 'pending', {
      whatsappNotifyError: FieldValue.delete(),
    });
    const result = await sendOneCalendarioLembrete(forced);
    return { ok: result.status === 'sent', status: result.status, error: result.error };
  }

  await markNotifyStatus(mapped.id, 'pending', {
    whatsappNotifyError: FieldValue.delete(),
  });
  const result = await sendOneCalendarioLembrete(mapped);
  return { ok: result.status === 'sent', status: result.status, error: result.error };
}
