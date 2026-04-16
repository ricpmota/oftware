/**
 * Persistência de cronogramas no Firestore
 */

import { doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Schedule } from '@/types/videoLibrary';

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
 * Converte Schedule para formato Firestore
 */
function toFirestore(schedule: Schedule): any {
  const firestoreData = {
    plannerId: schedule.plannerId,
    planInput: schedule.planInput,
    settings: schedule.settings,
    days: schedule.days,
    generatedAt: Timestamp.fromDate(new Date(schedule.generatedAt)),
    version: schedule.version || '1.0',
  };
  
  return removeUndefined(firestoreData);
}

/**
 * Converte dados do Firestore para Schedule
 */
function fromFirestore(data: any): Schedule {
  return {
    plannerId: data.plannerId,
    planInput: data.planInput,
    settings: data.settings,
    days: data.days || [],
    generatedAt: data.generatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    version: data.version || '1.0',
  };
}

/**
 * Carrega cronograma de um planejamento do Firestore
 * Estrutura: users/{userId}/libraries/{libraryId}/planners/{plannerId}/schedule
 */
export async function loadScheduleFromFirestore(libraryId: string, plannerId: string): Promise<Schedule | null> {
  try {
    const userId = getUserId();
    const scheduleRef = doc(db, 'users', userId, 'libraries', libraryId, 'planners', plannerId, 'schedule', 'current');
    const scheduleDoc = await getDoc(scheduleRef);

    if (scheduleDoc.exists()) {
      return fromFirestore(scheduleDoc.data());
    }
    return null;
  } catch (error) {
    console.error('Erro ao carregar cronograma do Firestore:', error);
    return null;
  }
}

/**
 * Salva cronograma de um planejamento no Firestore
 */
export async function saveScheduleToFirestore(libraryId: string, schedule: Schedule): Promise<void> {
  try {
    const userId = getUserId();
    const scheduleRef = doc(db, 'users', userId, 'libraries', libraryId, 'planners', schedule.plannerId, 'schedule', 'current');
    const dataToSave = toFirestore(schedule);
    await setDoc(scheduleRef, dataToSave);
  } catch (error) {
    console.error('Erro ao salvar cronograma no Firestore:', error);
    throw error;
  }
}

/**
 * Remove cronograma de um planejamento do Firestore
 */
export async function deleteScheduleFromFirestore(libraryId: string, plannerId: string): Promise<void> {
  try {
    const userId = getUserId();
    const scheduleRef = doc(db, 'users', userId, 'libraries', libraryId, 'planners', plannerId, 'schedule', 'current');
    await deleteDoc(scheduleRef);
  } catch (error) {
    console.error('Erro ao deletar cronograma do Firestore:', error);
    throw error;
  }
}
