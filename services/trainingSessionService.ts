/**
 * Serviço para gerenciar sessões de treino (Training Sessions)
 */

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  writeBatch,
} from 'firebase/firestore';
import type {
  TrainingSession,
  TrainingSessionExercise,
  TrainingReminderPrefs,
} from '@/types/trainingSession';

const COLLECTION_SESSIONS = 'trainingSessions';
const COLLECTION_REMINDER_PREFS = 'trainingReminderPrefs';

/** Retorna YYYY-MM-DD em horário local (evita problemas de fuso em getTodaySessions / calendário). */
function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const trainingSessionService = {
  /**
   * Criar uma nova sessão de treino
   */
  async createSession(
    session: Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const now = Timestamp.now();
    const sessionRef = doc(collection(db, COLLECTION_SESSIONS));
    
    const sessionData: Omit<TrainingSession, 'id'> = {
      ...session,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(sessionRef, {
      ...sessionData,
      createdAt: now,
      updatedAt: now,
    });

    return sessionRef.id;
  },

  /**
   * Criar sessão com exercícios
   */
  async createSessionWithExercises(
    session: Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'>,
    exercises: Omit<TrainingSessionExercise, 'order'>[]
  ): Promise<string> {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    const sessionRef = doc(collection(db, COLLECTION_SESSIONS));

    const sessionData: Omit<TrainingSession, 'id'> = {
      ...session,
      createdAt: now,
      updatedAt: now,
    };

    batch.set(sessionRef, {
      ...sessionData,
      createdAt: now,
      updatedAt: now,
    });

    // Adicionar exercícios como subcollection
    exercises.forEach((exercise, index) => {
      const exerciseRef = doc(
        collection(db, COLLECTION_SESSIONS, sessionRef.id, 'exercises')
      );
      // Remover campos undefined (Firestore não aceita undefined)
      const exerciseData: any = {
        order: index,
      };
      Object.keys(exercise).forEach((key) => {
        const value = (exercise as any)[key];
        if (value !== undefined) {
          exerciseData[key] = value;
        }
      });
      batch.set(exerciseRef, exerciseData);
    });

    await batch.commit();
    return sessionRef.id;
  },

  /**
   * Buscar sessão por ID
   */
  async getSession(sessionId: string): Promise<TrainingSession | null> {
    const sessionRef = doc(db, COLLECTION_SESSIONS, sessionId);
    const snapshot = await getDoc(sessionRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as TrainingSession;
  },

  /**
   * Buscar exercícios de uma sessão
   */
  async getSessionExercises(
    sessionId: string
  ): Promise<TrainingSessionExercise[]> {
    const exercisesRef = collection(
      db,
      COLLECTION_SESSIONS,
      sessionId,
      'exercises'
    );
    const snapshot = await getDocs(
      query(exercisesRef, orderBy('order', 'asc'))
    );

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id, // ID do documento Firestore (necessário para deletar)
        ...data,
        // Garantir que gifUrl seja preservado (pode estar como null ou undefined)
        gifUrl: data.gifUrl || null,
      } as TrainingSessionExercise & { id: string };
    });
  },

  /**
   * Buscar sessões de um paciente
   * Nota: Ordenação feita em memória para evitar necessidade de índices compostos
   */
  async getPatientSessions(
    patientId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      status?: TrainingSession['status'];
    }
  ): Promise<TrainingSession[]> {
    // Query base: apenas filtro por patientId (não precisa de índice composto)
    let q = query(
      collection(db, COLLECTION_SESSIONS),
      where('patientId', '==', patientId)
    );

    const snapshot = await getDocs(q);
    let sessions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as TrainingSession;
    });

    // Filtrar em memória (evita índices compostos)
    if (options?.startDate) {
      sessions = sessions.filter((s) => s.scheduledDate >= options.startDate!);
    }

    if (options?.endDate) {
      sessions = sessions.filter((s) => s.scheduledDate <= options.endDate!);
    }

    if (options?.status) {
      sessions = sessions.filter((s) => s.status === options.status);
    }

    // Ordenar em memória por data (mais recente primeiro)
    sessions.sort((a, b) => {
      if (a.scheduledDate < b.scheduledDate) return 1;
      if (a.scheduledDate > b.scheduledDate) return -1;
      return 0;
    });

    return sessions;
  },

  /**
   * Buscar sessões do dia atual (pode haver múltiplas sessões no mesmo dia)
   */
  async getTodaySessions(patientId: string): Promise<TrainingSession[]> {
    const today = new Date();
    const todayStr = toLocalYYYYMMDD(today);

    const q = query(
      collection(db, COLLECTION_SESSIONS),
      where('patientId', '==', patientId),
      where('scheduledDate', '==', todayStr)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as TrainingSession;
    });
  },

  /**
   * Buscar primeira sessão do dia atual (compatibilidade com código antigo)
   * @deprecated Use getTodaySessions() para suportar múltiplas sessões
   */
  async getTodaySession(patientId: string): Promise<TrainingSession | null> {
    const sessions = await this.getTodaySessions(patientId);
    return sessions.length > 0 ? sessions[0] : null;
  },

  /**
   * Atualizar sessão
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Omit<TrainingSession, 'id' | 'createdAt'>>
  ): Promise<void> {
    const sessionRef = doc(db, COLLECTION_SESSIONS, sessionId);
    await updateDoc(sessionRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  /**
   * Marcar sessão como feita ou pulada
   */
  async markSession(
    sessionId: string,
    status: 'done' | 'skipped',
    patientNotes?: string
  ): Promise<void> {
    await this.updateSession(sessionId, {
      status,
      patientNotes,
    });
  },

  /**
   * Marcar exercício individual como feito ou pulado
   */
  async markExercise(
    sessionId: string,
    exerciseDocId: string,
    status: 'done' | 'skipped'
  ): Promise<void> {
    const exerciseRef = doc(db, COLLECTION_SESSIONS, sessionId, 'exercises', exerciseDocId);
    await updateDoc(exerciseRef, {
      status,
      completedAt: Timestamp.now(),
    });
  },

  /**
   * Deletar sessão
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Deletar exercícios primeiro
    const exercisesRef = collection(
      db,
      COLLECTION_SESSIONS,
      sessionId,
      'exercises'
    );
    const exercisesSnapshot = await getDocs(exercisesRef);
    const batch = writeBatch(db);

    exercisesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Deletar sessão
    const sessionRef = doc(db, COLLECTION_SESSIONS, sessionId);
    batch.delete(sessionRef);

    await batch.commit();
  },

  /**
   * Salvar preferências de lembrete
   */
  async saveReminderPrefs(
    patientId: string,
    prefs: Omit<TrainingReminderPrefs, 'updatedAt'>
  ): Promise<void> {
    const prefsRef = doc(db, COLLECTION_REMINDER_PREFS, patientId);
    await setDoc(
      prefsRef,
      {
        ...prefs,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  },

  /**
   * Buscar preferências de lembrete
   */
  async getReminderPrefs(
    patientId: string
  ): Promise<TrainingReminderPrefs | null> {
    const prefsRef = doc(db, COLLECTION_REMINDER_PREFS, patientId);
    const snapshot = await getDoc(prefsRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      ...data,
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as TrainingReminderPrefs;
  },

  /**
   * Calcular aderência (done / (done + skipped + scheduled))
   */
  async calculateAdherence(
    patientId: string,
    startDate: string,
    endDate: string
  ): Promise<{ done: number; skipped: number; scheduled: number; rate: number }> {
    const sessions = await this.getPatientSessions(patientId, {
      startDate,
      endDate,
    });

    const done = sessions.filter((s) => s.status === 'done').length;
    const skipped = sessions.filter((s) => s.status === 'skipped').length;
    const scheduled = sessions.filter((s) => s.status === 'scheduled').length;

    const total = done + skipped + scheduled;
    const rate = total > 0 ? (done / total) * 100 : 0;

    return { done, skipped, scheduled, rate };
  },
};
