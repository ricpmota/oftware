'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { translateExerciseName } from '@/data/exerciseTranslations';
import {
  formatKg,
  formatLoadVariationPercent,
  type ExerciseEvolutionSummary,
} from '@/lib/personal/trainingStats';

function formatDay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

export function ExerciseProgressionModal({
  exercise,
  onClose,
}: {
  exercise: ExerciseEvolutionSummary;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const chartData = exercise.occurrences
    .filter((item) => item.maxActualLoadKg != null)
    .map((item) => ({
      date: item.scheduledDate,
      label: formatDay(item.scheduledDate),
      kg: item.maxActualLoadKg as number,
    }));

  return (
    <div
      className="fixed inset-0 z-[226] flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-evolution-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg max-h-[100dvh] sm:max-h-[min(88dvh,720px)] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#0A1F44] text-[#E8EDED] flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-[#E8EDED]/50">Evolução da carga</p>
            <h2 id="exercise-evolution-title" className="text-lg font-semibold truncate">
              {translateExerciseName(exercise.name)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-[#E8EDED]/70"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/10 p-3">
              <p className="text-[10px] text-[#E8EDED]/50">Última carga</p>
              <p className="mt-1 text-sm font-semibold text-[#4CCB7A]">{formatKg(exercise.latestLoadKg)}</p>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <p className="text-[10px] text-[#E8EDED]/50">Maior carga</p>
              <p className="mt-1 text-sm font-semibold">{formatKg(exercise.maxLoadKg)}</p>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <p className="text-[10px] text-[#E8EDED]/50">Variação</p>
              <p className="mt-1 text-sm font-semibold">
                {formatLoadVariationPercent(exercise.variationPercent)}
              </p>
            </div>
          </div>

          {chartData.length >= 2 ? (
            <div className="h-40 rounded-xl border border-white/10 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#E8EDED', fontSize: 10 }} axisLine={false} />
                  <YAxis
                    tick={{ fill: '#E8EDED', fontSize: 10 }}
                    axisLine={false}
                    width={36}
                    tickFormatter={(value: number) => String(value)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const row = payload[0].payload as { label: string; kg: number };
                      return (
                        <div className="rounded-lg border border-white/15 bg-[#0A1F44] px-2 py-1.5 text-[11px] text-[#E8EDED]">
                          <p>{row.label}</p>
                          <p className="font-semibold">{row.kg} kg</p>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="kg" stroke="#4CCB7A" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Histórico</h3>
            {exercise.occurrences.map((occurrence) => (
              <div
                key={`${occurrence.sessionId}-${occurrence.exerciseDocId}`}
                className="rounded-xl border border-white/10 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{formatDay(occurrence.scheduledDate)}</p>
                  {occurrence.executionStatus === 'skipped' ? (
                    <span className="text-[10px] font-semibold text-red-300">Exercício pulado</span>
                  ) : occurrence.maxActualLoadKg != null ? (
                    <span className="text-[10px] text-[#E8EDED]/60">
                      Maior carga da sessão: {formatKg(occurrence.maxActualLoadKg)}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {occurrence.series.map((row) => (
                    <div
                      key={row.seriesId}
                      className="text-[11px] text-[#E8EDED]/75 flex flex-wrap gap-x-2"
                    >
                      <span className="font-semibold text-[#E8EDED]/90">S{row.order}</span>
                      <span>
                        Prescrito {row.prescribedReps}×
                        {row.prescribedLoadKg == null ? ' —' : ` ${formatKg(row.prescribedLoadKg)}`}
                      </span>
                      <span>
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
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExerciseProgressionModal;
