/**
 * Persistência de planejamentos no Firestore
 */

import { collection, doc, getDoc, setDoc, deleteDoc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { PlannerSettings } from '@/types/videoLibrary';

// Estrutura: users/{userId}/libraries/{libraryId}/planners/{plannerId}

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
 * Converte PlannerSettings para formato Firestore (converte datas para Timestamp)
 */
function toFirestore(data: PlannerSettings): any {
  // Remover id antes de salvar (id é o documento ID, não deve estar nos dados)
  const { id, ...dataWithoutId } = data;
  
  const firestoreData = {
    ...dataWithoutId,
    libraryId: data.libraryId,
    name: data.name || '',
    startDateISO: data.startDateISO,
    endDateISO: data.endDateISO,
    allowedWeekdays: data.allowedWeekdays || [],
    hoursPerWeekday: data.hoursPerWeekday || {},
    selectedSubjects: data.selectedSubjects || [],
    subjectOrder: data.subjectOrder || [],
    createdAt: data.createdAt ? Timestamp.fromDate(new Date(data.createdAt)) : Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // Remover campos undefined antes de retornar
  return removeUndefined(firestoreData);
}

/**
 * Converte dados do Firestore para PlannerSettings (converte Timestamp para string ISO)
 */
function fromFirestore(data: any, id: string): PlannerSettings {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Carrega lista de planejamentos do usuário do Firestore
 * Estrutura: users/{userId}/libraries/{libraryId}/planners/{plannerId}
 */
export async function loadPlannersFromFirestore(libraryId: string): Promise<PlannerSettings[]> {
  try {
    const userId = getUserId();
    const plannersRef = collection(db, 'users', userId, 'libraries', libraryId, 'planners');
    const q = query(plannersRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const planners: PlannerSettings[] = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      planners.push(fromFirestore(data, docSnapshot.id));
    });

    return planners;
  } catch (error) {
    console.error('Erro ao carregar planejamentos do Firestore:', error);
    return [];
  }
}

/**
 * Carrega um planejamento específico por ID do Firestore
 */
export async function loadPlannerFromFirestore(libraryId: string, plannerId: string): Promise<PlannerSettings | null> {
  try {
    const userId = getUserId();
    const plannerRef = doc(db, 'users', userId, 'libraries', libraryId, 'planners', plannerId);
    const plannerDoc = await getDoc(plannerRef);

    if (plannerDoc.exists()) {
      return fromFirestore(plannerDoc.data(), plannerDoc.id);
    }
    return null;
  } catch (error) {
    console.error('Erro ao carregar planejamento do Firestore:', error);
    return null;
  }
}

/**
 * Salva um planejamento no Firestore (cria novo ou atualiza existente)
 */
export async function savePlannerToFirestore(settings: PlannerSettings): Promise<string> {
  try {
    const userId = getUserId();
    const plannersRef = collection(db, 'users', userId, 'libraries', settings.libraryId, 'planners');

    if (settings.id) {
      // Atualizar existente
      const plannerRef = doc(plannersRef, settings.id);
      const dataToSave = toFirestore(settings);
      await setDoc(plannerRef, dataToSave, { merge: true });
      return settings.id;
    } else {
      // Criar novo
      const dataToSave = toFirestore({
        ...settings,
        createdAt: new Date().toISOString(),
      });
      const newDocRef = doc(plannersRef);
      await setDoc(newDocRef, dataToSave);
      return newDocRef.id;
    }
  } catch (error) {
    console.error('Erro ao salvar planejamento no Firestore:', error);
    throw error;
  }
}

/**
 * Remove um planejamento do Firestore
 */
export async function deletePlannerFromFirestore(libraryId: string, plannerId: string): Promise<void> {
  try {
    const userId = getUserId();
    const plannerRef = doc(db, 'users', userId, 'libraries', libraryId, 'planners', plannerId);
    await deleteDoc(plannerRef);
  } catch (error) {
    console.error('Erro ao deletar planejamento do Firestore:', error);
    throw error;
  }
}
