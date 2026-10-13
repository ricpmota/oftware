import { BRASIL_TIMEZONE, parseHorarioBrasil } from '@/lib/time/brasilTimezone';
import { addDaysToHydrationYmd } from '@/lib/nutri/hidratacao/hydrationMath';
import { isHydrationCheckInCycleSendDay } from '@/lib/nutri/hidratacao/hydrationCheckInLink';

export const HYDRATION_CHECKIN_SEND_HOUR = 9;
export const HYDRATION_CHECKIN_SEND_HHMM = `${String(HYDRATION_CHECKIN_SEND_HOUR).padStart(2, '0')}:00`;
export const HYDRATION_CHECKIN_TIMEZONE = BRASIL_TIMEZONE;

export const HYDRATION_REMINDER_ENABLED_FIELD = 'hydrationCheckInReminderEnabled';
export const HYDRATION_REMINDER_TIME_FIELD = 'hydrationCheckInReminderTime';
export const HYDRATION_REMINDER_TIMEZONE_FIELD = 'hydrationCheckInReminderTimezone';
export const HYDRATION_REMINDER_UPDATED_AT_FIELD = 'hydrationCheckInReminderUpdatedAt';
export const HYDRATION_REMINDER_UPDATED_BY_USER_FIELD = 'hydrationCheckInReminderUpdatedByUserId';
export const HYDRATION_REMINDER_UPDATED_BY_TYPE_FIELD = 'hydrationCheckInReminderUpdatedByType';

export type HydrationReminderUpdatedByType = 'doctor' | 'nutritionist';

export type HydrationCheckInReminderSettings = {
  enabled: boolean;
  time: string;
  timezone: string;
  configured: boolean;
  updatedAt?: Date;
  updatedByUserId?: string;
  updatedByType?: HydrationReminderUpdatedByType;
};

/** Ausente ou qualquer valor ≠ true → desligado (opt-in). */
export function isHydrationCheckInReminderEnabled(value: unknown): boolean {
  return value === true;
}

export function resolveHydrationCheckInReminderTime(raw: unknown): string {
  return parseHorarioBrasil(typeof raw === 'string' ? raw : '') || HYDRATION_CHECKIN_SEND_HHMM;
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function parseHydrationCheckInReminderSettings(
  data: Record<string, unknown> | null | undefined
): HydrationCheckInReminderSettings {
  const raw = data || {};
  const hasEnabled = Object.prototype.hasOwnProperty.call(raw, HYDRATION_REMINDER_ENABLED_FIELD);
  const hasTime = Object.prototype.hasOwnProperty.call(raw, HYDRATION_REMINDER_TIME_FIELD);
  const updatedByType =
    raw[HYDRATION_REMINDER_UPDATED_BY_TYPE_FIELD] === 'nutritionist' ? 'nutritionist' : 'doctor';
  return {
    enabled: isHydrationCheckInReminderEnabled(raw[HYDRATION_REMINDER_ENABLED_FIELD]),
    time: resolveHydrationCheckInReminderTime(raw[HYDRATION_REMINDER_TIME_FIELD]),
    timezone: HYDRATION_CHECKIN_TIMEZONE,
    configured: hasEnabled || hasTime,
    updatedAt: toDate(raw[HYDRATION_REMINDER_UPDATED_AT_FIELD]),
    updatedByUserId:
      typeof raw[HYDRATION_REMINDER_UPDATED_BY_USER_FIELD] === 'string'
        ? String(raw[HYDRATION_REMINDER_UPDATED_BY_USER_FIELD])
        : undefined,
    updatedByType: hasEnabled || hasTime ? updatedByType : undefined,
  };
}

/**
 * Envio manual (copiar / Canal Chat) nunca consulta o switch automático.
 */
export function hydrationCheckInManualSendAllowed(_enabled?: boolean): boolean {
  return true;
}

export function resolveHydrationSettingsWriteAccess(input: {
  authenticated: boolean;
  doctorOwnsPatient: boolean;
  nutritionistHasActiveLink: boolean;
}): { ok: true; updatedByType: HydrationReminderUpdatedByType } | { ok: false; status: 401 | 403 } {
  if (!input.authenticated) return { ok: false, status: 401 };
  if (input.doctorOwnsPatient) return { ok: true, updatedByType: 'doctor' };
  if (input.nutritionistHasActiveLink) return { ok: true, updatedByType: 'nutritionist' };
  return { ok: false, status: 403 };
}

export type HydrationNextSendPreview =
  | { kind: 'disabled'; label: string }
  | { kind: 'not_needed'; label: string }
  | { kind: 'scheduled'; dateYmd: string; time: string; label: string };

export function formatHydrationNextSendClock(ymd: string, time: string): string {
  const [, m, d] = ymd.split('-');
  return `${d}/${m} às ${time}`;
}

export function nextHydrationCheckInSendDay(todayYmd: string): string {
  if (isHydrationCheckInCycleSendDay(todayYmd)) return addDaysToHydrationYmd(todayYmd, 2);
  return addDaysToHydrationYmd(todayYmd, 1);
}

export function previewHydrationCheckInNextSend(input: {
  enabled: boolean;
  time: string;
  todayYmd: string;
  pendingCount: number;
  alreadySentThisCycle: boolean;
}): HydrationNextSendPreview {
  if (!input.enabled) {
    return { kind: 'disabled', label: 'Envio automático desativado.' };
  }
  if (input.pendingCount <= 0) {
    return { kind: 'not_needed', label: 'Sem envio necessário no momento.' };
  }
  const dateYmd = input.alreadySentThisCycle
    ? nextHydrationCheckInSendDay(input.todayYmd)
    : input.todayYmd;
  const time = resolveHydrationCheckInReminderTime(input.time);
  return {
    kind: 'scheduled',
    dateYmd,
    time,
    label: `Próximo check-in ${formatHydrationNextSendClock(dateYmd, time)}`,
  };
}
