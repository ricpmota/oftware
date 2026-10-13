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
  deleteField,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  writeBatch,
  onSnapshot,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import type {
  TrainingSession,
  TrainingSessionExercise,
  TrainingReminderPrefs,
} from '@/types/trainingSession';
import {
  normalizeTrainingExercisePrescription,
  serializeTrainingPrescription,
} from '@/lib/personal/trainingExerciseSeries';
import { sanitizeTrainerNote } from '@/lib/personal/workoutDraft';
import { isTrainingSessionActive } from '@/lib/personal/trainingSessionActive';
import {
  applySeriesPrescriptionPatchBySeriesId,
  applySeriesPrescriptionToExercise,
  findMatchingExercise,
  sanitizeSeriesPrescriptionPatch,
  selectUpcomingRecurrenceSessions,
  type SeriesPrescriptionPatch,
  type SeriesPrescriptionTarget,
} from '@/lib/personal/propagateSeriesPrescription';
import {
  updatePendingExecutedSeriesPrescriptionByOrder,
} from '@/lib/personal/trainingExecutionSeries';
import { TrainingExerciseExecutionService } from '@/services/trainingExerciseExecutionService';

const COLLECTION_SESSIONS = 'trainingSessions';
const COLLECTION_REMINDER_PREFS = 'trainingReminderPrefs';

function isMissingCompositeIndexError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message) : '';
  return code === 'failed-precondition' || /requires an index/i.test(message);
}

function mapSessionDoc(id: string, data: DocumentData): TrainingSession {
  return {
    id,
    ...data,
    active: data.active !== false,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  } as TrainingSession;
}

