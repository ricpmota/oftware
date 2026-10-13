/**
 * Revisão profissional do WorkoutPlanDraft (Etapa 11).
 * Aprovação ≠ publicação.
 */

import type { WorkoutPlanDraft } from '@/types/workoutPlanDraft';

export type WorkoutPlanDraftReviewStatus =
  | 'not_reviewed'
  | 'in_review'
  | 'approved'
  | 'discarded';

export type WorkoutDraftManualAdjustment = {
  adjustmentId: string;
  type: 'exercise_replacement';
  sessionDayIndex: number;
  slotId: string;
  previousExerciseId: string;
  previousExerciseName: string;
  replacementExerciseId: string;
  replacementExerciseName: string;
  changedAt: Date | string | null;
  changedBy: string | null;
};

export type ReviewedWorkoutPlanDraft = {
  version: 1;

  id?: string;

  patientId: string;
  organizationId?: string | null;
  assessmentId: string;
  assessmentVersion: number;
  indexVersion: number;
  engineVersion: string;
  catalogVersion: string;
  fingerprint: string;

  baseDraft: WorkoutPlanDraft;
  /** Draft atual (pode incluir substituições manuais). */
  workingDraft: WorkoutPlanDraft;

  review: {
    status: WorkoutPlanDraftReviewStatus;
    reviewedBy: string | null;
    reviewerRole: 'doctor' | 'personal_trainer' | null;
    startedAt: Date | string | null;
    approvedAt: Date | string | null;
    discardedAt: Date | string | null;
    notes: string | null;
  };

  manualAdjustments: WorkoutDraftManualAdjustment[];

  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };

  /** Preenchido após publicação (Etapa 12). */
  publication?: {
    publishedPlanId: string | null;
    publishedAt: Date | string | null;
    publishKey?: string | null;
  } | null;

  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  createdByRole: 'doctor' | 'personal_trainer';
};

export const COL_WORKOUT_PLAN_DRAFTS = 'workoutPlanDrafts';

export const TRAINING_ENGINE_PREVIEW_CATALOG_VERSION = 'exercisedb_bodyparts_v1';
