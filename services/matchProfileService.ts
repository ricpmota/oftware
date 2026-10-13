import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import { sanitizeMatchProfile, type MatchProfileDraft } from '@/lib/match/matchProfile';

export const MATCH_PROFILES_COLLECTION = 'match_profiles';

function requireOwnUid(): string {
  const uid = auth.currentUser?.uid || '';
  if (!isValidFirebaseAuthUid(uid)) {
    throw new Error('Faça login novamente.');
  }
  return uid;
}

export async function getMyMatchProfile(): Promise<MatchProfileDraft | null> {
  const uid = requireOwnUid();
  const snap = await getDoc(doc(db, MATCH_PROFILES_COLLECTION, uid));
  if (!snap.exists()) return null;
  return sanitizeMatchProfile(snap.data(), uid);
}

export async function saveMyMatchProfile(
  draft: MatchProfileDraft,
  options?: { isNew?: boolean }
): Promise<MatchProfileDraft> {
  const uid = requireOwnUid();
  const clean = sanitizeMatchProfile(draft, uid);
  const payload: Record<string, unknown> = {
    ...clean,
    updatedAt: serverTimestamp(),
  };
  if (options?.isNew) payload.createdAt = serverTimestamp();
  await setDoc(doc(db, MATCH_PROFILES_COLLECTION, uid), payload, { merge: true });
  return clean;
}
