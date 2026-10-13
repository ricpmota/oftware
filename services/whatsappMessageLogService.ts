import { Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type {
  WhatsappMessageLog,
  WhatsappMessageLogStatus,
  WhatsappMessageLogType,
} from '@/types/whatsappMessageLog';
import { buildWhatsappAutoAplicacaoEnvioId } from '@/types/whatsappAutoAplicacao';

const LOGS_COLLECTION = 'whatsapp_message_logs';
const ENVIOS_COLLECTION = 'whatsapp_auto_aplicacao_envios';
const DEFAULT_LIMIT = 50;
const MAX_FETCH = 200;

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

function truncateMessage(message: string, max = 160): string {
  const trimmed = message.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function docToLog(docId: string, data: Record<string, unknown>): WhatsappMessageLog {
  return {
    id: docId,
    medicoId: String(data.medicoId ?? ''),
    type: (data.type as WhatsappMessageLogType) ?? 'test',
    status: (data.status as WhatsappMessageLogStatus) ?? 'failed',
    sentAt: toDate(data.sentAt) ?? new Date(),
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    messagePreview: typeof data.messagePreview === 'string' ? data.messagePreview : undefined,
    pacienteId: typeof data.pacienteId === 'string' ? data.pacienteId : undefined,
    pacienteNome: typeof data.pacienteNome === 'string' ? data.pacienteNome : undefined,
    aplicacaoData: typeof data.aplicacaoData === 'string' ? data.aplicacaoData : undefined,
    semana: typeof data.semana === 'number' ? data.semana : undefined,
    dose: typeof data.dose === 'number' ? data.dose : undefined,
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
  };
}

function envioToLog(docId: string, data: Record<string, unknown>): WhatsappMessageLog {
  return {
    id: `legacy_${docId}`,
    medicoId: String(data.medicoId ?? ''),
    type: 'auto_aplicacao',
    status: (data.status as WhatsappMessageLogStatus) ?? 'failed',
    sentAt: toDate(data.sentAt) ?? new Date(),
    pacienteId: typeof data.pacienteId === 'string' ? data.pacienteId : undefined,
    aplicacaoData: typeof data.data === 'string' ? data.data : undefined,
    semana: typeof data.semana === 'number' ? data.semana : undefined,
    dose: typeof data.dose === 'number' ? data.dose : undefined,
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
  };
}

export async function registrarWhatsappMessageLog(params: {
  medicoId: string;
  type: WhatsappMessageLogType;
  status: WhatsappMessageLogStatus;
  phone?: string;
  message?: string;
  pacienteId?: string;
  pacienteNome?: string;
  aplicacaoData?: string;
  semana?: number;
  dose?: number;
  errorMessage?: string;
  docId?: string;
}): Promise<void> {
  const medicoId = params.medicoId?.trim();
  if (!medicoId) return;

  const docId =
    params.docId?.trim() ||
    (params.type === 'auto_aplicacao' &&
    params.pacienteId &&
    params.aplicacaoData &&
    params.semana !== undefined
      ? `auto_${buildWhatsappAutoAplicacaoEnvioId(medicoId, params.pacienteId, params.aplicacaoData, params.semana)}`
      : `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  await getFirestoreAdmin()
    .collection(LOGS_COLLECTION)
    .doc(docId)
    .set(
      {
        medicoId,
        type: params.type,
        status: params.status,
        sentAt: Timestamp.now(),
        phone: params.phone ?? null,
        messagePreview: params.message ? truncateMessage(params.message) : null,
        pacienteId: params.pacienteId ?? null,
        pacienteNome: params.pacienteNome ?? null,
        aplicacaoData: params.aplicacaoData ?? null,
        semana: params.semana ?? null,
        dose: params.dose ?? null,
        errorMessage: params.errorMessage ?? null,
      },
      { merge: true },
    );
}

async function enrichPacienteNomes(logs: WhatsappMessageLog[]): Promise<WhatsappMessageLog[]> {
  const ids = [...new Set(logs.map((l) => l.pacienteId).filter(Boolean))] as string[];
  if (ids.length === 0) return logs;

  const db = getFirestoreAdmin();
  const nomeMap = new Map<string, string>();

  await Promise.all(
    ids.map(async (id) => {
      const snap = await db.collection('pacientes_completos').doc(id).get();
      if (!snap.exists) return;
      const nome = snap.data()?.nome;
      if (typeof nome === 'string' && nome.trim()) nomeMap.set(id, nome.trim());
    }),
  );

  return logs.map((log) => {
    if (log.pacienteNome || !log.pacienteId) return log;
    const nome = nomeMap.get(log.pacienteId);
    return nome ? { ...log, pacienteNome: nome } : log;
  });
}

export async function listWhatsappMessageLogs(
  medicoId: string,
  options: { limit?: number } = {},
): Promise<WhatsappMessageLog[]> {
  const id = medicoId?.trim();
  if (!id) return [];

  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), 100);
  const db = getFirestoreAdmin();

  const [logsSnap, enviosSnap] = await Promise.all([
    db.collection(LOGS_COLLECTION).where('medicoId', '==', id).limit(MAX_FETCH).get(),
    db.collection(ENVIOS_COLLECTION).where('medicoId', '==', id).limit(MAX_FETCH).get(),
  ]);

  const loggedAutoKeys = new Set<string>();
  const items: WhatsappMessageLog[] = [];

  for (const doc of logsSnap.docs) {
    const log = docToLog(doc.id, doc.data() as Record<string, unknown>);
    items.push(log);
    if (log.type === 'auto_aplicacao' && log.pacienteId && log.aplicacaoData && log.semana !== undefined) {
      loggedAutoKeys.add(
        buildWhatsappAutoAplicacaoEnvioId(id, log.pacienteId, log.aplicacaoData, log.semana),
      );
    }
  }

  for (const doc of enviosSnap.docs) {
    if (loggedAutoKeys.has(doc.id)) continue;
    items.push(envioToLog(doc.id, doc.data() as Record<string, unknown>));
  }

  items.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  const sliced = items.slice(0, limit);
  return enrichPacienteNomes(sliced);
}
