/**
 * Builder puro: PublishedTrainingPlan session → TrainingSessionExecution.
 */

import type { PublishedTrainingPlan } from '@/types/publishedTrainingPlan';
import type {
  TrainingExerciseExecution,
  TrainingSessionExecution,
  TrainingSetExecution,
} from '@/types/trainingSessionExecution';

export class TrainingExecutionBuildError extends Error {
  constructor(
    message: string,
    public code: 'session_not_found' | 'plan_not_active' | 'invalid_plan'
  ) {
    super(message);
    this.name = 'TrainingExecutionBuildError';
  }
}

function stableId(parts: string[]): string {
  return parts.map((p) => String(p).replace(/[^a-zA-Z0-9_-]/g, '_')).join('__');
}

function buildSets(count: number): TrainingSetExecution[] {
  const n = Math.max(1, count);
  return Array.from({ length: n }, (_, i) => ({
    setIndex: i + 1,
    status: 'pending' as const,
    repetitions: null,
    load: { value: null, unit: null },
    rpe: null,
    completedAt: null,
  }));
}

export function buildTrainingSessionExecution(params: {
  plan: PublishedTrainingPlan;
  prescribedSessionId: string;
  startedAt: Date | string;
  clientRequestId?: string | null;
}): TrainingSessionExecution {
  const { plan, prescribedSessionId, startedAt, clientRequestId = null } = params;

  if (!plan.id) {
    throw new TrainingExecutionBuildError('Plano sem id.', 'invalid_plan');
  }
  if (plan.status !== 'active') {
    throw new TrainingExecutionBuildError(
      'Somente plano ativo pode iniciar execução.',
      'plan_not_active'
    );
  }

  const session = plan.sessions.find((s) => s.sessionId === prescribedSessionId);
  if (!session) {
    throw new TrainingExecutionBuildError(
      'Sessão prescrita não encontrada no plano.',
      'session_not_found'
    );
  }

  const exercises: TrainingExerciseExecution[] = session.exercises.map((ex) => ({
    executionExerciseId: stableId([
      'exec',
      plan.id!,
      session.sessionId,
      ex.planExerciseId,
    ]),
    source: {
      planExerciseId: ex.planExerciseId,
      sourceExerciseId: ex.sourceExerciseId,
    },
    snapshot: {
      exerciseName: ex.sourceExerciseName,
      imageUrl: ex.media.imageUrl,
      videoUrl: ex.media.videoUrl,
      instructions: [...ex.instructions],
      prescribedSets: ex.prescription.sets,
      prescribedRepetitionRange: { ...ex.prescription.repetitionRange },
      prescribedRestSeconds: ex.prescription.restSeconds,
      prescribedTargetRpe: { ...ex.prescription.targetRpe },
    },
    status: 'pending',
    sets: buildSets(ex.prescription.sets),
    skipReason: null,
    notes: null,
  }));

  return {
    version: 1,
    patientId: plan.patientId,
    patientUserId: plan.patientUserId,
    organizationId: plan.organizationId,
    source: {
      publishedPlanId: plan.id,
      planVersion: plan.planVersion,
      prescribedSessionId: session.sessionId,
      prescribedSessionDayIndex: session.dayIndex,
      clientRequestId,
    },
    status: 'in_progress',
    sessionSnapshot: {
      title: session.title,
      focus: session.focus,
      weekday: session.weekday,
      plannedDurationMinutes: plan.structure.sessionDurationMinutes,
    },
    warmup: session.warmup
      ? {
          status: 'pending',
          plannedDurationMinutes: session.warmup.durationMinutes,
          actualDurationMinutes: null,
        }
      : null,
    exercises,
    cardio: session.cardio
      ? {
          status: 'pending',
          activityCode: session.cardio.activityCode,
          plannedDurationMinutes: session.cardio.durationMinutes,
          actualDurationMinutes: null,
          rpe: null,
        }
      : null,
    currentExerciseIndex: 0,
    patientFeedback: {
      overallRpe: null,
      difficulty: null,
      painDuringSession: null,
      painRegions: [],
      notes: null,
    },
    timing: {
      startedAt,
      completedAt: null,
      abandonedAt: null,
      durationSeconds: null,
    },
    abandonReason: null,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}
