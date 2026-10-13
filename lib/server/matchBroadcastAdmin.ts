import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { MatchBroadcastResultRow } from '@/lib/match/matchAdminTypes';
import { matchBroadcastPatientView } from '@/lib/match/matchBroadcastPatient';
import { firstDisplayName } from '@/lib/match/matchProfile';
import { loadCanalChatSender, sendMatchCanalChatMessage } from '@/lib/server/matchCanalChatSend';
import { MATCH_BROADCASTS, MATCH_CANAL_CHAT_LOG, sanitizeMatchBroadcastDraft } from '@/lib/server/matchCanalChatSettings';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';

export const MATCH_BROADCAST_MAX = 40;

function fillName(message: string, name: string): string {
  const first = firstDisplayName(name) || name.trim() || 'você';
  return message.split('{{nome}}').join(first);
}

function isPatientDocId(id: string): boolean {
  return id.length > 0 && id.length <= 1500 && !id.includes('/');
}

export async function dispatchMatchBroadcast(
  db: Firestore,
  input: { patientIds: string[]; message: string; email: string },
): Promise<
  | { ok: true; sent: number; failed: number; noPhone: number; results: MatchBroadcastResultRow[] }
  | { ok: false; error: string; status: number }
> {
  const message = sanitizeMatchBroadcastDraft(input.message);
  if (!message) return { ok: false, error: 'Escreva a mensagem antes de disparar.', status: 400 };
  const patientIds = [...new Set(input.patientIds.map((id) => id.trim()).filter((id) => isPatientDocId(id)))];
  if (!patientIds.length) return { ok: false, error: 'Selecione pelo menos um paciente.', status: 400 };
  if (patientIds.length > MATCH_BROADCAST_MAX) {
    return { ok: false, error: `Dá para disparar até ${MATCH_BROADCAST_MAX} pacientes por vez.`, status: 400 };
  }

  const sender = await loadCanalChatSender();
  if (!sender) {
    return {
      ok: false,
      error: 'O Canal Chat está desconectado. Conecte em Automações → Canal Chat antes de disparar.',
      status: 409,
    };
  }

  const snaps = await db.getAll(...patientIds.map((id) => db.collection('pacientes_completos').doc(id)));
  const known = snaps.flatMap((snap) => {
    if (!snap.exists) return [];
    const data = snap.data() as Record<string, unknown>;
    let phone: string | null = null;
    try {
      phone = tryResolvePhoneFromPacienteDoc(data);
    } catch {
      phone = null;
    }
    return [{ id: snap.id, name: matchBroadcastPatientView(snap.id, data, phone).name, phone }];
  });
  if (!known.length) {
    return { ok: false, error: 'Nenhum dos selecionados está na base de pacientes.', status: 400 };
  }

  const broadcastRef = db.collection(MATCH_BROADCASTS).doc();
  const results: MatchBroadcastResultRow[] = [];
  for (const person of known) {
    const rendered = fillName(message, person.name);
    let status: MatchBroadcastResultRow['status'] = 'no_phone';
    let error: string | undefined;
    if (person.phone) {
      const sent = await sendMatchCanalChatMessage(person.phone, rendered, sender);
      status = sent.status;
      error = sent.error;
    }
    results.push({ uid: person.id, name: person.name, status, ...(error ? { error } : {}) });
    try {
      await db.collection(MATCH_CANAL_CHAT_LOG).add({
        kind: 'broadcast',
        broadcastId: broadcastRef.id,
        patientId: person.id,
        uid: person.id,
        recipientName: person.name,
        message: rendered.slice(0, 800),
        status,
        error: error || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      console.warn('[match-broadcast] log', logError instanceof Error ? logError.message : logError);
    }
  }

  const sent = results.filter((row) => row.status === 'sent').length;
  const failed = results.filter((row) => row.status === 'failed' || row.status === 'channel_offline').length;
  const noPhone = results.filter((row) => row.status === 'no_phone').length;
  await broadcastRef.set({
    message,
    patientIds: known.map((person) => person.id),
    createdAt: FieldValue.serverTimestamp(),
    createdByEmail: input.email,
    sent,
    failed,
    noPhone,
    total: results.length,
  });

  return { ok: true, sent, failed, noPhone, results };
}
