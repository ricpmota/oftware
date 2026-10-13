'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DAILY_ADHERENCE_OPTIONS,
  isCompleteDailyAdherence,
  type CheckInDailyAdherence,
  type DailyAdherenceRating,
} from '@/lib/nutri/checkInSemanalNutriV3';
import { listNutritionWeekDays, type NutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

type Props = {
  week: NutritionWeek;
  value: string;
  onChange: (value: string) => void;
  title?: string;
};

const RATING_STYLE: Record<
  DailyAdherenceRating,
  { active: string; chip: string; swatch: string }
> = {
  good: {
    active: 'border-emerald-600 bg-emerald-500 text-white ring-2 ring-emerald-600/40',
    chip: 'border-emerald-400 bg-emerald-500 text-white',
    swatch: 'bg-emerald-500',
  },
  regular: {
    active: 'border-amber-500 bg-amber-400 text-amber-950 ring-2 ring-amber-500/40',
    chip: 'border-amber-300 bg-amber-400 text-amber-950',
    swatch: 'bg-amber-400',
  },
  bad: {
    active: 'border-rose-600 bg-rose-500 text-white ring-2 ring-rose-600/40',
    chip: 'border-rose-400 bg-rose-500 text-white',
    swatch: 'bg-rose-500',
  },
};

const OPTION_HINT: Record<DailyAdherenceRating, string> = {
  good: 'Segui bem',
  regular: 'Alguns desvios',
  bad: 'Bastante dificuldade',
};

function parseDaily(value: string): Partial<CheckInDailyAdherence> {
  try {
    const parsed = JSON.parse(value) as Partial<CheckInDailyAdherence>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function firstUnansweredIndex(days: ReturnType<typeof listNutritionWeekDays>, current: Partial<CheckInDailyAdherence>) {
  const idx = days.findIndex((day) => !current[day.key]);
  return idx >= 0 ? idx : 0;
}

export function WeeklyDailyAdherenceQuestion({ week, value, onChange, title }: Props) {
  const weekStart = week.weekStart;
  const days = useMemo(() => listNutritionWeekDays({ weekStart }), [weekStart]);
  const current = parseDaily(value);
  const [activeIndex, setActiveIndex] = useState(() => firstUnansweredIndex(days, current));
  const [direction, setDirection] = useState(1);
  const touchX = useRef<number | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const answeredCount = days.filter((day) => Boolean(current[day.key])).length;
  const day = days[activeIndex] ?? days[0];
  const selected = day ? current[day.key] : undefined;

  useEffect(() => {
    setActiveIndex(firstUnansweredIndex(days, parseDaily(value)));
  }, [days, weekStart]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current != null) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  const goTo = (index: number) => {
    if (index < 0 || index >= days.length || index === activeIndex) return;
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  const setDay = (key: keyof CheckInDailyAdherence, rating: DailyAdherenceRating) => {
    const next = { ...current, [key]: rating };
    onChange(JSON.stringify(next));
    if (activeIndex < days.length - 1) {
      if (advanceTimer.current != null) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(() => {
        setDirection(1);
        setActiveIndex((idx) => Math.min(idx + 1, days.length - 1));
      }, 180);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {title ? (
        <h2 className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">{title}</h2>
      ) : null}

      <div className="mt-2 flex items-center gap-3 text-[11px] font-medium text-slate-500">
        {DAILY_ADHERENCE_OPTIONS.map((option) => (
          <span key={option.value} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${RATING_STYLE[option.value].swatch}`} />
            {option.label}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {days.map((item, index) => {
          const rating = current[item.key];
          const isActive = index === activeIndex;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => goTo(index)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-0.5 py-1.5 text-[11px] font-semibold transition-colors ${
                rating
                  ? isActive
                    ? RATING_STYLE[rating].active
                    : RATING_STYLE[rating].chip
                  : isActive
                    ? 'border-slate-400 bg-slate-50 text-slate-900 ring-1 ring-slate-300'
                    : 'border-slate-200 bg-white text-slate-600'
              }`}
              aria-label={`${item.weekdayLong} ${item.dayOfMonth}${rating ? `, ${rating}` : ''}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {item.weekdayShort}
              <span
                className={`mt-1 h-1.5 w-1.5 rounded-full ${
                  rating ? 'bg-white/90' : 'bg-slate-200'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div
        className="relative mt-3 min-h-0 flex-1 overflow-hidden"
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
            aria-label="Dia anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-center">
            <span className="block text-xl font-bold text-slate-900">{day?.weekdayLong}</span>
            <span className="text-xs font-medium text-slate-500">dia {day?.dayOfMonth}</span>
          </p>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === days.length - 1}
            className="rounded-lg p-2 text-slate-500 disabled:opacity-30"
            aria-label="Próximo dia"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={day?.key}
            custom={direction}
            initial={{ opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -28 }}
            transition={{ duration: 0.18 }}
            className="grid gap-2"
          >
            {DAILY_ADHERENCE_OPTIONS.map((option) => {
              const active = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => day && setDay(day.key, option.value)}
                  className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                    active
                      ? RATING_STYLE[option.value].active
                      : 'border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  <span className="text-base font-semibold">{option.label}</span>
                  <span className={`text-sm ${active ? 'font-medium' : 'text-slate-500'}`}>
                    {OPTION_HINT[option.value]}
                  </span>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {isCompleteDailyAdherence(current)
          ? 'Os 7 dias foram avaliados.'
          : `${answeredCount} de 7 dias · responda e passe para o próximo.`}
      </p>
    </div>
  );
}
