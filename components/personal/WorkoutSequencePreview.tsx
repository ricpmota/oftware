'use client';

import { ArrowLeftRight } from 'lucide-react';
import { translateExerciseName } from '@/data/exerciseTranslations';
import { formatLoadKgInput } from '@/lib/personal/trainingExerciseSeries';
import { buildHostRunQueue } from '@/lib/personal/trainingIntercalation';
import type { TrainingIntercalatedOccurrence } from '@/lib/personal/trainingExerciseSeries';
import type { TrainingExerciseExecution } from '@/lib/personal/trainingExecutionSeries';

export type WorkoutSequencePreviewExercise = {
  name: string;
  prescription?: {
    series?: Array<{
      id: string;
      order?: number;
      reps: number;
      loadKg: number | null;
      restSec?: number;
    }>;
    intercalations?: TrainingIntercalatedOccurrence[];
  };
};

function formatLoad(loadKg: number | null): string {
  return loadKg == null ? '—' : `${formatLoadKgInput(loadKg)} kg`;
}

export function WorkoutSequencePreview({
  exercise,
  hostExecution,
  intercalationExecutions,
}: {
  exercise: WorkoutSequencePreviewExercise;
  hostExecution?: TrainingExerciseExecution | null;
  intercalationExecutions?: Record<string, TrainingExerciseExecution>;
}) {
  const series = exercise.prescription?.series || [];
  const intercalations = exercise.prescription?.intercalations || [];
  if (intercalations.length === 0) return null;

  const queue = buildHostRunQueue(series, intercalations);
  const hostName = translateExerciseName(exercise.name);

  return (
    <div className="mt-1.5 space-y-1">
      {queue.map((step) => {
        if (step.kind === 'main') {
          const item = series.find((row) => row.id === step.seriesId);
          const executed = hostExecution?.series.find((row) => row.seriesId === step.seriesId);
          return (
            <p key={`main-${step.seriesId}`} className="text-[10px] text-[#E8EDED]/70">
              <span className="font-semibold text-[#4CCB7A]">{hostName}</span>
              {' · '}S{step.seriesOrder} {item?.reps ?? executed?.prescribedReps}×
              {formatLoad(item?.loadKg ?? executed?.prescribedLoadKg ?? null)}
            </p>
          );
        }
        const occ = intercalations.find((row) => row.id === step.intercalationId);
        const executed = intercalationExecutions?.[step.intercalationId]?.series.find(
          (row) => row.seriesId === step.seriesId
        );
        return (
          <p key={`int-${step.intercalationId}`} className="text-[10px] text-[#2F8FA3]">
            <ArrowLeftRight className="inline h-3 w-3 mr-1 align-text-bottom" />
            {translateExerciseName(occ?.name || step.exerciseId)}
            {' · '}S{step.labelOrder} {occ?.series.reps ?? executed?.prescribedReps}×
            {formatLoad(occ?.series.loadKg ?? executed?.prescribedLoadKg ?? null)}
          </p>
        );
      })}
    </div>
  );
}

export default WorkoutSequencePreview;
