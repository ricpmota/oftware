'use client';

import {
  rotuloDailyAdherence,
  rotuloFoodSwapReason,
  rotuloMealAdherence,
  type CheckInDailyAdherence,
  type CheckInFoodSwapRequest,
  type CheckInMealAdherenceItem,
} from '@/lib/nutri/checkInSemanalNutriV3';
import {
  NUTRITION_WEEKDAY_HEADERS_MONDAY_FIRST,
  NUTRITION_WEEKDAY_KEYS,
  listNutritionWeekDays,
  type NutritionWeek,
} from '@/lib/nutri/checkInSemanalNutriWeek';

export function dailyAdherenceRatingClass(value?: string): string {
  if (value === 'good') return 'bg-emerald-500 text-white ring-emerald-600/25';
  if (value === 'regular') return 'bg-amber-400 text-amber-950 ring-amber-500/30';
  if (value === 'bad') return 'bg-rose-500 text-white ring-rose-600/25';
  return 'bg-slate-100 text-slate-500 ring-slate-200';
}

export function calendarDayRatingClass(value?: string): string {
  if (value === 'good') return 'bg-emerald-500 text-white hover:bg-emerald-600';
  if (value === 'regular') return 'bg-amber-400 text-amber-950 hover:bg-amber-500';
  if (value === 'bad') return 'bg-rose-500 text-white hover:bg-rose-600';
  return 'hover:bg-gray-50/80';
}

export function CheckInSemanalNutriWeekMap({
  week,
  daily,
}: {
  week: NutritionWeek;
  daily: CheckInDailyAdherence;
}) {
  const days = listNutritionWeekDays(week);
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Boa
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Regular
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Ruim
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const rating = daily[day.key];
          return (
            <div key={day.key} className={`rounded-xl px-1.5 py-2 text-center ring-1 ${dailyAdherenceRatingClass(rating)}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-90">
                {day.weekdayShort} {day.dayOfMonth}
              </p>
              <p className="mt-1 text-xs font-semibold">{rating ? rotuloDailyAdherence(rating) : '—'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CheckInSemanalNutriMealAdherenceList({
  meals,
}: {
  meals: CheckInMealAdherenceItem[];
}) {
  if (meals.length === 0) return null;
  return (
    <ul className="space-y-2">
      {meals.map((meal) => (
        <li key={meal.mealId} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">{meal.mealLabel}</p>
            <p className="shrink-0 text-xs font-semibold text-slate-700">{rotuloMealAdherence(meal.status)}</p>
          </div>
          {meal.missingFoods?.length ? (
            <p className="mt-1 text-xs text-slate-600">
              Deixou de consumir: {meal.missingFoods.map((food) => food.foodLabel).join(', ')}
            </p>
          ) : null}
          {meal.substitutions?.length ? (
            <p className="mt-1 text-xs text-slate-600">
              Substituições:{' '}
              {meal.substitutions
                .map((item) =>
                  item.replacementText ? `${item.foodLabel} → ${item.replacementText}` : item.foodLabel
                )
                .join('; ')}
            </p>
          ) : null}
          {meal.skippedDays?.length ? (
            <p className="mt-1 text-xs text-slate-600">
              Dias pulados:{' '}
              {meal.skippedDays
                .map((key) => NUTRITION_WEEKDAY_HEADERS_MONDAY_FIRST[NUTRITION_WEEKDAY_KEYS.indexOf(key)])
                .join(', ')}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function CheckInSemanalNutriFoodSwapList({
  swaps,
  onAdjustMenu,
}: {
  swaps: CheckInFoodSwapRequest[];
  onAdjustMenu?: () => void;
}) {
  if (swaps.length === 0 && !onAdjustMenu) return null;
  return (
    <div className="space-y-3">
      {swaps.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma solicitação de troca nesta semana.</p>
      ) : (
        <ul className="space-y-2">
          {swaps.map((swap) => (
            <li key={`${swap.mealId}-${swap.foodId}`} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-900">{swap.foodLabel}</p>
              <p className="text-xs text-slate-500">{swap.mealLabel}</p>
              <p className="mt-1 text-sm text-slate-700">
                Motivo: {rotuloFoodSwapReason(swap.reason, swap.reasonOther)}
              </p>
              {swap.desiredReplacement ? (
                <p className="text-sm text-slate-700">Gostaria de trocar por: {swap.desiredReplacement}</p>
              ) : (
                <p className="text-xs text-slate-500">Paciente deseja trocar</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {onAdjustMenu ? (
        <button
          type="button"
          onClick={onAdjustMenu}
          className="inline-flex items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-100"
        >
          Ajustar cardápio
        </button>
      ) : null}
    </div>
  );
}
