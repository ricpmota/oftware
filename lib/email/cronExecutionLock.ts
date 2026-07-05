import type { Firestore } from 'firebase-admin/firestore';

const DEFAULT_TTL_MS = 4 * 60 * 1000;

export type CronLockResult =
  | { acquired: true; instanceId: string }
  | { acquired: false; reason: string };

/** Impede execuções concorrentes do mesmo cron (ex.: Vercel a cada 5 min). */
export async function acquireCronLock(
  db: Firestore,
  lockId: string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<CronLockResult> {
  const lockRef = db.collection('cron_locks').doc(lockId);
  const now = Date.now();
  const instanceId = `${now}-${Math.random().toString(36).slice(2, 10)}`;

  const acquired = await db.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef);
    const data = snap.data();
    const expiresAtMs =
      data?.expiresAt?.toMillis?.() ??
      (data?.expiresAt instanceof Date ? data.expiresAt.getTime() : 0);

    if (expiresAtMs > now) {
      return false;
    }

    tx.set(lockRef, {
      lockedAt: new Date(now),
      expiresAt: new Date(now + ttlMs),
      instanceId,
    });
    return true;
  });

  if (!acquired) {
    return {
      acquired: false,
      reason: 'Execução anterior ainda em andamento (lock ativo)',
    };
  }

  return { acquired: true, instanceId };
}

export async function releaseCronLock(
  db: Firestore,
  lockId: string,
  instanceId: string
): Promise<void> {
  const lockRef = db.collection('cron_locks').doc(lockId);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(lockRef);
      if (!snap.exists) return;
      const data = snap.data();
      if (data?.instanceId === instanceId) {
        tx.delete(lockRef);
      }
    });
  } catch {
    /* lock expira pelo TTL */
  }
}
