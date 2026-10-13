'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  FOOD_SWAP_REASON_OPTIONS,
  MEAL_ADHERENCE_STATUS_OPTIONS,
  type CheckInFoodSwapRequest,
  type CheckInMealAdherenceItem,
  type CheckInMenuContext,
  type CheckInMenuMeal,
  type MealAdherenceStatus,
} from '@/lib/nutri/checkInSemanalNutriV3';
import {
  NUTRITION_WEEKDAY_HEADERS_MONDAY_FIRST,
  NUTRITION_WEEKDAY_KEYS,
  type NutritionWeekdayKey,
} from '@/lib/nutri/checkInSemanalNutriWeek';

type Payload = {
  meals: CheckInMealAdherenceItem[];
  swaps: CheckInFoodSwapRequest[];
};

type Props = {
  menu: CheckInMenuContext;
  value: string;
  onChange: (value: string) => void;
  title?: string;
};

const MEAL_SHORT_LABEL: Record<string, string> = {
  cafe: 'Café',
  lanche1: 'L.Manhã',
  almoco: 'Almoço',
  lanche2: 'L.Tarde',
  jantar: 'Jantar',
};

const STATUS_PILL: Record<MealAdherenceStatus, string> = {
  followed: 'bg-emerald-500',
  partial: 'bg-amber-500',
  substituted: 'bg-sky-500',
  skipped: 'bg-orange-500',
  not_followed: 'bg-rose-500',
};

const STATUS_ACTIVE: Record<MealAdherenceStatus, string> = {
  followed: 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/30',
  partial: 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-500/30',
  substituted: 'border-sky-500 bg-sky-50 text-sky-950 ring-1 ring-sky-500/30',
  skipped: 'border-orange-500 bg-orange-50 text-orange-950 ring-1 ring-orange-500/30',
  not_followed: 'border-rose-500 bg-rose-50 text-rose-900 ring-1 ring-rose-500/30',
};

function shortMealLabel(meal: CheckInMenuMeal): string {
  return MEAL_SHORT_LABEL[meal.mealId] || meal.mealLabel.split(/\s+/)[0] || meal.mealLabel;
}

function parsePayload(value: string, meals: CheckInMenuMeal[]): Payload {
  try {
    const parsed = JSON.parse(value) as Payload;
    if (parsed && Array.isArray(parsed.meals)) {
      return { meals: parsed.meals, swaps: parsed.swaps || [] };
    }
  } catch {
    /* ignore */
  }
  return {
    meals: meals.map((meal) => ({
      mealId: meal.mealId,
      mealLabel: meal.mealLabel,
      status: undefined as unknown as MealAdherenceStatus,
    })),
    swaps: [],
  };
}

function mealStatus(payload: Payload, mealId: string): MealAdherenceStatus | undefined {
  return payload.meals.find((item) => item.mealId === mealId)?.status;
}

function firstUnansweredIndex(meals: CheckInMenuMeal[], payload: Payload) {
  const idx = meals.findIndex((meal) => !mealStatus(payload, meal.mealId));
  return idx >= 0 ? idx : 0;
}

function statusNeedsDetails(status: MealAdherenceStatus) {
  return status === 'substituted' || status === 'skipped';
}

