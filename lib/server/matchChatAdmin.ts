import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { chatAccess, prepareMessageText, type MatchChatAttachment } from '@/lib/match/matchChat';
import { buildMatchViewerCard, sanitizeMatchProfile } from '@/lib/match/matchProfile';
import { otherUid } from '@/lib/match/matchPair';
import { MATCH_BLOCKS, MATCH_CONNECTIONS } from '@/lib/server/matchSocialAdmin';

export const MATCH_CONVERSATIONS = 'match_conversations';
const PAGE = 40;
const LIST_LIMIT = 80;

export type MatchChatMessage = {
  id: string;
  senderUid: string;
  text: string;
  createdAtMs: number;
  attachment?: MatchChatAttachment;
};

function readAttachment(value: unknown): MatchChatAttachment | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  const url = String(data.url || '');
  const name = String(data.name || '').slice(0, 80);
  const contentType = String(data.contentType || '');
  const kind = data.kind === 'image' ? 'image' : data.kind === 'file' ? 'file' : null;
  if (!kind || !name || !/^https:\/\//i.test(url)) return undefined;
  return { url, name, contentType, kind };
}

function messageFromDoc(id: string, data: Record<string, unknown> | undefined): MatchChatMessage {
  const attachment = readAttachment(data?.attachment);
  return {
    id,
    senderUid: String(data?.senderUid || ''),
    text: String(data?.text || ''),
    createdAtMs: millis(data?.createdAt),
    ...(attachment ? { attachment } : {}),
  };
}

export type MatchChatPreview = {
  pairKey: string;
  otherUid: string;
  displayName: string;
  photoUrl?: string;
  lastText: string;
  lastSenderUid: string;
  lastMessageAtMs: number;
  unread: number;
};

function millis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return 0;
}

function validClientId(id: string): boolean {
  return /^[A-Za-z0-9_-]{8,80}$/.test(id);
}

async function peerCard(db: Firestore, uid: string) {
  const snap = await db.collection('match_profiles').doc(uid).get();
  if (!snap.exists) return { displayName: 'Conexão', photoUrl: undefined as string | undefined };
  const card = buildMatchViewerCard(sanitizeMatchProfile(snap.data(), snap.id), new Date(), 'public');
  return { displayName: card.displayName || 'Conexão', photoUrl: card.primaryPhoto?.url };
}

async function gate(db: Firestore, uid: string, pairKey: string) {
  const [connection, block] = await Promise.all([
    db.collection(MATCH_CONNECTIONS).doc(pairKey).get(),
    db.collection(MATCH_BLOCKS).doc(pairKey).get(),
  ]);
  const users = Array.isArray(connection.data()?.users) ? (connection.data()?.users as string[]) : [];
  const access = chatAccess({
    blocked: block.exists,
    connectionExists: connection.exists,
    connectionActive: connection.data()?.status === 'active',
    member: users.includes(uid),
  });
  return { access, users, other: otherUid(users, uid) };
}

export async function listMatchConversations(db: Firestore, uid: string): Promise<{ conversations: MatchChatPreview[]; unreadTotal: number }> {
  const snap = await db.collection(MATCH_CONVERSATIONS).where('users', 'array-contains', uid).limit(LIST_LIMIT).get();
  const conversations: MatchChatPreview[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const users = Array.isArray(data.users) ? (data.users as string[]) : [];
    const other = otherUid(users, uid);
    if (!other) continue;
    const [connection, block] = await Promise.all([
      db.collection(MATCH_CONNECTIONS).doc(doc.id).get(),
      db.collection(MATCH_BLOCKS).doc(doc.id).get(),
    ]);
    if (!connection.exists || connection.data()?.status !== 'active' || block.exists) continue;
    const peer = await peerCard(db, other);
    const unreadMap = data.unreadCountByUid && typeof data.unreadCountByUid === 'object' ? data.unreadCountByUid : {};
    conversations.push({
      pairKey: doc.id,
      otherUid: other,
      displayName: peer.displayName,
      ...(peer.photoUrl ? { photoUrl: peer.photoUrl } : {}),
      lastText: String(data.lastMessage?.text || ''),
      lastSenderUid: String(data.lastMessage?.senderUid || ''),
      lastMessageAtMs: millis(data.lastMessageAt),
      unread: Number(unreadMap[uid] || 0),
    });
  }
  conversations.sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs || a.pairKey.localeCompare(b.pairKey));
  return {
    conversations,
    unreadTotal: conversations.reduce((sum, item) => sum + item.unread, 0),
  };
}

