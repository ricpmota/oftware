/**
 * Contrato público do check-in externo de hidratação.
 *
 * Sem geração de token neste arquivo (pode ser importado no cliente).
 * Geração/resolução: hydrationCheckInLink.server.ts + lib/publicLinks/publicLinkToken.ts
 */

import {
  addDaysToHydrationYmd,
  hydrationYmdInTimeZone,
  isHydrationYmd,
} from '@/lib/nutri/hidratacao/hydrationMath';
import {
  isShortPublicLinkToken,
  normalizePublicLinkToken,
} from '@/lib/publicLinks/publicLinkToken';

export const HYDRATION_CHECKIN_LINKS_COLLECTION = 'hidratacao_checkin_links';

/** Validade única do link. Não espalhar este número. */
export const HYDRATION_CHECKIN_LINK_TTL_DAYS = 7;

export const HYDRATION_CHECKIN_PURPOSE = 'hydration_checkin' as const;

/**
 * Links novos: mesmo token curto de /aplicacao /conclusao /relatorio
 * (8 chars, CSPRNG, alfabeto sem 0/O/1/I). Ver lib/publicLinks/publicLinkToken.ts.
 *
 * Legado ETAPA 02: 24 bytes CSPRNG → base64url 32 chars, URL = SHA-256 hex (64).
 * Os dois formatos continuam resolvendo.
 */
export const HYDRATION_CHECKIN_TOKEN_BYTES = 24;
export const HYDRATION_CHECKIN_TOKEN_LENGTH = 32;

const SECRET_TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
const HASH_TOKEN_RE = /^[a-f0-9]{64}$/;

export type HydrationCheckInPurpose = typeof HYDRATION_CHECKIN_PURPOSE;

export type HydrationCheckInLinkStatus = 'active' | 'completed' | 'expired' | 'revoked';

export type HydrationCheckInCreatedByType = 'system' | 'doctor' | 'nutritionist';

export type HydrationCheckInLink = {
  id: string;
  tokenHash: string;
  /** Presente só em documentos Admin. Nunca vai para o GET público. */
  token?: string;
  patientId: string;
  purpose: HydrationCheckInPurpose;
  allowedDates: string[];
  allowedDatesKey: string;
  createdByType: HydrationCheckInCreatedByType;
  createdByUserId: string;
  createdAt: Date;
  expiresAt: Date;
  openedAt?: Date;
  completedAt?: Date;
  lastOpenedAt?: Date;
  status: HydrationCheckInLinkStatus;
};

export function hydrationCheckInPublicPath(token: string): string {
  return `/hidratacao/${token}`;
}

export function normalizeHydrationCheckInToken(raw: string): string {
  const token = String(raw || '').trim();
  if (isShortPublicLinkToken(token)) return normalizePublicLinkToken(token);
  return token;
}

export type HydrationCheckInTokenKind = 'short' | 'hash' | 'secret' | 'invalid';

/** Token curto público (mesmo padrão de /aplicacao /conclusao /relatorio). */
export function isHydrationCheckInShortToken(raw: string): boolean {
  return isShortPublicLinkToken(raw);
}

/** Token secreto de 32 chars (legado ETAPA 02, URL antiga). */
export function isHydrationCheckInSecretToken(raw: string): boolean {
  return SECRET_TOKEN_RE.test(String(raw || '').trim());
}

/** SHA-256 hex = ID do documento (legado da URL de 64 chars). */
export function isHydrationCheckInHashToken(raw: string): boolean {
  return HASH_TOKEN_RE.test(String(raw || '').trim().toLowerCase());
}

export function classifyHydrationCheckInToken(raw: string): HydrationCheckInTokenKind {
  const token = String(raw || '').trim();
  if (!token) return 'invalid';
  if (isHydrationCheckInShortToken(token)) return 'short';
  if (isHydrationCheckInHashToken(token)) return 'hash';
  if (isHydrationCheckInSecretToken(token)) return 'secret';
  return 'invalid';
}

export function isValidHydrationCheckInToken(raw: string): boolean {
  return classifyHydrationCheckInToken(raw) !== 'invalid';
}

