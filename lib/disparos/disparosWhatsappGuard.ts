import { DISPAROS_WHATSAPP_SESSION_ID } from '@/lib/disparos/constants';

/** A sessão persistida só pode ser a do Disparos. Qualquer outra é recusada, sem logout. */
export function isDisparosWhatsappSession(sessionId: string | null | undefined): boolean {
  return sessionId?.trim() === DISPAROS_WHATSAPP_SESSION_ID;
}

export function assertDisparosWhatsappSession(sessionId: string): void {
  if (!isDisparosWhatsappSession(sessionId)) {
    throw new Error('A sessão informada não pertence ao Disparos.');
  }
}

/** Evita devolver segredo da VM na mensagem mostrada no card. */
export function publicDisparosWhatsappError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : fallback;
  if (/secret|bearer|wpp_server|token|authorization|apikey|api_key/i.test(raw)) {
    return 'Não foi possível falar com o servidor do WhatsApp. Tente novamente em instantes.';
  }
  return raw.trim() || fallback;
}
