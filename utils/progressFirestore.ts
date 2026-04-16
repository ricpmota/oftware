/**
 * Persistência de progresso no Firestore (por planejamento)
 */

import { doc, getDoc, setDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { ProgressMap, VideoProgress } from '@/types/videoLibrary';

/**
 * Obtém o UID do usuário autenticado
 */
function getUserId(): string {
  if (!auth.currentUser?.uid) {
    throw new Error('Usuário não autenticado');
  }
  return auth.currentUser.uid;
}

/**
 * Converte VideoProgress para formato Firestore
 */
function toFirestore(progress: VideoProgress): any {
  return {
    watched: progress.watched,
    lastPosition: progress.lastPosition,
    watchedSeconds: progress.watchedSeconds,
    duration: progress.duration,
    comments: progress.comments || null,
    updatedAt: Timestamp.fromMillis(progress.updatedAt),
  };
}

/**
 * Converte dados do Firestore para VideoProgress
 */
function fromFirestore(data: any): VideoProgress {
  return {
    watched: data.watched || false,
    lastPosition: data.lastPosition || 0,
    watchedSeconds: data.watchedSeconds || 0,
    duration: data.duration ?? null,
    comments: data.comments || undefined,
    updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
  };
}

/**
 * Carrega progresso de um planejamento do Firestore
 * Estrutura: users/{userId}/libraries/{libraryId}/planners/{plannerId}/progress/{videoId}
 */
export async function loadProgressFromFirestore(libraryId: string, plannerId: string): Promise<ProgressMap> {
  try {
    const userId = getUserId();
    const progressRef = collection(db, 'users', userId, 'libraries', libraryId, 'planners', plannerId, 'progress');
    const querySnapshot = await getDocs(progressRef);

    const progressMap: ProgressMap = {};
    querySnapshot.forEach((docSnapshot) => {
      const videoId = docSnapshot.id;
      const data = docSnapshot.data();
      progressMap[videoId] = fromFirestore(data);
    });

    return progressMap;
  } catch (error) {
    console.error('Erro ao carregar progresso do Firestore:', error);
    return {};
  }
}

/**
 * Salva progresso de um vídeo no Firestore
 */
export async function saveVideoProgressToFirestore(
  libraryId: string,
  plannerId: string,
  videoId: string,
  progress: VideoProgress
): Promise<void> {
  try {
    const userId = getUserId();
    const progressRef = doc(db, 'users', userId, 'libraries', libraryId, 'planners', plannerId, 'progress', videoId);
    const dataToSave = toFirestore(progress);
    await setDoc(progressRef, dataToSave);
  } catch (error) {
    console.error('Erro ao salvar progresso no Firestore:', error);
    // Não lançar erro para não interromper a reprodução
  }
}

/**
 * Salva múltiplos progressos no Firestore (batch)
 */
export async function saveProgressMapToFirestore(
  libraryId: string,
  plannerId: string,
  progressMap: ProgressMap
): Promise<void> {
  try {
    const userId = getUserId();
    const promises = Object.entries(progressMap).map(([videoId, progress]) => {
      const progressRef = doc(db, 'users', userId, 'libraries', libraryId, 'planners', plannerId, 'progress', videoId);
      const dataToSave = toFirestore(progress);
      return setDoc(progressRef, dataToSave);
    });
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Erro ao salvar progresso no Firestore:', error);
    // Não lançar erro para não interromper a reprodução
  }
}
