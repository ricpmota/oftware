/**
 * Persistência do progresso OftPay (vídeos assistidos) no Firestore, por usuário e curso.
 * Estrutura: users/{userId}/oftpay_progress/{courseId}
 */

import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { ProgressMap, VideoProgress } from '@/types/videoLibrary';

const COLLECTION = 'oftpay_progress';

function getUserId(): string {
  if (!auth.currentUser?.uid) throw new Error('Usuário não autenticado');
  return auth.currentUser.uid;
}

function toFirestoreProgress(p: VideoProgress): Record<string, unknown> {
  return {
    watched: p.watched,
    lastPosition: p.lastPosition,
    watchedSeconds: p.watchedSeconds,
    duration: p.duration ?? null,
    comments: p.comments ?? null,
    rating: p.rating != null ? p.rating : null,
    updatedAt: Timestamp.fromMillis(p.updatedAt),
  };
}

function fromFirestoreProgress(data: Record<string, unknown>): VideoProgress {
  const updatedAt = data.updatedAt && typeof (data.updatedAt as { toMillis?: () => number }).toMillis === 'function'
    ? (data.updatedAt as { toMillis: () => number }).toMillis()
    : Date.now();
  const ratingVal = data.rating != null ? Number(data.rating) : undefined;
  return {
    watched: Boolean(data.watched),
    lastPosition: Number(data.lastPosition) || 0,
    watchedSeconds: Number(data.watchedSeconds) || 0,
    duration: data.duration != null ? Number(data.duration) : null,
    comments: data.comments != null ? String(data.comments) : undefined,
    rating: ratingVal != null && ratingVal >= 1 && ratingVal <= 5 ? Math.round(ratingVal) : undefined,
    updatedAt,
  };
}

/**
 * Carrega o progresso do curso do Firestore (perfil do usuário).
 */
export async function loadOftPayProgressFromFirestore(courseId: string): Promise<ProgressMap> {
  try {
    const userId = getUserId();
    const ref = doc(db, 'users', userId, COLLECTION, courseId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return {};
    const data = snap.data();
    const raw = data?.progressMap as Record<string, Record<string, unknown>> | undefined;
    if (!raw || typeof raw !== 'object') return {};
    const progressMap: ProgressMap = {};
    for (const [videoId, entry] of Object.entries(raw)) {
      if (entry && typeof entry === 'object') {
        progressMap[videoId] = fromFirestoreProgress(entry as Record<string, unknown>);
      }
    }
    return progressMap;
  } catch (e) {
    console.error('Erro ao carregar progresso OftPay do Firestore:', e);
    return {};
  }
}

/**
 * Salva o progresso do curso no Firestore (perfil do usuário).
 */
export async function saveOftPayProgressToFirestore(courseId: string, progressMap: ProgressMap): Promise<void> {
  try {
    const userId = getUserId();
    const ref = doc(db, 'users', userId, COLLECTION, courseId);
    const progressMapSerialized: Record<string, Record<string, unknown>> = {};
    for (const [videoId, p] of Object.entries(progressMap)) {
      progressMapSerialized[videoId] = toFirestoreProgress(p);
    }
    await setDoc(ref, { progressMap: progressMapSerialized }, { merge: true });
  } catch (e) {
    console.error('Erro ao salvar progresso OftPay no Firestore:', e);
  }
}
