'use client';

import { Loader2, X } from 'lucide-react';
import { labelMuscle, labelSelectionReason } from '@/lib/trainingEngine/draftLabels';
import type { ReplacementCandidate } from '@/lib/trainingEngine/listReplacementCandidates';

export type WorkoutExerciseReplaceModalProps = {
  open: boolean;
  loading: boolean;
  candidates: ReplacementCandidate[];
  currentName: string;
  onClose: () => void;
  onSelect: (candidate: ReplacementCandidate) => void;
};

export function WorkoutExerciseReplaceModal({
  open,
  loading,
  candidates,
  currentName,
  onClose,
  onSelect,
}: WorkoutExerciseReplaceModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg max-h-[90dvh] sm:max-h-[85vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Substituir exercício</h3>
            <p className="text-xs text-slate-500 mt-0.5">Atual: {currentName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-10 text-slate-500 gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              Buscando alternativas compatíveis…
            </div>
          )}
          {!loading && candidates.length === 0 && (
            <p className="text-sm text-slate-600 py-8 text-center">
              Nenhuma alternativa compatível encontrada para este componente.
            </p>
          )}
          {!loading &&
            candidates.map((c) => (
              <button
                key={c.exercise.exerciseId}
                type="button"
                onClick={() => onSelect(c)}
                className="w-full text-left rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 p-3 transition-colors"
              >
                <p className="text-sm font-semibold text-slate-900">{c.exercise.exerciseName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.exercise.primaryMuscles.map(labelMuscle).join(', ')}
                  {c.exercise.equipment.length
                    ? ` · ${c.exercise.equipment.join(', ')}`
                    : ''}
                </p>
                <ul className="mt-2 space-y-0.5">
                  {c.exercise.selectionReasons.slice(0, 3).map((r) => (
                    <li key={r} className="text-[11px] text-slate-600">
                      · {labelSelectionReason(r)}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

export default WorkoutExerciseReplaceModal;
