/**
 * Plano de treino prescrito e publicado (Etapa 12).
 * Não é sessão executada nem evento de calendário.
 */

import type {
  TrainingWeekday,
  WorkoutCardioBlock,
  WorkoutWarmupBlock,
} from '@/types/workoutPlanDraft';

export type PublishedTrainingPlanStatus =
  | 'active'
  | 'superseded'
  | 'cancelled'
  | 'completed';

export type PublishedTrainingPlanExercise = {
  planExerciseId: string;
  sourceExerciseId: string;
  sourceExerciseName: string;
  slotId: string;
  role: string;
  primaryMuscles: string[];
  movementPatterns: string[];
  equipment: string[];
  prescription: {
    sets: number;
    repetitionRange: { min: number; max: number };
    restSeconds: number;
    targetRpe: { min: number; max: number };
  };
  media: {
    imageUrl: string | null;
    videoUrl: string | null;
  };
  instructions: string[];
  professionalNotes: string | null;
};

export type PublishedTrainingPlanSession = {
  sessionId: string;
  dayIndex: number;
  weekday: TrainingWeekday | null;
  title: string;
  focus: string;
  warmup: WorkoutWarmupBlock | null;
  exercises: PublishedTrainingPlanExercise[];
  cardio: WorkoutCardioBlock | null;
};

export type PublishedTrainingPlan = {
  version: 1;
  id?: string;

  /** pacientes_completos doc id */
  patientId: string;
  /** Firebase Auth UID do paciente (ACL / leitura). */
  patientUserId: string;
  organizationId: string | null;

  source: {
    reviewedDraftId: string;
    assessmentId: string;
    assessmentVersion: number;
    personalizationIndexVersion: number;
    engineVersion: string;
    catalogVersion: string;
    draftFingerprint: string;
    /** Chave de idempotência: reviewedDraftId + fingerprint */
    publishKey: string;
  };

  status: PublishedTrainingPlanStatus;
  planVersion: number;

  title: string;
  description: string | null;

  structure: {
    weeklyFrequency: number;
    splitStrategy: string;
    sessionDurationMinutes: number;
  };

  sessions: PublishedTrainingPlanSession[];

  professional: {
    publishedBy: string;
    publishedByRole: 'doctor' | 'personal_trainer';
    approvedBy: string | null;
    approvedByRole: 'doctor' | 'personal_trainer' | null;
  };

  lifecycle: {
    startsAt: Date | string | null;
    endsAt: Date | string | null;
    publishedAt: Date | string;
    supersededAt: Date | string | null;
    cancelledAt: Date | string | null;
    completedAt: Date | string | null;
    cancelReason: string | null;
  };

  createdAt: Date | string;
  updatedAt: Date | string;
};

export const COL_PUBLISHED_TRAINING_PLANS = 'publishedTrainingPlans';

export type ExerciseSnapshotInput = {
  instructions: string[];
  imageUrl: string | null;
  videoUrl: string | null;
};
