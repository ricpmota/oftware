/**
 * Política pura do motor de Disparos.
 *
 * O WPPConnect não oferece idempotency key. Se o processo morrer depois que o
 * provedor aceitou a mensagem e antes de gravar `sent`, o item vai para revisão
 * manual. Não há exactly-once.
 */

export type ExpiredLeaseDecision = 'return_pending' | 'needs_review';

export function decideExpiredLease(phase: string | null | undefined): ExpiredLeaseDecision {
  if (phase === 'sending') return 'needs_review';
  return 'return_pending';
}

export type SendThrowDecision = 'retry_later' | 'recipient_failed' | 'ambiguous_review';

const RECIPIENT_MARKERS = [
  'findchat',
  'new chat not found',
  'invalid wid',
  'invalid contact',
  'contact not found',
  'failed to resolve',
  'invalid phone',
  'telefone inválido',
  'issendfailure',
];

export function decideSendThrow(code: string, message: string): SendThrowDecision {
  if (code === 'SESSION_NOT_READY' || code === 'AUTH_ERROR' || code === 'INVALID_TOKEN') {
    return 'retry_later';
  }
  if (code === 'SEND_REJECTED' || code === 'INVALID_PHONE') return 'recipient_failed';
  const raw = message.toLowerCase();
  if (RECIPIENT_MARKERS.some((marker) => raw.includes(marker))) return 'recipient_failed';
  return 'ambiguous_review';
}

const SENDER_MARKERS = ['disconnected', 'not connected', 'session is not active', 'sessão whatsapp', 'sessao whatsapp'];

export function shouldPauseForSender(decision: SendThrowDecision, message: string): boolean {
  if (decision === 'retry_later') return true;
  if (decision !== 'ambiguous_review') return false;
  const raw = message.toLowerCase();
  return SENDER_MARKERS.some((marker) => raw.includes(marker));
}
