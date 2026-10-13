import { WhatsappProviderError } from '@/services/whatsappProviderClient';

/** Códigos do provedor que indicam sessão morta/indisponível (não número inválido). */
const SESSION_HEALTH_ERROR_CODES = new Set([
  'SESSION_NOT_READY',
  'SESSION_NOT_FOUND',
  'OFFLINE',
  'NETWORK_ERROR',
  // TIMEOUT pós-envio NÃO entra: a mensagem muitas vezes já saiu e o WPP só demorou a confirmar.
  // Derrubar a sessão por TIMEOUT gerava falso "desconectado" + e-mail ao médico.
  'AUTH_ERROR',
  'SERVER_ERROR',
]);

/** Mensagens típicas de sessão quebrada mesmo com status Firestore = connected. */
const SESSION_HEALTH_MESSAGE_PATTERNS = [
  'sessão whatsapp',
  'sessão whatsapp indisponível',
  'sessão instável',
  'session is not active',
  'not connected',
  'disconnected',
  'msgchunks',
  'servidor wppconnect indisponível',
  'não foi possível comunicar com o servidor wppconnect',
  'token da sessão wppconnect',
  'falha ao enviar pelo whatsapp',
  'error sending',
  'whatsapp não está conectado',
  'issendfailure',
  'mantenha o app aberto',
  'sem confirmação do servidor whatsapp',
];

/** Erros de destino/número — NÃO devem pedir reconexão. */
const DESTINATION_ERROR_PATTERNS = [
  'número não encontrado',
  'número inválido',
  'invalid phone',
  'invalid wid',
  'não existe',
  'not exist',
  'mesmo número conectado',
  'self_send',
  'canal chat não está conectado',
  'getmessagebyid',
  'cannot read properties',
  'não confirmou o envio',
];

/**
 * Indica se a falha é de saúde da sessão (conectado “fantasma”) e o médico
 * precisa reconectar — e não um problema do número/template do paciente.
 *
 * TIMEOUT / “tempo esgotado” sozinhos NÃO contam: após send-message isso costuma
 * ser confirmação lenta do WPP, não sessão morta.
 */
export function isWhatsappSessionHealthFailure(error: unknown): boolean {
  if (error instanceof WhatsappProviderError) {
    if (error.code === 'TIMEOUT' || error.code === 'SEND_UNCONFIRMED') return false;
    if (SESSION_HEALTH_ERROR_CODES.has(error.code)) {
      const msg = error.message.toLowerCase();
      if (DESTINATION_ERROR_PATTERNS.some((p) => msg.includes(p))) return false;
      // “tempo esgotado” no texto com outro code — ainda não derruba sessão.
      if (msg.includes('tempo esgotado')) return false;
      return true;
    }
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const raw = message.toLowerCase().trim();
  if (!raw) return false;
  if (DESTINATION_ERROR_PATTERNS.some((p) => raw.includes(p))) return false;
  if (raw.includes('tempo esgotado')) return false;
  return SESSION_HEALTH_MESSAGE_PATTERNS.some((p) => raw.includes(p));
}

export function isWhatsappSessionHealthFailureMessage(errorMessage?: string): boolean {
  if (!errorMessage?.trim()) return false;
  return isWhatsappSessionHealthFailure(new Error(errorMessage));
}
