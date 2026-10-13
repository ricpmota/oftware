'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import HydrationProgressBar from '@/components/nutri/hidratacao/HydrationProgressBar';
import HydrationQuickAdd from '@/components/nutri/hidratacao/HydrationQuickAdd';
import {
  calcHydrationPercentage,
  classifyHydrationAdherence,
  formatHydrationLiters,
  formatHydrationLongDate,
  formatHydrationMl,
  hydrationAdherenceLabel,
  hydrationAmountErrorMessage,
  parseHydrationDailyTotalInput,
} from '@/lib/nutri/hidratacao/hydrationMath';
import type { HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';
import { hydrationSourceLabel } from '@/lib/nutri/hidratacao/hydrationProfessional';

type HydrationDayDetailsProps = {
  date: string;
  todayYmd: string;
  record: HydrationRecord | null;
  currentGoalMl: number;
  canWrite: boolean;
  showSource?: boolean;
  busy?: boolean;
  onClose: () => void;
  onAdd?: (ml: number) => void;
  onSetTotal?: (ml: number) => void;
};

export default function HydrationDayDetails({
  date,
  todayYmd,
  record,
  currentGoalMl,
  canWrite,
  showSource,
  busy,
  onClose,
  onAdd,
  onSetTotal,
}: HydrationDayDetailsProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(record ? String(record.consumedMl) : '');
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setEditValue(record ? String(record.consumedMl) : '');
    setEditError(null);
  }, [date, record]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const goalMl = record?.goalMl && record.goalMl > 0 ? record.goalMl : currentGoalMl;
  const hasRecord = record != null;
  const percentage = hasRecord ? calcHydrationPercentage(record.consumedMl, record.goalMl) : 0;
  const status = classifyHydrationAdherence({
    hasRecord,
    consumedMl: record?.consumedMl,
    goalMl: record?.goalMl,
  });
  const title = formatHydrationLongDate(date, todayYmd);

  const saveEdit = () => {
    const parsed = parseHydrationDailyTotalInput(editValue);
    if (!parsed.ok) {
      setEditError(hydrationAmountErrorMessage(parsed.error));
      return;
    }
    onSetTotal?.(parsed.ml);
    setEditing(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hydration-day-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:rounded-2xl dark:border-white/10 dark:bg-[#0A1F44] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 id="hydration-day-title" className="text-base font-semibold capitalize text-[#0A1F44] dark:text-[#E8EDED]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#0A1F44]/50 hover:bg-black/5 dark:text-[#E8EDED]/60"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {hasRecord ? (
          <div className="space-y-3">
            <p className="text-xl font-bold tabular-nums text-[#0A1F44] dark:text-[#E8EDED]">
              {showSource
                ? formatHydrationLiters(record.consumedMl)
                : formatHydrationMl(record.consumedMl).replace(' ml', '')}{' '}
              <span className="text-base font-semibold text-[#0A1F44]/60 dark:text-[#E8EDED]/60">
                / {showSource ? formatHydrationLiters(record.goalMl) : formatHydrationMl(record.goalMl)}
              </span>
            </p>
            <p className="text-sm text-[#0A1F44]/80 dark:text-[#E8EDED]/80">
              {percentage}% da meta
              {showSource
                ? ` · ${formatHydrationMl(record.consumedMl)} / ${formatHydrationMl(record.goalMl)}`
                : ''}
            </p>
            <HydrationProgressBar percentage={percentage} goalReached={percentage >= 100} />
            <p className="text-sm font-semibold text-[#2F8FA3] dark:text-[#4CCB7A]">
              {hydrationAdherenceLabel(status)}
              {status === 'meta_atingida' ? ' ✓' : ''}
            </p>
            {showSource ? (
              <p className="text-xs text-[#0A1F44]/55 dark:text-[#E8EDED]/50">
                Origem: {hydrationSourceLabel(record.lastSource ?? record.source)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[#0A1F44]/70 dark:text-[#E8EDED]/70">Nenhum consumo informado.</p>
        )}

        {canWrite ? (
          <div className="mt-4 space-y-3">
            {editing ? (
              <div>
                <HydrationQuickAdd disabled={!goalMl} busy={busy} onAdd={(ml) => onAdd?.(ml)} />
                <label htmlFor="hydration-edit-day" className="mt-3 block text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED]">
                  Consumo total
                </label>
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="hydration-edit-day"
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
                    className="min-h-12 shrink-0 rounded-xl bg-[#0A1F44] px-4 text-sm font-semibold text-white dark:bg-[#4CCB7A] dark:text-[#0A1F44]"
                  >
                    Salvar
                  </button>
                </div>
                {editError ? (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {editError}
                  </p>
                ) : (
                  <button type="button" className="mt-2 text-xs text-gray-500 underline" onClick={() => setEditing(false)}>
                    Cancelar
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="min-h-12 w-full rounded-xl border border-[#2F8FA3]/35 bg-white px-4 text-sm font-semibold text-[#0A1F44] hover:bg-[#4CCB7A]/10 dark:border-[#4CCB7A]/30 dark:bg-[#0A1F44]/60 dark:text-[#E8EDED]"
              >
                {hasRecord ? 'Editar registro' : 'Registrar consumo'}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
