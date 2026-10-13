/**
 * Orquestrador derivado da sequência intercalada.
 * Não persiste sequence[]. Combina séries do host + ocorrências intercaladas.
 */

import {
  createExerciseExecutionFromPrescription,
  getExerciseExecutionStatus,
  resetExerciseExecution,
  skipExecutedSeries,
  skipRemainingExerciseSeries,
  type TrainingExerciseExecution,
} from '@/lib/personal/trainingExecutionSeries';
import type { TrainingIntercalatedOccurrence } from '@/lib/personal/trainingExerciseSeries';
import {
  buildHostRunQueue,
  type HostRunStep,
} from '@/lib/personal/trainingIntercalation';

export type { HostRunStep };

export function createIntercalationExecution(
  occurrence: TrainingIntercalatedOccurrence
): TrainingExerciseExecution {
  return createExerciseExecutionFromPrescription({
    exerciseDocId: occurrence.id,
    exerciseId: occurrence.exerciseId,
    prescription: { series: [occurrence.series] },
    trainerNote: occurrence.trainerNote,
  });
}

export function stepExecution(
  step: HostRunStep,
  hostExecution: TrainingExerciseExecution | null | undefined,
  intercalationExecutions: Record<string, TrainingExerciseExecution>
): TrainingExerciseExecution | null {
  if (step.kind === 'main') return hostExecution ?? null;
  return intercalationExecutions[step.intercalationId] ?? null;
}

export function isStepPending(
  step: HostRunStep,
  hostExecution: TrainingExerciseExecution | null | undefined,
  intercalationExecutions: Record<string, TrainingExerciseExecution>
): boolean {
  const execution = stepExecution(step, hostExecution, intercalationExecutions);
  const series = execution?.series.find((item) => item.seriesId === step.seriesId);
  return !series || series.status === 'pending';
}

export function getHostQueuePendingStep(
  queue: HostRunStep[],
  hostExecution: TrainingExerciseExecution | null | undefined,
  intercalationExecutions: Record<string, TrainingExerciseExecution>
): HostRunStep | null {
  return (
    queue.find((step) => isStepPending(step, hostExecution, intercalationExecutions)) ?? null
  );
}

export function isHostQueueTerminal(
  queue: HostRunStep[],
  hostExecution: TrainingExerciseExecution | null | undefined,
  intercalationExecutions: Record<string, TrainingExerciseExecution>
): boolean {
  if (queue.length === 0) {
    const status = getExerciseExecutionStatus(hostExecution?.series || []);
    return status === 'done' || status === 'skipped';
  }
  return queue.every((step) => !isStepPending(step, hostExecution, intercalationExecutions));
}

export function getHostQueueMarkStatus(
  queue: HostRunStep[],
  hostExecution: TrainingExerciseExecution | null | undefined,
  intercalationExecutions: Record<string, TrainingExerciseExecution>
): 'done' | 'skipped' | null {
  if (!isHostQueueTerminal(queue, hostExecution, intercalationExecutions)) return null;
  const skipped = queue.every((step) => {
    const execution = stepExecution(step, hostExecution, intercalationExecutions);
    const series = execution?.series.find((item) => item.seriesId === step.seriesId);
    return series?.status === 'skipped';
  });
  return skipped ? 'skipped' : 'done';
}

export function skipRemainingHostQueue(
  queue: HostRunStep[],
  hostExecution: TrainingExerciseExecution,
  intercalationExecutions: Record<string, TrainingExerciseExecution>,
  now?: Date
): {
  host: TrainingExerciseExecution;
  intercalations: Record<string, TrainingExerciseExecution>;
} {
  const pending = getHostQueuePendingStep(queue, hostExecution, intercalationExecutions);
  let host = hostExecution;
  const intercalations = { ...intercalationExecutions };
  let skipping = !pending;
  for (const step of queue) {
    if (pending && step === pending) skipping = true;
    if (!skipping) continue;
    if (step.kind === 'main') {
      host = skipExecutedSeries(host, step.seriesId, now);
    } else {
      const current = intercalations[step.intercalationId];
      if (current) {
        intercalations[step.intercalationId] = skipExecutedSeries(current, step.seriesId, now);
      }
    }
  }
  if (!pending) {
    host = skipRemainingExerciseSeries(host, now);
  }
  return { host, intercalations };
}

export function resetHostQueueExecutions(
  hostExecution: TrainingExerciseExecution,
  intercalationExecutions: Record<string, TrainingExerciseExecution>,
  occurrences: TrainingIntercalatedOccurrence[],
  now?: Date
): {
  host: TrainingExerciseExecution;
  intercalations: Record<string, TrainingExerciseExecution>;
} {
  const intercalations: Record<string, TrainingExerciseExecution> = {};
  for (const occurrence of occurrences) {
    const current = intercalationExecutions[occurrence.id];
    intercalations[occurrence.id] = current
      ? resetExerciseExecution(current, now)
      : createIntercalationExecution(occurrence);
  }
  return {
    host: resetExerciseExecution(hostExecution, now),
    intercalations,
  };
}

export function buildHostRunQueueForExercise(exercise: {
  prescription?: {
    series?: Array<{ id: string; order?: number }>;
    intercalations?: TrainingIntercalatedOccurrence[];
  };
}): HostRunStep[] {
  return buildHostRunQueue(
    exercise.prescription?.series || [],
    exercise.prescription?.intercalations
  );
}
