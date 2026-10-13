/**
 * Execução de sessões do plano publicado (Etapa 13).
 * NÃO altera PublishedTrainingPlan nem trainingSessions/calendário.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  applyAbandonSession,
  applyCompleteSession,
  applySetExecutionUpdate,
  applySkipExercise,
} from '@/lib/trainingExecution/applyTrainingExecutionMutations';
import { buildTrainingSessionExecution } from '@/lib/trainingExecution/buildTrainingSessionExecution';
import { publishedTrainingPlanService } from '@/services/publishedTrainingPlanService';
import type {
  TrainingLoadUnit,
  TrainingSessionDifficulty,
  TrainingSessionExecution,
  TrainingSetExecutionStatus,
} from '@/types/trainingSessionExecution';
import { COL_TRAINING_SESSION_EXECUTIONS } from '@/types/trainingSessionExecution';

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as Timestamp).toDate === 'function') {
    return (v as Timestamp).toDate();
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapExecution(
  id: string,
  data: Record<string, unknown>
): TrainingSessionExecution {
  return {
    version: 1,
    id,
    patientId: String(data.patientId || ''),
    patientUserId: String(data.patientUserId || ''),
    organizationId: (data.organizationId as string | null) ?? null,
    source: (data.source as TrainingSessionExecution['source']) || {
      publishedPlanId: '',
      planVersion: 1,
      prescribedSessionId: '',
      prescribedSessionDayIndex: 0,
      clientRequestId: null,
    },
    status: (data.status as TrainingSessionExecution['status']) || 'in_progress',
    sessionSnapshot: data.sessionSnapshot as TrainingSessionExecution['sessionSnapshot'],
    warmup: (data.warmup as TrainingSessionExecution['warmup']) ?? null,
    exercises: Array.isArray(data.exercises)
      ? (data.exercises as TrainingSessionExecution['exercises'])
      : [],
    cardio: (data.cardio as TrainingSessionExecution['cardio']) ?? null,
    currentExerciseIndex:
      typeof data.currentExerciseIndex === 'number' ? data.currentExerciseIndex : 0,
    patientFeedback: (data.patientFeedback as TrainingSessionExecution['patientFeedback']) || {
      overallRpe: null,
      difficulty: null,
      painDuringSession: null,
      painRegions: [],
      notes: null,
    },
    timing: {
      startedAt: toDate((data.timing as TrainingSessionExecution['timing'])?.startedAt),
      completedAt: (data.timing as TrainingSessionExecution['timing'])?.completedAt
        ? toDate((data.timing as TrainingSessionExecution['timing']).completedAt)
        : null,
      abandonedAt: (data.timing as TrainingSessionExecution['timing'])?.abandonedAt
        ? toDate((data.timing as TrainingSessionExecution['timing']).abandonedAt)
        : null,
      durationSeconds:
        (data.timing as TrainingSessionExecution['timing'])?.durationSeconds ?? null,
    },
    abandonReason: (data.abandonReason as string | null) ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function assertOwner(execution: TrainingSessionExecution, userId: string) {
  if (execution.patientUserId !== userId) {
    throw new Error('Você não tem permissão para alterar esta execução.');
  }
}

function assertInProgress(execution: TrainingSessionExecution) {
  if (execution.status !== 'in_progress') {
    throw new Error('Esta execução não está mais em andamento.');
  }
}

export const trainingSessionExecutionService = {
  async getById(executionId: string): Promise<TrainingSessionExecution | null> {
    const snap = await getDoc(doc(db, COL_TRAINING_SESSION_EXECUTIONS, executionId));
    if (!snap.exists()) return null;
    return mapExecution(snap.id, snap.data() as Record<string, unknown>);
  },

  async getInProgressByPatientId(
    patientId: string
  ): Promise<TrainingSessionExecution | null> {
    if (!patientId) return null;
    const q = query(
      collection(db, COL_TRAINING_SESSION_EXECUTIONS),
      where('patientId', '==', patientId),
      where('status', '==', 'in_progress'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return mapExecution(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
  },

  async listRecentByPatientId(
    patientId: string,
    max = 10
  ): Promise<TrainingSessionExecution[]> {
    if (!patientId) return [];
    try {
      const q = query(
        collection(db, COL_TRAINING_SESSION_EXECUTIONS),
        where('patientId', '==', patientId),
        orderBy('timing.startedAt', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapExecution(d.id, d.data() as Record<string, unknown>));
    } catch {
      const q = query(
        collection(db, COL_TRAINING_SESSION_EXECUTIONS),
        where('patientId', '==', patientId),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => mapExecution(d.id, d.data() as Record<string, unknown>))
        .sort(
          (a, b) =>
            toDate(b.timing.startedAt).getTime() - toDate(a.timing.startedAt).getTime()
        );
    }
  },

  async startSessionExecution(params: {
    publishedPlanId: string;
    prescribedSessionId: string;
    userId: string;
    clientRequestId?: string | null;
  }): Promise<TrainingSessionExecution> {
    const {
      publishedPlanId,
      prescribedSessionId,
      userId,
      clientRequestId = null,
    } = params;

    const plan = await publishedTrainingPlanService.getById(publishedPlanId);
    if (!plan) throw new Error('Plano publicado não encontrado.');
    if (plan.status !== 'active') throw new Error('O plano não está ativo.');
    if (plan.patientUserId !== userId) {
      throw new Error('Você não pode iniciar treino deste plano.');
    }

    const inProgress = await this.getInProgressByPatientId(plan.patientId);
    if (inProgress) {
      if (
        clientRequestId &&
        inProgress.source.clientRequestId === clientRequestId
      ) {
        return inProgress;
      }
      if (
        inProgress.source.publishedPlanId === publishedPlanId &&
        inProgress.source.prescribedSessionId === prescribedSessionId
      ) {
        return inProgress;
      }
      throw new Error(
        'Já existe um treino em andamento. Continue ou abandone antes de iniciar outro.'
      );
    }

    if (clientRequestId) {
      const q = query(
        collection(db, COL_TRAINING_SESSION_EXECUTIONS),
        where('patientId', '==', plan.patientId),
        where('source.clientRequestId', '==', clientRequestId),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return mapExecution(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
      }
    }

    const now = new Date().toISOString();
    const execution = buildTrainingSessionExecution({
      plan,
      prescribedSessionId,
      startedAt: now,
      clientRequestId,
    });
    const id = newId();
    execution.id = id;

    await setDoc(doc(db, COL_TRAINING_SESSION_EXECUTIONS, id), {
      ...execution,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      timing: {
        ...execution.timing,
        startedAt: now,
      },
    });

    return execution;
  },

  async setCurrentExerciseIndex(params: {
    executionId: string;
    userId: string;
    index: number;
  }): Promise<void> {
    const execution = await this.getById(params.executionId);
    if (!execution) throw new Error('Execução não encontrada.');
    assertOwner(execution, params.userId);
    assertInProgress(execution);
    const max = Math.max(0, execution.exercises.length - 1);
    const index = Math.min(Math.max(0, params.index), max);
    await updateDoc(doc(db, COL_TRAINING_SESSION_EXECUTIONS, params.executionId), {
      currentExerciseIndex: index,
      updatedAt: serverTimestamp(),
    });
  },

  async updateSetExecution(params: {
    executionId: string;
    userId: string;
    executionExerciseId: string;
    setIndex: number;
    repetitions?: number | null;
    loadValue?: number | null;
    loadUnit?: TrainingLoadUnit | null;
    rpe?: number | null;
    status?: TrainingSetExecutionStatus;
  }): Promise<TrainingSessionExecution> {
    const execution = await this.getById(params.executionId);
    if (!execution) throw new Error('Execução não encontrada.');
    assertOwner(execution, params.userId);

    const next = applySetExecutionUpdate(execution, params);

    await updateDoc(doc(db, COL_TRAINING_SESSION_EXECUTIONS, params.executionId), {
      exercises: next.exercises,
      updatedAt: serverTimestamp(),
    });

    return next;
  },

  async skipExercise(params: {
    executionId: string;
    userId: string;
    executionExerciseId: string;
    reason?: string | null;
  }): Promise<TrainingSessionExecution> {
    const execution = await this.getById(params.executionId);
    if (!execution) throw new Error('Execução não encontrada.');
    assertOwner(execution, params.userId);

    const next = applySkipExercise(execution, params);

    await updateDoc(doc(db, COL_TRAINING_SESSION_EXECUTIONS, params.executionId), {
      exercises: next.exercises,
      updatedAt: serverTimestamp(),
    });

    return next;
  },

  async updateWarmup(params: {
    executionId: string;
    userId: string;
    status: 'completed' | 'skipped';
    actualDurationMinutes?: number | null;
  }): Promise<void> {
    const execution = await this.getById(params.executionId);
    if (!execution) throw new Error('Execução não encontrada.');
    assertOwner(execution, params.userId);
    assertInProgress(execution);
    if (!execution.warmup) return;

    await updateDoc(doc(db, COL_TRAINING_SESSION_EXECUTIONS, params.executionId), {
      warmup: {
        ...execution.warmup,
        status: params.status,
        actualDurationMinutes:
          params.actualDurationMinutes ?? execution.warmup.plannedDurationMinutes,
      },
      updatedAt: serverTimestamp(),
    });
  },

  async updateCardio(params: {
    executionId: string;
    userId: string;
    status: 'completed' | 'skipped';
    actualDurationMinutes?: number | null;
    rpe?: number | null;
  }): Promise<void> {
    const execution = await this.getById(params.executionId);
    if (!execution) throw new Error('Execução não encontrada.');
    assertOwner(execution, params.userId);
    assertInProgress(execution);
    if (!execution.cardio) return;
    if (params.rpe != null && (!Number.isFinite(params.rpe) || params.rpe < 1 || params.rpe > 10)) {
      throw new Error('RPE deve estar entre 1 e 10.');
    }

    await updateDoc(doc(db, COL_TRAINING_SESSION_EXECUTIONS, params.executionId), {
      cardio: {
        ...execution.cardio,
        status: params.status,
        actualDurationMinutes:
          params.actualDurationMinutes ?? execution.cardio.plannedDurationMinutes,
        rpe: params.rpe ?? execution.cardio.rpe,
      },
      updatedAt: serverTimestamp(),
    });
  },

  async saveNotes(params: {
    executionId: string;
    userId: string;
    executionExerciseId?: string;
    notes: string;
  }): Promise<void> {
    const execution = await this.getById(params.executionId);
    if (!execution) throw new Error('Execução não encontrada.');
    assertOwner(execution, params.userId);
    assertInProgress(execution);
    const notes = params.notes.slice(0, 1000);

    if (params.executionExerciseId) {
      const exercises = execution.exercises.map((e) =>
        e.executionExerciseId === params.executionExerciseId ? { ...e, notes } : e
      );
      await updateDoc(doc(db, COL_TRAINING_SESSION_EXECUTIONS, params.executionId), {
        exercises,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    await updateDoc(doc(db, COL_TRAINING_SESSION_EXECUTIONS, params.executionId), {
      'patientFeedback.notes': notes,
      updatedAt: serverTimestamp(),
    });
  },

  async completeSessionExecution(params: {
    executionId: string;
    userId: string;
    overallRpe?: number | null;
    difficulty?: TrainingSessionDifficulty | null;
    painDuringSession?: boolean | null;
    painRegions?: string[];
    notes?: string | null;
  }): Promise<TrainingSessionExecution> {
    const execution = await this.getById(params.executionId);
    if (!execution) throw new Error('Execução não encontrada.');
    assertOwner(execution, params.userId);

    const next = applyCompleteSession(execution, params);

    await setDoc(
      doc(db, COL_TRAINING_SESSION_EXECUTIONS, params.executionId),
      {
        ...next,
        updatedAt: serverTimestamp(),
        timing: {
          ...next.timing,
          completedAt: next.timing.completedAt,
        },
      },
      { merge: true }
    );

    return next;
  },

  async abandonSessionExecution(params: {
    executionId: string;
    userId: string;
    reason?: string | null;
  }): Promise<TrainingSessionExecution> {
    const execution = await this.getById(params.executionId);
    if (!execution) throw new Error('Execução não encontrada.');
    assertOwner(execution, params.userId);

    const next = applyAbandonSession(execution, { reason: params.reason });

    await setDoc(
      doc(db, COL_TRAINING_SESSION_EXECUTIONS, params.executionId),
      {
        status: 'abandoned',
        abandonReason: next.abandonReason,
        timing: next.timing,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return next;
  },
};
