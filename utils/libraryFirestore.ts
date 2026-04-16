/**
 * Persistência de bibliotecas no Firestore
 */

import { collection, doc, getDoc, setDoc, deleteDoc, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { VideoLibrary } from '@/types/videoLibrary';

const COLLECTION_NAME = 'libraries';

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
 * Remove campos undefined de um objeto (Firestore não aceita undefined)
 */
function removeUndefined(obj: any): any {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

/**
 * Converte VideoLibrary para formato Firestore
 */
function toFirestore(data: VideoLibrary): any {
  const { id, ...dataWithoutId } = data;
  
  const firestoreData = {
    ...dataWithoutId,
    name: data.name || 'Biblioteca sem nome',
    videos: data.videos || [],
    createdAt: data.createdAt ? Timestamp.fromDate(new Date(data.createdAt)) : Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  return removeUndefined(firestoreData);
}

/**
 * Converte dados do Firestore para VideoLibrary
 */
function fromFirestore(data: any, id: string): VideoLibrary {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Carrega lista de bibliotecas do usuário do Firestore
 */
export async function loadLibrariesFromFirestore(): Promise<VideoLibrary[]> {
  try {
    const userId = getUserId();
    const librariesRef = collection(db, 'users', userId, COLLECTION_NAME);
    const q = query(librariesRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const libraries: VideoLibrary[] = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      libraries.push(fromFirestore(data, docSnapshot.id));
    });

    return libraries;
  } catch (error) {
    console.error('Erro ao carregar bibliotecas do Firestore:', error);
    return [];
  }
}

/**
 * Carrega uma biblioteca específica por ID do Firestore
 */
export async function loadLibraryFromFirestore(libraryId: string): Promise<VideoLibrary | null> {
  try {
    const userId = getUserId();
    const libraryRef = doc(db, 'users', userId, COLLECTION_NAME, libraryId);
    const libraryDoc = await getDoc(libraryRef);

    if (libraryDoc.exists()) {
      return fromFirestore(libraryDoc.data(), libraryDoc.id);
    }
    return null;
  } catch (error) {
    console.error('Erro ao carregar biblioteca do Firestore:', error);
    return null;
  }
}

/**
 * Salva uma biblioteca no Firestore (cria novo ou atualiza existente)
 */
export async function saveLibraryToFirestore(library: VideoLibrary): Promise<string> {
  try {
    const userId = getUserId();
    const librariesRef = collection(db, 'users', userId, COLLECTION_NAME);

    if (library.id) {
      // Atualizar existente
      const libraryRef = doc(librariesRef, library.id);
      const dataToSave = toFirestore(library);
      await setDoc(libraryRef, dataToSave, { merge: true });
      return library.id;
    } else {
      // Criar novo
      const dataToSave = toFirestore({
        ...library,
        createdAt: new Date().toISOString(),
      });
      const newDocRef = doc(librariesRef);
      await setDoc(newDocRef, dataToSave);
      return newDocRef.id;
    }
  } catch (error) {
    console.error('Erro ao salvar biblioteca no Firestore:', error);
    throw error;
  }
}

/**
 * Remove uma biblioteca do Firestore
 */
export async function deleteLibraryFromFirestore(libraryId: string): Promise<void> {
  try {
    const userId = getUserId();
    const libraryRef = doc(db, 'users', userId, COLLECTION_NAME, libraryId);
    await deleteDoc(libraryRef);
  } catch (error) {
    console.error('Erro ao deletar biblioteca do Firestore:', error);
    throw error;
  }
}
