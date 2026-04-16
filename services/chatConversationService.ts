/**
 * Persistência de conversas do Chatbot Oftware (aba Apostila).
 * Firestore: users/{userId}/conversations/{conversationId}, subcollection messages.
 * Fallback: localStorage quando não autenticado (key: oftpay_chat_conversations_{userId} ou oftpay_chat_conversations_anon).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { ChatConversation, ChatMessage, ChatConversationSource } from '@/types/chatConversation';
import { DEFAULT_CONVERSATION_TITLE } from '@/types/chatConversation';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';
const LOCAL_STORAGE_PREFIX = 'oftpay_chat_';

function getUserIdOrNull(): string | null {
  return auth.currentUser?.uid ?? null;
}

function conversationsKey(userId: string): string {
  return `${LOCAL_STORAGE_PREFIX}conversations_${userId}`;
}

function messagesKey(conversationId: string): string {
  return `${LOCAL_STORAGE_PREFIX}messages_${conversationId}`;
}

// --- Firestore helpers ---

function conversationRef(userId: string, conversationId: string) {
  return doc(db, 'users', userId, CONVERSATIONS_COLLECTION, conversationId);
}

function messagesRef(userId: string, conversationId: string) {
  return collection(db, 'users', userId, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION);
}

function toFirestoreConversation(c: ChatConversation): Record<string, unknown> {
  return {
    userId: c.userId,
    title: c.title,
    createdAt: Timestamp.fromMillis(c.createdAt),
    updatedAt: Timestamp.fromMillis(c.updatedAt),
  };
}

function fromFirestoreConversation(id: string, data: Record<string, unknown>): ChatConversation {
  const createdAt = data.createdAt && typeof (data.createdAt as { toMillis?: () => number }).toMillis === 'function'
    ? (data.createdAt as { toMillis: () => number }).toMillis()
    : Date.now();
  const updatedAt = data.updatedAt && typeof (data.updatedAt as { toMillis?: () => number }).toMillis === 'function'
    ? (data.updatedAt as { toMillis: () => number }).toMillis()
    : Date.now();
  return {
    id,
    userId: String(data.userId ?? ''),
    title: String(data.title ?? DEFAULT_CONVERSATION_TITLE),
    createdAt,
    updatedAt,
  };
}

function toFirestoreMessage(m: ChatMessage): Record<string, unknown> {
  return {
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    createdAt: Timestamp.fromMillis(m.createdAt),
    sources: m.sources ?? null,
  };
}

function fromFirestoreMessage(id: string, data: Record<string, unknown>): ChatMessage {
  const createdAt = data.createdAt && typeof (data.createdAt as { toMillis?: () => number }).toMillis === 'function'
    ? (data.createdAt as { toMillis: () => number }).toMillis()
    : Date.now();
  const sources = Array.isArray(data.sources)
    ? (data.sources as ChatConversationSource[]).map((s) => ({
        title: String(s?.title ?? ''),
        ...(typeof (s as { docId?: string })?.docId === 'string' && { docId: (s as { docId: string }).docId }),
        ...(typeof (s as { id?: number })?.id === 'number' && { id: (s as { id: number }).id }),
        ...(typeof (s as { url?: string })?.url === 'string' && { url: (s as { url: string }).url }),
        ...(typeof (s as { snippet?: string })?.snippet === 'string' && { snippet: (s as { snippet: string }).snippet }),
        ...(typeof (s as { page?: number })?.page === 'number' && { page: (s as { page: number }).page }),
      }))
    : undefined;
  return {
    id,
    conversationId: String(data.conversationId ?? ''),
    role: (data.role === 'user' || data.role === 'assistant') ? data.role : 'user',
    content: String(data.content ?? ''),
    createdAt,
    sources: sources?.length ? sources : undefined,
  };
}

// --- LocalStorage fallback ---

function loadConversationsFromStorage(userId: string): ChatConversation[] {
  try {
    const raw = localStorage.getItem(conversationsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is ChatConversation =>
        c && typeof c === 'object' && typeof (c as ChatConversation).id === 'string' && typeof (c as ChatConversation).title === 'string'
    );
  } catch {
    return [];
  }
}

function saveConversationsToStorage(userId: string, list: ChatConversation[]): void {
  try {
    localStorage.setItem(conversationsKey(userId), JSON.stringify(list));
  } catch (e) {
    console.error('chatConversationService: save conversations to localStorage failed', e);
  }
}

function loadMessagesFromStorage(conversationId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(messagesKey(conversationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        m && typeof m === 'object' && typeof (m as ChatMessage).id === 'string' && ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant')
    );
  } catch {
    return [];
  }
}

function saveMessagesToStorage(conversationId: string, list: ChatMessage[]): void {
  try {
    localStorage.setItem(messagesKey(conversationId), JSON.stringify(list));
  } catch (e) {
    console.error('chatConversationService: save messages to localStorage failed', e);
  }
}

// --- Public API ---

/**
 * Lista conversas do usuário, ordenadas por updatedAt desc.
 */
