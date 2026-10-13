'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Minus, Plus } from 'lucide-react';
import {
  formatLoadKgInput,
  parseLoadKgInput,
} from '@/lib/personal/trainingExerciseSeries';
import {
  getNextPendingSeries,
  getSeriesProgress,
  type TrainingExerciseExecution,
  type TrainingExecutedSeries,
} from '@/lib/personal/trainingExecutionSeries';

function clampRestSec(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(600, Math.max(0, Math.round(value)));
}

export function WorkoutRunSeriesPanel({
  execution,
  loading,
  saving,
  readOnly,
  currentSeriesId,
  accent = false,
  intercalatedHint = false,
  visualSteps,
  onCompleteSeries,
  onSkipSeries,
  onRedoExercise,
  onPrescriptionChange,
}: {
  execution: TrainingExerciseExecution | null;
  loading?: boolean;
  saving?: boolean;
  readOnly?: boolean;
  currentSeriesId?: string;
  accent?: boolean;
  intercalatedHint?: boolean;
  visualSteps?: Array<{
    key: string;
    label: string;
    status: 'pending' | 'done' | 'skipped';
    isCurrent: boolean;
    accent?: boolean;
  }>;
  onCompleteSeries: (
    seriesId: string,
    actualReps: number,
    actualLoadKg: number | null,
    restSec: number
  ) => void;
  onSkipSeries: (seriesId: string) => void;
  onRedoExercise?: () => void;
  onPrescriptionChange?: (
    seriesId: string,
    reps: number,
    loadKg: number | null,
    restSec: number
  ) => void;
}) {
  const current = execution
    ? currentSeriesId
      ? execution.series.find((item) => item.seriesId === currentSeriesId && item.status === 'pending') ||
        getNextPendingSeries(execution)
      : getNextPendingSeries(execution)
    : null;
  const progress = execution ? getSeriesProgress(execution) : null;
  const [reps, setReps] = useState(0);
  const [loadText, setLoadText] = useState('');
  const [restSec, setRestSec] = useState(60);

  useEffect(() => {
    if (!current) return;
    setReps(current.prescribedReps);
    setLoadText(formatLoadKgInput(current.prescribedLoadKg));
    setRestSec(clampRestSec(current.prescribedRestSec));
  }, [current?.seriesId]);

  const emitPrescriptionChange = (
    nextReps: number,
    nextLoadText: string,
    nextRestSec: number
  ) => {
    if (!current || readOnly || !onPrescriptionChange) return;
    onPrescriptionChange(
      current.seriesId,
      nextReps,
      parseLoadKgInput(nextLoadText),
      clampRestSec(nextRestSec)
    );
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 px-3 py-5 text-center text-sm text-[#E8EDED]/60">
        Carregando treino...
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 px-3 py-3 text-sm text-[#E8EDED]/60">
        Não foi possível carregar a execução deste exercício.
      </div>
    );
  }

  if (!current) {
    const isDone = execution.status !== 'skipped';
    const label = isDone ? 'Exercício concluído' : 'Exercício pulado';
    return (
      <div
        className={`rounded-2xl px-3 py-2.5 space-y-1 ${
          isDone
            ? 'bg-[#4CCB7A]/10 ring-1 ring-[#4CCB7A]/30'
            : 'bg-red-500/10 ring-1 ring-red-400/25'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold ${isDone ? 'text-[#4CCB7A]' : 'text-red-300'}`}>
            {label}
          </p>
          {onRedoExercise && !readOnly ? (
            <button
              type="button"
              disabled={saving}
              onClick={onRedoExercise}
              className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/10 text-[#E8EDED]/80 hover:bg-white/15 hover:text-[#E8EDED] disabled:opacity-40"
            >
              {saving ? (isDone ? 'Refazendo...' : 'Retornando...') : isDone ? 'Refazer' : 'Retornar'}
            </button>
          ) : null}
        </div>
        {progress ? (
          <p className="text-[11px] text-[#E8EDED]/55">
            {progress.done} série{progress.done === 1 ? '' : 's'} realizada
            {progress.done === 1 ? '' : 's'}
            {progress.skipped ? ` · ${progress.skipped} pulada${progress.skipped === 1 ? '' : 's'}` : ''}
          </p>
        ) : null}
      </div>
    );
  }

  const stepperBtn =
    'h-8 w-8 shrink-0 rounded-lg bg-white/10 text-[#E8EDED] disabled:opacity-40 inline-flex items-center justify-center';
  const fieldInput =
    'h-8 rounded-lg border border-white/15 bg-white/10 text-center text-sm font-semibold text-[#E8EDED] tabular-nums outline-none disabled:opacity-50';
  const labelClass = 'w-[4.75rem] shrink-0 text-[11px] text-[#E8EDED]/60';

  return (
    <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 px-3 py-2.5 space-y-2">
      <div className="flex gap-1.5">
        {(visualSteps && visualSteps.length > 0
          ? visualSteps
          : execution.series.map((item: TrainingExecutedSeries) => ({
              key: item.seriesId,
              label: `S${item.order}`,
              status: item.status,
              isCurrent: item.seriesId === current.seriesId,
              accent: false,
            }))
        ).map((item) => (
          <span
            key={item.key}
            className={`flex-1 h-7 rounded-lg text-[10px] font-semibold inline-flex items-center justify-center ${
              item.status === 'done'
                ? item.accent
                  ? 'bg-[#2F8FA3]/20 text-[#2F8FA3]'
                  : 'bg-[#4CCB7A]/20 text-[#4CCB7A]'
                : item.status === 'skipped'
                  ? 'bg-red-500/20 text-red-300'
                  : item.isCurrent
                    ? item.accent || accent
                      ? 'bg-[#2F8FA3] text-white'
                      : 'bg-[#4CCB7A] text-[#0A1F44]'
                    : 'bg-white/10 text-[#E8EDED]/45'
            }`}
          >
            {item.label}
            {item.status === 'done' ? ' ✓' : item.status === 'skipped' ? ' —' : item.isCurrent ? ' ·' : ''}
          </span>
        ))}
      </div>

      {intercalatedHint ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2F8FA3]">
          ⇄ Exercício intercalado
        </p>
      ) : null}

      <div className="flex items-center gap-1.5 min-w-0">
        <span className={labelClass}>Repetições</span>
        <button
          type="button"
          disabled={readOnly || saving}
          onClick={() => {
            const next = Math.max(0, reps - 1);
            setReps(next);
            emitPrescriptionChange(next, loadText, restSec);
          }}
          className={stepperBtn}
          aria-label="Diminuir repetições"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={reps}
          disabled={readOnly || saving}
          onChange={(e) => {
            const next = Math.max(0, Math.round(Number(e.target.value) || 0));
            setReps(next);
            emitPrescriptionChange(next, loadText, restSec);
          }}
          className={`${fieldInput} w-11 shrink-0`}
        />
        <button
          type="button"
          disabled={readOnly || saving}
          onClick={() => {
            const next = reps + 1;
            setReps(next);
            emitPrescriptionChange(next, loadText, restSec);
          }}
          className={stepperBtn}
          aria-label="Aumentar repetições"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] text-[#E8EDED]/60 shrink-0 ml-1">Carga</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder={current.prescribedLoadKg == null ? '—' : 'kg'}
          value={loadText}
          disabled={readOnly || saving}
          onChange={(e) => {
            const next = e.target.value;
            setLoadText(next);
            emitPrescriptionChange(reps, next, restSec);
          }}
          className={`${fieldInput} w-14 shrink-0 px-1`}
        />
        <span className="text-[11px] text-[#E8EDED]/45 shrink-0">kg</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className={labelClass}>Descanso</span>
        <button
          type="button"
          disabled={readOnly || saving}
          onClick={() => {
            const next = clampRestSec(restSec - 5);
            setRestSec(next);
            emitPrescriptionChange(reps, loadText, next);
          }}
          className={stepperBtn}
          aria-label="Diminuir descanso"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <input
          type="number"
          min={0}
          max={600}
          inputMode="numeric"
          value={restSec}
          disabled={readOnly || saving}
          onChange={(e) => {
            const next = clampRestSec(Number(e.target.value));
            setRestSec(next);
            emitPrescriptionChange(reps, loadText, next);
          }}
          className={`${fieldInput} w-11 shrink-0`}
        />
        <button
          type="button"
          disabled={readOnly || saving}
          onClick={() => {
            const next = clampRestSec(restSec + 5);
            setRestSec(next);
            emitPrescriptionChange(reps, loadText, next);
          }}
          className={stepperBtn}
          aria-label="Aumentar descanso"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] text-[#E8EDED]/45 shrink-0">s</span>
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={readOnly || saving}
          onClick={() =>
            onCompleteSeries(
              current.seriesId,
              reps,
              parseLoadKgInput(loadText),
              restSec
            )
          }
          className={`flex-1 h-9 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 ${
            accent ? 'bg-[#2F8FA3] text-white' : 'bg-[#4CCB7A] text-[#0A1F44] hover:bg-[#45b86d]'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Concluir série'}
        </button>
        <button
          type="button"
          disabled={readOnly || saving}
          onClick={() => onSkipSeries(current.seriesId)}
          className="flex-1 h-9 rounded-lg text-xs font-semibold text-[#E8EDED]/75 bg-white/10 hover:bg-white/15 disabled:opacity-50"
        >
          Pular série
        </button>
      </div>
    </div>
  );
}

export default WorkoutRunSeriesPanel;
