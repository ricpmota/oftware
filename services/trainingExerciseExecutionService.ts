import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  createExerciseExecutionFromPrescription,
  type TrainingExerciseExecution,
  type TrainingExecutedSeries,
} from '@/lib/personal/trainingExecutionSeries';
import type { TrainingSessionExercise } from '@/types/trainingSession';

const COL_SESSIONS = 'trainingSessions';
const SUBCOL = 'exerciseExecutions';

function omitUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested === undefined) continue;
    out[key] = omitUndefinedDeep(nested);
  }
  return out as T;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function parseSeries(raw: unknown): TrainingExecutedSeries[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const seriesId = typeof row.seriesId === 'string' ? row.seriesId : '';
      if (!seriesId) return null;
      const status =
        row.status === 'done' || row.status === 'skipped' || row.status === 'pending'
          ? row.status
          : 'pending';
      return {
        seriesId,
        order: typeof row.order === 'number' ? row.order : index + 1,
        prescribedReps: typeof row.prescribedReps === 'number' ? row.prescribedReps : 0,
        prescribedLoadKg: typeof row.prescribedLoadKg === 'number' ? row.prescribedLoadKg : null,
        prescribedRestSec: typeof row.prescribedRestSec === 'number' ? row.prescribedRestSec : 60,
        actualReps: typeof row.actualReps === 'number' ? row.actualReps : null,
        actualLoadKg: typeof row.actualLoadKg === 'number' ? row.actualLoadKg : null,
        status,
        completedAt: toIso(row.completedAt),
      } satisfies TrainingExecutedSeries;
    })
    .filter((item): item is TrainingExecutedSeries => Boolean(item));
}

function parseExecution(
  exerciseDocId: string,
  data: Record<string, unknown>
): TrainingExerciseExecution {
  const status =
    data.status === 'done' ||
    data.status === 'skipped' ||
    data.status === 'in_progress' ||
    data.status === 'pending'
      ? data.status
      : 'pending';
  return {
    exerciseDocId,
    exerciseId: typeof data.exerciseId === 'string' ? data.exerciseId : '',
    ...(typeof data.prescribedTrainerNote === 'string' && data.prescribedTrainerNote.trim()
      ? { prescribedTrainerNote: data.prescribedTrainerNote.trim() }
      : {}),
    series: parseSeries(data.series),
    status,
    startedAt: toIso(data.startedAt),
    completedAt: toIso(data.completedAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function serialize(execution: TrainingExerciseExecution): Record<string, unknown> {
  return omitUndefinedDeep({
    exerciseDocId: execution.exerciseDocId,
    exerciseId: execution.exerciseId,
    prescribedTrainerNote: execution.prescribedTrainerNote || undefined,
    status: execution.status,
    startedAt: execution.startedAt || null,
    completedAt: execution.completedAt || null,
    updatedAt: serverTimestamp(),
    series: execution.series.map((item) => ({
      seriesId: item.seriesId,
      order: item.order,
      prescribedReps: item.prescribedReps,
      prescribedLoadKg: item.prescribedLoadKg,
      prescribedRestSec: item.prescribedRestSec,
      actualReps: item.actualReps,
      actualLoadKg: item.actualLoadKg,
      status: item.status,
      completedAt: item.completedAt || null,
    })),
  });
}

export class TrainingExerciseExecutionService {
  static docRef(sessionId: string, exerciseDocId: string) {
    return doc(db, COL_SESSIONS, sessionId, SUBCOL, exerciseDocId);
  }

  static async get(
    sessionId: string,
    exerciseDocId: string
  ): Promise<TrainingExerciseExecution | null> {
    const snap = await getDoc(this.docRef(sessionId, exerciseDocId));
    if (!snap.exists()) return null;
    return parseExecution(exerciseDocId, snap.data() as Record<string, unknown>);
  }

  static async getOrCreate(
    sessionId: string,
    exercise: TrainingSessionExercise
  ): Promise<TrainingExerciseExecution> {
    const exerciseDocId = String(exercise.id || '').trim();
    if (!sessionId || !exerciseDocId) {
      throw new Error('Exercício inválido para execução.');
    }
    const ref = this.docRef(sessionId, exerciseDocId);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        const existing = parseExecution(exerciseDocId, snap.data() as Record<string, unknown>);
        if (existing.series.length > 0) return existing;
      }
      const created = createExerciseExecutionFromPrescription({
        exerciseDocId,
        exerciseId: exercise.exerciseId,
        prescription: exercise.prescription,
        trainerNote: exercise.trainerNote,
      });
      tx.set(ref, serialize(created));
      return created;
    });
  }

  static async getOrCreateFromSeed(
    sessionId: string,
    seed: TrainingExerciseExecution
  ): Promise<TrainingExerciseExecution> {
    const exerciseDocId = String(seed.exerciseDocId || '').trim();
    if (!sessionId || !exerciseDocId) {
      throw new Error('Execução inválida.');
    }
    const ref = this.docRef(sessionId, exerciseDocId);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        const existing = parseExecution(exerciseDocId, snap.data() as Record<string, unknown>);
        if (existing.series.length > 0) return existing;
      }
      tx.set(ref, serialize(seed));
      return seed;
    });
  }

  static async save(
    sessionId: string,
    execution: TrainingExerciseExecution
  ): Promise<void> {
    await setDoc(this.docRef(sessionId, execution.exerciseDocId), serialize(execution), {
      merge: true,
    });
  }

  static async listBySession(sessionId: string): Promise<TrainingExerciseExecution[]> {
    if (!sessionId) return [];
    const snap = await getDocs(collection(db, COL_SESSIONS, sessionId, SUBCOL));
    return snap.docs.map((item) =>
      parseExecution(item.id, item.data() as Record<string, unknown>)
    );
  }

  static async listForSessions(
    sessionIds: string[]
  ): Promise<Record<string, TrainingExerciseExecution[]>> {
    const unique = [...new Set(sessionIds.filter(Boolean))];
    const entries = await Promise.all(
      unique.map(async (sessionId) => {
        const executions = await this.listBySession(sessionId);
        return [sessionId, executions] as const;
      })
    );
    return Object.fromEntries(entries);
  }

  static subscribeBySession(
    sessionId: string,
    onChange: (items: TrainingExerciseExecution[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!sessionId) return () => undefined;
    return onSnapshot(
      collection(db, COL_SESSIONS, sessionId, SUBCOL),
      (snap) => {
        onChange(
          snap.docs.map((item) =>
            parseExecution(item.id, item.data() as Record<string, unknown>)
          )
        );
      },
      (error) => {
        console.error('Erro ao acompanhar execução do treino:', error);
        onError?.(error);
      }
    );
  }
}
