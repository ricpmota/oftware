import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { flagWhatsappSessionBrokenFromSendFailure } from '@/services/whatsappDisconnectNotifyService';
import { isWhatsappSessionHealthFailure } from '@/lib/whatsapp/whatsappSessionHealth';
import { sendTestMessage, WhatsappProviderError } from '@/services/whatsappProviderClient';

export type LembreteParcelaVia = 'medico' | 'canal_chat';

const MESSAGE_MAX = 4000;

export async function sendLembreteParcelaWhatsapp(input: {
  medicoId: string;
  pacienteId: string;
  message: string;
  via: LembreteParcelaVia;
}): Promise<{ phone: string; via: LembreteParcelaVia }> {
  const medicoId = input.medicoId.trim();
  const pacienteId = input.pacienteId.trim();
  const message = input.message.trim().slice(0, MESSAGE_MAX);
  if (!medicoId) throw new Error('medicoId é obrigatório.');
  if (!pacienteId) throw new Error('pacienteId é obrigatório.');
  if (!message) throw new Error('Informe a mensagem.');

  const pacSnap = await getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).get();
  if (!pacSnap.exists) throw new Error('Paciente não encontrado.');
  const pacData = pacSnap.data() as Record<string, unknown>;
  const phone = tryResolvePhoneFromPacienteDoc(pacData);
  if (!phone) {
    throw new WhatsappProviderError('Paciente sem telefone válido no cadastro.', 'INVALID_PHONE');
  }
  const dadosIdentificacao = pacData.dadosIdentificacao as Record<string, unknown> | undefined;
  const pacienteNome =
    (typeof dadosIdentificacao?.nomeCompleto === 'string' && dadosIdentificacao.nomeCompleto.trim()) ||
    (typeof pacData.nome === 'string' && pacData.nome.trim()) ||
    'Paciente';

  const viaCanal = input.via === 'canal_chat';
  const ownerId = viaCanal ? CANAL_CHAT_OWNER_ID : medicoId;
  const connection = await getWhatsappConnectionByDoctor(ownerId);
  if (!connection || connection.status !== 'connected') {
    throw new WhatsappProviderError(
      viaCanal
        ? 'O Setor Financeiro está desconectado.'
        : 'Seu WhatsApp não está conectado.',
      'SESSION_NOT_READY',
    );
  }

  const sessionId = viaCanal
    ? connection.sessionId?.trim() || CANAL_CHAT_SESSION_ID
    : connection.sessionId?.trim() || (await getWhatsappMedicoContext(medicoId)).sessionId;

  try {
    await withWhatsappProviderAuth(ownerId, sessionId, (token) =>
      sendTestMessage(sessionId, token, phone, message, {
        connectedPhone: connection.phone ?? undefined,
        allowSelfSend: !viaCanal,
        phoneIsResolved: true,
      }),
    );
    try {
      await registrarWhatsappMessageLog({
        medicoId,
        type: 'calendario_lembrete',
        status: 'sent',
        phone,
        message,
        pacienteId,
        pacienteNome,
      });
    } catch (logError) {
      console.warn('[lembrete-parcela] log failed:', logError);
    }
    return { phone, via: input.via };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar a mensagem.';
    try {
      await registrarWhatsappMessageLog({
        medicoId,
        type: 'calendario_lembrete',
        status: 'failed',
        phone,
        message,
        pacienteId,
        pacienteNome,
        errorMessage,
      });
    } catch (logError) {
      console.warn('[lembrete-parcela] log failed:', logError);
    }
    if (isWhatsappSessionHealthFailure(error)) {
      try {
        await flagWhatsappSessionBrokenFromSendFailure({
          doctorId: ownerId,
          sessionId,
          errorMessage,
          errorCode: error instanceof WhatsappProviderError ? error.code : undefined,
        });
      } catch (notifyError) {
        console.warn('[lembrete-parcela] flag session broken:', notifyError);
      }
    }
    throw error instanceof WhatsappProviderError
      ? error
      : new WhatsappProviderError(errorMessage, 'SEND_FAILED');
  }
}
