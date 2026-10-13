'use client';

import {
  calcHydrationPercentage,
  classifyHydrationAdherence,
  formatHydrationLiters,
  type HydrationAdherenceStatus,
} from '@/lib/nutri/hidratacao/hydrationMath';
import { hydrationCalendarDayTooltip } from '@/lib/nutri/hidratacao/hydrationProfessional';
import type { HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';

const DAY_TONE: Record<HydrationAdherenceStatus, string> = {
  meta_atingida: 'bg-[#4CCB7A]/25 text-[#0A1F44] dark:text-[#E8EDED]',
  proximo_da_meta: 'bg-[#2F8FA3]/20 text-[#0A1F44] dark:text-[#E8EDED]',
  abaixo_da_meta: 'bg-amber-100/80 text-[#0A1F44] dark:bg-amber-400/20 dark:text-[#E8EDED]',
  baixa_adesao: 'bg-[#0A1F44]/10 text-[#0A1F44]/80 dark:bg-white/10 dark:text-[#E8EDED]/80',
  nao_informado: 'bg-transparent text-[#0A1F44]/70 dark:text-[#E8EDED]/70',
};

const DOT_TONE: Record<HydrationAdherenceStatus, string> = {
  meta_atingida: 'bg-[#4CCB7A]',
  proximo_da_meta: 'bg-[#2F8FA3]',
  abaixo_da_meta: 'bg-amber-400',
  baixa_adesao: 'bg-[#0A1F44]/35 dark:bg-white/35',
  nao_informado: 'bg-transparent',
};

type HydrationCalendarDayProps = {
  date: string;
  record: HydrationRecord | null;
  isToday: boolean;
  isFuture: boolean;
  onSelect: (date: string) => void;
  variant?: 'patient' | 'professional';
};

export default function HydrationCalendarDay({
  date,
  record,
  isToday,
  isFuture,
  onSelect,
  variant = 'patient',
}: HydrationCalendarDayProps) {
  const day = Number(date.slice(8, 10));
  const status = classifyHydrationAdherence({
    hasRecord: record != null,
    consumedMl: record?.consumedMl,
    goalMl: record?.goalMl,
  });
  const pct = record ? calcHydrationPercentage(record.consumedMl, record.goalMl) : null;
  const professional = variant === 'professional';
  const tooltip = professional
    ? hydrationCalendarDayTooltip({ date, record, isFuture })
    : undefined;

  return (
    <button
      type="button"
      disabled={isFuture}
      onClick={() => onSelect(date)}
      title={tooltip}
      aria-current={isToday ? 'date' : undefined}
      aria-label={
        pct != null
          ? `${day}, ${pct}% da meta`
          : isFuture
            ? `${day}, dia futuro`
            : `${day}, sem registro`
      }
      className={`group relative flex min-w-0 flex-col items-center justify-center rounded-xl text-xs font-semibold tabular-nums transition-colors ${
        professional ? 'min-h-[3.15rem] gap-0 px-0.5 py-1 sm:min-h-[3.6rem]' : 'min-h-11 gap-0.5'
      } ${isFuture ? 'cursor-default opacity-35' : 'active:scale-[0.97]'} ${DAY_TONE[status]} ${
        isToday ? 'ring-2 ring-[#4CCB7A] ring-offset-1 ring-offset-white dark:ring-offset-[#0A1F44]' : ''
      }`}
    >
      <span className={professional ? 'text-[11px] leading-none sm:text-xs' : ''}>{day}</span>
      {professional ? (
        isFuture ? null : record && pct != null ? (
          <>
            <span className="hidden text-[10px] font-semibold leading-tight text-current/90 sm:block">
              {formatHydrationLiters(record.consumedMl)}
            </span>
            <span className="text-[10px] font-bold leading-tight">
              {pct}%{record.goalReached ? ' ✓' : ''}
            </span>
          </>
        ) : (
          <span className="text-[11px] font-medium text-current/40">—</span>
        )
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONE[status]}`} aria-hidden />
      )}
    </button>
  );
}
