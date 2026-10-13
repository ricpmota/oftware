import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  formatArtigoMedicoBoasVindas,
  formatMedicoBoasVindas,
} from '@/lib/whatsapp/boasVindasTratamentoMessage';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { persistCanalChatInboundKeys } from '@/services/canalChatInboundKeys';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';
import type { WhatsappMessageLogType } from '@/types/whatsappMessageLog';

export type PacienteCanalChatNotifyResult =
  | { status: 'sent'; phone: string; via: 'canal_chat' }
  | { status: 'skipped'; reason: string };

function nomePacienteFromDoc(data: Record<string, unknown>): string {
  const ident = data.dadosIdentificacao as Record<string, unknown> | undefined;
  return (
    (typeof ident?.nomeCompleto === 'string' && ident.nomeCompleto.trim()) ||
    (typeof data.nome === 'string' && data.nome.trim()) ||
    'Paciente'
  );
}

export async function resolvePacientePhoneForCanalChat(pacienteId: string): Promise<{
  phone: string | null;
  pacienteNome: string;
}> {
  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).get();
  if (!snap.exists) return { phone: null, pacienteNome: 'Paciente' };
  const data = snap.data() as Record<string, unknown>;
  const pacienteNome = nomePacienteFromDoc(data);
  return { phone: tryResolvePhoneFromPacienteDoc(data), pacienteNome };
}

export async function resolveMedicoNomeForCanalChat(medicoId: string): Promise<string> {
  const snap = await getFirestoreAdmin().collection('medicos').doc(medicoId).get();
  if (!snap.exists) return formatMedicoBoasVindas('seu médico');
  const data = snap.data() as Record<string, unknown>;
  const nome =
    (typeof data.nome === 'string' && data.nome.trim()) ||
    (typeof data.nomeCompleto === 'string' && data.nomeCompleto.trim()) ||
    '';
  if (!nome || /^seu médico$/i.test(nome)) return 'Seu médico';
  const genero = typeof data.genero === 'string' ? data.genero : null;
  const titulo = formatMedicoBoasVindas(nome, genero);
  const artigo = formatArtigoMedicoBoasVindas(genero);
  const artigoCap = artigo === 'a' ? 'A' : 'O';
  return `${artigoCap} ${titulo}`;
}

/**
 * Canal Chat → paciente. Não lança em falhas de envio.
 */
export async function notifyPacienteViaCanalChat(params: {
  logOwnerId: string;
  pacienteId: string;
  logType: WhatsappMessageLogType;
  logTag: string;
  buildMessage: (ctx: { pacienteNome: string; senderNome: string }) => string;
  resolveSenderNome: (ownerId: string) => Promise<string>;
}): Promise<PacienteCanalChatNotifyResult> {
  const logOwnerId = params.logOwnerId.trim();
  const pacienteId = params.pacienteId.trim();
  if (!logOwnerId || !pacienteId) {
    return { status: 'skipped', reason: 'Remetente ou paciente inválido.' };
  }

  const [{ phone, pacienteNome }, senderNome, canalChat] = await Promise.all([
    resolvePacientePhoneForCanalChat(pacienteId),
    params.resolveSenderNome(logOwnerId),
    getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID),
  ]);

  if (!phone) {
    return { status: 'skipped', reason: 'Paciente sem telefone válido no cadastro.' };
  }

  const sessionId = canalChat?.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
  if (!canalChat || canalChat.status !== 'connected' || !sessionId) {
    return { status: 'skipped', reason: 'Canal Chat desconectado.' };
  }

  const message = params.buildMessage({ pacienteNome, senderNome });

  try {
    const sent = await sendPatientAutomationWhatsapp({
      ownerId: CANAL_CHAT_OWNER_ID,
      ownerSessionId: sessionId,
      ownerConnectedPhone: canalChat.phone ?? undefined,
      phone,
      message,
    });

    await registrarWhatsappMessageLog({
      medicoId: logOwnerId,
      type: params.logType,
      status: 'sent',
      phone,
      message,
      pacienteId,
      pacienteNome,
    }).catch(() => undefined);

    await persistCanalChatInboundKeys(pacienteId, { phone, chatId: sent.chatId }).catch((error) => {
      console.warn(`[${params.logTag}] canalChatPhoneKey:`, error);
    });

    return { status: 'sent', phone, via: 'canal_chat' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar WhatsApp.';
    await registrarWhatsappMessageLog({
      medicoId: logOwnerId,
      type: params.logType,
      status: 'failed',
      phone,
      message,
      pacienteId,
      pacienteNome,
      errorMessage,
    }).catch(() => undefined);
    console.error(`[${params.logTag}] falha Canal Chat:`, errorMessage);
    return { status: 'skipped', reason: errorMessage };
  }
}

export async function notifyPacienteViaCanalChatMedico(params: {
  medicoId: string;
  pacienteId: string;
  logType: WhatsappMessageLogType;
  logTag: string;
  buildMessage: (ctx: { pacienteNome: string; medicoNome: string }) => string;
}): Promise<PacienteCanalChatNotifyResult> {
  return notifyPacienteViaCanalChat({
    logOwnerId: params.medicoId,
    pacienteId: params.pacienteId,
    logType: params.logType,
    logTag: params.logTag,
    resolveSenderNome: resolveMedicoNomeForCanalChat,
    buildMessage: ({ pacienteNome, senderNome }) =>
      params.buildMessage({ pacienteNome, medicoNome: senderNome }),
  });
}
