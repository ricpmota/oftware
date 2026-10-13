'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { HYDRATION_QUICK_ADD_ML } from '@/lib/nutri/hidratacao/hydrationTypes';
import {
  hydrationAmountErrorMessage,
  parseHydrationMlInput,
  type HydrationAmountError,
} from '@/lib/nutri/hidratacao/hydrationMath';

type HydrationQuickAddProps = {
  disabled?: boolean;
  busy?: boolean;
  onAdd: (ml: number) => void;
};

export default function HydrationQuickAdd({ disabled, busy, onAdd }: HydrationQuickAddProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [error, setError] = useState<HydrationAmountError | null>(null);

  const locked = disabled || busy;

  const submitCustom = () => {
    const parsed = parseHydrationMlInput(customValue);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onAdd(parsed.ml);
    setCustomValue('');
    setCustomOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {HYDRATION_QUICK_ADD_ML.map((ml) => (
          <button
            key={ml}
            type="button"
            disabled={locked}
            onClick={() => onAdd(ml)}
            className="min-h-12 rounded-xl border border-[#2F8FA3]/30 bg-white px-3 py-3 text-sm font-semibold text-[#0A1F44] shadow-sm transition-colors hover:border-[#4CCB7A] hover:bg-[#4CCB7A]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#4CCB7A]/30 dark:bg-[#0A1F44]/60 dark:text-[#E8EDED] dark:hover:bg-[#4CCB7A]/15"
          >
            + {ml} ml
          </button>
        ))}
        <button
          type="button"
          disabled={locked}
          onClick={() => {
            setCustomOpen((open) => !open);
            setError(null);
          }}
          className="min-h-12 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#4CCB7A]/50 bg-[#4CCB7A]/15 px-3 py-3 text-sm font-semibold text-[#0A1F44] transition-colors hover:bg-[#4CCB7A]/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#E8EDED]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Adicionar
        </button>
      </div>

      {customOpen ? (
        <div className="rounded-xl border border-[#2F8FA3]/25 bg-white/80 p-3 dark:border-[#4CCB7A]/25 dark:bg-[#0A1F44]/50">
          <label htmlFor="hydration-custom-ml" className="block text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED]">
            Quantidade de água
          </label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <input
                id="hydration-custom-ml"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={customValue}
                disabled={locked}
                onChange={(e) => {
                  setCustomValue(e.target.value.replace(/[^\d]/g, ''));
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitCustom();
                  }
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 pr-10 text-base text-[#0A1F44] outline-none focus:border-[#4CCB7A] focus:ring-2 focus:ring-[#4CCB7A]/30 dark:border-white/15 dark:bg-[#06152e] dark:text-[#E8EDED]"
                placeholder="Ex: 350"
                aria-invalid={error ? true : undefined}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500 dark:text-[#E8EDED]/60">
                ml
              </span>
            </div>
            <button
              type="button"
              disabled={locked}
              onClick={submitCustom}
              className="min-h-12 shrink-0 rounded-xl bg-[#4CCB7A] px-4 text-sm font-semibold text-[#0A1F44] hover:bg-[#45b86d] disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {hydrationAmountErrorMessage(error)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
