import type { MatchChatAttachment } from '@/lib/match/matchChat';
import { auth } from '@/lib/firebase';
import type { MatchCommonality } from '@/lib/match/matchCommonalities';
import type { MatchViewerCard } from '@/lib/match/matchProfile';
import type { MatchRelation } from '@/lib/match/matchPair';

export type MatchPerson = {
  uid: string;
  card: MatchViewerCard;
  commonalities: { total: number; items: MatchCommonality[] };
  relation: MatchRelation;
  requestId?: string;
  reasonLabel?: string;
  message?: string;
  connectedAtMs?: number;
  sameCity?: boolean;
};

async function matchFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Faça login novamente.');
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & { ok?: boolean; error?: string; code?: string; result?: string };
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || 'Não foi possível continuar.') as Error & { code?: string; status?: number };
    error.code = data.code || data.result;
    error.status = response.status;
    throw error;
  }
  return data;
}

export function fetchDiscovery(cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return matchFetch<{ people: MatchPerson[]; nextCursor: string | null; passedUids: string[] }>(`/api/meta/match/discover${query}`);
}

export function saveMatchPass(toUid: string, action: 'pass' | 'clear') {
  return matchFetch<{ ok: true }>('/api/meta/match/passes', {
    method: 'POST',
    body: JSON.stringify({ toUid, action }),
  });
}

export function fetchMatchPerson(uid: string) {
  return matchFetch<{ person: MatchPerson }>(`/api/meta/match/people/${encodeURIComponent(uid)}`);
}

export type MatchConnectResult = 'interest_sent' | 'connected' | 'already_sent' | 'already_connected';

export function connectWithPerson(toUid: string) {
  return matchFetch<{ result: MatchConnectResult; requestId: string }>('/api/meta/match/requests', {
    method: 'POST',
    body: JSON.stringify({ toUid }),
  });
}

export function respondMatchRequest(input: { requestId: string; action: 'accept' | 'ignore' }) {
  return matchFetch<{ ok: true }>('/api/meta/match/requests/respond', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchIncomingRequests() {
  return matchFetch<{ people: MatchPerson[]; pendingCount: number }>('/api/meta/match/requests');
}

export function fetchMatchVisibility() {
  return matchFetch<{ discoverable: boolean }>('/api/meta/match/visibility');
}

export function setMatchDiscoverable(discoverable: boolean) {
  return matchFetch<{ discoverable: boolean }>('/api/meta/match/visibility', {
    method: 'POST',
    body: JSON.stringify({ discoverable }),
  });
}

export function fetchMyConnections(limit = 40) {
  return matchFetch<{ people: MatchPerson[] }>(`/api/meta/match/connections?limit=${limit}`);
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

export type MatchChatMessage = {
  id: string;
  senderUid: string;
  text: string;
  createdAtMs: number;
  attachment?: MatchChatAttachment;
  status?: 'sending' | 'sent' | 'error';
};

export function fetchMatchConversations() {
  return matchFetch<{ conversations: MatchChatPreview[]; unreadTotal: number }>('/api/meta/match/messages');
}

export function fetchMatchThread(pairKey: string, beforeMs?: number) {
  const query = beforeMs ? `?before=${beforeMs}` : '';
  return matchFetch<{
    otherUid: string;
    displayName: string;
    photoUrl?: string;
    messages: MatchChatMessage[];
    olderBeforeMs: number | null;
  }>(`/api/meta/match/messages/${encodeURIComponent(pairKey)}${query}`);
}

export function sendMatchMessage(pairKey: string, text: string, clientMessageId: string, file?: File) {
  if (!file) {
    return matchFetch<{ message: MatchChatMessage }>(`/api/meta/match/messages/${encodeURIComponent(pairKey)}`, {
      method: 'POST',
      body: JSON.stringify({ text, clientMessageId }),
    });
  }
  const body = new FormData();
  body.set('text', text);
  body.set('clientMessageId', clientMessageId);
  body.set('file', file);
  return matchFetch<{ message: MatchChatMessage }>(`/api/meta/match/messages/${encodeURIComponent(pairKey)}`, {
    method: 'POST',
    body,
  });
}

export function markMatchThreadRead(pairKey: string) {
  return matchFetch<{ ok: true }>(`/api/meta/match/messages/${encodeURIComponent(pairKey)}/read`, { method: 'POST' });
}
