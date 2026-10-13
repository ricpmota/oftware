/**
 * Mutações puras sobre TrainingSessionExecution (testáveis sem Firestore).
 */

import type {
  TrainingLoadUnit,
  TrainingSessionDifficulty,
  TrainingSessionExecution,
  TrainingSetExecutionStatus,
} from '@/types/trainingSessionExecution';

export class TrainingExecutionMutationError extends Error {
  constructor(
    message: string,
    public code:
      | 'not_in_progress'
      | 'exercise_not_found'
      | 'set_not_found'
      | 'invalid_reps'
      | 'invalid_load'
      | 'invalid_rpe'
      | 'nothing_started'
      | 'cannot_abandon'
  ) {
    super(message);
    this.name = 'TrainingExecutionMutationError';
  }
}

function assertInProgress(execution: TrainingSessionExecution) {
  if (execution.status !== 'in_progress') {
    throw new TrainingExecutionMutationError(
      'Esta execução não está mais em andamento.',
      'not_in_progress'
    );
  }
}

function validateRpe(rpe: number | null | undefined) {
  if (rpe == null) return;
  if (!Number.isFinite(rpe) || rpe < 1 || rpe > 10) {
    throw new TrainingExecutionMutationError(
      'RPE deve estar entre 1 e 10.',
      'invalid_rpe'
    );
  }
}

export function applySetExecutionUpdate(
  execution: TrainingSessionExecution,
  params: {
    executionExerciseId: string;
    setIndex: number;
    repetitions?: number | null;
    loadValue?: number | null;
    loadUnit?: TrainingLoadUnit | null;
    rpe?: number | null;
    status?: TrainingSetExecutionStatus;
  }
): TrainingSessionExecution {
  assertInProgress(execution);

  if (params.repetitions != null && params.repetitions < 0) {
    throw new TrainingExecutionMutationError(
      'Repetições não podem ser negativas.',
      'invalid_reps'
    );
  }
  if (params.loadValue != null && params.loadValue < 0) {
    throw new TrainingExecutionMutationError(
      'Carga não pode ser negativa.',
      'invalid_load'
    );
  }
  validateRpe(params.rpe);

  const exIdx = execution.exercises.findIndex(
    (e) => e.executionExerciseId === params.executionExerciseId
  );
  if (exIdx < 0) {
    throw new TrainingExecutionMutationError(
      'Exercício não encontrado nesta execução.',
      'exercise_not_found'
    );
  }

  let setFound = false;
  const exercises = execution.exercises.map((e, i) => {
    if (i !== exIdx) return e;
    const sets = e.sets.map((s) => {
      if (s.setIndex !== params.setIndex) return s;
      setFound = true;
      const status = params.status ?? s.status;
      return {
        ...s,
        status,
        repetitions:
          params.repetitions !== undefined ? params.repetitions : s.repetitions,
        load: {
          value: params.loadValue !== undefined ? params.loadValue : s.load.value,
          unit: params.loadUnit !== undefined ? params.loadUnit : s.load.unit,
        },
        rpe: params.rpe !== undefined ? params.rpe : s.rpe,
        completedAt:
          status === 'completed'
            ? s.completedAt || new Date().toISOString()
            : status === 'pending'
              ? null
              : s.completedAt,
      };
    });

    const allDone = sets.every((s) => s.status === 'completed' || s.status === 'skipped');
    const anyStarted = sets.some((s) => s.status !== 'pending');
    let status = e.status;
    if (allDone) status = 'completed';
    else if (anyStarted) status = 'in_progress';

    return { ...e, sets, status };
  });

  if (!setFound) {
    throw new TrainingExecutionMutationError('Série não encontrada.', 'set_not_found');
  }

  return { ...execution, exercises, updatedAt: new Date().toISOString() };
}