function mapSessionExerciseDoc(
  docSnap: QueryDocumentSnapshot<DocumentData>
): TrainingSessionExercise & { id: string } {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    prescription: normalizeTrainingExercisePrescription(data.prescription),
    trainerNote: sanitizeTrainerNote(data.trainerNote),
    gifUrl: data.gifUrl || null,
  } as TrainingSessionExercise & { id: string };
}

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
      active: session.active !== false,
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
      active: session.active !== false,
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
      exerciseData.prescription = serializeTrainingPrescription(exercise.prescription);
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

    return mapSessionDoc(snapshot.id, snapshot.data());
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

    return snapshot.docs.map(mapSessionExerciseDoc);
  },

  subscribeSessionExercises(
    sessionId: string,
    onChange: (exercises: TrainingSessionExercise[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!sessionId) return () => undefined;
    const exercisesRef = collection(
      db,
      COLLECTION_SESSIONS,
      sessionId,
      'exercises'
    );
    return onSnapshot(
      query(exercisesRef, orderBy('order', 'asc')),
      (snapshot) => {
        onChange(snapshot.docs.map(mapSessionExerciseDoc));
      },
      (error) => {
        console.error('Erro ao acompanhar exercícios da sessão:', error);
        onError?.(error);
      }
    );
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
      /** Só treinos ligados (Hoje / Cronograma). Treinos Salvos não usa este filtro. */
      activeOnly?: boolean;
    }
  ): Promise<TrainingSession[]> {
    // Query base: apenas filtro por patientId (não precisa de índice composto)
    let q = query(
      collection(db, COLLECTION_SESSIONS),
      where('patientId', '==', patientId)
    );

    const snapshot = await getDocs(q);
    let sessions = snapshot.docs.map((docSnap) => mapSessionDoc(docSnap.id, docSnap.data()));

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

    if (options?.activeOnly) {
      sessions = sessions.filter(isTrainingSessionActive);
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
   * Sessões de um paciente no intervalo YYYY-MM-DD (query Firestore, não lê o histórico inteiro).
   * Índice: trainingSessions (patientId ASC, scheduledDate ASC) em firestore.indexes.json.
   * Se o índice ainda não estiver Enabled, filtra em memória (mesmo caminho do Histórico).
   */
  async getPatientSessionsInDateRange(
    patientId: string,
    startDate: string,
    endDate: string
  ): Promise<TrainingSession[]> {
    try {
      const q = query(
        collection(db, COLLECTION_SESSIONS),
        where('patientId', '==', patientId),
        where('scheduledDate', '>=', startDate),
        where('scheduledDate', '<=', endDate)
      );
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map((docSnap) => mapSessionDoc(docSnap.id, docSnap.data()));
      sessions.sort((a, b) => {
        if (a.scheduledDate < b.scheduledDate) return 1;
        if (a.scheduledDate > b.scheduledDate) return -1;
        return 0;
      });
      return sessions;
    } catch (error) {
      if (!isMissingCompositeIndexError(error)) throw error;
      console.warn(
        '[trainingSessionService] índice trainingSessions (patientId, scheduledDate) indisponível; filtrando em memória'
      );
      return trainingSessionService.getPatientSessions(patientId, { startDate, endDate });
    }
  },

  /**
   * Buscar sessões de uma data específica (YYYY-MM-DD local).
   * Pode haver múltiplas sessões no mesmo dia.
   */
  async getSessionsForDate(patientId: string, dateStr: string): Promise<TrainingSession[]> {
    const q = query(
      collection(db, COLLECTION_SESSIONS),
      where('patientId', '==', patientId),
      where('scheduledDate', '==', dateStr)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs
      .map((docSnap) => mapSessionDoc(docSnap.id, docSnap.data()))
      .filter(isTrainingSessionActive);
  },

  /**
   * Buscar sessões do dia atual (pode haver múltiplas sessões no mesmo dia)
   */
  async getTodaySessions(patientId: string): Promise<TrainingSession[]> {
    return this.getSessionsForDate(patientId, toLocalYYYYMMDD(new Date()));
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
   * Ativar ou desativar várias sessões (série recorrente ou treino único).
   */
  async setSessionsActive(sessionIds: string[], active: boolean): Promise<void> {
    const ids = [...new Set(sessionIds.filter(Boolean))];
    if (ids.length === 0) return;
    const now = Timestamp.now();
    const CHUNK = 450;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const batch = writeBatch(db);
      for (const id of ids.slice(i, i + CHUNK)) {
        batch.update(doc(db, COLLECTION_SESSIONS, id), { active, updatedAt: now });
      }
      await batch.commit();
    }
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

  async unmarkExercise(sessionId: string, exerciseDocId: string): Promise<void> {
    const exerciseRef = doc(db, COLLECTION_SESSIONS, sessionId, 'exercises', exerciseDocId);
    await updateDoc(exerciseRef, {
      status: deleteField(),
      completedAt: deleteField(),
    });
  },

  async updateExerciseTrainerNote(
    sessionId: string,
    exerciseDocId: string,
    trainerNote: string
  ): Promise<void> {
    const exerciseRef = doc(db, COLLECTION_SESSIONS, sessionId, 'exercises', exerciseDocId);
    await updateDoc(exerciseRef, {
      trainerNote: sanitizeTrainerNote(trainerNote) || '',
    });
  },

  async updateExercisePrescription(
    sessionId: string,
    exerciseDocId: string,
    prescription: TrainingSessionExercise['prescription']
  ): Promise<void> {
    const exerciseRef = doc(db, COLLECTION_SESSIONS, sessionId, 'exercises', exerciseDocId);
    await updateDoc(exerciseRef, {
      prescription: serializeTrainingPrescription(prescription),
    });
  },

  async updateExerciseOrder(
    sessionId: string,
    exerciseDocId: string,
    order: number
  ): Promise<void> {
    const exerciseRef = doc(db, COLLECTION_SESSIONS, sessionId, 'exercises', exerciseDocId);
    await updateDoc(exerciseRef, { order });
  },

  async addSessionExercise(
    sessionId: string,
    exercise: Omit<TrainingSessionExercise, 'id'>
  ): Promise<string> {
    const exerciseRef = doc(collection(db, COLLECTION_SESSIONS, sessionId, 'exercises'));
    const exerciseData: Record<string, unknown> = {};
    Object.keys(exercise).forEach((key) => {
      const value = (exercise as Record<string, unknown>)[key];
      if (value !== undefined) exerciseData[key] = value;
    });
    exerciseData.prescription = serializeTrainingPrescription(exercise.prescription);
    await setDoc(exerciseRef, exerciseData);
    await this.updateSession(sessionId, {});
    return exerciseRef.id;
  },

  async deleteSessionExercise(sessionId: string, exerciseDocId: string): Promise<void> {
    const exerciseRef = doc(db, COLLECTION_SESSIONS, sessionId, 'exercises', exerciseDocId);
    await deleteDoc(exerciseRef);
    await this.updateSession(sessionId, {});
  },

  async updateCurrentSessionSeriesPrescription(params: {
    sessionId: string;
    exercise: TrainingSessionExercise;
    seriesId: string;
    patch: SeriesPrescriptionPatch;
  }): Promise<TrainingSessionExercise | null> {
    const sessionId = String(params.sessionId || '').trim();
    const exerciseDocId = String(params.exercise.id || '').trim();
    const seriesId = String(params.seriesId || '').trim();
    if (!sessionId || !exerciseDocId || !seriesId) return null;
    const applied = applySeriesPrescriptionPatchBySeriesId(
      params.exercise.prescription,
      seriesId,
      params.patch
    );
    if (!applied) return null;
    const nextExercise = applied.changed
      ? { ...params.exercise, prescription: serializeTrainingPrescription(applied.prescription) }
      : params.exercise;
    if (applied.changed) {
      await this.updateExercisePrescription(sessionId, exerciseDocId, nextExercise.prescription);
    }
    return nextExercise;
  },

  /**
   * Grava reps/carga/descanso da série na sessão atual e nos demais dias
   * agendados do mesmo treino recorrente.
   */
  async propagateSeriesPrescriptionToUpcoming(params: {
    patientId: string;
    currentSessionId: string;
    currentScheduledDate: string;
    recurrenceGroupId?: string | null;
    target: SeriesPrescriptionTarget;
    patch: SeriesPrescriptionPatch;
  }): Promise<{
    currentExercise: TrainingSessionExercise | null;
    updatedSessionIds: string[];
  }> {
    const patientId = String(params.patientId || '').trim();
    const currentSessionId = String(params.currentSessionId || '').trim();
    if (!patientId || !currentSessionId) {
      return { currentExercise: null, updatedSessionIds: [] };
    }

    const sessions = await this.getPatientSessions(patientId, {
      startDate: params.currentScheduledDate,
      activeOnly: true,
    });
    const current = sessions.find((item) => item.id === currentSessionId) || (await this.getSession(currentSessionId));
    const withCurrent = current
      ? [current, ...sessions.filter((item) => item.id !== currentSessionId)]
      : sessions;
    const upcoming = selectUpcomingRecurrenceSessions(withCurrent, {
      currentSessionId,
      currentScheduledDate: params.currentScheduledDate,
      recurrenceGroupId: params.recurrenceGroupId,
    });

    const updatedSessionIds: string[] = [];
    let currentExercise: TrainingSessionExercise | null = null;
    const prescribed = sanitizeSeriesPrescriptionPatch(params.patch);
    const executionPatch = {
      prescribedReps: prescribed.reps,
      prescribedLoadKg: prescribed.loadKg,
      prescribedRestSec: prescribed.restSec,
    };

    for (const session of upcoming) {
      const sessionId = String(session.id || '').trim();
      if (!sessionId) continue;
      const exercises = await this.getSessionExercises(sessionId);
      const match = findMatchingExercise(exercises, params.target);
      if (!match?.id) continue;
      const applied = applySeriesPrescriptionToExercise(match, params.target, params.patch);
      if (!applied) continue;
      if (sessionId === currentSessionId) {
        currentExercise = applied.exercise;
      }
      if (applied.changed) {
        await this.updateExercisePrescription(sessionId, match.id, applied.exercise.prescription);
        updatedSessionIds.push(sessionId);
      }
      if (sessionId === currentSessionId) continue;
      const executionDocId =
        params.target.kind === 'intercalated'
          ? applied.exercise.prescription.intercalations?.find(
              (item) =>
                item.exerciseId === params.target.intercalationExerciseId &&
                item.slotOrder === params.target.intercalationSlotOrder
            )?.id
          : match.id;
      if (!executionDocId) continue;
      const execution = await TrainingExerciseExecutionService.get(sessionId, executionDocId);
      if (!execution) continue;
      const seriesOrder = params.target.kind === 'main' ? params.target.seriesOrder : 1;
      const nextExecution = updatePendingExecutedSeriesPrescriptionByOrder(
        execution,
        seriesOrder,
        executionPatch
      );
      if (nextExecution && nextExecution !== execution) {
        await TrainingExerciseExecutionService.save(sessionId, nextExecution);
      }
    }

    return { currentExercise, updatedSessionIds };
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
    const executionsRef = collection(
      db,
      COLLECTION_SESSIONS,
      sessionId,
      'exerciseExecutions'
    );
    const executionsSnapshot = await getDocs(executionsRef);
    const batch = writeBatch(db);

    exercisesSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    executionsSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
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
      activeOnly: true,
    });

    const done = sessions.filter((s) => s.status === 'done').length;
    const skipped = sessions.filter((s) => s.status === 'skipped').length;
    const scheduled = sessions.filter((s) => s.status === 'scheduled').length;

    const total = done + skipped + scheduled;
    const rate = total > 0 ? (done / total) * 100 : 0;

    return { done, skipped, scheduled, rate };
  },
};
