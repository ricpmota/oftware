'use client';

import { useState } from 'react';
import {
  labelExerciseRole,
  labelMuscle,
  labelSelectionReason,
  labelWarning,
} from '@/lib/trainingEngine/draftLabels';
import type { SelectedWorkoutExercise } from '@/types/workoutPlanDraft';

export type WorkoutDraftExerciseCardProps = {
  exercise: SelectedWorkoutExercise;
  order: number;
  canEdit: boolean;
  onReplace?: () => void;
  onUndo?: (() => void) | null;
  imageUrl?: string | null;
};

export function WorkoutDraftExerciseCard({
  exercise,
  order,
  canEdit,
  onReplace,
  onUndo,
  imageUrl,
}: WorkoutDraftExerciseCardProps) {
  const [showReasons, setShowReasons] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3">
      <div className="flex gap-3">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
          {imageUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-xs text-slate-400 font-medium">{order}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
              {order}. {exercise.exerciseName}
            </h4>
            <span className="text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
              {labelExerciseRole(exercise.role)}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {exercise.primaryMuscles.map(labelMuscle).join(', ') || '—'}
            {exercise.equipment.length > 0
              ? ` · ${exercise.equipment.join(', ')}`
              : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs text-slate-700 pt-1">
            <span>
              <strong>{exercise.sets}</strong> séries
            </span>
            <span>
              <strong>
                {exercise.repetitionRange.min}–{exercise.repetitionRange.max}
              </strong>{' '}
              reps
            </span>
            <span>
              Descanso: <strong>{exercise.restSeconds}s</strong>
            </span>
            <span>
              RPE:{' '}
              <strong>
                {exercise.targetRpe.min}–{exercise.targetRpe.max}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {exercise.compatibilityWarnings.length > 0 && (
        <ul className="space-y-1">
          {exercise.compatibilityWarnings.map((w) => (
            <li
              key={w}
              className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5"
            >
              {labelWarning(w)}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowReasons((v) => !v)}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2"
        >
          {showReasons ? 'Ocultar motivos' : 'Por que este exercício foi selecionado?'}
        </button>
        {canEdit && onReplace && (
          <button
            type="button"
            onClick={onReplace}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Substituir exercício
          </button>
        )}
        {canEdit && onUndo && (
          <button
            type="button"
            onClick={onUndo}
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Desfazer substituição
          </button>
        )}
      </div>

      {showReasons && (
        <ul className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 space-y-1">
          {exercise.selectionReasons.length === 0 ? (
            <li className="text-xs text-slate-500">Sem motivos registrados.</li>
          ) : (
            exercise.selectionReasons.map((r) => (
              <li key={r} className="text-xs text-slate-700">
                {labelSelectionReason(r)}
              </li>
            ))
          )}
        </ul>
      )}
    </article>
  );
}

export default WorkoutDraftExerciseCard;
