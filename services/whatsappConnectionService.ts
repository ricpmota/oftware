/**
 * Persistência Firestore para conexões WhatsApp do médico.
 * Etapa 1 — apenas status de conexão; sem mensagens, conversas ou contatos.
 *
 * Uso server-side (API routes) via Firebase Admin SDK.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type {
  WhatsappConnection,
  WhatsappConnectionStatus,
  WhatsappConnectionUpsert,
} from '@/types/whatsappConnection';

const COLLECTION = 'whatsappConnections';

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') return maybe.toDate();
  }
  return undefined;
}

function docToWhatsappConnection(docId: string, data: Record<string, unknown>): WhatsappConnection {
  return {
    doctorId: (typeof data.doctorId === 'string' ? data.doctorId : docId) || docId,
    organizationId: typeof data.organizationId === 'string' ? data.organizationId : undefined,
    status: (data.status as WhatsappConnectionStatus) ?? 'disconnected',
    provider: 'wppconnect',
    sessionId:
      typeof data.sessionId === 'string'
        ? data.sessionId
        : buildWhatsappSessionId(
            docId,
            typeof data.organizationId === 'string' ? data.organizationId : undefined,
          ),
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    profileName: typeof data.profileName === 'string' ? data.profileName : undefined,
    qrCode: typeof data.qrCode === 'string' ? data.qrCode : undefined,
    connectedAt: toDate(data.connectedAt),
    lastCheckAt: toDate(data.lastCheckAt),
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

function sanitizeWhatsappSessionSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
}

/**
 * SessionId estável para WPPConnect central (white label).
 * Com organização: org_{organizationId}_doctor_{doctorId}
 * Fallback (sem organizationId): doctor_{doctorId}
 */
export function buildWhatsappSessionId(doctorId: string, organizationId?: string | null): string {
  const doctor = sanitizeWhatsappSessionSegment(doctorId);
  if (!doctor) throw new Error('doctorId inválido para sessionId WhatsApp.');

  const org = organizationId?.trim() ? sanitizeWhatsappSessionSegment(organizationId.trim()) : '';
  if (org) {
    return `org_${org}_doctor_${doctor}`;
  }

  return `doctor_${doctor}`;
}

export async function getWhatsappConnectionByDoctor(doctorId: string): Promise<WhatsappConnection | null> {
  const id = doctorId?.trim();
  if (!id) return null;

  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;

  return docToWhatsappConnection(snap.id, snap.data() as Record<string, unknown>);
}

export async function upsertWhatsappConnection(connection: WhatsappConnectionUpsert): Promise<WhatsappConnection> {
  const doctorId = connection.doctorId?.trim();
  if (!doctorId) throw new Error('doctorId é obrigatório.');

  const ref = getFirestoreAdmin().collection(COLLECTION).doc(doctorId);
  const existing = await ref.get();
  const now = FieldValue.serverTimestamp();

  const payload = removeUndefined({
    doctorId,
    organizationId: connection.organizationId,
    status: connection.status,
    provider: connection.provider ?? 'wppconnect',
    sessionId: connection.sessionId ?? buildWhatsappSessionId(doctorId, connection.organizationId),
    phone: connection.phone,
    profileName: connection.profileName,
    qrCode: connection.qrCode,
    connectedAt: connection.connectedAt ? Timestamp.fromDate(connection.connectedAt) : undefined,
    lastCheckAt: connection.lastCheckAt ? Timestamp.fromDate(connection.lastCheckAt) : undefined,
    errorMessage: connection.errorMessage,
    updatedAt: now,
    ...(existing.exists ? {} : { createdAt: now }),
  });

  await ref.set(payload, { merge: true });

  const saved = await ref.get();
  return docToWhatsappConnection(saved.id, saved.data() as Record<string, unknown>);
}

export async function updateWhatsappConnectionStatus(
  doctorId: string,
  status: WhatsappConnectionStatus,
  partialData: Partial<Omit<WhatsappConnectionUpsert, 'doctorId' | 'status'>> = {},
): Promise<WhatsappConnection> {
  const id = doctorId?.trim();
  if (!id) throw new Error('doctorId é obrigatório.');

  const ref = getFirestoreAdmin().collection(COLLECTION).doc(id);
  const now = FieldValue.serverTimestamp();

  const payload = removeUndefined({
    status,
    provider: partialData.provider ?? 'wppconnect',
    sessionId: partialData.sessionId,
    organizationId: partialData.organizationId,
    phone: partialData.phone,
    profileName: partialData.profileName,
    qrCode: partialData.qrCode,
    errorMessage: partialData.errorMessage,
    connectedAt: partialData.connectedAt ? Timestamp.fromDate(partialData.connectedAt) : undefined,
    lastCheckAt: partialData.lastCheckAt ? Timestamp.fromDate(partialData.lastCheckAt) : undefined,
    updatedAt: now,
  });

  await ref.set(payload, { merge: true });

  const saved = await ref.get();
  if (!saved.exists) {
    throw new Error('Conexão WhatsApp não encontrada.');
  }

  return docToWhatsappConnection(saved.id, saved.data() as Record<string, unknown>);
}

export async function disconnectWhatsappConnection(doctorId: string): Promise<WhatsappConnection> {
  const id = doctorId?.trim();
  if (!id) throw new Error('doctorId é obrigatório.');

  const ref = getFirestoreAdmin().collection(COLLECTION).doc(id);
  const now = FieldValue.serverTimestamp();

  await ref.set(
    {
      status: 'disconnected',
      qrCode: FieldValue.delete(),
      phone: FieldValue.delete(),
      profileName: FieldValue.delete(),
      errorMessage: FieldValue.delete(),
      connectedAt: FieldValue.delete(),
      lastCheckAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  const saved = await ref.get();
  if (!saved.exists) {
    throw new Error('Conexão WhatsApp não encontrada.');
  }

  return docToWhatsappConnection(saved.id, saved.data() as Record<string, unknown>);
}

export function serializeWhatsappConnection(connection: WhatsappConnection): import('@/types/whatsappConnection').WhatsappConnectionDto {
  return {
    doctorId: connection.doctorId,
    organizationId: connection.organizationId,
    status: connection.status,
    provider: connection.provider,
    sessionId: connection.sessionId,
    phone: connection.phone,
    profileName: connection.profileName,
    qrCode: connection.qrCode,
    connectedAt: connection.connectedAt?.toISOString(),
    lastCheckAt: connection.lastCheckAt?.toISOString(),
    errorMessage: connection.errorMessage,
    createdAt: connection.createdAt?.toISOString(),
    updatedAt: connection.updatedAt?.toISOString(),
  };
}
