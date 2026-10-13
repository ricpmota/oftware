'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import HydrationCalendarDay from '@/components/nutri/hidratacao/HydrationCalendarDay';
import {
  buildHydrationWeeklySummary,
  canGoToHydrationMonth,
  hydrationCalendarCells,
  hydrationMonthTitle,
} from '@/lib/nutri/hidratacao/hydrationMath';
import type { HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

type HydrationCalendarProps = {
  monthKey: string;
  todayYmd: string;
  records: Map<string, HydrationRecord>;
  onSelectDate: (date: string) => void;
  shiftMonth: (delta: number) => void;
  variant?: 'patient' | 'professional';
};

export default function HydrationCalendar({
  monthKey,
  todayYmd,
  records,
  onSelectDate,
  shiftMonth,
  variant = 'patient',
}: HydrationCalendarProps) {
  const cells = hydrationCalendarCells(monthKey);
  const nav = canGoToHydrationMonth(monthKey, todayYmd);
  const elapsedDays = cells
    .filter((date): date is string => Boolean(date) && date <= todayYmd)
    .map((date) => ({ date, record: records.get(date) ?? null }));
  const monthSummary = variant === 'professional' ? buildHydrationWeeklySummary(elapsedDays) : null;

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white/80 p-3 dark:border-white/10 dark:bg-[#0A1F44]/45 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Calendário de hidratação</h3>
        <div className="flex items-center justify-center gap-1 sm:justify-end">
          <button
            type="button"
            disabled={!nav.prev}
            onClick={() => shiftMonth(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#0A1F44] hover:bg-[#4CCB7A]/10 disabled:opacity-30 dark:text-[#E8EDED]"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="min-w-[8.5rem] text-center text-sm font-semibold tabular-nums text-[#0A1F44] dark:text-[#E8EDED]">
            {hydrationMonthTitle(monthKey)}
          </p>
          <button
            type="button"
            disabled={!nav.next}
            onClick={() => shiftMonth(1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#0A1F44] hover:bg-[#4CCB7A]/10 disabled:opacity-30 dark:text-[#E8EDED]"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {monthSummary ? (
        <p className="mb-3 text-xs text-[#0A1F44]/60 dark:text-[#E8EDED]/55">
          {monthSummary.daysRegistered} {monthSummary.daysRegistered === 1 ? 'dia registrado' : 'dias registrados'}
          {' · '}
          {monthSummary.daysGoalReached} {monthSummary.daysGoalReached === 1 ? 'meta atingida' : 'metas atingidas'}
          {monthSummary.averageAdherencePct != null
            ? ` · média registrada ${monthSummary.averageAdherencePct}%`
            : ''}
          {' · '}
          {monthSummary.daysRegistered} de {monthSummary.daysInPeriod} dias
        </p>
      ) : null}

      <div className={`grid grid-cols-7 ${variant === 'professional' ? 'gap-1 sm:gap-1.5' : 'gap-1'}`}>
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[#0A1F44]/45 dark:text-[#E8EDED]/45"
          >
            {label}
          </div>
        ))}
        {cells.map((date, index) =>
          date ? (
            <HydrationCalendarDay
              key={date}
              date={date}
              record={records.get(date) ?? null}
              isToday={date === todayYmd}
              isFuture={date > todayYmd}
              onSelect={onSelectDate}
              variant={variant}
            />
          ) : (
            <div key={`empty-${index}`} className={variant === 'professional' ? 'min-h-[3.15rem] sm:min-h-[3.6rem]' : 'min-h-11'} />
          )
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#0A1F44]/55 dark:text-[#E8EDED]/55">
        <li className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4CCB7A]" /> Meta
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2F8FA3]" /> Próximo
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Abaixo
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0A1F44]/35 dark:bg-white/35" /> Baixa adesão
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full border border-[#0A1F44]/25 bg-transparent" /> Sem registro
        </li>
      </ul>
    </section>
  );
}
