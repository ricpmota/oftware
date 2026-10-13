'use client';

import type { CheckInSemanalNutriQuestion } from '@/lib/nutri/checkInSemanalNutriQuestions';
import type { CheckInMenuContext } from '@/lib/nutri/checkInSemanalNutriV3';
import type { NutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { WeeklyDailyAdherenceQuestion } from '@/components/nutri/checkin-semanal/WeeklyDailyAdherenceQuestion';
import { WeeklyMealAdherenceQuestion } from '@/components/nutri/checkin-semanal/WeeklyMealAdherenceQuestion';
import { WeeklyExerciseQuestion } from '@/components/nutri/checkin-semanal/WeeklyExerciseQuestion';
import { EnergyFillBar } from '@/components/nutri/checkin-semanal/EnergyFillBar';

type Props = {
  question: CheckInSemanalNutriQuestion;
  value: string;
  hint?: string;
  onChange: (value: string) => void;
  week?: NutritionWeek;
  menuContext?: CheckInMenuContext | null;
};

export function CheckInSemanalNutriQuestionRenderer({
  question,
  value,
  hint,
  onChange,
  week,
  menuContext,
}: Props) {
  const choiceClass = (selected: boolean) =>
    `w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base transition-all ${
      selected
        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
    }`;

  if (question.type === 'daily_rating' && week) {
    return (
      <WeeklyDailyAdherenceQuestion
        week={week}
        value={value}
        onChange={onChange}
        title={question.title}
      />
    );
  }

  if (question.type === 'meal_adherence' && menuContext) {
    return (
      <WeeklyMealAdherenceQuestion
        menu={menuContext}
        value={value}
        onChange={onChange}
        title={question.title}
      />
    );
  }

  if (question.type === 'exercise_days' && week) {
    return (
      <WeeklyExerciseQuestion week={week} value={value} onChange={onChange} title={question.title} />
    );
  }

  if (question.type === 'energy_bar') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <h2 className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">{question.title}</h2>
        {question.helperText ? <p className="mt-1 text-sm text-slate-500">{question.helperText}</p> : null}
        <EnergyFillBar value={value} onChange={onChange} />
      </div>
    );
  }

  const selectedChoices = (() => {
    try {
      const parsed = JSON.parse(value || '[]') as unknown;
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : value ? [value] : [];
    } catch {
      return value ? [value] : [];
    }
  })();

  return (
    <div>
      <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-1 leading-snug">
        {question.title}
      </label>
      {question.helperText ? (
        <p className="text-sm text-slate-500 mb-3">{question.helperText}</p>
      ) : null}
      {hint ? <p className="text-sm text-slate-500 mb-3">{hint}</p> : null}

      {question.type === 'slider' ? (
        <div className="mt-4">
          <p className="text-3xl font-bold tabular-nums text-emerald-700 mb-3">
            {value || question.min || 0}
            {question.unit ? <span className="text-lg font-semibold text-slate-500">{question.unit}</span> : null}
          </p>
          <input
            type="range"
            min={question.min ?? 0}
            max={question.max ?? 100}
            step={question.stepValue ?? 5}
            value={value || String(question.min ?? 0)}
            onChange={(e) => onChange(e.target.value)}
            className="w-full accent-emerald-600"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {[0, 25, 50, 75, 100].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(String(n))}
                className={choiceClass(value === String(n))}
              >
                {n}%
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {question.type === 'days' || question.type === 'days_plus' || question.type === 'scale' ? (
        <div
          className={`mt-4 grid gap-2 ${
            question.type === 'scale' ? 'grid-cols-5' : 'grid-cols-4 sm:grid-cols-8'
          }`}
        >
          {(question.options && question.options.length > 0
            ? question.options
            : Array.from({ length: (question.max ?? 7) - (question.min ?? 0) + 1 }, (_, i) => {
                const n = (question.min ?? 0) + i;
                return { value: String(n), label: String(n) };
              })
          ).map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`min-h-[48px] rounded-xl border px-2 py-2.5 text-center text-sm font-semibold transition-all ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {question.type === 'multi_choice' && question.options ? (
        <div className="mt-4 space-y-2.5">
          {question.options.map((option) => {
            const selected = selectedChoices.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const exclusive = option.value === 'sem_dificuldade' || option.value === 'sem_conquista';
                  let next: string[];
                  if (exclusive) {
                    next = selected ? [] : [option.value];
                  } else {
                    next = selected
                      ? selectedChoices.filter((item) => item !== option.value)
                      : [
                          ...selectedChoices.filter((item) => item !== 'sem_dificuldade' && item !== 'sem_conquista'),
                          option.value,
                        ];
                  }
                  onChange(JSON.stringify(next));
                }}
                className={choiceClass(selected)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {question.type === 'single_choice' && question.options ? (
        <div className="mt-4 space-y-2.5">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={choiceClass(value === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {question.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={4}
          className="mt-4 w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-y min-h-[120px] mb-24"
        />
      ) : null}
    </div>
  );
}
