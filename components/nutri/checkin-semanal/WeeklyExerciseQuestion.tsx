'use client';

import { useMemo } from 'react';
import type { NutritionWeek, NutritionWeekdayKey } from '@/lib/nutri/checkInSemanalNutriWeek';
import { listNutritionWeekDays } from '@/lib/nutri/checkInSemanalNutriWeek';

type DaysMap = Partial<Record<NutritionWeekdayKey, string>>;

type Props = {
  week: NutritionWeek;
  value: string;
  onChange: (value: string) => void;
  title?: string;
};

function parseDays(value: string): DaysMap | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as DaysMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return null;
  }
}

export function WeeklyExerciseQuestion({ week, value, onChange, title }: Props) {
  const days = useMemo(() => listNutritionWeekDays(week), [week]);
  const current = parseDays(value);
  const selectedCount = current ? Object.keys(current).length : 0;

  const commit = (next: DaysMap) => onChange(JSON.stringify(next));

  const toggleDay = (key: NutritionWeekdayKey) => {
    const base: DaysMap = { ...(current || {}) };
    if (key in base) {
      delete base[key];
    } else {
      base[key] = '';
    }
    commit(base);
  };

  const setExercise = (key: NutritionWeekdayKey, text: string) => {
    commit({ ...(current || {}), [key]: text });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {title ? (
        <h2 className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">{title}</h2>
      ) : null}
      <p className="mt-1 text-sm text-slate-500">
        Marque os dias e, se quiser, diga qual exercício fez em cada um.
      </p>

      <button
        type="button"
        onClick={() => commit({})}
        className={`mt-3 w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
          current && selectedCount === 0
            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/30'
            : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        Não pratiquei nesta semana
      </button>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const selected = Boolean(current && day.key in current);
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-0.5 py-1.5 text-[11px] font-semibold ${
                selected
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {day.weekdayShort}
              <span className="mt-0.5 text-[10px] font-medium text-slate-400">{day.dayOfMonth}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {days
          .filter((day) => current && day.key in current)
          .map((day) => (
            <label key={day.key} className="block rounded-xl border border-slate-200 bg-white px-3 py-2">
              <span className="text-sm font-semibold text-slate-900">
                {day.weekdayLong} · dia {day.dayOfMonth}
              </span>
              <input
                value={current?.[day.key] || ''}
                onChange={(event) => setExercise(day.key, event.target.value)}
                placeholder="Qual exercício? (opcional)"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
              />
            </label>
          ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {current == null
          ? 'Selecione os dias ou toque em “Não pratiquei”.'
          : selectedCount === 0
            ? 'Nenhum dia de exercício nesta semana.'
            : `${selectedCount} dia${selectedCount === 1 ? '' : 's'} com atividade.`}
      </p>
    </div>
  );
}
