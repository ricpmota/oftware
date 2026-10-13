/**
 * Gerador central de links de check-in de hidratação (ETAPA 02).
 *
 * - Token novo: 8 chars CSPRNG (mesmo helper de /aplicacao /conclusao /relatorio).
 *   Firestore ID = token curto. Sem hash na URL.
 * - Legado: SHA-256 hex (64) como ID, ou token secreto de 32 chars (hash no lookup).
 * - Reuso devolve o ID público já persistido (curto ou hash).

 *
 * Reuso: mesmo patientId + allowedDates + purpose, status active|completed,
 * ainda dentro de expiresAt. Evita médico / nutri / Canal Chat gerarem
 * URLs diferentes para o mesmo par de dias.
 *
 * Meta do dia: se o documento diário já existe, usa goalMl congelado.
 * Se não existe, usa aguaDia_ml vigente — ainda não há versionamento
 * histórico da prescrição de água.
 */

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { buildOrganizacaoPublicUrl } from '@/lib/organization/organizationUrls';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { allocateUniquePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';
import {
  HYDRATION_CHECKIN_LINKS_COLLECTION,
  HYDRATION_CHECKIN_LINK_TTL_DAYS,
  HYDRATION_CHECKIN_PURPOSE,
  classifyHydrationCheckInDenial,
  classifyHydrationCheckInToken,
  hydrationAllowedDatesKey,
  hydrationCheckInDefaultAllowedDates,
  hydrationCheckInLinkIsReusable,
  hydrationCheckInPublicPath,
  normalizeHydrationCheckInToken,
  type HydrationCheckInCreatedByType,
  type HydrationCheckInLink,
  type HydrationCheckInLinkStatus,
  type HydrationCheckInPublicError,
} from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import { hashHydrationCheckInToken } from '@/lib/nutri/hidratacao/hydrationCheckInToken';
import { isHydrationYmd } from '@/lib/nutri/hidratacao/hydrationMath';

export { generateHydrationCheckInToken, hashHydrationCheckInToken } from '@/lib/nutri/hidratacao/hydrationCheckInToken';

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

function parseStatus(value: unknown): HydrationCheckInLinkStatus {
  if (value === 'completed' || value === 'expired' || value === 'revoked' || value === 'active') {
    return value;
  }
  return 'active';
}

function parseCreatedByType(value: unknown): HydrationCheckInCreatedByType {
  if (value === 'doctor' || value === 'nutritionist' || value === 'system') return value;
  return 'system';
}

export function deserializeHydrationCheckInLink(
  id: string,
  data: Record<string, unknown>
): HydrationCheckInLink | null {
  const patientId = String(data.patientId ?? '').trim();
  const allowedDates = Array.isArray(data.allowedDates)
    ? data.allowedDates.map((d) => String(d)).filter(isHydrationYmd)
    : [];
  const expiresAt = toLinkDate(data.expiresAt);
  if (!patientId || allowedDates.length === 0 || !expiresAt) return null;

  const purpose =
    data.purpose === HYDRATION_CHECKIN_PURPOSE ? HYDRATION_CHECKIN_PURPOSE : null;
  if (!purpose) return null;

  const token = typeof data.token === 'string' ? data.token : undefined;
  const tokenHash =
    typeof data.tokenHash === 'string' && data.tokenHash.trim()
      ? data.tokenHash.trim()
      : id;

  return {
    id,
    tokenHash,
    token,
    patientId,
    purpose,
    allowedDates,
    allowedDatesKey:
      typeof data.allowedDatesKey === 'string' && data.allowedDatesKey
        ? data.allowedDatesKey
        : hydrationAllowedDatesKey(allowedDates),
    createdByType: parseCreatedByType(data.createdByType),
    createdByUserId: String(data.createdByUserId ?? '').trim(),
    createdAt: toLinkDate(data.createdAt) ?? new Date(),
    expiresAt,
    openedAt: toLinkDate(data.openedAt),
    completedAt: toLinkDate(data.completedAt),
    lastOpenedAt: toLinkDate(data.lastOpenedAt),
    status: parseStatus(data.status),
  };
}

function hydrationCheckInLinkRef(db: Firestore, tokenHash: string) {
  return db.collection(HYDRATION_CHECKIN_LINKS_COLLECTION).doc(tokenHash);
}

async function findReusableHydrationCheckInLink(
  db: Firestore,
  patientId: string,
  allowedDatesKey: string,
  now: Date
): Promise<HydrationCheckInLink | null> {
  const snap = await db
    .collection(HYDRATION_CHECKIN_LINKS_COLLECTION)
    .where('patientId', '==', patientId)
    .limit(40)
    .get();

  for (const docSnap of snap.docs) {
    const link = deserializeHydrationCheckInLink(docSnap.id, (docSnap.data() || {}) as Record<string, unknown>);
    if (!link) continue;
    if (hydrationCheckInLinkIsReusable(link, { patientId, allowedDatesKey }, now)) {
      return link;
    }
  }
  return null;
}

export type CreateHydrationCheckInLinkInput = {
  patientId: string;
  createdByType: HydrationCheckInCreatedByType;
  createdByUserId: string;
  /** Se omitido, usa os dois últimos dias civis completos (America/Sao_Paulo). */
  allowedDates?: string[];
  /** Override só para testes. Produção usa HYDRATION_CHECKIN_LINK_TTL_DAYS. */
  ttlDays?: number;
  /** Testes (link expirado) não devem reaproveitar um link ainda válido. */
  skipReuse?: boolean;
  now?: Date;
};

export type CreateHydrationCheckInLinkResult = {
  token: string;
  url: string;
  reused: boolean;
  link: HydrationCheckInLink;
};

export async function createHydrationCheckInLink(
  db: Firestore,
  input: CreateHydrationCheckInLinkInput
): Promise<CreateHydrationCheckInLinkResult> {
  const patientId = input.patientId.trim();
  const createdByUserId = input.createdByUserId.trim();
  if (!patientId) throw new Error('Paciente inválido.');
  if (!createdByUserId) throw new Error('Autor do link inválido.');

  const now = input.now ?? new Date();
  const allowedDates = (input.allowedDates?.length
    ? input.allowedDates
    : hydrationCheckInDefaultAllowedDates(now)
  )
    .filter(isHydrationYmd)
    .sort();
  if (allowedDates.length === 0) {
    throw new Error('Nenhuma data autorizada para o check-in.');
  }

  const allowedDatesKey = hydrationAllowedDatesKey(allowedDates);
  if (!input.skipReuse) {
    const reusable = await findReusableHydrationCheckInLink(db, patientId, allowedDatesKey, now);
    if (reusable) {
      const publicId = reusable.id || reusable.tokenHash;
      return {
        token: publicId,
        url: buildOrganizacaoPublicUrl(hydrationCheckInPublicPath(publicId)),
        reused: true,
        link: reusable,
      };
    }
  }

  const ttlDays =
    typeof input.ttlDays === 'number' && Number.isFinite(input.ttlDays)
      ? input.ttlDays
      : HYDRATION_CHECKIN_LINK_TTL_DAYS;
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  const payload: Record<string, unknown> = {
    patientId,
    purpose: HYDRATION_CHECKIN_PURPOSE,
    allowedDates,
    allowedDatesKey,
    createdByType: input.createdByType,
    createdByUserId,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
    status: 'active',
    ...shadowOrganizationFields(),
  };

  const token = await allocateUniquePublicLinkToken(db, HYDRATION_CHECKIN_LINKS_COLLECTION, payload);

  const link: HydrationCheckInLink = {
    id: token,
    tokenHash: token,
    patientId,
    purpose: HYDRATION_CHECKIN_PURPOSE,
    allowedDates,
    allowedDatesKey,
    createdByType: input.createdByType,
    createdByUserId,
    createdAt: now,
    expiresAt,
    status: 'active',
  };

  return {
    token,
    url: buildOrganizacaoPublicUrl(hydrationCheckInPublicPath(token)),
    reused: false,
    link,
  };
}

export type ResolvedHydrationCheckInLink =
  | { ok: true; link: HydrationCheckInLink; refPath: string }
  | { ok: false; error: HydrationCheckInPublicError };

export async function resolveHydrationCheckInLink(
  db: Firestore,
  rawToken: string,
  now: Date = new Date()
): Promise<ResolvedHydrationCheckInLink> {
  const token = normalizeHydrationCheckInToken(rawToken);
  const kind = classifyHydrationCheckInToken(token);
  if (kind === 'invalid') {
    return { ok: false, error: 'unavailable' };
  }

  const docId =
    kind === 'short'
      ? token
      : kind === 'hash'
        ? token.toLowerCase()
        : hashHydrationCheckInToken(token);
  const ref = hydrationCheckInLinkRef(db, docId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: false, error: 'unavailable' };
  }

  const link = deserializeHydrationCheckInLink(snap.id, (snap.data() || {}) as Record<string, unknown>);
  if (!link) {
    return { ok: false, error: 'unavailable' };
  }

  if (kind === 'secret' && link.token && link.token !== token) {
    return { ok: false, error: 'unavailable' };
  }

  if (link.purpose !== HYDRATION_CHECKIN_PURPOSE) {
    return { ok: false, error: classifyHydrationCheckInDenial({ found: true, purposeOk: false, status: link.status, expiresAt: link.expiresAt, now }) };
  }

  if (link.status === 'revoked') {
    return { ok: false, error: 'unavailable' };
  }

  if (link.status === 'expired' || link.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, error: 'expired' };
  }

  return { ok: true, link, refPath: ref.path };
}

