/**
 * Persistência Firestore para conexões WhatsApp do médico.
 * Etapa 1 — apenas status de conexão; sem mensagens, conversas ou contatos.
 *
 * Uso server-side (API routes) via Firebase Admin SDK.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { DEFAULT_AUTO_APLICACAO_HORARIO, parseHorarioBrasil } from '@/lib/time/brasilTimezone';
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
    wppSessionToken: typeof data.wppSessionToken === 'string' ? data.wppSessionToken : undefined,
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    profileName: typeof data.profileName === 'string' ? data.profileName : undefined,
    qrCode: typeof data.qrCode === 'string' ? data.qrCode : undefined,
    connectedAt: toDate(data.connectedAt),
    lastCheckAt: toDate(data.lastCheckAt),
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
    autoAplicacaoEnabled: data.autoAplicacaoEnabled === true,
    autoAplicacaoHorario:
      typeof data.autoAplicacaoHorario === 'string'
        ? data.autoAplicacaoHorario
        : DEFAULT_AUTO_APLICACAO_HORARIO,
    autoAplicacaoUltimoEnvioEm: toDate(data.autoAplicacaoUltimoEnvioEm),
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
    wppSessionToken: connection.wppSessionToken,
    phone: connection.phone,
    profileName: connection.profileName,
    qrCode: connection.qrCode,
    connectedAt: connection.connectedAt ? Timestamp.fromDate(connection.connectedAt) : undefined,
    lastCheckAt: connection.lastCheckAt ? Timestamp.fromDate(connection.lastCheckAt) : undefined,
    errorMessage: connection.errorMessage,
    autoAplicacaoEnabled: connection.autoAplicacaoEnabled,
    autoAplicacaoHorario: connection.autoAplicacaoHorario,
    autoAplicacaoUltimoEnvioEm: connection.autoAplicacaoUltimoEnvioEm
      ? Timestamp.fromDate(connection.autoAplicacaoUltimoEnvioEm)
      : undefined,
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
  partialData: Partial<Omit<WhatsappConnectionUpsert, 'doctorId' | 'status'>> & {
    /** Quando false, não atualiza updatedAt (útil em polling de qr_pending). */
    touchUpdatedAt?: boolean;
    /** `null` apaga errorMessage no Firestore (recuperação connected). */
    errorMessage?: string | null;
  } = {},
): Promise<WhatsappConnection> {
  const id = doctorId?.trim();
  if (!id) throw new Error('doctorId é obrigatório.');

  const ref = getFirestoreAdmin().collection(COLLECTION).doc(id);
  const existing = await ref.get();
  const previousStatus = (existing.data()?.status as WhatsappConnectionStatus | undefined) ?? null;
  const statusChanged = previousStatus !== status;
  const shouldTouchUpdatedAt = partialData.touchUpdatedAt === true || (partialData.touchUpdatedAt !== false && statusChanged);
  const now = FieldValue.serverTimestamp();

  const payload = removeUndefined({
    status,
    provider: partialData.provider ?? 'wppconnect',
    sessionId: partialData.sessionId,
    wppSessionToken: partialData.wppSessionToken,
    organizationId: partialData.organizationId,
    phone: partialData.phone,
    profileName: partialData.profileName,
    qrCode: partialData.qrCode,
    errorMessage:
      partialData.errorMessage === null ? FieldValue.delete() : partialData.errorMessage,
    autoAplicacaoEnabled: partialData.autoAplicacaoEnabled,
    autoAplicacaoHorario: partialData.autoAplicacaoHorario,
    autoAplicacaoUltimoEnvioEm: partialData.autoAplicacaoUltimoEnvioEm
      ? Timestamp.fromDate(partialData.autoAplicacaoUltimoEnvioEm)
      : undefined,
    connectedAt: partialData.connectedAt ? Timestamp.fromDate(partialData.connectedAt) : undefined,
    lastCheckAt: partialData.lastCheckAt ? Timestamp.fromDate(partialData.lastCheckAt) : undefined,
    updatedAt: shouldTouchUpdatedAt ? now : undefined,
  });

  await ref.set(payload, { merge: true });

  const saved = await ref.get();
  if (!saved.exists) {
    throw new Error('Conexão WhatsApp não encontrada.');
  }

  return docToWhatsappConnection(saved.id, saved.data() as Record<string, unknown>);
}

export async function saveWhatsappSessionToken(doctorId: string, wppSessionToken: string): Promise<void> {
  const id = doctorId?.trim();
  const token = wppSessionToken?.trim();
  if (!id) throw new Error('doctorId é obrigatório.');
  if (!token) throw new Error('wppSessionToken é obrigatório.');

  await getFirestoreAdmin().collection(COLLECTION).doc(id).set(
    {
      wppSessionToken: token,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateWhatsappAutoAplicacaoSettings(
  doctorId: string,
  settings: { autoAplicacaoEnabled?: boolean; autoAplicacaoHorario?: string },
): Promise<WhatsappConnection> {
  const id = doctorId?.trim();
  if (!id) throw new Error('doctorId é obrigatório.');

  const horario =
    settings.autoAplicacaoHorario !== undefined
      ? parseHorarioBrasil(settings.autoAplicacaoHorario)
      : undefined;
  if (settings.autoAplicacaoHorario !== undefined && !horario) {
    throw new Error('Horário inválido. Use o formato HH:mm (horário de Brasília).');
  }

  const ref = getFirestoreAdmin().collection(COLLECTION).doc(id);
  const existing = await ref.get();

  const payload = removeUndefined({
    doctorId: id,
    provider: 'wppconnect' as const,
    status: (existing.data()?.status as WhatsappConnectionStatus) ?? 'disconnected',
    sessionId:
      typeof existing.data()?.sessionId === 'string'
        ? existing.data()?.sessionId
        : buildWhatsappSessionId(id, existing.data()?.organizationId as string | undefined),
    autoAplicacaoEnabled: settings.autoAplicacaoEnabled,
    autoAplicacaoHorario: horario,
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  });

  await ref.set(payload, { merge: true });
  const saved = await ref.get();
  return docToWhatsappConnection(saved.id, saved.data() as Record<string, unknown>);
}

export async function touchWhatsappAutoAplicacaoUltimoEnvio(doctorId: string, at = new Date()): Promise<void> {
  const id = doctorId?.trim();
  if (!id) throw new Error('doctorId é obrigatório.');

  await getFirestoreAdmin().collection(COLLECTION).doc(id).set(
    {
      autoAplicacaoUltimoEnvioEm: Timestamp.fromDate(at),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listWhatsappConnectionsAutoAplicacaoAtivas(): Promise<WhatsappConnection[]> {
  const { listDoctorsEligibleForAutoAplicacaoCron } = await import(
    '@/lib/whatsapp/autoAplicacaoAuthorization.server'
  );
  return listDoctorsEligibleForAutoAplicacaoCron();
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
      wppSessionToken: FieldValue.delete(),
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
    autoAplicacaoEnabled: connection.autoAplicacaoEnabled === true,
    autoAplicacaoHorario: connection.autoAplicacaoHorario ?? DEFAULT_AUTO_APLICACAO_HORARIO,
    createdAt: connection.createdAt?.toISOString(),
    updatedAt: connection.updatedAt?.toISOString(),
  };
}
