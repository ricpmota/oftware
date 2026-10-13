'use client';

import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MatchChatMessage } from '@/services/matchSocialClient';

export function subscribeMatchMessages(pairKey: string, onMessages: (rows: MatchChatMessage[]) => void) {
  const live = query(collection(db, 'match_conversations', pairKey, 'messages'), orderBy('createdAt', 'desc'), limit(40));
  return onSnapshot(
    live,
    (snap) => {
      onMessages(
        snap.docs
          .map((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt;
            const raw = data.attachment as { url?: string; name?: string; contentType?: string; kind?: string } | undefined;
            const kind: 'image' | 'file' | null = raw?.kind === 'image' ? 'image' : raw?.kind === 'file' ? 'file' : null;
            const attachment =
              kind && raw?.url && /^https:\/\//i.test(raw.url)
                ? {
                    url: raw.url,
                    name: String(raw.name || 'Arquivo'),
                    contentType: String(raw.contentType || ''),
                    kind,
                  }
                : undefined;
            return {
              id: doc.id,
              senderUid: String(data.senderUid || ''),
              text: String(data.text || ''),
              createdAtMs: createdAt && typeof createdAt.toMillis === 'function' ? createdAt.toMillis() : Date.now(),
              status: 'sent' as const,
              ...(attachment ? { attachment } : {}),
            };
          })
          .reverse()
      );
    },
    () => undefined
  );
}

export function subscribeMatchConversationList(uid: string, onChange: () => void) {
  const live = query(collection(db, 'match_conversations'), where('users', 'array-contains', uid), limit(40));
  return onSnapshot(live, () => onChange(), () => undefined);
}
