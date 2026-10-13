/**
 * Builder puro: ReviewedWorkoutPlanDraft aprovado → PublishedTrainingPlan.
 * Sem Firestore / ExerciseDB / mutação.
 */

import type { ReviewedWorkoutPlanDraft } from '@/types/reviewedWorkoutPlanDraft';
import type {
  ExerciseSnapshotInput,
  PublishedTrainingPlan,
  PublishedTrainingPlanExercise,
  PublishedTrainingPlanSession,
} from '@/types/publishedTrainingPlan';
import type { SelectedWorkoutExercise } from '@/types/workoutPlanDraft';
import { validateWorkoutPlanDraft } from '@/lib/trainingEngine/validateWorkoutPlanDraft';

export class PublishPlanError extends Error {
  constructor(
    message: string,
    public code:
      | 'not_approved'
      | 'invalid_draft'
      | 'missing_slots'
      | 'unsupported_status'
      | 'invalid_dates'
      | 'missing_patient_user'
  ) {
    super(message);
    this.name = 'PublishPlanError';
  }
}

function stableId(parts: string[]): string {
  return parts.map((p) => String(p).replace(/[^a-zA-Z0-9_-]/g, '_')).join('__');
}

function mapExercise(
  ex: SelectedWorkoutExercise,
  planVersion: number,
  dayIndex: number,
  snapshots: Record<string, ExerciseSnapshotInput>
): PublishedTrainingPlanExercise {
  const snap = snapshots[ex.sourceId] || snapshots[ex.exerciseId] || {
    instructions: [],
    imageUrl: `/api/exercisedb/image?exerciseId=${encodeURIComponent(ex.exerciseId)}&resolution=360`,
    videoUrl: null,
  };
  return {
    planExerciseId: stableId([
      'v' + planVersion,
      'd' + dayIndex,
      ex.slotId,
      ex.sourceId || ex.exerciseId,
    ]),
    sourceExerciseId: ex.sourceId || ex.exerciseId,
    sourceExerciseName: ex.exerciseName,
    slotId: ex.slotId,
    role: ex.role,
    primaryMuscles: [...ex.primaryMuscles],
    movementPatterns: [...ex.movementPatterns],
    equipment: [...ex.equipment],
    prescription: {
      sets: ex.sets,
      repetitionRange: { ...ex.repetitionRange },
      restSeconds: ex.restSeconds,
      targetRpe: { ...ex.targetRpe },
    },
    media: {
      imageUrl: snap.imageUrl,
      videoUrl: snap.videoUrl,
    },
    instructions: [...(snap.instructions || [])],
    professionalNotes: null,
  };
}

export function buildPublishKey(reviewedDraftId: string, fingerprint: string): string {
  return `${reviewedDraftId}::${fingerprint}`;
}

export function buildPublishedTrainingPlan(params: {
  review: ReviewedWorkoutPlanDraft;
  planVersion: number;
  publishedBy: string;
  publishedByRole: 'doctor' | 'personal_trainer';
  patientUserId: string;
  title?: string | null;
  description?: string | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  now?: Date | string;
  exerciseSnapshots?: Record<string, ExerciseSnapshotInput>;
}): PublishedTrainingPlan {
  const {
    review,
    planVersion,
    publishedBy,
    publishedByRole,
    patientUserId,
    title,
    description,
    startsAt = null,
    endsAt = null,
    now = new Date().toISOString(),
    exerciseSnapshots = {},
  } = params;

  if (!patientUserId) {
    throw new PublishPlanError('patientUserId obrigatório.', 'missing_patient_user');
  }
  if (review.review.status !== 'approved') {
    throw new PublishPlanError('Somente prévia aprovada pode ser publicada.', 'not_approved');
  }

  const draft = review.workingDraft;
  if (draft.status !== 'generated') {
    throw new PublishPlanError(
      `Draft com status "${draft.status}" não pode ser publicado.`,
      'unsupported_status'
    );
  }
  if (draft.catalogDiagnostics.missingSlots.length > 0) {
    throw new PublishPlanError(
      'Há componentes obrigatórios sem exercício.',
      'missing_slots'
    );
  }

  const validation = validateWorkoutPlanDraft(draft);
  if (!validation.valid || !draft.validation.valid || !review.validation.valid) {
    throw new PublishPlanError('O draft possui erros de validação.', 'invalid_draft');
  }

  if (startsAt && endsAt) {
    const a = new Date(startsAt).getTime();
    const b = new Date(endsAt).getTime();
    if (!isNaN(a) && !isNaN(b) && b < a) {
      throw new PublishPlanError('A data final deve ser ≥ data de início.', 'invalid_dates');
    }
  }

  const sessions: PublishedTrainingPlanSession[] = draft.sessions.map((s) => ({
    sessionId: stableId(['v' + planVersion, 'session', String(s.dayIndex), s.focus]),
    dayIndex: s.dayIndex,
    weekday: s.weekday,
    title: s.title,
    focus: s.focus,
    warmup: s.warmup
      ? { durationMinutes: s.warmup.durationMinutes, notesCode: s.warmup.notesCode }
      : null,
    exercises: s.exercises.map((ex) =>
      mapExercise(ex, planVersion, s.dayIndex, exerciseSnapshots)
    ),
    cardio: s.cardio
      ? {
          activityCode: s.cardio.activityCode,
          durationMinutes: s.cardio.durationMinutes,
          intensity: { ...s.cardio.intensity },
        }
      : null,
  }));

  const reviewedDraftId = review.id || '';
  const publishKey = buildPublishKey(reviewedDraftId, review.fingerprint);

  return {
    version: 1,
    patientId: review.patientId,
    patientUserId,
    organizationId: review.organizationId ?? null,
    source: {
      reviewedDraftId,
      assessmentId: review.assessmentId,
      assessmentVersion: review.assessmentVersion,
      personalizationIndexVersion: review.indexVersion,
      engineVersion: review.engineVersion,
      catalogVersion: review.catalogVersion,
      draftFingerprint: review.fingerprint,
      publishKey,
    },
    status: 'active',
    planVersion,
    title: (title && title.trim()) || `Plano de treino — Versão ${planVersion}`,
    description: description?.trim() || null,
    structure: {
      weeklyFrequency: draft.structure.weeklyFrequency,
      splitStrategy: draft.structure.splitStrategy,
      sessionDurationMinutes: draft.structure.sessionDurationMinutes,
    },
    sessions,
    professional: {
      publishedBy,
      publishedByRole,
      approvedBy: review.review.reviewedBy,
      approvedByRole: review.review.reviewerRole,
    },
    lifecycle: {
      startsAt: startsAt ?? now,
      endsAt: endsAt ?? null,
      publishedAt: now,
      supersededAt: null,
      cancelledAt: null,
      completedAt: null,
      cancelReason: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}
