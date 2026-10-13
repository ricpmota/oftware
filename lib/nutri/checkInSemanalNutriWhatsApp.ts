export const NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID = 'nutri_checkin_semanal_whatsapp';

export function isNutriCheckInWhatsappAutomation(automationId: string): boolean {
  return automationId === NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID;
}

export function nutriCheckInEnvioKey(patientId: string, weekKey: string): string {
  return `${patientId}::${weekKey}`;
}

export type NutriCheckInEnvioBadge = 'pending' | 'sent' | 'failed' | 'skipped';

export type NutriCheckInEnvioInfo = {
  status: NutriCheckInEnvioBadge;
  sentAt: string | null;
};

const BADGE_RANK: Record<NutriCheckInEnvioBadge, number> = {
  sent: 4,
  failed: 3,
  pending: 2,
  skipped: 1,
};

function toSentAtIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function pickNutriCheckInEnvioInfo(
  items: Array<{
    automationId: string;
    patientId: string;
    dateKey: string;
    status: string;
    sentAt?: Date | string | null;
  }>
): Record<string, NutriCheckInEnvioInfo> {
  const out: Record<string, NutriCheckInEnvioInfo> = {};
  for (const item of items) {
    if (item.automationId !== NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID) continue;
    const status = item.status === 'processing' ? 'pending' : item.status;
    if (status !== 'pending' && status !== 'sent' && status !== 'failed' && status !== 'skipped') {
      continue;
    }
    const key = nutriCheckInEnvioKey(item.patientId, item.dateKey);
    const sentAt = toSentAtIso(item.sentAt);
    const next: NutriCheckInEnvioInfo = { status, sentAt };
    const current = out[key];
    if (!current || BADGE_RANK[status] > BADGE_RANK[current.status]) {
      out[key] = next;
      continue;
    }
    if (
      BADGE_RANK[status] === BADGE_RANK[current.status] &&
      sentAt &&
      (!current.sentAt || sentAt > current.sentAt)
    ) {
      out[key] = next;
    }
  }
  return out;
}

export function pickNutriCheckInEnvioBadge(
  items: Array<{
    automationId: string;
    patientId: string;
    dateKey: string;
    status: string;
    sentAt?: Date | string | null;
  }>
): Record<string, NutriCheckInEnvioBadge> {
  const info = pickNutriCheckInEnvioInfo(items);
  const out: Record<string, NutriCheckInEnvioBadge> = {};
  for (const [key, value] of Object.entries(info)) {
    out[key] = value.status;
  }
  return out;
}