export async function loadCurrentHydrationCheckInLink(
  db: Firestore,
  patientId: string,
  now: Date = new Date()
): Promise<HydrationCheckInLink | null> {
  const allowedDates = hydrationCheckInDefaultAllowedDates(now);
  const allowedDatesKey = hydrationAllowedDatesKey(allowedDates);
  return findReusableHydrationCheckInLink(db, patientId, allowedDatesKey, now);
}

export async function markHydrationCheckInOpened(
  db: Firestore,
  tokenHash: string,
  alreadyOpened: boolean
): Promise<void> {
  const patch: Record<string, unknown> = {
    lastOpenedAt: FieldValue.serverTimestamp(),
  };
  if (!alreadyOpened) patch.openedAt = FieldValue.serverTimestamp();
  await hydrationCheckInLinkRef(db, tokenHash).update(patch);
}

export async function loadHydrationPatientFirstName(
  db: Firestore,
  patientId: string
): Promise<string> {
  const snap = await db.collection('pacientes_completos').doc(patientId).get();
  if (!snap.exists) return '';
  const data = (snap.data() || {}) as Record<string, unknown>;
  const identificacao = data.dadosIdentificacao as Record<string, unknown> | undefined;
  const full =
    String(identificacao?.nomeCompleto ?? '').trim() || String(data.nome ?? '').trim();
  if (!full) return '';
  return full.split(/\s+/)[0] || '';
}

export async function markHydrationCheckInCompleted(db: Firestore, tokenHash: string): Promise<void> {
  await hydrationCheckInLinkRef(db, tokenHash).set(
    {
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
