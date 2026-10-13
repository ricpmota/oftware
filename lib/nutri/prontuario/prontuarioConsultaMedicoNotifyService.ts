import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';
import { nutritionistHasActivePatientLink } from '@/lib/nutri/ensureNutriCheckInPublicLink';
import { personalTrainerHasActivePatientLink } from '@/lib/personal/personalTrainerHasActivePatientLink';
import { formatNomeMedicoWelcome } from '@/lib/nutri/agenda/welcomeMessage';
import {
  buildProntuarioConsultaMedicoNotifyTexto,
  type ProntuarioConsultaPapel,
} from '@/lib/nutri/prontuario/prontuarioConsultaMedicoNotify';
import { resolveWhatsappOwnerForProfessional } from '@/lib/server/whatsappProfessionalOwner.server';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { isWhatsappSessionHealthFailure } from '@/lib/whatsapp/whatsappSessionHealth';
import { shouldRoutePatientSendViaCanalChat } from '@/lib/whatsapp/shouldRoutePatientSendViaCanalChat';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { flagWhatsappSessionBrokenFromSendFailure } from '@/services/whatsappDisconnectNotifyService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { normalizeWhatsappPhone } from '@/services/whatsappProviderClient';
import {
  sendPatientAutomationWhatsapp,
  WhatsappPatientSendError,
} from '@/services/whatsappPatientSendRouter';
import { tryResolvePhoneFromProfessionalDoc } from '@/lib/whatsapp/resolveProfessionalPhone';
import { assertCanonicalWhatsappPhone, InternationalPhoneError } from '@/lib/whatsapp/resolveInternationalPhone';
import type { WhatsappMessageLogType } from '@/types/whatsappMessageLog';

export type NotifyMedicoNovaConsultaCanal = 'profissional' | 'canal_chat';

export type NotifyMedicoNovaConsultaResult = {
  ok: boolean;
  skipped?: boolean;
  via?: NotifyMedicoNovaConsultaCanal | 'ambos';
  papel?: ProntuarioConsultaPapel;
  error?: string;
};

function tryNormalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    return assertCanonicalWhatsappPhone(raw);
  } catch (error) {
    if (!(error instanceof InternationalPhoneError)) throw error;
  }
  try {
    return normalizeWhatsappPhone(raw);
  } catch {
    return null;
  }
}

function logTypeFor(papel: ProntuarioConsultaPapel): WhatsappMessageLogType {
  return papel === 'personal' ? 'prontuario_consulta_personal' : 'prontuario_consulta_nutri';
}

async function resolveProfissional(
  papel: ProntuarioConsultaPapel,
  profissionalId: string
): Promise<{ nome: string; genero?: 'M' | 'F' }> {
  const collection = papel === 'personal' ? COL_PERSONAL_TRAINERS : COL_NUTRICIONISTAS;
  const snap = await getFirestoreAdmin().collection(collection).doc(profissionalId).get();
  const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
  const nome = typeof data.nome === 'string' ? data.nome.trim() : '';
  const genero = data.genero === 'F' || data.genero === 'M' ? data.genero : undefined;
  return { nome, genero };
}

async function loadMedico(medicoId: string): Promise<{
  id: string;
  data: Record<string, unknown>;
} | null> {
  const id = medicoId.trim();
  if (!id) return null;
  const db = getFirestoreAdmin();
  let snap = await db.collection('medicos').doc(id).get();
  if (!snap.exists) {
    const byUser = await db.collection('medicos').where('userId', '==', id).limit(1).get();
    if (!byUser.empty) snap = byUser.docs[0];
  }
  if (!snap.exists) return null;
  return { id: snap.id, data: snap.data() as Record<string, unknown> };
}

async function resolveMedicoPhone(medico: { id: string; data: Record<string, unknown> }): Promise<string | null> {
  const fromDoc = tryResolvePhoneFromProfessionalDoc(medico.data);
  if (fromDoc) return fromDoc;
  const connection = await getWhatsappConnectionByDoctor(medico.id);
  return tryNormalizePhone(connection?.phone);
}

async function getCanalChatConnection() {
  const connection = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
  if (!connection || connection.status !== 'connected') return null;
  const sessionId = connection.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
  if (!sessionId) return null;
  return { ...connection, sessionId };
}

