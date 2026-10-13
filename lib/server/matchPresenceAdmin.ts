import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import { MATCH_VISITS } from '@/lib/server/matchCanalChatSettings';

const TOUCH_MS = 2 * 60 * 1000;
const COUNT_MS = 15 * 60 * 1000;

function millis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return 0;
}

/** Registra entrada em /meta/match. Não conta de novo se a pessoa acabou de abrir a página. */
export async function recordMatchPresence(
  db: Firestore,
  input: { uid: string; displayName: string; email: string },
): Promise<void> {
  if (!isValidFirebaseAuthUid(input.uid)) return;
  const ref = db.collection(MATCH_VISITS).doc(input.uid);
  const snap = await ref.get();
  const now = Date.now();
  const last = millis(snap.data()?.lastSeenAt);
  if (snap.exists && last > 0 && now - last < TOUCH_MS) return;

  const displayName = input.displayName.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase().slice(0, 160);
  const increment = !snap.exists || last <= 0 || now - last >= COUNT_MS;
  await ref.set(
    {
      uid: input.uid,
      ...(displayName ? { displayName } : {}),
      ...(email ? { email } : {}),
      lastSeenAt: FieldValue.serverTimestamp(),
      ...(!snap.exists ? { firstSeenAt: FieldValue.serverTimestamp(), visitCount: 1 } : {}),
      ...(increment && snap.exists ? { visitCount: FieldValue.increment(1) } : {}),
    },
    { merge: true },
  );
}
