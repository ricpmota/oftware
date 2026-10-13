'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { labelSplit } from '@/lib/trainingEngine/draftLabels';
import type { ReviewedWorkoutPlanDraft } from '@/types/reviewedWorkoutPlanDraft';
import type { PublishedTrainingPlan } from '@/types/publishedTrainingPlan';

export type PublishTrainingPlanModalProps = {
  open: boolean;
  reviewed: ReviewedWorkoutPlanDraft;
  activePlan: PublishedTrainingPlan | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (params: {
    title: string;
    description: string;
    startsAt: string | null;
    endsAt: string | null;
    confirmSupersede: boolean;
  }) => void;
};

export function PublishTrainingPlanModal({
  open,
  reviewed,
  activePlan,
  busy,
  onClose,
  onConfirm,
}: PublishTrainingPlanModalProps) {
  const draft = reviewed.workingDraft;
  const [title, setTitle] = useState(
    `Plano de treino — Versão ${(activePlan?.planVersion || 0) + 1}`
  );
  const [description, setDescription] = useState('');
  const [startMode, setStartMode] = useState<'now' | 'future'>('now');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [confirmSupersede, setConfirmSupersede] = useState(false);

  if (!open) return null;

  const sessionCount = draft.sessions.length;
  const exerciseCount = draft.sessions.reduce((n, s) => n + s.exercises.length, 0);

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar"
        onClick={onClose}
        disabled={busy}
      />
      <div className="relative w-full sm:max-w-lg max-h-[92dvh] bg-white sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Publicar plano para o paciente
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {draft.structure.weeklyFrequency}x/semana ·{' '}
              {draft.structure.sessionDurationMinutes} min · {sessionCount} sessões ·{' '}
              {exerciseCount} exercícios · {labelSplit(draft.structure.splitStrategy)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <p className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
            Ao publicar, este plano ficará disponível para o paciente. Nenhuma sessão será marcada
            automaticamente no calendário.
          </p>

          {activePlan && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-2">
              <p className="text-sm text-amber-900 leading-relaxed">
                O paciente já possui um plano ativo (versão {activePlan.planVersion}). Ao continuar,
                o plano atual será arquivado como versão anterior e este passará a ser o plano ativo.
              </p>
              <label className="flex items-start gap-2 text-xs text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={confirmSupersede}
                  onChange={(e) => setConfirmSupersede(e.target.checked)}
                />
                Confirmo a substituição do plano ativo
              </label>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Título</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Descrição (opcional)</label>
            <textarea
              className="w-full min-h-[64px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700">Início</p>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={startMode === 'now'}
                  onChange={() => setStartMode('now')}
                />
                Imediato
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={startMode === 'future'}
                  onChange={() => setStartMode('future')}
                />
                Data futura
              </label>
            </div>
            {startMode === 'future' && (
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Data final (opcional)
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || (Boolean(activePlan) && !confirmSupersede)}
            onClick={() =>
              onConfirm({
                title: title.trim() || 'Plano de treino',
                description: description.trim(),
                startsAt:
                  startMode === 'future' && startsAt
                    ? new Date(startsAt + 'T00:00:00').toISOString()
                    : null,
                endsAt: endsAt ? new Date(endsAt + 'T23:59:59').toISOString() : null,
                confirmSupersede,
              })
            }
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Confirmar publicação
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublishTrainingPlanModal;
