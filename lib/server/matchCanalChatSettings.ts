import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  DEFAULT_MATCH_CANAL_CHAT_TEMPLATE,
  sanitizeMatchCanalChatTemplate,
} from '@/lib/match/matchCanalChatMessage';

export const MATCH_VISITS = 'match_visits';
export const MATCH_SETTINGS_COLLECTION = 'match_settings';
export const MATCH_CANAL_CHAT_SETTINGS_ID = 'canal_chat';
export const MATCH_CANAL_CHAT_LOG = 'match_canal_chat_log';
export const MATCH_BROADCASTS = 'match_broadcasts';

const BROADCAST_DRAFT_MAX = 800;

export type MatchCanalChatSettings = {
  template: string;
  broadcastDraft: string;
};

function settingsRef(db: Firestore) {
  return db.collection(MATCH_SETTINGS_COLLECTION).doc(MATCH_CANAL_CHAT_SETTINGS_ID);
}

export function sanitizeMatchBroadcastDraft(value: string): string {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, BROADCAST_DRAFT_MAX);
}

export async function loadMatchCanalChatSettings(db: Firestore): Promise<MatchCanalChatSettings> {
  const snap = await settingsRef(db).get();
  const data = snap.data() || {};
  const template = sanitizeMatchCanalChatTemplate(
    typeof data.connectionTemplate === 'string' ? data.connectionTemplate : '',
  );
  const broadcastDraft = sanitizeMatchBroadcastDraft(
    typeof data.broadcastDraft === 'string' ? data.broadcastDraft : '',
  );
  return {
    template: template || DEFAULT_MATCH_CANAL_CHAT_TEMPLATE,
    broadcastDraft,
  };
}

export async function saveMatchConnectionTemplate(
  db: Firestore,
  template: string,
  email: string,
): Promise<string> {
  const clean = sanitizeMatchCanalChatTemplate(template);
  if (!clean) throw new Error('Escreva a mensagem automática antes de guardar.');
  await settingsRef(db).set(
    {
      connectionTemplate: clean,
      updatedAt: FieldValue.serverTimestamp(),
      updatedByEmail: email,
    },
    { merge: true },
  );
  return clean;
}

export async function saveMatchBroadcastDraft(db: Firestore, draft: string, email: string): Promise<string> {
  const clean = sanitizeMatchBroadcastDraft(draft);
  await settingsRef(db).set(
    {
      broadcastDraft: clean,
      broadcastDraftUpdatedAt: FieldValue.serverTimestamp(),
      broadcastDraftUpdatedByEmail: email,
    },
    { merge: true },
  );
  return clean;
}
