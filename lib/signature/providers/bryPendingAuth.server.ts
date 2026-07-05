import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

const COLLECTION = 'brySignaturePendingAuth';
const TTL_MS = 60 * 60 * 1000;

export type BryPendingAuthRecord = {
  medicoId: string;
  nonce: string;
  integraApiKey?: string;
  /** Token do `/psc/link` para HUB (criptografado na conexão no callback). */
  integraBrySigningToken?: string;
  authorizationContextId?: string;
  authorizationUrl?: string;
  pscProvider?: string;
  pscLinkResponseKeys?: string[];
  createdAt: number;
  expiresAt: number;
};

function medicoDocId(medicoId: string): string {
  return `medico_${medicoId.trim()}`;
}

/** Firestore não aceita campos com valor `undefined`. */
export function sanitizeBryPendingAuthForFirestore(
  record: BryPendingAuthRecord
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    medicoId: record.medicoId,
    nonce: record.nonce,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  };
  if (record.integraApiKey?.trim()) out.integraApiKey = record.integraApiKey.trim();
  if (record.integraBrySigningToken?.trim()) {
    out.integraBrySigningToken = record.integraBrySigningToken.trim();
  }
  if (record.authorizationContextId?.trim()) {
    out.authorizationContextId = record.authorizationContextId.trim();
  }
  if (record.authorizationUrl?.trim()) out.authorizationUrl = record.authorizationUrl.trim();
  if (record.pscProvider?.trim()) out.pscProvider = record.pscProvider.trim();
  if (record.pscLinkResponseKeys?.length) {
    out.pscLinkResponseKeys = record.pscLinkResponseKeys;
  }
  return out;
}

export async function saveBryPendingAuth(record: BryPendingAuthRecord): Promise<void> {
  const nonce = record.nonce?.trim();
  if (!nonce) return;
  const db = getFirestoreAdmin();
  const data = sanitizeBryPendingAuthForFirestore(record);
  await db.collection(COLLECTION).doc(nonce).set(data);
  if (record.medicoId?.trim()) {
    await db.collection(COLLECTION).doc(medicoDocId(record.medicoId)).set(data);
  }
}

function normalizePendingRecord(data: BryPendingAuthRecord | undefined): BryPendingAuthRecord | null {
  if (!data?.medicoId || !data?.nonce) return null;
  if (data.expiresAt && Date.now() > data.expiresAt) return null;
  return data;
}

export async function readBryPendingAuthByNonce(
  nonce: string
): Promise<BryPendingAuthRecord | null> {
  const id = nonce?.trim();
  if (!id) return null;

  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;

  const data = normalizePendingRecord(snap.data() as BryPendingAuthRecord);
  if (!data) {
    await snap.ref.delete().catch(() => undefined);
    return null;
  }
  return data;
}

export async function readBryPendingAuthByMedicoId(
  medicoId: string
): Promise<BryPendingAuthRecord | null> {
  const id = medicoId?.trim();
  if (!id) return null;

  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(medicoDocId(id)).get();
  if (!snap.exists) return null;

  const data = normalizePendingRecord(snap.data() as BryPendingAuthRecord);
  if (!data) {
    await snap.ref.delete().catch(() => undefined);
    return null;
  }
  return data;
}

export async function deleteBryPendingAuthByNonce(
  nonce: string,
  medicoId?: string
): Promise<void> {
  const db = getFirestoreAdmin();
  const id = nonce?.trim();
  if (id) await db.collection(COLLECTION).doc(id).delete().catch(() => undefined);
  if (medicoId?.trim()) {
    await db.collection(COLLECTION).doc(medicoDocId(medicoId)).delete().catch(() => undefined);
  }
}

export function buildBryPendingAuthRecord(params: {
  medicoId: string;
  nonce: string;
  integraApiKey?: string;
  integraBrySigningToken?: string;
  authorizationContextId?: string;
  authorizationUrl?: string;
  pscProvider?: string;
  pscLinkResponseKeys?: string[];
}): BryPendingAuthRecord {
  const now = Date.now();
  const record: BryPendingAuthRecord = {
    medicoId: params.medicoId.trim(),
    nonce: params.nonce.trim(),
    createdAt: now,
    expiresAt: now + TTL_MS,
  };
  const integraApiKey = params.integraApiKey?.trim();
  if (integraApiKey) record.integraApiKey = integraApiKey;
  const integraBrySigningToken = params.integraBrySigningToken?.trim();
  if (integraBrySigningToken) record.integraBrySigningToken = integraBrySigningToken;
  const authorizationContextId = params.authorizationContextId?.trim();
  if (authorizationContextId) record.authorizationContextId = authorizationContextId;
  const authorizationUrl = params.authorizationUrl?.trim();
  if (authorizationUrl) record.authorizationUrl = authorizationUrl;
  const pscProvider = params.pscProvider?.trim();
  if (pscProvider) record.pscProvider = pscProvider;
  if (params.pscLinkResponseKeys?.length) {
    record.pscLinkResponseKeys = params.pscLinkResponseKeys;
  }
  return record;
}
