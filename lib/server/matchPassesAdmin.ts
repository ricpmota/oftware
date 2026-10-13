import { FieldValue, type Firestore } from 'firebase-admin/firestore';

const MATCH_PASSES = 'match_passes';

function cleanUids(value: unknown, selfUid: string): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0 && item !== selfUid);
}

export async function listMatchPasses(db: Firestore, uid: string): Promise<string[]> {
  const snap = await db.collection(MATCH_PASSES).doc(uid).get();
  return cleanUids(snap.data()?.uids, uid);
}

export async function rememberMatchPass(db: Firestore, uid: string, otherUid: string): Promise<void> {
  if (!uid || !otherUid || uid === otherUid) return;
  await db.collection(MATCH_PASSES).doc(uid).set(
    {
      uids: FieldValue.arrayUnion(otherUid),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function forgetMatchPass(db: Firestore, uid: string, otherUid: string): Promise<void> {
  if (!uid || !otherUid || uid === otherUid) return;
  await db.collection(MATCH_PASSES).doc(uid).set(
    {
      uids: FieldValue.arrayRemove(otherUid),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
