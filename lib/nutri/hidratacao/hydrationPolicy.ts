import { isPortalHydrationDateAllowed, isHydrationYmd } from '@/lib/nutri/hidratacao/hydrationMath';
import { isHydrationCheckInDateAllowed } from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import { HYDRATION_MAX_DAILY_ML } from '@/lib/nutri/hidratacao/hydrationTypes';

/** Campos que o cliente do portal pode alterar depois que o dia existe. */
export const HYDRATION_CLIENT_UPDATABLE_KEYS = [
  'consumedMl',
  'percentage',
  'goalReached',
  'lastSource',
  'updatedAt',
  'goalReachedAt',
] as const;

/** Identidade + snapshot da meta — imutáveis no client SDK. */
export const HYDRATION_IMMUTABLE_KEYS = [
  'patientId',
  'userId',
  'date',
  'createdAt',
  'goalMl',
  'source',
] as const;

export const HYDRATION_CLIENT_CREATE_KEYS = [
  'date',
  'goalMl',
  'consumedMl',
  'percentage',
  'goalReached',
  'source',
  'lastSource',
  'patientId',
  'userId',
  'createdAt',
  'updatedAt',
  'goalReachedAt',
] as const;

export const HYDRATION_CLIENT_SOURCE = 'patient_portal' as const;

export function hydrationClientUpdateKeysAllowed(affectedKeys: Iterable<string>): boolean {
  const allowed = new Set<string>(HYDRATION_CLIENT_UPDATABLE_KEYS);
  for (const key of affectedKeys) {
    if (!allowed.has(key)) return false;
  }
  return true;
}

export function hydrationImmutableChanged(affectedKeys: Iterable<string>): boolean {
  const frozen = new Set<string>(HYDRATION_IMMUTABLE_KEYS);
  for (const key of affectedKeys) {
    if (frozen.has(key)) return true;
  }
  return false;
}

export function isHydrationClientSource(value: unknown): boolean {
  return value === HYDRATION_CLIENT_SOURCE;
}

export function isHydrationConsumedMlAllowed(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= HYDRATION_MAX_DAILY_ML;
}

export function isHydrationGoalMlAllowed(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= HYDRATION_MAX_DAILY_ML;
}

/**
 * Portal autenticado e check-in por token NÃO compartilham a mesma janela de datas.
 * O token só grava datas de allowedDates; o portal continua com ±1 dia civil.
 */
export function hydrationWriteDateDenied(params: {
  actor: 'patient_portal' | 'whatsapp_checkin';
  date: string;
  allowedDates?: string[];
  now?: Date;
}): string | null {
  if (!isHydrationYmd(params.date)) {
    return 'Data inválida para o registro de hidratação.';
  }
  if (params.actor === 'patient_portal') {
    return isPortalHydrationDateAllowed(params.date, params.now)
      ? null
      : 'Só é possível registrar a hidratação do dia atual.';
  }
  if (!params.allowedDates || !isHydrationCheckInDateAllowed(params.date, params.allowedDates)) {
    return 'Esta data não está autorizada neste check-in.';
  }
  return null;
}
