import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { isWhatsappSessionHealthFailure } from '@/lib/whatsapp/whatsappSessionHealth';
import { InternationalPhoneError } from '@/lib/whatsapp/resolveInternationalPhone';
import { resolveWhatsappTestDestination } from '@/lib/whatsapp/resolveWhatsappTestDestination';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { flagWhatsappSessionBrokenFromSendFailure } from '@/services/whatsappDisconnectNotifyService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { sendTestMessage, WhatsappProviderError } from '@/services/whatsappProviderClient';

export type SendWhatsappTestMessageInput = {
  doctorId: string;
  message: string;
  telefone?: string;
  telefoneDdi?: string | null;
  telefonePais?: string | null;
  /** Legado: callers que ainda enviam só `phone` (BR-only). */
  phone?: string;
};

export type SendWhatsappTestMessageResult = {
  phone?: string;
  mock?: boolean;
  message: string;
};

export async function sendWhatsappTestMessageForDoctor(
  input: SendWhatsappTestMessageInput,
): Promise<SendWhatsappTestMessageResult> {
  const doctorId = input.doctorId?.trim();
  const message = input.message?.trim();

  if (!doctorId) throw new Error('doctorId é obrigatório.');
  if (!message) throw new Error('Informe a mensagem de teste.');

  let phone: string;
  try {
    phone = resolveWhatsappTestDestination({
      telefone: input.telefone,
      telefoneDdi: input.telefoneDdi,
      telefonePais: input.telefonePais,
      phone: input.phone,
    });
  } catch (error) {
    if (error instanceof InternationalPhoneError) {
      throw new WhatsappProviderError(error.message, 'INVALID_PHONE');
    }
    throw error;
  }

  const connection = await getWhatsappConnectionByDoctor(doctorId);

  if (!connection || connection.status !== 'connected') {
    throw new WhatsappProviderError(
      'Conecte o WhatsApp do médico antes de enviar uma mensagem de teste.',
      'SESSION_NOT_READY',
    );
  }

  const sessionId =
    connection.sessionId?.trim() ||
    (await getWhatsappMedicoContext(doctorId)).sessionId;

  try {
    const { result } = await withWhatsappProviderAuth(doctorId, sessionId, (token) =>
      sendTestMessage(sessionId, token, phone, message, {
        connectedPhone: connection.phone,
        allowSelfSend: true,
        phoneIsResolved: true,
      }),
    );

    await registrarWhatsappMessageLog({
      medicoId: doctorId,
      type: 'test',
      status: 'sent',
      phone: result.phone ?? phone,
      message,
    });

    return {
      phone: result.phone,
      mock: result.mock,
      message: result.mock
        ? 'Mensagem simulada (modo mock).'
        : result.selfSend
          ? `API aceitou o envio para o próprio número (${result.phone}). No WhatsApp, mensagem para si mesmo muitas vezes NÃO aparece na conversa normal — teste com outro celular.`
          : result.deliveryUncertain
            ? 'Mensagem enviada (o provedor às vezes reporta erro mesmo com entrega — confira o WhatsApp de destino).'
            : `Mensagem de teste enviada para ${result.phone}. Confira no WhatsApp DE DESTINO (não só no conectado).`,
    };
  } catch (error) {
    const failMessage =
      error instanceof WhatsappProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Erro ao enviar mensagem de teste.';

    try {
      await registrarWhatsappMessageLog({
        medicoId: doctorId,
        type: 'test',
        status: 'failed',
        phone,
        message,
        errorMessage: failMessage,
      });
    } catch (logError) {
      console.warn('[whatsappSendTest] log failed:', logError);
    }

    // Mesmo o teste manual: se a sessão está fantasma, alinha Firestore (metaadmin/metaadmingeral).
    if (isWhatsappSessionHealthFailure(error)) {
      await flagWhatsappSessionBrokenFromSendFailure({
        doctorId,
        errorMessage: failMessage,
        errorCode: error instanceof WhatsappProviderError ? error.code : undefined,
      }).catch((notifyError) => {
        console.warn('[whatsappSendTest] flag session broken:', notifyError);
      });
    }

    throw error;
  }
}

export function whatsappTestErrorStatus(error: unknown): number {
  if (!(error instanceof WhatsappProviderError)) return 500;
  if (error.code === 'SESSION_NOT_READY') return 409;
  if (
    error.code === 'SELF_SEND_NOT_ALLOWED' ||
    error.code === 'INVALID_PHONE' ||
    error.code === 'INVALID_MESSAGE'
  ) {
    return 400;
  }
  if (error.code === 'SEND_REJECTED') return 502;
  return 500;
}
