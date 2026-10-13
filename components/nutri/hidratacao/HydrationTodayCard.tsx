'use client';

import { useState } from 'react';
import { Droplet } from 'lucide-react';
import HydrationProgressBar from '@/components/nutri/hidratacao/HydrationProgressBar';
import HydrationQuickAdd from '@/components/nutri/hidratacao/HydrationQuickAdd';
import {
  calcHydrationPercentage,
  formatHydrationMl,
  hydrationAmountErrorMessage,
  isHydrationGoalReached,
  parseHydrationDailyTotalInput,
  remainingMlToGoal,
} from '@/lib/nutri/hidratacao/hydrationMath';

type HydrationTodayCardProps = {
  goalMl: number;
  consumedMl: number;
  hasRecord: boolean;
  canEdit: boolean;
  busy?: boolean;
  onAdd: (ml: number) => void;
  onSetTotal: (ml: number) => void;
};

export default function HydrationTodayCard({
  goalMl,
  consumedMl,
  hasRecord,
  canEdit,
  busy,
  onAdd,
  onSetTotal,
}: HydrationTodayCardProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(consumedMl || ''));
  const [editError, setEditError] = useState<string | null>(null);

  const percentage = calcHydrationPercentage(consumedMl, goalMl);
  const goalReached = isHydrationGoalReached(consumedMl, goalMl);
  const remaining = remainingMlToGoal(consumedMl, goalMl);

  const saveEdit = () => {
    const parsed = parseHydrationDailyTotalInput(editValue);
    if (!parsed.ok) {
      setEditError(hydrationAmountErrorMessage(parsed.error));
      return;
    }
    onSetTotal(parsed.ml);
    setEditing(false);
    setEditError(null);
  };

  return (
    <div className="rounded-2xl border border-[#4CCB7A]/35 bg-gradient-to-br from-[#4CCB7A]/12 via-white to-[#2F8FA3]/10 p-4 shadow-[0_10px_26px_-14px_rgba(76,203,122,0.4)] sm:p-5 dark:from-[#4CCB7A]/15 dark:via-[#0A1F44]/70 dark:to-[#2F8FA3]/20">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0A1F44]/55 dark:text-[#E8EDED]/55">
            Meta diária
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#0A1F44] dark:text-[#E8EDED] sm:text-3xl">
            {formatHydrationMl(goalMl)}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4CCB7A]/20">
          <Droplet className="h-4 w-4 text-[#2F8FA3] dark:text-[#4CCB7A]" aria-hidden />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <HydrationProgressBar
          variant="ring"
          percentage={hasRecord ? percentage : 0}
          goalReached={hasRecord && goalReached}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold tabular-nums text-[#0A1F44] dark:text-[#E8EDED] sm:text-2xl">
            {hasRecord ? formatHydrationMl(consumedMl) : '—'}
          </p>
          <p className="text-xs text-[#0A1F44]/60 dark:text-[#E8EDED]/60">consumidos</p>
          {hasRecord ? (
            <p className="mt-1.5 text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
              {percentage}%
              {goalReached ? (
                <span className="ml-2 font-semibold text-[#2F8FA3] dark:text-[#4CCB7A]">Meta atingida ✓</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-[#0A1F44]/65 dark:text-[#E8EDED]/65">Ainda sem registro hoje</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-[#0A1F44]/75 dark:text-[#E8EDED]/75">
        {!hasRecord
          ? 'Comece a registrar o que já bebeu hoje.'
          : goalReached
            ? 'Você já atingiu a meta de água de hoje.'
            : remaining > 0
              ? `Faltam ${formatHydrationMl(remaining)} para atingir sua meta.`
              : 'Comece a registrar o que já bebeu hoje.'}
      </p>

      {canEdit ? (
        <div className="mt-4 space-y-3">
          <HydrationQuickAdd disabled={!goalMl} busy={busy} onAdd={onAdd} />

          {editing ? (
            <div className="rounded-xl border border-gray-200 bg-white/90 p-3 dark:border-white/10 dark:bg-[#06152e]/70">
              <label htmlFor="hydration-edit-today" className="block text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED]">
                Consumo total de hoje
              </label>
              <div className="mt-2 flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="hydration-edit-today"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value.replace(/[^\d]/g, ''));
                      setEditError(null);
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 pr-10 text-base text-[#0A1F44] outline-none focus:border-[#4CCB7A] focus:ring-2 focus:ring-[#4CCB7A]/30 dark:border-white/15 dark:bg-[#06152e] dark:text-[#E8EDED]"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                    ml
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveEdit}
                  className="min-h-12 shrink-0 rounded-xl bg-[#0A1F44] px-4 text-sm font-semibold text-white hover:bg-[#122a55] disabled:opacity-50 dark:bg-[#4CCB7A] dark:text-[#0A1F44]"
                >
                  Salvar alteração
                </button>
              </div>
              {editError ? (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {editError}
                </p>
              ) : (
                <button
                  type="button"
                  className="mt-2 text-xs text-gray-500 underline"
                  onClick={() => {
                    setEditing(false);
                    setEditError(null);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditValue(hasRecord ? String(consumedMl) : '');
                setEditing(true);
              }}
              className="text-xs text-[#2F8FA3] underline-offset-2 hover:underline dark:text-[#4CCB7A]"
            >
              Editar consumo de hoje
            </button>
          )}
        </div>
      ) : null}

      {!hasRecord && !canEdit ? (
        <p className="mt-3 text-xs text-[#0A1F44]/60 dark:text-[#E8EDED]/60">Ainda não há registro para hoje.</p>
      ) : null}
    </div>
  );
}
