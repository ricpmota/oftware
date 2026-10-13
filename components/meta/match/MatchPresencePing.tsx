'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

/** Uma marcação por abertura autenticada. O servidor agrupa visitas seguidas. */
export function MatchPresencePing() {
  useEffect(() => {
    let sent = false;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user || sent) return;
      sent = true;
      void user
        .getIdToken()
        .then((token) =>
          fetch('/api/meta/match/presence', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }),
        )
        .catch(() => undefined);
    });
    return () => unsub();
  }, []);
  return null;
}
