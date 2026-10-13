/**
 * Execução de sessão de treino pelo paciente (Etapa 13).
 * Não modifica PublishedTrainingPlan nem calendário.
 */

import type { TrainingWeekday } from '@/types/workoutPlanDraft';

export type TrainingSessionExecutionStatus =
  | 'in_progress'
  | 'completed'
  | 'abandoned'
  | 'cancelled';

export type TrainingExerciseExecutionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped';

export type TrainingSetExecutionStatus = 'pending' | 'completed' | 'skipped';

export type TrainingLoadUnit = 'kg' | 'lb' | 'bodyweight' | 'assisted';

export type TrainingSetExecution = {
  setIndex: number;
  status: TrainingSetExecutionStatus;
  repetitions: number | null;
  load: {
    value: number | null;
    unit: TrainingLoadUnit | null;
  };
  rpe: number | null;
  completedAt: Date | string | null;
};

export type TrainingExerciseExecution = {
  executionExerciseId: string;
  source: {
    planExerciseId: string;
    sourceExerciseId: string;
  };
  snapshot: {
    exerciseName: string;
    imageUrl: string | null;
    videoUrl: string | null;
    instructions: string[];
    prescribedSets: number;
    prescribedRepetitionRange: { min: number; max: number };
    prescribedRestSeconds: number;
    prescribedTargetRpe: { min: number; max: number };
  };
  status: TrainingExerciseExecutionStatus;
  sets: TrainingSetExecution[];
  skipReason: string | null;
  notes: string | null;
};

export type TrainingWarmupExecution = {
  status: 'pending' | 'completed' | 'skipped';
  plannedDurationMinutes: number;
  actualDurationMinutes: number | null;
};

export type TrainingCardioExecution = {
  status: 'pending' | 'completed' | 'skipped';
  activityCode: string;
  plannedDurationMinutes: number;
  actualDurationMinutes: number | null;
  rpe: number | null;
};

export type TrainingSessionDifficulty =
  | 'very_easy'
  | 'easy'
  | 'adequate'
  | 'hard'
  | 'very_hard';

export type TrainingSessionExecution = {
  version: 1;
  id?: string;

  patientId: string;
  patientUserId: string;
  organizationId: string | null;

  source: {
    publishedPlanId: string;
    planVersion: number;
    prescribedSessionId: string;
    prescribedSessionDayIndex: number;
    clientRequestId: string | null;
  };

  status: TrainingSessionExecutionStatus;

  sessionSnapshot: {
    title: string;
    focus: string;
    weekday: TrainingWeekday | null;
    plannedDurationMinutes: number;
  };

  warmup: TrainingWarmupExecution | null;
  exercises: TrainingExerciseExecution[];
  cardio: TrainingCardioExecution | null;

  /** Índice do exercício atual na UI (recuperação). */
  currentExerciseIndex: number;

  patientFeedback: {
    overallRpe: number | null;
    difficulty: TrainingSessionDifficulty | null;
    painDuringSession: boolean | null;
    painRegions: string[];
    notes: string | null;
  };

  timing: {
    startedAt: Date | string;
    completedAt: Date | string | null;
    abandonedAt: Date | string | null;
    durationSeconds: number | null;
  };

  abandonReason: string | null;

  createdAt: Date | string;
  updatedAt: Date | string;
};

export const COL_TRAINING_SESSION_EXECUTIONS = 'trainingSessionExecutions';

export const SKIP_REASON_OPTIONS = [
  { value: 'equipment_busy', label: 'Equipamento ocupado' },
  { value: 'discomfort', label: 'Desconforto' },
  { value: 'unable', label: 'Não consegui executar' },
  { value: 'no_time', label: 'Falta de tempo' },
  { value: 'other', label: 'Outro' },
] as const;