export function applySkipExercise(
  execution: TrainingSessionExecution,
  params: { executionExerciseId: string; reason?: string | null }
): TrainingSessionExecution {
  assertInProgress(execution);
  const exists = execution.exercises.some(
    (e) => e.executionExerciseId === params.executionExerciseId
  );
  if (!exists) {
    throw new TrainingExecutionMutationError(
      'Exercício não encontrado nesta execução.',
      'exercise_not_found'
    );
  }

  const exercises = execution.exercises.map((e) => {
    if (e.executionExerciseId !== params.executionExerciseId) return e;
    return {
      ...e,
      status: 'skipped' as const,
      skipReason: params.reason ? String(params.reason).slice(0, 200) : null,
      sets: e.sets.map((s) =>
        s.status === 'pending' ? { ...s, status: 'skipped' as const } : s
      ),
    };
  });

  return { ...execution, exercises, updatedAt: new Date().toISOString() };
}

export function applyCompleteSession(
  execution: TrainingSessionExecution,
  params: {
    overallRpe?: number | null;
    difficulty?: TrainingSessionDifficulty | null;
    painDuringSession?: boolean | null;
    painRegions?: string[];
    notes?: string | null;
    now?: Date;
  }
): TrainingSessionExecution {
  if (execution.status === 'completed') return execution;
  if (execution.status !== 'in_progress') {
    throw new TrainingExecutionMutationError(
      'Esta execução não pode ser concluída.',
      'not_in_progress'
    );
  }

  validateRpe(params.overallRpe);

  const anyStarted = execution.exercises.some(
    (e) => e.status !== 'pending' || e.sets.some((s) => s.status !== 'pending')
  );
  if (!anyStarted) {
    throw new TrainingExecutionMutationError(
      'Inicie pelo menos um exercício antes de concluir.',
      'nothing_started'
    );
  }

  const now = params.now ?? new Date();
  const started = new Date(execution.timing.startedAt);
  const durationSeconds = Math.max(
    0,
    Math.round((now.getTime() - started.getTime()) / 1000)
  );

  const exercises = execution.exercises.map((e) => {
    if (e.status === 'completed' || e.status === 'skipped') return e;
    return {
      ...e,
      status: 'skipped' as const,
      skipReason: e.skipReason || 'finalized_incomplete',
      sets: e.sets.map((s) =>
        s.status === 'pending' ? { ...s, status: 'skipped' as const } : s
      ),
    };
  });

  return {
    ...execution,
    status: 'completed',
    exercises,
    patientFeedback: {
      overallRpe: params.overallRpe ?? execution.patientFeedback.overallRpe,
      difficulty: params.difficulty ?? execution.patientFeedback.difficulty,
      painDuringSession:
        params.painDuringSession ?? execution.patientFeedback.painDuringSession,
      painRegions: params.painRegions ?? execution.patientFeedback.painRegions,
      notes:
        params.notes != null
          ? String(params.notes).slice(0, 2000)
          : execution.patientFeedback.notes,
    },
    timing: {
      ...execution.timing,
      completedAt: now.toISOString(),
      durationSeconds,
    },
    updatedAt: now.toISOString(),
  };
}

export function applyAbandonSession(
  execution: TrainingSessionExecution,
  params: { reason?: string | null; now?: Date } = {}
): TrainingSessionExecution {
  if (execution.status === 'abandoned') return execution;
  if (execution.status === 'completed') {
    throw new TrainingExecutionMutationError(
      'Não é possível abandonar um treino já concluído.',
      'cannot_abandon'
    );
  }

  const now = params.now ?? new Date();
  return {
    ...execution,
    status: 'abandoned',
    abandonReason: params.reason ? String(params.reason).slice(0, 500) : null,
    timing: {
      ...execution.timing,
      abandonedAt: now.toISOString(),
      durationSeconds: Math.max(
        0,
        Math.round((now.getTime() - new Date(execution.timing.startedAt).getTime()) / 1000)
      ),
    },
    updatedAt: now.toISOString(),
  };
}
