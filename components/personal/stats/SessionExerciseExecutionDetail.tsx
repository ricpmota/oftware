'use client';

import type { TrainingExerciseExecution } from '@/lib/personal/trainingExecutionSeries';
import { formatKg } from '@/lib/personal/trainingStats';

export function SessionExerciseExecutionDetail({
  execution,
}: {
  execution: TrainingExerciseExecution | null;
}) {
  if (!execution || execution.series.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-0.5">
      {execution.series.map((row) => (
        <p key={row.seriesId} className="text-[10px] text-[#E8EDED]/55">
          S{row.order} Prescrito {row.prescribedReps}×
          {row.prescribedLoadKg == null ? ' —' : ` ${formatKg(row.prescribedLoadKg)}`}
          {' · '}
          {row.status === 'skipped' ? (
            <span className="text-red-300">Pulou</span>
          ) : row.status === 'pending' ? (
            'Pendente'
          ) : (
            <>
              Realizado {row.actualReps ?? '—'}×
              {row.actualLoadKg == null ? ' —' : ` ${formatKg(row.actualLoadKg)}`}
            </>
          )}
        </p>
      ))}
    </div>
  );
}

export default SessionExerciseExecutionDetail;
