'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import {
  previewWeeklyBoardApplication,
  type ApplyWeeklyBoardPreview,
} from '@/lib/metapersonal/applyWeeklyTrainingBoard';
import {
  TRAINING_RECURRENCE_DEFAULT_WEEKS,
  TRAINING_RECURRENCE_MAX_WEEKS,
  TRAINING_RECURRENCE_MIN_WEEKS,
  clampTrainingWeeksCount,
  todayLocalYYYYMMDD,
} from '@/lib/personal/trainingRecurrence';
import type { TreinosSelectedPatient, TreinosWeeklyBoard } from './treinosCentral.types';

const WEEK_PRESETS = [1, 2, 4, 6, 8, 12] as const;

type Props = {
  open: boolean;
  patients: TreinosSelectedPatient[];
  board: TreinosWeeklyBoard;
  createdById: string;
  applying: boolean;
  progress?: { done: number; total: number } | null;
  onClose: () => void;
  onConfirm: (input: { startDate: string; weeksCount: number }) => void;
};

function weeksLabel(weeks: number): string {
  return weeks === 1 ? '1 semana' : `${weeks} semanas`;
}

export function TreinosApplyPlanModal({
  open,
  patients,
  board,
  createdById,
  applying,
  progress,
  onClose,
  onConfirm,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [startDate, setStartDate] = useState(todayLocalYYYYMMDD);
  const [weeksCount, setWeeksCount] = useState(TRAINING_RECURRENCE_DEFAULT_WEEKS);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStartDate(todayLocalYYYYMMDD());
    setWeeksCount(TRAINING_RECURRENCE_DEFAULT_WEEKS);
  }, [open]);

  const today = todayLocalYYYYMMDD();
  const preview: ApplyWeeklyBoardPreview = useMemo(
    () =>
      previewWeeklyBoardApplication({
        patients,
        board,
        startDate,
        weeksCount,
        createdById,
        today,
      }),
    [patients, board, startDate, weeksCount, createdById, today]
  );

  if (!open || !portalReady) return null;

  const canSubmit = !applying && preview.errors.length === 0 && preview.sessionCount > 0;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!applying) onClose();
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Aplicar planejamento</h2>
            <p className="mt-1 text-sm text-gray-600">
              Defina por quanto tempo esta programação será aplicada aos pacientes selecionados.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {preview.patientCount} {preview.patientCount === 1 ? 'paciente' : 'pacientes'}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {preview.dayCount} {preview.dayCount === 1 ? 'dia programado' : 'dias programados'}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {preview.cardCount} {preview.cardCount === 1 ? 'treino' : 'treinos'}
            </span>
          </div>

          <div>
            <label htmlFor="treinos-apply-start" className="text-sm font-semibold text-gray-900">
              Início do planejamento
            </label>
            <input
              id="treinos-apply-start"
              type="date"
              min={today}
              value={startDate}
              disabled={applying}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900">Duração do planejamento</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WEEK_PRESETS.map((weeks) => (
                <button
                  key={weeks}
                  type="button"
                  disabled={applying}
                  onClick={() => setWeeksCount(weeks)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    weeksCount === weeks
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {weeksLabel(weeks)}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={TRAINING_RECURRENCE_MIN_WEEKS}
                max={TRAINING_RECURRENCE_MAX_WEEKS}
                value={weeksCount}
                disabled={applying}
                onChange={(event) => setWeeksCount(clampTrainingWeeksCount(Number(event.target.value)))}
                className="flex-1 accent-emerald-500"
                aria-label="Duração em semanas"
              />
              <span className="w-24 text-right text-sm font-medium text-gray-700">
                {weeksLabel(weeksCount)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              {TRAINING_RECURRENCE_MIN_WEEKS} a {TRAINING_RECURRENCE_MAX_WEEKS} semanas.
            </p>
          </div>

          {preview.sessionCount > 0 && preview.errors.length === 0 ? (
            <p className="text-xs text-gray-500">
              Serão criadas {preview.sessionCount}{' '}
              {preview.sessionCount === 1 ? 'sessão' : 'sessões'} no calendário dos pacientes.
            </p>
          ) : null}

          {preview.errors.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {preview.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}

          {applying && progress ? (
            <p className="flex items-center gap-2 text-xs text-gray-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Publicando {progress.done}/{progress.total} sessões...
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="h-10 rounded-lg px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirm({ startDate, weeksCount })}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Aplicar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
