import type { CheckInSemanalNutriStatus } from '@/lib/nutri/checkInSemanalNutriTypes';
import {
  generatePublicLinkToken,
  isValidPublicLinkToken,
  normalizePublicLinkToken,
} from '@/lib/publicLinks/publicLinkToken';

export const NUTRI_CHECKIN_LINKS_COLLECTION = 'nutri_checkin_links';

export const NUTRI_CHECKIN_PUBLIC_PATH_PREFIX = '/checkin-nutri';

export type NutriCheckInLinkStatus = 'active' | 'completed' | 'revoked';

export type NutriCheckInPublicLink = {
  token: string;
  patientId: string;
  nutritionistId: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  scheduledDate?: string;
  scheduledTime?: string;
  key: string;
  createdAt: Date;
  updatedAt?: Date;
  createdBy?: string;
  status: NutriCheckInLinkStatus;
};

export function nutriCheckInPublicLinkKey(
  nutritionistId: string,
  patientId: string,
  weekKey: string
): string {
  return `${nutritionistId.trim()}_${patientId.trim()}_${weekKey.trim()}`;
}

export const generateNutriCheckInPublicToken = generatePublicLinkToken;
export const normalizeNutriCheckInPublicToken = normalizePublicLinkToken;
export const isValidNutriCheckInPublicToken = isValidPublicLinkToken;

export function nutriCheckInPublicPath(token: string): string {
  return `${NUTRI_CHECKIN_PUBLIC_PATH_PREFIX}/${normalizeNutriCheckInPublicToken(token)}`;
}

export function parseNutriCheckInLinkStatus(value: unknown): NutriCheckInLinkStatus {
  if (value === 'completed' || value === 'revoked' || value === 'active') return value;
  return 'active';
}

export function deserializeNutriCheckInPublicLink(
  token: string,
  data: Record<string, unknown>
): NutriCheckInPublicLink | null {
  const patientId = String(data.patientId ?? '').trim();
  const nutritionistId = String(data.nutritionistId ?? '').trim();
  const weekKey = String(data.weekKey ?? '').trim();
  const weekStart = String(data.weekStart ?? weekKey).trim();
  const weekEnd = String(data.weekEnd ?? weekKey).trim();
  const key = String(data.key ?? '').trim() || nutriCheckInPublicLinkKey(nutritionistId, patientId, weekKey);
  if (!patientId || !nutritionistId || !weekKey) return null;

  return {
    token: normalizeNutriCheckInPublicToken(token),
    patientId,
    nutritionistId,
    weekKey,
    weekStart,
    weekEnd,
    scheduledDate: typeof data.scheduledDate === 'string' && data.scheduledDate.trim() ? data.scheduledDate.trim() : undefined,
    scheduledTime: typeof data.scheduledTime === 'string' && data.scheduledTime.trim() ? data.scheduledTime.trim() : undefined,
    key,
    createdAt: toLinkDate(data.createdAt) ?? new Date(),
    updatedAt: toLinkDate(data.updatedAt),
    createdBy: typeof data.createdBy === 'string' && data.createdBy.trim() ? data.createdBy.trim() : undefined,
    status: parseNutriCheckInLinkStatus(data.status),
  };
}

function toLinkDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Copiar link no calendário: não concluído e scheduledDate <= hoje (Brasília). */
export function canCopyNutriCheckInPublicLink(input: {
  status: CheckInSemanalNutriStatus;
  scheduledDate: string;
  todayYmd: string;
}): boolean {
  if (input.status === 'completed') return false;
  return input.scheduledDate <= input.todayYmd;
}

/** Nutricionista com vínculo ativo, ou médico responsável pelo paciente. */
export function canCreateNutriCheckInPublicLink(input: {
  authenticatedNutritionistId: string;
  requestedNutritionistId?: string;
  hasActiveVinculo: boolean;
  isResponsibleDoctor?: boolean;
}): boolean {
  const uid = input.authenticatedNutritionistId.trim();
  if (!uid) return false;
  if (input.isResponsibleDoctor) return true;
  if (input.requestedNutritionistId && input.requestedNutritionistId.trim() !== uid) return false;
  return input.hasActiveVinculo;
}

export function primeiroNomePublico(nomeCompleto?: string | null): string {
  const first = String(nomeCompleto || '')
    .trim()
    .split(/\s+/)
    .find((part) => part.length > 0);
  return first || '';
}

const PUBLIC_DADOS_FORBIDDEN_KEYS = [
  'cpf',
  'telefone',
  'email',
  'diagnostico',
  'prontuario',
  'medicamentos',
  'endereco',
  'financeiro',
  'patientId',
  'nutritionistId',
] as const;

export function assertNutriCheckInPublicDadosPrivacy(payload: Record<string, unknown>): string[] {
  const serialized = JSON.stringify(payload).toLowerCase();
  return PUBLIC_DADOS_FORBIDDEN_KEYS.filter((key) => {
    if (key === 'patientId' || key === 'nutritionistId') {
      return Object.prototype.hasOwnProperty.call(payload, key);
    }
    return serialized.includes(`"${key.toLowerCase()}"`);
  });
}