export async function listConversations(userId: string): Promise<ChatConversation[]> {
  const uid = getUserIdOrNull();
  if (uid) {
    try {
      const convRef = collection(db, 'users', uid, CONVERSATIONS_COLLECTION);
      const snap = await getDocs(query(convRef, orderBy('updatedAt', 'desc'), limit(200)));
      const list: ChatConversation[] = [];
      snap.docs.forEach((d) => list.push(fromFirestoreConversation(d.id, d.data() as Record<string, unknown>)));
      return list;
    } catch (e) {
      console.error('chatConversationService: listConversations Firestore error', e);
      return loadConversationsFromStorage(userId);
    }
  }
  const list = loadConversationsFromStorage(userId);
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Retorna uma conversa por id (metadados apenas).
 */
export async function getConversation(userId: string, conversationId: string): Promise<ChatConversation | null> {
  const uid = getUserIdOrNull();
  if (uid) {
    try {
      const snap = await getDoc(conversationRef(uid, conversationId));
      if (!snap.exists()) return null;
      return fromFirestoreConversation(snap.id, snap.data() as Record<string, unknown>);
    } catch (e) {
      console.error('chatConversationService: getConversation Firestore error', e);
    }
  }
  const list = loadConversationsFromStorage(userId);
  return list.find((c) => c.id === conversationId) ?? null;
}

/**
 * Retorna mensagens da conversa, ordenadas por createdAt asc.
 */
export async function getMessages(userId: string, conversationId: string): Promise<ChatMessage[]> {
  const uid = getUserIdOrNull();
  if (uid) {
    try {
      const msgRef = messagesRef(uid, conversationId);
      const snap = await getDocs(query(msgRef, orderBy('createdAt', 'asc')));
      const list: ChatMessage[] = [];
      snap.docs.forEach((d) => list.push(fromFirestoreMessage(d.id, d.data() as Record<string, unknown>)));
      return list;
    } catch (e) {
      console.error('chatConversationService: getMessages Firestore error', e);
      return loadMessagesFromStorage(conversationId);
    }
  }
  const list = loadMessagesFromStorage(conversationId);
  return list.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Cria uma nova conversa vazia e retorna ela.
 */
export async function createConversation(userId: string): Promise<ChatConversation> {
  const now = Date.now();
  const id = `conv_${now}_${Math.random().toString(36).slice(2, 10)}`;
  const conv: ChatConversation = {
    id,
    userId,
    title: DEFAULT_CONVERSATION_TITLE,
    createdAt: now,
    updatedAt: now,
  };

  const uid = getUserIdOrNull();
  if (uid) {
    try {
      await setDoc(conversationRef(uid, id), toFirestoreConversation(conv));
      return conv;
    } catch (e) {
      console.error('chatConversationService: createConversation Firestore error', e);
    }
  }
  const list = loadConversationsFromStorage(userId);
  list.unshift(conv);
  saveConversationsToStorage(userId, list);
  return conv;
}

/**
 * Atualiza o título da conversa.
 */
export async function renameConversation(userId: string, conversationId: string, title: string): Promise<void> {
  const trimmed = title.trim() || DEFAULT_CONVERSATION_TITLE;
  const uid = getUserIdOrNull();
  if (uid) {
    try {
      const ref = conversationRef(uid, conversationId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await setDoc(ref, { title: trimmed, updatedAt: Timestamp.now() }, { merge: true });
      }
      return;
    } catch (e) {
      console.error('chatConversationService: renameConversation Firestore error', e);
    }
  }
  const list = loadConversationsFromStorage(userId);
  const idx = list.findIndex((c) => c.id === conversationId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], title: trimmed, updatedAt: Date.now() };
    saveConversationsToStorage(userId, list);
  }
}

