/**
 * Persistência de progresso de vídeos no Firestore
 */

import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { ProgressMap } from '@/types/videoLibrary';

const COLLECTION_NAME = 'videoProgress';

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
 * Carrega progresso de vídeos do Firestore
 */
export async function loadProgressFromFirestore(): Promise<ProgressMap> {
  try {
    const userId = getUserId();
    const progressRef = doc(db, 'users', userId, COLLECTION_NAME, 'data');
    const progressDoc = await getDoc(progressRef);

    if (progressDoc.exists()) {
      const data = progressDoc.data();
      return data.progressMap || {};
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar progresso do Firestore:', error);
    return {};
  }
}

/**
 * Salva progresso de vídeos no Firestore
 */
export async function saveProgressToFirestore(progressMap: ProgressMap): Promise<void> {
  try {
    const userId = getUserId();
    const progressRef = doc(db, 'users', userId, COLLECTION_NAME, 'data');
    await setDoc(progressRef, {
      progressMap,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Erro ao salvar progresso no Firestore:', error);
    throw error;
  }
}