export function WeeklyMealAdherenceQuestion({ menu, value, onChange, title }: Props) {
  const meals = menu.meals;
  const mealKey = meals.map((meal) => meal.mealId).join('|');
  const payload = useMemo(() => parsePayload(value, meals), [meals, value]);
  const [activeIndex, setActiveIndex] = useState(() => firstUnansweredIndex(meals, payload));
  const [direction, setDirection] = useState(1);
  const touchX = useRef<number | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const meal = meals[activeIndex] ?? meals[0];
  const current = meal ? payload.meals.find((item) => item.mealId === meal.mealId) : undefined;
  const status = current?.status;
  const answeredCount = meals.filter((item) => Boolean(mealStatus(payload, item.mealId))).length;
  const allAnswered = meals.length > 0 && answeredCount === meals.length;

  useEffect(() => {
    setActiveIndex(firstUnansweredIndex(meals, parsePayload(value, meals)));
    // Só reposiciona quando o conjunto de refeições muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealKey]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current != null) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  const commit = (next: Payload) => onChange(JSON.stringify(next));

  const goTo = (index: number) => {
    if (index < 0 || index >= meals.length || index === activeIndex) return;
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  const advanceAfterAnswer = () => {
    if (activeIndex >= meals.length - 1) return;
    if (advanceTimer.current != null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      setDirection(1);
      setActiveIndex((idx) => Math.min(idx + 1, meals.length - 1));
    }, 180);
  };

  const setStatus = (target: CheckInMenuMeal, nextStatus: MealAdherenceStatus) => {
    const nextMeals = payload.meals.filter((item) => item.mealId !== target.mealId);
    nextMeals.push({ mealId: target.mealId, mealLabel: target.mealLabel, status: nextStatus });
    commit({
      meals: nextMeals,
      swaps: payload.swaps.filter((swap) => swap.mealId !== target.mealId || nextStatus === 'substituted'),
    });
    if (!statusNeedsDetails(nextStatus)) advanceAfterAnswer();
  };

  const markAllFollowed = () => {
    commit({
      meals: meals.map((item) => ({ mealId: item.mealId, mealLabel: item.mealLabel, status: 'followed' })),
      swaps: [],
    });
  };

  const patchMeal = (mealId: string, patch: Partial<CheckInMealAdherenceItem>) => {
    commit({
      ...payload,
      meals: payload.meals.map((item) => (item.mealId === mealId ? { ...item, ...patch } : item)),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {title ? (
        <h2 className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">{title}</h2>
      ) : null}

      <button
        type="button"
        onClick={markAllFollowed}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800"
      >
        Segui o cardápio normalmente
      </button>

      <div className="mt-3 flex gap-1">
        {meals.map((item, index) => {
          const rating = mealStatus(payload, item.mealId);
          const isActive = index === activeIndex;
          return (
            <button
              key={item.mealId}
              type="button"
              onClick={() => goTo(index)}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-xl border px-0.5 py-1.5 text-[10px] font-semibold leading-tight sm:text-[11px] ${
                isActive
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
              aria-label={item.mealLabel}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="max-w-full truncate">{shortMealLabel(item)}</span>
              <span
                className={`mt-1 h-1.5 w-1.5 rounded-full ${
                  rating ? STATUS_PILL[rating] : 'bg-slate-200'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div
        className="relative mt-3 flex min-h-0 flex-1 flex-col overflow-hidden"
        onTouchStart={(event) => {
          touchX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchX.current == null) return;
          const dx = (event.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
          touchX.current = null;
          if (dx < -40) goTo(activeIndex + 1);
          if (dx > 40) goTo(activeIndex - 1);
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="rounded-lg p-2 text-slate-500 disabled:opacity-30"
            aria-label="Refeição anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="min-w-0 px-1 text-center">
            <span className="block truncate text-lg font-bold text-slate-900 sm:text-xl">
              {meal?.mealLabel}
            </span>
            <span className="line-clamp-2 text-xs font-medium text-slate-500">
              {meal?.foods.map((food) => food.display || food.label).join(' · ') || '—'}
            </span>
          </p>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === meals.length - 1}
            className="rounded-lg p-2 text-slate-500 disabled:opacity-30"
            aria-label="Próxima refeição"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={meal?.mealId}
            custom={direction}
            initial={{ opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -28 }}
            transition={{ duration: 0.18 }}
            className="min-h-0 flex-1 overflow-y-auto pb-1"
          >
            <div className="grid gap-2">
              {MEAL_ADHERENCE_STATUS_OPTIONS.map((option) => {
                const active = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => meal && setStatus(meal, option.value)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
                      active ? STATUS_ACTIVE[option.value] : 'border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {meal && status === 'partial' ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-slate-800">O que mais deixou de consumir? (opcional)</p>
                {meal.foods.map((food) => {
                  const selected = current?.missingFoods?.some((item) => item.foodId === food.id);
                  return (
                    <label key={food.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...(current?.missingFoods || []), { foodId: food.id, foodLabel: food.label }]
                            : (current?.missingFoods || []).filter((item) => item.foodId !== food.id);
                          patchMeal(meal.mealId, { missingFoods: next });
                        }}
                      />
                      {food.display || food.label}
                    </label>
                  );
                })}
              </div>
            ) : null}

            {meal && status === 'substituted' ? (
              <SubstitutionBlock
                meal={meal}
                current={current}
                swaps={payload.swaps.filter((swap) => swap.mealId === meal.mealId)}
                onPatchMeal={(patch) => patchMeal(meal.mealId, patch)}
                onSwaps={(swaps) =>
                  commit({
                    ...payload,
                    swaps: [...payload.swaps.filter((swap) => swap.mealId !== meal.mealId), ...swaps],
                  })
                }
              />
            ) : null}

            {meal && status === 'skipped' ? (
              <div className="mt-3">
                <p className="text-sm font-medium text-slate-800">Em quais dias isso aconteceu?</p>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {NUTRITION_WEEKDAY_KEYS.map((key, index) => {
                    const selected = current?.skippedDays?.includes(key as NutritionWeekdayKey);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const set = new Set(current?.skippedDays || []);
                          if (set.has(key)) set.delete(key);
                          else set.add(key);
                          patchMeal(meal.mealId, { skippedDays: [...set] });
                        }}
                        className={`min-h-11 rounded-lg border text-xs font-semibold ${
                          selected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {NUTRITION_WEEKDAY_HEADERS_MONDAY_FIRST[index]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {allAnswered
          ? 'As refeições foram avaliadas.'
          : `${answeredCount} de ${meals.length} refeições · responda e passe para a próxima.`}
      </p>
    </div>
  );
}

function SubstitutionBlock({
  meal,
  current,
  swaps,
  onPatchMeal,
  onSwaps,
}: {
  meal: CheckInMenuMeal;
  current?: CheckInMealAdherenceItem;
  swaps: CheckInFoodSwapRequest[];
  onPatchMeal: (patch: Partial<CheckInMealAdherenceItem>) => void;
  onSwaps: (swaps: CheckInFoodSwapRequest[]) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm font-medium text-slate-800">Qual alimento você trocou?</p>
      {meal.foods.map((food) => {
        const selected = current?.substitutions?.some((item) => item.foodId === food.id);
        const swap = swaps.find((item) => item.foodId === food.id);
        return (
          <div key={food.id} className="rounded-lg border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={Boolean(selected)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...(current?.substitutions || []), { foodId: food.id, foodLabel: food.label }]
                    : (current?.substitutions || []).filter((item) => item.foodId !== food.id);
                  onPatchMeal({ substitutions: next });
                  if (!event.target.checked) onSwaps(swaps.filter((item) => item.foodId !== food.id));
                }}
              />
              {food.display || food.label}
            </label>
            {selected ? (
              <div className="mt-2 space-y-2">
                <input
                  value={current?.substitutions?.find((item) => item.foodId === food.id)?.replacementText || ''}
                  onChange={(event) => {
                    onPatchMeal({
                      substitutions: (current?.substitutions || []).map((item) =>
                        item.foodId === food.id ? { ...item, replacementText: event.target.value } : item
                      ),
                    });
                  }}
                  placeholder="Por qual alimento você substituiu? (opcional)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(swap)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onSwaps([
                          ...swaps.filter((item) => item.foodId !== food.id),
                          {
                            mealId: meal.mealId,
                            mealLabel: meal.mealLabel,
                            foodId: food.id,
                            foodLabel: food.label,
                            reason: 'dislike',
                          },
                        ]);
                      } else {
                        onSwaps(swaps.filter((item) => item.foodId !== food.id));
                      }
                    }}
                  />
                  Quero trocar este alimento no meu cardápio
                </label>
                {swap ? (
                  <>
                    <select
                      value={swap.reason}
                      onChange={(event) =>
                        onSwaps(
                          swaps.map((item) =>
                            item.foodId === food.id
                              ? { ...item, reason: event.target.value as CheckInFoodSwapRequest['reason'] }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {FOOD_SWAP_REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {swap.reason === 'other' ? (
                      <textarea
                        value={swap.reasonOther || ''}
                        onChange={(event) =>
                          onSwaps(
                            swaps.map((item) =>
                              item.foodId === food.id ? { ...item, reasonOther: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Conte o motivo."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    ) : null}
                    <input
                      value={swap.desiredReplacement || ''}
                      onChange={(event) =>
                        onSwaps(
                          swaps.map((item) =>
                            item.foodId === food.id ? { ...item, desiredReplacement: event.target.value } : item
                          )
                        )
                      }
                      placeholder="Gostaria de trocar por: (opcional)"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