/**
 * Remove a conversa e todas as mensagens.
 */
export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const uid = getUserIdOrNull();
  if (uid) {
    try {
      const msgRef = messagesRef(uid, conversationId);
      const snap = await getDocs(msgRef);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(conversationRef(uid, conversationId));
      await batch.commit();
      return;
    } catch (e) {
      console.error('chatConversationService: deleteConversation Firestore error', e);
    }
  }
  const list = loadConversationsFromStorage(userId).filter((c) => c.id !== conversationId);
  saveConversationsToStorage(userId, list);
  try {
    localStorage.removeItem(messagesKey(conversationId));
  } catch {
    // ignore
  }
}

/**
 * Adiciona uma mensagem e atualiza updatedAt da conversa.
 */
export async function appendMessage(
  userId: string,
  conversationId: string,
  message: Omit<ChatMessage, 'id' | 'conversationId' | 'createdAt'> & { createdAt?: number }
): Promise<ChatMessage> {
  const now = message.createdAt ?? Date.now();
  const id = `msg_${now}_${Math.random().toString(36).slice(2, 10)}`;
  const full: ChatMessage = {
    id,
    conversationId,
    role: message.role,
    content: message.content,
    createdAt: now,
    sources: message.sources,
  };

  const uid = getUserIdOrNull();
  if (uid) {
    try {
      const msgRef = messagesRef(uid, conversationId);
      const docRef = await addDoc(msgRef, toFirestoreMessage(full));
      const created = { ...full, id: docRef.id };
      await setDoc(conversationRef(uid, conversationId), { updatedAt: Timestamp.fromMillis(now) }, { merge: true });
      return created;
    } catch (e) {
      console.error('chatConversationService: appendMessage Firestore error', e);
    }
  }
  const messages = loadMessagesFromStorage(conversationId);
  messages.push(full);
  saveMessagesToStorage(conversationId, messages);
  const list = loadConversationsFromStorage(userId);
  const idx = list.findIndex((c) => c.id === conversationId);
  if (idx >= 0) {
    const updated = { ...list[idx], updatedAt: now };
    list.splice(idx, 1);
    list.unshift(updated);
    saveConversationsToStorage(userId, list);
  }
  return full;
}

/**
 * Atualiza updatedAt da conversa (ex.: após receber resposta).
 */
export async function touchConversation(userId: string, conversationId: string): Promise<void> {
  const now = Date.now();
  const uid = getUserIdOrNull();
  if (uid) {
    try {
      await setDoc(conversationRef(uid, conversationId), { updatedAt: Timestamp.fromMillis(now) }, { merge: true });
      return;
    } catch (e) {
      console.error('chatConversationService: touchConversation Firestore error', e);
    }
  }
  const list = loadConversationsFromStorage(userId);
  const conv = list.find((c) => c.id === conversationId);
  if (conv) {
    const updated = { ...conv, updatedAt: now };
    const rest = list.filter((c) => c.id !== conversationId);
    saveConversationsToStorage(userId, [updated, ...rest]);
  }
}