async function sendAndLog(params: {
  ownerId: string;
  sessionId: string;
  connectedPhone?: string;
  phone: string;
  message: string;
  logOwnerId: string;
  logType: WhatsappMessageLogType;
  pacienteId: string;
  pacienteNome: string;
  data: string;
}): Promise<{ ok: boolean; via?: NotifyMedicoNovaConsultaCanal; error?: string }> {
  try {
    const sent = await sendPatientAutomationWhatsapp({
      ownerId: params.ownerId,
      ownerSessionId: params.sessionId,
      ownerConnectedPhone: params.connectedPhone,
      phone: params.phone,
      message: params.message,
    });
    await registrarWhatsappMessageLog({
      medicoId: params.logOwnerId,
      type: params.logType,
      status: 'sent',
      phone: params.phone,
      message: params.message,
      pacienteId: params.pacienteId,
      pacienteNome: params.pacienteNome,
      aplicacaoData: params.data,
    }).catch(() => undefined);
    const viaCanal =
      sent.routedViaCanalChat || params.ownerId === CANAL_CHAT_OWNER_ID;
    return { ok: true, via: viaCanal ? 'canal_chat' : 'profissional' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar WhatsApp.';
    await registrarWhatsappMessageLog({
      medicoId: params.logOwnerId,
      type: params.logType,
      status: 'failed',
      phone: params.phone,
      message: params.message,
      pacienteId: params.pacienteId,
      pacienteNome: params.pacienteNome,
      aplicacaoData: params.data,
      errorMessage,
    }).catch(() => undefined);

    if (isWhatsappSessionHealthFailure(error)) {
      const senderOwnerId =
        error instanceof WhatsappPatientSendError ? error.senderOwnerId : params.ownerId;
      await flagWhatsappSessionBrokenFromSendFailure({
        doctorId: senderOwnerId,
        errorMessage,
        errorCode: error instanceof WhatsappPatientSendError ? error.code : undefined,
      }).catch(() => undefined);
    }
    return { ok: false, error: errorMessage };
  }
}

/**
 * Avisa o médico responsável que nutri ou personal registrou uma consulta no prontuário.
 * Envia pelo Canal Chat e, se o WhatsApp do profissional estiver conectado, também por ele.
 */
export async function notifyMedicoNovaConsultaProntuario(input: {
  profissionalId: string;
  papel?: ProntuarioConsultaPapel;
  pacienteId: string;
  data: string;
  hora: string;
  titulo?: string;
}): Promise<NotifyMedicoNovaConsultaResult> {
  const papel: ProntuarioConsultaPapel = input.papel === 'personal' ? 'personal' : 'nutricionista';
  const profissionalId = input.profissionalId.trim();
  const pacId = input.pacienteId.trim();
  if (!profissionalId || !pacId) {
    return { ok: false, skipped: true, papel, error: 'Profissional ou paciente inválido.' };
  }

  const db = getFirestoreAdmin();
  const linked =
    papel === 'personal'
      ? await personalTrainerHasActivePatientLink(db, profissionalId, pacId)
      : await nutritionistHasActivePatientLink(db, profissionalId, pacId);
  if (!linked) {
    return {
      ok: false,
      skipped: true,
      papel,
      error:
        papel === 'personal'
          ? 'Paciente não está vinculado a este educador físico.'
          : 'Paciente não está vinculado a esta nutricionista.',
    };
  }

  const pacienteSnap = await db.collection('pacientes_completos').doc(pacId).get();
  if (!pacienteSnap.exists) {
    return { ok: false, skipped: true, papel, error: 'Paciente não encontrado.' };
  }

  const pacienteData = pacienteSnap.data() as Record<string, unknown>;
  const ident = pacienteData.dadosIdentificacao as Record<string, unknown> | undefined;
  const pacienteNome =
    (typeof ident?.nomeCompleto === 'string' && ident.nomeCompleto.trim()) ||
    (typeof pacienteData.nome === 'string' && pacienteData.nome.trim()) ||
    'Paciente';

  const medicoId = String(pacienteData.medicoResponsavelId || '').trim();
  if (!medicoId) {
    return { ok: false, skipped: true, papel, error: 'Paciente sem médico responsável.' };
  }

  const medico = await loadMedico(medicoId);
  if (!medico) {
    return { ok: false, skipped: true, papel, error: 'Médico responsável não encontrado.' };
  }

  const medicoPhone = await resolveMedicoPhone(medico);
  if (!medicoPhone) {
    return { ok: false, skipped: true, papel, error: 'Médico sem telefone válido no cadastro.' };
  }

  const medicoNomeRaw =
    (typeof medico.data.nome === 'string' && medico.data.nome.trim()) ||
    (typeof medico.data.nomeCompleto === 'string' && medico.data.nomeCompleto.trim()) ||
    'seu médico';
  const generoMedico = medico.data.genero === 'F' || medico.data.genero === 'M' ? medico.data.genero : undefined;
  const medicoNome = formatNomeMedicoWelcome(medicoNomeRaw, generoMedico);
  const profissional = await resolveProfissional(papel, profissionalId);
  const message = buildProntuarioConsultaMedicoNotifyTexto({
    medicoNome,
    profissionalNome: profissional.nome,
    pacienteNome,
    data: input.data,
    hora: input.hora,
    titulo: input.titulo,
    papel,
    genero: profissional.genero,
  });

  const whatsappRole = papel === 'personal' ? 'personal_trainer' : 'nutricionista';
  const resolved = await resolveWhatsappOwnerForProfessional(profissionalId, whatsappRole);
  const ownerId = resolved?.doctorId || profissionalId;
  const connection = await getWhatsappConnectionByDoctor(ownerId);
  const profissionalConnected =
    Boolean(connection) &&
    connection?.status === 'connected' &&
    Boolean(connection?.sessionId?.trim());

  const logType = logTypeFor(papel);
  const enviados: NotifyMedicoNovaConsultaCanal[] = [];
  const erros: string[] = [];
  let canalChatJaEnviado = false;

  const destinoEhOProprioWhatsapp =
    profissionalConnected &&
    shouldRoutePatientSendViaCanalChat({
      ownerId,
      patientPhone: medicoPhone,
      ownerPhones: [connection?.phone],
    });

  if (profissionalConnected && connection?.sessionId && !destinoEhOProprioWhatsapp) {
    const sent = await sendAndLog({
      ownerId,
      sessionId: connection.sessionId,
      connectedPhone: connection.phone,
      phone: medicoPhone,
      message,
      logOwnerId: ownerId,
      logType,
      pacienteId: pacId,
      pacienteNome,
      data: input.data,
    });
    if (sent.ok && sent.via) {
      enviados.push(sent.via);
      if (sent.via === 'canal_chat') canalChatJaEnviado = true;
    } else if (sent.error) {
      erros.push(sent.error);
      console.warn('[prontuario-consulta-notify] WhatsApp do profissional falhou', sent.error);
    }
  }

  if (!canalChatJaEnviado) {
    const canalChat = await getCanalChatConnection();
    if (canalChat) {
      const sent = await sendAndLog({
        ownerId: CANAL_CHAT_OWNER_ID,
        sessionId: canalChat.sessionId,
        connectedPhone: canalChat.phone,
        phone: medicoPhone,
        message,
        logOwnerId: ownerId,
        logType,
        pacienteId: pacId,
        pacienteNome,
        data: input.data,
      });
      if (sent.ok) {
        enviados.push('canal_chat');
      } else if (sent.error) {
        erros.push(sent.error);
      }
    } else if (!profissionalConnected || destinoEhOProprioWhatsapp) {
      erros.push('Canal Chat desconectado.');
    }
  }

  if (enviados.length === 0) {
    const nenhumConectado = !profissionalConnected && erros.some((e) => e.includes('Canal Chat desconectado'));
    return {
      ok: false,
      skipped: nenhumConectado || destinoEhOProprioWhatsapp,
      papel,
      error: erros.filter(Boolean).join(' ') || 'Não foi possível avisar o médico.',
    };
  }

  const via =
    enviados.includes('profissional') && enviados.includes('canal_chat')
      ? 'ambos'
      : enviados[0];
  return { ok: true, via, papel };
}
