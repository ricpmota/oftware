import { Timestamp } from 'firebase-admin/firestore';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { WhatsappCronHeartbeatDto } from '@/types/whatsappCronHeartbeat';

const COLLECTION = 'whatsapp_cron_heartbeats';
const DOC_ID = 'send_aplicacao';

export type WhatsappCronHeartbeat = {
  ranAt: Date;
  brasilDateKey: string;
  brasilHhmm: string;
  host?: string;
  skipped: boolean;
  skipReason?: string;
  skipMessage?: string;
  medicos: number;
  enviados: number;
  falhas: number;
};

function docToHeartbeat(data: Record<string, unknown>): WhatsappCronHeartbeat {
  const ranAt =
    data.ranAt instanceof Timestamp
      ? data.ranAt.toDate()
      : data.ranAt instanceof Date
        ? data.ranAt
        : new Date();

  return {
    ranAt,
    brasilDateKey: String(data.brasilDateKey ?? ''),
    brasilHhmm: String(data.brasilHhmm ?? ''),
    host: typeof data.host === 'string' ? data.host : undefined,
    skipped: data.skipped === true,
    skipReason: typeof data.skipReason === 'string' ? data.skipReason : undefined,
    skipMessage: typeof data.skipMessage === 'string' ? data.skipMessage : undefined,
    medicos: Number(data.medicos ?? 0),
    enviados: Number(data.enviados ?? 0),
    falhas: Number(data.falhas ?? 0),
  };
}

export async function recordWhatsappCronHeartbeat(
  params: Omit<WhatsappCronHeartbeat, 'ranAt' | 'brasilDateKey' | 'brasilHhmm'> & {
    brasilDateKey?: string;
    brasilHhmm?: string;
  },
): Promise<void> {
  const brasil = getBrasilDateTimeParts();

  await getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(DOC_ID)
    .set(
      {
        ranAt: Timestamp.now(),
        brasilDateKey: params.brasilDateKey ?? brasil.dateKey,
        brasilHhmm: params.brasilHhmm ?? brasil.hhmm,
        host: params.host ?? null,
        skipped: params.skipped,
        skipReason: params.skipReason ?? null,
        skipMessage: params.skipMessage ?? null,
        medicos: params.medicos,
        enviados: params.enviados,
        falhas: params.falhas,
      },
      { merge: true },
    );
}

export async function getWhatsappCronHeartbeat(): Promise<WhatsappCronHeartbeat | null> {
  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(DOC_ID).get();
  if (!snap.exists) return null;
  return docToHeartbeat(snap.data() as Record<string, unknown>);
}

export function toWhatsappCronHeartbeatDto(
  heartbeat: WhatsappCronHeartbeat | null,
): WhatsappCronHeartbeatDto | null {
  if (!heartbeat) return null;

  const minutosAtras = Math.max(0, Math.round((Date.now() - heartbeat.ranAt.getTime()) / 60_000));

  return {
    ranAt: heartbeat.ranAt.toISOString(),
    brasilDateKey: heartbeat.brasilDateKey,
    brasilHhmm: heartbeat.brasilHhmm,
    host: heartbeat.host,
    skipped: heartbeat.skipped,
    skipReason: heartbeat.skipReason,
    skipMessage: heartbeat.skipMessage,
    medicos: heartbeat.medicos,
    enviados: heartbeat.enviados,
    falhas: heartbeat.falhas,
    minutosAtras,
  };
}
