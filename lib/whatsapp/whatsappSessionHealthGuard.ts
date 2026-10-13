/**
 * Histerese de saúde da sessão WhatsApp (envio + sync).
 * Uma leitura saudável zera; N falhas consecutivas autorizam gravar `error`.
 * Não apaga token / phone / sessionId — isso fica a cargo do caller.
 */

export const WHATSAPP_SESSION_HEALTH_STRIKES_NEEDED = 3;

const strikesByDoctor = new Map<string, number>();

export function resetWhatsappSessionHealthStrikes(doctorId?: string): void {
  const id = doctorId?.trim();
  if (id) {
    strikesByDoctor.delete(id);
    return;
  }
  strikesByDoctor.clear();
}

export function getWhatsappSessionHealthStrikes(doctorId: string): number {
  return strikesByDoctor.get(doctorId.trim()) ?? 0;
}

/** Leitura saudável (check-connection true ou status CONNECTED). */
export function markWhatsappSessionHealthy(doctorId: string): { previousStrikes: number } {
  const id = doctorId.trim();
  const previousStrikes = strikesByDoctor.get(id) ?? 0;
  strikesByDoctor.delete(id);
  return { previousStrikes };
}

export function registerWhatsappSessionTransientFailure(doctorId: string): {
  strike: number;
  threshold: number;
  shouldMarkError: boolean;
} {
  const id = doctorId.trim();
  const threshold = WHATSAPP_SESSION_HEALTH_STRIKES_NEEDED;
  const strike = (strikesByDoctor.get(id) ?? 0) + 1;
  strikesByDoctor.set(id, strike);
  return {
    strike,
    threshold,
    shouldMarkError: strike >= threshold,
  };
}

export function shouldReconcileWhatsappConnectionStatus(
  status: string | undefined,
): boolean {
  return status === 'connected' || status === 'qr_pending' || status === 'error';
}