export function hydrationAllowedDatesKey(dates: string[]): string {
  return [...dates].filter(isHydrationYmd).sort().join(',');
}

export function hydrationCivilEpochDay(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

export function isHydrationCheckInCycleSendDay(todayYmd: string): boolean {
  return hydrationCivilEpochDay(todayYmd) % 2 === 0;
}

/**
 * Ciclo canônico de 2 dias (America/Sao_Paulo).
 * Dia âncora = epoch day par. No dia ímpar o período é o mesmo da âncora.
 *
 * 31/08 (par) → 29–30 AGO
 * 01/09 (ímpar) → ainda 29–30 AGO
 * 02/09 (par) → 31 AGO–01 SET
 *
 * Usado por automação, copiar link, Canal Chat e gerador padrão.
 */
export function hydrationCheckInCyclePeriod(todayYmd: string): {
  allowedDates: string[];
  allowedDatesKey: string;
  sendDay: boolean;
} {
  const anchor = isHydrationCheckInCycleSendDay(todayYmd) ? todayYmd : addDaysToHydrationYmd(todayYmd, -1);
  const allowedDates = [addDaysToHydrationYmd(anchor, -2), addDaysToHydrationYmd(anchor, -1)];
  return {
    allowedDates,
    allowedDatesKey: hydrationAllowedDatesKey(allowedDates),
    sendDay: isHydrationCheckInCycleSendDay(todayYmd),
  };
}

/** Função central: mesmo `allowedDatesKey` no mesmo dia, em todos os fluxos. */
export function getHydrationCheckInCycleDates(currentDate: Date | string = new Date()) {
  const todayYmd =
    typeof currentDate === 'string' ? currentDate : hydrationYmdInTimeZone(currentDate);
  return hydrationCheckInCyclePeriod(todayYmd);
}

/**
 * Datas padrão do gerador = ciclo vigente (não rolling “ontem + anteontem”
 * independente da âncora). Assim manual e automático compartilham o período.
 */
export function hydrationCheckInDefaultAllowedDates(now: Date = new Date()): string[] {
  return getHydrationCheckInCycleDates(now).allowedDates;
}

export function isHydrationCheckInDateAllowed(date: string, allowedDates: string[]): boolean {
  return isHydrationYmd(date) && allowedDates.includes(date);
}

export type HydrationCheckInPublicError = 'expired' | 'unavailable';

/**
 * Expired tem página própria. Inexistente / revogado / hash inválido / purpose errado
 * compartilham a mesma mensagem genérica — não diferenciar.
 */
export function classifyHydrationCheckInDenial(input: {
  found: boolean;
  purposeOk: boolean;
  status: HydrationCheckInLinkStatus | null;
  expiresAt: Date | null;
  now?: Date;
}): HydrationCheckInPublicError {
  const now = input.now ?? new Date();
  if (!input.found || !input.purposeOk || !input.status || input.status === 'revoked') {
    return 'unavailable';
  }
  if (input.status === 'expired') return 'expired';
  if (input.expiresAt && input.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'unavailable';
}

export function hydrationCheckInLinkIsUsable(
  link: Pick<HydrationCheckInLink, 'purpose' | 'status' | 'expiresAt'>,
  now: Date = new Date()
): boolean {
  if (link.purpose !== HYDRATION_CHECKIN_PURPOSE) return false;
  if (link.status === 'revoked' || link.status === 'expired') return false;
  if (link.expiresAt.getTime() <= now.getTime()) return false;
  return link.status === 'active' || link.status === 'completed';
}

export function hydrationCheckInLinkIsReusable(
  link: Pick<HydrationCheckInLink, 'purpose' | 'status' | 'expiresAt' | 'allowedDatesKey' | 'patientId'>,
  params: { patientId: string; allowedDatesKey: string },
  now: Date = new Date()
): boolean {
  if (link.patientId !== params.patientId) return false;
  if (link.allowedDatesKey !== params.allowedDatesKey) return false;
  return hydrationCheckInLinkIsUsable(link, now);
}
