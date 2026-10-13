/**
 * Regras de envio da fila WhatsApp: não despejar atrasados
 * nem repetir o mesmo aviso no mesmo paciente no mesmo dia.
 */

export function isWhatsappQueueSendWindowExpired(
  scheduledDateKey: string,
  todayKey: string,
): boolean {
  const scheduled = scheduledDateKey?.trim() ?? '';
  const today = todayKey?.trim() ?? '';
  if (!scheduled || !today) return false;
  return scheduled < today;
}

/** Uma mensagem por automação + paciente + dia (+ protocolo, se houver). */
export function whatsappSameDaySendKey(params: {
  automationId: string;
  patientId: string;
  scheduledDateKey: string;
  scopeKey?: string;
}): string {
  const scope = (params.scopeKey || '').trim();
  return `${params.automationId}:${params.patientId}:${params.scheduledDateKey}:${scope}`;
}

export function whatsappSameDayDedupDocId(params: {
  doctorId: string;
  patientId: string;
  automationId: string;
  scheduledDateKey: string;
  milestone: string;
  scopeKey?: string;
}): string {
  const scope = (params.scopeKey || '').trim();
  const base = `${params.doctorId}_${params.patientId}_${params.automationId}_${params.scheduledDateKey}_${params.milestone}`;
  return scope ? `${base}_${scope}` : base;
}