export async function readMatchThread(
  db: Firestore,
  uid: string,
  pairKey: string,
  beforeMs?: number
): Promise<{ ok: true; otherUid: string; displayName: string; photoUrl?: string; messages: MatchChatMessage[]; olderBeforeMs: number | null } | { ok: false; code: string }> {
  const access = await gate(db, uid, pairKey);
  if (access.access !== 'ok' || !access.other) return { ok: false, code: access.access };
  let query = db.collection(MATCH_CONVERSATIONS).doc(pairKey).collection('messages').orderBy('createdAt', 'desc').limit(PAGE);
  if (beforeMs && beforeMs > 0) query = query.where('createdAt', '<', new Date(beforeMs));
  const snap = await query.get();
  const messages = snap.docs.map((doc) => messageFromDoc(doc.id, doc.data())).reverse();
  const peer = await peerCard(db, access.other);
  const oldest = messages[0]?.createdAtMs || 0;
  return {
    ok: true,
    otherUid: access.other,
    displayName: peer.displayName,
    ...(peer.photoUrl ? { photoUrl: peer.photoUrl } : {}),
    messages,
    olderBeforeMs: snap.size === PAGE && oldest > 0 ? oldest : null,
  };
}

export async function sendMatchChatMessage(
  db: Firestore,
  uid: string,
  pairKey: string,
  rawText: string,
  clientMessageId: string,
  attachment?: MatchChatAttachment
): Promise<{ ok: true; message: MatchChatMessage } | { ok: false; code: string }> {
  const text = prepareMessageText(rawText, Boolean(attachment));
  if (!text.ok || !validClientId(clientMessageId)) return { ok: false, code: 'invalid' };
  const preview = text.text || (attachment?.kind === 'image' ? 'Foto' : attachment?.name || 'Arquivo');
  const connectionRef = db.collection(MATCH_CONNECTIONS).doc(pairKey);
  const blockRef = db.collection(MATCH_BLOCKS).doc(pairKey);
  const convoRef = db.collection(MATCH_CONVERSATIONS).doc(pairKey);
  const messageRef = convoRef.collection('messages').doc(clientMessageId);

  return db.runTransaction(async (tx) => {
    const [connection, block, existing, convo] = await Promise.all([
      tx.get(connectionRef),
      tx.get(blockRef),
      tx.get(messageRef),
      tx.get(convoRef),
    ]);
    const users = Array.isArray(connection.data()?.users) ? (connection.data()?.users as string[]) : [];
    const access = chatAccess({
      blocked: block.exists,
      connectionExists: connection.exists,
      connectionActive: connection.data()?.status === 'active',
      member: users.includes(uid),
    });
    if (access !== 'ok') return { ok: false as const, code: access };
    if (existing.exists) {
      return {
        ok: true as const,
        message: messageFromDoc(existing.id, existing.data()),
      };
    }
    const other = otherUid(users, uid);
    if (!other) return { ok: false as const, code: 'forbidden' };
    const now = FieldValue.serverTimestamp();
    tx.set(messageRef, {
      senderUid: uid,
      text: text.text,
      createdAt: now,
      ...(attachment ? { attachment } : {}),
    });
    const shared = {
      pairKey,
      users,
      lastMessage: { text: preview, senderUid: uid, createdAt: now },
      lastMessageAt: now,
      updatedAt: now,
    };
    if (convo.exists) {
      tx.update(convoRef, { ...shared, [`unreadCountByUid.${other}`]: FieldValue.increment(1) });
    } else {
      tx.set(convoRef, { ...shared, unreadCountByUid: { [uid]: 0, [other]: 1 }, createdAt: now });
    }
    return {
      ok: true as const,
      message: {
        id: clientMessageId,
        senderUid: uid,
        text: text.text,
        createdAtMs: Date.now(),
        ...(attachment ? { attachment } : {}),
      },
    };
  });
}

export async function markMatchThreadRead(db: Firestore, uid: string, pairKey: string): Promise<{ ok: true } | { ok: false; code: string }> {
  const access = await gate(db, uid, pairKey);
  if (access.access !== 'ok') return { ok: false, code: access.access };
  const convoRef = db.collection(MATCH_CONVERSATIONS).doc(pairKey);
  const convo = await convoRef.get();
  if (!convo.exists) return { ok: true };
  await convoRef.update({
    [`unreadCountByUid.${uid}`]: 0,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
}
