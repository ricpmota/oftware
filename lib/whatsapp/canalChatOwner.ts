/**
 * Owner fixo do WhatsApp do sistema (Canal Chat / metaadmingeral).
 * Não é médico — envia avisos de lembrete para o médico sem self-message.
 */

export const CANAL_CHAT_OWNER_ID = 'canal_chat';

export const CANAL_CHAT_SESSION_ID = 'system_canal_chat';

export function getCanalChatWhatsappContext() {
  return {
    doctorId: CANAL_CHAT_OWNER_ID,
    sessionId: CANAL_CHAT_SESSION_ID,
  } as const;
}
